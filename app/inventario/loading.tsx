import { SkeletonBox, SkeletonKpi, SkeletonCard } from "@/components/Skeleton";

export default function LoadingInventario() {
  return (
    <div className="page-frame page-frame--wide">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-7 w-48" />
            <SkeletonBox className="h-3 w-40" />
          </div>
          <SkeletonBox className="h-10 w-36 rounded-xl" />
        </div>
        <SkeletonBox className="mt-4 h-11 w-full rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
