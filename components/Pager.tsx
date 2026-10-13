import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pager({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const prev = page <= 1;
  const next = page >= totalPages;
  const link =
    "inline-flex items-center gap-1 rounded-[var(--radius-control)] px-3 py-2 text-sm font-bold transition";
  return (
    <nav
      className={`flex items-center justify-between ${className ?? "border-t border-[color:var(--border-1)] px-5 py-4"}`}
      aria-label="Paginación"
    >
      <Link
        href={hrefFor(Math.max(page - 1, 1))}
        className={`${link} ${prev ? "pointer-events-none text-[color:var(--text-4)]" : "text-[color:var(--text-2)] hover:bg-[color:var(--surface-2)]"}`}
        aria-disabled={prev}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Anterior
      </Link>
      <span className="text-sm font-semibold text-[color:var(--text-3)]">
        Página {page} / {totalPages}
      </span>
      <Link
        href={hrefFor(Math.min(page + 1, totalPages))}
        className={`${link} ${next ? "pointer-events-none text-[color:var(--text-4)]" : "text-[color:var(--text-2)] hover:bg-[color:var(--surface-2)]"}`}
        aria-disabled={next}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </nav>
  );
}
