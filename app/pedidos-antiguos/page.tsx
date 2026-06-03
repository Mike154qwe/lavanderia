import Navbar from "@/components/Navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function whatsappLink(telefono: string | null, pedidoId: number) {
  if (!telefono) return "#";

  const limpio = telefono.replace(/\D/g, "");
  const numero = limpio.startsWith("57") ? limpio : `57${limpio}`;

  const mensaje = `Hola, somos Lavaseco La Manuelita. Te recordamos que tu pedido #${formatPedido(
    pedidoId
  )} lleva más de 3 meses en la lavandería y está pendiente por recoger. Por favor acércate a reclamarlo. Gracias.`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export default async function PedidosAntiguosPage() {
  const hoy = new Date();

  const limite = new Date(hoy);
  limite.setMonth(limite.getMonth() - 3);

  const pedidos: any[] = await (prisma as any).pedido.findMany({
    where: {
      createdAt: {
        lte: limite,
      },
      estado: {
        notIn: ["ENTREGADO", "CANCELADO"],
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

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <section className="ml-72 p-8">
        <div className="card p-8">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h1 className="title-xl text-slate-900">
                Pedidos antiguos
              </h1>

              <p className="mt-2 text-slate-500">
                Pedidos con 3 meses o más en lavandería pendientes por recoger.
              </p>
            </div>

            <Link href="/inventario" className="btn-dark">
              Volver a inventario
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Kpi title="Pedidos antiguos" value={pedidos.length} />

          <Kpi
            title="Prendas pendientes"
            value={pedidos.reduce(
              (sum, pedido) =>
                sum +
                pedido.prendas.reduce(
                  (s: number, prenda: any) => s + prenda.cantidad,
                  0
                ),
              0
            )}
          />

          <Kpi
            title="Saldo pendiente"
            value={`$${pedidos
              .reduce((sum, pedido) => {
                const abonado = pedido.pagos.reduce(
                  (s: number, pago: any) => s + pago.valor,
                  0
                );

                return sum + Math.max(pedido.total - abonado, 0);
              }, 0)
              .toLocaleString("es-CO")}`}
          />
        </div>

        <div className="mt-8 space-y-5">
          {pedidos.map((pedido) => {
            const abonado = pedido.pagos.reduce(
              (sum: number, pago: any) => sum + pago.valor,
              0
            );

            const saldo = pedido.total - abonado;

            const prendas = pedido.prendas.reduce(
              (sum: number, prenda: any) => sum + prenda.cantidad,
              0
            );

            const diasEnLavanderia = Math.floor(
              (hoy.getTime() - pedido.createdAt.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <div key={pedido.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Pedido #{formatPedido(pedido.id)} -{" "}
                      {pedido.cliente.nombre}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Tel: {pedido.cliente.telefono || "No registrado"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Entrada: {pedido.createdAt.toLocaleDateString("es-CO")} ·{" "}
                      {diasEnLavanderia} días en lavandería
                    </p>

                    <p className="mt-1 text-sm font-bold text-orange-600">
                      Estado: {pedido.estado}
                    </p>
                  </div>

                  <a
                    href={whatsappLink(pedido.cliente.telefono, pedido.id)}
                    target="_blank"
                    className={`rounded-2xl px-5 py-3 font-bold text-white ${
                      pedido.cliente.telefono
                        ? "bg-green-500 hover:bg-green-600"
                        : "pointer-events-none bg-slate-300"
                    }`}
                  >
                    Contactar WhatsApp
                  </a>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <Money label="Total" value={pedido.total} />
                  <Money label="Abonado" value={abonado} />
                  <Money label="Saldo" value={saldo} danger={saldo > 0} />
                  <Info label="Prendas" value={prendas} />
                </div>

                <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                  <h3 className="font-black text-slate-900">Servicios</h3>

                  <div className="mt-3 space-y-2">
                    {pedido.prendas.map((prenda: any) => (
                      <p key={prenda.id} className="text-sm text-slate-600">
                        {prenda.servicio} - {prenda.tipo} x {prenda.cantidad} ·
                        ${prenda.valor.toLocaleString("es-CO")}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {pedidos.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-lg font-bold text-slate-500">
                No hay pedidos con más de 3 meses pendientes.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Kpi({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="card p-6">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black text-teal-600">{value}</p>
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
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-black ${
          danger ? "text-red-600" : "text-teal-600"
        }`}
      >
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}