import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { SCAN_PIPELINE_STAGES } from './constants';
import { loadingProgressPercent } from './utils';

interface TopologyLoadingStateProps {
  bgColor: string;
  scanProgress: number;
  activeStageIndex: number;
  scanElapsedSeconds: number;
  isDark: boolean;
}

export function TopologyLoadingState({
  bgColor,
  scanProgress,
  activeStageIndex,
  scanElapsedSeconds,
  isDark,
}: TopologyLoadingStateProps) {
  const { copy } = useLanguage();
  const topologyCopy = copy.topology;
  const localizedStages = [
    {
      ...SCAN_PIPELINE_STAGES[0],
      title: topologyCopy.stages.interfaceHandshake.title,
      detail: topologyCopy.stages.interfaceHandshake.detail,
    },
    {
      ...SCAN_PIPELINE_STAGES[1],
      title: topologyCopy.stages.hostDiscovery.title,
      detail: topologyCopy.stages.hostDiscovery.detail,
    },
    {
      ...SCAN_PIPELINE_STAGES[2],
      title: topologyCopy.stages.serviceProfiling.title,
      detail: topologyCopy.stages.serviceProfiling.detail,
    },
    {
      ...SCAN_PIPELINE_STAGES[3],
      title: topologyCopy.stages.graphSynthesis.title,
      detail: topologyCopy.stages.graphSynthesis.detail,
    },
  ];
  const progressPct = loadingProgressPercent(scanProgress, activeStageIndex);
  const activeStageLabel =
    localizedStages[activeStageIndex]?.title ?? topologyCopy.stages.fallbackTitle;
  const isScanComplete = scanProgress >= 100;

  const cardSurfaceClass = isDark
    ? 'border-slate-700/70 bg-slate-950/72 shadow-[0_30px_80px_-35px_rgba(2,6,23,0.95)]'
    : 'border-slate-200/80 bg-white/78 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.28)]';

  const badgeClass = isDark
    ? 'border-cyan-400/35 bg-cyan-400/12 text-cyan-200'
    : 'border-sky-400/35 bg-sky-500/10 text-sky-700';

  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const bodyClass = isDark ? 'text-slate-300/90' : 'text-slate-600';

  const elapsedCardClass = isDark
    ? 'border-cyan-400/30 bg-cyan-400/10 text-slate-100'
    : 'border-sky-300/55 bg-sky-500/10 text-slate-800';

  const progressTrackClass = isDark ? 'bg-slate-800/70' : 'bg-slate-200/85';
  const progressLabelClass = isDark ? 'text-cyan-300' : 'text-sky-700';
  const progressTextClass = isDark ? 'text-slate-300' : 'text-slate-600';

  const pendingDotClass = isDark ? 'bg-slate-600' : 'bg-slate-400';

  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="pointer-events-none absolute inset-0">
          <div
            className={`absolute -top-20 left-1/4 h-80 w-80 rounded-full blur-3xl ${
              isDark ? 'bg-cyan-500/10' : 'bg-cyan-300/18'
            }`}
          />
          <div
            className={`absolute right-10 bottom-10 h-72 w-72 rounded-full blur-3xl ${
              isDark ? 'bg-blue-500/10' : 'bg-blue-300/16'
            }`}
          />
          <div
            className={`absolute bottom-2 left-12 h-64 w-64 rounded-full blur-3xl ${
              isDark ? 'bg-emerald-500/8' : 'bg-emerald-300/14'
            }`}
          />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center p-4 sm:p-5 lg:p-6">
        <motion.section
          initial={false}
          className={`min-h-[28rem] w-full rounded-[28px] border p-5 backdrop-blur-xl sm:p-6 xl:min-h-[30rem] ${cardSurfaceClass}`}
        >
            <div
              className={`mb-5 h-px w-full ${
                isDark
                  ? 'bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0'
                  : 'bg-gradient-to-r from-sky-400/0 via-sky-500/25 to-sky-400/0'
              }`}
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {topologyCopy.loadingState.badge}
                </div>
                <h2 className={`text-2xl font-black leading-tight sm:text-4xl ${titleClass}`}>
                  {topologyCopy.loadingState.title}
                </h2>
                <p className={`max-w-2xl text-sm sm:text-base ${bodyClass}`}>
                  {topologyCopy.loadingState.description}
                </p>
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isDark ? 'text-cyan-200/90' : 'text-sky-700/90'
                  }`}
                >
                  {topologyCopy.loadingState.currentPhase} {activeStageLabel}
                </p>
              </div>

              <div className={`rounded-2xl border px-4 py-3 ${elapsedCardClass}`}>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    isDark ? 'text-cyan-300' : 'text-sky-700'
                  }`}
                >
                  {topologyCopy.loadingState.elapsed}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xl font-bold">
                  <Clock3 className={`h-4 w-4 ${isDark ? 'text-cyan-200' : 'text-sky-700'}`} />
                  {scanElapsedSeconds}s
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className={`mb-2 flex items-center justify-between text-xs ${progressTextClass}`}>
                <span>{topologyCopy.loadingState.progressLabel}</span>
                <span className={`font-semibold ${progressLabelClass}`}>{progressPct}%</span>
              </div>
              <div className={`h-2 rounded-full ${progressTrackClass}`}>
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {localizedStages.map((stage, idx) => {
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
                    className={`rounded-xl border p-2.5 ${
                      status === 'complete'
                        ? isDark
                          ? 'border-emerald-400/25 bg-emerald-500/10'
                          : 'border-emerald-300/55 bg-emerald-100/70'
                        : status === 'active'
                          ? isDark
                            ? 'border-cyan-400/30 bg-cyan-500/10'
                            : 'border-sky-300/60 bg-sky-100/70'
                          : isDark
                            ? 'border-slate-700/60 bg-slate-900/65'
                            : 'border-slate-200/90 bg-white/70'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <p
                        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-300' : 'text-sky-700'}`} />
                        {stage.title}
                      </p>
                      {status === 'complete' ? (
                        <CheckCircle2
                          className={`h-4 w-4 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}
                        />
                      ) : status === 'active' ? (
                        <Loader2
                          className={`h-4 w-4 animate-spin ${isDark ? 'text-cyan-300' : 'text-sky-700'}`}
                        />
                      ) : (
                        <div className={`h-2.5 w-2.5 rounded-full ${pendingDotClass}`} />
                      )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {stage.detail}
                    </p>
                  </div>
                );
              })}
            </div>
        </motion.section>
      </div>
    </div>
  );
}
