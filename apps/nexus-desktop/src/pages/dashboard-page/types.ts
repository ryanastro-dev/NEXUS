import type { AlertRecord, DeviceRecord, NetworkHealth, NetworkStats } from '../../lib/api/types';

export interface DashboardPayloadView {
  devices: DeviceRecord[];
  stats: NetworkStats | null;
  health: NetworkHealth | null;
  alerts: AlertRecord[];
  fetchedAt: Date;
}

export interface ScanTrendDatum {
  label: string;
  hosts: number;
  duration: number;
}

export interface DeviceTypeDatum {
  type: string;
  count: number;
}
