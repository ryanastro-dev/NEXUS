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
}

export function SummaryCard({
  title,
  count,
  icon,
  color,
  onClick,
  active,
}: SummaryCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`rounded-2xl border bg-white/85 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800 dark:bg-slate-950/65 ${
        active ? 'ring-2 ring-accent-blue' : ''
      } ${SUMMARY_CARD_COLORS[color]}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</span>
        {icon}
      </div>
      <div className="text-4xl font-black">{count}</div>
    </motion.button>
  );
}
