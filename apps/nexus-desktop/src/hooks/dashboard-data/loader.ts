import { tauriClient } from '../../lib/api/tauri-client';

import type { DashboardPayload } from './types';

function resolveDistributionByType(payload: unknown): Record<string, number> | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'by_type' in payload &&
    payload.by_type &&
    typeof payload.by_type === 'object'
  ) {
    return payload.by_type as Record<string, number>;
  }

  return null;
}

export async function fetchDashboardPayload(): Promise<DashboardPayload> {
  const [
    devices,
    stats,
    health,
    scans,
    alerts,
    distributionPayload,
    telemetryHosts,
    telemetryDuration,
    telemetryLatency,
    telemetryThroughput,
  ] = await Promise.all([
    tauriClient.getAllDevices().catch(() => []),
    tauriClient.getNetworkStats().catch(() => null),
    tauriClient.getNetworkHealth().catch(() => null),
    tauriClient.getScanHistory(14).catch(() => []),
    tauriClient.getUnreadAlerts().catch(() => []),
    tauriClient.getDeviceDistribution().catch(() => null),
    tauriClient.getTelemetrySeries('scan.hosts_found', 14).catch(() => null),
    tauriClient.getTelemetrySeries('scan.duration_ms', 14).catch(() => null),
    tauriClient.getTelemetrySeries('scan.avg_latency_ms', 20).catch(() => null),
    tauriClient.getTelemetrySeries('scan.throughput_hosts_per_sec', 20).catch(() => null),
  ]);

  return {
    devices,
    stats,
    health,
    scans,
    alerts,
    distribution: resolveDistributionByType(distributionPayload),
    telemetryHosts,
    telemetryDuration,
    telemetryLatency,
    telemetryThroughput,
    fetchedAt: new Date(),
  };
}
