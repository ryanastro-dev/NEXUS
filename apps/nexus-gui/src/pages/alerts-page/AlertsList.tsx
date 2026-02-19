import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Clock, Eye } from 'lucide-react';

import type { AlertRecord } from '../../lib/api/types';
import { CARD } from './constants';
import { formatAlertRelativeDate, formatAlertTypeLabel, getAlertConfig } from './utils';

interface AlertsListProps {
  loading: boolean;
  alerts: AlertRecord[];
  filteredAlerts: AlertRecord[];
  onMarkAsRead: (alertId: number) => void;
  fillHeight?: boolean;
}

export function AlertsList({
  loading,
  alerts,
  filteredAlerts,
  onMarkAsRead,
  fillHeight = false,
}: AlertsListProps) {
  if (loading) {
    return (
      <div
        className={`${CARD} ${
          fillHeight ? 'flex h-full min-h-[280px] flex-col items-center justify-center p-6' : 'p-10 text-center'
        }`}
      >
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-accent-blue border-t-transparent" />
        <p className="text-text-muted">Loading alerts...</p>
      </div>
    );
  }

  if (filteredAlerts.length === 0) {
    return (
      <div
        className={`${CARD} ${
          fillHeight ? 'flex h-full min-h-[280px] flex-col items-center justify-center p-6' : 'p-10 text-center'
        }`}
      >
        <CheckCircle className="mx-auto mb-3 h-14 w-14 text-accent-green" />
        <h3 className="mb-1.5 text-lg font-bold text-text-primary sm:text-xl">All Clear!</h3>
        <p className="text-text-muted">
          {alerts.length === 0
            ? 'No alerts yet. Your network is being monitored.'
            : 'No alerts match your current filter.'}
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {filteredAlerts.map((alert) => {
        const config = getAlertConfig(alert.severity);

        return (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`${CARD} min-h-[118px] overflow-hidden border-l-[3px] ${config.border} transition-all hover:border-accent-blue/30`}
          >
            <div className="p-3 sm:p-3.5">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-lg p-2 ${config.bg} ${config.color}`}>
                  {config.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[1.05rem] font-semibold text-text-primary">
                        {formatAlertTypeLabel(alert.alert_type)}
                      </h3>
                      {!alert.is_read && (
                        <span className="rounded bg-accent-blue/20 px-1.5 py-0.5 text-xs font-bold text-accent-blue">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {formatAlertRelativeDate(alert.created_at)}
                    </div>
                  </div>

                  <p className="mb-2 text-sm text-text-secondary">{alert.message}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {(alert.device_ip || alert.device_mac) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                        {alert.device_ip && (
                          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono">
                            {alert.device_ip}
                          </span>
                        )}
                        {alert.device_mac && (
                          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono">
                            {alert.device_mac}
                          </span>
                        )}
                      </div>
                    )}

                    {!alert.is_read && (
                      <button
                        onClick={() => onMarkAsRead(alert.id)}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-bg-tertiary px-2 py-1 text-xs text-text-secondary transition-all hover:bg-bg-hover hover:text-text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
