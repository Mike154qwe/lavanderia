import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

const ESTADOS = ["RECIBIDO", "EN_PROCESO", "LISTO", "ENTREGADO", "CANCELADO"] as const;
const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"] as const;

const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO: "bg-blue-100 text-blue-700",
  EN_PROCESO: "bg-yellow-100 text-yellow-700",
  LISTO: "bg-green-100 text-green-700",
  ENTREGADO: "bg-slate-100 text-slate-600",
  CANCELADO: "bg-red-100 text-red-700",
};

async function cambiarEstadoAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("pedidoId"));
  const estado = String(formData.get("estado"));
  if (!id || !ESTADOS.includes(estado as (typeof ESTADOS)[number])) return;
  await prisma.pedido.update({ where: { id }, data: { estado } });
  await prisma.historialEstado.create({ data: { pedidoId: id, estado } });
  redirect(`/pedidos/${id}`);
}

async function registrarPagoAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("pedidoId"));
  const valor = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo");
  if (!id || valor <= 0) return;
  await prisma.pago.create({ data: { pedidoId: id, valor, metodo } });
  redirect(`/pedidos/${id}`);
}

export default async function DetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedidoId = Number(id);

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: true,
      prendas: { orderBy: { createdAt: "asc" } },
      pagos: { orderBy: { createdAt: "desc" } },
      historial: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!pedido) notFound();

  const totalPagado = pedido.pagos.reduce((s, p) => s + p.valor, 0);
  const saldo = pedido.total - totalPagado;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Back link */}
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Volver a pedidos
        </Link>

        {/* Header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Pedido
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                #{String(pedido.id).padStart(5, "0")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(pedido.createdAt).toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {pedido.estado.replace("_", " ")}
            </span>
          </div>

          {/* Cliente */}
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Cliente
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {pedido.cliente.nombre}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Tel: {pedido.cliente.telefono ?? "—"} · Dirección:{" "}
              {pedido.cliente.direccion ?? "—"}
            </p>
          </div>

          {/* Totales */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">Total</p>
              <p className="mt-1 text-xl font-black text-slate-900">
                ${pedido.total.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-green-600">Pagado</p>
              <p className="mt-1 text-xl font-black text-green-700">
                ${totalPagado.toLocaleString("es-CO")}
              </p>
            </div>
            <div
              className={`rounded-xl p-4 text-center ${
                saldo > 0 ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <p
                className={`text-xs font-bold uppercase ${
                  saldo > 0 ? "text-red-500" : "text-green-600"
                }`}
              >
                Saldo
              </p>
              <p
                className={`mt-1 text-xl font-black ${
                  saldo > 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                ${saldo.toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </div>

        {/* Prendas */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Prendas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-3 font-bold">Servicio</th>
                  <th className="pb-3 font-bold">Tipo</th>
                  <th className="pb-3 font-bold">Descripción</th>
                  <th className="pb-3 font-bold">Cant.</th>
                  <th className="pb-3 text-right font-bold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pedido.prendas.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 text-slate-700">{p.servicio}</td>
                    <td className="py-3 font-medium text-slate-800">{p.tipo}</td>
                    <td className="py-3 text-slate-500">{p.descripcion ?? "—"}</td>
                    <td className="py-3 text-slate-700">{p.cantidad}</td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      ${p.valor.toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagos + Registrar pago */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Pagos</h2>

          {pedido.pagos.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-3 font-bold">Fecha</th>
                    <th className="pb-3 font-bold">Método</th>
                    <th className="pb-3 text-right font-bold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pedido.pagos.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-3 text-slate-700">{p.metodo}</td>
                      <td className="py-3 text-right font-bold text-green-700">
                        ${p.valor.toLocaleString("es-CO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Sin pagos registrados.</p>
          )}

          {/* Registrar nuevo pago */}
          <form action={registrarPagoAction} className="mt-6 border-t pt-5">
            <h3 className="text-sm font-bold text-slate-700">Registrar pago</h3>
            <input type="hidden" name="pedidoId" value={pedido.id} />
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                name="metodo"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                name="valor"
                type="number"
                min="1"
                required
                placeholder="Valor del pago"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-700">
                Registrar pago
              </button>
            </div>
          </form>
        </div>

        {/* Cambiar estado */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Cambiar estado</h2>
          <form action={cambiarEstadoAction} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="pedidoId" value={pedido.id} />
            <select
              name="estado"
              defaultValue={pedido.estado}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e.replace("_", " ")}
                </option>
              ))}
            </select>
            <button className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
              Actualizar estado
            </button>
          </form>

          {/* Historial */}
          {pedido.historial.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Historial
              </p>
              <ol className="mt-3 space-y-2">
                {pedido.historial.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        ESTADO_BADGE[h.estado] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {h.estado.replace("_", " ")}
                    </span>
                    <span className="text-slate-400">
                      {new Date(h.createdAt).toLocaleString("es-CO")}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
