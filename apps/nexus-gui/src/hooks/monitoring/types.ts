import type {
  MonitoringStatus as MonitoringStatusModel,
  NetworkEventType as NetworkEventTypeModel,
} from '../../lib/api/types';

export type MonitoringStatus = MonitoringStatusModel;
export type NetworkEventType = NetworkEventTypeModel;

export type ScanCompleteData = Extract<
  NetworkEventType,
  { type: 'ScanCompleted' }
>['data'];
export type NewDeviceDiscoveredData = Extract<
  NetworkEventType,
  { type: 'NewDeviceDiscovered' }
>['data'];

export interface MonitoringState {
  status: MonitoringStatus;
  isLoading: boolean;
  error: string | null;
  events: NetworkEventType[];
  currentPhase: string | null;
  currentProgress: number;
}

export interface UseMonitoringOptions {
  maxEvents?: number;
  onScanComplete?: (hostsFound: number, durationMs: number) => void;
  onNewDevice?: (device: NewDeviceDiscoveredData) => void;
}

export interface UseMonitoringReturn extends MonitoringState {
  startMonitoring: (
    intervalSeconds?: number,
    interfaceName?: string,
  ) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  clearEvents: () => void;
}

export type UnlistenFn = () => void;
