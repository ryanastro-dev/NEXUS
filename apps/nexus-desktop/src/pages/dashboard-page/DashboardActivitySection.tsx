import { Suspense, lazy } from 'react';
import { Bell, Cpu } from 'lucide-react';

import type { UseMonitoringReturn } from '../../hooks/useMonitoring';
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
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className={`${CARD} p-5 xl:col-span-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Device Composition</h2>
          <Cpu className="h-5 w-5 text-cyan-500" />
        </div>
        <div className="h-64">
          <Suspense fallback={<ChartFallback heightClass="h-64" />}>
            <DeviceCompositionChart data={deviceTypeData} />
          </Suspense>
        </div>
      </div>

      <div className={`${CARD} p-5 xl:col-span-7`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Live Activity Stream</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={monitor.clearEvents}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <div className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
              {monitor.status.is_running ? 'Live' : 'Paused'}
            </div>
          </div>
        </div>

        {monitor.error && (
          <div className="mb-3 rounded-lg border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {monitor.error}
          </div>
        )}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {monitor.events.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300/80 text-sm text-text-muted dark:border-slate-700">
              <Bell className="h-6 w-6" />
              <p>No recent events captured</p>
            </div>
          ) : (
            monitor.events.slice(0, 10).map((event, idx) => (
              <div
                key={`${event.type}-${idx}`}
                className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-100/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                {eventIcon(event)}
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">{eventLabel(event)}</p>
                  <p className="text-xs text-text-muted">Event #{monitor.events.length - idx}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
