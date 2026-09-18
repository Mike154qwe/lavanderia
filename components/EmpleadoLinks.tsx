import Link from "next/link";

export default function EmpleadoLinks({
  extra,
}: {
  extra?: { href: string; label: string }[];
}) {
  const links = extra ?? [];
  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-[var(--radius-well)] border border-[color:var(--border-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-2)] transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
