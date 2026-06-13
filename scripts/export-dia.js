// =============================================================
//  EXPORTACION DIARIA — La Manuelita
//  Genera dos CSV por dia:
//    1. reporte_YYYY-MM-DD.csv   — actividad del dia
//    2. inventario_YYYY-MM-DD.csv — prendas en piso al cierre
//  Destinos: OneDrive y Google Drive
// =============================================================

const Database = require("better-sqlite3");
const fs       = require("fs");
const path     = require("path");
const os       = require("os");

const DB_PATH   = path.join(__dirname, "../prisma/dev.db");
const ONEDRIVE  = path.join(os.homedir(), "OneDrive", "LaManuelita_Exportaciones");
const GDRIVE    = path.join("G:\\Mi unidad", "LaManuelita_Exportaciones");

// --- Fecha de hoy ---
const hoy       = new Date();
const fechaStr  = hoy.toISOString().slice(0, 10); // YYYY-MM-DD
const mes       = fechaStr.slice(0, 7);            // YYYY-MM
const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
const finDia    = inicioDia + 86_400_000;

// --- Abrir BD ---
const db = new Database(DB_PATH, { readonly: true });

// ── 1. REPORTE DEL DIA ────────────────────────────────────────

// Pedidos nuevos hoy
const pedidosHoy = db.prepare(`
  SELECT p.id, p.total, p.estado, p.createdAt,
         c.nombre AS cliente, c.telefono
  FROM Pedido p
  JOIN Cliente c ON p.clienteId = c.id
  WHERE p.createdAt >= ? AND p.createdAt < ?
  ORDER BY p.createdAt
`).all(inicioDia, finDia);

// Pagos recibidos hoy
const pagosHoy = db.prepare(`
  SELECT pg.valor, pg.metodo, pg.createdAt,
         p.id AS pedidoId, c.nombre AS cliente
  FROM Pago pg
  JOIN Pedido p ON pg.pedidoId = p.id
  JOIN Cliente c ON p.clienteId = c.id
  WHERE pg.createdAt >= ? AND pg.createdAt < ?
  ORDER BY pg.createdAt
`).all(inicioDia, finDia);

// Entregas del dia
const entregasHoy = db.prepare(`
  SELECT p.id AS pedidoId, c.nombre AS cliente, p.total, h.createdAt
  FROM HistorialEstado h
  JOIN Pedido p ON h.pedidoId = p.id
  JOIN Cliente c ON p.clienteId = c.id
  WHERE h.estado = 'ENTREGADO'
    AND h.createdAt >= ? AND h.createdAt < ?
  ORDER BY h.createdAt
`).all(inicioDia, finDia);

// Gastos del dia
const gastosHoy = db.prepare(`
  SELECT tipo, descripcion, valor, metodo, createdAt
  FROM GastoCaja
  WHERE createdAt >= ? AND createdAt < ?
  ORDER BY createdAt
`).all(inicioDia, finDia);

// Totales
const totalIngresos = pagosHoy.reduce((s, p) => s + p.valor, 0);
const totalGastos   = gastosHoy.reduce((s, g) => s + g.valor, 0);
const totalEfectivo = pagosHoy.filter(p => p.metodo === "Efectivo").reduce((s, p) => s + p.valor, 0);
const totalDigital  = totalIngresos - totalEfectivo;

function formatMoney(v) {
  return `$${Number(v).toLocaleString("es-CO")}`;
}
function formatFecha(ts) {
  return new Date(ts).toLocaleString("es-CO", { hour12: false });
}
function csvRow(...cols) {
  return cols.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",");
}

// Armar CSV reporte
const lineasReporte = [
  // Encabezado del resumen
  csvRow("=== RESUMEN DEL DIA ===", fechaStr),
  csvRow("Pedidos nuevos",    pedidosHoy.length),
  csvRow("Entregas realizadas", entregasHoy.length),
  csvRow("Total ingresos",    formatMoney(totalIngresos)),
  csvRow("  Efectivo",        formatMoney(totalEfectivo)),
  csvRow("  Digital",         formatMoney(totalDigital)),
  csvRow("Total gastos",      formatMoney(totalGastos)),
  csvRow("Caja neta",         formatMoney(totalIngresos - totalGastos)),
  csvRow(""),

  // Pedidos nuevos
  csvRow("=== PEDIDOS NUEVOS ==="),
  csvRow("ID", "Cliente", "Telefono", "Total", "Estado", "Hora"),
  ...pedidosHoy.map(p =>
    csvRow(
      String(p.id).padStart(5, "0"),
      p.cliente,
      p.telefono ?? "",
      formatMoney(p.total),
      p.estado,
      formatFecha(p.createdAt),
    )
  ),
  csvRow(""),

  // Pagos
  csvRow("=== PAGOS RECIBIDOS ==="),
  csvRow("Pedido", "Cliente", "Valor", "Metodo", "Hora"),
  ...pagosHoy.map(p =>
    csvRow(
      String(p.pedidoId).padStart(5, "0"),
      p.cliente,
      formatMoney(p.valor),
      p.metodo,
      formatFecha(p.createdAt),
    )
  ),
  csvRow(""),

  // Entregas
  csvRow("=== ENTREGAS ==="),
  csvRow("Pedido", "Cliente", "Total pedido", "Hora entrega"),
  ...entregasHoy.map(e =>
    csvRow(
      String(e.pedidoId).padStart(5, "0"),
      e.cliente,
      formatMoney(e.total),
      formatFecha(e.createdAt),
    )
  ),
  csvRow(""),

  // Gastos
  csvRow("=== GASTOS ==="),
  csvRow("Tipo", "Descripcion", "Valor", "Metodo", "Hora"),
  ...gastosHoy.map(g =>
    csvRow(
      g.tipo,
      g.descripcion ?? "",
      formatMoney(g.valor),
      g.metodo,
      formatFecha(g.createdAt),
    )
  ),
];

// ── 2. INVENTARIO EN PISO ─────────────────────────────────────

const enPiso = db.prepare(`
  SELECT p.id, p.total, p.estado, p.createdAt,
         c.nombre AS cliente, c.telefono
  FROM Pedido p
  JOIN Cliente c ON p.clienteId = c.id
  WHERE p.estado NOT IN ('ENTREGADO', 'CANCELADO')
  ORDER BY p.createdAt
`).all();

const prendas = db.prepare(`
  SELECT pedidoId, tipo, servicio, cantidad, valor, descripcion
  FROM Prenda
`).all();

const pagosActivos = db.prepare(`
  SELECT pedidoId, SUM(valor) AS abonado
  FROM Pago
  GROUP BY pedidoId
`).all();

const abonadoMap = {};
for (const p of pagosActivos) abonadoMap[p.pedidoId] = p.abonado;

const prendasMap = {};
for (const pr of prendas) {
  if (!prendasMap[pr.pedidoId]) prendasMap[pr.pedidoId] = [];
  prendasMap[pr.pedidoId].push(pr);
}

function diasEnPiso(ts) {
  return Math.floor((Date.now() - ts) / 86_400_000);
}

const lineasInventario = [
  csvRow("=== INVENTARIO EN PISO AL CIERRE ===", fechaStr),
  csvRow(`Total pedidos activos: ${enPiso.length}`),
  csvRow(""),
  csvRow("Pedido", "Cliente", "Telefono", "Estado", "Dias en piso", "Prendas", "Total", "Abonado", "Saldo", "Fecha entrada"),
  ...enPiso.map(p => {
    const abonado = abonadoMap[p.id] ?? 0;
    const saldo   = p.total - abonado;
    const dias    = diasEnPiso(p.createdAt);
    const listaPrendas = (prendasMap[p.id] ?? [])
      .map(pr => `${pr.cantidad}x ${pr.tipo} (${pr.servicio})`)
      .join(" | ");
    return csvRow(
      String(p.id).padStart(5, "0"),
      p.cliente,
      p.telefono ?? "",
      p.estado,
      dias,
      listaPrendas,
      formatMoney(p.total),
      formatMoney(abonado),
      formatMoney(saldo),
      formatFecha(p.createdAt),
    );
  }),
];

db.close();

// ── 3. GUARDAR ARCHIVOS ───────────────────────────────────────

function guardarCSV(directorio, nombre, lineas) {
  const carpetaMes = path.join(directorio, mes);
  if (!fs.existsSync(carpetaMes)) fs.mkdirSync(carpetaMes, { recursive: true });
  const ruta = path.join(carpetaMes, nombre);
  fs.writeFileSync(ruta, "﻿" + lineas.join("\n"), "utf8"); // BOM para Excel
  const kb = (fs.statSync(ruta).size / 1024).toFixed(1);
  console.log(`[OK] ${ruta} (${kb} KB)`);
}

const nombreReporte    = `reporte_${fechaStr}.csv`;
const nombreInventario = `inventario_${fechaStr}.csv`;

let errores = 0;

for (const [etiqueta, dir] of [["ONEDRIVE", ONEDRIVE], ["GDRIVE", GDRIVE]]) {
  try {
    guardarCSV(dir, nombreReporte,    lineasReporte);
    guardarCSV(dir, nombreInventario, lineasInventario);
    console.log(`[OK] ${etiqueta}: exportacion completa`);
  } catch (e) {
    console.error(`[ERROR] ${etiqueta}: ${e.message}`);
    errores++;
  }
}

if (errores === 0) {
  console.log(`\n[LISTO] Exportacion del ${fechaStr} completada en ambas nubes.`);
} else {
  console.log(`\n[AVISO] ${errores} destino(s) fallaron. Revisa las conexiones.`);
}
