import Link from "next/link";

export default function EmpleadoPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="page-kicker text-teal-600 dark:text-teal-400">
          Mostrador
        </p>
        <h1 className="page-title">¿Qué necesita el cliente?</h1>
        <p className="page-subtitle">
          Dos caminos. Elige según llegó a dejar o a recoger.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PathCard
          href="/pedidos/rapido"
          tone="aqua"
          emoji="🧺"
          kicker="Entrada"
          title="Llegó a dejar"
          desc="Recibir prendas, crear el recibo y cobrar el abono."
          steps={["Cliente", "Prendas", "Recibo"]}
          cta="Nuevo pedido"
        />
        <PathCard
          href="/inventario-empleado"
          tone="indigo"
          emoji="📦"
          kicker="Salida"
          title="Llegó a recoger"
          desc="Buscar el recibo, cobrar el saldo y entregar."
          steps={["Buscar", "Cobrar", "Entregar"]}
          cta="Buscar pedido"
        />
      </div>

      <div>
        <p className="mb-3 page-kicker">También</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SideLink href="/gastos-empleado" emoji="💵" title="Gastos del día" desc="Jabones, insumos, pagos" />
          <SideLink href="/clientes-empleado" emoji="👤" title="Clientes" desc="Buscar o crear ficha" />
          <SideLink href="/entradas-salidas-empleado" emoji="📋" title="Lo de hoy" desc="Qué entró y qué salió hoy" />
        </div>
      </div>
    </div>
  );
}

function PathCard({
  href,
  tone,
  emoji,
  kicker,
  title,
  desc,
  steps,
  cta,
}: {
  href: string;
  tone: "aqua" | "indigo";
  emoji: string;
  kicker: string;
  title: string;
  desc: string;
  steps: string[];
  cta: string;
}) {
  const aqua = tone === "aqua";
  return (
    <Link
      href={href}
      aria-label={`${title}: ${cta}`}
      className={`card group relative overflow-hidden p-6 outline-none transition hover:shadow-soft active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] ${
        aqua
          ? "hover:border-teal-300 focus-visible:ring-teal-400 dark:hover:border-teal-500/40"
          : "hover:border-brand-300 focus-visible:ring-brand-400 dark:hover:border-brand-500/40"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 ${
          aqua ? "bg-gradient-to-r from-teal-400 to-cyan-500" : "bg-gradient-to-r from-brand-500 to-indigo-400"
        }`}
      />
      <div className="flex items-start gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-well)] text-3xl ${
            aqua ? "bg-teal-50 dark:bg-teal-500/15" : "bg-brand-50 dark:bg-brand-500/15"
          }`}
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <p
            className={`page-kicker ${
              aqua ? "text-teal-600 dark:text-teal-400" : "text-brand-500"
            }`}
          >
            {kicker}
          </p>
          <h2 className="mt-1 text-xl font-bold text-[color:var(--text-1)]">{title}</h2>
          <p className="page-subtitle">{desc}</p>
        </div>
      </div>

      <ol className="mt-5 flex flex-wrap gap-2">
        {steps.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                aqua ? "bg-teal-500" : "bg-brand-500"
              }`}
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <p
        className={`mt-5 text-sm font-bold ${
          aqua ? "text-teal-600 group-hover:text-teal-700" : "text-brand-500 group-hover:text-brand-600"
        }`}
      >
        {cta} →
      </p>
    </Link>
  );
}

function SideLink({
  href,
  emoji,
  title,
  desc,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card flex items-center gap-3 p-4 transition hover:border-teal-300 hover:shadow-soft dark:hover:border-teal-500/40"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[color:var(--text-1)]">{title}</span>
        <span className="block text-xs text-[color:var(--text-3)]">{desc}</span>
      </span>
    </Link>
  );
}
