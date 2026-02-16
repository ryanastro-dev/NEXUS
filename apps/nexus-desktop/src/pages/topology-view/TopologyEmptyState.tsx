import { motion } from 'framer-motion';
import { Activity, Network, Play, Shield, WifiOff } from 'lucide-react';

import LiveTrafficMonitor from '../../components/topology/LiveTrafficMonitor';

interface TopologyEmptyStateProps {
  bgColor: string;
  tauriAvailable: boolean;
  showTrafficMonitor: boolean;
  isDark: boolean;
  onScan: () => void;
}

export function TopologyEmptyState({
  bgColor,
  tauriAvailable,
  showTrafficMonitor,
  isDark,
  onScan,
}: TopologyEmptyStateProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute right-12 bottom-8 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center p-5 sm:p-8">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="w-full rounded-3xl border border-cyan-400/20 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                  <Network className="h-3.5 w-3.5" />
                  Topology Intelligence
                </div>
                <h2 className="text-2xl font-black leading-tight text-slate-100 sm:text-3xl">
                  Network map is ready to initialize
                </h2>
                <p className="max-w-2xl text-sm text-slate-300/85 sm:text-base">
                  Run a discovery cycle to build live node relationships, risk overlays, and
                  traffic-aware edge paths.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                <WifiOff className="h-8 w-8 text-cyan-200" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  <Activity className="h-3.5 w-3.5" />
                  Discovery
                </p>
                <p className="text-xs text-slate-300">
                  ARP + ICMP + TCP fingerprinting for topology baseline.
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  <Shield className="h-3.5 w-3.5" />
                  Risk Overlay
                </p>
                <p className="text-xs text-slate-300">
                  Device types and latency-driven edge health mapping.
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  <Network className="h-3.5 w-3.5" />
                  Controls
                </p>
                <p className="text-xs text-slate-300">
                  Pan, zoom, lock nodes, and switch visual design modes.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button
                onClick={onScan}
                disabled={!tauriAvailable}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start Discovery
              </button>
              <p className="text-xs text-slate-400">
                Shortcut:{' '}
                <span className="rounded border border-slate-600 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">
                  Cmd/Ctrl + S
                </span>
              </p>
            </div>

            {!tauriAvailable && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Tauri runtime unavailable. Start with{' '}
                <span className="font-mono">npm run tauri dev</span> to enable discovery.
              </p>
            )}
          </motion.section>
        </div>
      </div>

      <LiveTrafficMonitor visible={showTrafficMonitor} isDark={isDark} hasScanData={false} />
    </div>
  );
}
