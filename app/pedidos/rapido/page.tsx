import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PedidoRapidoForm from "./PedidoRapidoForm";
import { METODOS_PAGO, type MetodoPago } from "@/lib/types";
import FlashMessage from "@/components/FlashMessage";

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function guardarPedidoRapidoAction(formData: FormData) {
  "use server";

  const nombre = String(formData.get("nombre") || "").trim();
  const telefono = String(formData.get("telefono") || "").trim();
  const abono = parseMoney(formData.get("abono"));
  const metodo = String(formData.get("metodo") || "Efectivo") as MetodoPago;

  if (!nombre || !telefono) redirect(`/pedidos/rapido?error=${encodeURIComponent("Nombre y teléfono son obligatorios")}`);
  if (!METODOS_PAGO.includes(metodo)) return;

  const tipos = formData.getAll("tipo");
  const servicios = formData.getAll("servicio");
  const cantidades = formData.getAll("cantidad");
  const descripciones = formData.getAll("descripcion");
  const valores = formData.getAll("valor");

  const prendas = tipos
    .map((_, index) => {
      const tipo = String(tipos[index] || "").trim();
      const servicio = String(servicios[index] || "").trim();
      const cantidad = Number(cantidades[index] || 0);
      const descripcion = String(descripciones[index] || "").trim();
      const valor = parseMoney(valores[index]);

      if (!tipo || !servicio || cantidad <= 0 || valor <= 0) return null;

      return {
        tipo,
        servicio,
        cantidad,
        descripcion,
        valor,
      };
    })
    .filter(Boolean) as {
    tipo: string;
    servicio: string;
    cantidad: number;
    descripcion: string;
    valor: number;
  }[];

  if (prendas.length === 0) redirect(`/pedidos/rapido?error=${encodeURIComponent("Agrega al menos un ítem al pedido")}`);

  const total = prendas.reduce((sum, prenda) => sum + prenda.valor, 0);

  const pedido = await prisma.$transaction(async (tx) => {
    let cliente = await tx.cliente.findFirst({ where: { telefono } });
    if (cliente) {
      cliente = await tx.cliente.update({ where: { id: cliente.id }, data: { nombre, telefono } });
    } else {
      cliente = await tx.cliente.create({ data: { nombre, telefono } });
    }

    return tx.pedido.create({
      data: {
        clienteId: cliente.id,
        servicio: prendas.map((p) => p.servicio).join(", "),
        total,
        observacion: null,
        estado: "RECIBIDO",
        prendas: {
          create: prendas.map((p) => ({
            servicio: p.servicio,
            tipo: p.tipo,
            descripcion: p.descripcion || null,
            cantidad: p.cantidad,
            valor: p.valor,
          })),
        },
        pagos: abono > 0 ? { create: { metodo, valor: abono } } : undefined,
        historial: { create: { estado: "RECIBIDO" } },
      },
    });
  });

  redirect(`/recibos/${pedido.id}/pdf`);
}

export default async function PedidoRapidoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; nombre?: string; telefono?: string }>;
}) {
  const { error, nombre, telefono } = await searchParams;
  return (
    <>
      <FlashMessage message={error} type="error" />
      <PedidoRapidoForm
        guardarPedidoRapidoAction={guardarPedidoRapidoAction}
        initialNombre={nombre}
        initialTelefono={telefono}
      />
    </>
  );
}