import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
import { CARD } from './constants';
import type { DashboardPayloadView, ScanTrendDatum } from './types';
import { BreakdownRow, ChartFallback } from './widgets';

const ScanThroughputChart = lazy(() => import('../../components/dashboard/charts/ScanThroughputChart'));

interface DashboardThroughputSectionProps {
  payload: DashboardPayloadView;
  scanTrendData: ScanTrendDatum[];
  latestThroughput: number | null;
}

export function DashboardThroughputSection({
  payload,
  scanTrendData,
  latestThroughput,
}: DashboardThroughputSectionProps) {
  const { copy } = useLanguage();
  const throughputCopy = copy.dashboard.throughput;

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} p-4 xl:col-span-8`}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-text-primary sm:text-lg">{throughputCopy.scanThroughput}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/70 bg-cyan-100/70 px-2 py-0.5 font-semibold text-cyan-700 dark:border-cyan-500/35 dark:bg-cyan-500/10 dark:text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                {throughputCopy.legendHostsFound}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-100/70 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {throughputCopy.legendDurationSeconds}
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/70 bg-cyan-100/70 px-2 py-0.5 text-[11px] dark:border-cyan-500/35 dark:bg-cyan-500/10">
            <span className="font-medium text-cyan-700 dark:text-cyan-300">{throughputCopy.discoveryRate}</span>
            <span className="font-semibold text-cyan-700 dark:text-cyan-200">
              {latestThroughput !== null
                ? throughputCopy.hostsPerSecond.replace('{value}', String(latestThroughput))
                : throughputCopy.notAvailable}
            </span>
          </div>
        </div>
        <div className="h-60 sm:h-64">
          <Suspense fallback={<ChartFallback heightClass="h-60 sm:h-64" />}>
            <ScanThroughputChart data={scanTrendData} />
          </Suspense>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} space-y-4 p-4 xl:col-span-4`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary sm:text-lg">{throughputCopy.securityPosture}</h2>
          <Gauge className="h-4 w-4 text-emerald-500 sm:h-5 sm:w-5" />
        </div>
        <BreakdownRow
          label={throughputCopy.security}
          value={payload.health?.breakdown.security ?? 0}
          colorClass="bg-emerald-500"
        />
        <BreakdownRow
          label={throughputCopy.stability}
          value={payload.health?.breakdown.stability ?? 0}
          colorClass="bg-cyan-500"
        />
        <BreakdownRow
          label={throughputCopy.compliance}
          value={payload.health?.breakdown.compliance ?? 0}
          colorClass="bg-amber-500"
        />
        <div className="space-y-1.5 rounded-xl border border-slate-200/70 bg-slate-100/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          {(payload.health?.insights ?? [throughputCopy.noInsightsAvailable]).slice(0, 4).map((insight) => (
            <p key={insight} className="text-xs text-text-secondary">
              {insight}
            </p>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
