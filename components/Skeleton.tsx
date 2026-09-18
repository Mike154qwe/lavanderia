export function SkeletonBox({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.06] ${className}`}
    />
  );
}

export function SkeletonKpi() {
  return (
    <div className="card flex items-center gap-4 p-5">
      <SkeletonBox className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-6 w-16" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <SkeletonBox className="h-4 w-16" />
      <SkeletonBox className="h-4 flex-1" />
      <SkeletonBox className="h-4 w-24" />
      <SkeletonBox className="h-4 w-20" />
      <SkeletonBox className="h-4 w-20" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-5 w-48" />
          <SkeletonBox className="h-3 w-32" />
        </div>
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <SkeletonBox className="h-14 rounded-xl" />
        <SkeletonBox className="h-14 rounded-xl" />
        <SkeletonBox className="h-14 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonEmpleadoPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-400/50 to-brand-500/40" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <SkeletonBox className="h-12 w-12 shrink-0 rounded-[var(--radius-well)]" />
            <div className="flex-1 space-y-2">
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="h-7 w-48 max-w-full" />
              <SkeletonBox className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <SkeletonBox className="mt-5 h-11 w-full rounded-[var(--radius-control)]" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <SkeletonBox className="h-6 w-6 rounded-full" />
          <SkeletonBox className="mt-3 h-4 w-28" />
          <SkeletonBox className="mt-2 h-3 w-full" />
        </div>
        <div className="card p-4">
          <SkeletonBox className="h-6 w-6 rounded-full" />
          <SkeletonBox className="mt-3 h-4 w-24" />
          <SkeletonBox className="mt-2 h-3 w-full" />
        </div>
        <div className="card p-4">
          <SkeletonBox className="h-6 w-6 rounded-full" />
          <SkeletonBox className="mt-3 h-4 w-32" />
          <SkeletonBox className="mt-2 h-3 w-full" />
        </div>
      </div>
    </div>
  );
}
