import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MovimientoDiaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;

  const diaBase = new Date(fecha + "T00:00:00");
  const inicio = new Date(diaBase);
  const fin = new Date(diaBase);
  fin.setDate(fin.getDate() + 1);

  const pedidos = await prisma.pedido.findMany({
    where: {
      OR: [
        {
          createdAt: {
            gte: inicio,
            lt: fin,
          },
        },
        {
          historial: {
            some: {
              createdAt: {
                gte: inicio,
                lt: fin,
              },
            },
          },
        },
      ],
    },
    include: {
      cliente: true,
      prendas: true,
      pagos: true,
      historial: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const entradas = pedidos.filter(
    (pedido) => pedido.createdAt >= inicio && pedido.createdAt < fin
  );

  const salidas = pedidos.filter((pedido) =>
    (pedido as any).historial.some(
      (h: any) =>
        h.estado === "ENTREGADO" && h.createdAt >= inicio && h.createdAt < fin
    )
  );

  const prendasEntrada = entradas.reduce(
    (sum, pedido) =>
      sum + pedido.prendas.reduce((s, prenda) => s + prenda.cantidad, 0),
    0
  );

  const prendasSalida = salidas.reduce(
    (sum, pedido) =>
      sum + pedido.prendas.reduce((s, prenda) => s + prenda.cantidad, 0),
    0
  );

  return (
    <div className="space-y-5 p-6">
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Movimientos del día
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {diaBase.toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <Link
              href="/movimientos"
              className="btn-dark"
            >
              Volver
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <Kpi title="Entradas" value={entradas.length} />
            <Kpi title="Prendas entrada" value={prendasEntrada} />
            <Kpi title="Salidas" value={salidas.length} />
            <Kpi title="Prendas salida" value={prendasSalida} />
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <Panel title="Entradas del día" subtitle="Pedidos recibidos">
            {entradas.map((pedido) => (
              <MovimientoCard
                key={pedido.id}
                pedido={pedido}
                tipo="Entrada"
                fechaMovimiento={pedido.createdAt}
              />
            ))}

            {entradas.length === 0 && <Empty text="No hubo entradas." />}
          </Panel>

          <Panel title="Salidas del día" subtitle="Pedidos entregados">
            {salidas.map((pedido) => {
              const salida = (pedido as any).historial.find(
                (h: any) =>
                  h.estado === "ENTREGADO" &&
                  h.createdAt >= inicio &&
                  h.createdAt < fin
              );

              return (
                <MovimientoCard
                  key={pedido.id}
                  pedido={pedido}
                  tipo="Salida"
                  fechaMovimiento={salida?.createdAt || pedido.createdAt}
                />
              );
            })}

            {salidas.length === 0 && <Empty text="No hubo salidas." />}
          </Panel>
        </div>
    </div>
  );
}

function MovimientoCard({
  pedido,
  tipo,
  fechaMovimiento,
}: {
  pedido: any;
  tipo: "Entrada" | "Salida";
  fechaMovimiento: Date;
}) {
  const abonado = pedido.pagos.reduce(
    (sum: number, pago: any) => sum + pago.valor,
    0
  );

  const saldo = pedido.total - abonado;

  const prendas = pedido.prendas.reduce(
    (sum: number, prenda: any) => sum + prenda.cantidad,
    0
  );

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            tipo === "Entrada"
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {tipo}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 dark:bg-white/10 dark:text-gray-300">
          #{pedido.id}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-gray-900">
        {pedido.cliente.nombre}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        Tel: {pedido.cliente.telefono || "No registrado"}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Hora:{" "}
        {fechaMovimiento.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <p className="mt-1 text-sm text-gray-500">Estado: {pedido.estado}</p>

      <div className="mt-4 rounded-xl bg-white p-4 dark:bg-white/5">
        <p className="font-bold text-gray-800">Prendas: {prendas}</p>

        <div className="mt-2 space-y-1">
          {pedido.prendas.map((prenda: any) => (
            <p key={prenda.id} className="text-sm text-gray-500">
              {prenda.servicio ?? "Lavado"} - {prenda.tipo} x{" "}
              {prenda.cantidad}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Money label="Total" value={pedido.total} />
        <Money label="Abono" value={abonado} />
        <Money label="Saldo" value={saldo} danger={saldo > 0} />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-5 dark:bg-white/[0.02]">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-4xl font-black text-brand-500">{value}</p>
    </div>
  );
}

function Money({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-white/5">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={`mt-1 font-black ${
          danger ? "text-red-600" : "text-brand-500"
        }`}
      >
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 dark:border-white/10">
      {text}
    </div>
  );
}