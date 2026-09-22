// =============================================================
//  RESPALDO PERIODICO COMPLETO A FIREBASE — La Manuelita
// =============================================================
//
// Sube los tres archivos reales de la base (prisma/dev.db, dev.db-wal,
// dev.db-shm), comprimidos con gzip, a Firestore. No es lo mismo que el
// resumen del cierre de caja que ya se guarda en la colección "panelRemoto"
// (lib/panel-remoto.ts): esto es la base completa, no un resumen del día.
//
// Por qué Firestore y no Storage: Firebase Storage NO está habilitado en
// este proyecto (comprobado con una petición directa, sin autenticar, a la
// API de Google Cloud Storage: "GET storage.googleapis.com/storage/v1/b/
// <bucket>" respondió 404 "The specified bucket does not exist" -- el
// proyecto trae un nombre de bucket preasignado en la config, pero eso no
// significa que el bucket exista de verdad). Si algún día se habilita
// Storage, este script debería moverse ahí (ver LIMITE_SEGURO_BYTES abajo).
//
// ALCANCE REAL -- leer antes de confiar en esto como plan de recuperación:
//   - Es un respaldo POINT-IN-TIME cada 20-30 minutos (ver ecosystem.config.js,
//     "respaldo-db" con cron_restart), NO una sincronización en tiempo real
//     ni un registro continuo de cambios.
//   - En el peor caso -- el equipo se pierde justo antes de que corra un
//     ciclo -- se pierde la ventana desde el último respaldo exitoso (máx.
//     ~30 minutos de pedidos/pagos/gastos), no el historial completo: los
//     ciclos anteriores siguen en Firestore, cada uno con su propio
//     documento y su propia fecha.
//   - Límite duro de Firestore: 1 MiB por documento. Con el tamaño actual
//     de la base (unos cientos de KB) sobra margen de sobra, pero si la
//     base crece mucho el script FALLA explícitamente (no sube nada) en
//     vez de subir un respaldo truncado o corrupto -- ver
//     LIMITE_SEGURO_BYTES.
//   - No reemplaza scripts/backup-db.ps1 (copias locales + OneDrive +
//     Google Drive, diarias a las 11pm, vía Tarea Programada de Windows):
//     ese sigue siendo el respaldo "grueso" ante un fallo de disco: este es
//     el respaldo fuera de sitio, más frecuente, pensado para reconstruir
//     el negocio si el equipo entero -- y sus respaldos locales -- se
//     pierden.
//   - Restaura manualmente: descomprimir el campo `gzip` de cada archivo
//     (gzip estándar) y escribirlo con el nombre original. El modo
//     --verificar de este mismo script hace exactamente eso y compara el
//     resultado con SHA-256 en vez de solo confiar en que "subió bien".
//
// Autenticación: cuenta de servicio del Admin SDK. El Admin SDK escribe sin
// pasar por las reglas de seguridad de Firestore -- que están cerradas a
// propósito (allow read, write: if false) desde el cierre de emergencia de
// RNF04 -- así que este respaldo no exige reabrir ni debilitar esas reglas.
// La clave de la cuenta de servicio NUNCA debe vivir dentro del repositorio
// (ni siquiera con .gitignore: más seguro que ni exista en el árbol de git).
// Se guarda en una ruta fuera del repo y se referencia por
// FIREBASE_SERVICE_ACCOUNT_PATH en .env (que ya está gitignored).
//
// Uso:
//   node scripts/respaldo-db-firebase.js
//       Un ciclo de respaldo (lee, comprime, sube) y termina. Así lo dispara
//       PM2 en cada tick del cron (ver ecosystem.config.js).
//
//   node scripts/respaldo-db-firebase.js --verificar <idDelDocumento>
//       Descarga ese respaldo, lo descomprime y compara su SHA-256 contra
//       lo que se subió Y contra los archivos reales de HOY (que pueden ya
//       ser distintos si la base siguió cambiando). Termina con código 0
//       solo si el contenido descargado coincide exactamente con lo que se
//       subió en su momento.
//
// Automatización: ver ecosystem.config.js, proceso PM2 "respaldo-db" con
// cron_restart cada 25 minutos (dentro del rango pedido de 20-30) y
// autorestart:false -- corre un ciclo, termina, y PM2 lo vuelve a arrancar
// en el siguiente disparo del cron. Instalar/actualizar con:
//   pm2 start ecosystem.config.js --only respaldo-db
//   pm2 save

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");

// Este script se ejecuta fuera del ciclo de vida de Next.js (PM2 lo arranca
// directo con `node`), así que .env no se carga solo -- a diferencia de
// `next dev`/`next build`. Ningún otro script de scripts/ usa dotenv (es solo
// una dependencia transitiva de prisma, no algo de este proyecto), así que en
// vez de agregarlo se lee/parsea el archivo a mano, igual que ya hace el resto
// de la app para leer variables sueltas en scripts de verificación.
function cargarEnv(ruta) {
  if (!fs.existsSync(ruta)) return;
  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    if (!linea.includes("=") || linea.trim().startsWith("#")) continue;
    const i = linea.indexOf("=");
    const clave = linea.slice(0, i).trim();
    const valor = linea.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (clave && !(clave in process.env)) process.env[clave] = valor;
  }
}
cargarEnv(path.join(RAIZ, ".env"));
const ARCHIVOS = {
  devDb: path.join(RAIZ, "prisma/dev.db"),
  devDbWal: path.join(RAIZ, "prisma/dev.db-wal"),
  devDbShm: path.join(RAIZ, "prisma/dev.db-shm"),
};
const COLECCION = "respaldosDb";

// Margen de seguridad bajo el límite duro de Firestore (1 MiB = 1_048_576
// bytes por documento): deja espacio para los demás campos del documento
// (tamaños, hashes, timestamp) y evita subir un respaldo al límite exacto.
const LIMITE_SEGURO_BYTES = 900_000;

function leerArchivo(ruta) {
  if (!fs.existsSync(ruta)) return null;
  return fs.readFileSync(ruta);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// firebase-admin 14.x usa la misma API modular que el SDK del cliente: no hay un
// objeto único "admin" con .apps/.firestore()/.credential -- cada pieza viene de
// su propio submódulo. Los campos binarios se guardan como Buffer/Uint8Array
// directo (esta versión de @google-cloud/firestore los serializa como
// bytesValue sin envoltorio; no existe una clase Bytes en esta versión).
function clienteFirestore() {
  const { initializeApp, getApps, cert } = require("firebase-admin/app");
  const { getFirestore, FieldValue } = require("firebase-admin/firestore");

  if (!getApps().length) {
    const rutaClave = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!rutaClave) {
      throw new Error(
        "Falta FIREBASE_SERVICE_ACCOUNT_PATH en .env -- ruta al JSON de la cuenta de " +
          "servicio del Admin SDK (Firebase Console -> Configuración del proyecto -> " +
          "Cuentas de servicio -> Generar nueva clave privada). Guárdala FUERA del repo."
      );
    }
    const rutaAbsoluta = path.resolve(rutaClave);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH apunta a un archivo que no existe: ${rutaAbsoluta}`);
    }
    initializeApp({ credential: cert(require(rutaAbsoluta)) });
  }
  return { db: getFirestore(), FieldValue };
}

/** Lee, comprime (gzip) y calcula el SHA-256 (del original, sin comprimir) de cada archivo. */
function prepararRespaldo() {
  const partes = {};
  for (const [clave, ruta] of Object.entries(ARCHIVOS)) {
    const original = leerArchivo(ruta);
    if (original === null) {
      partes[clave] = { presente: false };
      continue;
    }
    partes[clave] = {
      presente: true,
      tamañoOriginal: original.length,
      sha256: sha256(original),
      gzip: zlib.gzipSync(original, { level: 9 }),
    };
  }
  return partes;
}

async function subirRespaldo(partes) {
  const { db, FieldValue } = clienteFirestore();

  const doc = { creadoEn: FieldValue.serverTimestamp(), version: 1 };
  let tamañoComprimidoTotal = 0;
  for (const [clave, info] of Object.entries(partes)) {
    if (!info.presente) {
      doc[clave] = { presente: false };
      continue;
    }
    tamañoComprimidoTotal += info.gzip.length;
    doc[clave] = {
      presente: true,
      tamañoOriginal: info.tamañoOriginal,
      sha256: info.sha256,
      gzip: info.gzip, // Buffer: @google-cloud/firestore lo serializa como bytesValue directo
    };
  }

  if (tamañoComprimidoTotal > LIMITE_SEGURO_BYTES) {
    throw new Error(
      `El respaldo comprimido pesa ${tamañoComprimidoTotal} bytes, por encima del margen ` +
        `seguro de ${LIMITE_SEGURO_BYTES} bajo el límite duro de Firestore (1 MiB por ` +
        `documento). No se sube nada. Para respaldar una base de este tamaño hay que ` +
        `habilitar Firebase Storage (sin ese límite) y adaptar este script, en vez de subir ` +
        `un respaldo truncado.`
    );
  }

  const ref = await db.collection(COLECCION).add(doc);
  return { id: ref.id, tamañoComprimidoTotal };
}

/**
 * Descarga un respaldo por id, lo descomprime y compara su SHA-256 contra lo que
 * se subió y (si se pasan) contra archivos reales actuales.
 */
async function verificarRespaldo(docId, archivosReales = ARCHIVOS) {
  const { db } = clienteFirestore();
  const snap = await db.collection(COLECCION).doc(docId).get();
  if (!snap.exists) throw new Error(`No existe el respaldo ${docId} en la colección ${COLECCION}`);
  const doc = snap.data();

  const resultado = {};
  for (const clave of Object.keys(ARCHIVOS)) {
    const info = doc[clave];
    if (!info || !info.presente) {
      resultado[clave] = { presente: false };
      continue;
    }
    // proto.bytesValue vuelve como Buffer (o algo Buffer-compatible); Buffer.from
    // sobre un Buffer no copia de más y funciona igual si viniera como Uint8Array.
    const gz = Buffer.isBuffer(info.gzip) ? info.gzip : Buffer.from(info.gzip);
    const descomprimido = zlib.gunzipSync(gz);
    const shaDescargado = sha256(descomprimido);
    const real = leerArchivo(archivosReales[clave]);
    resultado[clave] = {
      presente: true,
      tamañoOriginalGuardado: info.tamañoOriginal,
      tamañoDescomprimido: descomprimido.length,
      shaGuardadoEnFirestore: info.sha256,
      shaDelContenidoDescargado: shaDescargado,
      // Coincide con lo que este mismo script subió: confirma que la compresión
      // y la subida no corrompieron nada -- es la prueba pedida en el paso 3.
      coincideConLoQueSeSubio: shaDescargado === info.sha256,
      // Comparación aparte contra el archivo real EN ESTE MOMENTO: normal que no
      // coincida si la base siguió cambiando después de ese respaldo -- no es un
      // fallo del respaldo, solo informativo.
      shaDelArchivoRealAhora: real ? sha256(real) : null,
      coincideConElArchivoRealAhoraMismo: real ? shaDescargado === sha256(real) : null,
    };
  }
  return resultado;
}

async function main() {
  const modo = process.argv[2];

  if (modo === "--verificar") {
    const docId = process.argv[3];
    if (!docId) {
      console.error("Uso: node scripts/respaldo-db-firebase.js --verificar <idDelDocumento>");
      process.exit(1);
    }
    const r = await verificarRespaldo(docId);
    console.log(JSON.stringify(r, null, 2));
    const ok = Object.values(r).every((x) => !x.presente || x.coincideConLoQueSeSubio);
    console.log(ok ? "\nVERIFICACIÓN OK: el contenido descargado coincide exactamente con lo subido." : "\nVERIFICACIÓN FALLÓ.");
    process.exit(ok ? 0 : 1);
  }

  console.log(`[${new Date().toISOString()}] Respaldo a Firebase: iniciando...`);
  const partes = prepararRespaldo();
  if (!partes.devDb.presente) {
    console.error(`[${new Date().toISOString()}] No se encontró ${ARCHIVOS.devDb} -- se aborta sin subir nada.`);
    process.exit(1);
  }
  const { id, tamañoComprimidoTotal } = await subirRespaldo(partes);
  console.log(
    `[${new Date().toISOString()}] OK -- documento ${id} en "${COLECCION}" ` +
      `(${tamañoComprimidoTotal} bytes comprimidos)`
  );
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`[${new Date().toISOString()}] FALLÓ el respaldo:`, e.message);
    process.exit(1);
  });
}

module.exports = { prepararRespaldo, subirRespaldo, verificarRespaldo, ARCHIVOS, LIMITE_SEGURO_BYTES };
