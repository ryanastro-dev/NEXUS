import { motion } from 'framer-motion';
import { CheckCircle, Clock, Eye } from 'lucide-react';

import type { AlertRecord } from '../../lib/api/types';
import { CARD } from './constants';
import { formatAlertRelativeDate, formatAlertTypeLabel, getAlertConfig } from './utils';

interface AlertsListProps {
  loading: boolean;
  alerts: AlertRecord[];
  filteredAlerts: AlertRecord[];
  onMarkAsRead: (alertId: number) => void;
}

export function AlertsList({ loading, alerts, filteredAlerts, onMarkAsRead }: AlertsListProps) {
  if (loading) {
    return (
      <div className={`${CARD} p-12 text-center`}>
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent-blue border-t-transparent" />
        <p className="text-text-muted">Loading alerts...</p>
      </div>
    );
  }

  if (filteredAlerts.length === 0) {
    return (
      <div className={`${CARD} p-12 text-center`}>
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent-green" />
        <h3 className="mb-2 text-xl font-bold text-text-primary">All Clear!</h3>
        <p className="text-text-muted">
          {alerts.length === 0
            ? 'No alerts yet. Your network is being monitored.'
            : 'No alerts match your current filter.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {filteredAlerts.map((alert, index) => {
        const config = getAlertConfig(alert.severity);

        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`${CARD} overflow-hidden border-l-4 ${config.border} transition-all hover:border-accent-blue/30`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-lg p-3 ${config.bg} ${config.color}`}>
                  {config.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-text-primary">
                        {formatAlertTypeLabel(alert.alert_type)}
                      </h3>
                      {!alert.is_read && (
                        <span className="rounded bg-accent-blue/20 px-2 py-0.5 text-xs font-bold text-accent-blue">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {formatAlertRelativeDate(alert.created_at)}
                    </div>
                  </div>

                  <p className="mb-3 text-sm leading-relaxed text-text-secondary">{alert.message}</p>

                  {(alert.device_ip || alert.device_mac) && (
                    <div className="mb-3 flex items-center gap-4 text-xs text-text-muted">
                      {alert.device_ip && (
                        <span className="rounded bg-bg-tertiary px-2 py-1 font-mono">
                          {alert.device_ip}
                        </span>
                      )}
                      {alert.device_mac && (
                        <span className="rounded bg-bg-tertiary px-2 py-1 font-mono">
                          {alert.device_mac}
                        </span>
                      )}
                    </div>
                  )}

                  {!alert.is_read && (
                    <button
                      onClick={() => onMarkAsRead(alert.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm text-text-secondary transition-all hover:bg-bg-hover hover:text-text-primary"
                    >
                      <Eye className="h-4 w-4" />
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
