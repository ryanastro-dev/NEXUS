import type { NetworkEventType } from './types';

export function getEventStyle(eventType: string): {
  icon: string;
  color: string;
} {
  switch (eventType) {
    case 'MonitoringStarted':
      return { icon: '▶️', color: 'text-green-500' };
    case 'MonitoringStopped':
      return { icon: '⏹️', color: 'text-red-500' };
    case 'ScanStarted':
      return { icon: '🔍', color: 'text-blue-500' };
    case 'ScanProgress':
      return { icon: '⏳', color: 'text-yellow-500' };
    case 'ScanCompleted':
      return { icon: '✅', color: 'text-green-500' };
    case 'NewDeviceDiscovered':
      return { icon: '🆕', color: 'text-cyan-500' };
    case 'DeviceWentOffline':
      return { icon: '📴', color: 'text-red-500' };
    case 'DeviceCameOnline':
      return { icon: '📶', color: 'text-green-500' };
    case 'DeviceIpChanged':
      return { icon: '🔄', color: 'text-orange-500' };
    case 'MonitoringError':
      return { icon: '❌', color: 'text-red-500' };
    default:
      return { icon: '📌', color: 'text-gray-500' };
  }
}

export function formatEventMessage(event: NetworkEventType): string {
  switch (event.type) {
    case 'MonitoringStarted':
      return `Monitoring started (interval: ${event.data.interval_seconds}s)`;
    case 'MonitoringStopped':
      return 'Monitoring stopped';
    case 'ScanStarted':
      return `Scan #${event.data.scan_number} started`;
    case 'ScanProgress':
      return `${event.data.phase}: ${event.data.message}`;
    case 'ScanCompleted':
      return `Scan #${event.data.scan_number} complete: ${event.data.hosts_found} hosts (${(event.data.duration_ms / 1000).toFixed(1)}s)`;
    case 'NewDeviceDiscovered':
      return `New device: ${event.data.hostname || event.data.ip} (${event.data.device_type})`;
    case 'DeviceWentOffline':
      return `Offline: ${event.data.hostname || event.data.last_ip}`;
    case 'DeviceCameOnline':
      return `Online: ${event.data.hostname || event.data.ip}`;
    case 'DeviceIpChanged':
      return `IP changed: ${event.data.old_ip} → ${event.data.new_ip}`;
    case 'MonitoringError':
      return `Error: ${event.data.message}`;
    default:
      return 'Unknown event';
  }
}
