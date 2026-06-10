import { SkeletonBox, SkeletonKpi } from "@/components/Skeleton";

export default function LoadingGerente() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-7 w-48" />
          </div>
          <div className="flex gap-2">
            <SkeletonBox className="h-9 w-9 rounded-xl" />
            <SkeletonBox className="h-9 w-12 rounded-xl" />
            <SkeletonBox className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5 space-y-3">
          <SkeletonBox className="h-4 w-36" />
          <SkeletonBox className="h-48 w-full rounded-xl" />
        </div>
        <div className="card p-5 space-y-3">
          <SkeletonBox className="h-4 w-36" />
          <SkeletonBox className="h-48 w-full rounded-xl" />
        </div>
      </div>

      {/* Movimientos */}
      <div className="mt-4 card p-5 space-y-4">
        <SkeletonBox className="h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-4 flex-1" />
              <SkeletonBox className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
