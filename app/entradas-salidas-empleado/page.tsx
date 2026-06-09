import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

function coincidePedido(pedido: any, q: string) {
  if (!q) return true;

  const query = normalizar(q);
  const id = String(pedido.id);
  const idFormateado = formatPedido(pedido.id);
  const nombre = normalizar(pedido.cliente?.nombre || "");
  const telefono = normalizar(pedido.cliente?.telefono || "");

  return (
    id.includes(query) ||
    idFormateado.includes(query) ||
    nombre.includes(query) ||
    telefono.includes(query)
  );
}

export default async function EntradasSalidasEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{
    fecha?: string;
    year?: string;
    q?: string;
    tipo?: string;
  }>;
}) {
  const params = await searchParams;

  const hoy = new Date();
  const year = Number(params.year || hoy.getFullYear());
  const q = params.q?.trim() || "";
  const tipoFiltro = params.tipo || "todos";

  const fechaSeleccionada = params.fecha
    ? new Date(params.fecha + "T00:00:00")
    : null;

  const inicioAno = new Date(year, 0, 1);
  const finAno = new Date(year + 1, 0, 1);

  const pedidosAnoRaw: any[] = await (prisma as any).pedido.findMany({
    where: {
      createdAt: {
        gte: inicioAno,
        lt: finAno,
      },
    },
    include: {
      cliente: true,
      prendas: true,
      pagos: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const salidasAnoRaw: any[] = await (prisma as any).historialEstado.findMany({
    where: {
      estado: "ENTREGADO",
      createdAt: {
        gte: inicioAno,
        lt: finAno,
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
      createdAt: "asc",
    },
  });

  const pedidosAno = pedidosAnoRaw.filter((pedido) => coincidePedido(pedido, q));

  const salidasAno = salidasAnoRaw.filter((salida) =>
    coincidePedido(salida.pedido, q)
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

  const entradasSeleccionadas =
    fechaSeleccionada && tipoFiltro !== "salidas"
      ? pedidosAno.filter((pedido: any) =>
          sameDay(pedido.createdAt, fechaSeleccionada)
        )
      : [];

  const salidasSeleccionadas =
    fechaSeleccionada && tipoFiltro !== "entradas"
      ? salidasAno.filter((salida: any) =>
          sameDay(salida.createdAt, fechaSeleccionada)
        )
      : [];

  const totalEntradasAno = pedidosAno.length;
  const totalSalidasAno = salidasAno.length;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="p-8">
        <div className="card p-8">
          <p className="text-lg font-black text-teal-600">
            Entradas y salidas
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="text-5xl font-black text-slate-900">
                Calendario del año {year}
              </h1>

              <p className="mt-3 text-xl text-slate-500">
                Filtra por recibo, cliente, teléfono, entradas o salidas.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/entradas-salidas-empleado?year=${year - 1}&q=${q}&tipo=${tipoFiltro}`}
                className="rounded-3xl bg-slate-900 px-6 py-4 text-xl font-black text-white"
              >
                ← {year - 1}
              </Link>

              <Link
                href={`/entradas-salidas-empleado?year=${year + 1}&q=${q}&tipo=${tipoFiltro}`}
                className="rounded-3xl bg-teal-500 px-6 py-4 text-xl font-black text-white"
              >
                {year + 1} →
              </Link>
            </div>
          </div>

          <form className="mt-8 grid gap-4 xl:grid-cols-[1fr_220px_180px_180px]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar recibo, cliente o teléfono"
              className="rounded-3xl border p-5 text-2xl font-black"
            />

            <select
              name="tipo"
              defaultValue={tipoFiltro}
              className="rounded-3xl border p-5 text-xl font-black"
            >
              <option value="todos">Todos</option>
              <option value="entradas">Solo entradas</option>
              <option value="salidas">Solo salidas</option>
            </select>

            <input
              name="year"
              type="number"
              defaultValue={year}
              className="rounded-3xl border p-5 text-xl font-black"
            />

            <button className="rounded-3xl bg-teal-500 px-6 py-5 text-xl font-black text-white">
              Filtrar
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/entradas-salidas-empleado"
              className="rounded-3xl bg-slate-200 px-6 py-4 text-lg font-black text-slate-700"
            >
              Limpiar filtros
            </Link>

            <div className="rounded-3xl bg-teal-50 px-6 py-4 text-lg font-black text-teal-700">
              📥 Entradas encontradas: {totalEntradasAno}
            </div>

            <div className="rounded-3xl bg-emerald-50 px-6 py-4 text-lg font-black text-emerald-700">
              📤 Salidas encontradas: {totalSalidasAno}
            </div>
          </div>
        </div>

        {fechaSeleccionada && (
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

              <Link
                href={`/entradas-salidas-empleado?year=${year}&q=${q}&tipo=${tipoFiltro}`}
                className="rounded-3xl bg-slate-200 px-6 py-4 text-xl font-black text-slate-700"
              >
                Cerrar detalle
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-4">
              <Kpi
                title="Entradas"
                value={entradasSeleccionadas.length}
                icon="📥"
              />

              <Kpi
                title="Salidas"
                value={salidasSeleccionadas.length}
                icon="📤"
              />

              <Kpi
                title="Prendas recibidas"
                value={entradasSeleccionadas.reduce(
                  (sum: number, pedido: any) =>
                    sum +
                    pedido.prendas.reduce(
                      (s: number, prenda: any) => s + prenda.cantidad,
                      0
                    ),
                  0
                )}
                icon="👕"
              />

              <Kpi
                title="Dinero recibido"
                value={entradasSeleccionadas.reduce(
                  (sum: number, pedido: any) =>
                    sum +
                    pedido.pagos.reduce(
                      (s: number, pago: any) => s + pago.valor,
                      0
                    ),
                  0
                )}
                icon="💵"
                moneyValue
              />
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-2">
              {tipoFiltro !== "salidas" && (
                <section className="rounded-3xl border bg-slate-50 p-6">
                  <h3 className="text-4xl font-black text-slate-900">
                    📥 Entradas del día
                  </h3>

                  <div className="mt-6 space-y-4">
                    {entradasSeleccionadas.map((pedido: any) => (
                      <PedidoDetalle
                        key={`entrada-${pedido.id}`}
                        pedido={pedido}
                        tipo="Entrada"
                      />
                    ))}

                    {entradasSeleccionadas.length === 0 && (
                      <Empty text="No hubo entradas con estos filtros." />
                    )}
                  </div>
                </section>
              )}

              {tipoFiltro !== "entradas" && (
                <section className="rounded-3xl border bg-slate-50 p-6">
                  <h3 className="text-4xl font-black text-slate-900">
                    📤 Salidas del día
                  </h3>

                  <div className="mt-6 space-y-4">
                    {salidasSeleccionadas.map((salida: any) => (
                      <PedidoDetalle
                        key={`salida-${salida.id}-${salida.pedido.id}`}
                        pedido={salida.pedido}
                        tipo="Salida"
                        fechaMovimiento={salida.createdAt}
                      />
                    ))}

                    {salidasSeleccionadas.length === 0 && (
                      <Empty text="No hubo salidas con estos filtros." />
                    )}
                  </div>
                </section>
              )}
            </div>
          </section>
        )}

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

                    const entradasDia =
                      tipoFiltro !== "salidas"
                        ? pedidosAno.filter((pedido: any) =>
                            sameDay(pedido.createdAt, fecha)
                          )
                        : [];

                    const salidasDia =
                      tipoFiltro !== "entradas"
                        ? salidasAno.filter((salida: any) =>
                            sameDay(salida.createdAt, fecha)
                          )
                        : [];

                    const fechaLink = `${year}-${String(mesIndex + 1).padStart(
                      2,
                      "0"
                    )}-${String(dia).padStart(2, "0")}`;

                    const activo =
                      entradasDia.length > 0 || salidasDia.length > 0;

                    const seleccionado =
                      fechaSeleccionada && sameDay(fechaSeleccionada, fecha);

                    const esHoy = sameDay(fecha, hoy);

                    return (
                      <Link
                        key={dia}
                        id={esHoy ? "hoy" : undefined}
                        href={`/entradas-salidas-empleado?year=${year}&fecha=${fechaLink}&q=${q}&tipo=${tipoFiltro}`}
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
                          {tipoFiltro !== "salidas" && (
                            <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-teal-700">
                              📥 Entradas: {entradasDia.length}
                            </p>
                          )}

                          {tipoFiltro !== "entradas" && (
                            <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-emerald-700">
                              📤 Salidas: {salidasDia.length}
                            </p>
                          )}
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

function PedidoDetalle({
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

  const saldo = pedido.total - abonado;

  const totalPrendas = pedido.prendas.reduce(
    (sum: number, prenda: any) => sum + prenda.cantidad,
    0
  );

  return (
    <details className="rounded-3xl border bg-white p-6">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-black text-slate-900">
              #{formatPedido(pedido.id)}
            </p>

            <p className="mt-2 text-2xl font-black text-slate-800">
              {pedido.cliente.nombre}
            </p>

            <p className="mt-1 text-xl text-slate-500">
              {totalPrendas} prendas · {money(pedido.total)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span
              className={`rounded-2xl px-5 py-3 text-xl font-black ${
                tipo === "Entrada"
                  ? "bg-teal-100 text-teal-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {tipo}
            </span>

            <span className="rounded-2xl bg-slate-900 px-5 py-3 text-lg font-black text-white">
              Ver detalles
            </span>
          </div>
        </div>
      </summary>

      <div className="mt-6 border-t pt-6">
        <p className="text-xl text-slate-500">
          Tel: {pedido.cliente.telefono || "No registrado"}
        </p>

        <p className="mt-1 text-lg font-bold text-slate-500">
          {tipo}:{" "}
          {(fechaMovimiento || pedido.createdAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Info label="Total" value={money(pedido.total)} />
          <Info label="Abonado" value={money(abonado)} />
          <Info label="Saldo" value={money(saldo)} danger={saldo > 0} />
          <Info label="Prendas" value={totalPrendas} />
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5">
          <p className="text-2xl font-black text-slate-900">
            Servicios registrados
          </p>

          <div className="mt-4 space-y-3">
            {pedido.prendas.map((prenda: any) => (
              <div key={prenda.id} className="rounded-2xl bg-white p-4">
                <p className="text-xl font-black text-slate-900">
                  {prenda.tipo} x {prenda.cantidad}
                </p>

                <p className="mt-1 text-lg font-bold text-teal-600">
                  Servicio: {prenda.servicio || "Lavado"}
                </p>

                <p className="mt-1 text-lg font-black text-slate-700">
                  Valor: {money(prenda.valor || 0)}
                </p>

                {prenda.descripcion && (
                  <p className="mt-2 rounded-xl bg-orange-100 p-3 text-sm font-black text-orange-700">
                    ⚠️ {prenda.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-blue-50 p-5">
          <p className="text-2xl font-black text-slate-900">Pagos / Abonos</p>

          <div className="mt-4 space-y-3">
            {pedido.pagos.map((pago: any) => (
              <div key={pago.id} className="rounded-2xl bg-white p-4">
                <p className="text-xl font-black text-blue-600">
                  {money(pago.valor)}
                </p>

                <p className="mt-1 text-lg font-bold text-slate-700">
                  Método: {pago.metodo}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-400">
                  {pago.createdAt.toLocaleDateString("es-CO")} ·{" "}
                  {pago.createdAt.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}

            {pedido.pagos.length === 0 && (
              <div className="rounded-2xl bg-white p-4 text-lg font-bold text-red-600">
                No tiene abonos registrados.
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

function Kpi({
  title,
  value,
  icon,
  moneyValue,
}: {
  title: string;
  value: number;
  icon: string;
  moneyValue?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-6">
      <p className="text-5xl">{icon}</p>

      <p className="mt-4 text-sm font-black text-slate-500">{title}</p>

      <p className="mt-2 text-4xl font-black text-teal-600">
        {moneyValue ? money(value) : value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-sm font-black text-slate-500">{label}</p>

      <p
        className={`mt-1 text-xl font-black ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-xl font-bold text-slate-400">
      {text}
    </div>
  );
}