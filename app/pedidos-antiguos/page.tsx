import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPedido } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos antiguos" };

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
      <section className="p-8">
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Kpi
            title="Pedidos antiguos"
            value={pedidos.length}
            icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
            color="orange"
          />
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
            icon="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            color="brand"
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
            icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            color="red"
          />
        </div>

        <div className="mt-6 space-y-4">
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
              <div key={pedido.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/pedidos/${pedido.id}`}
                        className="text-xl font-black text-gray-900 hover:text-brand-500 hover:underline underline-offset-2"
                      >
                        #{formatPedido(pedido.id)}
                      </Link>
                      <span className="text-xl font-bold text-gray-700">
                        {pedido.cliente.nombre}
                      </span>
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                        {diasEnLavanderia} días
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span>Tel: {pedido.cliente.telefono || "No registrado"}</span>
                      <span>·</span>
                      <span>Entrada: {pedido.createdAt.toLocaleDateString("es-CO")}</span>
                      <span>·</span>
                      <span className="font-semibold text-orange-600">{pedido.estado}</span>
                    </div>
                  </div>

                  <a
                    href={whatsappLink(pedido.cliente.telefono, pedido.id)}
                    target="_blank"
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
                      pedido.cliente.telefono
                        ? "bg-green-500 hover:bg-green-600 active:scale-[0.98]"
                        : "pointer-events-none bg-gray-300"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.532 5.855L.057 23.857a.5.5 0 0 0 .604.677l6.234-1.635A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.167-1.438l-.37-.22-3.843 1.007 1.027-3.748-.241-.385A9.954 9.954 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                  </a>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Money label="Total" value={pedido.total} />
                  <Money label="Abonado" value={abonado} />
                  <Money label="Saldo" value={saldo} danger={saldo > 0} />
                  <Info label="Prendas" value={prendas} />
                </div>

                <details className="group mt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-open:rotate-180">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    Ver servicios ({pedido.prendas.length})
                  </summary>
                  <div className="mt-3 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
                    {pedido.prendas.map((prenda: any) => (
                      <p key={prenda.id} className="text-sm text-gray-600 dark:text-gray-400">
                        {prenda.servicio} · {prenda.tipo} × {prenda.cantidad} ·{" "}
                        <span className="font-semibold">${prenda.valor.toLocaleString("es-CO")}</span>
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}

          {pedidos.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-4xl">✅</p>
              <p className="mt-3 text-lg font-bold text-gray-500">
                No hay pedidos con más de 3 meses pendientes.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const KPI_COLORS: Record<string, { bg: string; icon: string; value: string }> = {
  orange: { bg: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-500", value: "text-orange-600" },
  brand:  { bg: "bg-brand-50 dark:bg-brand-500/10",   icon: "text-brand-500",  value: "text-brand-600"  },
  red:    { bg: "bg-red-50 dark:bg-red-500/10",        icon: "text-red-500",    value: "text-red-600"    },
};

function Kpi({
  title,
  value,
  icon,
  color = "brand",
}: {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  const c = KPI_COLORS[color] ?? KPI_COLORS.brand;
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 ${c.icon}`}>
          {icon.split("M").filter(Boolean).map((d, i) => <path key={i} d={`M${d}`} />)}
        </svg>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500">{title}</p>
        <p className={`mt-0.5 text-2xl font-black ${c.value}`}>{value}</p>
      </div>
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${danger ? "text-red-600" : "text-brand-500"}`}>
        ${value.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}