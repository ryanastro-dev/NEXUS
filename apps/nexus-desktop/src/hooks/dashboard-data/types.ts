import type {
  AlertRecord,
  DeviceRecord,
  NetworkHealth,
  NetworkStats,
  ScanRecord,
  TelemetrySeries,
} from '../../lib/api/types';

export interface DashboardPayload {
  devices: DeviceRecord[];
  stats: NetworkStats | null;
  health: NetworkHealth | null;
  scans: ScanRecord[];
  alerts: AlertRecord[];
  distribution: Record<string, number> | null;
  telemetryHosts: TelemetrySeries | null;
  telemetryDuration: TelemetrySeries | null;
  telemetryLatency: TelemetrySeries | null;
  telemetryThroughput: TelemetrySeries | null;
  fetchedAt: Date;
}

export interface ScanTrendPoint {
  label: string;
  hosts: number;
  duration: number;
}

export interface DeviceTypePoint {
  type: string;
  count: number;
}

export function createInitialDashboardPayload(): DashboardPayload {
  return {
    devices: [],
    stats: null,
    health: null,
    scans: [],
    alerts: [],
    distribution: null,
    telemetryHosts: null,
    telemetryDuration: null,
    telemetryLatency: null,
    telemetryThroughput: null,
    fetchedAt: new Date(),
  };
}
