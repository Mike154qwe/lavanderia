import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// RNF02: el servidor Next.js y SQLite viven en el mismo PC. La disponibilidad
// de escritura no depende de una red entre el navegador y el servidor, así que
// una cola de escrituras en el cliente se descartó por topología de un solo
// dispositivo. Esta ruta recibe el pedido en JSON y lo persiste en SQLite.

function parseMoney(value: unknown) {
  return Number(String(value ?? "0").replace(/\D/g, ""));
}

type PrendaInput = {
  servicio?: unknown;
  tipo?: unknown;
  descripcion?: unknown;
  cantidad?: unknown;
  valor?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json();

  const clienteId = Number(body.clienteId);
  const observacion = String(body.observacion || "").trim();
  const abono = parseMoney(body.abono);
  const metodo = String(body.metodo || "Efectivo");

  if (!clienteId) {
    return NextResponse.json({ error: "clienteId es requerido" }, { status: 400 });
  }

  const prendasInput: PrendaInput[] = Array.isArray(body.prendas) ? body.prendas : [];

  const prendas = prendasInput
    .map((p) => {
      const servicio = String(p.servicio || "").trim();
      const tipo = String(p.tipo || "").trim();
      const descripcion = String(p.descripcion || "").trim();
      const cantidad = Number(p.cantidad || 0);
      const valor = parseMoney(p.valor);

      if (!servicio || !tipo || cantidad <= 0 || valor <= 0) return null;

      return { servicio, tipo, descripcion, cantidad, valor };
    })
    .filter(Boolean) as {
    servicio: string;
    tipo: string;
    descripcion: string;
    cantidad: number;
    valor: number;
  }[];

  if (prendas.length === 0) {
    return NextResponse.json({ error: "Debe incluir al menos una prenda válida" }, { status: 400 });
  }

  const total = prendas.reduce((sum, prenda) => sum + prenda.valor, 0);

  const pedido = await prisma.pedido.create({
    data: {
      clienteId,
      servicio: prendas.map((p) => p.servicio).join(", "),
      total,
      observacion: observacion || null,
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

  return NextResponse.json({ id: pedido.id }, { status: 201 });
}
