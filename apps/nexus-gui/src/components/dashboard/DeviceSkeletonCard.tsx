import { Skeleton } from '../common/Skeleton';

export default function DeviceSkeletonCard() {
  return (
    <div className="flex h-full min-h-[292px] flex-col rounded-lg border border-theme bg-bg-secondary p-3.5 opacity-60 lg:p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>

      {/* IP Address */}
      <div className="mb-3 space-y-1.5 border-b border-theme pb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Metrics */}
      <div className="mb-3 space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-theme pt-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
