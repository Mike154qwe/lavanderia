import { prisma } from "@/lib/prisma";
import { money, formatPedido } from "@/lib/format";

function inicioDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function finDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}

function pagosPorMetodo(pagos: any[], metodo: string) {
  return pagos.filter((p) => p.metodo === metodo);
}

function totalPagos(pagos: any[]) {
  return pagos.reduce((s, p) => s + p.valor, 0);
}

function hora(date: Date | string) {
  return new Date(date).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Renderiza una sección de pagos por método. Omite si está vacía. */
function renderMetodo(titulo: string, pagos: any[]) {
  if (pagos.length === 0) return "";
  const total = totalPagos(pagos);
  return `
<div class="seccion">
  <div class="sec-header">
    <span>${titulo} <span class="badge">${pagos.length}</span></span>
    <span>${money(total)}</span>
  </div>
  <div class="sec-body">
    ${pagos
      .map(
        (p) => `
    <div class="pay-row">
      <span class="num">#${formatPedido(p.pedido.id)}</span>
      <span class="t">${hora(p.createdAt)}</span>
      <span class="monto">${money(p.valor)}</span>
    </div>`
      )
      .join("")}
  </div>
</div>`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const cierre = await prisma.cierreCaja.findUnique({
    where: { id: Number(id) },
  });

  if (!cierre) {
    return new Response("Cierre no encontrado", { status: 404 });
  }

  const inicio = inicioDia(cierre.createdAt);
  const fin    = finDia(cierre.createdAt);

  const cierreAnterior = await prisma.cierreCaja.findFirst({
    where: {
      id:        { not: cierre.id },
      createdAt: { gte: inicio, lt: cierre.createdAt },
    },
    orderBy: { createdAt: "desc" },
  });

  const desde = cierreAnterior ? cierreAnterior.createdAt : inicio;
  const hasta = cierre.createdAt;

  const pagos = await prisma.pago.findMany({
    where:   { createdAt: { gt: desde, lte: hasta } },
    include: { pedido: { include: { cliente: true } } },
    orderBy: { createdAt: "asc" },
  });

  const gastos = await prisma.gastoCaja.findMany({
    where:   { createdAt: { gt: desde, lte: hasta } },
    orderBy: { createdAt: "asc" },
  });

  const efectivo      = pagosPorMetodo(pagos, "Efectivo");
  const nequi         = pagosPorMetodo(pagos, "Nequi");
  const daviplata     = pagosPorMetodo(pagos, "Daviplata");
  const transferencia = pagosPorMetodo(pagos, "Transferencia");
  const tarjeta       = pagosPorMetodo(pagos, "Tarjeta");

  const totalGastos   = gastos.reduce((s: number, g: any) => s + g.valor, 0);
  const totalRecibido = totalPagos(pagos);
  const totalCaja     = totalRecibido - totalGastos;

  const resumenMetodos = [
    { label: "Efectivo",      val: totalPagos(efectivo) },
    { label: "Nequi",         val: totalPagos(nequi) },
    { label: "Daviplata",     val: totalPagos(daviplata) },
    { label: "Transferencia", val: totalPagos(transferencia) },
    { label: "Tarjeta",       val: totalPagos(tarjeta) },
  ].filter((m) => m.val > 0);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Cierre de Caja ${String(cierre.id).padStart(5, "0")}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
  width:360px;
  margin:0 auto;
  padding:16px 14px 24px;
  color:#111;
  background:#fff;
  font-size:12px;
}

/* ── Header ── */
.header{
  text-align:center;
  padding-bottom:10px;
  border-bottom:3px solid #BF0D59;
  margin-bottom:10px;
}
.header h1{
  font-size:15px;
  font-weight:900;
  letter-spacing:0.4px;
  color:#BF0D59;
  text-transform:uppercase;
}
.cierre-id{
  font-size:18px;
  font-weight:900;
  margin:4px 0 2px;
}
.header small{
  font-size:10px;
  color:#888;
}

/* ── Info ── */
.info{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:3px 8px;
  background:#fdf0f6;
  border-radius:6px;
  padding:8px 10px;
  margin-bottom:10px;
  font-size:11px;
}
.info .lbl{color:#999}
.info .val{font-weight:700;text-align:right}

/* ── Sección pagos ── */
.seccion{
  margin-bottom:8px;
  border:1px solid #f0dce8;
  border-radius:6px;
  overflow:hidden;
}

.sec-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#BF0D59;
  color:#fff;
  padding:5px 9px;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:0.3px;
}
.sec-header .badge{
  display:inline-block;
  background:rgba(255,255,255,0.25);
  border-radius:10px;
  padding:0 5px;
  font-size:10px;
  margin-left:4px;
}

.sec-body{background:#fff}

.pay-row{
  display:flex;
  align-items:center;
  padding:4px 9px;
  border-bottom:1px solid #faeef5;
  gap:6px;
}
.pay-row:last-child{border-bottom:none}
.pay-row .num{font-weight:700;color:#BF0D59;flex:0 0 auto}
.pay-row .t{color:#999;flex:1;font-size:10px}
.pay-row .monto{font-weight:700;flex:0 0 auto}

/* ── Gastos ── */
.gastos-section{
  margin-bottom:8px;
  border:1px solid #f0dce8;
  border-radius:6px;
  overflow:hidden;
}
.gastos-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#555;
  color:#fff;
  padding:5px 9px;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
}
.gasto-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:5px 9px;
  border-bottom:1px solid #f5f5f5;
  gap:6px;
}
.gasto-row:last-child{border-bottom:none}
.gasto-row .g-tipo{font-weight:600;flex:1}
.gasto-row .g-hora{color:#999;font-size:10px}
.gasto-row .g-monto{font-weight:700;color:#c00;flex:0 0 auto}

/* ── Resumen ── */
.resumen{
  border:2px solid #BF0D59;
  border-radius:6px;
  overflow:hidden;
  margin-bottom:10px;
}
.resumen-title{
  background:#BF0D59;
  color:#fff;
  text-align:center;
  font-weight:900;
  font-size:11px;
  letter-spacing:0.5px;
  padding:5px;
  text-transform:uppercase;
}
.res-row{
  display:flex;
  justify-content:space-between;
  padding:5px 10px;
  border-bottom:1px solid #faeef5;
  font-size:12px;
}
.res-row:last-child{border-bottom:none}
.res-row.sub{color:#777;font-size:11px}
.res-row.total-final{
  background:#BF0D59;
  color:#fff;
  font-weight:900;
  font-size:15px;
  padding:8px 10px;
}

/* ── Observación ── */
.obs{
  margin-bottom:10px;
  font-size:11px;
  padding:7px 9px;
  background:#fdf0f6;
  border-radius:6px;
  border-left:3px solid #BF0D59;
  color:#555;
  line-height:1.4;
}
.obs strong{color:#111;display:block;margin-bottom:2px}

/* ── Footer ── */
.footer{
  text-align:center;
  font-size:10px;
  color:#bbb;
  border-top:1px dashed #eee;
  padding-top:8px;
  margin-bottom:12px;
}

/* ── Acciones ── */
.btn-print{
  width:100%;
  padding:10px;
  background:#BF0D59;
  color:#fff;
  border:none;
  border-radius:8px;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
}
.btn-print:hover{background:#a00a4d}
.btn-back{
  display:block;
  text-align:center;
  margin-top:8px;
  color:#aaa;
  font-size:11px;
  text-decoration:none;
}

@media print{
  .btn-print,.btn-back{display:none}
  body{padding:0}
}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <h1>Lavaseco La Manuelita</h1>
  <div class="cierre-id">CIERRE DE CAJA #${String(cierre.id).padStart(5, "0")}</div>
  <small>${new Date(cierre.createdAt).toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</small>
</div>

<!-- Datos del cierre -->
<div class="info">
  <span class="lbl">Desde</span>
  <span class="val">${hora(desde)}</span>
  <span class="lbl">Hasta</span>
  <span class="val">${hora(hasta)}</span>
  <span class="lbl">Responsable</span>
  <span class="val">${cierre.responsable || "—"}</span>
  <span class="lbl">Pedidos cobrados</span>
  <span class="val">${pagos.length}</span>
</div>

<!-- Pagos por método (solo los que tienen movimientos) -->
${renderMetodo("Efectivo", efectivo)}
${renderMetodo("Nequi", nequi)}
${renderMetodo("Daviplata", daviplata)}
${renderMetodo("Transferencia", transferencia)}
${renderMetodo("Tarjeta", tarjeta)}

${
  pagos.length === 0
    ? `<div class="seccion"><div class="sec-header" style="background:#ccc;color:#666"><span>Sin cobros en este período</span></div></div>`
    : ""
}

<!-- Gastos -->
<div class="gastos-section">
  <div class="gastos-header">
    <span>Gastos <span class="badge" style="background:rgba(255,255,255,.2);border-radius:10px;padding:0 5px;font-size:10px;margin-left:4px">${gastos.length}</span></span>
    <span>-${money(totalGastos)}</span>
  </div>
  ${
    gastos.length === 0
      ? `<div class="gasto-row"><span class="g-tipo" style="color:#aaa">Sin gastos</span></div>`
      : gastos
          .map(
            (g) => `
  <div class="gasto-row">
    <span class="g-tipo">${g.tipo}${g.descripcion ? `<br/><span style="font-weight:400;color:#999;font-size:10px">${g.descripcion}</span>` : ""}</span>
    <span class="g-hora">${hora(g.createdAt)}</span>
    <span class="g-monto">-${money(g.valor)}</span>
  </div>`
          )
          .join("")
  }
</div>

<!-- Resumen final -->
<div class="resumen">
  <div class="resumen-title">Resumen del cierre</div>
  ${resumenMetodos.map((m) => `
  <div class="res-row sub">
    <span>${m.label}</span>
    <span>${money(m.val)}</span>
  </div>`).join("")}
  <div class="res-row">
    <span>Total recibido</span>
    <span>${money(totalRecibido)}</span>
  </div>
  <div class="res-row">
    <span>Total gastos</span>
    <span style="color:#c00">-${money(totalGastos)}</span>
  </div>
  <div class="res-row total-final">
    <span>Total caja</span>
    <span>${money(totalCaja)}</span>
  </div>
</div>

${
  cierre.observacion
    ? `<div class="obs"><strong>Observación</strong>${cierre.observacion}</div>`
    : ""
}

<div class="footer">
  Generado el ${new Date().toLocaleString("es-CO")} · Sistema Lavaseco
</div>

<button class="btn-print" onclick="window.print()">Imprimir ticket</button>
<a href="/gerente" class="btn-back">← Volver al panel</a>

</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
