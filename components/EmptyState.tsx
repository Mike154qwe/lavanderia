import Link from "next/link";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string; secondary?: boolean };
}) {
  return (
    <div className="card empty-state mt-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-well)] bg-[color:var(--surface-2)] text-2xl">
        {icon}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__desc mx-auto max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className={`mt-5 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-bold transition ${
            action.secondary
              ? "text-brand-500 hover:underline"
              : "btn-primary"
          }`}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
