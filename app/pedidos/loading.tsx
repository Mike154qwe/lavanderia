import { SkeletonBox, SkeletonKpi, SkeletonRow } from "@/components/Skeleton";

export default function LoadingPedidos() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-7 w-40" />
          </div>
          <SkeletonBox className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      {/* Filters */}
      <div className="mt-4 card p-4 flex gap-3">
        <SkeletonBox className="h-10 flex-1 rounded-xl" />
        <SkeletonBox className="h-10 w-40 rounded-xl" />
      </div>

      {/* Table */}
      <div className="mt-4 card overflow-hidden">
        <div className="border-b border-gray-100 dark:border-white/[0.06] px-6 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-3 w-20" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}
