import {
  HardDrive,
  HelpCircle,
  Laptop,
  Printer,
  Router,
  Server,
  Shield,
  Smartphone,
  Wifi,
} from 'lucide-react';

import type { MetricThreshold } from './types';

export function resolveDeviceIcon(deviceType?: string) {
  const type = deviceType?.toUpperCase() || 'UNKNOWN';
  const iconClass = 'w-5 h-5';

  if (type.includes('ROUTER') || type.includes('GATEWAY')) {
    return <Router className={iconClass} />;
  }
  if (type.includes('ACCESS_POINT') || type.includes('WIFI')) {
    return <Wifi className={iconClass} />;
  }
  if (type.includes('SERVER') || type.includes('NAS')) {
    return <Server className={iconClass} />;
  }
  if (type.includes('LAPTOP') || type.includes('PC')) {
    return <Laptop className={iconClass} />;
  }
  if (type.includes('MOBILE') || type.includes('PHONE')) {
    return <Smartphone className={iconClass} />;
  }
  if (type.includes('PRINTER')) {
    return <Printer className={iconClass} />;
  }
  if (type.includes('STORAGE')) {
    return <HardDrive className={iconClass} />;
  }
  if (type.includes('FIREWALL')) {
    return <Shield className={iconClass} />;
  }
  return <HelpCircle className={iconClass} />;
}

export function resolveMetricColor(value: number, threshold: MetricThreshold): string {
  if (value >= threshold.danger) {
    return '#EF4444';
  }
  if (value >= threshold.warning) {
    return '#F59E0B';
  }
  return '#10B981';
}
