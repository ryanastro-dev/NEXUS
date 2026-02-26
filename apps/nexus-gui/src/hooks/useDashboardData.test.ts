import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AlertRecord,
  DeviceRecord,
  NetworkEventType,
  NetworkHealth,
  NetworkStats,
  ScanRecord,
  TelemetryEvent,
  TelemetrySeries,
} from '../lib/api/types';
import { useDashboardData } from './useDashboardData';

const dashboardMocks = vi.hoisted(() => ({
  getAllDevices: vi.fn<() => Promise<DeviceRecord[]>>(),
  getNetworkStats: vi.fn<() => Promise<NetworkStats | null>>(),
  getNetworkHealth: vi.fn<() => Promise<NetworkHealth | null>>(),
  getScanHistory: vi.fn<(limit?: number) => Promise<ScanRecord[]>>(),
  getUnreadAlerts: vi.fn<() => Promise<AlertRecord[]>>(),
  getDeviceDistribution: vi.fn<() => Promise<Record<string, unknown> | null>>(),
  getTelemetrySeries: vi.fn<
    (metricKey: string, limit?: number) => Promise<TelemetrySeries | null>
  >(),
  listenTelemetryEvents: vi.fn<
    (handler: (event: TelemetryEvent) => void) => Promise<() => void>
  >(),
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    getAllDevices: dashboardMocks.getAllDevices,
    getNetworkStats: dashboardMocks.getNetworkStats,
    getNetworkHealth: dashboardMocks.getNetworkHealth,
    getScanHistory: dashboardMocks.getScanHistory,
    getUnreadAlerts: dashboardMocks.getUnreadAlerts,
    getDeviceDistribution: dashboardMocks.getDeviceDistribution,
    getTelemetrySeries: dashboardMocks.getTelemetrySeries,
  },
}));

vi.mock('../lib/api/event-client', () => ({
  eventClient: {
    listenTelemetryEvents: dashboardMocks.listenTelemetryEvents,
  },
}));

function buildTelemetrySeries(metricKey: string, metricValue: number): TelemetrySeries {
  return {
    metric_key: metricKey,
    points: [
      {
        id: 1,
        captured_at: '2026-02-25T00:00:00.000Z',
        metric_key: metricKey,
        metric_value: metricValue,
        label: 'scan #1',
      },
    ],
  };
}

describe('useDashboardData', () => {
  let telemetryHandler: ((event: TelemetryEvent) => void) | null;

  beforeEach(() => {
    const nowMs = Date.now();
    const within24hIso = new Date(nowMs - 30 * 60 * 1000).toISOString();
    const slightlyOlderIso = new Date(nowMs - 80 * 60 * 1000).toISOString();
    const firstSeenRecentIso = new Date(nowMs - 4 * 60 * 60 * 1000).toISOString();
    const firstSeenOlderIso = new Date(nowMs - 30 * 60 * 60 * 1000).toISOString();
    const scanIso = new Date(nowMs - 20 * 60 * 1000).toISOString();
    const alertIso = new Date(nowMs - 10 * 60 * 1000).toISOString();

    telemetryHandler = null;
    dashboardMocks.getAllDevices.mockReset();
    dashboardMocks.getNetworkStats.mockReset();
    dashboardMocks.getNetworkHealth.mockReset();
    dashboardMocks.getScanHistory.mockReset();
    dashboardMocks.getUnreadAlerts.mockReset();
    dashboardMocks.getDeviceDistribution.mockReset();
    dashboardMocks.getTelemetrySeries.mockReset();
    dashboardMocks.listenTelemetryEvents.mockReset();
    dashboardMocks.listenTelemetryEvents.mockImplementation(async (handler) => {
      telemetryHandler = handler;
      return () => {
        telemetryHandler = null;
      };
    });

    dashboardMocks.getAllDevices.mockResolvedValue([
      {
        id: 1,
        mac: 'AA:BB:CC:DD:EE:01',
        first_seen: firstSeenRecentIso,
        last_seen: within24hIso,
        last_ip: '192.168.88.1',
        vendor: 'MikroTik',
        device_type: 'ROUTER',
      },
      {
        id: 2,
        mac: 'AA:BB:CC:DD:EE:02',
        first_seen: firstSeenOlderIso,
        last_seen: slightlyOlderIso,
        last_ip: '192.168.88.20',
      },
    ]);
    dashboardMocks.getNetworkStats.mockResolvedValue({
      total_devices: 2,
      online_devices: 2,
      offline_devices: 0,
      new_devices_24h: 1,
      high_risk_devices: 0,
      total_scans: 5,
      last_scan_time: scanIso,
    });
    dashboardMocks.getNetworkHealth.mockResolvedValue({
      score: 75,
      grade: 'B',
      status: 'Stable',
      breakdown: {
        security: 74,
        stability: 79,
        compliance: 72,
      },
      insights: ['Healthy baseline'],
    });
    dashboardMocks.getScanHistory.mockResolvedValue([
      {
        id: 1,
        scan_time: scanIso,
        interface_name: 'eth0',
        local_ip: '192.168.88.10',
        local_mac: '00:11:22:33:44:55',
        subnet: '192.168.88.0/24',
        scan_method: 'Active ARP + ICMP + TCP',
        arp_discovered: 2,
        icmp_discovered: 2,
        total_hosts: 2,
        duration_ms: 1500,
      },
    ]);
    dashboardMocks.getUnreadAlerts.mockResolvedValue([
      {
        id: 1,
        created_at: alertIso,
        alert_type: 'HIGH_RISK',
        message: 'critical alert',
        severity: 'CRITICAL',
        is_read: false,
      },
    ]);
    dashboardMocks.getDeviceDistribution.mockResolvedValue({
      by_type: {
        ROUTER: 1,
        UNKNOWN: 1,
      },
    });
    dashboardMocks.getTelemetrySeries.mockImplementation(async (metricKey) => {
      if (metricKey === 'scan.hosts_found') {
        return buildTelemetrySeries(metricKey, 2);
      }
      if (metricKey === 'scan.duration_ms') {
        return buildTelemetrySeries(metricKey, 1500);
      }
      if (metricKey === 'scan.avg_latency_ms') {
        return buildTelemetrySeries(metricKey, 28);
      }
      if (metricKey === 'scan.throughput_hosts_per_sec') {
        return buildTelemetrySeries(metricKey, 1.33);
      }
      return null;
    });
  });

  afterEach(() => {
    telemetryHandler = null;
  });

  it('loads dashboard payload and computes aggregate metrics', async () => {
    const { result } = renderHook(() => useDashboardData(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(dashboardMocks.getAllDevices).toHaveBeenCalledTimes(1);
    expect(result.current.payload.devices).toHaveLength(2);
    expect(result.current.activeDevices24h).toBe(2);
    expect(result.current.unknownDevices).toBe(1);
    expect(result.current.criticalAlerts).toBe(1);
    expect(result.current.avgLatency).toBe(28);
    expect(result.current.latestThroughput).toBe(1.33);
    expect(result.current.riskLabel).toBe('Stable');
  });

  it('refreshes payload on supported monitoring events only', async () => {
    const { rerender } = renderHook(
      ({ latestEvent }: { latestEvent?: NetworkEventType }) =>
        useDashboardData(null, latestEvent),
      {
        initialProps: { latestEvent: undefined as NetworkEventType | undefined },
      },
    );

    await waitFor(() => {
      expect(dashboardMocks.getAllDevices).toHaveBeenCalledTimes(1);
    });

    rerender({
      latestEvent: {
        type: 'MonitoringStarted',
        data: { interval_seconds: 30 },
      },
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(dashboardMocks.getAllDevices).toHaveBeenCalledTimes(1);

    rerender({
      latestEvent: {
        type: 'ScanCompleted',
        data: {
          scan_number: 2,
          hosts_found: 3,
          duration_ms: 1400,
        },
      },
    });

    await waitFor(() => {
      expect(dashboardMocks.getAllDevices).toHaveBeenCalledTimes(2);
    });
  });

  it('applies telemetry stream updates to derived latency', async () => {
    const { result } = renderHook(() => useDashboardData(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.avgLatency).toBe(28);

    act(() => {
      telemetryHandler?.({
        metric_key: 'scan.avg_latency_ms',
        metric_value: 12,
        label: 'live',
      });
    });

    await waitFor(() => {
      expect(result.current.avgLatency).toBe(12);
    });
  });
});
