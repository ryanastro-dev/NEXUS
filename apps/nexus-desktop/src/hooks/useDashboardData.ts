import { useCallback, useEffect, useMemo, useState } from "react";
import { tauriClient } from "../lib/api/tauri-client";
import type {
  AlertRecord,
  DeviceRecord,
  NetworkHealth,
  NetworkStats,
  ScanRecord,
  ScanResult,
} from "../lib/api/types";
import type { NetworkEventType } from "./useMonitoring";

interface DashboardPayload {
  devices: DeviceRecord[];
  stats: NetworkStats | null;
  health: NetworkHealth | null;
  scans: ScanRecord[];
  alerts: AlertRecord[];
  distribution: Record<string, number> | null;
  fetchedAt: Date;
}

const refreshEventTypes: NetworkEventType["type"][] = [
  "ScanCompleted",
  "NewDeviceDiscovered",
  "DeviceCameOnline",
  "DeviceWentOffline",
  "DeviceIpChanged",
];

export function useDashboardData(
  scanResult: ScanResult | null,
  latestEvent?: NetworkEventType,
) {
  const [payload, setPayload] = useState<DashboardPayload>({
    devices: [],
    stats: null,
    health: null,
    scans: [],
    alerts: [],
    distribution: null,
    fetchedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const [devices, stats, health, scans, alerts, distributionPayload] =
        await Promise.all([
          tauriClient.getAllDevices().catch(() => []),
          tauriClient.getNetworkStats().catch(() => null),
          tauriClient.getNetworkHealth().catch(() => null),
          tauriClient.getScanHistory(14).catch(() => []),
          tauriClient.getUnreadAlerts().catch(() => []),
          tauriClient.getDeviceDistribution().catch(() => null),
        ]);

      const distribution =
        distributionPayload &&
        typeof distributionPayload === "object" &&
        distributionPayload.by_type &&
        typeof distributionPayload.by_type === "object"
          ? (distributionPayload.by_type as Record<string, number>)
          : null;

      setPayload({
        devices,
        stats,
        health,
        scans,
        alerts,
        distribution,
        fetchedAt: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData(false);
    const timer = setInterval(() => {
      void fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    if (!refreshEventTypes.includes(latestEvent.type)) {
      return;
    }

    void fetchDashboardData(true);
  }, [latestEvent, fetchDashboardData]);

  const activeDevices24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return payload.devices.filter((d) => new Date(d.last_seen).getTime() > cutoff).length;
  }, [payload.devices]);

  const unknownDevices = useMemo(
    () =>
      payload.devices.filter(
        (d) => !d.device_type || d.device_type === "UNKNOWN" || !d.vendor,
      ).length,
    [payload.devices],
  );

  const criticalAlerts = useMemo(
    () =>
      payload.alerts.filter(
        (a) => !a.is_read && a.severity.toLowerCase() === "critical",
      ).length,
    [payload.alerts],
  );

  const avgLatency = useMemo(() => {
    const latencies =
      scanResult?.active_hosts
        .map((h) => h.response_time_ms)
        .filter((n): n is number => n !== null && n !== undefined) ?? [];
    if (latencies.length === 0) return null;
    return Math.round(latencies.reduce((sum, n) => sum + n, 0) / latencies.length);
  }, [scanResult]);

  const scanTrendData = useMemo(
    () =>
      [...payload.scans]
        .reverse()
        .map((scan) => ({
          label: new Date(scan.scan_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          hosts: scan.total_hosts,
          duration: Number((scan.duration_ms / 1000).toFixed(1)),
        })),
    [payload.scans],
  );

  const deviceTypeData = useMemo(() => {
    if (payload.distribution) {
      return Object.entries(payload.distribution)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    const counts = new Map<string, number>();
    for (const d of payload.devices) {
      const key = d.device_type || "UNKNOWN";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [payload.devices, payload.distribution]);

  const riskLabel = useMemo(() => {
    const score = payload.health?.score ?? 0;
    if (score >= 85) return "Hardened";
    if (score >= 70) return "Stable";
    if (score >= 50) return "At Risk";
    return "Critical";
  }, [payload.health]);

  return {
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
  };
}
