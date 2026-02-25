import { PANEL_CARD } from '../../lib/ui-classes';

export const CARD = PANEL_CARD;

export const SUMMARY_CARD_COLORS = {
  red: 'bg-accent-red/10 text-accent-red border-accent-red/20 hover:bg-accent-red/15',
  orange: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 hover:bg-accent-amber/15',
  yellow:
    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/15',
  green:
    'bg-accent-green/10 text-accent-green border-accent-green/20 hover:bg-accent-green/15',
} as const;

export type SummaryCardColor = keyof typeof SUMMARY_CARD_COLORS;

export const GRADE_COLORS = {
  A: 'text-accent-green bg-accent-green/10',
  B: 'text-accent-blue bg-accent-blue/10',
  C: 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10',
  D: 'text-accent-amber bg-accent-amber/10',
  F: 'text-accent-red bg-accent-red/10',
} as const;

export const DEFAULT_GRADE_CLASS = 'text-text-muted bg-bg-tertiary';

export const PORT_WARNING_SEVERITY_COLORS = {
  LOW: 'bg-accent-blue/5 border-accent-blue/10 text-accent-blue',
  MEDIUM: 'bg-yellow-500/5 border-yellow-500/10 text-yellow-600 dark:text-yellow-500',
  HIGH: 'bg-accent-amber/5 border-accent-amber/10 text-accent-amber',
  CRITICAL: 'bg-accent-red/5 border-accent-red/10 text-accent-red',
} as const;

export const DEFAULT_PORT_WARNING_SEVERITY_CLASS = PORT_WARNING_SEVERITY_COLORS.LOW;
