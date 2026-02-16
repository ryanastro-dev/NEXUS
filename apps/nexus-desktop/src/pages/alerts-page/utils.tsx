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

export function buildAlertStats(alerts: AlertRecord[]): AlertStats {
  return {
    total: alerts.length,
    critical: alerts.filter((alert) => alert.severity.toLowerCase() === 'critical').length,
    warnings: alerts.filter((alert) =>
      ['high', 'medium'].includes(alert.severity.toLowerCase()),
    ).length,
    unread: alerts.filter((alert) => !alert.is_read).length,
  };
}

export function filterAlerts(alerts: AlertRecord[], filter: AlertFilter): AlertRecord[] {
  return alerts.filter((alert) => {
    if (filter === 'critical') return alert.severity.toLowerCase() === 'critical';
    if (filter === 'warnings') return ['high', 'medium'].includes(alert.severity.toLowerCase());
    if (filter === 'info') return ['low', 'info'].includes(alert.severity.toLowerCase());
    if (filter === 'unread') return !alert.is_read;
    return true;
  });
}

export function getAlertConfig(severity: string): AlertVisualConfig {
  const sev = severity.toLowerCase();
  if (sev === 'critical') {
    return {
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'text-accent-red',
      bg: 'bg-accent-red/10',
      border: 'border-l-accent-red',
    };
  }
  if (sev === 'high' || sev === 'medium') {
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

export function formatAlertRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatAlertTypeLabel(alertType: string): string {
  return alertType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
