import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NuevoPedidoForm from "./NuevoPedidoForm";

const CLIENTES_POR_PAGINA = 8;

function parseMoney(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/\D/g, ""));
}

async function crearClienteAction(formData: FormData) {
  "use server";

  const nombre = String(formData.get("nombre") || "").trim();
  const telefono = String(formData.get("telefono") || "").trim();
  const direccion = String(formData.get("direccion") || "").trim();

  if (!nombre) return;

  let cliente = telefono
    ? await prisma.cliente.findFirst({
        where: {
          telefono,
        },
      })
    : null;

  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono: telefono || null,
        direccion: direccion || null,
      },
    });
  }

  redirect(`/pedidos/nuevo?clienteId=${cliente.id}`);
}

async function guardarPedidoAction(formData: FormData) {
  "use server";

  const clienteId = Number(formData.get("clienteId"));
  const observacion = String(formData.get("observacion") || "").trim();
  const abono = parseMoney(formData.get("abono"));
  const metodo = String(formData.get("metodo") || "Efectivo");

  if (!clienteId) return;

  const servicios = formData.getAll("servicio");
  const tipos = formData.getAll("tipo");
  const descripciones = formData.getAll("descripcion");
  const cantidades = formData.getAll("cantidad");
  const valores = formData.getAll("valor");

  const prendas = servicios
    .map((_, index) => {
      const servicio = String(servicios[index] || "").trim();
      const tipo = String(tipos[index] || "").trim();
      const descripcion = String(descripciones[index] || "").trim();
      const cantidad = Number(cantidades[index] || 0);
      const valor = parseMoney(valores[index]);

      if (!servicio || !tipo || cantidad <= 0 || valor <= 0) return null;

      return {
        servicio,
        tipo,
        descripcion,
        cantidad,
        valor,
      };
    })
    .filter(Boolean) as {
    servicio: string;
    tipo: string;
    descripcion: string;
    cantidad: number;
    valor: number;
  }[];

  if (prendas.length === 0) return;

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

  redirect(`/recibos/${pedido.id}/pdf`);
}

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    clienteId?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const clienteId = Number(params.clienteId || 0);
  const currentPage = Math.max(Number(params.page || "1"), 1);

  const clienteWhere = q
    ? {
        OR: [
          {
            nombre: {
              contains: q,
            },
          },
          {
            telefono: {
              contains: q,
            },
          },
        ],
      }
    : undefined;

  const totalClientes = await prisma.cliente.count({
    where: clienteWhere,
  });

  const clientes = await prisma.cliente.findMany({
    where: clienteWhere,
    take: CLIENTES_POR_PAGINA,
    skip: (currentPage - 1) * CLIENTES_POR_PAGINA,
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalPages = Math.max(
    Math.ceil(totalClientes / CLIENTES_POR_PAGINA),
    1
  );

  const clienteSeleccionado = clienteId
    ? await prisma.cliente.findUnique({
        where: {
          id: clienteId,
        },
      })
    : null;

  return (
    <NuevoPedidoForm
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      totalClientes={totalClientes}
      clientes={clientes.map((cliente) => ({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      }))}
      clienteSeleccionado={
        clienteSeleccionado
          ? {
              id: clienteSeleccionado.id,
              nombre: clienteSeleccionado.nombre,
              telefono: clienteSeleccionado.telefono,
              direccion: clienteSeleccionado.direccion,
            }
          : null
      }
      crearClienteAction={crearClienteAction}
      guardarPedidoAction={guardarPedidoAction}
    />
  );
}