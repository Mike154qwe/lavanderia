// =============================================================
//  SEED DE DATOS DE PRUEBA — La Manuelita
//  Simula una semana de operación realista
// =============================================================

const Database = require("better-sqlite3");
const path     = require("path");

const DB_PATH = path.join(__dirname, "../prisma/dev.db");
const db      = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Helpers ───────────────────────────────────────────────────

function ts(diasAtras, hora = 9, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, min, 0, 0);
  return d.getTime();
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Limpiar datos previos de prueba (opcional — comenta si no quieres) ──
// Solo borra si no hay datos reales importantes
const totalClientes = db.prepare("SELECT COUNT(*) AS n FROM Cliente").get().n;
if (totalClientes > 20) {
  console.log(`Ya hay ${totalClientes} clientes. Cancelando para no sobreescribir datos reales.`);
  process.exit(0);
}

// ── 1. CLIENTES ───────────────────────────────────────────────

const clientes = [
  { nombre: "María García",        telefono: "3001234567", direccion: "Cra 45 #23-10" },
  { nombre: "Carlos Rodríguez",    telefono: "3109876543", direccion: "Cll 80 #15-32" },
  { nombre: "Ana Martínez",        telefono: "3152345678", direccion: "Av 68 #9-45"   },
  { nombre: "Luis Hernández",      telefono: "3207654321", direccion: "Cra 91 #130-5" },
  { nombre: "Carmen López",        telefono: "3004567890", direccion: "Cll 127 #55-20"},
  { nombre: "Jorge Pérez",         telefono: "3118765432", direccion: "Cra 7 #45-67"  },
  { nombre: "Sandra Vargas",       telefono: "3166543210", direccion: "Cll 53 #20-18" },
  { nombre: "Andrés Morales",      telefono: "3012345678", direccion: "Av Suba #108-35"},
  { nombre: "Patricia Jiménez",    telefono: "3145678901", direccion: "Cra 103 #145-8"},
  { nombre: "Ricardo Castillo",    telefono: "3178901234", direccion: "Cll 170 #9-12" },
  { nombre: "Lucía Bermúdez",      telefono: "3023456789", direccion: "Cra 19 #63-40" },
  { nombre: "Fernando Acosta",     telefono: "3156789012", direccion: "Cll 26 #82-15" },
];

const insertCliente = db.prepare(
  "INSERT OR IGNORE INTO Cliente (nombre, telefono, direccion, createdAt) VALUES (?, ?, ?, ?)"
);

const clienteIds = [];
for (const c of clientes) {
  insertCliente.run(c.nombre, c.telefono, c.direccion, ts(randInt(10, 30)));
  const row = db.prepare("SELECT id FROM Cliente WHERE telefono = ?").get(c.telefono);
  clienteIds.push(row.id);
}
console.log(`[OK] ${clientes.length} clientes creados`);

// ── 2. PEDIDOS ────────────────────────────────────────────────

const SERVICIOS  = ["Lavado", "Planchado", "Tintura"];
const TIPOS      = ["Camisa", "Pantalón", "Chaqueta", "Vestido", "Cobija", "Tapete", "Tenis", "Traje", "Cubrelecho"];
const METODOS    = ["Efectivo", "Nequi", "Daviplata", "Transferencia"];
const NOVEDADES  = ["Roto", "Manchado", "Sin botón", "Delicado", "Pierde color", null, null, null];

const insertPedido   = db.prepare("INSERT INTO Pedido (clienteId, servicio, total, estado, createdAt) VALUES (?, ?, ?, ?, ?)");
const insertPrenda   = db.prepare("INSERT INTO Prenda (pedidoId, tipo, servicio, cantidad, valor, descripcion, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
const insertPago     = db.prepare("INSERT INTO Pago (pedidoId, valor, metodo, createdAt) VALUES (?, ?, ?, ?)");
const insertHistorial= db.prepare("INSERT INTO HistorialEstado (pedidoId, estado, createdAt) VALUES (?, ?, ?)");
const updatePedido   = db.prepare("UPDATE Pedido SET estado = ?, total = ? WHERE id = ?");

// Estructura: { diasAtras, estado, pagarCompleto, abono }
const ESCENARIOS = [
  // Entregados (varios dias atras)
  { dias: 6, estado: "ENTREGADO", pago: "completo"  },
  { dias: 6, estado: "ENTREGADO", pago: "completo"  },
  { dias: 5, estado: "ENTREGADO", pago: "completo"  },
  { dias: 5, estado: "ENTREGADO", pago: "abono"     },
  { dias: 4, estado: "ENTREGADO", pago: "completo"  },
  { dias: 4, estado: "ENTREGADO", pago: "completo"  },
  { dias: 3, estado: "ENTREGADO", pago: "completo"  },
  { dias: 3, estado: "ENTREGADO", pago: "abono"     },
  { dias: 2, estado: "ENTREGADO", pago: "completo"  },
  { dias: 2, estado: "ENTREGADO", pago: "completo"  },
  // Listos para entregar
  { dias: 3, estado: "LISTO",     pago: "abono"     },
  { dias: 2, estado: "LISTO",     pago: "ninguno"   },
  { dias: 2, estado: "LISTO",     pago: "abono"     },
  { dias: 1, estado: "LISTO",     pago: "ninguno"   },
  // En proceso
  { dias: 2, estado: "EN_PROCESO",pago: "abono"     },
  { dias: 1, estado: "EN_PROCESO",pago: "ninguno"   },
  { dias: 1, estado: "EN_PROCESO",pago: "abono"     },
  { dias: 0, estado: "EN_PROCESO",pago: "ninguno"   },
  // Recién recibidos hoy
  { dias: 0, estado: "RECIBIDO",  pago: "abono"     },
  { dias: 0, estado: "RECIBIDO",  pago: "ninguno"   },
  { dias: 0, estado: "RECIBIDO",  pago: "abono"     },
  { dias: 0, estado: "RECIBIDO",  pago: "ninguno"   },
  { dias: 0, estado: "RECIBIDO",  pago: "abono"     },
  // Cancelado
  { dias: 4, estado: "CANCELADO", pago: "ninguno"   },
];

let pedidosCreados = 0;
let prendasCreadas = 0;
let pagosCreados   = 0;

for (let i = 0; i < ESCENARIOS.length; i++) {
  const esc       = ESCENARIOS[i];
  const clienteId = clienteIds[i % clienteIds.length];
  const horaEntrada = randInt(8, 18);
  const createdAt  = ts(esc.dias, horaEntrada, randInt(0, 59));

  // Crear pedido temporal con total 0
  const pedidoRes = insertPedido.run(clienteId, "varios", 0, "RECIBIDO", createdAt);
  const pedidoId  = pedidoRes.lastInsertRowid;

  // Historial inicial
  insertHistorial.run(pedidoId, "RECIBIDO", createdAt);

  // Agregar entre 1 y 5 prendas
  const numPrendas = randInt(1, 5);
  let totalPedido  = 0;

  for (let j = 0; j < numPrendas; j++) {
    const tipo      = rand(TIPOS);
    const servicio  = rand(SERVICIOS);
    const cantidad  = randInt(1, 4);
    const valorUnit = rand([3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000]);
    const valor     = cantidad * valorUnit;
    const novedad   = rand(NOVEDADES);
    const pCreatedAt = createdAt + j * 60000;

    insertPrenda.run(pedidoId, tipo, servicio, cantidad, valor, novedad, pCreatedAt);
    totalPedido += valor;
    prendasCreadas++;
  }

  // Actualizar total y estado final
  updatePedido.run(esc.estado, totalPedido, pedidoId);

  // Historial de cambios de estado
  if (esc.estado === "EN_PROCESO" || esc.estado === "LISTO" || esc.estado === "ENTREGADO" || esc.estado === "CANCELADO") {
    insertHistorial.run(pedidoId, "EN_PROCESO", createdAt + 3_600_000);
  }
  if (esc.estado === "LISTO" || esc.estado === "ENTREGADO") {
    insertHistorial.run(pedidoId, "LISTO", createdAt + 7_200_000);
  }
  if (esc.estado === "ENTREGADO") {
    insertHistorial.run(pedidoId, "ENTREGADO", createdAt + 86_400_000);
  }
  if (esc.estado === "CANCELADO") {
    insertHistorial.run(pedidoId, "CANCELADO", createdAt + 1_800_000);
  }

  // Pagos según escenario
  if (esc.pago === "completo") {
    const metodo = rand(METODOS);
    insertPago.run(pedidoId, totalPedido, metodo, createdAt + 1000);
    pagosCreados++;
  } else if (esc.pago === "abono") {
    const abono  = Math.floor(totalPedido * (randInt(30, 70) / 100));
    const metodo = rand(METODOS);
    insertPago.run(pedidoId, abono, metodo, createdAt + 1000);
    // Si fue entregado, pagar el saldo al momento de entrega
    if (esc.estado === "ENTREGADO") {
      insertPago.run(pedidoId, totalPedido - abono, rand(METODOS), createdAt + 86_400_000 + 1000);
      pagosCreados++;
    }
    pagosCreados++;
  }

  pedidosCreados++;
}

console.log(`[OK] ${pedidosCreados} pedidos creados`);
console.log(`[OK] ${prendasCreadas} prendas creadas`);
console.log(`[OK] ${pagosCreados} pagos registrados`);

// ── 3. ENTREGAS PARCIALES ─────────────────────────────────────

// Tomar algunos pedidos LISTO y simular entrega parcial
const pedidosListo = db.prepare(`
  SELECT p.id, pr.id AS prendaId, pr.cantidad
  FROM Pedido p
  JOIN Prenda pr ON pr.pedidoId = p.id
  WHERE p.estado = 'LISTO'
  LIMIT 4
`).all();

const insertEntregaParcial = db.prepare(
  "INSERT INTO EntregaParcial (pedidoId, prendaId, cantidad, observacion, createdAt) VALUES (?, ?, ?, ?, ?)"
);

let parcialesCreadas = 0;
for (const row of pedidosListo) {
  const cantParcial = Math.max(1, Math.floor(row.cantidad / 2));
  insertEntregaParcial.run(row.id, row.prendaId, cantParcial, "Entrega parcial de prueba", Date.now());
  parcialesCreadas++;
}
console.log(`[OK] ${parcialesCreadas} entregas parciales registradas`);

// ── 4. GASTOS ─────────────────────────────────────────────────

const TIPOS_GASTO = ["Jabones", "Insumos", "Pago empleado", "Nómina", "Otro"];
const insertGasto = db.prepare(
  "INSERT INTO GastoCaja (tipo, descripcion, valor, metodo, responsable, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
);

const gastos = [
  { tipo: "Jabones",       desc: "Detergente líquido 5L",         valor: 45000,  dias: 6 },
  { tipo: "Insumos",       desc: "Bolsas plásticas para entrega", valor: 12000,  dias: 6 },
  { tipo: "Pago empleado", desc: "Pago semanal empleado",         valor: 250000, dias: 5 },
  { tipo: "Jabones",       desc: "Suavizante ropa x2",            valor: 28000,  dias: 5 },
  { tipo: "Insumos",       desc: "Ganchos plásticos x100",        valor: 15000,  dias: 4 },
  { tipo: "Jabones",       desc: "Detergente en polvo 2kg",       valor: 22000,  dias: 3 },
  { tipo: "Otro",          desc: "Reparación plancha industrial",  valor: 80000,  dias: 3 },
  { tipo: "Insumos",       desc: "Papel para recibos",            valor: 8000,   dias: 2 },
  { tipo: "Jabones",       desc: "Quitamanchas industrial",       valor: 35000,  dias: 2 },
  { tipo: "Nómina",        desc: "Quincena empleada",             valor: 400000, dias: 1 },
  { tipo: "Jabones",       desc: "Detergente líquido 5L",         valor: 45000,  dias: 0 },
  { tipo: "Insumos",       desc: "Bolsas y empaques",             valor: 18000,  dias: 0 },
];

for (const g of gastos) {
  insertGasto.run(g.tipo, g.desc, g.valor, rand(METODOS), "Empleado", ts(g.dias, randInt(9, 17)));
}
console.log(`[OK] ${gastos.length} gastos registrados`);

db.close();

// ── Resumen ───────────────────────────────────────────────────
console.log("\n====================================");
console.log("  DATOS DE PRUEBA CARGADOS");
console.log("====================================");
console.log(`  Clientes  : ${clientes.length}`);
console.log(`  Pedidos   : ${pedidosCreados}`);
console.log(`  Prendas   : ${prendasCreadas}`);
console.log(`  Pagos     : ${pagosCreados}`);
console.log(`  Parciales : ${parcialesCreadas}`);
console.log(`  Gastos    : ${gastos.length}`);
console.log("====================================");
console.log("\nAbre http://localhost:3000 para ver los datos.");
