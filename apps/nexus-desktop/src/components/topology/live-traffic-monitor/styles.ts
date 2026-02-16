import type { CSSProperties } from 'react';

export function getContainerStyle(isDark: boolean): CSSProperties {
  return {
    borderTop: isDark
      ? '1px solid rgba(0, 217, 255, 0.3)'
      : '1px solid rgba(148, 163, 184, 0.3)',
    background: isDark ? 'rgba(10, 14, 39, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 -8px 32px rgba(0, 0, 0, 0.4)' : '0 -4px 20px rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
  };
}

export function getHeaderStyle(isDark: boolean, isCollapsed: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: isCollapsed
      ? 'none'
      : isDark
      ? '1px solid rgba(0, 217, 255, 0.2)'
      : '1px solid rgba(148, 163, 184, 0.2)',
  };
}

export function getTitleStyle(isDark: boolean): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    color: isDark ? '#00D9FF' : '#0F172A',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  };
}

export function getStatusDotStyle(streamConnected: boolean): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: streamConnected ? '#10B981' : '#64748B',
    boxShadow: streamConnected ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
  };
}

export function getStatusLabelStyle(isDark: boolean): CSSProperties {
  return {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    fontFamily: 'monospace',
  };
}

export function getCollapseButtonStyle(isDark: boolean): CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    color: isDark ? '#94A3B8' : '#64748B',
  };
}

export function getLogContainerStyle(): CSSProperties {
  return {
    overflowY: 'auto',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 1.6,
  };
}

export function getEmptyStateStyle(isDark: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: isDark ? '#64748B' : '#94A3B8',
    fontStyle: 'italic',
  };
}

export function getTimestampStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#64748B' : '#94A3B8',
    minWidth: 70,
  };
}
