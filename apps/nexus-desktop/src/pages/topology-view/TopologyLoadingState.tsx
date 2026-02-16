import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';

import LiveTrafficMonitor from '../../components/topology/LiveTrafficMonitor';
import { SCAN_PIPELINE_STAGES } from './constants';
import { loadingProgressPercent } from './utils';

interface TopologyLoadingStateProps {
  bgColor: string;
  scanProgress: number;
  activeStageIndex: number;
  scanElapsedSeconds: number;
  showTrafficMonitor: boolean;
  isDark: boolean;
}

export function TopologyLoadingState({
  bgColor,
  scanProgress,
  activeStageIndex,
  scanElapsedSeconds,
  showTrafficMonitor,
  isDark,
}: TopologyLoadingStateProps) {
  const progressPct = loadingProgressPercent(scanProgress, activeStageIndex);
  const activeStageLabel = SCAN_PIPELINE_STAGES[activeStageIndex]?.title ?? 'Topology Discovery';

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center p-5 sm:p-8">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full rounded-3xl border border-cyan-400/20 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Discovery Pipeline Active
                </div>
                <h2 className="text-2xl font-black leading-tight text-slate-100 sm:text-3xl">
                  Mapping your live network fabric
                </h2>
                <p className="max-w-2xl text-sm text-slate-300/85 sm:text-base">
                  Collecting hosts, profiling topology signals, and preparing graph overlays for
                  command view.
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                  Current phase: {activeStageLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                  Elapsed
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-100">
                  <Clock3 className="h-4 w-4 text-cyan-200" />
                  {scanElapsedSeconds}s
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span>Topology synthesis in progress</span>
                <span className="font-semibold text-cyan-300">{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800/70">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SCAN_PIPELINE_STAGES.map((stage, idx) => {
                const isScanComplete = scanProgress >= 100;
                const status =
                  isScanComplete || idx < activeStageIndex
                    ? 'complete'
                    : idx === activeStageIndex
                      ? 'active'
                      : 'pending';
                const Icon = stage.icon;

                return (
                  <div
                    key={stage.id}
                    className={`rounded-xl border p-3 ${
                      status === 'complete'
                        ? 'border-emerald-400/25 bg-emerald-500/10'
                        : status === 'active'
                          ? 'border-cyan-400/30 bg-cyan-500/10'
                          : 'border-slate-700/60 bg-slate-900/65'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
                        <Icon className="h-3.5 w-3.5 text-cyan-300" />
                        {stage.title}
                      </p>
                      {status === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : status === 'active' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{stage.detail}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </div>

      <LiveTrafficMonitor visible={showTrafficMonitor} isDark={isDark} hasScanData={false} />
    </div>
  );
}
