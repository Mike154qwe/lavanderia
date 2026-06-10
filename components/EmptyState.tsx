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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/[0.06]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className={`mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            action.secondary
              ? "text-brand-500 hover:underline"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
