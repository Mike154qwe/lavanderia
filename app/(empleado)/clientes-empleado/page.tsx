import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
    <div className="p-4 sm:p-6">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Empleado</p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Clientes</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Busca el cliente para crearle un pedido. Si es nuevo, créalo directo.
        </p>

        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Nombre o teléfono del cliente…"
            className="input-modern flex-1 text-base font-semibold"
          />
          <button className="btn-primary px-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>

        {q && (
          <a href="/clientes-empleado" className="mt-2 inline-block text-sm font-semibold text-gray-400 hover:text-gray-600">
            ✕ Limpiar búsqueda
          </a>
        )}
      </div>

      {/* ── CTA nuevo cliente ─────────────────────────────── */}
      <Link
        href="/pedidos/rapido"
        className="mt-4 flex items-center justify-between rounded-xl bg-brand-500 px-5 py-4 font-black text-white transition hover:bg-brand-600 active:scale-[0.99]"
      >
        <span>+ Crear cliente nuevo y recibo</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </Link>

      {/* ── Sin resultados ───────────────────────────────── */}
      {q && clientes.length === 0 && (
        <div className="card mt-4 p-8 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-bold text-gray-600">
            No se encontró cliente con "<span className="text-gray-900">{q}</span>".
          </p>
          <p className="mt-1 text-sm text-gray-400">
            ¿Es un cliente nuevo? Usa el botón de arriba para crear el recibo.
          </p>
        </div>
      )}

      {/* ── Resultados ──────────────────────────────────── */}
      {clientes.length > 0 && (
        <div className="mt-4 space-y-3">
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
                    <p className="text-lg font-black text-gray-900 truncate">
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
                          Último: {new Date(ultimoPedido.createdAt).toLocaleDateString("es-CO")}
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
                    className="shrink-0 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-600 active:scale-[0.98]"
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
