import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { eventClient } from '../../lib/api/event-client';
import { tauriClient } from '../../lib/api/tauri-client';
import { emitAlertsUnreadCount } from '../../lib/events/alerts-sync';
import type { AlertRecord, NetworkEventType } from '../../lib/api/types';
import type { AlertFilter } from './constants';
import { buildAlertStats, filterAlerts } from './utils';

const ALERT_REFRESH_EVENT_TYPES: Set<NetworkEventType['type']> = new Set([
  'NewDeviceDiscovered',
  'DeviceWentOffline',
  'DeviceCameOnline',
  'DeviceIpChanged',
  'MonitoringError',
  'ScanCompleted',
]);
const RECENT_ALERTS_LIMIT = 400;

export function useAlertsData() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertFilter>('unread');
  const isDemoMode = localStorage.getItem('demo-mode-enabled') === 'true';
  const demoAlertsRef = useRef<AlertRecord[] | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAlerts = useCallback(async (withLoading = true) => {
    if (withLoading) {
      setLoading(true);
    }
    try {
      if (isDemoMode) {
        if (!demoAlertsRef.current) {
          demoAlertsRef.current = await tauriClient.getDemoAlerts();
        }
        setAlerts([...demoAlertsRef.current]);
      } else {
        const result = await tauriClient.getRecentAlerts(RECENT_ALERTS_LIMIT);
        demoAlertsRef.current = null;
        setAlerts(result);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (loading) {
      return;
    }
    emitAlertsUnreadCount(alerts);
  }, [alerts, loading]);

  useEffect(() => {
    if (isDemoMode) {
      return;
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void loadAlerts(false);
      }, 600);
    };

    const setup = async () => {
      try {
        const unsubscribe = await eventClient.listenNetworkEvents((event) => {
          if (!ALERT_REFRESH_EVENT_TYPES.has(event.type)) {
            return;
          }
          scheduleRefresh();
        });

        if (disposed) {
          unsubscribe();
          return;
        }

        unlisten = unsubscribe;
      } catch {
        // Keep alerts view usable even if event bridge is unavailable.
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (unlisten) {
        unlisten();
      }
    };
  }, [isDemoMode, loadAlerts]);

  const markAsRead = useCallback(
    async (alertId: number) => {
      const markRead = (source: AlertRecord[]) =>
        source.map((alert) => (alert.id === alertId ? { ...alert, is_read: true } : alert));
      try {
        if (isDemoMode) {
          setAlerts(markRead);
          if (demoAlertsRef.current) {
            demoAlertsRef.current = markRead(demoAlertsRef.current);
          }
          return;
        }

        // Optimistic local update avoids full-page loading flicker while preserving UX continuity.
        setAlerts(markRead);
        await tauriClient.markAlertRead(alertId);
      } catch (error) {
        console.error('Failed to mark alert as read:', error);
        await loadAlerts(false);
      }
    },
    [isDemoMode, loadAlerts],
  );

  const markAllAsRead = useCallback(async () => {
    const markAllRead = (source: AlertRecord[]) =>
      source.map((alert) => ({ ...alert, is_read: true }));
    try {
      if (isDemoMode) {
        setAlerts(markAllRead);
        if (demoAlertsRef.current) {
          demoAlertsRef.current = markAllRead(demoAlertsRef.current);
        }
        return;
      }

      setAlerts(markAllRead);
      await tauriClient.markAllAlertsRead();
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
      await loadAlerts(false);
    }
  }, [isDemoMode, loadAlerts]);

  const clearAll = useCallback(async () => {
    try {
      if (isDemoMode) {
        demoAlertsRef.current = [];
        setAlerts([]);
        return;
      }

      setAlerts([]);
      await tauriClient.clearAllAlerts();
    } catch (error) {
      console.error('Failed to clear alerts:', error);
      await loadAlerts(false);
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
