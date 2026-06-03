import Navbar from "@/components/Navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EmpleadoPage() {
  const hoy = new Date();

  const inicioHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  const finHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() + 1
  );

  const pedidos = await prisma.pedido.findMany({
    include: {
      cliente: true,
      prendas: true,
      pagos: true,
      historial: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const entradasHoy = pedidos.filter(
    (pedido) =>
      pedido.createdAt >= inicioHoy &&
      pedido.createdAt < finHoy
  );

  const salidasHoy = pedidos.filter((pedido) =>
    (pedido as any).historial.some(
      (h: any) =>
        h.estado === "ENTREGADO" &&
        h.createdAt >= inicioHoy &&
        h.createdAt < finHoy
    )
  );

  const prendasEntradas = entradasHoy.reduce(
    (sum, pedido) =>
      sum +
      pedido.prendas.reduce(
        (s, prenda) => s + prenda.cantidad,
        0
      ),
    0
  );

  const prendasSalidas = salidasHoy.reduce(
    (sum, pedido) =>
      sum +
      pedido.prendas.reduce(
        (s, prenda) => s + prenda.cantidad,
        0
      ),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Operación diaria
              </h1>

              <p className="mt-2 text-slate-500">
                Resumen de entradas y salidas del día.
              </p>
            </div>

            <Link
              href="/pedidos/nuevo"
              className="rounded-2xl bg-teal-500 px-6 py-4 font-bold text-white shadow hover:bg-teal-600"
            >
              Nueva entrada
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Kpi
            title="Entradas hoy"
            value={entradasHoy.length}
            detail={`${prendasEntradas} prendas recibidas`}
            color="bg-blue-600"
          />

          <Kpi
            title="Salidas hoy"
            value={salidasHoy.length}
            detail={`${prendasSalidas} prendas entregadas`}
            color="bg-emerald-600"
          />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <Panel
            title="Entradas de hoy"
            subtitle="Pedidos recibidos durante el día"
          >
            {entradasHoy.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido} />
            ))}

            {entradasHoy.length === 0 && (
              <Empty text="No hay entradas registradas hoy." />
            )}
          </Panel>

          <Panel
            title="Salidas de hoy"
            subtitle="Pedidos entregados durante el día"
          >
            {salidasHoy.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido} />
            ))}

            {salidasHoy.length === 0 && (
              <Empty text="No hay salidas registradas hoy." />
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function PedidoCard({ pedido }: { pedido: any }) {
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
    <div className="rounded-3xl border bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
          #{String(pedido.id).padStart(5, "0")}
        </span>

        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
          {pedido.estado}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">
        {pedido.cliente.nombre}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Tel: {pedido.cliente.telefono || "No registrado"}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Hora:{" "}
        {pedido.createdAt.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Prendas: {totalPrendas}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Money label="Total" value={pedido.total} />
        <Money label="Abono" value={abonado} />
        <Money label="Saldo" value={saldo} danger={saldo > 0} />
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  detail,
  color,
}: {
  title: string;
  value: number;
  detail: string;
  color: string;
}) {
  return (
    <div className={`${color} rounded-3xl p-6 text-white shadow`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-3 text-5xl font-bold">{value}</p>
      <p className="mt-2 text-sm opacity-90">{detail}</p>
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
    <div className="rounded-3xl bg-white p-6 shadow">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 space-y-4">{children}</div>
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
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>

      <p
        className={`mt-1 font-bold ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}