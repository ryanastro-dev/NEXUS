import type { CSSProperties } from 'react';

import type { StreamEvent } from './types';

export function getContainerStyle(isDark: boolean): CSSProperties {
  return {
    borderTop: isDark
      ? '1px solid rgba(56, 189, 248, 0.25)'
      : '1px solid rgba(148, 163, 184, 0.35)',
    background: isDark
      ? 'linear-gradient(180deg, rgba(7, 12, 28, 0.98) 0%, rgba(9, 18, 39, 0.98) 100%)'
      : 'linear-gradient(180deg, rgba(248, 251, 255, 0.98) 0%, rgba(241, 245, 249, 0.98) 100%)',
    backdropFilter: 'blur(14px)',
    boxShadow: isDark
      ? '0 -10px 36px rgba(2, 6, 23, 0.6), inset 0 1px 0 rgba(148, 163, 184, 0.1)'
      : '0 -6px 24px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
    flexShrink: 0,
  };
}

export function getHeaderStyle(isDark: boolean, isCollapsed: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 11px',
    borderBottom: isCollapsed
      ? 'none'
      : isDark
      ? '1px solid rgba(56, 189, 248, 0.18)'
      : '1px solid rgba(148, 163, 184, 0.24)',
  };
}

export function getTitleStyle(isDark: boolean): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    color: isDark ? '#E2E8F0' : '#1E293B',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  };
}

export function getHeaderIconStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#38BDF8' : '#0EA5E9',
    filter: isDark ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.35))' : 'none',
  };
}

export function getStatusDotStyle(streamConnected: boolean): CSSProperties {
  return {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: streamConnected ? '#22C55E' : '#94A3B8',
    boxShadow: streamConnected ? '0 0 8px rgba(34, 197, 94, 0.45)' : 'none',
  };
}

export function getStatusLabelStyle(isDark: boolean): CSSProperties {
  return {
    fontSize: 10,
    color: isDark ? '#A5B4FC' : '#475569',
    fontFamily: 'monospace',
    letterSpacing: '0.03em',
  };
}

export function getCollapseButtonStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.7)',
    border: isDark ? '1px solid rgba(71, 85, 105, 0.55)' : '1px solid rgba(148, 163, 184, 0.45)',
    borderRadius: 8,
    cursor: 'pointer',
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    color: isDark ? '#CBD5E1' : '#475569',
    transition: 'all 150ms ease',
  };
}

export function getLogContainerStyle(): CSSProperties {
  return {
    overflowY: 'auto',
    padding: '5px 11px',
    fontFamily: 'monospace',
    fontSize: 9.5,
    lineHeight: 1.4,
  };
}

export function getEmptyStateStyle(isDark: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: isDark ? '#64748B' : '#64748B',
    fontStyle: 'italic',
  };
}

export function getTimestampStyle(isDark: boolean): CSSProperties {
  return {
    color: isDark ? '#7C8AA8' : '#64748B',
    minWidth: 58,
    fontSize: 9.5,
  };
}

export function getToggleGroupStyle(isDark: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    borderRadius: 8,
    border: isDark ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(148, 163, 184, 0.45)',
    background: isDark ? 'rgba(15, 23, 42, 0.58)' : 'rgba(255, 255, 255, 0.9)',
    padding: 2,
    boxShadow: isDark
      ? 'inset 0 1px 0 rgba(148, 163, 184, 0.12)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
  };
}

export function getToggleButtonStyle(
  isDark: boolean,
  active: boolean,
): CSSProperties {
  if (active) {
    return {
      color: isDark ? '#BAE6FD' : '#0369A1',
      background: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(186, 230, 253, 0.75)',
      boxShadow: isDark
        ? '0 0 0 1px rgba(125, 211, 252, 0.18) inset'
        : '0 0 0 1px rgba(125, 211, 252, 0.45) inset',
    };
  }

  return {
    color: isDark ? '#94A3B8' : '#64748B',
    background: 'transparent',
  };
}

export function getEventTextColor(
  isDark: boolean,
  event: Pick<StreamEvent, 'severity' | 'source' | 'color'>,
): string {
  if (event.severity === 'error') {
    return isDark ? '#FCA5A5' : '#B91C1C';
  }

  if (event.severity === 'warn') {
    return isDark ? '#FCD34D' : '#B45309';
  }

  if (event.source === 'network') {
    return isDark ? '#67E8F9' : '#0369A1';
  }

  if (event.source === 'engine') {
    return isDark ? '#93C5FD' : '#1D4ED8';
  }

  return isDark ? event.color : '#334155';
}

export function getTroubleshootButtonStyle(
  isDark: boolean,
  disabled: boolean,
): CSSProperties {
  return {
    borderRadius: 6,
    border: isDark ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(14, 116, 144, 0.35)',
    background: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(14, 165, 233, 0.12)',
    color: isDark ? '#67E8F9' : '#0C4A6E',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease',
  };
}
