import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Loader2 } from 'lucide-react';

import { useLanguage } from '../hooks/useLanguage';
import { useScanContext } from '../hooks/useScan';
import {
  CARD,
  AlertsHeader,
  AlertsList,
  AlertsStatsGrid,
  AlertsToolbar,
  useAlertsData,
} from './alerts-page';

export default function Alerts() {
  const { copy } = useLanguage();
  const alertsCopy = copy.alerts;
  const { scanResult, isScanning, tauriAvailable } = useScanContext();
  const {
    alerts,
    loading,
    filter,
    stats,
    filteredAlerts,
    setFilter,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAlertsData();
  const hasAlerts = alerts.length > 0;
  const listFillHeight = loading || filteredAlerts.length === 0;
  const showInitialState = !loading && !scanResult && !isScanning && !hasAlerts;
  const showScanningState = isScanning && !scanResult && !hasAlerts;

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-4 sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <AnimatePresence mode="wait">
          {showInitialState && (
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
                  {alertsCopy.header.kicker}
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">
                  {alertsCopy.header.title}
                </h1>
                <p className="mt-1.5 text-sm text-text-secondary">{alertsCopy.header.noData}</p>
              </div>

              <div className={`${CARD} relative flex min-h-0 flex-1 items-center justify-center overflow-hidden`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-100/40 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <BellRing className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary sm:text-[2rem]">
                    {alertsCopy.emptyState.headline}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-text-secondary sm:text-base">
                    {alertsCopy.emptyState.description}
                  </p>
                  <p className="mt-4 text-xs text-text-muted">
                    {tauriAvailable
                      ? alertsCopy.emptyState.hintTauri
                      : alertsCopy.emptyState.hintBrowser}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showScanningState && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  {alertsCopy.header.kicker}
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">
                  {alertsCopy.header.title}
                </h1>
                <p className="mt-1.5 text-sm text-text-secondary">
                  {alertsCopy.scanningState.subtitle}
                </p>
              </div>

              <div className={`${CARD} relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <Loader2 className="mb-4 h-14 w-14 animate-spin text-accent-blue" />
                <p className="text-base font-medium text-text-primary">
                  {alertsCopy.scanningState.headline}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {alertsCopy.scanningState.description}
                </p>
              </div>
            </motion.div>
          )}

          {!showInitialState && !showScanningState && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-4"
            >
              <div className="shrink-0 space-y-4">
                <AlertsHeader
                  loading={loading}
                  onRefresh={() => {
                    void loadAlerts();
                  }}
                />

                <AlertsStatsGrid stats={stats} />

                <AlertsToolbar
                  filter={filter}
                  stats={stats}
                  hasAlerts={alerts.length > 0}
                  onFilterChange={setFilter}
                  onMarkAllAsRead={() => {
                    void markAllAsRead();
                  }}
                  onClearAll={() => {
                    void clearAll();
                  }}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {listFillHeight ? (
                  <div className="h-full pb-1">
                    <AlertsList
                      loading={loading}
                      alerts={alerts}
                      filteredAlerts={filteredAlerts}
                      fillHeight
                      onMarkAsRead={(alertId) => {
                        void markAsRead(alertId);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2 pb-1">
                    <AlertsList
                      loading={loading}
                      alerts={alerts}
                      filteredAlerts={filteredAlerts}
                      onMarkAsRead={(alertId) => {
                        void markAsRead(alertId);
                      }}
                    />

                    <div className="text-center text-xs text-text-muted sm:text-sm">
                      {alertsCopy.footer.showingOf
                        .replace('{shown}', String(filteredAlerts.length))
                        .replace('{total}', String(alerts.length))}
                    </div>
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
