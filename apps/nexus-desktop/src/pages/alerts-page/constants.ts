export type AlertFilter = 'critical' | 'warnings' | 'info' | 'unread';

export interface AlertStats {
  total: number;
  critical: number;
  warnings: number;
  unread: number;
}

export const CARD =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950';
