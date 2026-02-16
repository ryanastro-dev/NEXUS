export type AlertFilter = 'critical' | 'warnings' | 'info' | 'unread';

export interface AlertStats {
  total: number;
  critical: number;
  warnings: number;
  unread: number;
}

export const CARD =
  'rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65';
