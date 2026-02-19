import type { EngineEventType, NetworkEventType } from '../../../lib/api/types';

import type { StreamEvent } from './types';

const THREAD_LOG_PREFIX =
  /^(?:\d{4}-\d{2}-\d{2}T[^\s]+\s+)?(?:INFO|WARN|ERROR)\s+ThreadId\([^)]*\)\s+\d+:\s*/i;
const LEVEL_PREFIX = /^(?:INFO|WARN|ERROR)\s*[:\-]\s*/i;

function currentTimestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function sanitizeEngineMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Engine update';
  }

  const withoutThread = trimmed.replace(THREAD_LOG_PREFIX, '');
  const withoutLevel = withoutThread.replace(LEVEL_PREFIX, '');
  const compact = withoutLevel.trim();
  return compact.length > 0 ? compact : trimmed;
}

function severityColor(severity: 'info' | 'warn' | 'error'): string {
  switch (severity) {
    case 'warn':
      return '#F59E0B';
    case 'error':
      return '#EF4444';
    case 'info':
    default:
      return '#38BDF8';
  }
}

export function eventToStreamEntry(event: NetworkEventType): StreamEvent {
  const timestamp = currentTimestamp();

  switch (event.type) {
    case 'MonitoringStarted':
      return {
        id: `${Date.now()}-monitoring-start`,
        timestamp,
        message: `Monitoring started (${event.data.interval_seconds}s interval)`,
        rawMessage: `MonitoringStarted interval_seconds=${event.data.interval_seconds}`,
        color: '#10B981',
        severity: 'info',
        source: 'network',
      };
    case 'MonitoringStopped':
      return {
        id: `${Date.now()}-monitoring-stop`,
        timestamp,
        message: 'Monitoring stopped',
        rawMessage: 'MonitoringStopped',
        color: '#F59E0B',
        severity: 'warn',
        source: 'network',
      };
    case 'ScanStarted':
      return {
        id: `${Date.now()}-scan-start-${event.data.scan_number}`,
        timestamp,
        message: `Scan #${event.data.scan_number} started`,
        rawMessage: `ScanStarted scan_number=${event.data.scan_number}`,
        color: '#00D9FF',
        severity: 'info',
        source: 'network',
      };
    case 'ScanProgress':
      return {
        id: `${Date.now()}-scan-progress-${event.data.phase}-${event.data.percent}`,
        timestamp,
        message: `${event.data.phase}: ${event.data.message}`,
        rawMessage: `ScanProgress phase=${event.data.phase} percent=${event.data.percent} message=${event.data.message}`,
        color: '#38BDF8',
        severity: 'info',
        source: 'network',
      };
    case 'ScanCompleted':
      return {
        id: `${Date.now()}-scan-complete-${event.data.scan_number}`,
        timestamp,
        message: `Scan #${event.data.scan_number} completed (${event.data.hosts_found} hosts, ${(
          event.data.duration_ms / 1000
        ).toFixed(1)}s)`,
        rawMessage: `ScanCompleted scan_number=${event.data.scan_number} hosts_found=${event.data.hosts_found} duration_ms=${event.data.duration_ms}`,
        color: '#22C55E',
        severity: 'info',
        source: 'network',
      };
    case 'NewDeviceDiscovered':
      return {
        id: `${Date.now()}-new-device-${event.data.mac}`,
        timestamp,
        message: `New device ${event.data.hostname || event.data.ip} (${event.data.device_type})`,
        rawMessage: `NewDeviceDiscovered ip=${event.data.ip} mac=${event.data.mac} hostname=${event.data.hostname ?? ''} device_type=${event.data.device_type}`,
        color: '#14B8A6',
        severity: 'info',
        source: 'network',
      };
    case 'DeviceWentOffline':
      return {
        id: `${Date.now()}-offline-${event.data.mac}`,
        timestamp,
        message: `Device offline ${event.data.hostname || event.data.last_ip}`,
        rawMessage: `DeviceWentOffline mac=${event.data.mac} last_ip=${event.data.last_ip} hostname=${event.data.hostname ?? ''}`,
        color: '#EF4444',
        severity: 'warn',
        source: 'network',
        action: {
          kind: 'troubleshoot',
          label: 'Troubleshoot',
          target: {
            mac: event.data.mac,
            ip: event.data.last_ip,
            hostname: event.data.hostname,
          },
        },
      };
    case 'DeviceCameOnline':
      return {
        id: `${Date.now()}-online-${event.data.mac}`,
        timestamp,
        message: `Device online ${event.data.hostname || event.data.ip}`,
        rawMessage: `DeviceCameOnline mac=${event.data.mac} ip=${event.data.ip} hostname=${event.data.hostname ?? ''}`,
        color: '#10B981',
        severity: 'info',
        source: 'network',
      };
    case 'DeviceIpChanged':
      return {
        id: `${Date.now()}-ip-change-${event.data.mac}`,
        timestamp,
        message: `IP changed ${event.data.old_ip} -> ${event.data.new_ip}`,
        rawMessage: `DeviceIpChanged mac=${event.data.mac} old_ip=${event.data.old_ip} new_ip=${event.data.new_ip}`,
        color: '#F97316',
        severity: 'warn',
        source: 'network',
      };
    case 'MonitoringError':
      return {
        id: `${Date.now()}-monitor-error`,
        timestamp,
        message: `Monitoring error: ${event.data.message}`,
        rawMessage: `MonitoringError message=${event.data.message}`,
        color: '#EF4444',
        severity: 'error',
        source: 'network',
      };
    default:
      return {
        id: `${Date.now()}-unknown`,
        timestamp,
        message: 'Unknown network event',
        rawMessage: 'Unknown network event',
        color: '#94A3B8',
        severity: 'info',
        source: 'network',
      };
  }
}

export function engineEventToStreamEntry(event: EngineEventType): StreamEvent {
  const timestamp = currentTimestamp();

  switch (event.kind) {
    case 'warn': {
      const message = sanitizeEngineMessage(event.message);
      const separatorLike = /^=+$/.test(message);
      if (separatorLike) {
        return buildSessionSeparatorEntry('Scan Stage Boundary');
      }

      return {
        id: `${Date.now()}-engine-warn-${Math.random().toString(36).slice(2, 8)}`,
        timestamp,
        message,
        rawMessage: event.message,
        color: severityColor('warn'),
        severity: 'warn',
        source: 'engine',
      };
    }
    case 'error': {
      const message = sanitizeEngineMessage(event.message);
      return {
        id: `${Date.now()}-engine-error-${Math.random().toString(36).slice(2, 8)}`,
        timestamp,
        message,
        rawMessage: event.message,
        color: severityColor('error'),
        severity: 'error',
        source: 'engine',
      };
    }
    case 'info': {
      const message = sanitizeEngineMessage(event.message);
      const separatorLike = /^=+$/.test(message);
      if (separatorLike) {
        return buildSessionSeparatorEntry('Scan Stage Boundary');
      }

      return {
        id: `${Date.now()}-engine-info-${Math.random().toString(36).slice(2, 8)}`,
        timestamp,
        message,
        rawMessage: event.message,
        color: severityColor('info'),
        severity: 'info',
        source: 'engine',
      };
    }
    case 'scan_phase':
      return {
        id: `${Date.now()}-engine-phase-${event.phase}-${event.progress_pct}`,
        timestamp,
        message: `${event.phase} phase (${event.progress_pct}%)`,
        rawMessage: `scan_phase phase=${event.phase} progress_pct=${event.progress_pct}`,
        color: '#22D3EE',
        severity: 'info',
        source: 'engine',
      };
    case 'scan_persisted':
      return {
        id: `${Date.now()}-engine-persisted-${event.scan_id}`,
        timestamp,
        message: `Scan persisted (#${event.scan_id})`,
        rawMessage: `scan_persisted scan_id=${event.scan_id} path=${event.path}`,
        color: '#34D399',
        severity: 'info',
        source: 'engine',
      };
    case 'cancelled':
      return {
        id: `${Date.now()}-engine-cancelled-${Math.random().toString(36).slice(2, 8)}`,
        timestamp,
        message: `Scan cancelled during ${event.stage}`,
        rawMessage: `cancelled stage=${event.stage}`,
        color: '#F59E0B',
        severity: 'warn',
        source: 'engine',
      };
    default:
      return {
        id: `${Date.now()}-engine-unknown`,
        timestamp,
        message: 'Engine update',
        rawMessage: JSON.stringify(event),
        color: '#94A3B8',
        severity: 'info',
        source: 'engine',
      };
  }
}

export function buildSessionSeparatorEntry(title: string): StreamEvent {
  return {
    id: `${Date.now()}-session-separator-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: currentTimestamp(),
    message: `--- ${title} ---`,
    rawMessage: `--- ${title} ---`,
    color: '#64748B',
    variant: 'separator',
  };
}

export function nextStreamStateLabel(
  currentLabel: string,
  event: NetworkEventType,
  hasScanData: boolean,
): string {
  if (event.type === 'ScanStarted') {
    return 'SCANNING';
  }

  if (event.type === 'MonitoringStarted') {
    return 'MONITORING';
  }

  if (event.type === 'MonitoringStopped') {
    return 'IDLE';
  }

  if (event.type === 'ScanCompleted') {
    return 'CONNECTED';
  }

  if (event.type === 'ScanProgress') {
    const phase = event.data.phase.trim().toLowerCase();
    const scanFinished = event.data.percent >= 100 || phase === 'complete';
    const scanCancelled = phase === 'cancelled' || phase.includes('cancel');

    if (scanCancelled) {
      return hasScanData ? 'CONNECTED' : 'IDLE';
    }

    if (scanFinished) {
      return 'CONNECTED';
    }
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
