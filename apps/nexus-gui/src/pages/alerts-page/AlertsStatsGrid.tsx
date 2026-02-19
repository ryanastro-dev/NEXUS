import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Eye, ShieldAlert } from 'lucide-react';

import { CARD, type AlertStats } from './constants';

interface AlertsStatsGridProps {
  stats: AlertStats;
}

export function AlertsStatsGrid({ stats }: AlertsStatsGridProps) {
  const compactCardClass = 'h-[86px] min-w-0 w-full p-2.5';

  return (
    <div className="grid w-full shrink-0 gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(132px,1fr))]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} ${compactCardClass} border-accent-blue/20 bg-gradient-to-br from-accent-blue/15 to-accent-blue/5`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-blue">
            Unread Alerts
          </span>
          <Bell className="h-4 w-4 text-accent-blue" />
        </div>
        <p className="text-[1.9rem] font-black leading-none text-accent-blue">{stats.unread}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`${CARD} ${compactCardClass} border-accent-red/20 bg-gradient-to-br from-accent-red/15 to-accent-red/5`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-red">Critical</span>
          <ShieldAlert className="h-4 w-4 text-accent-red" />
        </div>
        <p className="text-[1.9rem] font-black leading-none text-accent-red">{stats.critical}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${CARD} ${compactCardClass} border-accent-amber/20 bg-gradient-to-br from-accent-amber/15 to-accent-amber/5`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-amber">Warnings</span>
          <AlertTriangle className="h-4 w-4 text-accent-amber" />
        </div>
        <p className="text-[1.9rem] font-black leading-none text-accent-amber">{stats.warnings}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`${CARD} ${compactCardClass} border-accent-teal/20 bg-gradient-to-br from-accent-teal/15 to-accent-teal/5`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent-teal">Total</span>
          <Eye className="h-4 w-4 text-accent-teal" />
        </div>
        <p className="text-[1.9rem] font-black leading-none text-accent-teal">{stats.total}</p>
      </motion.div>
    </div>
  );
}
