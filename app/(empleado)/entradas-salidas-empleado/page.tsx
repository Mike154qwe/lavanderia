import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money, fmt } from "@/lib/format";
import EmpleadoLinks from "@/components/EmpleadoLinks";
import PedidoRow from "./PedidoRow";
import MonthCalendar from "@/components/MonthCalendar";
import YearPager from "@/components/YearPager";
import FieldIcon from "@/components/FieldIcon";

export const metadata: Metadata = { title: "Lo de hoy" };

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
    prisma.pedido.findMany({
      where: { createdAt: { gte: inicioAno, lt: finAno } },
      include: { cliente: true, prendas: true, pagos: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.historialEstado.findMany({
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
    <div className="page-frame">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="page-kicker text-teal-600 dark:text-teal-400">Mostrador</p>
            <h1 className="page-title">
              Lo de hoy {year}
            </h1>
            <p className="page-subtitle">
              Qué entró y qué salió hoy. Toca un día para ver el detalle.
            </p>
            <EmpleadoLinks
              extra={[
                { href: "/inventario-empleado", label: "Llegó a recoger" },
              ]}
            />
          </div>
          <YearPager
            year={year}
            hrefFor={(y) => `/entradas-salidas-empleado?year=${y}&q=${encodeURIComponent(q)}&tipo=${tipoFiltro}`}
          />
        </div>

        {/* Filtros */}
        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_auto_auto]">
          <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar recibo, cliente o teléfono…"
              className="input-modern w-full"
            />
          </FieldIcon>
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
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden="true" />
            {pedidosAno.length} entradas
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
            <ArrowDownRight size={14} strokeWidth={2.25} aria-hidden="true" />
            {salidasAno.length} salidas
          </span>
        </div>
      </div>

      {/* ── Detalle del día seleccionado ─────────────────── */}
      {fechaSeleccionada && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.07]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Día seleccionado</p>
              <h2 className="mt-0.5 text-lg font-bold capitalize text-gray-900">
                {fechaSeleccionada.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h2>
            </div>
            <Link href={`/entradas-salidas-empleado?year=${year}&q=${q}&tipo=${tipoFiltro}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:border-white/10">
              <X size={14} strokeWidth={2.25} aria-hidden="true" />
              Cerrar
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
          const esMesActual = mesIndex === mesHoy && year === hoy.getFullYear();

          return (
            <div key={mes} className="card overflow-hidden">
              <div className={`flex items-center gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-white/[0.07] ${esMesActual ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
                {esMesActual && (
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">Actual</span>
                )}
                <h2 className={`font-bold ${esMesActual ? "text-brand-600 dark:text-brand-400" : "text-gray-900"}`}>
                  {mes} {year}
                </h2>
              </div>

              <MonthCalendar
                year={year}
                month={mesIndex}
                today={hoy}
                selected={fechaSeleccionada}
                hrefFor={(d) => {
                  const fechaLink = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  return `/entradas-salidas-empleado?year=${year}&fecha=${fechaLink}&q=${encodeURIComponent(q)}&tipo=${tipoFiltro}`;
                }}
                getStats={(d) => ({
                  entradas: tipoFiltro !== "salidas"
                    ? pedidosAno.filter((p: any) => sameDay(p.createdAt, d)).length
                    : 0,
                  salidas: tipoFiltro !== "entradas"
                    ? salidasAno.filter((s: any) => sameDay(s.createdAt, d)).length
                    : 0,
                })}
              />
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

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-200 py-5 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
      {text}
    </p>
  );
}
