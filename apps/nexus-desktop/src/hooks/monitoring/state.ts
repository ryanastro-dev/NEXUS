import type { MonitoringState, MonitoringStatus } from './types';

export const initialStatus: MonitoringStatus = {
  is_running: false,
  interval_seconds: 60,
  scan_count: 0,
  devices_online: 0,
  devices_total: 0,
};

export function createInitialMonitoringState(): MonitoringState {
  return {
    status: initialStatus,
    isLoading: false,
    error: null,
    events: [],
    currentPhase: null,
    currentProgress: 0,
  };
}
