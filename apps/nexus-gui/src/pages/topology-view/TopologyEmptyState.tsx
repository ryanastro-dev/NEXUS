import { motion } from 'framer-motion';
import { Activity, Network, Play, Shield, WifiOff } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface TopologyEmptyStateProps {
  bgColor: string;
  tauriAvailable: boolean;
  isDark: boolean;
  onScan: () => void;
}

export function TopologyEmptyState({
  bgColor,
  tauriAvailable,
  isDark,
  onScan,
}: TopologyEmptyStateProps) {
  const { copy } = useLanguage();
  const topologyCopy = copy.topology;
  const cardSurfaceClass = isDark
    ? 'border-slate-700/70 bg-slate-950/72 shadow-[0_30px_80px_-35px_rgba(2,6,23,0.95)]'
    : 'border-slate-200/80 bg-white/78 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.28)]';

  const badgeClass = isDark
    ? 'border-cyan-400/35 bg-cyan-400/12 text-cyan-200'
    : 'border-sky-400/35 bg-sky-500/10 text-sky-700';

  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const bodyClass = isDark ? 'text-slate-300/90' : 'text-slate-600';
  const iconShellClass = isDark
    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
    : 'border-sky-300/55 bg-sky-500/10 text-sky-700';

  const featureCards = [
    {
      icon: Activity,
      title: topologyCopy.emptyState.featureDiscoveryTitle,
      detail: topologyCopy.emptyState.featureDiscoveryDetail,
    },
    {
      icon: Shield,
      title: topologyCopy.emptyState.featureRiskTitle,
      detail: topologyCopy.emptyState.featureRiskDetail,
    },
    {
      icon: Network,
      title: topologyCopy.emptyState.featureControlsTitle,
      detail: topologyCopy.emptyState.featureControlsDetail,
    },
  ];

  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="pointer-events-none absolute inset-0">
          <div
            className={`absolute -top-28 left-1/4 h-80 w-80 rounded-full blur-3xl ${
              isDark ? 'bg-cyan-400/12' : 'bg-cyan-300/18'
            }`}
          />
          <div
            className={`absolute right-12 bottom-8 h-72 w-72 rounded-full blur-3xl ${
              isDark ? 'bg-blue-500/12' : 'bg-blue-300/16'
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
          className={`flex min-h-[28rem] w-full flex-col justify-center rounded-[28px] border p-5 backdrop-blur-xl sm:p-6 xl:min-h-[30rem] ${cardSurfaceClass}`}
        >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}
                >
                  <Network className="h-3.5 w-3.5" />
                  {topologyCopy.emptyState.badge}
                </div>
                <h2 className={`text-2xl font-black leading-tight sm:text-4xl ${titleClass}`}>
                  {topologyCopy.emptyState.title}
                </h2>
                <p className={`max-w-2xl text-sm sm:text-base ${bodyClass}`}>
                  {topologyCopy.emptyState.description}
                </p>
              </div>

              <div className={`rounded-2xl border p-4 ${iconShellClass}`}>
                <WifiOff className="h-8 w-8" />
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className={`rounded-xl border p-2.5 ${
                      isDark
                        ? 'border-slate-700/65 bg-slate-900/72'
                        : 'border-slate-200/90 bg-white/70'
                    }`}
                  >
                    <p
                      className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                        isDark ? 'text-cyan-300' : 'text-sky-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {feature.title}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {feature.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center">
              <button
                onClick={onScan}
                disabled={!tauriAvailable}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {topologyCopy.emptyState.startDiscovery}
              </button>
            </div>

            {!tauriAvailable && (
              <p
                className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                  isDark
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-amber-400/50 bg-amber-50 text-amber-700'
                }`}
              >
                {topologyCopy.emptyState.tauriUnavailable}
              </p>
            )}
        </motion.section>
      </div>
    </div>
  );
}
