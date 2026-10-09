// Respaldo LOCAL seguro de una base SQLite -- complementa (no reemplaza) a
// scripts/respaldo-db-firebase.js (ese sube a la nube cada 25 min; este deja
// una copia point-in-time en disco, con integridad verificada y retención
// acotada, pensado para una tarea programada diaria o para correr a mano al
// final de una sesión de trabajo -- ver scripts/instalar-backup-seguro.ps1 y
// scripts/backup-sesion.js).
//
// A propósito: la ruta de la base SIEMPRE se pasa explícita con --db, nunca
// se adivina (ni de DATABASE_URL, ni de una ruta fija). La primera versión
// la leía de DATABASE_URL automáticamente; se cambió a propósito (10-oct-2026)
// para que correr esto nunca dependa de qué .env esté cargado en ese momento
// ni de desde qué carpeta se invoque -- quien lo corre dice explícitamente
// qué base respalda, y el script lo imprime siempre, sin ambigüedad.
//
// Uso:
//   node scripts/backup-seguro.js --db <ruta absoluta a un .db>              -- respalda + retención en dry-run
//   node scripts/backup-seguro.js --db <ruta absoluta a un .db> --aplicar    -- respalda + retención real (borra)
"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DESTINO_DIR = "C:\\LaManuelita_Backups\\auto";
const RETENCION_HORAS_TODO = 72; // conserva TODO lo de este rango, sin importar cuántos haya por día
const RETENCION_DIAS_TOTAL = 30; // más allá de esto, no se conserva nada
// Sin segundos a propósito (AAAA-MM-DD_HH-MM): dos respaldos dentro del mismo
// minuto civil de Bogotá chocan de nombre -- VACUUM INTO falla porque el
// destino ya existe, con un error claro, en vez de pisarse en silencio.
const NOMBRE_RE = /^dev_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})\.db$/;

function errorYSalir(mensaje) {
  console.error(`[backup-seguro] ${mensaje}`);
  process.exit(1);
}

/** --db <ruta>: obligatorio, debe existir, ser un archivo, y terminar en .db. Sin adivinar nada. */
function rutaDbDesdeArgv(argv) {
  const i = argv.indexOf("--db");
  if (i === -1 || !argv[i + 1]) {
    errorYSalir('Falta --db <ruta absoluta>. No se adivina la base a respaldar -- hay que pasarla explícita. Ejemplo: --db "C:\\ruta\\a\\dev.db"');
  }
  const ruta = path.resolve(argv[i + 1]);
  if (!fs.existsSync(ruta)) errorYSalir(`--db no existe: ${ruta}`);
  const info = fs.statSync(ruta);
  if (!info.isFile()) errorYSalir(`--db no es un archivo: ${ruta}`);
  if (path.extname(ruta).toLowerCase() !== ".db") errorYSalir(`--db debe terminar en .db: ${ruta}`);
  return ruta;
}

// ---- Bogotá: UTC-5 fijo, Colombia no tiene horario de verano (mismo método ya
// usado y verificado en la comparación de cierres del 9-oct-2026, sin Intl ni
// dependencias: desplazar el reloj 5h y leer los campos UTC). ----
function partesBogota(d) {
  const b = new Date(d.getTime() - 5 * 3600 * 1000);
  return {
    y: b.getUTCFullYear(), m: b.getUTCMonth() + 1, day: b.getUTCDate(),
    h: b.getUTCHours(), min: b.getUTCMinutes(),
  };
}
function pad(n) { return String(n).padStart(2, "0"); }
function nombreArchivo(d) {
  const p = partesBogota(d);
  return `dev_${p.y}-${pad(p.m)}-${pad(p.day)}_${pad(p.h)}-${pad(p.min)}.db`;
}
function diaCivilDesdeNombre(nombre) {
  const m = NOMBRE_RE.exec(nombre);
  return `${m[1]}-${m[2]}-${m[3]}`;
}
function instanteDesdeNombre(nombre) {
  const m = NOMBRE_RE.exec(nombre);
  // El nombre ya está en hora Bogotá (pared) -- reconstruir el instante UTC real.
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 5, +m[5], 0));
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

/** `rutaDb` ya validada por rutaDbDesdeArgv (o, en pruebas, a mano). */
function hacerRespaldo(rutaDb) {
  console.log(`[backup-seguro] respaldando: ${rutaDb}`);

  fs.mkdirSync(DESTINO_DIR, { recursive: true });
  const ahora = new Date();
  const destino = path.join(DESTINO_DIR, nombreArchivo(ahora));

  // Solo lectura sobre el origen: VACUUM INTO escribe únicamente en `destino`,
  // nunca en el archivo que se está respaldando -- puede estar en uso.
  const src = new Database(rutaDb, { readonly: true, fileMustExist: true });
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
// allá de 30 días, nada. SOLO mira DESTINO_DIR (fijo, no configurable) y
// archivos cuyo nombre completo coincide con NOMBRE_RE -- cualquier otra cosa
// en esa carpeta, o cualquier archivo fuera de ella (aunque coincida el
// patrón), nunca se toca ni se lista. ----
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
  console.log(`\n[retención] carpeta: ${DESTINO_DIR}`);
  console.log(`[retención] ${aplicar ? "APLICANDO (--aplicar)" : "dry-run (por defecto, nada se borra)"}`);
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
  const argv = process.argv.slice(2);
  const aplicar = argv.includes("--aplicar");
  const rutaDb = rutaDbDesdeArgv(argv);
  const destino = hacerRespaldo(rutaDb);
  if (destino === null) {
    process.exit(process.exitCode || 1);
  }
  aplicarRetencion(aplicar);
}

if (require.main === module) main();

module.exports = {
  hacerRespaldo, calcularRetencion, aplicarRetencion, nombreArchivo, partesBogota,
  rutaDbDesdeArgv, DESTINO_DIR, NOMBRE_RE,
};
