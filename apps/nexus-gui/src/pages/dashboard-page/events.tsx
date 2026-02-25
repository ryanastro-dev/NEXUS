import { Activity, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';

import type { NetworkEventType } from '../../hooks/useMonitoring';

export interface DashboardActivityEventCopy {
  eventUnknown: string;
  eventMonitoringStarted: string;
  eventMonitoringStopped: string;
  eventScanStarted: string;
  eventScanProgress: string;
  eventScanCompleted: string;
  eventNewDevice: string;
  eventDeviceOffline: string;
  eventDeviceOnline: string;
  eventIpChanged: string;
  eventErrorPrefix: string;
}

function formatTemplate(template: string, replacements: Record<string, string | number>): string {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function eventLabel(event: NetworkEventType, copy: DashboardActivityEventCopy): string {
  switch (event.type) {
    case 'MonitoringStarted':
      return formatTemplate(copy.eventMonitoringStarted, {
        seconds: event.data.interval_seconds,
      });
    case 'MonitoringStopped':
      return copy.eventMonitoringStopped;
    case 'ScanStarted':
      return formatTemplate(copy.eventScanStarted, {
        scanNumber: event.data.scan_number,
      });
    case 'ScanProgress':
      return formatTemplate(copy.eventScanProgress, {
        phase: event.data.phase,
        message: event.data.message,
      });
    case 'ScanCompleted':
      return formatTemplate(copy.eventScanCompleted, {
        scanNumber: event.data.scan_number,
        hostsFound: event.data.hosts_found,
      });
    case 'NewDeviceDiscovered':
      return formatTemplate(copy.eventNewDevice, {
        target: event.data.hostname || event.data.ip,
      });
    case 'DeviceWentOffline':
      return formatTemplate(copy.eventDeviceOffline, {
        target: event.data.hostname || event.data.last_ip,
      });
    case 'DeviceCameOnline':
      return formatTemplate(copy.eventDeviceOnline, {
        target: event.data.hostname || event.data.ip,
      });
    case 'DeviceIpChanged':
      return formatTemplate(copy.eventIpChanged, {
        oldIp: event.data.old_ip,
        newIp: event.data.new_ip,
      });
    case 'MonitoringError':
      return `${copy.eventErrorPrefix}: ${event.data.message}`;
    default:
      return copy.eventUnknown;
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
