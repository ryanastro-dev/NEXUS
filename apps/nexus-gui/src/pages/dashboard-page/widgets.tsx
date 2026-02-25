import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import CountUp from 'react-countup';

import { CARD } from './constants';

export function ChartFallback({ heightClass }: { heightClass: string }) {
  return (
    <div className={`${heightClass} animate-pulse rounded-xl bg-slate-100/70 dark:bg-slate-900/60`} />
  );
}

export function StatCard({
  title,
  value,
  suffix,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: number;
  suffix?: string;
  subtitle: string;
  icon: ReactNode;
  tone: 'cyan' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses = {
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  };

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-wider text-text-muted">{title}</p>
          <p className="text-[2rem] leading-tight font-black text-text-primary">
            <CountUp
              end={value}
              duration={0.9}
              separator=","
              useEasing
            />
            {suffix}
          </p>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

export function BreakdownRow({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text-primary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          className={`h-1.5 rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
