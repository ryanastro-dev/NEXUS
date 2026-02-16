export interface CyberNodeData {
  label?: string;
  ip: string;
  deviceType?: string;
  responseTime?: number;
}

export interface NodeMetrics {
  cpu: number;
  mem: number;
  disk: number;
  proc: number;
}

export interface MetricThreshold {
  warning: number;
  danger: number;
}

export interface CyberNodeColors {
  cardBg: string;
  cardBorder: string;
  cardBorderSelected: string;
  cardShadow: string;
  cardShadowSelected: string;
  iconBg: string;
  iconColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  metricBorder: string;
}
