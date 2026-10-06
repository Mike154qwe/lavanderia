import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  ClipboardList,
  Printer,
  Shield,
  Smartphone,
  TrendingDown,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import IngresosDiarios from "@/components/charts/IngresosDiarios";
import MetodosPago from "@/components/charts/MetodosPago";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  money, fmt, fechaLarga, fechaCorta, fechaHora, fechaDiaMes, fechaMesAno,
  inicioDia, finDia, sameDay, dayKey, isoFecha, parseFechaParam,
  inicioAno, inicioMes, partesBogota, civilBogota,
} from "@/lib/format";
import PedidoLink from "@/components/PedidoLink";
import { calcularCaja, ventanaDeCierre, enVentana } from "@/lib/caja";
import {
  formatearFecha,
  type MovimientoRemoto,
  type PanelRemotoData,
} from "@/lib/panel-remoto";
import { guardarPanelRemotoEnFirestore } from "@/lib/panel-remoto-admin";
import MonthCalendar from "@/components/MonthCalendar";
import DateField from "@/components/DateField";
import YearPager from "@/components/YearPager";

export const metadata: Metadata = { title: "Gerente" };

function sumarMetodo(pagos: any[], metodo: string) {
  return pagos.filter((p) => p.metodo === metodo).reduce((s, p) => s + p.valor, 0);
}
/** Construye un Map<dayKey, count> a partir de un array con campo createdAt */
function buildDayMap(rows: { createdAt: Date }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/* ── Server action ─────────────────────────────────────────── */

async function hacerCierreCaja(formData: FormData) {
  "use server";

  const responsable = String(formData.get("responsable") || "Gerente").trim();
  const observacion = String(formData.get("observacion") || "").trim();
  const ahora = new Date();
  const inicioHoy = inicioDia(ahora);
  const finHoy    = finDia(ahora);

  const ultimoCierre = await prisma.cierreCaja.findFirst({
    where: { createdAt: { gte: inicioHoy, lt: finHoy } },
    orderBy: { createdAt: "desc" },
  });

  const desde = ultimoCierre ? ultimoCierre.createdAt : inicioHoy;

  const [pagos, gastos] = await Promise.all([
    prisma.pago.findMany({ where: { createdAt: { gt: desde, lte: ahora } } }),
    prisma.gastoCaja.findMany({ where: { createdAt: { gt: desde, lte: ahora } } }),
  ]);

  // Cálculo compartido con las demás vistas (lib/caja.ts). `totalCaja` es el
  // nombre histórico de la columna de la base y guarda la GANANCIA NETA del
  // cierre (todos los medios de pago); el «efectivo en caja» se recalcula desde
  // los movimientos, igual que en el ticket, y no se guarda.
  const {
    efectivo, nequi, daviplata, transferencia, tarjeta, totalGastos,
    gananciaNeta: totalCaja, gastosEfectivo, efectivoEnCaja,
  } = calcularCaja(pagos, gastos);

  const cierre = await prisma.cierreCaja.create({
    data: { efectivo, nequi, daviplata, transferencia, tarjeta, gastos: totalGastos, totalCaja, responsable, observacion: observacion || null },
  });

  // Respaldo en la nube para el panel remoto de la gerente (lib/panel-remoto.ts).
  // Va en su propio try/catch: el cierre local ya quedó guardado, así que un
  // fallo de red aquí no debe afectar el flujo ni revertir nada.
  try {
    const [pedidosDia, salidasDia] = await Promise.all([
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicioHoy, lt: finHoy } },
        include: { cliente: true, pagos: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.historialEstado.findMany({
        where: { estado: "ENTREGADO", createdAt: { gte: inicioHoy, lt: finHoy } },
        include: { pedido: { include: { cliente: true, pagos: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const entradas: MovimientoRemoto[] = pedidosDia.map((p: any) => ({
      pedidoId: p.id,
      cliente: p.cliente.nombre,
      total: p.total,
      abonado: p.pagos.reduce((s: number, pg: any) => s + pg.valor, 0),
      hora: p.createdAt.toISOString(),
    }));

    const salidas: MovimientoRemoto[] = salidasDia.map((s: any) => ({
      pedidoId: s.pedido.id,
      cliente: s.pedido.cliente.nombre,
      total: s.pedido.total,
      abonado: s.pedido.pagos.reduce((sum: number, pg: any) => sum + pg.valor, 0),
      hora: s.createdAt.toISOString(),
    }));

    const panelData: PanelRemotoData = {
      fecha: formatearFecha(ahora),
      entradas,
      salidas,
      cierre: {
        id: cierre.id,
        efectivo,
        nequi,
        daviplata,
        transferencia,
        tarjeta,
        gastos: totalGastos,
        totalCaja,
        gastosEfectivo,
        efectivoEnCaja,
        responsable: cierre.responsable,
        createdAt: cierre.createdAt.toISOString(),
      },
    };

    await guardarPanelRemotoEnFirestore(panelData);
  } catch (err) {
    console.error("No se pudo sincronizar el cierre de caja con Firestore (panelRemoto):", err);
  }

  revalidatePath("/gerente");
  redirect(`/cierres-caja/${cierre.id}/ticket`);
}

/* ── Page ──────────────────────────────────────────────────── */

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function GerentePage({
  searchParams,
}: {
  searchParams?: Promise<{ fecha?: string; year?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const hoy    = new Date();
  const hoyB   = partesBogota(hoy);

  const fechaSeleccionada = params.fecha
    ? parseFechaParam(params.fecha)
    : inicioDia(hoy);
  const selB = partesBogota(fechaSeleccionada);
  const year = params.fecha
    ? selB.year
    : Number(params.year || hoyB.year);

  const inicio = inicioDia(fechaSeleccionada);
  const fin    = finDia(fechaSeleccionada);
  const inicioAnoVista = inicioAno(year);
  const finAno         = inicioAno(year + 1);

  const [pedidosDia, pagosDia, gastosDia, salidasDia, cierresDia, pedidosAno, salidasAno, gastosAno] =
    await Promise.all([
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicio, lt: fin } },
        include: { cliente: true, prendas: true, pagos: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pago.findMany({
        where: { createdAt: { gte: inicio, lt: fin } },
        include: { pedido: { include: { cliente: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gastoCaja.findMany({
        where: { createdAt: { gte: inicio, lt: fin } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.historialEstado.findMany({
        where: { estado: "ENTREGADO", createdAt: { gte: inicio, lt: fin } },
        include: { pedido: { include: { cliente: true, prendas: true, pagos: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cierreCaja.findMany({
        where: { createdAt: { gte: inicio, lt: fin } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicioAnoVista, lt: finAno } },
        select: { id: true, createdAt: true },
      }),
      prisma.historialEstado.findMany({
        where: { estado: "ENTREGADO", createdAt: { gte: inicioAnoVista, lt: finAno } },
        select: { createdAt: true },
      }),
      prisma.gastoCaja.findMany({
        where: { createdAt: { gte: inicioAnoVista, lt: finAno } },
        select: { createdAt: true },
      }),
    ]);

  /* Charts */
  const desdeMes = inicioMes(hoyB.year, hoyB.month - 1);
  const pagosMes = await prisma.pago.findMany({
    where: { createdAt: { gte: desdeMes } },
    select: { valor: true, createdAt: true },
  });

  // Agregar en Map<día_del_mes, total> — O(n) en vez de O(n×días)
  const pagosMesMap = new Map<number, number>();
  for (const p of pagosMes) {
    const d = partesBogota(p.createdAt).day;
    pagosMesMap.set(d, (pagosMesMap.get(d) ?? 0) + (p.valor as number));
  }

  const diasEnMes       = hoyB.day;
  const ingresosDiarios = Array.from({ length: diasEnMes }, (_, i) => ({
    dia:   String(i + 1),
    total: pagosMesMap.get(i + 1) ?? 0,
  }));

  // Maps para el calendario anual — O(n) una sola vez, lookup O(1) por celda
  const pedidosAnoMap = buildDayMap(pedidosAno.map((p: any) => ({ createdAt: p.createdAt })));
  const salidasAnoMap = buildDayMap(salidasAno.map((s: any) => ({ createdAt: s.createdAt })));
  const gastosAnoMap  = buildDayMap(gastosAno.map((g: any)  => ({ createdAt: g.createdAt })));

  const metodosPagoData = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"].map(
    (m) => ({ metodo: m, total: sumarMetodo(pagosDia, m) })
  );

  /* KPIs del día: «ganancia neta» y «efectivo en caja» (lib/caja.ts) */
  const caja          = calcularCaja(pagosDia, gastosDia);
  const { totalRecibido, totalGastos } = caja;
  const totalVentas   = pedidosDia.reduce((s: number, p: any) => s + p.total, 0);

  // Cada cierre del día se recalcula sobre los movimientos de SU ventana (la misma
  // regla del ticket), para que la tarjeta y el ticket muestren siempre lo mismo.
  const cierresConCaja = cierresDia.map((cierre: any) => {
    const v = ventanaDeCierre(cierre.createdAt, cierresDia, inicio);
    return { cierre, caja: calcularCaja(enVentana(pagosDia, v), enVentana(gastosDia, v)) };
  });

  const pagosEfectivo  = pagosDia.filter((p: any) => p.metodo === "Efectivo");
  const pagosDigitales = pagosDia.filter((p: any) => ["Nequi","Daviplata","Transferencia","Tarjeta"].includes(p.metodo));

  const fechaLinkActual = isoFecha(fechaSeleccionada);
  const esHoy = sameDay(fechaSeleccionada, hoy);
  const mesVista = selB.month - 1;
  const yearVista = selB.year;
  const diasDelMesVista = new Date(yearVista, mesVista + 1, 0).getDate();
  let mesSinMovimiento = true;
  for (let dia = 1; dia <= diasDelMesVista; dia++) {
    const k = dayKey(civilBogota(yearVista, mesVista, dia));
    if ((pedidosAnoMap.get(k) ?? 0) + (salidasAnoMap.get(k) ?? 0) + (gastosAnoMap.get(k) ?? 0) > 0) {
      mesSinMovimiento = false;
      break;
    }
  }

  return (
    <div className="page-frame page-frame--wide">

      {/* ── Nivel 1 · Título, día y KPIs (una sola tarjeta) ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border-1)] px-5 py-4">
          <div>
            <p className="page-kicker text-brand-500">
              Gerente · {esHoy ? "Hoy" : "Día seleccionado"}
            </p>
            <h1 className="page-title">Panel financiero</h1>
            <p className="page-subtitle">
              {fechaLarga(fechaSeleccionada)}
            </p>
          </div>
          <form className="flex items-center gap-2">
            <DateField
              name="fecha"
              defaultValue={fechaLinkActual}
              display={fechaCorta(fechaSeleccionada)}
            />
            <button type="submit" className="sr-only">Ver día</button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
          <KpiCard label="Dinero recibido" value={money(totalRecibido)} color="green"  icon={<Banknote size={18} strokeWidth={1.75} />} />
          <KpiCard label="Ventas del día"  value={money(totalVentas)}   color="blue"   icon={<ClipboardList size={18} strokeWidth={1.75} />} />
          <KpiCard label="Gastos"          value={money(totalGastos)}   color="red"    icon={<TrendingDown size={18} strokeWidth={1.75} />} danger />
        </div>

        <div className="grid gap-3 border-t border-[color:var(--border-1)] p-4 sm:grid-cols-2">
          <KpiCard
            label="Ganancia neta del día"
            hint="Todo lo recibido menos todos los gastos, en cualquier medio de pago."
            value={money(caja.gananciaNeta)}
            color="purple"
            icon={<Shield size={18} strokeWidth={1.75} />}
            danger={caja.gananciaNeta < 0}
          />
          <KpiCard
            label="Efectivo en caja"
            hint="Efectivo recibido menos solo los gastos pagados en efectivo. Para cuadrar el cajón."
            value={money(caja.efectivoEnCaja)}
            color="green"
            icon={<Wallet size={18} strokeWidth={1.75} />}
            danger={caja.efectivoEnCaja < 0}
          />
        </div>
      </div>

      {/* ── Calendario del mes (visible, no plegado) ─────── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-1)] px-5 py-4">
          <div>
            <p className="page-kicker text-brand-500">Calendario</p>
            <h2 className="page-title !text-xl">
              {MESES[selB.month - 1]} {selB.year}
            </h2>
            <p className="page-subtitle">
              {mesSinMovimiento
                ? "Este mes aún no hay caja. Toca un día para consultarlo."
                : "Toca un día para ver su caja. Azul entra, verde sale, rojo gasto."}
            </p>
          </div>
          <div className="cal-legend">
            <span className="cal-legend__item"><span className="cal-stat cal-stat--in">1</span> Entradas</span>
            <span className="cal-legend__item"><span className="cal-stat cal-stat--out">1</span> Salidas</span>
            <span className="cal-legend__item"><span className="cal-stat cal-stat--gas">1</span> Gastos</span>
          </div>
        </div>
        <MonthCalendar
          year={selB.year}
          month={selB.month - 1}
          today={hoy}
          selected={fechaSeleccionada}
          showGastos
          hrefFor={(d) =>
            `/gerente?year=${partesBogota(d).year}&fecha=${isoFecha(d)}`
          }
          getStats={(d) => {
            const k = dayKey(d);
            return {
              entradas: pedidosAnoMap.get(k) ?? 0,
              salidas: salidasAnoMap.get(k) ?? 0,
              gastos: gastosAnoMap.get(k) ?? 0,
            };
          }}
        />
      </div>

      {/* ── Nivel 1 · Cierre de caja (acción principal) ───── */}
      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border-1)] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Acción principal</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Cierre de caja</h2>
          <p className="mt-0.5 text-sm text-[color:var(--text-3)]">
            Toma los movimientos desde el último cierre hasta ahora.
          </p>
        </div>

        <div className="p-4 sm:p-5">
        <form action={hacerCierreCaja} className="card-well grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:p-4">
          <input name="responsable" placeholder="Responsable" defaultValue="Gerente" className="input-modern" />
          <input name="observacion" placeholder="Observación opcional" className="input-modern" />
          <button className="btn-primary whitespace-nowrap">Hacer cierre</button>
        </form>

        {cierresDia.length > 0 && (
          <div className="mt-4 space-y-3">
            {cierresConCaja.map(({ cierre, caja: c }: any) => (
              <div key={cierre.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
                <div>
                  <p className="font-bold text-gray-900">Cierre #{fmt(cierre.id)}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-3)]">
                    {fechaHora(cierre.createdAt)} · {cierre.responsable || "Sin responsable"}
                  </p>
                  <p className="mt-1 text-sm font-black text-brand-500">
                    Ganancia neta: {money(c.gananciaNeta)}
                  </p>
                  <p className="text-sm font-black text-teal-600 dark:text-teal-400">
                    Efectivo en caja: {money(c.efectivoEnCaja)}
                  </p>
                </div>
                <Link href={`/cierres-caja/${cierre.id}/ticket`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600">
                  <Printer size={14} strokeWidth={2} aria-hidden="true" />
                  Imprimir ticket
                </Link>
              </div>
            ))}
          </div>
        )}

        {cierresDia.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
            No hay cierres registrados este día.
          </p>
        )}
        </div>
      </div>

      {/* ── Nivel 2 · Detalle del día ─────────────────────── */}
      <div className="card p-5">
        <p className="page-kicker">Detalle del día</p>
        <h2 className="mb-5 mt-1 text-lg font-bold text-gray-900">Facturación del día</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <PagosGrupo titulo="Efectivo" icon={<Banknote size={16} strokeWidth={1.75} />} pagos={pagosEfectivo} />
          <PagosGrupo titulo="Pagos digitales" icon={<Smartphone size={16} strokeWidth={1.75} />} pagos={pagosDigitales} />
        </div>
      </div>

      {/* ── Entradas y Salidas ───────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <MovSection title="Entradas del día" count={pedidosDia.length} color="blue">
          {pedidosDia.map((pedido: any) => (
            <PedidoRow key={pedido.id} pedido={pedido} />
          ))}
          {pedidosDia.length === 0 && <EmptyRow text="No hay entradas registradas." />}
        </MovSection>

        <MovSection title="Salidas del día" count={salidasDia.length} color="green">
          {salidasDia.map((salida: any) => (
            <PedidoRow key={`${salida.id}-${salida.pedido.id}`} pedido={salida.pedido} fechaMovimiento={salida.createdAt} />
          ))}
          {salidasDia.length === 0 && <EmptyRow text="No hay salidas registradas." />}
        </MovSection>
      </div>

      {/* ── Gastos del día ───────────────────────────────── */}
      <div className="card p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Gastos del día</h2>
          {gastosDia.length > 0 && (
            <span className="font-black text-red-500">-{money(totalGastos)}</span>
          )}
        </div>
        <div className="space-y-3">
          {gastosDia.map((gasto: any) => (
            <div key={gasto.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
              <div>
                <p className="font-bold text-gray-900">{gasto.tipo}</p>
                <p className="mt-0.5 text-sm text-gray-500">{gasto.descripcion || "Sin descripción"}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {gasto.metodo} · {gasto.responsable || "—"} ·{" "}
                  {fechaHora(gasto.createdAt)}
                </p>
              </div>
              <p className="shrink-0 font-black text-red-500">-{money(gasto.valor)}</p>
            </div>
          ))}
          {gastosDia.length === 0 && <EmptyRow text="No hay gastos registrados este día." />}
        </div>
      </div>

      {/* ── Nivel 3 · Gráficas (secundario, plegado) ─────── */}
      <details className="card overflow-hidden">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-bold text-gray-700 marker:content-none dark:text-gray-200">
          Gráficas del mes
          <span className="ml-2 text-xs font-semibold text-gray-400">secundario</span>
        </summary>
        <div className="grid gap-4 border-t border-gray-100 p-5 dark:border-white/[0.07] lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-5 dark:border-white/[0.07]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Ingresos diarios</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {fechaMesAno(hoy)}
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {diasEnMes} días
              </span>
            </div>
            <IngresosDiarios data={ingresosDiarios} />
          </div>

          <div className="rounded-xl border border-gray-100 p-5 dark:border-white/[0.07]">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pagos por método</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
                {fechaDiaMes(fechaSeleccionada)}
              </p>
            </div>
            <MetodosPago data={metodosPagoData} />
          </div>
        </div>
      </details>

      {/* ── Calendario anual ─────────────────────────────── */}
      <details className="card overflow-hidden">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-bold text-[color:var(--text-1)]">
          Calendario anual {year}
          <span className="ml-2 text-xs font-semibold text-[color:var(--text-3)]">el resto de meses</span>
        </summary>
        <div className="space-y-4 border-t border-[color:var(--border-1)] p-4">
        <div className="flex items-center gap-2 px-1">
          <YearPager year={year} hrefFor={(y) => `/gerente?year=${y}`} />
        </div>
        {MESES.map((mes, mesIndex) => {
          const esMesActual = year === hoyB.year && mesIndex === hoyB.month - 1;

          return (
            <div key={mes} className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-1)]">
              <div className={`flex items-center gap-3 border-b border-[color:var(--border-1)] px-5 py-3 ${esMesActual ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
                {esMesActual && (
                  <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">Actual</span>
                )}
                <h2 className={`font-bold ${esMesActual ? "text-brand-600 dark:text-brand-400" : "text-[color:var(--text-1)]"}`}>
                  {mes} {year}
                </h2>
              </div>
              <MonthCalendar
                year={year}
                month={mesIndex}
                today={hoy}
                selected={fechaSeleccionada}
                showGastos
                hrefFor={(d) =>
                  `/gerente?year=${year}&fecha=${isoFecha(d)}`
                }
                getStats={(d) => {
                  const k = dayKey(d);
                  return {
                    entradas: pedidosAnoMap.get(k) ?? 0,
                    salidas: salidasAnoMap.get(k) ?? 0,
                    gastos: gastosAnoMap.get(k) ?? 0,
                  };
                }}
              />
            </div>
          );
        })}
        </div>
      </details>
    </div>
  );
}

/* ── Sub-componentes ──────────────────────────────────────── */

function KpiCard({
  label, value, color, icon, danger, hint,
}: {
  label: string; value: string; color: "green" | "blue" | "red" | "purple"; icon: React.ReactNode; danger?: boolean; hint?: string;
}) {
  const palette = {
    green:  "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    red:    "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="card-well p-4">
      <div className="flex items-start gap-3">
        <div className={`icon-motion flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${palette}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[color:var(--text-3)]">{label}</p>
          <p className={`mt-0.5 text-xl font-black tabular-nums ${danger ? "text-red-500" : "text-[color:var(--text-1)]"}`}>{value}</p>
          {hint && <p className="mt-1 text-[11px] leading-snug text-[color:var(--text-3)]">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function PagosGrupo({ titulo, icon, pagos }: { titulo: string; icon: React.ReactNode; pagos: any[] }) {
  const total = pagos.reduce((s: number, p: any) => s + p.valor, 0);

  return (
    <div className="card-well">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="text-brand-500">{icon}</span>
          <h3 className="font-bold text-gray-900">{titulo}</h3>
        </div>
        <span className="font-black text-brand-500">{money(total)}</span>
      </div>
      <div className="space-y-0 divide-y divide-gray-50 p-2 dark:divide-white/[0.04]">
        {pagos.map((pago: any) => (
          <div key={pago.id} className="flex items-center justify-between rounded-lg px-3 py-3">
            <div>
              <p className="text-sm font-bold text-gray-900">
                #{fmt(pago.pedido.id)} · {pago.pedido.cliente.nombre}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {pago.metodo} · {fechaHora(pago.createdAt)}
              </p>
            </div>
            <span className="font-black text-green-600 dark:text-green-400">{money(pago.valor)}</span>
          </div>
        ))}
        {pagos.length === 0 && (
          <p className="px-3 py-4 text-sm font-medium text-gray-400">No hay pagos registrados.</p>
        )}
      </div>
    </div>
  );
}

function MovSection({
  title, count, color, children,
}: {
  title: string; count: number; color: "blue" | "green"; children: React.ReactNode;
}) {
  const badge = {
    blue:  "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  }[color];

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PedidoRow({ pedido, fechaMovimiento }: { pedido: any; fechaMovimiento?: Date }) {
  const abonado     = pedido.pagos.reduce((s: number, p: any) => s + p.valor, 0);
  const totalPrendas = pedido.prendas.reduce((s: number, pr: any) => s + pr.cantidad, 0);
  const saldo       = pedido.total - abonado;

  return (
    <details className="group rounded-xl border border-gray-100 dark:border-white/[0.07]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5">
        <div>
          <p className="font-bold text-gray-900">
            <PedidoLink id={pedido.id} />
            {" · "}{pedido.cliente.nombre}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {totalPrendas} prendas · {money(pedido.total)} ·{" "}
            {fechaHora(fechaMovimiento || pedido.createdAt)}
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400 transition duration-200 group-open:rotate-180">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-white/[0.07]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 py-2.5 dark:bg-white/5">
            <p className="text-xs text-gray-400">Total</p>
            <p className="mt-0.5 font-black text-gray-900">{money(pedido.total)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2.5 dark:bg-white/5">
            <p className="text-xs text-gray-400">Abonado</p>
            <p className="mt-0.5 font-black text-green-600">{money(abonado)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2.5 dark:bg-white/5">
            <p className="text-xs text-gray-400">Saldo</p>
            <p className={`mt-0.5 font-black ${saldo > 0 ? "text-red-500" : "text-green-600"}`}>{money(saldo)}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {pedido.prendas.map((prenda: any) => (
            <div key={prenda.id} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-white/[0.07]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{prenda.tipo} <span className="font-normal text-gray-400">×{prenda.cantidad}</span></span>
                <span className="font-bold text-brand-500">{money(prenda.valor)}</span>
              </div>
              <p className="text-xs text-gray-400">{prenda.servicio}</p>
              {prenda.descripcion && (
                <p className="mt-1.5 flex items-start gap-1.5 rounded bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                  <TriangleAlert size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {prenda.descripcion}
                </p>
              )}
            </div>
          ))}
        </div>

        {pedido.pagos.length > 0 && (
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 dark:bg-blue-500/10">
            <p className="mb-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">Pagos</p>
            {pedido.pagos.map((pago: any) => (
              <p key={pago.id} className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {money(pago.valor)} · {pago.metodo} · {fechaHora(pago.createdAt)}
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm font-semibold text-gray-400 dark:border-white/10">
      {text}
    </p>
  );
}
