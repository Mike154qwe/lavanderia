import type { Metadata } from "next";
import { money, fmt, ESTADO_BADGE } from "@/lib/format";
import { ESTADOS_PEDIDO, type EstadoPedido, METODOS_PAGO, type MetodoPago } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import MoneyInput from "@/components/MoneyInput";
import CancelButton from "./CancelButton";

const TIPOS_PRENDA = ["Camisa","Pantalón","Chaqueta","Vestido","Cobija","Tapete","Tenis","Traje","Cubrelecho"];
const SERVICIOS_PRENDA = ["Lavado","Planchado","Tintura"];
const PRENDA_EMOJI: Record<string, string> = {
  Camisa: "👔", Pantalón: "👖", Chaqueta: "🧥", Cubrelecho: "🛏️",
  Tenis: "👟", Traje: "🤵", Vestido: "👗", Cobija: "🧺", Tapete: "🟫",
};
function pEmoji(tipo: string) { return PRENDA_EMOJI[tipo] ?? "👕"; }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = Number((await params).id);
  return { title: `Pedido #${String(id).padStart(5, "0")}` };
}

/* ── Server actions ─────────────────────────────────────────── */

async function cambiarEstadoAction(formData: FormData) {
  "use server";
  const id     = Number(formData.get("pedidoId"));
  const estado = String(formData.get("estado")) as EstadoPedido;
  if (!id || !ESTADOS_PEDIDO.includes(estado)) return;
  await prisma.$transaction([
    prisma.pedido.update({ where: { id }, data: { estado } }),
    prisma.historialEstado.create({ data: { pedidoId: id, estado } }),
  ]);
  redirect(`/pedidos/${id}?flash=Estado+actualizado`);
}

async function registrarPagoAction(formData: FormData) {
  "use server";
  const id     = Number(formData.get("pedidoId"));
  const valor  = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo = String(formData.get("metodo") || "Efectivo") as MetodoPago;
  if (!id || valor <= 0 || !METODOS_PAGO.includes(metodo)) return;
  await prisma.pago.create({ data: { pedidoId: id, valor, metodo } });
  redirect(`/pedidos/${id}?flash=Pago+registrado`);
}

async function editarPrendaAction(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const prendaId    = Number(formData.get("prendaId"));
  const tipo        = String(formData.get("tipo") || "").trim();
  const servicio    = String(formData.get("servicio") || "").trim();
  const cantidad    = Number(formData.get("cantidad") || "1");
  const valor       = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!pedidoId || !prendaId || !tipo || !servicio || cantidad < 1 || valor < 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.prenda.update({
      where: { id: prendaId },
      data: { tipo, servicio, cantidad, valor, descripcion: descripcion || null },
    });
    const prendas    = await tx.prenda.findMany({ where: { pedidoId } });
    const nuevoTotal = prendas.reduce((s, p) => s + p.valor, 0);
    await tx.pedido.update({ where: { id: pedidoId }, data: { total: nuevoTotal } });
  });
  redirect(`/pedidos/${pedidoId}?flash=Prenda+actualizada`);
}

async function agregarPrendaAction(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const tipo        = String(formData.get("tipo") || "").trim();
  const servicio    = String(formData.get("servicio") || "").trim();
  const cantidad    = Number(formData.get("cantidad") || "1");
  const valor       = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!pedidoId || !tipo || !servicio || cantidad < 1 || valor < 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.prenda.create({
      data: { pedidoId, tipo, servicio, cantidad, valor, descripcion: descripcion || null },
    });
    const prendas    = await tx.prenda.findMany({ where: { pedidoId } });
    const nuevoTotal = prendas.reduce((s, p) => s + p.valor, 0);
    await tx.pedido.update({ where: { id: pedidoId }, data: { total: nuevoTotal } });
  });
  redirect(`/pedidos/${pedidoId}?flash=Prenda+agregada`);
}

async function eliminarPrendaAction(formData: FormData) {
  "use server";
  const pedidoId = Number(formData.get("pedidoId"));
  const prendaId = Number(formData.get("prendaId"));
  if (!pedidoId || !prendaId) return;
  const entregas = await prisma.entregaParcial.count({ where: { prendaId } });
  if (entregas > 0) return; // ya hay retiros parciales, no se puede eliminar
  await prisma.$transaction(async (tx) => {
    await tx.prenda.delete({ where: { id: prendaId } });
    const prendas    = await tx.prenda.findMany({ where: { pedidoId } });
    const nuevoTotal = prendas.reduce((s, p) => s + p.valor, 0);
    await tx.pedido.update({ where: { id: pedidoId }, data: { total: nuevoTotal } });
  });
  redirect(`/pedidos/${pedidoId}?flash=Prenda+eliminada`);
}

/* ── Page ──────────────────────────────────────────────────── */

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
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
            <h2 className="font-black text-gray-900">
              Prendas
              <span className="ml-2 text-sm font-normal text-gray-400">({pedido.prendas.length})</span>
            </h2>
            {!terminado && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">
                Toca una prenda para editar
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {pedido.prendas.map((p) => (
              <details key={p.id} className="group">
                {/* Fila compacta */}
                <summary className={`flex cursor-pointer list-none items-center gap-3 px-6 py-4 transition hover:bg-gray-50 group-open:bg-brand-50/40 dark:hover:bg-white/[0.02] dark:group-open:bg-brand-500/5 ${!terminado ? "" : "cursor-default"}`}>
                  <span className="text-2xl leading-none">{pEmoji(p.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900">{p.tipo}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">
                        {p.servicio}
                      </span>
                      <span className="text-sm text-gray-400">×{p.cantidad}</span>
                    </div>
                    {p.descripcion && (
                      <p className="mt-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">⚠️ {p.descripcion}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-black text-brand-500">{money(p.valor)}</span>
                  {!terminado && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  )}
                </summary>

                {/* Formulario de edición */}
                {!terminado && (
                  <div className="border-t border-brand-100 bg-brand-50/20 px-6 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand-500">Editar prenda</p>
                    <form action={editarPrendaAction} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="pedidoId" value={pedido.id} />
                      <input type="hidden" name="prendaId" value={p.id} />
                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Tipo de prenda</label>
                        <select name="tipo" defaultValue={p.tipo} className="input-modern">
                          {TIPOS_PRENDA.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Servicio</label>
                        <select name="servicio" defaultValue={p.servicio} className="input-modern">
                          {SERVICIOS_PRENDA.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Cantidad</label>
                        <input name="cantidad" type="number" min="1" defaultValue={p.cantidad} required className="input-modern" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Valor total</label>
                        <MoneyInput name="valor" defaultValue={p.valor} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-bold text-gray-500">Novedad / descripción</label>
                        <input name="descripcion" defaultValue={p.descripcion ?? ""} placeholder="Opcional" className="input-modern" />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <button type="submit" className="btn-primary flex-1">
                          Guardar cambios
                        </button>
                        <button
                          type="submit"
                          formAction={eliminarPrendaAction}
                          className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        >
                          Eliminar
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </details>
            ))}
          </div>

          {/* Agregar nueva prenda */}
          {!terminado && (
            <details className="group border-t border-dashed border-gray-200 dark:border-white/10">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-bold text-brand-600 transition hover:bg-brand-50/40 dark:text-brand-400 dark:hover:bg-brand-500/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Agregar prenda
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  className="ml-auto h-4 w-4 text-gray-400 transition-transform group-open:rotate-180">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </summary>
              <div className="border-t border-brand-100 bg-brand-50/20 px-6 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand-500">Nueva prenda</p>
                <form action={agregarPrendaAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="pedidoId" value={pedido.id} />
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">Tipo de prenda</label>
                    <select name="tipo" className="input-modern">
                      {TIPOS_PRENDA.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">Servicio</label>
                    <select name="servicio" className="input-modern">
                      {SERVICIOS_PRENDA.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">Cantidad</label>
                    <input name="cantidad" type="number" min="1" defaultValue={1} required className="input-modern" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-500">Valor total</label>
                    <MoneyInput name="valor" placeholder="Ej: 8.000" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-gray-500">Novedad / descripción</label>
                    <input name="descripcion" placeholder="Opcional" className="input-modern" />
                  </div>
                  <button type="submit" className="btn-primary sm:col-span-2">
                    Agregar prenda al pedido
                  </button>
                </form>
              </div>
            </details>
          )}
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
                {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
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
              <CancelButton pedidoId={pedido.id} action={cambiarEstadoAction} />
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
                  {ESTADOS_PEDIDO.map((e) => (
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
