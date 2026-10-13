import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function YearPager({
  year,
  hrefFor,
}: {
  year: number;
  hrefFor: (year: number) => string;
}) {
  const btn =
    "inline-flex h-10 items-center gap-1 rounded-[var(--radius-control)] border border-[color:var(--border-1)] px-3 text-sm font-bold text-[color:var(--text-2)] transition hover:bg-[color:var(--surface-2)]";
  return (
    <nav className="flex items-center gap-1.5" aria-label="Año">
      <Link href={hrefFor(year - 1)} className={btn} aria-label={`Año ${year - 1}`}>
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        {year - 1}
      </Link>
      <span className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-50 px-4 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {year}
      </span>
      <Link href={hrefFor(year + 1)} className={btn} aria-label={`Año ${year + 1}`}>
        {year + 1}
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </nav>
  );
}
