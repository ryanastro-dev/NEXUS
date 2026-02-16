import { useCallback, useEffect, useMemo, useState } from 'react';

import { eventClient } from '../lib/api/event-client';
import type { ScanResult } from '../lib/api/types';
import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  REFRESH_EVENT_TYPES,
  applyTelemetryEvent,
  createInitialDashboardPayload,
  fetchDashboardPayload,
  selectActiveDevices24h,
  selectAverageLatency,
  selectCriticalAlerts,
  selectDeviceTypeData,
  selectRiskLabel,
  selectScanTrendData,
  selectUnknownDevices,
} from './dashboard-data';
import type { NetworkEventType } from './useMonitoring';

export function useDashboardData(
  scanResult: ScanResult | null,
  latestEvent?: NetworkEventType,
) {
  const [payload, setPayload] = useState(createInitialDashboardPayload);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      setPayload(await fetchDashboardPayload());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData(false);
    const timer = setInterval(() => {
      void fetchDashboardData(true);
    }, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    if (!REFRESH_EVENT_TYPES.has(latestEvent.type)) {
      return;
    }

    void fetchDashboardData(true);
  }, [latestEvent, fetchDashboardData]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;

    const setup = async () => {
      const unsubscribe = await eventClient.listenTelemetryEvents((event) => {
        setPayload((prev) => applyTelemetryEvent(prev, event));
      });

      if (disposed) {
        unsubscribe();
        return;
      }

      unlisten = unsubscribe;
    };

    void setup();

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const activeDevices24h = useMemo(() => selectActiveDevices24h(payload), [payload]);
  const unknownDevices = useMemo(() => selectUnknownDevices(payload), [payload]);
  const criticalAlerts = useMemo(() => selectCriticalAlerts(payload), [payload]);
  const avgLatency = useMemo(() => selectAverageLatency(scanResult, payload), [scanResult, payload]);
  const scanTrendData = useMemo(() => selectScanTrendData(payload), [payload]);
  const deviceTypeData = useMemo(() => selectDeviceTypeData(payload), [payload]);
  const riskLabel = useMemo(() => selectRiskLabel(payload), [payload]);

  return {
    payload,
    isLoading,
    isRefreshing,
    error,
    fetchDashboardData,
    activeDevices24h,
    unknownDevices,
    criticalAlerts,
    avgLatency,
    scanTrendData,
    deviceTypeData,
    riskLabel,
  };
}
