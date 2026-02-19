import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { SUMMARY_CARD_COLORS, type SummaryCardColor } from './constants';

interface SummaryCardProps {
  title: string;
  count: number;
  icon: ReactNode;
  color: SummaryCardColor;
  onClick: () => void;
  active: boolean;
  className?: string;
}

export function SummaryCard({
  title,
  count,
  icon,
  color,
  onClick,
  active,
  className,
}: SummaryCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`h-[92px] rounded-2xl border bg-white/85 p-3 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-950/65 ${
        active ? 'ring-2 ring-accent-blue' : ''
      } ${SUMMARY_CARD_COLORS[color]} ${className ?? ''}`}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-85">{title}</span>
        <span className="scale-90">{icon}</span>
      </div>
      <div className="text-[1.85rem] font-black leading-none">{count}</div>
    </motion.button>
  );
}
