import { prisma } from "@/lib/prisma";

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function inicioDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function finDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}

function pagosPorMetodo(pagos: any[], metodo: string) {
  return pagos.filter((pago) => pago.metodo === metodo);
}

function totalPagos(pagos: any[]) {
  return pagos.reduce((sum, pago) => sum + pago.valor, 0);
}

function renderPagos(titulo: string, pagos: any[]) {
  const total = totalPagos(pagos);

  return `
<div class="line"></div>
<h3>${titulo}</h3>

${
  pagos.length === 0
    ? `<p class="muted">Sin pagos</p>`
    : pagos
        .map(
          (pago) => `
<div class="item">
  <div><b>Recibo #${formatPedido(pago.pedido.id)}</b></div>
  <div>${pago.pedido.cliente.nombre}</div>
  <div>${new Date(pago.createdAt).toLocaleTimeString("es-CO")}</div>
  <div class="row">
    <span>${pago.metodo}</span>
    <span>${money(pago.valor)}</span>
  </div>
</div>
`
        )
        .join("")
}

<div class="row total-line">
  <span>Total ${titulo}</span>
  <span>${money(total)}</span>
</div>
`;
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await context.params;

  const cierre: any = await (prisma as any).cierreCaja.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!cierre) {
    return new Response("Cierre no encontrado", {
      status: 404,
    });
  }

  const inicio = inicioDia(cierre.createdAt);
  const fin = finDia(cierre.createdAt);

  const cierreAnterior: any = await (prisma as any).cierreCaja.findFirst({
    where: {
      id: {
        not: cierre.id,
      },
      createdAt: {
        gte: inicio,
        lt: cierre.createdAt,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const desde = cierreAnterior ? cierreAnterior.createdAt : inicio;
  const hasta = cierre.createdAt;

  const pagos: any[] = await (prisma as any).pago.findMany({
    where: {
      createdAt: {
        gt: desde,
        lte: hasta,
      },
    },
    include: {
      pedido: {
        include: {
          cliente: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const gastos: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gt: desde,
        lte: hasta,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const efectivo = pagosPorMetodo(pagos, "Efectivo");
  const nequi = pagosPorMetodo(pagos, "Nequi");
  const daviplata = pagosPorMetodo(pagos, "Daviplata");
  const transferencia = pagosPorMetodo(pagos, "Transferencia");
  const tarjeta = pagosPorMetodo(pagos, "Tarjeta");

  const totalGastos = gastos.reduce(
    (sum: number, gasto: any) => sum + gasto.valor,
    0
  );

  const totalRecibido = totalPagos(pagos);
  const totalCaja = totalRecibido - totalGastos;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>

<title>Cierre Caja ${cierre.id}</title>

<style>
body{
  font-family: monospace;
  padding:16px;
  width:340px;
  color:#000;
}

h1{
  text-align:center;
  font-size:18px;
  margin:0;
}

h2{
  text-align:center;
  font-size:14px;
  margin:4px 0 8px;
}

h3{
  font-size:13px;
  margin:8px 0;
  text-transform: uppercase;
}

.line{
  border-top:1px dashed #000;
  margin:10px 0;
}

.row{
  display:flex;
  justify-content:space-between;
  gap:10px;
  margin:4px 0;
}

.item{
  border-bottom:1px dotted #999;
  padding:6px 0;
  font-size:12px;
}

.total-line{
  font-weight:bold;
  font-size:13px;
  margin-top:8px;
}

.big-total{
  font-size:18px;
  font-weight:bold;
}

.center{
  text-align:center;
}

.muted{
  color:#555;
  font-size:12px;
}

button{
  margin-top:20px;
  width:100%;
  padding:10px;
  font-size:16px;
}
</style>
</head>

<body>

<h1>LAVASECO LA MANUELITA</h1>
<h2>CIERRE DE CAJA No. ${String(cierre.id).padStart(5, "0")}</h2>

<div class="line"></div>

<div class="row">
  <span>Fecha</span>
  <span>${new Date(cierre.createdAt).toLocaleDateString("es-CO")}</span>
</div>

<div class="row">
  <span>Desde</span>
  <span>${new Date(desde).toLocaleTimeString("es-CO")}</span>
</div>

<div class="row">
  <span>Hasta</span>
  <span>${new Date(hasta).toLocaleTimeString("es-CO")}</span>
</div>

<div class="row">
  <span>Responsable</span>
  <span>${cierre.responsable || "-"}</span>
</div>

${renderPagos("Efectivo", efectivo)}
${renderPagos("Nequi", nequi)}
${renderPagos("Daviplata", daviplata)}
${renderPagos("Transferencia", transferencia)}
${renderPagos("Tarjeta", tarjeta)}

<div class="line"></div>
<h3>Gastos</h3>

${
  gastos.length === 0
    ? `<p class="muted">Sin gastos</p>`
    : gastos
        .map(
          (gasto) => `
<div class="item">
  <div><b>${gasto.tipo}</b></div>
  <div>${gasto.descripcion || "Sin descripción"}</div>
  <div>${new Date(gasto.createdAt).toLocaleTimeString("es-CO")}</div>
  <div class="row">
    <span>${gasto.metodo || "-"}</span>
    <span>-${money(gasto.valor)}</span>
  </div>
</div>
`
        )
        .join("")
}

<div class="row total-line">
  <span>Total gastos</span>
  <span>-${money(totalGastos)}</span>
</div>

<div class="line"></div>

<div class="row total-line">
  <span>Total recibido</span>
  <span>${money(totalRecibido)}</span>
</div>

<div class="row total-line">
  <span>Gastos</span>
  <span>-${money(totalGastos)}</span>
</div>

<div class="row big-total">
  <span>Total caja</span>
  <span>${money(totalCaja)}</span>
</div>

<div class="line"></div>

<div>
  <b>Observación:</b>
  <br/>
  ${cierre.observacion || "-"}
</div>

<div class="line"></div>

<p class="center">
Generado por Sistema Lavaseco
</p>

<button onclick="window.print()">
🖨️ Imprimir Ticket
</button>

</body>
</html>
`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}