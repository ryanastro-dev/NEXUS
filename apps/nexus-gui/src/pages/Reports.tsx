import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Database,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Network,
  Shield,
} from 'lucide-react';
import { useScanContext } from '../hooks/useScan';
import { useExport } from '../hooks/useExport';
import { useLanguage } from '../hooks/useLanguage';
import type { ScanResult } from '../lib/api/types';
import { Tooltip } from '../components/common/Tooltip';
import { PANEL_CARD } from '../lib/ui-classes';
import { useNetworkRuntimeStore } from '../store/network-runtime-store';

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  format: string;
  formatColor: string;
  bgColor: string;
  onExport: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  exportLabel: string;
  exportingLabel: string;
  scanDataRequiredLabel: string;
}

const CARD = PANEL_CARD;

function ExportCard({
  title,
  description,
  icon,
  format,
  formatColor,
  bgColor,
  onExport,
  isLoading,
  disabled,
  exportLabel,
  exportingLabel,
  scanDataRequiredLabel,
}: ExportCardProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${CARD} ${bgColor} flex h-full flex-col p-4 sm:p-5 transition-all ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02]'
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-800/80">
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${formatColor}`}>
          {format}
        </span>
      </div>

      <h3 className="mb-1.5 text-base font-bold text-text-primary">{title}</h3>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">{description}</p>

      <Tooltip content={scanDataRequiredLabel} active={disabled}>
        <button
          onClick={handleExport}
          disabled={disabled || loading || isLoading}
          className={`flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-lg transition-all ${
            disabled
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-gradient-to-r from-accent-blue to-accent-sapphire hover:brightness-110 text-white shadow-accent-blue/30'
          }`}
        >
          {loading || isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {exportingLabel}
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              {exportLabel}
            </>
          )}
        </button>
      </Tooltip>
    </div>
  );
}

export default function Reports() {
  const { copy } = useLanguage();
  const reportsCopy = copy.reports;
  const { scanResult, isScanning, tauriAvailable } = useScanContext();
  const runtimeHostsByMac = useNetworkRuntimeStore((state) => state.hostsByMac);
  const lastScanResult = useNetworkRuntimeStore((state) => state.lastScanResult);
  const runtimeHosts = useMemo(() => Object.values(runtimeHostsByMac), [runtimeHostsByMac]);
  const exportHosts = useMemo(
    () => (runtimeHosts.length > 0 ? runtimeHosts : (scanResult?.active_hosts ?? [])),
    [runtimeHosts, scanResult?.active_hosts],
  );
  const effectiveScanResult = useMemo<ScanResult | null>(() => {
    if (scanResult) {
      return {
        ...scanResult,
        active_hosts: exportHosts,
        total_hosts: exportHosts.length,
      };
    }

    if (exportHosts.length === 0) {
      return null;
    }

    const fallback = lastScanResult;
    return {
      interface_name: fallback?.interface_name ?? 'runtime-monitor',
      local_ip: fallback?.local_ip ?? '0.0.0.0',
      local_mac: fallback?.local_mac ?? '00:00:00:00:00:00',
      subnet: fallback?.subnet ?? 'unknown',
      scan_method: fallback?.scan_method ?? 'MONITOR_RUNTIME',
      arp_discovered: fallback?.arp_discovered ?? 0,
      icmp_discovered: fallback?.icmp_discovered ?? 0,
      total_hosts: exportHosts.length,
      scan_duration_ms: fallback?.scan_duration_ms ?? 0,
      active_hosts: exportHosts,
    };
  }, [exportHosts, lastScanResult, scanResult]);
  const {
    exportDevicesCSV,
    exportScanCSV,
    exportTopologyJSON,
    exportScanJSON,
    exportScanReportPDF,
    exportSecurityReportPDF,
    exportShowcaseReportPDF,
    exportingType,
    error,
  } = useExport();

  const deviceCount = exportHosts.length;
  const hasData = deviceCount > 0;

  const isInitialState = !effectiveScanResult && !isScanning;
  const isScanningState = isScanning && !effectiveScanResult;

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
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
              <motion.section
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${CARD} shrink-0 p-3.5 sm:p-4`}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  {reportsCopy.states.exportHub}
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">{reportsCopy.states.title}</h1>
                <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
                  {reportsCopy.states.emptySubtitle}
                </p>
              </motion.section>

              <motion.div
                className={`${CARD} relative flex min-h-0 flex-1 items-center justify-center overflow-hidden`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-100/40 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <FileDown className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary sm:text-[2rem]">
                    {reportsCopy.states.emptyHeadline}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-text-secondary sm:text-base">
                    {reportsCopy.states.emptyBody}
                  </p>
                  <p className="mt-4 text-xs text-text-muted">
                    {tauriAvailable
                      ? reportsCopy.states.emptyHintTauri
                      : reportsCopy.states.emptyHintBrowser}
                  </p>
                  <button
                    onClick={() => {
                      void exportShowcaseReportPDF();
                    }}
                    disabled={!tauriAvailable || exportingType === 'showcase-pdf'}
                    className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportingType === 'showcase-pdf' ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {reportsCopy.states.preparingShowcasePdf}
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        {reportsCopy.states.downloadShowcasePdf}
                      </>
                    )}
                  </button>
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
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  {reportsCopy.states.exportHub}
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">{reportsCopy.states.title}</h1>
                <p className="mt-1.5 text-sm text-text-secondary">{reportsCopy.states.scanningSubtitle}</p>
              </div>

              <div className={`${CARD} relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <Loader2 className="mb-4 h-14 w-14 animate-spin text-accent-blue" />
                <p className="text-base font-medium text-text-primary">{reportsCopy.states.collectingScanData}</p>
                <p className="mt-1 text-sm text-text-muted">{reportsCopy.states.unlockAfterDiscovery}</p>
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
                    {reportsCopy.states.exportHub}
                  </p>
                  <h1 className="text-2xl font-black text-text-primary sm:text-3xl">{reportsCopy.states.title}</h1>
                  <p className="max-w-2xl text-sm text-text-secondary">
                    {reportsCopy.states.contentSubtitle}
                  </p>
                </div>
              </motion.section>

              <div className={`${CARD} shrink-0 p-2.5`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
                    {reportsCopy.chips.hosts}: {deviceCount}
                  </span>
                  <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
                    {reportsCopy.chips.subnet}: {effectiveScanResult?.subnet ?? reportsCopy.chips.notAvailable}
                  </span>
                  <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
                    {reportsCopy.chips.formats}: PDF, CSV, JSON
                  </span>
                </div>
              </div>

              {error && (
                <div className={`${CARD} shrink-0 border-rose-300/60 bg-rose-100/80 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300`}>
                  {error}
                </div>
              )}

              {!hasData && (
                <div className={`${CARD} shrink-0 border-amber-300/60 bg-amber-100/80 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>
                  {reportsCopy.messages.noActiveHosts}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2 xl:grid-cols-3">
                  <ExportCard
                    title={reportsCopy.cards.showcaseReport.title}
                    description={reportsCopy.cards.showcaseReport.description}
                    icon={<FileText className="h-5 w-5 text-accent-blue" />}
                    format="PDF"
                    formatColor="bg-accent-blue/20 text-accent-blue"
                    bgColor="bg-gradient-to-br from-accent-blue/5 to-accent-blue/10"
                    onExport={exportShowcaseReportPDF}
                    isLoading={exportingType === 'showcase-pdf'}
                    disabled={!tauriAvailable}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.scanReport.title}
                    description={reportsCopy.cards.scanReport.description}
                    icon={<FileText className="h-5 w-5 text-accent-red" />}
                    format="PDF"
                    formatColor="bg-accent-red/20 text-accent-red"
                    bgColor="bg-gradient-to-br from-accent-red/5 to-accent-red/10"
                    onExport={async () => {
                      if (effectiveScanResult) {
                        await exportScanReportPDF(effectiveScanResult, exportHosts);
                      }
                    }}
                    isLoading={exportingType === 'scan-pdf'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.securityReport.title}
                    description={reportsCopy.cards.securityReport.description}
                    icon={<Shield className="h-5 w-5 text-accent-red" />}
                    format="PDF"
                    formatColor="bg-accent-red/20 text-accent-red"
                    bgColor="bg-gradient-to-br from-accent-red/5 to-accent-red/10"
                    onExport={async () => {
                      if (exportHosts.length > 0) {
                        await exportSecurityReportPDF(exportHosts);
                      }
                    }}
                    isLoading={exportingType === 'security-pdf'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.deviceList.title}
                    description={reportsCopy.cards.deviceList.description}
                    icon={<FileSpreadsheet className="h-5 w-5 text-accent-green" />}
                    format="CSV"
                    formatColor="bg-accent-green/20 text-accent-green"
                    bgColor="bg-gradient-to-br from-accent-green/5 to-accent-green/10"
                    onExport={exportDevicesCSV}
                    isLoading={exportingType === 'devices-csv'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.scanResults.title}
                    description={reportsCopy.cards.scanResults.description}
                    icon={<BarChart3 className="h-5 w-5 text-accent-green" />}
                    format="CSV"
                    formatColor="bg-accent-green/20 text-accent-green"
                    bgColor="bg-gradient-to-br from-accent-green/5 to-accent-green/10"
                    onExport={async () => {
                      if (exportHosts.length > 0) {
                        await exportScanCSV(exportHosts);
                      }
                    }}
                    isLoading={exportingType === 'scan-csv'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.topologyData.title}
                    description={reportsCopy.cards.topologyData.description}
                    icon={<Network className="h-5 w-5 text-accent-amber" />}
                    format="JSON"
                    formatColor="bg-accent-amber/20 text-accent-amber"
                    bgColor="bg-gradient-to-br from-accent-amber/5 to-accent-amber/10"
                    onExport={async () => {
                      if (effectiveScanResult && exportHosts.length > 0) {
                        await exportTopologyJSON(exportHosts, effectiveScanResult.subnet);
                      }
                    }}
                    isLoading={exportingType === 'topology-json'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />

                  <ExportCard
                    title={reportsCopy.cards.rawScanData.title}
                    description={reportsCopy.cards.rawScanData.description}
                    icon={<Database className="h-5 w-5 text-accent-amber" />}
                    format="JSON"
                    formatColor="bg-accent-amber/20 text-accent-amber"
                    bgColor="bg-gradient-to-br from-accent-amber/5 to-accent-amber/10"
                    onExport={async () => {
                      if (effectiveScanResult) {
                        await exportScanJSON(effectiveScanResult);
                      }
                    }}
                    isLoading={exportingType === 'scan-json'}
                    disabled={!hasData}
                    exportLabel={reportsCopy.exportButton}
                    exportingLabel={reportsCopy.exportingButton}
                    scanDataRequiredLabel={reportsCopy.scanDataRequired}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
