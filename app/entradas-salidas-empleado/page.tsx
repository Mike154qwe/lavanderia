import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Entradas y salidas" };

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function normalizar(s: string) { return s.trim().toLowerCase(); }
function coincide(pedido: any, q: string) {
  if (!q) return true;
  const n = normalizar(q);
  return (
    String(pedido.id).includes(n) ||
    fmt(pedido.id).includes(n) ||
    normalizar(pedido.cliente?.nombre || "").includes(n) ||
    normalizar(pedido.cliente?.telefono || "").includes(n)
  );
}

export default async function EntradasSalidasEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; year?: string; q?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const hoy    = new Date();
  const year   = Number(params.year || hoy.getFullYear());
  const q      = params.q?.trim() || "";
  const tipoFiltro = params.tipo || "todos";

  const fechaSeleccionada = params.fecha ? new Date(params.fecha + "T00:00:00") : null;

  const inicioAno = new Date(year, 0, 1);
  const finAno    = new Date(year + 1, 0, 1);

  const [pedidosRaw, salidasRaw]: [any[], any[]] = await Promise.all([
    (prisma as any).pedido.findMany({
      where: { createdAt: { gte: inicioAno, lt: finAno } },
      include: { cliente: true, prendas: true, pagos: true },
      orderBy: { createdAt: "asc" },
    }),
    (prisma as any).historialEstado.findMany({
      where: { estado: "ENTREGADO", createdAt: { gte: inicioAno, lt: finAno } },
      include: { pedido: { include: { cliente: true, prendas: true, pagos: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const pedidosAno = pedidosRaw.filter((p) => coincide(p, q));
  const salidasAno = salidasRaw.filter((s) => coincide(s.pedido, q));

  const entradasSeleccionadas = fechaSeleccionada && tipoFiltro !== "salidas"
    ? pedidosAno.filter((p: any) => sameDay(p.createdAt, fechaSeleccionada))
    : [];

  const salidasSeleccionadas = fechaSeleccionada && tipoFiltro !== "entradas"
    ? salidasAno.filter((s: any) => sameDay(s.createdAt, fechaSeleccionada))
    : [];

  const mesHoy = year === hoy.getFullYear() ? hoy.getMonth() : 11;

  return (
    <div className="p-4 sm:p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Empleado</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">
              Entradas y salidas {year}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Toca un día para ver el detalle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/entradas-salidas-empleado?year=${year - 1}&q=${q}&tipo=${tipoFiltro}`} className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
              ← {year - 1}
            </Link>
            <span className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-black text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {year}
            </span>
            <Link href={`/entradas-salidas-empleado?year=${year + 1}&q=${q}&tipo=${tipoFiltro}`} className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
              {year + 1} →
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar recibo, cliente o teléfono…"
            className="input-modern"
          />
          <select name="tipo" defaultValue={tipoFiltro} className="input-modern">
            <option value="todos">Todos</option>
            <option value="entradas">Solo entradas</option>
            <option value="salidas">Solo salidas</option>
          </select>
          <input type="hidden" name="year" value={year} />
          <button className="btn-primary whitespace-nowrap">Filtrar</button>
          {(q || tipoFiltro !== "todos") && (
            <Link href="/entradas-salidas-empleado" className="btn-dark whitespace-nowrap text-center">
              Limpiar
            </Link>
          )}
        </form>

        {/* Totales del año */}
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            ↑ {pedidosAno.length} entradas
          </span>
          <span className="rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
            ↓ {salidasAno.length} salidas
          </span>
        </div>
      </div>

      {/* ── Detalle del día seleccionado ─────────────────── */}
      {fechaSeleccionada && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.07]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Día seleccionado</p>
              <h2 className="mt-0.5 text-lg font-black capitalize text-gray-900">
                {fechaSeleccionada.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h2>
            </div>
            <Link href={`/entradas-salidas-empleado?year=${year}&q=${q}&tipo=${tipoFiltro}`} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:border-white/10">
              Cerrar ✕
            </Link>
          </div>

          {/* KPIs del día */}
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/[0.07] sm:grid-cols-4 sm:divide-y-0">
            <KpiBar label="Entradas"        value={entradasSeleccionadas.length} color="blue" />
            <KpiBar label="Salidas"         value={salidasSeleccionadas.length}  color="green" />
            <KpiBar
              label="Prendas recibidas"
              value={entradasSeleccionadas.reduce((s: number, p: any) => s + p.prendas.reduce((ps: number, pr: any) => ps + pr.cantidad, 0), 0)}
              color="purple"
            />
            <KpiBar
              label="Dinero recibido"
              value={entradasSeleccionadas.reduce((s: number, p: any) => s + p.pagos.reduce((ps: number, pg: any) => ps + pg.valor, 0), 0)}
              color="brand"
              isMoney
            />
          </div>

          {/* Listas */}
          <div className="grid gap-0 divide-y divide-gray-100 dark:divide-white/[0.07] xl:grid-cols-2 xl:divide-x xl:divide-y-0">
            {tipoFiltro !== "salidas" && (
              <div className="p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">
                  Entradas del día
                </p>
                <div className="space-y-2">
                  {entradasSeleccionadas.map((p: any) => (
                    <PedidoRow key={`e-${p.id}`} pedido={p} tipo="Entrada" />
                  ))}
                  {entradasSeleccionadas.length === 0 && <EmptyRow text="Sin entradas este día." />}
                </div>
              </div>
            )}
            {tipoFiltro !== "entradas" && (
              <div className="p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-500">
                  Salidas del día
                </p>
                <div className="space-y-2">
                  {salidasSeleccionadas.map((s: any) => (
                    <PedidoRow key={`s-${s.id}-${s.pedido.id}`} pedido={s.pedido} tipo="Salida" fechaMovimiento={s.createdAt} />
                  ))}
                  {salidasSeleccionadas.length === 0 && <EmptyRow text="Sin salidas este día." />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Calendario ───────────────────────────────────── */}
      <div className="mt-4 space-y-4">
        {MESES.map((mes, mesIndex) => {
          if (mesIndex > mesHoy) return null;
          const diasDelMes  = new Date(year, mesIndex + 1, 0).getDate();
          const esMesActual = mesIndex === mesHoy && year === hoy.getFullYear();

          return (
            <div key={mes} className="card overflow-hidden">
              <div className={`flex items-center gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-white/[0.07] ${esMesActual ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
                {esMesActual && (
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">Actual</span>
                )}
                <h2 className={`font-black ${esMesActual ? "text-brand-600 dark:text-brand-400" : "text-gray-900"}`}>
                  {mes} {year}
                </h2>
              </div>

              <div className="grid grid-cols-7 gap-1.5 p-4 sm:grid-cols-10 xl:grid-cols-[repeat(auto-fill,minmax(70px,1fr))]">
                {Array.from({ length: diasDelMes }).map((_, dayIndex) => {
                  const dia  = dayIndex + 1;
                  const fecha = new Date(year, mesIndex, dia);
                  const esHoyFlag    = sameDay(fecha, hoy);
                  const seleccionado = fechaSeleccionada && sameDay(fechaSeleccionada, fecha);

                  const entradas = tipoFiltro !== "salidas"
                    ? pedidosAno.filter((p: any) => sameDay(p.createdAt, fecha)).length
                    : 0;
                  const salidas  = tipoFiltro !== "entradas"
                    ? salidasAno.filter((s: any) => sameDay(s.createdAt, fecha)).length
                    : 0;
                  const activo   = entradas > 0 || salidas > 0;

                  const fechaLink = `${year}-${String(mesIndex + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

                  let cellClass = "";
                  if (seleccionado) {
                    cellClass = "border-brand-400 bg-brand-50 ring-2 ring-brand-300 dark:border-brand-500/50 dark:bg-brand-500/10 dark:ring-brand-500/30";
                  } else if (esHoyFlag) {
                    cellClass = "border-orange-400 bg-orange-50 ring-2 ring-orange-300 dark:border-orange-500/50 dark:bg-orange-500/10 dark:ring-orange-500/30";
                  } else if (activo) {
                    cellClass = "border-brand-200 bg-brand-50/60 hover:border-brand-400 dark:border-brand-500/20 dark:bg-brand-500/5";
                  } else {
                    cellClass = "border-gray-100 bg-gray-50/50 hover:border-gray-200 dark:border-white/5 dark:bg-white/[0.02]";
                  }

                  return (
                    <Link
                      key={dia}
                      id={esHoyFlag ? "hoy" : undefined}
                      href={`/entradas-salidas-empleado?year=${year}&fecha=${fechaLink}&q=${q}&tipo=${tipoFiltro}`}
                      className={`rounded-xl border p-2.5 transition ${cellClass}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-lg font-black leading-none ${
                          seleccionado ? "text-brand-600 dark:text-brand-300"
                          : esHoyFlag   ? "text-orange-600 dark:text-orange-400"
                          : activo      ? "text-brand-500"
                          : "text-gray-400"
                        }`}>{dia}</span>
                        {esHoyFlag && (
                          <span className="rounded bg-orange-500 px-1 py-0.5 text-[9px] font-black leading-none text-white">HOY</span>
                        )}
                      </div>
                      {activo && (
                        <div className="mt-1.5 space-y-0.5">
                          {entradas > 0 && <p className="text-[10px] font-bold text-blue-500">↑ {entradas}</p>}
                          {salidas  > 0 && <p className="text-[10px] font-bold text-green-500">↓ {salidas}</p>}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-componentes ──────────────────────────────────────── */

function KpiBar({ label, value, color, isMoney }: { label: string; value: number; color: "blue" | "green" | "purple" | "brand"; isMoney?: boolean }) {
  const palette = {
    blue:   "text-blue-600 dark:text-blue-400",
    green:  "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    brand:  "text-brand-600 dark:text-brand-400",
  }[color];

  return (
    <div className="p-4 text-center">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${palette}`}>
        {isMoney ? money(value) : value}
      </p>
    </div>
  );
}

function PedidoRow({ pedido, tipo, fechaMovimiento }: { pedido: any; tipo: string; fechaMovimiento?: Date }) {
  const abonado     = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const saldo       = pedido.total - abonado;
  const totalPrendas = pedido.prendas.reduce((s: number, pr: any) => s + pr.cantidad, 0);

  return (
    <details className="group rounded-xl border border-gray-100 dark:border-white/[0.07]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/pedidos/${pedido.id}`} className="font-mono text-sm font-black text-brand-500 hover:underline" onClick={(e) => e.stopPropagation()}>
              #{fmt(pedido.id)}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tipo === "Entrada" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"}`}>
              {tipo}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-gray-800">{pedido.cliente.nombre}</p>
          <p className="text-xs text-gray-400">
            {totalPrendas} prendas · {money(pedido.total)} ·{" "}
            {(fechaMovimiento || pedido.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400 transition duration-200 group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-white/[0.07]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Total</p>
            <p className="mt-0.5 text-sm font-black text-gray-900">{money(pedido.total)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Abonado</p>
            <p className="mt-0.5 text-sm font-black text-green-600">{money(abonado)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2 dark:bg-white/5">
            <p className="text-xs text-gray-400">Saldo</p>
            <p className={`mt-0.5 text-sm font-black ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>{money(saldo)}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {pedido.prendas.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-white/[0.07]">
              <div>
                <span className="text-sm font-semibold text-gray-800">{p.tipo}</span>
                <span className="ml-1.5 text-xs text-gray-400">×{p.cantidad} · {p.servicio}</span>
              </div>
              <span className="text-sm font-bold text-brand-500">{money(p.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-200 py-5 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
      {text}
    </p>
  );
}
