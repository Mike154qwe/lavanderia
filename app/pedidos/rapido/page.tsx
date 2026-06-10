import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PedidoRapidoForm from "./PedidoRapidoForm";

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function guardarPedidoRapidoAction(formData: FormData) {
  "use server";

  const nombre = String(formData.get("nombre") || "").trim();
  const telefono = String(formData.get("telefono") || "").trim();
  const abono = parseMoney(formData.get("abono"));
  const metodo = String(formData.get("metodo") || "Efectivo");

  if (!nombre || !telefono) return;

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

  if (prendas.length === 0) return;

  let cliente = await prisma.cliente.findFirst({
    where: { telefono },
  });

  if (cliente) {
    cliente = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        nombre,
        telefono,
      },
    });
  } else {
    cliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono,
      },
    });
  }

  const total = prendas.reduce((sum, prenda) => sum + prenda.valor, 0);

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      servicio: prendas.map((prenda) => prenda.servicio).join(", "),
      total,
      observacion: null,
      estado: "RECIBIDO",

      prendas: {
        create: prendas.map((prenda) => ({
          servicio: prenda.servicio,
          tipo: prenda.tipo,
          descripcion: prenda.descripcion || null,
          cantidad: prenda.cantidad,
          valor: prenda.valor,
        })),
      },

      pagos:
        abono > 0
          ? {
              create: {
                metodo,
                valor: abono,
              },
            }
          : undefined,

      historial: {
        create: {
          estado: "RECIBIDO",
        },
      },
    },
  });

  redirect(`/recibos/${pedido.id}/pdf`);
}

export default function PedidoRapidoPage() {
  return (
    <PedidoRapidoForm guardarPedidoRapidoAction={guardarPedidoRapidoAction} />
  );
}