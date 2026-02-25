import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AlertRecord } from '../../lib/api/types';
import type { AlertFilter, AlertStats } from './constants';

export interface AlertVisualConfig {
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

type AlertSeverityBucket = 'critical' | 'warning' | 'info';

function normalizeSeverityBucket(severity: string): AlertSeverityBucket {
  const normalized = severity.toLowerCase();
  if (normalized === 'critical') {
    return 'critical';
  }
  if (
    normalized === 'warning' ||
    normalized === 'error' ||
    normalized === 'high' ||
    normalized === 'medium'
  ) {
    return 'warning';
  }
  return 'info';
}

export function buildAlertStats(alerts: AlertRecord[]): AlertStats {
  return {
    total: alerts.length,
    critical: alerts.filter((alert) => normalizeSeverityBucket(alert.severity) === 'critical')
      .length,
    warnings: alerts.filter((alert) => normalizeSeverityBucket(alert.severity) === 'warning')
      .length,
    unread: alerts.filter((alert) => !alert.is_read).length,
  };
}

export function filterAlerts(alerts: AlertRecord[], filter: AlertFilter): AlertRecord[] {
  return alerts.filter((alert) => {
    const bucket = normalizeSeverityBucket(alert.severity);
    if (filter === 'critical') return bucket === 'critical';
    if (filter === 'warnings') return bucket === 'warning';
    if (filter === 'info') return bucket === 'info';
    if (filter === 'unread') return !alert.is_read;
    return true;
  });
}

export function getAlertConfig(severity: string): AlertVisualConfig {
  const bucket = normalizeSeverityBucket(severity);
  if (bucket === 'critical') {
    return {
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'text-accent-red',
      bg: 'bg-accent-red/10',
      border: 'border-l-accent-red',
    };
  }
  if (bucket === 'warning') {
    return {
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-accent-amber',
      bg: 'bg-accent-amber/10',
      border: 'border-l-accent-amber',
    };
  }
  return {
    icon: <Info className="h-5 w-5" />,
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/10',
    border: 'border-l-accent-blue',
  };
}

export function formatAlertRelativeDate(
  dateString: string,
  locale: string,
  copy: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  },
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return copy.justNow;
  if (diffMins < 60) return copy.minutesAgo.replace('{count}', String(diffMins));
  if (diffHours < 24) return copy.hoursAgo.replace('{count}', String(diffHours));
  if (diffDays < 7) return copy.daysAgo.replace('{count}', String(diffDays));
  return date.toLocaleDateString(locale);
}

export function formatAlertTypeLabel(alertType: string): string {
  return alertType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
