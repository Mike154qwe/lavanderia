// =============================================================
//  SEED — Tarifario (RF02)
//  Carga el catálogo de precios base (Tabla 5) usado para
//  autocompletar el valor de las prendas en NuevoPedidoForm.
// =============================================================

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../prisma/dev.db");
const db = new Database(DB_PATH);

// categoria, item, precioMin, precioMax (null = precio fijo)
const TARIFAS = [
  ["Vestidos", "De gala", 40000, 80000],
  ["Uniformes", "Escolar", 15000, null],
  ["Uniformes", "Empresarial", 18000, null],
  ["Uniformes", "Overol industrial", 20000, null],
  ["Maletas", "Escolar", 18000, null],
  ["Maletas", "De cabina", 25000, null],
  ["Maletas", "Mediana", 30000, null],
  ["Maletas", "Grande", 40000, null],
  ["Maletas", "Ejecutiva", 35000, null],
  ["Chaquetas", "Sencilla", 10000, null],
  ["Chaquetas", "Deportiva", 12000, null],
  ["Chaquetas", "De jean", 12000, null],
  ["Chaquetas", "Impermeable", 15000, null],
  ["Chaquetas", "Acolchada", 20000, null],
  ["Chaquetas", "De plumas", 25000, null],
  ["Chaquetas", "De cuero sintético", 25000, null],
  ["Chaquetas", "De cuero", 60000, null],
  ["Calzado", "Botas de trabajo", 20000, null],
  ["Calzado", "Botas de cuero", 25000, null],
  ["Calzado", "Botas industriales", 30000, null],
  ["Otros", "Buso", 12000, null],

  ["Tinturado", "Tinturado (general)", 26000, null],
  ["Planchado", "Camisa", 7000, null],
  ["Planchado", "Pantalón", 7000, null],
  ["Planchado", "Cortina", 20000, null],
  ["Lavado", "Tenis", 22000, null],
  ["Ropa de cama", "Cubrelecho normal", 30000, null],
  ["Ropa de cama", "Cubrelecho grande", 40000, null],
  ["Ropa de cama", "Sábana sencilla", 8000, 12000],
  ["Ropa de cama", "Sábana semidoble", 10000, 15000],
  ["Ropa de cama", "Sábana doble", 12000, 18000],
  ["Ropa de cama", "Sábana queen", 15000, 20000],
  ["Ropa de cama", "Juego de sábanas", 15000, 20000],
  ["Ropa de cama", "Almohada estándar", 10000, 18000],
  ["Ropa de cama", "Almohada grande", 15000, 25000],
  ["Ropa de cama", "Almohada de plumas", 20000, 35000],
  ["Ropa de cama", "Plumón sencillo", 25000, null],
  ["Ropa de cama", "Plumón semidoble", 30000, null],
  ["Ropa de cama", "Plumón doble", 35000, null],
  ["Ropa de cama", "Plumón queen", 40000, null],
  ["Ropa de cama", "Plumón king", 45000, null],
  ["Ropa de cama", "Plumón de plumas", 50000, null],
  ["Peluches", "Pequeños", 20000, 30000],
  ["Peluches", "Grandes", 80000, 90000],
  ["Tapetes", "Pequeños", 30000, null],
  ["Tapetes", "Grandes", 60000, null],
  ["Cortinas", "Pequeña", 25000, 40000],
  ["Cortinas", "Mediana", 40000, 70000],
  ["Cortinas", "Grande", 70000, 120000],
  ["Cortinas", "Black out", 80000, 150000],
  ["Vestidos", "Casual", 15000, 30000],
  ["Vestidos", "De oficina", 25000, 45000],
];

const insert = db.prepare(
  "INSERT OR IGNORE INTO Tarifario (categoria, item, precioMin, precioMax) VALUES (?, ?, ?, ?)"
);

let creados = 0;
for (const [categoria, item, precioMin, precioMax] of TARIFAS) {
  const res = insert.run(categoria, item, precioMin, precioMax);
  if (res.changes > 0) creados++;
}

console.log(`[OK] ${creados} tarifas nuevas insertadas (${TARIFAS.length - creados} ya existían).`);

db.close();
