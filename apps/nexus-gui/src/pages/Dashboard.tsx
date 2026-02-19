import { Loader2 } from 'lucide-react';

import type { UseMonitoringReturn } from '../hooks/useMonitoring';
import { useDashboardData } from '../hooks/useDashboardData';
import { useScanContext } from '../hooks/useScan';
import {
  DashboardActivitySection,
  DashboardHeaderSection,
  DashboardKpiSection,
  DashboardMetaSection,
  DashboardThroughputSection,
} from './dashboard-page';

function resolveMonitoringStartPreferences(
  fallbackInterval: number,
): { intervalSeconds: number; preferredInterface?: string } {
  try {
    const rawSettings = localStorage.getItem('netmapper-settings');
    if (!rawSettings) {
      return { intervalSeconds: fallbackInterval };
    }

    const parsed = JSON.parse(rawSettings);
    const parsedInterval = Number(parsed?.monitoringInterval);
    const intervalSeconds =
      Number.isFinite(parsedInterval) && parsedInterval > 0
        ? parsedInterval
        : fallbackInterval;
    const preferredInterface =
      typeof parsed?.preferredInterface === 'string' && parsed.preferredInterface.trim().length > 0
        ? parsed.preferredInterface.trim()
        : undefined;

    return { intervalSeconds, preferredInterface };
  } catch {
    return { intervalSeconds: fallbackInterval };
  }
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
    latestThroughput,
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
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />
      </div>

      <div className="relative z-10 space-y-4 sm:space-y-5">
        <DashboardHeaderSection
          monitor={monitor}
          payload={payload}
          riskLabel={riskLabel}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            void fetchDashboardData(true);
          }}
          onToggleMonitoring={() => {
            if (monitor.status.is_running) {
              void monitor.stopMonitoring();
            } else {
              const fallbackInterval = monitor.status.interval_seconds || 60;
              const { intervalSeconds, preferredInterface } =
                resolveMonitoringStartPreferences(fallbackInterval);
              void monitor.startMonitoring(intervalSeconds, preferredInterface);
            }
          }}
        />

        {error && (
          <div className="rounded-2xl border border-rose-300/60 bg-rose-100/80 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <DashboardKpiSection
          payload={payload}
          activeDevices24h={activeDevices24h}
          unknownDevices={unknownDevices}
          criticalAlerts={criticalAlerts}
        />

        <DashboardThroughputSection
          payload={payload}
          scanTrendData={scanTrendData}
          latestThroughput={latestThroughput}
        />

        <DashboardActivitySection monitor={monitor} deviceTypeData={deviceTypeData} />

        <DashboardMetaSection
          avgLatency={avgLatency}
          highRiskDevices={payload.stats?.high_risk_devices ?? 0}
          lastScanTime={payload.stats?.last_scan_time}
        />
      </div>
    </div>
  );
}
