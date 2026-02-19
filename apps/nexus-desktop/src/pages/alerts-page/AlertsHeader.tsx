import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { CARD } from './constants';

interface AlertsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function AlertsHeader({ loading, onRefresh }: AlertsHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} p-4 sm:p-5`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
            Security Events
          </p>
          <h1 className="text-2xl font-black text-text-primary sm:text-3xl">Alert Center</h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            Prioritize critical events, triage warnings, and resolve network security findings.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300/80 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </motion.section>
  );
}
