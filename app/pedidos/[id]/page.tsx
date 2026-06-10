import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import MoneyInput from "@/components/MoneyInput";

const ESTADOS = ["RECIBIDO", "EN_PROCESO", "LISTO", "ENTREGADO", "CANCELADO"] as const;
const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"] as const;

const ESTADO_BADGE: Record<string, string> = {
  RECIBIDO:   "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  EN_PROCESO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  LISTO:      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  ENTREGADO:  "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
  CANCELADO:  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};

/* ── Server actions ─────────────────────────────────────────── */

async function cambiarEstadoAction(formData: FormData) {
  "use server";
  const id     = Number(formData.get("pedidoId"));
  const estado = String(formData.get("estado"));
  if (!id || !ESTADOS.includes(estado as (typeof ESTADOS)[number])) return;
  await prisma.pedido.update({ where: { id }, data: { estado } });
  await (prisma as any).historialEstado.create({ data: { pedidoId: id, estado } });
  redirect(`/pedidos/${id}`);
}

async function registrarPagoAction(formData: FormData) {
  "use server";
  const id     = Number(formData.get("pedidoId"));
  const valor  = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo");
  if (!id || valor <= 0) return;
  await prisma.pago.create({ data: { pedidoId: id, valor, metodo } });
  redirect(`/pedidos/${id}`);
}

/* ── Page ──────────────────────────────────────────────────── */

function money(n: number) { return `$${n.toLocaleString("es-CO")}`; }
function fmt(id: number)  { return String(id).padStart(5, "0"); }

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
      prendas:  { orderBy: { createdAt: "asc" } },
      pagos:    { orderBy: { createdAt: "desc" } },
      historial: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!pedido) notFound();

  const totalPagado = pedido.pagos.reduce((s, p) => s + p.valor, 0);
  const saldo       = pedido.total - totalPagado;
  const inicial     = pedido.cliente.nombre.charAt(0).toUpperCase();
  const terminado   = pedido.estado === "ENTREGADO" || pedido.estado === "CANCELADO";

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-5">

        {/* ── Back + acciones rápidas ─────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/pedidos"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Volver a pedidos
          </Link>
          <Link
            href={`/recibos/${pedido.id}/pdf`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-gray-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            Ver recibo PDF
          </Link>
        </div>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="card overflow-hidden">
          {/* Top bar con ID y estado */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6 dark:border-white/[0.07]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Pedido</p>
              <h1 className="mt-1 font-mono text-3xl font-black text-gray-900">
                #{fmt(pedido.id)}
              </h1>
              <p className="mt-1 text-sm capitalize text-gray-400">
                {new Date(pedido.createdAt).toLocaleDateString("es-CO", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })} · {new Date(pedido.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-500"}`}>
              {pedido.estado.replace("_", " ")}
            </span>
          </div>

          {/* Cliente */}
          <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {inicial}
            </div>
            <div>
              <p className="font-black text-gray-900">{pedido.cliente.nombre}</p>
              <p className="mt-0.5 text-sm text-gray-400">
                {pedido.cliente.telefono
                  ? <a href={`tel:${pedido.cliente.telefono}`} className="hover:text-brand-500">{pedido.cliente.telefono}</a>
                  : "Sin teléfono"}
                {pedido.cliente.direccion ? ` · ${pedido.cliente.direccion}` : ""}
              </p>
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/[0.07]">
            <div className="p-5 text-center">
              <p className="text-xs font-bold uppercase text-gray-400">Total</p>
              <p className="mt-1 text-xl font-black text-gray-900">{money(pedido.total)}</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-xs font-bold uppercase text-green-600 dark:text-green-400">Pagado</p>
              <p className="mt-1 text-xl font-black text-green-600 dark:text-green-400">{money(totalPagado)}</p>
            </div>
            <div className="p-5 text-center">
              <p className={`text-xs font-bold uppercase ${saldo > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                Saldo
              </p>
              <p className={`mt-1 text-xl font-black ${saldo > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                {saldo > 0 ? money(saldo) : "✓ Pagado"}
              </p>
            </div>
          </div>

          {/* Observación general */}
          {pedido.observacion && (
            <div className="mx-6 mb-5 rounded-xl bg-orange-50 px-4 py-3 dark:bg-orange-500/10">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Observación</p>
              <p className="mt-0.5 text-sm text-orange-700 dark:text-orange-300">{pedido.observacion}</p>
            </div>
          )}
        </div>

        {/* ── Prendas ─────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
            <h2 className="font-black text-gray-900">Prendas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.07]">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Servicio</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Prenda</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Cant.</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {pedido.prendas.map((p) => (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-3.5">
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {p.servicio}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{p.tipo}</td>
                      <td className="px-6 py-3.5 text-gray-500">×{p.cantidad}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-brand-500">{money(p.valor)}</td>
                    </tr>
                    {p.descripcion && (
                      <tr key={`${p.id}-obs`} className="bg-orange-50/50 dark:bg-orange-500/5">
                        <td colSpan={4} className="px-6 pb-3 pt-0">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                            ⚠️ {p.descripcion}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagos ───────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900">Pagos</h2>
              {totalPagado > 0 && (
                <span className="font-black text-green-600 dark:text-green-400">{money(totalPagado)} recibido</span>
              )}
            </div>
          </div>

          {pedido.pagos.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
              {pedido.pagos.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">{p.metodo}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString("es-CO")} ·{" "}
                      {new Date(p.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="font-black text-green-600 dark:text-green-400">{money(p.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-5 text-sm text-gray-400">Sin pagos registrados.</p>
          )}

          {/* Form nuevo pago */}
          {!terminado && (
            <form action={registrarPagoAction} className="grid gap-3 border-t border-gray-100 p-6 dark:border-white/[0.07] sm:grid-cols-[1fr_160px_auto]">
              <input type="hidden" name="pedidoId" value={pedido.id} />
              <MoneyInput
                name="valor"
                placeholder={saldo > 0 ? `Saldo pendiente: ${money(saldo)}` : "Monto del pago"}
              />
              <select name="metodo" className="input-modern">
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="btn-primary whitespace-nowrap">
                Registrar pago
              </button>
            </form>
          )}

          {saldo <= 0 && !terminado && (
            <p className="flex items-center gap-2 border-t border-gray-100 px-6 py-3 text-sm font-semibold text-green-600 dark:border-white/[0.07] dark:text-green-400">
              <span>✅</span> Pedido completamente pagado
            </p>
          )}
        </div>

        {/* ── Estado ──────────────────────────────────────── */}
        {!terminado && (
          <div className="card p-6">
            <h2 className="mb-4 font-black text-gray-900">Cambiar estado</h2>

            <div className="flex flex-wrap gap-3">
              {pedido.estado === "RECIBIDO" && (
                <QuickEstado pedidoId={pedido.id} estado="EN_PROCESO" label="→ En proceso" color="yellow" action={cambiarEstadoAction} />
              )}
              {(pedido.estado === "RECIBIDO" || pedido.estado === "EN_PROCESO") && (
                <QuickEstado pedidoId={pedido.id} estado="LISTO" label="✅ Marcar listo" color="green" action={cambiarEstadoAction} />
              )}
              {pedido.estado === "LISTO" && saldo <= 0 && (
                <QuickEstado pedidoId={pedido.id} estado="ENTREGADO" label="📦 Entregar pedido" color="brand" action={cambiarEstadoAction} />
              )}
              {pedido.estado === "LISTO" && saldo > 0 && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  Hay saldo pendiente. Registra el pago antes de entregar.
                </p>
              )}
              <QuickEstado pedidoId={pedido.id} estado="CANCELADO" label="Cancelar pedido" color="red" action={cambiarEstadoAction} />
            </div>

            {/* Override manual */}
            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition duration-200 group-open:rotate-90"><path d="M9 18l6-6-6-6"/></svg>
                Cambio manual de estado
              </summary>
              <form action={cambiarEstadoAction} className="mt-3 flex gap-3">
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <select name="estado" defaultValue={pedido.estado} className="input-modern flex-1">
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e.replace("_", " ")}</option>
                  ))}
                </select>
                <button className="btn-dark whitespace-nowrap">Aplicar</button>
              </form>
            </details>
          </div>
        )}

        {/* ── Historial ───────────────────────────────────── */}
        {pedido.historial.length > 0 && (
          <div className="card p-6">
            <h2 className="mb-4 font-black text-gray-900">Historial</h2>
            <ol className="relative border-l border-gray-200 pl-5 dark:border-white/10">
              {pedido.historial.map((h, i) => (
                <li key={h.id} className={`pb-4 ${i === pedido.historial.length - 1 ? "pb-0" : ""}`}>
                  <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 dark:border-gray-900" />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_BADGE[h.estado] ?? "bg-gray-100 text-gray-500"}`}>
                      {h.estado.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(h.createdAt).toLocaleDateString("es-CO")} ·{" "}
                      {new Date(h.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── QuickEstado ────────────────────────────────────────────── */

function QuickEstado({
  pedidoId, estado, label, color, action,
}: {
  pedidoId: number;
  estado: string;
  label: string;
  color: "yellow" | "green" | "brand" | "red";
  action: (f: FormData) => void;
}) {
  const cls = {
    yellow: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20",
    green:  "bg-green-500 text-white hover:bg-green-600",
    brand:  "bg-brand-500 text-white hover:bg-brand-600",
    red:    "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20",
  }[color];

  return (
    <form action={action}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <input type="hidden" name="estado"   value={estado} />
      <button className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${cls}`}>
        {label}
      </button>
    </form>
  );
}
