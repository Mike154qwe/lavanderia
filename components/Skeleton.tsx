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
