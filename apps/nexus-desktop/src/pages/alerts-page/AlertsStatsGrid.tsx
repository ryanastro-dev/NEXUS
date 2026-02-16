import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Eye, ShieldAlert } from 'lucide-react';

import { CARD, type AlertStats } from './constants';

interface AlertsStatsGridProps {
  stats: AlertStats;
}

export function AlertsStatsGrid({ stats }: AlertsStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} border-accent-blue/20 bg-gradient-to-br from-accent-blue/15 to-accent-blue/5 p-6`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-accent-blue">
            Unread Alerts
          </span>
          <Bell className="h-6 w-6 text-accent-blue" />
        </div>
        <p className="text-4xl font-bold text-accent-blue">{stats.unread}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`${CARD} border-accent-red/20 bg-gradient-to-br from-accent-red/15 to-accent-red/5 p-6`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-accent-red">Critical</span>
          <ShieldAlert className="h-6 w-6 text-accent-red" />
        </div>
        <p className="text-4xl font-bold text-accent-red">{stats.critical}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${CARD} border-accent-amber/20 bg-gradient-to-br from-accent-amber/15 to-accent-amber/5 p-6`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-accent-amber">Warnings</span>
          <AlertTriangle className="h-6 w-6 text-accent-amber" />
        </div>
        <p className="text-4xl font-bold text-accent-amber">{stats.warnings}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`${CARD} border-accent-teal/20 bg-gradient-to-br from-accent-teal/15 to-accent-teal/5 p-6`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-accent-teal">Unread</span>
          <Eye className="h-6 w-6 text-accent-teal" />
        </div>
        <p className="text-4xl font-bold text-accent-teal">{stats.unread}</p>
      </motion.div>
    </div>
  );
}
