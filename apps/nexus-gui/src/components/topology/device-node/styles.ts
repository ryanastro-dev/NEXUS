import type { CSSProperties } from 'react';

import type { DeviceNodeThemeTokens } from './types';

export function buildThemeTokens(
  isDark: boolean,
  selected: boolean,
  accentColor: string,
): DeviceNodeThemeTokens {
  return {
    bgColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.98)',
    borderColor: selected
      ? accentColor
      : isDark
      ? 'rgba(59, 130, 246, 0.3)'
      : 'rgba(148, 163, 184, 0.25)',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    dividerColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.15)',
    handleBorder: isDark ? '#020617' : '#F1F5F9',
  };
}

export function buildNodeContainerStyle(
  theme: DeviceNodeThemeTokens,
  isDark: boolean,
  selected: boolean,
  accentColor: string,
): CSSProperties {
  return {
    backgroundColor: theme.bgColor,
    border: `2px solid ${theme.borderColor}`,
    borderRadius: '12px',
    padding: '12px 16px',
    minWidth: '160px',
    maxWidth: '200px',
    boxShadow: selected
      ? isDark
        ? `0 12px 24px rgba(0,0,0,0.5), 0 0 0 3px ${accentColor}40`
        : `0 8px 20px rgba(0,0,0,0.12), 0 0 0 3px ${accentColor}30`
      : isDark
      ? '0 8px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)'
      : '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
  };
}

export function buildHandleStyle(accentColor: string, handleBorder: string): CSSProperties {
  return {
    width: 10,
    height: 10,
    background: accentColor,
    border: `2px solid ${handleBorder}`,
  };
}

export function buildHoverShadow(isDark: boolean, accentColor: string): string {
  return isDark
    ? `0 16px 28px rgba(0,0,0,0.6), 0 0 0 2px ${accentColor}30`
    : `0 12px 24px rgba(0,0,0,0.12), 0 0 0 2px ${accentColor}20`;
}

export function buildRiskBadgeStyle(riskScore: number): CSSProperties {
  const isHighRisk = riskScore >= 50;
  return {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: isHighRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
    color: isHighRisk ? '#EF4444' : '#F59E0B',
    fontWeight: 500,
  };
}
