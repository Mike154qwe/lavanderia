import { SkeletonBox, SkeletonKpi } from "@/components/Skeleton";

export default function LoadingGerente() {
  return (
    <div className="page-frame page-frame--wide">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-8 w-56" />
            <SkeletonBox className="h-3 w-48" />
          </div>
          <SkeletonBox className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      <div className="card p-5 space-y-3">
        <SkeletonBox className="h-4 w-36" />
        <SkeletonBox className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
