import type {
  MonitoringState,
  MonitoringStatus,
  NetworkEventType,
  NewDeviceDiscoveredData,
  ScanCompleteData,
} from './types';

function updateProgressState(
  currentPhase: MonitoringState['currentPhase'],
  currentProgress: MonitoringState['currentProgress'],
  networkEvent: NetworkEventType,
): Pick<MonitoringState, 'currentPhase' | 'currentProgress'> {
  if (networkEvent.type === 'ScanProgress') {
    return {
      currentPhase: networkEvent.data.phase,
      currentProgress: networkEvent.data.percent,
    };
  }

  if (networkEvent.type === 'ScanCompleted') {
    return {
      currentPhase: null,
      currentProgress: 0,
    };
  }

  if (networkEvent.type === 'ScanStarted') {
    return {
      currentPhase: 'Starting...',
      currentProgress: 0,
    };
  }

  return { currentPhase, currentProgress };
}

function updateStatusState(
  status: MonitoringStatus,
  networkEvent: NetworkEventType,
): MonitoringStatus {
  if (networkEvent.type === 'MonitoringStarted') {
    return {
      ...status,
      is_running: true,
      interval_seconds: networkEvent.data.interval_seconds,
    };
  }

  if (networkEvent.type === 'MonitoringStopped') {
    return {
      ...status,
      is_running: false,
    };
  }

  if (networkEvent.type === 'ScanCompleted') {
    return {
      ...status,
      scan_count: status.scan_count + 1,
      devices_total: networkEvent.data.hosts_found,
    };
  }

  return status;
}

export function reduceMonitoringState(
  previousState: MonitoringState,
  networkEvent: NetworkEventType,
  maxEvents: number,
): MonitoringState {
  const events = [networkEvent, ...previousState.events].slice(0, maxEvents);
  const progressState = updateProgressState(
    previousState.currentPhase,
    previousState.currentProgress,
    networkEvent,
  );
  const status = updateStatusState(previousState.status, networkEvent);

  return {
    ...previousState,
    events,
    currentPhase: progressState.currentPhase,
    currentProgress: progressState.currentProgress,
    status,
  };
}

export function extractScanCompleteData(
  networkEvent: NetworkEventType,
): ScanCompleteData | null {
  return networkEvent.type === 'ScanCompleted' ? networkEvent.data : null;
}

export function extractNewDeviceData(
  networkEvent: NetworkEventType,
): NewDeviceDiscoveredData | null {
  return networkEvent.type === 'NewDeviceDiscovered' ? networkEvent.data : null;
}
