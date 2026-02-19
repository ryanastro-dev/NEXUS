import { Activity, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';

import type { NetworkEventType } from '../../hooks/useMonitoring';

export function eventLabel(event: NetworkEventType): string {
  switch (event.type) {
    case 'MonitoringStarted':
      return `Monitoring started (${event.data.interval_seconds}s interval)`;
    case 'MonitoringStopped':
      return 'Monitoring stopped';
    case 'ScanStarted':
      return `Scan #${event.data.scan_number} started`;
    case 'ScanProgress':
      return `${event.data.phase}: ${event.data.message}`;
    case 'ScanCompleted':
      return `Scan #${event.data.scan_number} completed (${event.data.hosts_found} hosts)`;
    case 'NewDeviceDiscovered':
      return `New device ${event.data.hostname || event.data.ip}`;
    case 'DeviceWentOffline':
      return `Device offline ${event.data.hostname || event.data.last_ip}`;
    case 'DeviceCameOnline':
      return `Device online ${event.data.hostname || event.data.ip}`;
    case 'DeviceIpChanged':
      return `IP changed ${event.data.old_ip} -> ${event.data.new_ip}`;
    case 'MonitoringError':
      return `Error: ${event.data.message}`;
    default:
      return 'Unknown event';
  }
}

export function eventIcon(event: NetworkEventType) {
  if (event.type === 'MonitoringError') {
    return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  }
  if (event.type === 'NewDeviceDiscovered' || event.type === 'DeviceCameOnline') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (event.type === 'DeviceWentOffline') {
    return <WifiOff className="h-4 w-4 text-amber-500" />;
  }
  return <Activity className="h-4 w-4 text-cyan-500" />;
}
