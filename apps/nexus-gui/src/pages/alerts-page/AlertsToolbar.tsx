import { CheckCircle, Trash2 } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
import { CARD, type AlertFilter, type AlertStats } from './constants';

interface AlertsToolbarProps {
  filter: AlertFilter;
  stats: AlertStats;
  hasAlerts: boolean;
  onFilterChange: (filter: AlertFilter) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

function FilterButton({
  active,
  activeClass,
  label,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active ? `${activeClass} text-white` : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

export function AlertsToolbar({
  filter,
  stats,
  hasAlerts,
  onFilterChange,
  onMarkAllAsRead,
  onClearAll,
}: AlertsToolbarProps) {
  const { copy } = useLanguage();
  const alertsCopy = copy.alerts;

  return (
    <div className={`${CARD} p-3`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/70 bg-bg-secondary/35 p-1 dark:border-slate-800">
          <FilterButton
            active={filter === 'critical'}
            activeClass="bg-accent-red"
            label={alertsCopy.toolbar.critical}
            onClick={() => onFilterChange('critical')}
          />
          <FilterButton
            active={filter === 'warnings'}
            activeClass="bg-accent-amber"
            label={alertsCopy.toolbar.warnings}
            onClick={() => onFilterChange('warnings')}
          />
          <FilterButton
            active={filter === 'info'}
            activeClass="bg-accent-blue"
            label={alertsCopy.toolbar.info}
            onClick={() => onFilterChange('info')}
          />
          <FilterButton
            active={filter === 'unread'}
            activeClass="bg-accent-teal"
            label={alertsCopy.toolbar.unread}
            onClick={() => onFilterChange('unread')}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onMarkAllAsRead}
            disabled={stats.unread === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-all hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {alertsCopy.toolbar.markAllRead}
          </button>
          <button
            onClick={onClearAll}
            disabled={!hasAlerts}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-all hover:bg-accent-red/10 hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {alertsCopy.toolbar.clearAll}
          </button>
        </div>
      </div>
    </div>
  );
}
