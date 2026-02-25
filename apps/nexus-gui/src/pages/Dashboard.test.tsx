import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DashboardPayload } from '../hooks/dashboard-data';
import Dashboard from './Dashboard';

const pageMocks = vi.hoisted(() => ({
  useMonitoring: vi.fn(),
  useDashboardData: vi.fn(),
  useScanContext: vi.fn(),
}));

vi.mock('../hooks/useMonitoring', () => ({
  useMonitoring: pageMocks.useMonitoring,
}));

vi.mock('../hooks/useDashboardData', () => ({
  useDashboardData: pageMocks.useDashboardData,
}));

vi.mock('../hooks/useScan', () => ({
  useScanContext: pageMocks.useScanContext,
}));

vi.mock('./dashboard-page', () => ({
  DashboardHeaderSection: ({ riskLabel }: { riskLabel: string }) => (
    <section data-testid="dashboard-header">{riskLabel}</section>
  ),
  DashboardKpiSection: ({ activeDevices24h }: { activeDevices24h: number }) => (
    <section data-testid="dashboard-kpi">{activeDevices24h}</section>
  ),
  DashboardThroughputSection: ({ latestThroughput }: { latestThroughput: number | null }) => (
    <section data-testid="dashboard-throughput">{String(latestThroughput)}</section>
  ),
  DashboardActivitySection: ({ deviceTypeData }: { deviceTypeData: Array<{ type: string }> }) => (
    <section data-testid="dashboard-activity">{deviceTypeData.length}</section>
  ),
  DashboardMetaSection: ({ avgLatency }: { avgLatency: number | null }) => (
    <section data-testid="dashboard-meta">{String(avgLatency)}</section>
  ),
}));

function buildPayload(): DashboardPayload {
  return {
    devices: [],
    stats: {
      total_devices: 2,
      online_devices: 2,
      offline_devices: 0,
      new_devices_24h: 1,
      high_risk_devices: 0,
      total_scans: 3,
      last_scan_time: '2026-02-25T08:00:00Z',
    },
    health: {
      score: 74,
      grade: 'B',
      status: 'Stable',
      breakdown: {
        security: 72,
        stability: 76,
        compliance: 74,
      },
      insights: [],
    },
    scans: [],
    alerts: [],
    distribution: null,
    telemetryHosts: null,
    telemetryDuration: null,
    telemetryLatency: null,
    telemetryThroughput: null,
    fetchedAt: new Date('2026-02-25T08:00:00Z'),
  };
}

function setupCommonMocks() {
  pageMocks.useScanContext.mockReturnValue({
    scanResult: null,
  });
  pageMocks.useMonitoring.mockReturnValue({
    events: [],
    status: {
      is_running: false,
      interval_seconds: 60,
      scan_count: 0,
      devices_online: 0,
      devices_total: 0,
    },
    startMonitoring: vi.fn().mockResolvedValue(undefined),
    stopMonitoring: vi.fn().mockResolvedValue(undefined),
  });
}

describe('Dashboard snapshots', () => {
  it('renders loading state snapshot', () => {
    setupCommonMocks();
    pageMocks.useDashboardData.mockReturnValue({
      payload: buildPayload(),
      isLoading: true,
      isRefreshing: false,
      error: null,
      fetchDashboardData: vi.fn(),
      activeDevices24h: 0,
      unknownDevices: 0,
      criticalAlerts: 0,
      avgLatency: null,
      scanTrendData: [],
      deviceTypeData: [],
      latestThroughput: null,
      riskLabel: 'No Data',
    });

    const { asFragment } = render(<Dashboard />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders loaded state snapshot', () => {
    setupCommonMocks();
    pageMocks.useDashboardData.mockReturnValue({
      payload: buildPayload(),
      isLoading: false,
      isRefreshing: false,
      error: null,
      fetchDashboardData: vi.fn(),
      activeDevices24h: 2,
      unknownDevices: 1,
      criticalAlerts: 0,
      avgLatency: 18,
      scanTrendData: [],
      deviceTypeData: [{ type: 'ROUTER', count: 1 }],
      latestThroughput: 1.3,
      riskLabel: 'Stable',
    });

    const { asFragment } = render(<Dashboard />);
    expect(asFragment()).toMatchSnapshot();
  });
});
