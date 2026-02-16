import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { NetworkEventType, UseMonitoringReturn } from "../hooks/useMonitoring";
import { useScanContext } from "../hooks/useScan";
import { useDashboardData } from "../hooks/useDashboardData";

const CARD =
  "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65";

const ScanThroughputChart = lazy(() => import("../components/dashboard/charts/ScanThroughputChart"));
const DeviceCompositionChart = lazy(
  () => import("../components/dashboard/charts/DeviceCompositionChart"),
);

function ChartFallback({ heightClass }: { heightClass: string }) {
  return (
    <div className={`${heightClass} animate-pulse rounded-xl bg-slate-100/70 dark:bg-slate-900/60`} />
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  };

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-text-muted">{title}</p>
          <p className="text-3xl font-black text-text-primary">{value}</p>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${toneClasses[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text-primary">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          className={`h-2 rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function eventLabel(event: NetworkEventType): string {
  switch (event.type) {
    case "MonitoringStarted":
      return `Monitoring started (${event.data.interval_seconds}s interval)`;
    case "MonitoringStopped":
      return "Monitoring stopped";
    case "ScanStarted":
      return `Scan #${event.data.scan_number} started`;
    case "ScanProgress":
      return `${event.data.phase}: ${event.data.message}`;
    case "ScanCompleted":
      return `Scan #${event.data.scan_number} completed (${event.data.hosts_found} hosts)`;
    case "NewDeviceDiscovered":
      return `New device ${event.data.hostname || event.data.ip}`;
    case "DeviceWentOffline":
      return `Device offline ${event.data.hostname || event.data.last_ip}`;
    case "DeviceCameOnline":
      return `Device online ${event.data.hostname || event.data.ip}`;
    case "DeviceIpChanged":
      return `IP changed ${event.data.old_ip} -> ${event.data.new_ip}`;
    case "MonitoringError":
      return `Error: ${event.data.message}`;
    default:
      return "Unknown event";
  }
}

function eventIcon(event: NetworkEventType) {
  if (event.type === "MonitoringError") {
    return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  }
  if (event.type === "NewDeviceDiscovered" || event.type === "DeviceCameOnline") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (event.type === "DeviceWentOffline") {
    return <WifiOff className="h-4 w-4 text-amber-500" />;
  }
  return <Activity className="h-4 w-4 text-cyan-500" />;
}

interface DashboardProps {
  monitor: UseMonitoringReturn;
}

export default function Dashboard({ monitor }: DashboardProps) {
  const { scanResult } = useScanContext();
  const latestEvent = monitor.events[0];
  const {
    payload,
    isLoading,
    isRefreshing,
    error,
    fetchDashboardData,
    activeDevices24h,
    unknownDevices,
    criticalAlerts,
    avgLatency,
    scanTrendData,
    deviceTypeData,
    riskLabel,
  } = useDashboardData(scanResult, latestEvent);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <p className="text-sm text-text-secondary">Loading command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />
      </div>

      <div className="relative z-10 space-y-6">
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
              <h1 className="text-2xl font-black text-text-primary sm:text-4xl">
                Operational Dashboard
              </h1>
              <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
                Live monitoring, security posture, scan telemetry, and device intelligence in a
                single control surface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void fetchDashboardData(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() =>
                  monitor.status.is_running
                    ? void monitor.stopMonitoring()
                    : void monitor.startMonitoring(monitor.status.interval_seconds || 60)
                }
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
                {monitor.status.is_running ? "Active" : "Idle"}
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
              <p className="text-sm font-bold text-text-primary">
                {payload.fetchedAt.toLocaleTimeString()}
              </p>
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

        {error && (
          <div className="rounded-2xl border border-rose-300/60 bg-rose-100/80 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active (24h)"
            value={String(activeDevices24h)}
            subtitle={`${payload.devices.length} known devices`}
            icon={<Wifi className="h-5 w-5" />}
            tone="cyan"
          />
          <StatCard
            title="Security Score"
            value={`${payload.health?.score ?? 0}%`}
            subtitle={`Grade ${payload.health?.grade ?? "N/A"} • ${payload.health?.status ?? "No Data"}`}
            icon={<Shield className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            title="Unidentified"
            value={String(unknownDevices)}
            subtitle="Missing vendor/type fingerprint"
            icon={<Cpu className="h-5 w-5" />}
            tone="amber"
          />
          <StatCard
            title="Critical Alerts"
            value={String(criticalAlerts)}
            subtitle={`${payload.alerts.length} unread alerts`}
            icon={<ShieldAlert className="h-5 w-5" />}
            tone="rose"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD} p-5 xl:col-span-8`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Scan Throughput</h2>
              <p className="text-xs text-text-secondary">Hosts and duration per scan</p>
            </div>
            <div className="h-72">
              <Suspense fallback={<ChartFallback heightClass="h-72" />}>
                <ScanThroughputChart data={scanTrendData} />
              </Suspense>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD} space-y-5 p-5 xl:col-span-4`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Security Posture</h2>
              <Gauge className="h-5 w-5 text-emerald-500" />
            </div>
            <BreakdownRow
              label="Security"
              value={payload.health?.breakdown.security ?? 0}
              colorClass="bg-emerald-500"
            />
            <BreakdownRow
              label="Stability"
              value={payload.health?.breakdown.stability ?? 0}
              colorClass="bg-cyan-500"
            />
            <BreakdownRow
              label="Compliance"
              value={payload.health?.breakdown.compliance ?? 0}
              colorClass="bg-amber-500"
            />
            <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
              {(payload.health?.insights ?? ["No insights available"]).slice(0, 4).map((i) => (
                <p key={i} className="text-xs text-text-secondary">
                  {i}
                </p>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className={`${CARD} p-5 xl:col-span-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Device Composition</h2>
              <Cpu className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="h-64">
              <Suspense fallback={<ChartFallback heightClass="h-64" />}>
                <DeviceCompositionChart data={deviceTypeData} />
              </Suspense>
            </div>
          </div>

          <div className={`${CARD} p-5 xl:col-span-7`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Live Activity Stream</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={monitor.clearEvents}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
                <div className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                  {monitor.status.is_running ? "Live" : "Paused"}
                </div>
              </div>
            </div>

            {monitor.error && (
              <div className="mb-3 rounded-lg border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                {monitor.error}
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {monitor.events.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300/80 text-sm text-text-muted dark:border-slate-700">
                  <Bell className="h-6 w-6" />
                  <p>No recent events captured</p>
                </div>
              ) : (
                monitor.events.slice(0, 10).map((event, idx) => (
                  <div
                    key={`${event.type}-${idx}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-100/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    {eventIcon(event)}
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary">{eventLabel(event)}</p>
                      <p className="text-xs text-text-muted">Event #{monitor.events.length - idx}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`${CARD} p-4`}>
            <div className="mb-2 flex items-center gap-2">
              <Timer className="h-4 w-4 text-cyan-500" />
              <p className="text-sm font-bold text-text-primary">Average Latency</p>
            </div>
            <p className="text-2xl font-black text-text-primary">
              {avgLatency !== null ? `${avgLatency} ms` : "No data"}
            </p>
            <p className="text-xs text-text-secondary">Computed from latest active scan results.</p>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-bold text-text-primary">Risk Devices</p>
            </div>
            <p className="text-2xl font-black text-text-primary">
              {payload.stats?.high_risk_devices ?? 0}
            </p>
            <p className="text-xs text-text-secondary">Devices with risk score above policy threshold.</p>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-bold text-text-primary">Last Scan</p>
            </div>
            <p className="text-2xl font-black text-text-primary">
              {payload.stats?.last_scan_time
                ? new Date(payload.stats.last_scan_time).toLocaleTimeString()
                : "Never"}
            </p>
            <p className="text-xs text-text-secondary">Latest persisted network scan timestamp.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
