import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { tauriClient } from '../../lib/api/tauri-client';
import type { AlertRecord } from '../../lib/api/types';
import type { AlertFilter } from './constants';
import { buildAlertStats, filterAlerts } from './utils';

export function useAlertsData() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertFilter>('unread');
  const isDemoMode = localStorage.getItem('demo-mode-enabled') === 'true';
  const demoAlertsRef = useRef<AlertRecord[] | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        if (!demoAlertsRef.current) {
          demoAlertsRef.current = await tauriClient.getDemoAlerts();
        }
        setAlerts([...demoAlertsRef.current]);
      } else {
        const result = await tauriClient.getUnreadAlerts();
        demoAlertsRef.current = null;
        setAlerts(result);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const markAsRead = useCallback(
    async (alertId: number) => {
      try {
        if (isDemoMode) {
          const updateAlerts = (prev: AlertRecord[]) =>
            prev.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert));
          setAlerts(updateAlerts);
          if (demoAlertsRef.current) {
            demoAlertsRef.current = updateAlerts(demoAlertsRef.current);
          }
          return;
        }
        await tauriClient.markAlertRead(alertId);
        await loadAlerts();
      } catch (error) {
        console.error('Failed to mark alert as read:', error);
      }
    },
    [isDemoMode, loadAlerts],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      if (isDemoMode) {
        const updateAlerts = (prev: AlertRecord[]) =>
          prev.map((alert) => ({ ...alert, is_read: true }));
        setAlerts(updateAlerts);
        if (demoAlertsRef.current) {
          demoAlertsRef.current = updateAlerts(demoAlertsRef.current);
        }
        return;
      }
      await tauriClient.markAllAlertsRead();
      await loadAlerts();
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  }, [isDemoMode, loadAlerts]);

  const clearAll = useCallback(async () => {
    try {
      if (isDemoMode) {
        demoAlertsRef.current = [];
        setAlerts([]);
        return;
      }
      await tauriClient.clearAllAlerts();
      await loadAlerts();
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }, [isDemoMode, loadAlerts]);

  const stats = useMemo(() => buildAlertStats(alerts), [alerts]);
  const filteredAlerts = useMemo(() => filterAlerts(alerts, filter), [alerts, filter]);

  return {
    alerts,
    loading,
    filter,
    stats,
    filteredAlerts,
    setFilter,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
