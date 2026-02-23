import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Loader2, Shield, XCircle } from 'lucide-react';

import { useScanContext } from '../hooks/useScan';
import {
  CARD,
  SecurityCard,
  SummaryCard,
  VulnerabilitiesEmptyState,
  SecuritySkeletonCard,
  buildVulnerabilityStats,
  filterDevicesByRisk,
  mapHostsToDevices,
  type DeviceWithVulns,
  type VulnerabilityFilter,
} from './vulnerabilities-page';

export default function Vulnerabilities() {
  const { scanResult, isScanning, tauriAvailable } = useScanContext();
  const [devices, setDevices] = useState<DeviceWithVulns[]>([]);
  const [filter, setFilter] = useState<VulnerabilityFilter>('all');

  useEffect(() => {
    setDevices(mapHostsToDevices(scanResult?.active_hosts));
  }, [scanResult]);

  const stats = useMemo(() => buildVulnerabilityStats(devices), [devices]);
  const filteredDevices = useMemo(
    () => filterDevicesByRisk(devices, filter),
    [devices, filter],
  );
  const toggleRiskFilter = (nextFilter: Exclude<VulnerabilityFilter, 'all'>) => {
    setFilter((currentFilter) => (currentFilter === nextFilter ? 'all' : nextFilter));
  };

  const summaryCardClass = 'h-[86px] min-w-0 w-full p-2.5';

  const isInitialState = !scanResult && !isScanning;
  const isScanningState = isScanning && !scanResult;

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-rose-300/10 blur-3xl dark:bg-rose-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <AnimatePresence mode="wait">
          {isInitialState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  Security Intelligence
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">
                  Vulnerability Center
                </h1>
                <p className="mt-1.5 text-sm text-text-secondary">
                  No scan data available yet.
                </p>
              </div>

              <motion.div
                className={`${CARD} relative flex min-h-0 flex-1 items-center justify-center overflow-hidden`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-100/40 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary sm:text-[2rem]">
                    Ready for vulnerability analysis
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-text-secondary sm:text-base">
                    Start a scan to generate CVE insights, port warnings, and risk-classified device security signals.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium">
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      CVE Insights
                    </span>
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      Port Warnings
                    </span>
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      Risk Filters
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-text-muted">
                    {tauriAvailable
                      ? 'Use the top-right Start Scan button to begin.'
                      : 'Run with `npm run tauri dev` to enable scanning.'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isScanningState && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4 flex items-center justify-between`}>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                    Security Intelligence
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">
                    Vulnerability Center
                  </h1>
                  <p className="mt-1.5 text-sm text-text-secondary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
                    Scanning and analyzing risk signals...
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <motion.div 
                  className="grid auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {Array.from({ length: 9 }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="h-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <SecuritySkeletonCard />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {!isInitialState && !isScanningState && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <motion.section
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${CARD} shrink-0 p-3.5 sm:p-4`}
              >
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                    Security Intelligence
                  </p>
                  <h1 className="text-2xl font-black text-text-primary sm:text-3xl">
                    Vulnerability Center
                  </h1>
                  <p className="max-w-2xl text-sm text-text-secondary">
                    Inspect vulnerability signals and port-level warnings across discovered assets.
                  </p>
                </div>
              </motion.section>

              <div className="grid w-full shrink-0 gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(132px,1fr))]">
                <SummaryCard
                  title="Critical"
                  count={stats.critical}
                  icon={<XCircle className="h-5 w-5" />}
                  color="red"
                  onClick={() => toggleRiskFilter('critical')}
                  active={filter === 'critical'}
                  className={summaryCardClass}
                />
                <SummaryCard
                  title="High Risk"
                  count={stats.high}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  color="orange"
                  onClick={() => toggleRiskFilter('high')}
                  active={filter === 'high'}
                  className={summaryCardClass}
                />
                <SummaryCard
                  title="Medium Risk"
                  count={stats.medium}
                  icon={<Info className="h-5 w-5" />}
                  color="yellow"
                  onClick={() => toggleRiskFilter('medium')}
                  active={filter === 'medium'}
                  className={summaryCardClass}
                />
                <SummaryCard
                  title="Secure"
                  count={stats.secure}
                  icon={<CheckCircle className="h-5 w-5" />}
                  color="green"
                  onClick={() => toggleRiskFilter('secure')}
                  active={filter === 'secure'}
                  className={summaryCardClass}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {filteredDevices.length === 0 ? (
                  <VulnerabilitiesEmptyState
                    hasScanResult={Boolean(scanResult)}
                    filter={filter}
                    className="h-full"
                  />
                ) : (
                  <div className="grid auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredDevices.map((device, index) => (
                      <motion.div
                        key={`${device.mac}-${device.last_ip}-${device.id}`}
                        className="h-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <SecurityCard device={device} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

