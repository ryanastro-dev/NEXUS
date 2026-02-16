import type { NetworkEventType } from '../../../lib/api/types';

import type { StreamEvent } from './types';

export function eventToStreamEntry(event: NetworkEventType): StreamEvent {
  const timestamp = new Date().toTimeString().slice(0, 8);

  switch (event.type) {
    case 'MonitoringStarted':
      return {
        id: `${Date.now()}-monitoring-start`,
        timestamp,
        message: `Monitoring started (${event.data.interval_seconds}s interval)`,
        color: '#10B981',
      };
    case 'MonitoringStopped':
      return {
        id: `${Date.now()}-monitoring-stop`,
        timestamp,
        message: 'Monitoring stopped',
        color: '#F59E0B',
      };
    case 'ScanStarted':
      return {
        id: `${Date.now()}-scan-start-${event.data.scan_number}`,
        timestamp,
        message: `Scan #${event.data.scan_number} started`,
        color: '#00D9FF',
      };
    case 'ScanProgress':
      return {
        id: `${Date.now()}-scan-progress-${event.data.phase}-${event.data.percent}`,
        timestamp,
        message: `${event.data.phase}: ${event.data.message}`,
        color: '#38BDF8',
      };
    case 'ScanCompleted':
      return {
        id: `${Date.now()}-scan-complete-${event.data.scan_number}`,
        timestamp,
        message: `Scan #${event.data.scan_number} completed (${event.data.hosts_found} hosts, ${(
          event.data.duration_ms / 1000
        ).toFixed(1)}s)`,
        color: '#22C55E',
      };
    case 'NewDeviceDiscovered':
      return {
        id: `${Date.now()}-new-device-${event.data.mac}`,
        timestamp,
        message: `New device ${event.data.hostname || event.data.ip} (${event.data.device_type})`,
        color: '#14B8A6',
      };
    case 'DeviceWentOffline':
      return {
        id: `${Date.now()}-offline-${event.data.mac}`,
        timestamp,
        message: `Device offline ${event.data.hostname || event.data.last_ip}`,
        color: '#EF4444',
      };
    case 'DeviceCameOnline':
      return {
        id: `${Date.now()}-online-${event.data.mac}`,
        timestamp,
        message: `Device online ${event.data.hostname || event.data.ip}`,
        color: '#10B981',
      };
    case 'DeviceIpChanged':
      return {
        id: `${Date.now()}-ip-change-${event.data.mac}`,
        timestamp,
        message: `IP changed ${event.data.old_ip} -> ${event.data.new_ip}`,
        color: '#F97316',
      };
    case 'MonitoringError':
      return {
        id: `${Date.now()}-monitor-error`,
        timestamp,
        message: `Monitoring error: ${event.data.message}`,
        color: '#EF4444',
      };
    default:
      return {
        id: `${Date.now()}-unknown`,
        timestamp,
        message: 'Unknown network event',
        color: '#94A3B8',
      };
  }
}

export function nextStreamStateLabel(
  currentLabel: string,
  event: NetworkEventType,
  hasScanData: boolean,
): string {
  if (event.type === 'MonitoringStarted') {
    return 'MONITORING';
  }
  if (event.type === 'MonitoringStopped') {
    return 'IDLE';
  }
  if (event.type === 'ScanStarted') {
    return 'SCANNING';
  }
  if (event.type === 'ScanCompleted' && hasScanData) {
    return 'CONNECTED';
  }
  return currentLabel;
}

export function resolveEmptyStreamMessage(
  streamConnected: boolean,
  hasScanData: boolean,
): string {
  if (!streamConnected) {
    return 'Event stream unavailable.';
  }
  if (hasScanData) {
    return 'No network events yet...';
  }
  return 'Start scan or monitoring to stream events...';
}
