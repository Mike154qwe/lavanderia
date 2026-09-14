import Link from "next/link";

const TONES = {
  aqua: {
    kicker: "text-teal-600 dark:text-teal-400",
    bar: "bg-gradient-to-r from-teal-400 to-cyan-500",
    icon: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  },
  indigo: {
    kicker: "text-brand-500",
    bar: "bg-gradient-to-r from-brand-500 to-indigo-400",
    icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  },
  amber: {
    kicker: "text-amber-600 dark:text-amber-400",
    bar: "bg-gradient-to-r from-amber-400 to-orange-400",
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
} as const;

export default function EmpleadoHero({
  kicker = "Mostrador",
  title,
  subtitle,
  icon,
  tone = "aqua",
  links,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle: string;
  icon?: string;
  tone?: keyof typeof TONES;
  links?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    <div className="card overflow-hidden">
      <div className={`h-1.5 ${t.bar}`} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {icon && (
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-well)] text-2xl ${t.icon}`}>
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={`page-kicker ${t.kicker}`}>{kicker}</p>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>

        {links && links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-[color:var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-2)] ring-1 ring-[color:var(--border-1)] transition hover:bg-teal-50 hover:text-teal-700 hover:ring-teal-200 dark:bg-white/5 dark:text-[color:var(--text-2)] dark:ring-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}
