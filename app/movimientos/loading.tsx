import { SkeletonBox, SkeletonKpi } from "@/components/Skeleton";

export default function LoadingMovimientos() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-7 w-44" />
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

      {/* Calendar months */}
      {Array.from({ length: 2 }).map((_, mi) => (
        <div key={mi} className="mt-6 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-5 w-32" />
            <div className="flex gap-4">
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="h-4 w-20" />
            </div>
          </div>
          {/* Day names row */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonBox key={i} className="h-5 w-full" />
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonBox key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
