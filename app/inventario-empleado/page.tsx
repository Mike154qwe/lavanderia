import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import InventarioEmpleadoClient from "./InventarioEmpleadoClient";

export const metadata: Metadata = { title: "Inventario" };
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function buscarPedidos(q: string) {
  if (!q.trim()) return [];

  const qLimpio = q.replace(/^0+/, "");
  const idNumber = Number(qLimpio);

  return await prisma.pedido.findMany({
    where: {
      estado: {
        notIn: ["ENTREGADO", "CANCELADO"],
      },
      OR: [
        ...(Number.isFinite(idNumber) && idNumber > 0
          ? [{ id: idNumber }]
          : []),
        {
          cliente: {
            nombre: {
              contains: q,
            },
          },
        },
        {
          cliente: {
            telefono: {
              contains: q,
            },
          },
        },
      ],
    },
    include: {
      cliente: true,
      pagos: true,
      prendas: {
        include: {
          entregasParciales: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });
}

async function agregarAbonoEmpleado(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));
  const valor = parseMoney(formData.get("valor"));
  const metodo = String(formData.get("metodo") || "Efectivo");

  if (!pedidoId || valor <= 0) return;

  await prisma.pago.create({
    data: {
      pedidoId,
      valor,
      metodo,
    },
  });

  revalidatePath("/inventario-empleado");
  revalidatePath("/inventario");

  redirect(`/inventario-empleado?q=${pedidoId}&flash=Abono+registrado`);
}

async function retirarParcialEmpleado(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));
  const prendaId = Number(formData.get("prendaId"));
  const cantidad = Number(formData.get("cantidad") || 0);
  const abono = parseMoney(formData.get("abono"));
  const metodo = String(formData.get("metodo") || "Efectivo");
  const observacion = String(formData.get("observacion") || "").trim();

  if (!pedidoId || !prendaId || cantidad <= 0) return;

  const pedido = await prisma.pedido.findUnique({
    where: {
      id: pedidoId,
    },
    include: {
      pagos: true,
      prendas: {
        include: {
          entregasParciales: true,
        },
      },
    },
  });

  if (!pedido) return;

  const prenda = pedido.prendas.find((p: any) => p.id === prendaId);
  if (!prenda) return;

  const entregadas = prenda.entregasParciales.reduce(
    (sum: number, entrega: any) => sum + entrega.cantidad,
    0
  );

  const pendientes = prenda.cantidad - entregadas;

  if (cantidad > pendientes) return;

  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  if (saldo > 0 && abono <= 0) return;

  await prisma.$transaction(async (tx) => {
    if (abono > 0) {
      await tx.pago.create({ data: { pedidoId, valor: abono, metodo } });
    }

    await tx.entregaParcial.create({
      data: { pedidoId, prendaId, cantidad, observacion: observacion || null },
    });

    const actualizado = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { prendas: { include: { entregasParciales: true } } },
    });

    if (actualizado) {
      const todoEntregado = actualizado.prendas.every((p) =>
        p.entregasParciales.reduce((s, e) => s + e.cantidad, 0) >= p.cantidad
      );
      if (todoEntregado) {
        await tx.pedido.update({ where: { id: pedidoId }, data: { estado: "ENTREGADO" } });
        await tx.historialEstado.create({ data: { pedidoId, estado: "ENTREGADO" } });
      }
    }
  });

  revalidatePath("/inventario-empleado");
  revalidatePath("/inventario");

  redirect(`/inventario-empleado?q=${pedidoId}&flash=Entrega+registrada`);
}

async function entregarCompletoEmpleado(formData: FormData) {
  "use server";

  const pedidoId = Number(formData.get("pedidoId"));

  if (!pedidoId) return;

  const pedido = await prisma.pedido.findUnique({
    where: {
      id: pedidoId,
    },
    include: {
      pagos: true,
      prendas: {
        include: {
          entregasParciales: true,
        },
      },
    },
  });

  if (!pedido) return;

  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  if (saldo > 0) return;

  await prisma.$transaction(async (tx) => {
    for (const prenda of pedido.prendas) {
      const entregadas = prenda.entregasParciales.reduce(
        (sum, entrega) => sum + entrega.cantidad,
        0
      );
      const pendientes = prenda.cantidad - entregadas;
      if (pendientes > 0) {
        await tx.entregaParcial.create({
          data: { pedidoId, prendaId: prenda.id, cantidad: pendientes, observacion: "Entrega completa" },
        });
      }
    }
    await tx.pedido.update({ where: { id: pedidoId }, data: { estado: "ENTREGADO" } });
    await tx.historialEstado.create({ data: { pedidoId, estado: "ENTREGADO" } });
  });

  revalidatePath("/inventario-empleado");
  revalidatePath("/inventario");

  redirect("/inventario-empleado?flash=Pedido+entregado");
}

export default async function InventarioEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";

  const pedidos = await buscarPedidos(q);

  return (
    <InventarioEmpleadoClient
      q={q}
      pedidos={pedidos}
      agregarAbonoEmpleado={agregarAbonoEmpleado}
      retirarParcialEmpleado={retirarParcialEmpleado}
      entregarCompletoEmpleado={entregarCompletoEmpleado}
    />
  );
}