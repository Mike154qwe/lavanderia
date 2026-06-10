import { SkeletonBox } from "@/components/Skeleton";

export default function LoadingPedidoDetalle() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">

        {/* Header */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="h-7 w-52" />
              <SkeletonBox className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex gap-2">
              <SkeletonBox className="h-9 w-28 rounded-xl" />
              <SkeletonBox className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="space-y-4">
            {/* Cliente */}
            <div className="card p-5 space-y-3">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-5 w-48" />
              <SkeletonBox className="h-4 w-32" />
            </div>

            {/* Prendas table */}
            <div className="card overflow-hidden">
              <div className="border-b border-gray-100 dark:border-white/[0.06] p-5">
                <SkeletonBox className="h-5 w-32" />
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-6 py-4">
                    <SkeletonBox className="h-4 w-20 rounded-lg" />
                    <SkeletonBox className="h-4 flex-1" />
                    <SkeletonBox className="h-4 w-8" />
                    <SkeletonBox className="h-4 w-16" />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-white/[0.06] p-5">
                <div className="flex justify-end gap-4">
                  <SkeletonBox className="h-4 w-16" />
                  <SkeletonBox className="h-4 w-24" />
                </div>
              </div>
            </div>

            {/* Estado buttons */}
            <div className="card p-5 space-y-3">
              <SkeletonBox className="h-4 w-32" />
              <div className="flex gap-2">
                <SkeletonBox className="h-10 w-32 rounded-xl" />
                <SkeletonBox className="h-10 w-32 rounded-xl" />
                <SkeletonBox className="h-10 w-32 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Pago */}
            <div className="card p-5 space-y-4">
              <SkeletonBox className="h-5 w-36" />
              <SkeletonBox className="h-10 w-full rounded-xl" />
              <SkeletonBox className="h-10 w-full rounded-xl" />
              <SkeletonBox className="h-10 w-full rounded-xl" />
            </div>

            {/* Resumen */}
            <div className="card p-5 space-y-3">
              <SkeletonBox className="h-5 w-28" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonBox className="h-4 w-20" />
                  <SkeletonBox className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
