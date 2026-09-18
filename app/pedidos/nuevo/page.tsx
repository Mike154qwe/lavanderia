import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NuevoPedidoForm from "./NuevoPedidoForm";
import { sanearNombre, sanearTelefono, sanearDireccion } from "@/lib/validacion-cliente";

const CLIENTES_POR_PAGINA = 8;

async function crearClienteAction(formData: FormData) {
  "use server";

  const nombre = sanearNombre(String(formData.get("nombre") || ""));
  const telefono = sanearTelefono(String(formData.get("telefono") || ""));
  const direccion = sanearDireccion(String(formData.get("direccion") || ""));

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
        telefono,
        direccion,
      },
    });
  }

  redirect(`/pedidos/nuevo?clienteId=${cliente.id}`);
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

  const tarifario = await prisma.tarifario.findMany({
    orderBy: [{ categoria: "asc" }, { item: "asc" }],
  });

  return (
    <NuevoPedidoForm
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      totalClientes={totalClientes}
      tarifario={tarifario.map((t) => ({
        categoria: t.categoria,
        item: t.item,
        precioMin: t.precioMin,
        precioMax: t.precioMax,
      }))}
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
    />
  );
}