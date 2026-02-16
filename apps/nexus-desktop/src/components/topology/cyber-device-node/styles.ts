import type { CyberNodeColors } from './types';

export function buildCyberNodeColors(isDark: boolean): CyberNodeColors {
  return {
    cardBg: isDark ? 'rgba(10, 14, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(0, 217, 255, 0.4)' : 'rgba(37, 99, 235, 0.4)',
    cardBorderSelected: isDark ? '#00D9FF' : '#2563EB',
    cardShadow: isDark ? '0 0 20px rgba(0, 217, 255, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
    cardShadowSelected: isDark
      ? '0 0 30px rgba(0, 217, 255, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 0 20px rgba(37, 99, 235, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    iconBg: isDark ? 'rgba(0, 217, 255, 0.15)' : 'rgba(37, 99, 235, 0.1)',
    iconColor: isDark ? '#00D9FF' : '#2563EB',
    textPrimary: isDark ? '#E0F2FE' : '#0F172A',
    textSecondary: isDark ? '#7DD3FC' : '#64748B',
    textMuted: isDark ? '#38BDF8' : '#94A3B8',
    metricBorder: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(203, 213, 225, 0.5)',
  };
}
