import { motion } from 'framer-motion';
import { PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';

import type { UseMonitoringReturn } from '../../hooks/useMonitoring';
import { CARD } from './constants';
import type { DashboardPayloadView } from './types';

interface DashboardHeaderSectionProps {
  monitor: UseMonitoringReturn;
  payload: DashboardPayloadView;
  riskLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleMonitoring: () => void;
}

export function DashboardHeaderSection({
  monitor,
  payload,
  riskLabel,
  isRefreshing,
  onRefresh,
  onToggleMonitoring,
}: DashboardHeaderSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} overflow-hidden p-5 sm:p-6`}
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
            Network Command Center
          </p>
          <h1 className="text-2xl font-black text-text-primary sm:text-4xl">Operational Dashboard</h1>
          <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
            Live monitoring, security posture, scan telemetry, and device intelligence in a single
            control surface.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onToggleMonitoring}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-800/30 transition hover:brightness-110"
          >
            {monitor.status.is_running ? (
              <>
                <PauseCircle className="h-4 w-4" />
                Stop Monitor
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Start Monitor
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/80 p-3 dark:border-cyan-500/30 dark:bg-cyan-500/10">
          <p className="text-xs text-text-secondary">Monitoring</p>
          <p className="text-sm font-bold text-text-primary">
            {monitor.status.is_running ? 'Active' : 'Idle'}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-xs text-text-secondary">Scan Cycles</p>
          <p className="text-sm font-bold text-text-primary">{monitor.status.scan_count}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-xs text-text-secondary">Risk Tier</p>
          <p className="text-sm font-bold text-text-primary">{riskLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-300/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs text-text-secondary">Last Sync</p>
          <p className="text-sm font-bold text-text-primary">{payload.fetchedAt.toLocaleTimeString()}</p>
        </div>
      </div>

      {monitor.currentPhase && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{monitor.currentPhase}</span>
            <span>{monitor.currentProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
              animate={{ width: `${monitor.currentProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}
    </motion.section>
  );
}
