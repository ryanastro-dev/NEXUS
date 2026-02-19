import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PauseCircle, PlayCircle, RefreshCw, Timer } from 'lucide-react';

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

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) {
    return 'Due now';
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function DashboardHeaderSection({
  monitor,
  payload,
  riskLabel,
  isRefreshing,
  onRefresh,
  onToggleMonitoring,
}: DashboardHeaderSectionProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!monitor.status.is_running) {
      return;
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [monitor.status.is_running]);

  const nextScanLabel = useMemo(() => {
    if (!monitor.status.is_running) {
      return 'Stopped';
    }

    if (monitor.currentPhase) {
      return 'Scanning now';
    }

    const intervalSeconds = Math.max(1, monitor.status.interval_seconds || 60);
    if (!monitor.status.last_scan_time) {
      return `Every ${intervalSeconds}s`;
    }

    const lastScanMs = Date.parse(monitor.status.last_scan_time);
    if (!Number.isFinite(lastScanMs)) {
      return `Every ${intervalSeconds}s`;
    }

    const dueAtMs = lastScanMs + intervalSeconds * 1000;
    const remainingSeconds = Math.max(0, Math.ceil((dueAtMs - nowMs) / 1000));
    return formatCountdown(remainingSeconds);
  }, [
    monitor.currentPhase,
    monitor.status.interval_seconds,
    monitor.status.is_running,
    monitor.status.last_scan_time,
    nowMs,
  ]);

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} overflow-hidden p-4 sm:p-5`}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
            Network Command Center
          </p>
          <h1 className="text-[2rem] font-black leading-tight text-text-primary sm:text-4xl">
            Operational Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            Live monitoring, security posture, scan telemetry, and device intelligence in a single
            control surface.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onToggleMonitoring}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-cyan-800/30 transition hover:brightness-110"
          >
            {monitor.status.is_running ? (
              <>
                <PauseCircle className="h-4 w-4" />
                Stop Live Monitor
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Start Live Monitor
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/80 p-2.5 dark:border-cyan-500/30 dark:bg-cyan-500/10">
          <p className="text-xs text-text-secondary">Monitoring</p>
          <p className="text-sm font-bold text-text-primary">
            {monitor.status.is_running ? 'Active' : 'Idle'}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-xs text-text-secondary">Scan Cycles</p>
          <p className="text-sm font-bold text-text-primary">{monitor.status.scan_count}</p>
        </div>
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/80 p-2.5 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Timer className="h-3.5 w-3.5" />
            <span>Next Scan</span>
          </div>
          <p className="text-sm font-bold text-text-primary">{nextScanLabel}</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-xs text-text-secondary">Risk Tier</p>
          <p className="text-sm font-bold text-text-primary">{riskLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-300/80 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs text-text-secondary">Last Sync</p>
          <p className="text-sm font-bold text-text-primary">{payload.fetchedAt.toLocaleTimeString()}</p>
        </div>
      </div>

      {monitor.currentPhase && (
        <div className="mt-4 space-y-1.5">
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
