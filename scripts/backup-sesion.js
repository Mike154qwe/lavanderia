// Acción manual para correr al final de una sesión de trabajo ("npm run
// backup:sesion"): hace exactamente lo mismo que backup-seguro.js (respaldo +
// integridad + conteos + retención real) y además copia el respaldo nuevo a
// OneDrive -- la tarea programada diaria (instalar-backup-seguro.ps1) NO
// copia a OneDrive, solo deja el archivo en C:\LaManuelita_Backups\auto.
"use strict";

const fs = require("fs");
const path = require("path");
const { hacerRespaldo, aplicarRetencion } = require("./backup-seguro.js");

const ONEDRIVE_DIR = "C:\\Users\\mikev\\OneDrive\\LaManuelita_Backups";

function main() {
  const destino = hacerRespaldo();
  if (destino === null) {
    console.error("[backup:sesion] el respaldo falló (ver arriba) -- no se copia a OneDrive.");
    process.exit(1);
  }

  fs.mkdirSync(ONEDRIVE_DIR, { recursive: true });
  const nombre = path.basename(destino);
  const destinoOneDrive = path.join(ONEDRIVE_DIR, nombre);
  fs.copyFileSync(destino, destinoOneDrive);
  console.log(`[backup:sesion] copiado a OneDrive: ${destinoOneDrive}`);

  // --aplicar real: es una acción manual y consciente al cierre de sesión,
  // igual que la tarea programada diaria -- no tiene sentido que se acumule
  // sin límite si nadie la corre en dry-run.
  aplicarRetencion(true);
}

main();
