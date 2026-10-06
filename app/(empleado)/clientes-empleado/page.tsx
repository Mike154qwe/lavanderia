import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import EmpleadoHero from "@/components/EmpleadoHero";
import FieldIcon from "@/components/FieldIcon";
import { ArrowRight, Search, User, X, Zap } from "lucide-react";
import { fechaCorta } from "@/lib/format";

export const metadata: Metadata = { title: "Clientes" };

async function buscarClientes(q: string) {
  if (!q.trim()) return [];
  return prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q } },
        { telefono: { contains: q } },
      ],
    },
    include: {
      pedidos: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { pagos: true },
      },
      _count: { select: { pedidos: true } },
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
}

export default async function ClientesEmpleadoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const clientes = await buscarClientes(q.trim());

  return (
    <div className="page-frame">

      <EmpleadoHero
        kicker="Fichas"
        title="Clientes"
        subtitle="Busca a quien ya viene, o crea el recibo si es la primera vez."
        icon={<User size={20} strokeWidth={1.75} />}
        tone="aqua"
        links={[
          { href: "/pedidos/rapido", label: "Pedido rápido" },
          { href: "/inventario-empleado", label: "Llegó a recoger" },
        ]}
      >
        <form className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0 flex-1">
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Nombre o teléfono del cliente…"
              className="input-modern w-full text-base font-semibold"
            />
          </FieldIcon>
          <button className="btn-primary px-5 sm:shrink-0" aria-label="Buscar">
            <Search size={18} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </form>
        {q && (
          <a href="/clientes-empleado" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--text-3)] hover:text-[color:var(--text-1)]">
            <X size={14} strokeWidth={2.25} aria-hidden="true" />
            Limpiar búsqueda
          </a>
        )}
      </EmpleadoHero>

      {!q && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Ya es cliente</p>
            <p className="mt-1 font-bold text-gray-900">Escríbelo arriba</p>
            <p className="mt-1 text-sm text-gray-500">
              Nombre o teléfono. Luego le creas un pedido nuevo.
            </p>
          </div>
          <Link
            href="/pedidos/rapido"
            className="card card-nav p-5 hover:border-teal-300"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Primera vez</p>
            <p className="mt-1 font-bold text-gray-900">Crear cliente y recibo</p>
            <p className="mt-1 text-sm text-gray-500">
              Nombre, teléfono y prendas en un solo flujo.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-500">
              Ir al pedido rápido
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
            </p>
          </Link>
        </div>
      )}

      {q && (
        <Link
          href="/pedidos/rapido"
          className="btn-primary btn-lg gap-2"
        >
          <Zap size={18} strokeWidth={2.25} aria-hidden="true" />
          Crear cliente nuevo y recibo
          <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      )}

      {/* ── Sin resultados ───────────────────────────────── */}
      {q && clientes.length === 0 && (
        <div className="card empty-state">
          <span className="mx-auto figure-well h-12 w-12">
            <Search size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="empty-state__title">
            No se encontró cliente con "<span className="text-[color:var(--text-1)]">{q}</span>".
          </p>
          <p className="empty-state__desc">
            ¿Es un cliente nuevo? Usa el botón de arriba para crear el recibo.
          </p>
        </div>
      )}

      {/* ── Resultados ──────────────────────────────────── */}
      {clientes.length > 0 && (
        <div className="space-y-3">
          {clientes.map((cliente) => {
            const activos = cliente.pedidos.filter(
              (p) => p.estado !== "ENTREGADO" && p.estado !== "CANCELADO"
            );
            const saldoPendiente = activos.reduce((sum, p) => {
              const abonado = p.pagos.reduce((s, pago) => s + pago.valor, 0);
              return sum + Math.max(0, p.total - abonado);
            }, 0);
            const ultimoPedido = cliente.pedidos[0];

            const urlNuevoPedido =
              `/pedidos/rapido?nombre=${encodeURIComponent(cliente.nombre)}` +
              `&telefono=${encodeURIComponent(cliente.telefono ?? "")}`;

            return (
              <div key={cliente.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {cliente.nombre}
                    </p>
                    <p className="text-sm text-gray-500">
                      {cliente.telefono ?? "Sin teléfono"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-400">
                        {cliente._count.pedidos} pedido{cliente._count.pedidos !== 1 ? "s" : ""}
                      </span>

                      {activos.length > 0 && (
                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                          {activos.length} activo{activos.length !== 1 ? "s" : ""}
                        </span>
                      )}

                      {ultimoPedido && (
                        <span className="text-xs text-gray-400">
                          Último: {fechaCorta(new Date(ultimoPedido.createdAt))}
                        </span>
                      )}
                    </div>

                    {saldoPendiente > 0 && (
                      <p className="mt-2 text-sm font-black text-red-500">
                        Saldo pendiente: ${saldoPendiente.toLocaleString("es-CO")}
                      </p>
                    )}
                  </div>

                  <Link
                    href={urlNuevoPedido}
                    className="btn-primary shrink-0 gap-1.5"
                  >
                    Nuevo pedido
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
