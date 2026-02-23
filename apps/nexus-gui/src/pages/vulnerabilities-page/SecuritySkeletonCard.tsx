import { Skeleton } from '../../components/common/Skeleton';

export function SecuritySkeletonCard() {
  return (
    <div className="flex h-full min-h-[236px] flex-col rounded-2xl border border-slate-200/70 bg-white/50 p-3.5 opacity-60 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="mt-1.5 flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <span className="text-text-muted opacity-50">•</span>
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      </div>

      <div className="mb-2.5 space-y-2 pt-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-36" />
        </div>
        
        <div className="space-y-1.5">
          <div className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-2.5 dark:border-slate-800/50 dark:bg-slate-900/50">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-1.5">
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
    </div>
  );
}
