import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Bell, Cpu } from 'lucide-react';

import type { UseMonitoringReturn } from '../../hooks/useMonitoring';
import { useLanguage } from '../../hooks/useLanguage';
import { CARD } from './constants';
import type { DeviceTypeDatum } from './types';
import { eventIcon, eventLabel } from './events';
import { ChartFallback } from './widgets';

const DeviceCompositionChart = lazy(
  () => import('../../components/dashboard/charts/DeviceCompositionChart'),
);

interface DashboardActivitySectionProps {
  monitor: UseMonitoringReturn;
  deviceTypeData: DeviceTypeDatum[];
}

export function DashboardActivitySection({
  monitor,
  deviceTypeData,
}: DashboardActivitySectionProps) {
  const { copy } = useLanguage();
  const activityCopy = copy.dashboard.activity;
  const [clearedCount, setClearedCount] = useState(0);

  useEffect(() => {
    if (clearedCount > monitor.events.length) {
      setClearedCount(monitor.events.length);
    }
  }, [clearedCount, monitor.events.length]);

  const visibleEvents = useMemo(
    () => monitor.events.slice(0, Math.max(0, monitor.events.length - clearedCount)),
    [clearedCount, monitor.events],
  );

  const renderedEvents = useMemo(() => visibleEvents.slice(0, 10), [visibleEvents]);

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      <div className={`${CARD} p-4 xl:col-span-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary sm:text-lg">{activityCopy.deviceComposition}</h2>
          <Cpu className="h-4 w-4 text-cyan-500 sm:h-5 sm:w-5" />
        </div>
        <div className="h-56 sm:h-60">
          <Suspense fallback={<ChartFallback heightClass="h-56 sm:h-60" />}>
            <DeviceCompositionChart data={deviceTypeData} />
          </Suspense>
        </div>
      </div>

      <div className={`${CARD} p-4 xl:col-span-7`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary sm:text-lg">{activityCopy.liveActivityStream}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClearedCount(monitor.events.length)}
              disabled={visibleEvents.length === 0}
              className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {activityCopy.clearView}
            </button>
            <div className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
              {monitor.status.is_running ? activityCopy.live : activityCopy.paused}
            </div>
          </div>
        </div>

        {monitor.error && (
          <div className="mb-2.5 rounded-lg border border-rose-300/70 bg-rose-100/70 px-2.5 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {monitor.error}
          </div>
        )}

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {renderedEvents.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300/80 text-sm text-text-muted dark:border-slate-700">
              <Bell className="h-5 w-5" />
              <p>{activityCopy.noRecentEvents}</p>
            </div>
          ) : (
            renderedEvents.map((event, idx) => (
              <div
                key={`${event.type}-${idx}`}
                className="flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-slate-100/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/60"
              >
                {eventIcon(event)}
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-text-primary">{eventLabel(event, activityCopy)}</p>
                  <p className="text-xs text-text-muted">
                    {activityCopy.eventPrefix} #{visibleEvents.length - idx}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
