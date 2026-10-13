import { SkeletonBox, SkeletonKpi, SkeletonRow } from "@/components/Skeleton";

export default function LoadingClientes() {
  return (
    <div className="page-frame page-frame--wide">
      <div className="card p-6">
        <div className="space-y-2">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-7 w-36" />
        </div>
        <SkeletonBox className="mt-5 h-11 w-full rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonKpi key={i} />)}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border-1)] px-6 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} className="h-3 w-24" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border-1)]">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}
