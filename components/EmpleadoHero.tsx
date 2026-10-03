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
  icon?: React.ReactNode;
  tone?: keyof typeof TONES;
  links?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    <div className="card overflow-hidden">
      <div className={`h-1 ${t.bar}`} />
      <div className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
        {icon != null && icon !== "" && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-well)] ${t.icon} ${
              typeof icon === "string" ? "text-xl" : ""
            }`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`page-kicker ${t.kicker}`}>{kicker}</p>
          <h1 className="page-title !mt-0.5 !text-[1.35rem]">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
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
      </div>

      {children && (
        <div className="border-t border-[color:var(--border-1)] bg-[color:var(--surface-2)] px-4 py-3 sm:px-5">
          {children}
        </div>
      )}
    </div>
  );
}
