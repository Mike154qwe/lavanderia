import { SkeletonBox, SkeletonKpi, SkeletonCard } from "@/components/Skeleton";

export default function LoadingInventario() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-7 w-48" />
            <SkeletonBox className="h-3 w-64" />
          </div>
          <SkeletonBox className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      {/* Search bar */}
      <div className="mt-4 card p-4">
        <SkeletonBox className="h-10 w-full rounded-xl" />
      </div>

      {/* Cards */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
