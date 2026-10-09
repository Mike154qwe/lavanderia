// Respaldo LOCAL seguro de prisma/dev.db -- complementa (no reemplaza) a
// scripts/respaldo-db-firebase.js (ese sube a la nube cada 25 min; este deja
// una copia point-in-time en disco, con integridad verificada y retención
// acotada, pensado para una tarea programada diaria o para correr a mano al
// final de una sesión de trabajo -- ver scripts/instalar-backup-seguro.ps1 y
// el script "backup:sesion" de package.json).
//
// A propósito, a diferencia de respaldo-db-firebase.js: la ruta de la base
// sale de DATABASE_URL (.env), no de una ruta fija -- así nunca puede
// desincronizarse de a qué base le apunta realmente la app (ver el hallazgo
// de la auditoría del 9-oct-2026: los dos mecanismos coincidían hoy, pero por
// casualidad, no por diseño).
//
// Uso:
//   node scripts/backup-seguro.js             -- respalda + retención en dry-run
//   node scripts/backup-seguro.js --aplicar    -- respalda + retención real (borra)
"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const RAIZ = path.join(__dirname, "..");
const DESTINO_DIR = "C:\\LaManuelita_Backups\\auto";
const RETENCION_HORAS_TODO = 72; // conserva TODO lo de este rango, sin importar cuántos haya por día
const RETENCION_DIAS_TOTAL = 30; // más allá de esto, no se conserva nada
const NOMBRE_RE = /^dev_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.db$/;

// ---- .env a mano (mismo patrón que scripts/respaldo-db-firebase.js) ----
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

function rutaDbDesdeDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (.env) -- no sé qué base respaldar.");
  const m = /^file:(.+)$/.exec(url.trim());
  if (!m) throw new Error(`DATABASE_URL no tiene forma "file:<ruta>": ${url}`);
  return path.resolve(m[1]);
}

// ---- Bogotá: UTC-5 fijo, Colombia no tiene horario de verano (mismo método ya
// usado y verificado en la comparación de cierres del 9-oct-2026, sin Intl ni
// dependencias: desplazar el reloj 5h y leer los campos UTC). ----
function partesBogota(d) {
  const b = new Date(d.getTime() - 5 * 3600 * 1000);
  return {
    y: b.getUTCFullYear(), m: b.getUTCMonth() + 1, day: b.getUTCDate(),
    h: b.getUTCHours(), min: b.getUTCMinutes(), s: b.getUTCSeconds(),
  };
}
function pad(n) { return String(n).padStart(2, "0"); }
function nombreArchivo(d) {
  const p = partesBogota(d);
  return `dev_${p.y}-${pad(p.m)}-${pad(p.day)}_${pad(p.h)}-${pad(p.min)}-${pad(p.s)}.db`;
}
function diaCivilDesdeNombre(nombre) {
  const m = NOMBRE_RE.exec(nombre);
  return `${m[1]}-${m[2]}-${m[3]}`;
}
function instanteDesdeNombre(nombre) {
  const m = NOMBRE_RE.exec(nombre);
  // El nombre ya está en hora Bogotá (pared) -- reconstruir el instante UTC real.
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 5, +m[5], +m[6]));
}

// En Windows, el handle que better-sqlite3 abre al validar un archivo que
// resulta NO ser un SQLite válido a veces tarda un instante en soltarse
// (visto en pruebas: EBUSY/EPERM al borrar justo después). Reintenta con
// pausas cortas antes de darse por vencido -- esto es borrar un respaldo que
// ya se decidió descartar, no una operación sobre datos en uso.
function borrarConReintentos(ruta, intentos = 5) {
  for (let i = 1; i <= intentos; i++) {
    try {
      fs.unlinkSync(ruta);
      return;
    } catch (e) {
      if (i === intentos) throw e;
      const fin = Date.now() + 150;
      while (Date.now() < fin) { /* pausa síncrona corta */ }
    }
  }
}

function contarTablas(db) {
  const tablas = ["Cliente", "Pedido", "Pago", "GastoCaja", "CierreCaja"];
  const out = {};
  for (const t of tablas) out[t] = db.prepare(`SELECT COUNT(*) as n FROM "${t}"`).get().n;
  return out;
}

function hacerRespaldo() {
  const origen = rutaDbDesdeDatabaseUrl();
  if (!fs.existsSync(origen)) throw new Error(`No existe la base en DATABASE_URL: ${origen}`);

  fs.mkdirSync(DESTINO_DIR, { recursive: true });
  const ahora = new Date();
  const destino = path.join(DESTINO_DIR, nombreArchivo(ahora));

  // Solo lectura sobre el origen: VACUUM INTO escribe únicamente en `destino`,
  // nunca en el archivo que se está respaldando -- puede estar en uso.
  const src = new Database(origen, { readonly: true, fileMustExist: true });
  try {
    src.prepare(`VACUUM INTO ?`).run(destino);
  } finally {
    src.close();
  }

  // Verificación de integridad SOBRE LA COPIA. Si falla, no dejar un respaldo corrupto.
  // OJO: si el archivo ni siquiera es un SQLite válido, `new Database(...)` lanza
  // una excepción -- eso también cuenta como "falló la verificación", no como un
  // crash sin manejar. Por eso el `new Database` va DENTRO del try, no antes.
  let integridad = "ERROR_DESCONOCIDO";
  let copia = null;
  try {
    copia = new Database(destino, { readonly: true, fileMustExist: true });
    integridad = copia.pragma("integrity_check", { simple: true });
  } catch (e) {
    integridad = `no se pudo verificar: ${e.message}`;
  } finally {
    if (copia) copia.close();
  }
  if (integridad !== "ok") {
    borrarConReintentos(destino);
    console.error(`[backup-seguro] integrity_check FALLÓ (${integridad}) -- respaldo descartado: ${destino}`);
    process.exitCode = 1;
    return null;
  }

  const verificada = new Database(destino, { readonly: true, fileMustExist: true });
  const conteos = contarTablas(verificada);
  verificada.close();

  console.log(`[backup-seguro] OK: ${destino}`);
  console.log(`[backup-seguro] integrity_check: ${integridad}`);
  console.log(`[backup-seguro] conteos: ${JSON.stringify(conteos)}`);
  return destino;
}

// ---- Retención: todo lo de las últimas 72h se conserva completo; de ahí hasta
// los 30 días, 1 por día civil (Bogotá) -- el más reciente de cada día; más
// allá de 30 días, nada. Solo mira archivos dev_<fecha>_<hora>.db -- cualquier
// otra cosa en la carpeta se ignora, nunca se toca. ----
function calcularRetencion(ahora) {
  if (!fs.existsSync(DESTINO_DIR)) return { conservar: [], borrar: [] };
  const archivos = fs.readdirSync(DESTINO_DIR).filter((n) => NOMBRE_RE.test(n));
  const limite72h = ahora.getTime() - RETENCION_HORAS_TODO * 3600 * 1000;
  const limite30d = ahora.getTime() - RETENCION_DIAS_TOTAL * 24 * 3600 * 1000;

  const conservar = [];
  const borrar = [];
  const porDia = new Map(); // día civil Bogotá -> archivo más reciente visto hasta ahora, entre los >72h y <=30d

  for (const nombre of archivos) {
    const instante = instanteDesdeNombre(nombre).getTime();
    if (instante >= limite72h) {
      conservar.push({ nombre, motivo: "dentro de las últimas 72h" });
      continue;
    }
    if (instante < limite30d) {
      borrar.push({ nombre, motivo: "más de 30 días" });
      continue;
    }
    const dia = diaCivilDesdeNombre(nombre);
    const actual = porDia.get(dia);
    if (!actual || instante > actual.instante) {
      if (actual) borrar.push({ nombre: actual.nombre, motivo: `no es el más reciente del ${dia}` });
      porDia.set(dia, { nombre, instante });
    } else {
      borrar.push({ nombre, motivo: `no es el más reciente del ${dia}` });
    }
  }
  for (const { nombre } of porDia.values()) conservar.push({ nombre, motivo: "1 por día (72h-30d)" });

  return { conservar, borrar };
}

function aplicarRetencion(aplicar) {
  const ahora = new Date();
  const { conservar, borrar } = calcularRetencion(ahora);
  console.log(`\n[retención] ${aplicar ? "APLICANDO (--aplicar)" : "dry-run (por defecto, nada se borra)"}`);
  console.log(`[retención] conservar: ${conservar.length}`);
  for (const c of conservar) console.log(`  mantener  ${c.nombre}  (${c.motivo})`);
  console.log(`[retención] borrar: ${borrar.length}`);
  for (const b of borrar) console.log(`  ${aplicar ? "BORRADO " : "borraría"}  ${b.nombre}  (${b.motivo})`);

  if (aplicar) {
    for (const b of borrar) fs.unlinkSync(path.join(DESTINO_DIR, b.nombre));
  }
  return { conservar: conservar.length, borrar: borrar.length };
}

function main() {
  const aplicar = process.argv.includes("--aplicar");
  const destino = hacerRespaldo();
  if (destino === null) {
    process.exit(process.exitCode || 1);
  }
  aplicarRetencion(aplicar);
}

if (require.main === module) main();

module.exports = { hacerRespaldo, calcularRetencion, aplicarRetencion, nombreArchivo, partesBogota, DESTINO_DIR };
