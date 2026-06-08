import { prisma } from "@/lib/prisma";
import Link from "next/link";

const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO: "bg-blue-100 text-blue-700",
  EN_PROCESO: "bg-yellow-100 text-yellow-700",
  LISTO: "bg-green-100 text-green-700",
  ENTREGADO: "bg-slate-100 text-slate-600",
  CANCELADO: "bg-red-100 text-red-700",
};

export default async function PedidosPage() {
  const pedidos = await prisma.pedido.findMany({
    include: { cliente: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-slate-900">Pedidos</h1>
          <Link
            href="/pedidos/nuevo"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            + Nuevo pedido
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold">Total</th>
                <th className="px-6 py-4 font-bold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="font-mono font-bold text-indigo-600 hover:underline"
                    >
                      #{String(pedido.id).padStart(5, "0")}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {pedido.cliente.nombre}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                        ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ${pedido.total.toLocaleString("es-CO")}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(pedido.createdAt).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pedidos.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500">No hay pedidos registrados.</p>
              <Link
                href="/pedidos/nuevo"
                className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Crear primer pedido
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
