import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatPedido } from "@/lib/format";
import { METODOS_PAGO, type MetodoPago } from "@/lib/types";
import EntregaClient, { type PedidoEntrega } from "./EntregaClient";

async function buscarPedidoAction(codigo: string): Promise<PedidoEntrega | null> {
  "use server";
  const id = parseInt(codigo.replace(/\D/g, ""));
  if (!id || isNaN(id)) return null;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      prendas: { orderBy: { createdAt: "asc" } },
      pagos:   { orderBy: { createdAt: "asc" } },
    },
  });
  if (!pedido) return null;

  const abonado = pedido.pagos.reduce((s, p) => s + p.valor, 0);

  return {
    id:                pedido.id,
    codigoFormateado:  formatPedido(pedido.id),
    estado:            pedido.estado,
    fechaFormateada:   pedido.createdAt.toLocaleDateString("es-CO", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    }),
    cliente: {
      nombre:   pedido.cliente.nombre,
      telefono: pedido.cliente.telefono ?? "",
    },
    prendas: pedido.prendas.map((p) => ({
      tipo:        p.tipo,
      servicio:    p.servicio,
      cantidad:    p.cantidad,
      valor:       p.valor,
      descripcion: p.descripcion,
    })),
    total:   pedido.total,
    abonado,
    saldo:   Math.max(pedido.total - abonado, 0),
  };
}

async function marcarEntregadoAction(id: number): Promise<void> {
  "use server";
  await prisma.pedido.update({
    where: { id },
    data: {
      estado:   "ENTREGADO",
      historial: { create: { estado: "ENTREGADO" } },
    },
  });
  revalidatePath("/pedidos");
  revalidatePath("/gerente");
}

async function registrarPagoAction(
  id: number,
  valor: number,
  metodo: string,
): Promise<void> {
  "use server";
  if (!METODOS_PAGO.includes(metodo as MetodoPago) || valor <= 0) return;
  await prisma.pago.create({
    data: { pedidoId: id, valor, metodo: metodo as MetodoPago },
  });
  revalidatePath("/pedidos");
  revalidatePath("/gerente");
}

export default function EntregaPage() {
  return (
    <EntregaClient
      buscarPedidoAction={buscarPedidoAction}
      marcarEntregadoAction={marcarEntregadoAction}
      registrarPagoAction={registrarPagoAction}
    />
  );
}
