import Link from "next/link";
import { prisma } from "@/lib/prisma";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export default async function MovimientosPage() {
  const hoy   = new Date();
  const year  = hoy.getFullYear();
  const mesHoy = hoy.getMonth();
  const diaHoy = hoy.getDate();

  const pedidos: any[] = await (prisma as any).pedido.findMany({
    include: { cliente: true, prendas: true, historial: true },
    orderBy: { createdAt: "desc" },
  });

  /* KPIs anuales */
  const pedidosAnio = pedidos.filter((p) => p.createdAt.getFullYear() === year);
  const kpiEntradas = pedidosAnio.length;
  const kpiSalidas  = pedidosAnio.filter((p: any) =>
    p.historial.some((h: any) => h.estado === "ENTREGADO" && h.createdAt.getFullYear() === year)
  ).length;
  const kpiPrendas  = pedidosAnio.reduce(
    (s: number, p: any) => s + p.prendas.reduce((ps: number, pr: any) => ps + pr.cantidad, 0), 0
  );

  return (
    <div className="p-6">

      {/* ── Cabecera ──────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              Gerente
            </p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">
              Entradas y salidas
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Calendario operacional {year} — haz clic en un día para ver el detalle
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-white/[0.07] dark:border-white/[0.07]">
          <KpiBar label="Entradas este año"   value={kpiEntradas} color="blue"   icon="M12 5v14M5 12h14" />
          <KpiBar label="Entregas este año"   value={kpiSalidas}  color="green"  icon="M20 12V22H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          <KpiBar label="Prendas este año"    value={kpiPrendas}  color="purple" icon="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
        </div>
      </div>

      {/* ── Meses ─────────────────────────────────────── */}
      <div className="mt-5 space-y-5">
        {MESES.map((mes, mesIndex) => {
          /* Solo mostrar hasta el mes actual */
          if (mesIndex > mesHoy) return null;

          const diasDelMes = new Date(year, mesIndex + 1, 0).getDate();

          /* Stats del mes */
          const pedidosMes = pedidosAnio.filter((p: any) => p.createdAt.getMonth() === mesIndex);
          const entradasMes = pedidosMes.length;
          const salidasMes  = pedidosMes.filter((p: any) =>
            p.historial.some((h: any) => h.estado === "ENTREGADO" && h.createdAt.getMonth() === mesIndex)
          ).length;
          const prendasMes  = pedidosMes.reduce(
            (s: number, p: any) => s + p.prendas.reduce((ps: number, pr: any) => ps + pr.cantidad, 0), 0
          );

          const esMesActual = mesIndex === mesHoy;

          return (
            <div key={mes} className="card overflow-hidden">
              {/* Cabecera del mes */}
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 dark:border-white/[0.07] ${esMesActual ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
                <div className="flex items-center gap-3">
                  {esMesActual && (
                    <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      Actual
                    </span>
                  )}
                  <h2 className={`text-lg font-black ${esMesActual ? "text-brand-600 dark:text-brand-400" : "text-gray-900"}`}>
                    {mes} {year}
                  </h2>
                </div>
                <div className="flex gap-5 text-sm">
                  <span className="font-semibold text-gray-400">
                    <span className="text-blue-600 dark:text-blue-400">↑ {entradasMes}</span> entradas
                  </span>
                  <span className="font-semibold text-gray-400">
                    <span className="text-green-600 dark:text-green-400">↓ {salidasMes}</span> salidas
                  </span>
                  <span className="font-semibold text-gray-400">
                    <span className="text-purple-600 dark:text-purple-400">{prendasMes}</span> prendas
                  </span>
                </div>
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1.5 p-4 sm:grid-cols-10 xl:grid-cols-[repeat(auto-fill,minmax(70px,1fr))]">
                {Array.from({ length: diasDelMes }).map((_, dayIndex) => {
                  const dia = dayIndex + 1;
                  const esHoyFlag = esMesActual && dia === diaHoy;

                  const pedidosDia = pedidosMes.filter(
                    (p: any) => p.createdAt.getDate() === dia
                  );

                  const entradas = pedidosDia.length;
                  const salidas  = pedidosDia.filter((p: any) =>
                    p.historial.some(
                      (h: any) =>
                        h.estado === "ENTREGADO" &&
                        h.createdAt.getMonth() === mesIndex &&
                        h.createdAt.getDate()  === dia
                    )
                  ).length;

                  const activo  = entradas > 0 || salidas > 0;
                  const fechaLink = `${year}-${String(mesIndex + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

                  let cellClass = "";
                  if (esHoyFlag) {
                    cellClass = "border-orange-400 bg-orange-50 ring-2 ring-orange-300 dark:border-orange-500/50 dark:bg-orange-500/10 dark:ring-orange-500/30";
                  } else if (activo) {
                    cellClass = "border-brand-300 bg-brand-50 hover:border-brand-400 hover:shadow-md dark:border-brand-500/30 dark:bg-brand-500/10";
                  } else {
                    cellClass = "border-gray-100 bg-gray-50 hover:border-gray-200 dark:border-white/5 dark:bg-white/[0.02]";
                  }

                  return (
                    <Link
                      key={dia}
                      href={`/movimientos/dia/${fechaLink}`}
                      className={`group relative rounded-xl border p-2.5 transition ${cellClass}`}
                    >
                      {/* Número del día */}
                      <div className="flex items-start justify-between">
                        <span className={`text-lg font-black leading-none ${
                          esHoyFlag ? "text-orange-600 dark:text-orange-400"
                          : activo  ? "text-brand-600 dark:text-brand-400"
                          : "text-gray-400"
                        }`}>
                          {dia}
                        </span>
                        {esHoyFlag && (
                          <span className="rounded bg-orange-500 px-1 py-0.5 text-[9px] font-black leading-none text-white">
                            HOY
                          </span>
                        )}
                      </div>

                      {/* Métricas */}
                      {activo && (
                        <div className="mt-2 space-y-0.5">
                          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            ↑ {entradas}
                          </p>
                          <p className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                            ↓ {salidas}
                          </p>
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

function KpiBar({
  label, value, color, icon,
}: {
  label: string; value: number; color: "blue" | "green" | "purple"; icon: string;
}) {
  const palette = {
    blue:   "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/15",
    green:  "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/15",
    purple: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/15",
  }[color];

  return (
    <div className="flex items-center gap-4 p-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value.toLocaleString("es-CO")}</p>
        <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}
