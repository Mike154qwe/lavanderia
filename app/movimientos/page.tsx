import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MovimientosMensuales from "@/components/charts/MovimientosMensuales";

export const metadata: Metadata = { title: "Movimientos" };

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  const params  = searchParams ? await searchParams : {};
  const hoy     = new Date();
  const year    = Number(params.year || hoy.getFullYear());
  const mesHoy  = hoy.getMonth();
  const diaHoy  = hoy.getDate();
  const esAnioActual = year === hoy.getFullYear();

  const inicioAnio = new Date(year, 0, 1);
  const finAnio    = new Date(year + 1, 0, 1);

  const [pedidosAnio, salidasAnio] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: inicioAnio, lt: finAnio } },
      select: {
        id: true,
        createdAt: true,
        prendas: { select: { cantidad: true } },
      },
    }),
    prisma.historialEstado.findMany({
      where: { estado: "ENTREGADO", createdAt: { gte: inicioAnio, lt: finAnio } },
      select: { createdAt: true },
    }),
  ]);

  /* ── KPIs anuales ─────────────────────────────────────── */
  const kpiEntradas  = pedidosAnio.length;
  const kpiSalidas   = salidasAnio.length;
  const kpiPrendas   = pedidosAnio.reduce(
    (s, p) => s + p.prendas.reduce((ps, pr) => ps + pr.cantidad, 0), 0,
  );
  const diasActivosSet = new Set(
    pedidosAnio.map((p) => `${p.createdAt.getMonth()}-${p.createdAt.getDate()}`),
  );
  const kpiDiasActivos = diasActivosSet.size;

  /* ── Datos mensuales para gráfica ─────────────────────── */
  const limiteMes = esAnioActual ? mesHoy : 11;
  const datosMensuales = MESES.slice(0, limiteMes + 1).map((_, i) => ({
    mes:      MESES_CORTO[i],
    entradas: pedidosAnio.filter((p) => p.createdAt.getMonth() === i).length,
    salidas:  salidasAnio.filter((s) => s.createdAt.getMonth() === i).length,
  }));

  const maxEntradasMes = Math.max(...datosMensuales.map((d) => d.entradas), 1);

  /* ── Mes con más actividad ────────────────────────────── */
  const mesMasActivo = datosMensuales.reduce(
    (max, d, i) => (d.entradas > datosMensuales[max].entradas ? i : max), 0,
  );

  return (
    <div className="space-y-5 p-6">

      {/* ── Cabecera ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900">Entradas y salidas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Actividad operacional del año — haz clic en un día para ver el detalle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/movimientos?year=${year - 1}`}
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            ← {year - 1}
          </Link>
          <span className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-black text-brand-600">
            {year}
          </span>
          <Link
            href={`/movimientos?year=${year + 1}`}
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            {year + 1} →
          </Link>
        </div>
      </div>

      {/* ── KPIs del año ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pedidos recibidos"
          value={kpiEntradas}
          sub={`en ${year}`}
          color="blue"
          icon="↑"
        />
        <KpiCard
          label="Pedidos entregados"
          value={kpiSalidas}
          sub={kpiEntradas > 0 ? `${Math.round((kpiSalidas / kpiEntradas) * 100)}% entregados` : "—"}
          color="green"
          icon="↓"
        />
        <KpiCard
          label="Prendas procesadas"
          value={kpiPrendas}
          sub={kpiEntradas > 0 ? `~${Math.round(kpiPrendas / kpiEntradas)} por pedido` : "—"}
          color="purple"
          icon="👗"
        />
        <KpiCard
          label="Días con actividad"
          value={kpiDiasActivos}
          sub={`mes más activo: ${MESES[mesMasActivo]}`}
          color="orange"
          icon="📅"
        />
      </div>

      {/* ── Gráfica mensual ───────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-black text-gray-900">Entradas vs Salidas por mes</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Comparación mensual — pedidos recibidos y entregados en {year}
            </p>
          </div>
          {kpiEntradas > kpiSalidas && (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-200">
              ⚠ {kpiEntradas - kpiSalidas} pedidos pendientes de entrega
            </span>
          )}
        </div>
        <MovimientosMensuales data={datosMensuales} />
      </div>

      {/* ── Meses ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {MESES.map((mes, mesIndex) => {
          if (esAnioActual && mesIndex > mesHoy) return null;

          const diasDelMes   = new Date(year, mesIndex + 1, 0).getDate();
          const pedidosMes   = pedidosAnio.filter((p) => p.createdAt.getMonth() === mesIndex);
          const entradasMes  = pedidosMes.length;
          const salidasMes   = salidasAnio.filter((s) => s.createdAt.getMonth() === mesIndex).length;
          const prendasMes   = pedidosMes.reduce(
            (s, p) => s + p.prendas.reduce((ps, pr) => ps + pr.cantidad, 0), 0,
          );
          const tasaEntrega  = entradasMes > 0 ? Math.round((salidasMes / entradasMes) * 100) : 0;
          const esMesActual  = esAnioActual && mesIndex === mesHoy;
          const actividadPct = maxEntradasMes > 0 ? (entradasMes / maxEntradasMes) * 100 : 0;

          return (
            <div key={mes} className="card overflow-hidden">

              {/* Cabecera del mes */}
              <div className={`border-b border-gray-100 px-6 py-4 ${esMesActual ? "bg-brand-50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {esMesActual && (
                      <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        Actual
                      </span>
                    )}
                    <h2 className={`text-lg font-black ${esMesActual ? "text-brand-700" : "text-gray-900"}`}>
                      {mes} {year}
                    </h2>
                  </div>

                  {/* Stats del mes */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip color="blue"   label={`↑ ${entradasMes} entradas`} />
                    <Chip color="green"  label={`↓ ${salidasMes} salidas`} />
                    <Chip color="purple" label={`${prendasMes} prendas`} />
                    {entradasMes > 0 && (
                      <Chip
                        color={tasaEntrega >= 80 ? "green" : tasaEntrega >= 50 ? "orange" : "red"}
                        label={`${tasaEntrega}% entregado`}
                      />
                    )}
                  </div>
                </div>

                {/* Barra de actividad relativa */}
                {entradasMes > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-gray-400">Actividad</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${esMesActual ? "bg-brand-500" : "bg-gray-400"}`}
                        style={{ width: `${actividadPct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-gray-400">
                      {Math.round(actividadPct)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1.5 p-4 sm:grid-cols-10 xl:grid-cols-[repeat(auto-fill,minmax(68px,1fr))]">
                {Array.from({ length: diasDelMes }).map((_, dayIndex) => {
                  const dia        = dayIndex + 1;
                  const esHoyFlag  = esMesActual && dia === diaHoy;
                  const pedidosDia = pedidosMes.filter((p) => p.createdAt.getDate() === dia);
                  const salidasDia = salidasAnio.filter(
                    (s) => s.createdAt.getMonth() === mesIndex && s.createdAt.getDate() === dia,
                  ).length;
                  const entradas   = pedidosDia.length;
                  const activo     = entradas > 0 || salidasDia > 0;
                  const fechaLink  = `${year}-${String(mesIndex + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

                  let cellClass = "";
                  if (esHoyFlag) {
                    cellClass = "border-orange-400 bg-orange-50 ring-2 ring-orange-300";
                  } else if (activo) {
                    cellClass = "border-brand-300 bg-brand-50 hover:border-brand-400 hover:shadow-sm";
                  } else {
                    cellClass = "border-gray-100 bg-gray-50/50 hover:border-gray-200";
                  }

                  return (
                    <Link
                      key={dia}
                      href={`/gerente?fecha=${fechaLink}&year=${year}`}
                      className={`group rounded-xl border p-2.5 transition ${cellClass}`}
                      title={activo ? `${entradas} entrada${entradas !== 1 ? "s" : ""}, ${salidasDia} salida${salidasDia !== 1 ? "s" : ""}` : `Sin actividad`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-base font-black leading-none ${
                          esHoyFlag ? "text-orange-600"
                          : activo   ? "text-brand-600"
                          : "text-gray-300"
                        }`}>
                          {dia}
                        </span>
                        {esHoyFlag && (
                          <span className="rounded bg-orange-500 px-1 py-0.5 text-[9px] font-black leading-none text-white">
                            HOY
                          </span>
                        )}
                      </div>

                      {activo && (
                        <div className="mt-1.5 space-y-0.5">
                          {entradas   > 0 && <p className="text-[10px] font-bold text-blue-600">↑ {entradas}</p>}
                          {salidasDia > 0 && <p className="text-[10px] font-bold text-green-600">↓ {salidasDia}</p>}
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

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: number; sub: string;
  color: "blue" | "green" | "purple" | "orange"; icon: string;
}) {
  const palette: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 ring-blue-100",
    green:  "bg-green-50 text-green-700 ring-green-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
  };
  const dotColor: Record<string, string> = {
    blue: "bg-blue-400", green: "bg-green-400", purple: "bg-purple-400", orange: "bg-orange-400",
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ring-1 ${palette[color]}`}>
          {icon}
        </span>
        <span className={`h-2 w-2 rounded-full ${dotColor[color]}`} />
      </div>
      <p className="text-3xl font-black text-gray-900">{value.toLocaleString("es-CO")}</p>
      <p className="mt-0.5 text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function Chip({
  label, color,
}: {
  label: string; color: "blue" | "green" | "purple" | "orange" | "red";
}) {
  const cls: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700",
    green:  "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
    red:    "bg-red-50 text-red-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls[color]}`}>
      {label}
    </span>
  );
}
