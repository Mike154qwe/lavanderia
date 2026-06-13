import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import IngresosDiarios from "@/components/charts/IngresosDiarios";
import MetodosPago from "@/components/charts/MetodosPago";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { money, fmt } from "@/lib/format";
import PedidoLink from "@/components/PedidoLink";

export const metadata: Metadata = { title: "Gerente" };

function inicioDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}
function finDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function sumarMetodo(pagos: any[], metodo: string) {
  return pagos.filter((p) => p.metodo === metodo).reduce((s, p) => s + p.valor, 0);
}
/** Clave única por día: "YYYY-M-D" */
function dayKey(d: Date): string {
  const dd = new Date(d);
  return `${dd.getFullYear()}-${dd.getMonth()}-${dd.getDate()}`;
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

  const efectivo      = sumarMetodo(pagos, "Efectivo");
  const nequi         = sumarMetodo(pagos, "Nequi");
  const daviplata     = sumarMetodo(pagos, "Daviplata");
  const transferencia = sumarMetodo(pagos, "Transferencia");
  const tarjeta       = sumarMetodo(pagos, "Tarjeta");
  const totalGastos   = gastos.reduce((s: number, g: any) => s + g.valor, 0);
  const totalCaja     = efectivo + nequi + daviplata + transferencia + tarjeta - totalGastos;

  const cierre = await prisma.cierreCaja.create({
    data: { efectivo, nequi, daviplata, transferencia, tarjeta, gastos: totalGastos, totalCaja, responsable, observacion: observacion || null },
  });

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
  const year   = Number(params.year || hoy.getFullYear());

  const fechaSeleccionada = params.fecha
    ? new Date(params.fecha + "T00:00:00")
    : inicioDia(hoy);

  const inicio = inicioDia(fechaSeleccionada);
  const fin    = finDia(fechaSeleccionada);
  const inicioAno = new Date(year, 0, 1);
  const finAno    = new Date(year + 1, 0, 1);

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
        where: { createdAt: { gte: inicioAno, lt: finAno } },
        select: { id: true, createdAt: true },
      }),
      prisma.historialEstado.findMany({
        where: { estado: "ENTREGADO", createdAt: { gte: inicioAno, lt: finAno } },
        select: { createdAt: true },
      }),
      prisma.gastoCaja.findMany({
        where: { createdAt: { gte: inicioAno, lt: finAno } },
        select: { createdAt: true },
      }),
    ]);

  /* Charts */
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const pagosMes = await prisma.pago.findMany({
    where: { createdAt: { gte: inicioMes } },
    select: { valor: true, createdAt: true },
  });

  // Agregar en Map<día_del_mes, total> — O(n) en vez de O(n×días)
  const pagosMesMap = new Map<number, number>();
  for (const p of pagosMes) {
    const d = new Date(p.createdAt).getDate();
    pagosMesMap.set(d, (pagosMesMap.get(d) ?? 0) + (p.valor as number));
  }

  const diasEnMes       = hoy.getDate();
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

  /* KPIs del día */
  const efectivo      = sumarMetodo(pagosDia, "Efectivo");
  const nequi         = sumarMetodo(pagosDia, "Nequi");
  const daviplata     = sumarMetodo(pagosDia, "Daviplata");
  const transferencia = sumarMetodo(pagosDia, "Transferencia");
  const tarjeta       = sumarMetodo(pagosDia, "Tarjeta");
  const totalRecibido = efectivo + nequi + daviplata + transferencia + tarjeta;
  const totalGastos   = gastosDia.reduce((s: number, g: any) => s + g.valor, 0);
  const totalVentas   = pedidosDia.reduce((s: number, p: any) => s + p.total, 0);
  const cajaEsperada  = totalRecibido - totalGastos;

  const pagosEfectivo  = pagosDia.filter((p: any) => p.metodo === "Efectivo");
  const pagosDigitales = pagosDia.filter((p: any) => ["Nequi","Daviplata","Transferencia","Tarjeta"].includes(p.metodo));

  const fechaLinkActual = `${fechaSeleccionada.getFullYear()}-${String(fechaSeleccionada.getMonth() + 1).padStart(2,"0")}-${String(fechaSeleccionada.getDate()).padStart(2,"0")}`;
  const esHoy = sameDay(fechaSeleccionada, hoy);

  return (
    <div className="space-y-5 p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Gerente</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900">Panel financiero</h1>
            <p className="mt-1 text-sm text-gray-500">
              Cierres de caja, pagos por método, entradas y salidas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/gerente?year=${year - 1}`} className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
              ← {year - 1}
            </Link>
            <span className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-black text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {year}
            </span>
            <Link href={`/gerente?year=${year + 1}`} className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
              {year + 1} →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Día seleccionado ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-white/[0.07]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
              {esHoy ? "Hoy" : "Día seleccionado"}
            </p>
            <h2 className="mt-1 text-xl font-black capitalize text-gray-900">
              {fechaSeleccionada.toLocaleDateString("es-CO", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </h2>
          </div>
          <form className="flex gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={fechaLinkActual}
              className="input-modern w-auto"
            />
            <input type="hidden" name="year" value={year} />
            <button className="btn-primary whitespace-nowrap">Ver día</button>
          </form>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/[0.07] md:grid-cols-4 md:divide-y-0">
          <KpiCard label="Dinero recibido" value={money(totalRecibido)} color="green"  icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <KpiCard label="Ventas del día"  value={money(totalVentas)}   color="blue"   icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          <KpiCard label="Gastos"          value={money(totalGastos)}   color="red"    icon="M17 7 7 17M7 7l10 10" danger />
          <KpiCard label="Caja esperada"   value={money(cajaEsperada)}  color="purple" icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-5 dark:border-white/[0.07]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Ingresos diarios</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {new Date(hoy.getFullYear(), hoy.getMonth()).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
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
                {fechaSeleccionada.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
              </p>
            </div>
            <MetodosPago data={metodosPagoData} />
          </div>
        </div>
      </div>

      {/* ── Facturación del día ───────────────────────────── */}
      <div className="card p-6">
        <h2 className="mb-5 text-lg font-black text-gray-900">Facturación del día</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <PagosGrupo titulo="Efectivo" icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" pagos={pagosEfectivo} />
          <PagosGrupo titulo="Pagos digitales" icon="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M18 14l4 4-4 4" pagos={pagosDigitales} />
        </div>
      </div>

      {/* ── Cierre de caja ───────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Cierre de caja</h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Toma los movimientos desde el último cierre hasta ahora.
            </p>
          </div>
        </div>

        <form action={hacerCierreCaja} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="responsable" placeholder="Responsable" defaultValue="Gerente" className="input-modern" />
          <input name="observacion" placeholder="Observación opcional" className="input-modern" />
          <button className="btn-dark whitespace-nowrap">Hacer cierre →</button>
        </form>

        {cierresDia.length > 0 && (
          <div className="mt-4 space-y-3">
            {cierresDia.map((cierre: any) => (
              <div key={cierre.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
                <div>
                  <p className="font-black text-gray-900">Cierre #{fmt(cierre.id)}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {cierre.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · {cierre.responsable || "Sin responsable"}
                  </p>
                  <p className="mt-1 text-sm font-black text-brand-500">
                    Total caja: {money(cierre.totalCaja)}
                  </p>
                </div>
                <Link href={`/cierres-caja/${cierre.id}/ticket`} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
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
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Gastos del día</h2>
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
                  {gasto.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="shrink-0 font-black text-red-500">-{money(gasto.valor)}</p>
            </div>
          ))}
          {gastosDia.length === 0 && <EmptyRow text="No hay gastos registrados este día." />}
        </div>
      </div>

      {/* ── Calendario anual ─────────────────────────────── */}
      <div className="space-y-4">
        {MESES.map((mes, mesIndex) => {
          const diasDelMes = new Date(year, mesIndex + 1, 0).getDate();
          const esMesActual = year === hoy.getFullYear() && mesIndex === hoy.getMonth();

          return (
            <div key={mes} className="card overflow-hidden">
              <div className={`flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-white/[0.07] ${esMesActual ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}>
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
                  const seleccionado = sameDay(fechaSeleccionada, fecha);
                  const esHoyFlag    = sameDay(fecha, hoy);
                  const k        = dayKey(fecha);
                  const entradas = pedidosAnoMap.get(k) ?? 0;
                  const salidas  = salidasAnoMap.get(k) ?? 0;
                  const gastos   = gastosAnoMap.get(k)  ?? 0;
                  const activo       = entradas > 0 || salidas > 0 || gastos > 0;
                  const fechaLink    = `${year}-${String(mesIndex + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

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
                      href={`/gerente?year=${year}&fecha=${fechaLink}`}
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
                          {gastos   > 0 && <p className="text-[10px] font-bold text-red-500">💸 {gastos}</p>}
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
  label, value, color, icon, danger,
}: {
  label: string; value: string; color: "green" | "blue" | "red" | "purple"; icon: string; danger?: boolean;
}) {
  const palette = {
    green:  "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    red:    "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="p-5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${palette}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 h-[18px] w-[18px]">
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <p className={`text-2xl font-black ${danger ? "text-red-500" : "text-gray-900"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  );
}

function PagosGrupo({ titulo, icon, pagos }: { titulo: string; icon: string; pagos: any[] }) {
  const total = pagos.reduce((s: number, p: any) => s + p.valor, 0);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/[0.07]">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-500">
            {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
          </svg>
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
                {pago.metodo} · {pago.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
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
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-gray-900">{title}</h2>
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
            {(fechaMovimiento || pedido.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
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
                <p className="mt-1.5 rounded bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                  ⚠️ {prenda.descripcion}
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
                {money(pago.valor)} · {pago.metodo} · {pago.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
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
