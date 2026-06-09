import Link from "next/link";
import { prisma } from "@/lib/prisma";
import IngresosDiarios from "@/components/charts/IngresosDiarios";
import MetodosPago from "@/components/charts/MetodosPago";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function inicioDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function finDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sumarMetodo(pagos: any[], metodo: string) {
  return pagos
    .filter((pago) => pago.metodo === metodo)
    .reduce((sum, pago) => sum + pago.valor, 0);
}

async function hacerCierreCaja(formData: FormData) {
  "use server";

  const responsable = String(formData.get("responsable") || "Gerente").trim();
  const observacion = String(formData.get("observacion") || "").trim();

  const ahora = new Date();
  const inicioHoy = inicioDia(ahora);
  const finHoy = finDia(ahora);

  const ultimoCierre: any = await (prisma as any).cierreCaja.findFirst({
    where: {
      createdAt: {
        gte: inicioHoy,
        lt: finHoy,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const desde = ultimoCierre ? ultimoCierre.createdAt : inicioHoy;

  const pagos: any[] = await (prisma as any).pago.findMany({
    where: {
      createdAt: {
        gt: desde,
        lte: ahora,
      },
    },
  });

  const gastos: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gt: desde,
        lte: ahora,
      },
    },
  });

  const efectivo = sumarMetodo(pagos, "Efectivo");
  const nequi = sumarMetodo(pagos, "Nequi");
  const daviplata = sumarMetodo(pagos, "Daviplata");
  const transferencia = sumarMetodo(pagos, "Transferencia");
  const tarjeta = sumarMetodo(pagos, "Tarjeta");

  const totalGastos = gastos.reduce(
    (sum: number, gasto: any) => sum + gasto.valor,
    0
  );

  const totalCaja =
    efectivo + nequi + daviplata + transferencia + tarjeta - totalGastos;

  const cierre: any = await (prisma as any).cierreCaja.create({
    data: {
      efectivo,
      nequi,
      daviplata,
      transferencia,
      tarjeta,
      gastos: totalGastos,
      totalCaja,
      responsable,
      observacion: observacion || null,
    },
  });

  revalidatePath("/gerente");

  redirect(`/cierres-caja/${cierre.id}/ticket`);
}

export default async function GerentePage({
  searchParams,
}: {
  searchParams?: Promise<{ fecha?: string; year?: string }>;
}) {
  const params = searchParams ? await searchParams : {};

  const hoy = new Date();
  const year = Number(params.year || hoy.getFullYear());

  const fechaSeleccionada = params.fecha
    ? new Date(params.fecha + "T00:00:00")
    : inicioDia(hoy);

  const inicio = inicioDia(fechaSeleccionada);
  const fin = finDia(fechaSeleccionada);

  const inicioAno = new Date(year, 0, 1);
  const finAno = new Date(year + 1, 0, 1);

  const pedidosDia: any[] = await (prisma as any).pedido.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    include: {
      cliente: true,
      prendas: true,
      pagos: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pagosDia: any[] = await (prisma as any).pago.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    include: {
      pedido: {
        include: {
          cliente: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const gastosDia: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const salidasDia: any[] = await (prisma as any).historialEstado.findMany({
    where: {
      estado: "ENTREGADO",
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    include: {
      pedido: {
        include: {
          cliente: true,
          prendas: true,
          pagos: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const cierresDia: any[] = await (prisma as any).cierreCaja.findMany({
    where: {
      createdAt: {
        gte: inicio,
        lt: fin,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pedidosAno: any[] = await (prisma as any).pedido.findMany({
    where: {
      createdAt: {
        gte: inicioAno,
        lt: finAno,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  const salidasAno: any[] = await (prisma as any).historialEstado.findMany({
    where: {
      estado: "ENTREGADO",
      createdAt: {
        gte: inicioAno,
        lt: finAno,
      },
    },
    select: {
      createdAt: true,
    },
  });

  const gastosAno: any[] = await (prisma as any).gastoCaja.findMany({
    where: {
      createdAt: {
        gte: inicioAno,
        lt: finAno,
      },
    },
    select: {
      createdAt: true,
    },
  });

  // Pagos del mes actual para la gráfica de ingresos diarios
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const pagosMes: any[] = await (prisma as any).pago.findMany({
    where: {
      createdAt: {
        gte: inicioMes,
        lt: finAno,
      },
    },
    select: {
      valor: true,
      createdAt: true,
    },
  });

  const diasEnMes = hoy.getDate();
  const ingresosDiarios = Array.from({ length: diasEnMes }, (_, i) => {
    const dia = i + 1;
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
    const total = pagosMes
      .filter((p: any) => sameDay(p.createdAt, fecha))
      .reduce((s: number, p: any) => s + p.valor, 0);
    return { dia: String(dia), total };
  });

  const metodosPagoData = ["Efectivo", "Nequi", "Daviplata", "Transferencia", "Tarjeta"].map(
    (m) => ({ metodo: m, total: sumarMetodo(pagosDia, m) })
  );

  const efectivo = sumarMetodo(pagosDia, "Efectivo");
  const nequi = sumarMetodo(pagosDia, "Nequi");
  const daviplata = sumarMetodo(pagosDia, "Daviplata");
  const transferencia = sumarMetodo(pagosDia, "Transferencia");
  const tarjeta = sumarMetodo(pagosDia, "Tarjeta");

  const totalRecibido = efectivo + nequi + daviplata + transferencia + tarjeta;

  const totalGastos = gastosDia.reduce(
    (sum: number, gasto: any) => sum + gasto.valor,
    0
  );

  const totalVentas = pedidosDia.reduce(
    (sum: number, pedido: any) => sum + pedido.total,
    0
  );

  const cajaEsperada = totalRecibido - totalGastos;

  const pagosEfectivo = pagosDia.filter((pago) => pago.metodo === "Efectivo");
  const pagosDigitales = pagosDia.filter((pago) =>
    ["Nequi", "Daviplata", "Transferencia", "Tarjeta"].includes(pago.metodo)
  );

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const fechaLinkActual = `${fechaSeleccionada.getFullYear()}-${String(
    fechaSeleccionada.getMonth() + 1
  ).padStart(2, "0")}-${String(fechaSeleccionada.getDate()).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-8">
        <div className="card p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-lg font-black text-teal-600">Finanzas</p>

              <h1 className="mt-2 text-5xl font-black text-slate-900">
                Panel financiero
              </h1>

              <p className="mt-3 text-xl text-slate-500">
                Cierres de caja por turnos, pagos por método, entradas, salidas
                y gastos.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/gerente?year=${year - 1}`}
                className="rounded-3xl bg-slate-900 px-6 py-4 text-xl font-black text-white"
              >
                ← {year - 1}
              </Link>

              <Link
                href={`/gerente?year=${year + 1}`}
                className="rounded-3xl bg-teal-500 px-6 py-4 text-xl font-black text-white"
              >
                {year + 1} →
              </Link>
            </div>
          </div>
        </div>

        <section className="card mt-8 p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-lg font-black text-teal-600">
                Día seleccionado
              </p>

              <h2 className="mt-2 text-4xl font-black text-slate-900">
                {fechaSeleccionada.toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
            </div>

            <form className="flex gap-3">
              <input
                type="date"
                name="fecha"
                defaultValue={fechaLinkActual}
                className="rounded-3xl border p-4 text-xl font-black"
              />

              <input type="hidden" name="year" value={year} />

              <button className="rounded-3xl bg-teal-500 px-6 py-4 text-xl font-black text-white">
                Ver día
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <Kpi title="Dinero recibido" value={money(totalRecibido)} icon="💵" />
            <Kpi title="Ventas del día" value={money(totalVentas)} icon="🧾" />
            <Kpi title="Gastos" value={money(totalGastos)} icon="📉" danger />
            <Kpi title="Caja esperada" value={money(cajaEsperada)} icon="🔒" />
          </div>

          {/* Gráficas */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Ingresos diarios
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-600">
                    {new Date(hoy.getFullYear(), hoy.getMonth()).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">
                  {diasEnMes} días
                </span>
              </div>
              <IngresosDiarios data={ingresosDiarios} />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Pagos del día por método
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-600">
                  {fechaSeleccionada.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
                </p>
              </div>
              <MetodosPago data={metodosPagoData} />
            </div>
          </div>
        </section>

        <section className="card mt-8 p-8">
          <h2 className="text-4xl font-black text-slate-900">
            🧾 Facturación del día
          </h2>

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <PagosGrupo titulo="Pagos en efectivo" icono="💵" pagos={pagosEfectivo} />
            <PagosGrupo titulo="Pagos digitales" icono="📱" pagos={pagosDigitales} />
          </div>
        </section>

        <section className="card mt-8 p-8">
          <h2 className="text-4xl font-black text-slate-900">
            🔒 Cierre de caja
          </h2>

          <p className="mt-2 text-xl text-slate-500">
            Cada cierre toma únicamente los movimientos desde el último cierre
            hasta este momento.
          </p>

          <form
            action={hacerCierreCaja}
            className="mt-8 grid gap-5 md:grid-cols-[1fr_1fr_260px]"
          >
            <input
              name="responsable"
              placeholder="Responsable"
              defaultValue="Gerente"
              className="rounded-3xl border p-5 text-xl font-black"
            />

            <input
              name="observacion"
              placeholder="Observación opcional"
              className="rounded-3xl border p-5 text-xl font-black"
            />

            <button className="rounded-3xl bg-slate-900 px-6 py-5 text-xl font-black text-white">
              Hacer cierre
            </button>
          </form>

          <div className="mt-8 space-y-4">
            {cierresDia.map((cierre) => (
              <div
                key={cierre.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-slate-50 p-5"
              >
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    Cierre #{String(cierre.id).padStart(5, "0")}
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {cierre.createdAt.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {cierre.responsable || "Sin responsable"}
                  </p>

                  <p className="mt-1 text-xl font-black text-teal-600">
                    Total caja: {money(cierre.totalCaja)}
                  </p>
                </div>

                <Link
                  href={`/cierres-caja/${cierre.id}/ticket`}
                  className="rounded-3xl bg-teal-500 px-6 py-4 text-xl font-black text-white"
                >
                  🧾 Imprimir ticket
                </Link>
              </div>
            ))}

            {cierresDia.length === 0 && (
              <div className="rounded-3xl border border-dashed p-8 text-center text-xl font-bold text-slate-400">
                No hay cierres registrados este día.
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="card p-8">
            <h2 className="text-4xl font-black text-slate-900">
              📥 Entradas del día
            </h2>

            <div className="mt-6 space-y-4">
              {pedidosDia.map((pedido) => (
                <PedidoCard key={pedido.id} pedido={pedido} tipo="Entrada" />
              ))}

              {pedidosDia.length === 0 && (
                <Empty text="No hay entradas registradas." />
              )}
            </div>
          </section>

          <section className="card p-8">
            <h2 className="text-4xl font-black text-slate-900">
              📤 Salidas del día
            </h2>

            <div className="mt-6 space-y-4">
              {salidasDia.map((salida) => (
                <PedidoCard
                  key={`${salida.id}-${salida.pedido.id}`}
                  pedido={salida.pedido}
                  tipo="Salida"
                  fechaMovimiento={salida.createdAt}
                />
              ))}

              {salidasDia.length === 0 && (
                <Empty text="No hay salidas registradas." />
              )}
            </div>
          </section>
        </div>

        <section className="card mt-8 p-8">
          <h2 className="text-4xl font-black text-slate-900">
            💸 Gastos del día
          </h2>

          <div className="mt-6 space-y-4">
            {gastosDia.map((gasto) => (
              <div key={gasto.id} className="rounded-3xl border bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-black text-slate-900">
                      {gasto.tipo}
                    </p>

                    <p className="mt-1 text-lg text-slate-500">
                      {gasto.descripcion || "Sin descripción"}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-400">
                      {gasto.metodo} · {gasto.responsable || "Sin responsable"} ·{" "}
                      {gasto.createdAt.toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <p className="text-2xl font-black text-red-600">
                    -{money(gasto.valor)}
                  </p>
                </div>
              </div>
            ))}

            {gastosDia.length === 0 && (
              <Empty text="No hay gastos registrados este día." />
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-8">
          {meses.map((mes, mesIndex) => {
            const diasDelMes = new Date(year, mesIndex + 1, 0).getDate();

            return (
              <div key={mes} className="card p-8">
                <h2 className="text-4xl font-black text-slate-900">{mes}</h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
                  {Array.from({ length: diasDelMes }).map((_, index) => {
                    const dia = index + 1;
                    const fecha = new Date(year, mesIndex, dia);

                    const entradasDia = pedidosAno.filter((pedido) =>
                      sameDay(pedido.createdAt, fecha)
                    );

                    const salidasDiaFiltro = salidasAno.filter((salida) =>
                      sameDay(salida.createdAt, fecha)
                    );

                    const gastosDiaFiltro = gastosAno.filter((gasto) =>
                      sameDay(gasto.createdAt, fecha)
                    );

                    const fechaLink = `${year}-${String(mesIndex + 1).padStart(
                      2,
                      "0"
                    )}-${String(dia).padStart(2, "0")}`;

                    const activo =
                      entradasDia.length > 0 ||
                      salidasDiaFiltro.length > 0 ||
                      gastosDiaFiltro.length > 0;

                    const seleccionado = sameDay(fechaSeleccionada, fecha);
                    const esHoy = sameDay(fecha, hoy);

                    return (
                      <Link
                        key={dia}
                        id={esHoy ? "hoy" : undefined}
                        href={`/gerente?year=${year}&fecha=${fechaLink}`}
                        className={`rounded-3xl border p-5 transition hover:-translate-y-1 hover:shadow-soft ${
                          seleccionado
                            ? "border-purple-400 bg-purple-50"
                            : esHoy
                            ? "border-orange-400 bg-orange-50"
                            : activo
                            ? "border-teal-300 bg-teal-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-3xl font-black text-slate-900">
                            {dia}
                          </p>
                          {esHoy && (
                            <span className="rounded-full bg-orange-400 px-2 py-0.5 text-xs font-black text-white">
                              HOY
                            </span>
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-teal-700">
                            📥 {entradasDia.length}
                          </p>

                          <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-emerald-700">
                            📤 {salidasDiaFiltro.length}
                          </p>

                          <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-red-700">
                            💸 {gastosDiaFiltro.length}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}

function PagosGrupo({
  titulo,
  icono,
  pagos,
}: {
  titulo: string;
  icono: string;
  pagos: any[];
}) {
  const total = pagos.reduce((sum, pago) => sum + pago.valor, 0);

  return (
    <div className="rounded-3xl border bg-slate-50 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-slate-900">
          {icono} {titulo}
        </h3>

        <p className="text-3xl font-black text-teal-600">{money(total)}</p>
      </div>

      <div className="mt-5 space-y-3">
        {pagos.map((pago) => (
          <div key={pago.id} className="rounded-2xl bg-white p-4">
            <p className="text-xl font-black text-slate-900">
              Recibo #{formatPedido(pago.pedido.id)} ·{" "}
              {pago.pedido.cliente.nombre}
            </p>

            <p className="mt-1 text-lg font-black text-teal-600">
              {money(pago.valor)} · {pago.metodo}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-400">
              {pago.createdAt.toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}

        {pagos.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-lg font-bold text-slate-400">
            No hay pagos registrados.
          </p>
        )}
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  icon,
  danger,
}: {
  title: string;
  value: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-6">
      <p className="text-5xl">{icon}</p>
      <p className="mt-4 text-sm font-black text-slate-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Metodo({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <p className="text-4xl">{icon}</p>
      <p className="mt-3 text-sm font-black text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">
        {money(value)}
      </p>
    </div>
  );
}

function PedidoCard({
  pedido,
  tipo,
  fechaMovimiento,
}: {
  pedido: any;
  tipo: string;
  fechaMovimiento?: Date;
}) {
  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const totalPrendas = pedido.prendas.reduce(
    (sum: number, prenda: any) => sum + prenda.cantidad,
    0
  );

  return (
    <details className="rounded-3xl border bg-slate-50 p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-black text-slate-900">
              #{formatPedido(pedido.id)} · {pedido.cliente.nombre}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {totalPrendas} prendas · {money(pedido.total)} ·{" "}
              {(fechaMovimiento || pedido.createdAt).toLocaleTimeString(
                "es-CO",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </p>
          </div>

          <span className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">
            Ver detalles
          </span>
        </div>
      </summary>

      <div className="mt-5 border-t pt-5">
        <p className="text-lg font-bold text-slate-600">
          Tel: {pedido.cliente.telefono || "No registrado"}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Mini label="Total" value={money(pedido.total)} />
          <Mini label="Abonado" value={money(abonado)} />
          <Mini label="Saldo" value={money(pedido.total - abonado)} />
        </div>

        <div className="mt-5 space-y-3">
          {pedido.prendas.map((prenda: any) => (
            <div key={prenda.id} className="rounded-2xl bg-white p-4">
              <p className="font-black text-slate-900">
                {prenda.tipo} x {prenda.cantidad}
              </p>

              <p className="font-bold text-teal-600">
                {prenda.servicio} · {money(prenda.valor)}
              </p>

              {prenda.descripcion && (
                <p className="mt-2 rounded-xl bg-orange-100 p-3 text-sm font-bold text-orange-700">
                  ⚠️ {prenda.descripcion}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-blue-50 p-4">
          <p className="font-black text-slate-900">Pagos</p>

          <div className="mt-3 space-y-2">
            {pedido.pagos.map((pago: any) => (
              <p key={pago.id} className="font-bold text-blue-700">
                {money(pago.valor)} · {pago.metodo} ·{" "}
                {pago.createdAt.toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ))}

            {pedido.pagos.length === 0 && (
              <p className="font-bold text-red-600">Sin abonos</p>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed p-8 text-center text-xl font-bold text-slate-400">
      {text}
    </div>
  );
}