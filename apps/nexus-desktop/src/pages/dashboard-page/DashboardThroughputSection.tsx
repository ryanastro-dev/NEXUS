import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';

import { CARD } from './constants';
import type { DashboardPayloadView, ScanTrendDatum } from './types';
import { BreakdownRow, ChartFallback } from './widgets';

const ScanThroughputChart = lazy(() => import('../../components/dashboard/charts/ScanThroughputChart'));

interface DashboardThroughputSectionProps {
  payload: DashboardPayloadView;
  scanTrendData: ScanTrendDatum[];
}

export function DashboardThroughputSection({
  payload,
  scanTrendData,
}: DashboardThroughputSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} p-5 xl:col-span-8`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Scan Throughput</h2>
          <p className="text-xs text-text-secondary">Hosts and duration per scan</p>
        </div>
        <div className="h-72">
          <Suspense fallback={<ChartFallback heightClass="h-72" />}>
            <ScanThroughputChart data={scanTrendData} />
          </Suspense>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} space-y-5 p-5 xl:col-span-4`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Security Posture</h2>
          <Gauge className="h-5 w-5 text-emerald-500" />
        </div>
        <BreakdownRow
          label="Security"
          value={payload.health?.breakdown.security ?? 0}
          colorClass="bg-emerald-500"
        />
        <BreakdownRow
          label="Stability"
          value={payload.health?.breakdown.stability ?? 0}
          colorClass="bg-cyan-500"
        />
        <BreakdownRow
          label="Compliance"
          value={payload.health?.breakdown.compliance ?? 0}
          colorClass="bg-amber-500"
        />
        <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          {(payload.health?.insights ?? ['No insights available']).slice(0, 4).map((insight) => (
            <p key={insight} className="text-xs text-text-secondary">
              {insight}
            </p>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
