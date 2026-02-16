import type { ScanResult } from '../../lib/api/types';

import type { DashboardPayload, DeviceTypePoint, ScanTrendPoint } from './types';

export function selectActiveDevices24h(payload: DashboardPayload): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return payload.devices.filter((device) => new Date(device.last_seen).getTime() > cutoff)
    .length;
}

export function selectUnknownDevices(payload: DashboardPayload): number {
  return payload.devices.filter(
    (device) => !device.device_type || device.device_type === 'UNKNOWN' || !device.vendor,
  ).length;
}

export function selectCriticalAlerts(payload: DashboardPayload): number {
  return payload.alerts.filter(
    (alert) => !alert.is_read && alert.severity.toLowerCase() === 'critical',
  ).length;
}

export function selectAverageLatency(
  scanResult: ScanResult | null,
  payload: DashboardPayload,
): number | null {
  const liveLatencies =
    scanResult?.active_hosts
      .map((host) => host.response_time_ms)
      .filter((latency): latency is number => latency !== null && latency !== undefined) ?? [];

  if (liveLatencies.length > 0) {
    return Math.round(liveLatencies.reduce((sum, latency) => sum + latency, 0) / liveLatencies.length);
  }

  const telemetryPoints = payload.telemetryLatency?.points ?? [];
  if (telemetryPoints.length === 0) {
    return null;
  }

  return Math.round(telemetryPoints[telemetryPoints.length - 1].metric_value);
}

export function selectScanTrendData(payload: DashboardPayload): ScanTrendPoint[] {
  const hostPoints = payload.telemetryHosts?.points ?? [];
  const durationPoints = payload.telemetryDuration?.points ?? [];
  if (hostPoints.length > 0 && durationPoints.length > 0) {
    const durationByLabel = new Map<string, number>();
    durationPoints.forEach((point) => {
      durationByLabel.set(point.label || point.captured_at, point.metric_value);
    });

    return hostPoints.map((point) => {
      const key = point.label || point.captured_at;
      const capturedAt = new Date(point.captured_at);
      const durationMs = durationByLabel.get(key) ?? 0;
      return {
        label: capturedAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        hosts: Math.round(point.metric_value),
        duration: Number((durationMs / 1000).toFixed(1)),
      };
    });
  }

  return [...payload.scans].reverse().map((scan) => ({
    label: new Date(scan.scan_time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    hosts: scan.total_hosts,
    duration: Number((scan.duration_ms / 1000).toFixed(1)),
  }));
}

export function selectDeviceTypeData(payload: DashboardPayload): DeviceTypePoint[] {
  if (payload.distribution) {
    return Object.entries(payload.distribution)
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }

  const counts = new Map<string, number>();
  payload.devices.forEach((device) => {
    const key = device.device_type || 'UNKNOWN';
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

export function selectRiskLabel(payload: DashboardPayload): string {
  const score = payload.health?.score ?? 0;
  if (score >= 85) {
    return 'Hardened';
  }
  if (score >= 70) {
    return 'Stable';
  }
  if (score >= 50) {
    return 'At Risk';
  }
  return 'Critical';
}
