import Link from "next/link";

export default function EmpleadoPage() {
  return (
    <div className="space-y-5 p-6">
      <div className="card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Empleado</p>
        <h1 className="mt-1 text-2xl font-black text-gray-900">¿Qué vas a hacer?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tres acciones del día. Clientes y entradas/salidas están dentro de esas pantallas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          href="/pedidos/rapido"
          title="Pedido rápido"
          desc="Registrar las prendas que entran"
          emoji="⚡"
        />
        <ActionCard
          href="/inventario-empleado"
          title="Buscar / entregar"
          desc="Buscar recibo, cobrar y entregar"
          emoji="🔍"
        />
        <ActionCard
          href="/gastos-empleado"
          title="Gastos del día"
          desc="Registrar salidas de caja"
          emoji="💵"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/clientes-empleado"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-white/10 dark:text-gray-300"
        >
          Clientes
        </Link>
        <Link
          href="/entradas-salidas-empleado"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-white/10 dark:text-gray-300"
        >
          Entradas y salidas
        </Link>
        <Link
          href="/entrega-empleado"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-white/10 dark:text-gray-300"
        >
          Entrega y cobro
        </Link>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  desc,
  emoji,
}: {
  href: string;
  title: string;
  desc: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-3 p-6 transition hover:border-brand-300 hover:shadow-soft dark:hover:border-brand-500/40"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-500/15">
        {emoji}
      </span>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{desc}</p>
      </div>
      <span className="mt-auto text-sm font-semibold text-brand-500">Abrir →</span>
    </Link>
  );
}
