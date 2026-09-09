// =============================================================
//  SEED — Sede inicial "Principal"
//  Crea la sede id=1 usada como valor por defecto (sedeId) en
//  Cliente, Pedido, CierreCaja y GastoCaja mientras el negocio
//  opera con un solo local.
// =============================================================

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../prisma/dev.db");
const db = new Database(DB_PATH);

db.pragma("foreign_keys = ON");

const existente = db.prepare("SELECT id FROM Sede WHERE id = 1").get();

if (existente) {
  console.log("[OK] La sede Principal (id=1) ya existe. Nada que hacer.");
} else {
  db.prepare(
    "INSERT INTO Sede (id, nombre, createdAt) VALUES (1, 'Principal', CURRENT_TIMESTAMP)"
  ).run();
  console.log("[OK] Sede 'Principal' creada con id=1.");
}

db.close();
