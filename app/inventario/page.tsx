import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import MoneyInput from "@/components/MoneyInput";
import { EmptyState } from "@/components/EmptyState";
import { money, fmt, ESTADO_BADGE } from "@/lib/format";

export const metadata: Metadata = { title: "Inventario" };

const PAGE_SIZE = 20;
const METODOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"];

function buildUrl(page: number, q: string, estado: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (estado && estado !== "TODOS") p.set("estado", estado);
  p.set("page", String(page));
  return `/inventario?${p.toString()}`;
}

/* ── Server actions ─────────────────────────────────────────── */

async function agregarAbono(formData: FormData) {
  "use server";
  const pedidoId = Number(formData.get("pedidoId"));
  const valor    = Number(String(formData.get("valor") || "0").replace(/\D/g, ""));
  const metodo   = String(formData.get("metodo") || "Efectivo");
  if (!pedidoId || valor <= 0) return;
  await prisma.pago.create({ data: { pedidoId, valor, metodo } });
  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Abono+registrado");
}

async function registrarEntregaParcial(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const prendaId    = Number(formData.get("prendaId"));
  const cantidad    = Number(formData.get("cantidad"));
  const observacion = String(formData.get("observacion") || "");
  const abono       = Number(String(formData.get("abono") || "0").replace(/\D/g, ""));
  const metodo      = String(formData.get("metodo") || "Efectivo");
  if (!pedidoId || !prendaId || cantidad <= 0) return;

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { pagos: true, prendas: { include: { entregasParciales: true } } },
  });
  if (!pedido) return;

  const prenda = pedido.prendas.find((p: any) => p.id === prendaId);
  if (!prenda) return;

  const entregadas = prenda.entregasParciales.reduce((s: number, e: any) => s + e.cantidad, 0);
  if (cantidad > prenda.cantidad - entregadas) return;

  const abonado = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  if (pedido.total - abonado > 0 && abono <= 0) return;

  if (abono > 0) await prisma.pago.create({ data: { pedidoId, valor: abono, metodo } });

  await prisma.entregaParcial.create({
    data: { pedidoId, prendaId, cantidad, observacion: observacion || null },
  });

  const actualizado = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { prendas: { include: { entregasParciales: true } } },
  });

  if (actualizado) {
    const todoEntregado = actualizado.prendas.every((p: any) =>
      p.entregasParciales.reduce((s: number, e: any) => s + e.cantidad, 0) >= p.cantidad
    );
    if (todoEntregado) {
      await prisma.pedido.update({ where: { id: pedidoId }, data: { estado: "ENTREGADO" } });
      await prisma.historialEstado.create({ data: { pedidoId, estado: "ENTREGADO" } });
    }
  }

  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Entrega+registrada");
}

async function cambiarEstado(formData: FormData) {
  "use server";
  const pedidoId    = Number(formData.get("pedidoId"));
  const nuevoEstado = String(formData.get("nuevoEstado"));
  if (!pedidoId) return;
  await prisma.pedido.update({ where: { id: pedidoId }, data: { estado: nuevoEstado as any } });
  await prisma.historialEstado.create({ data: { pedidoId, estado: nuevoEstado } });
  revalidatePath("/inventario");
  revalidatePath("/gerente");
  redirect("/inventario?flash=Estado+actualizado");
}

/* ── Page ──────────────────────────────────────────────────── */

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}) {
  const params      = await searchParams;
  const q           = params.q?.trim() || "";
  const estadoFiltro = params.estado || "TODOS";
  const currentPage = Math.max(Number(params.page || "1"), 1);

  const baseWhere: any = { estado: { notIn: ["ENTREGADO", "CANCELADO"] } };
  if (estadoFiltro === "RECIBIDO" || estadoFiltro === "LISTO") baseWhere.estado = estadoFiltro;

  if (q) {
    const idNum = Number(q.replace(/^0+/, ""));
    baseWhere.OR = [
      ...(Number.isFinite(idNum) && idNum > 0 ? [{ id: idNum }] : []),
      { cliente: { nombre:   { contains: q } } },
      { cliente: { telefono: { contains: q } } },
    ];
  }

  const needsSaldoFilter = estadoFiltro === "CON_SALDO" || estadoFiltro === "PAGADOS";
  let pedidos: any[] = [];
  let total = 0;

  if (needsSaldoFilter) {
    const todos = await prisma.pedido.findMany({
      where: baseWhere,
      include: { cliente: true, pagos: true, prendas: { include: { entregasParciales: true } } },
      orderBy: { createdAt: "desc" },
    });
    const filtered = todos.filter((p: any) => {
      const sal = p.total - p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0);
      return estadoFiltro === "CON_SALDO" ? sal > 0 : sal <= 0;
    });
    total   = filtered.length;
    pedidos = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  } else {
    total   = await prisma.pedido.count({ where: baseWhere });
    pedidos = await prisma.pedido.findMany({
      where: baseWhere,
      include: { cliente: true, pagos: true, prendas: { include: { entregasParciales: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  /* KPIs de la página actual */
  const kpiPrendas = pedidos.reduce((s: number, p: any) =>
    s + p.prendas.reduce((ps: number, pr: any) => {
      const ent = pr.entregasParciales.reduce((es: number, e: any) => es + e.cantidad, 0);
      return ps + Math.max(pr.cantidad - ent, 0);
    }, 0), 0);

  const kpiSaldo  = pedidos.filter((p: any) => p.total - p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0) > 0).length;
  const kpiListos = pedidos.filter((p: any) => p.estado === "LISTO").length;

  return (
    <div className="p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              Gerente
            </p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">
              Inventario en piso
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {pedidos.length} de {total} pedidos activos
            </p>
          </div>
          <Link
            href="/pedidos/nuevo"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>
            Nueva entrada
          </Link>
        </div>

        {/* Filtros */}
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_200px_auto_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por recibo, cliente o teléfono…"
            className="input-modern"
          />
          <select name="estado" defaultValue={estadoFiltro} className="input-modern">
            <option value="TODOS">Todos los estados</option>
            <option value="RECIBIDO">Recibidos</option>
            <option value="LISTO">Listos para recoger</option>
            <option value="CON_SALDO">Con saldo pendiente</option>
            <option value="PAGADOS">Pagados</option>
          </select>
          <button className="btn-primary whitespace-nowrap">Filtrar</button>
          <Link href="/inventario" className="btn-dark whitespace-nowrap text-center">
            Limpiar
          </Link>
        </form>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <KpiCard label="Pedidos"          value={pedidos.length} color="blue"  icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        <KpiCard label="Prendas pendientes" value={kpiPrendas} color="purple" icon="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
        <KpiCard label="Con saldo"        value={kpiSaldo}   color="red"    icon="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <KpiCard label="Listos"           value={kpiListos}  color="green"  icon="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
      </div>

      {/* ── Lista de pedidos ─────────────────────────────── */}
      <div className="mt-5 space-y-4">
        {pedidos.map((pedido: any) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            agregarAbono={agregarAbono}
            registrarEntregaParcial={registrarEntregaParcial}
            cambiarEstado={cambiarEstado}
          />
        ))}

        {pedidos.length === 0 && (
          <div className="card">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              }
              title={q || estadoFiltro !== "TODOS" ? "Sin resultados" : "No hay pedidos activos"}
              description={q || estadoFiltro !== "TODOS" ? "Prueba con otros filtros o busca por nombre, teléfono o número." : "Los pedidos que recibas aparecerán aquí."}
              action={q || estadoFiltro !== "TODOS" ? { label: "Ver todos", href: "/inventario", secondary: true } : undefined}
            />
          </div>
        )}
      </div>

      {/* ── Paginación ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="card mt-5 flex items-center justify-between p-4">
          <Link
            href={buildUrl(Math.max(currentPage - 1, 1), q, estadoFiltro)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              currentPage === 1
                ? "pointer-events-none text-gray-300"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            ← Anterior
          </Link>

          <span className="text-sm font-semibold text-gray-500">
            Página {currentPage} / {totalPages}
          </span>

          <Link
            href={buildUrl(Math.min(currentPage + 1, totalPages), q, estadoFiltro)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              currentPage >= totalPages
                ? "pointer-events-none text-gray-300"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            Siguiente →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── PedidoCard ─────────────────────────────────────────────── */

function PedidoCard({
  pedido,
  agregarAbono,
  registrarEntregaParcial,
  cambiarEstado,
}: {
  pedido: any;
  agregarAbono: (f: FormData) => void;
  registrarEntregaParcial: (f: FormData) => void;
  cambiarEstado: (f: FormData) => void;
}) {
  const abonado   = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const saldo     = pedido.total - abonado;
  const recibidas = pedido.prendas.reduce((s: number, p: any) => s + p.cantidad, 0);
  const entregadasTotal = pedido.prendas.reduce((s: number, p: any) =>
    s + p.entregasParciales.reduce((es: number, e: any) => es + e.cantidad, 0), 0);
  const pendientesTotal = recibidas - entregadasTotal;

  return (
    <div className="card overflow-hidden">
      {/* Cabecera del pedido */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-white/[0.07]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-600 dark:bg-brand-500/15">
            #{fmt(pedido.id)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/pedidos/${pedido.id}`}
                className="font-black text-gray-900 hover:text-brand-500 hover:underline"
              >
                {pedido.cliente.nombre}
              </Link>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_BADGE[pedido.estado] ?? "bg-gray-100 text-gray-500"}`}>
                {pedido.estado}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {pedido.cliente.telefono ?? "Sin teléfono"} ·{" "}
              {new Date(pedido.createdAt).toLocaleDateString("es-CO")} ·{" "}
              {new Date(pedido.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/recibos/${pedido.id}/pdf`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-gray-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            Recibo
          </Link>
          <Link
            href={`/pedidos/${pedido.id}`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-gray-400"
          >
            Ver detalle →
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 dark:divide-white/[0.07] dark:border-white/[0.07] sm:grid-cols-6">
        <Metric label="Recibidas"  value={String(recibidas)} />
        <Metric label="Retiradas"  value={String(entregadasTotal)} />
        <Metric label="Pendientes" value={String(pendientesTotal)} bold />
        <Metric label="Total"      value={money(pedido.total)} />
        <Metric label="Abonado"    value={money(abonado)} />
        <Metric label="Saldo"      value={money(saldo)} danger={saldo > 0} />
      </div>

      {/* Cuerpo */}
      <div className="grid gap-0 xl:grid-cols-[1fr_320px]">

        {/* Prendas */}
        <div className="border-r border-gray-100 p-5 dark:border-white/[0.07]">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Prendas
          </p>
          <div className="space-y-3">
            {pedido.prendas.map((prenda: any) => {
              const ent  = prenda.entregasParciales.reduce((s: number, e: any) => s + e.cantidad, 0);
              const pend = prenda.cantidad - ent;
              const done = pend === 0;

              return (
                <div key={prenda.id} className={`rounded-xl border p-4 transition ${done ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5" : "border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.02]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {prenda.tipo}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {prenda.servicio}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Recibidas: {prenda.cantidad} · Retiradas: {ent} ·{" "}
                        <span className={done ? "font-semibold text-green-600" : "font-semibold text-gray-900"}>
                          Pendientes: {pend}
                        </span>
                      </p>
                      {prenda.descripcion && (
                        <p className="mt-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                          ⚠️ {prenda.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-brand-500">
                      {money(prenda.valor ?? 0)}
                    </span>
                  </div>

                  {/* Historial de retiros */}
                  {prenda.entregasParciales.length > 0 && (
                    <div className="mt-3 rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                      {prenda.entregasParciales.map((e: any) => (
                        <p key={e.id} className="text-xs text-gray-400">
                          {e.cantidad} retiradas · {new Date(e.createdAt).toLocaleDateString("es-CO")} · {new Date(e.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          {e.observacion ? ` · ${e.observacion}` : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Retiro parcial */}
                  {pend > 0 && (
                    <details className="group mt-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                        Retirar esta prenda
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition duration-200 group-open:rotate-180"><path d="M6 9l6 6 6-6"/></svg>
                      </summary>

                      <form action={registrarEntregaParcial} className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="pedidoId" value={pedido.id} />
                        <input type="hidden" name="prendaId" value={prenda.id} />

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">
                            Cantidad (máx. {pend})
                          </label>
                          <input
                            name="cantidad"
                            type="number"
                            min="1"
                            max={pend}
                            defaultValue={pend}
                            required
                            className="input-modern"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">
                            Método
                          </label>
                          <select name="metodo" className="input-modern">
                            {METODOS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>

                        {saldo > 0 && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500">
                              Abono (obligatorio)
                            </label>
                            <MoneyInput name="abono" placeholder="Valor del abono" />
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500">
                            Observación
                          </label>
                          <input name="observacion" placeholder="Opcional" className="input-modern" />
                        </div>

                        <button className="btn-primary sm:col-span-2">
                          Confirmar retiro
                        </button>
                      </form>
                    </details>
                  )}

                  {done && (
                    <p className="mt-2 text-xs font-semibold text-green-600">
                      ✅ Completamente retirada
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho: abonos + acciones */}
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-white/[0.07]">

          {/* Abonos */}
          <div className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              Abonos
            </p>

            {pedido.pagos.length > 0 ? (
              <div className="space-y-2">
                {pedido.pagos.map((pago: any) => (
                  <div key={pago.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/5">
                    <div>
                      <p className="text-sm font-bold text-brand-500">{money(pago.valor)}</p>
                      <p className="text-xs text-gray-400">
                        {pago.metodo} · {new Date(pago.createdAt).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin abonos aún.</p>
            )}

            {saldo > 0 && (
              <form action={agregarAbono} className="mt-3 grid gap-2">
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <MoneyInput
                  name="valor"
                  placeholder={`Abono — saldo: ${money(saldo)}`}
                />
                <select name="metodo" className="input-modern">
                  {METODOS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <button className="btn-primary">Registrar abono</button>
              </form>
            )}

            {saldo <= 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-500/10">
                <span className="text-green-500">✅</span>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Pedido pagado
                </p>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              Cambiar estado
            </p>
            <div className="space-y-2">
              {pedido.estado === "RECIBIDO" && (
                <EstadoBtn
                  pedidoId={pedido.id}
                  nuevoEstado="LISTO"
                  label="✅ Marcar como LISTO"
                  color="green"
                  action={cambiarEstado}
                />
              )}
              {pedido.estado === "LISTO" && saldo <= 0 && (
                <EstadoBtn
                  pedidoId={pedido.id}
                  nuevoEstado="ENTREGADO"
                  label="📦 Entregar pedido completo"
                  color="brand"
                  action={cambiarEstado}
                />
              )}
              {pedido.estado === "LISTO" && saldo > 0 && (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  Hay saldo pendiente. Registra el pago para entregar todo.
                </p>
              )}
              <EstadoBtn
                pedidoId={pedido.id}
                nuevoEstado="CANCELADO"
                label="Cancelar pedido"
                color="red"
                action={cambiarEstado}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componentes ──────────────────────────────────────── */

function EstadoBtn({
  pedidoId, nuevoEstado, label, color, action,
}: {
  pedidoId: number;
  nuevoEstado: string;
  label: string;
  color: "green" | "brand" | "red";
  action: (f: FormData) => void;
}) {
  const cls = {
    green: "bg-green-500 hover:bg-green-600 text-white",
    brand: "bg-brand-500 hover:bg-brand-600 text-white",
    red:   "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400",
  }[color];

  return (
    <form action={action}>
      <input type="hidden" name="pedidoId"    value={pedidoId} />
      <input type="hidden" name="nuevoEstado" value={nuevoEstado} />
      <button className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition ${cls}`}>
        {label}
      </button>
    </form>
  );
}

function Metric({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="p-4 text-center">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className={`mt-1 text-base font-black ${danger ? "text-red-500" : bold ? "text-gray-900" : "text-gray-700"}`}>
        {value}
      </p>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: "blue" | "purple" | "red" | "green" }) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  }[color];

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${palette}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}
