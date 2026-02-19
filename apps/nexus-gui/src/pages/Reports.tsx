import { useState } from 'react';
import { motion } from 'framer-motion';
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
}

const CARD =
  'rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65';

function ExportCard({ title, description, icon, format, formatColor, bgColor, onExport, isLoading, disabled }: ExportCardProps) {
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
            Exporting...
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            Export
          </>
        )}
      </button>
    </div>
  );
}

export default function Reports() {
  const { scanResult, isScanning, tauriAvailable } = useScanContext();
  const {
    exportDevicesCSV,
    exportScanCSV,
    exportTopologyJSON,
    exportScanJSON,
    exportScanReportPDF,
    exportSecurityReportPDF,
    exportingType,
    error,
  } = useExport();

  const deviceCount = scanResult?.active_hosts?.length ?? 0;
  const hasData = deviceCount > 0;

  if (!scanResult && !isScanning) {
    return (
      <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
          <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
          <motion.section
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD} shrink-0 p-3.5 sm:p-4`}
          >
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Export Hub
            </p>
            <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Reports & Artifacts</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
              Generate production-grade exports for audits, handoffs, and automation.
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
                Exports are ready when scan data is available
              </h2>
              <p className="mt-2 max-w-xl text-sm text-text-secondary sm:text-base">
                Run a scan first, then export CSV, JSON, and PDF artifacts from this page.
              </p>
              <p className="mt-4 text-xs text-text-muted">
                {tauriAvailable
                  ? 'Use the top-right Start Scan button to begin.'
                  : 'Run with `npm run tauri dev` to enable scanning.'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isScanning && !scanResult) {
    return (
      <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
          <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
          <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Export Hub
            </p>
            <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Reports & Artifacts</h1>
            <p className="mt-1.5 text-sm text-text-secondary">Preparing scan artifacts...</p>
          </div>

          <div className={`${CARD} relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
            <Loader2 className="mb-4 h-14 w-14 animate-spin text-accent-blue" />
            <p className="text-base font-medium text-text-primary">Collecting scan data...</p>
            <p className="mt-1 text-sm text-text-muted">Export actions will unlock once discovery completes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} shrink-0 p-3.5 sm:p-4`}
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Export Hub
            </p>
            <h1 className="text-2xl font-black text-text-primary sm:text-3xl">Reports & Artifacts</h1>
            <p className="max-w-2xl text-sm text-text-secondary">
              Generate production-grade reports and structured exports for audits, handoffs, and automation.
            </p>
          </div>
        </motion.section>

        <div className={`${CARD} shrink-0 p-2.5`}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
              Hosts: {deviceCount}
            </span>
            <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
              Subnet: {scanResult?.subnet ?? 'N/A'}
            </span>
            <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 font-semibold text-text-muted">
              Formats: PDF, CSV, JSON
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
            Scan completed but no active hosts were found. Exports are currently disabled.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2 xl:grid-cols-3">
            <ExportCard
              title="Scan Report"
              description="Professional PDF report with network analysis, device inventory, and statistics."
              icon={<FileText className="h-5 w-5 text-accent-red" />}
              format="PDF"
              formatColor="bg-accent-red/20 text-accent-red"
              bgColor="bg-gradient-to-br from-accent-red/5 to-accent-red/10"
              onExport={async () => {
                if (scanResult) {
                  await exportScanReportPDF(scanResult, scanResult.active_hosts);
                }
              }}
              isLoading={exportingType === 'scan-pdf'}
              disabled={!hasData}
            />

            <ExportCard
              title="Security Report"
              description="Network health assessment with security recommendations and risk analysis."
              icon={<Shield className="h-5 w-5 text-accent-red" />}
              format="PDF"
              formatColor="bg-accent-red/20 text-accent-red"
              bgColor="bg-gradient-to-br from-accent-red/5 to-accent-red/10"
              onExport={async () => {
                if (scanResult && scanResult.active_hosts) {
                  await exportSecurityReportPDF(scanResult.active_hosts);
                }
              }}
              isLoading={exportingType === 'security-pdf'}
              disabled={!hasData}
            />

            <ExportCard
              title="Device List"
              description="Export all discovered devices to CSV format for spreadsheet analysis."
              icon={<FileSpreadsheet className="h-5 w-5 text-accent-green" />}
              format="CSV"
              formatColor="bg-accent-green/20 text-accent-green"
              bgColor="bg-gradient-to-br from-accent-green/5 to-accent-green/10"
              onExport={exportDevicesCSV}
              isLoading={exportingType === 'devices-csv'}
              disabled={!hasData}
            />

            <ExportCard
              title="Scan Results"
              description="Export current scan results to CSV with all device details and metrics."
              icon={<BarChart3 className="h-5 w-5 text-accent-green" />}
              format="CSV"
              formatColor="bg-accent-green/20 text-accent-green"
              bgColor="bg-gradient-to-br from-accent-green/5 to-accent-green/10"
              onExport={async () => {
                if (scanResult && scanResult.active_hosts) {
                  await exportScanCSV(scanResult.active_hosts);
                }
              }}
              isLoading={exportingType === 'scan-csv'}
              disabled={!hasData}
            />

            <ExportCard
              title="Topology Data"
              description="Export network topology structure as JSON for custom visualization or analysis."
              icon={<Network className="h-5 w-5 text-accent-amber" />}
              format="JSON"
              formatColor="bg-accent-amber/20 text-accent-amber"
              bgColor="bg-gradient-to-br from-accent-amber/5 to-accent-amber/10"
              onExport={async () => {
                if (scanResult && scanResult.active_hosts) {
                  await exportTopologyJSON(scanResult.active_hosts, scanResult.subnet);
                }
              }}
              isLoading={exportingType === 'topology-json'}
              disabled={!hasData}
            />

            <ExportCard
              title="Raw Scan Data"
              description="Export complete scan result with all metadata in JSON format."
              icon={<Database className="h-5 w-5 text-accent-amber" />}
              format="JSON"
              formatColor="bg-accent-amber/20 text-accent-amber"
              bgColor="bg-gradient-to-br from-accent-amber/5 to-accent-amber/10"
              onExport={async () => {
                if (scanResult) {
                  await exportScanJSON(scanResult);
                }
              }}
              isLoading={exportingType === 'scan-json'}
              disabled={!hasData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
