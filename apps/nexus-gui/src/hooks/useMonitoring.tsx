import { useEffect, useRef } from 'react';

import { ensureMonitoringEventBridge, useMonitoringStore } from '../store/monitoring-store';
import {
  extractNewDeviceData,
  extractScanCompleteData,
  type NetworkEventType,
  type UseMonitoringOptions,
  type UseMonitoringReturn,
} from './monitoring';

export type {
  MonitoringState,
  MonitoringStatus,
  NetworkEventType,
  UseMonitoringOptions,
  UseMonitoringReturn,
} from './monitoring';
export { formatEventMessage, getEventStyle } from './monitoring';

export function useMonitoring(
  options: UseMonitoringOptions = {},
): UseMonitoringReturn {
  const { maxEvents = 50, onScanComplete, onNewDevice } = options;
  const status = useMonitoringStore((state) => state.status);
  const isLoading = useMonitoringStore((state) => state.isLoading);
  const error = useMonitoringStore((state) => state.error);
  const events = useMonitoringStore((state) => state.events);
  const currentPhase = useMonitoringStore((state) => state.currentPhase);
  const currentProgress = useMonitoringStore((state) => state.currentProgress);
  const startMonitoring = useMonitoringStore((state) => state.startMonitoring);
  const stopMonitoring = useMonitoringStore((state) => state.stopMonitoring);
  const fetchStatus = useMonitoringStore((state) => state.fetchStatus);
  const clearEvents = useMonitoringStore((state) => state.clearEvents);

  const latestHandledEventRef = useRef<NetworkEventType | null>(null);

  useEffect(() => {
    void ensureMonitoringEventBridge(maxEvents);
    void fetchStatus();
  }, [fetchStatus, maxEvents]);

  useEffect(() => {
    latestHandledEventRef.current = events[0] ?? null;
    // Capture current buffered head event at mount to avoid replaying stale callbacks.
  }, []);

  useEffect(() => {
    const latestEvent = events[0] ?? null;
    if (!latestEvent) {
      return;
    }

    if (latestHandledEventRef.current === latestEvent) {
      return;
    }

    latestHandledEventRef.current = latestEvent;
    const scanCompleteData = extractScanCompleteData(latestEvent);
    const newDeviceData = extractNewDeviceData(latestEvent);

    if (scanCompleteData && onScanComplete) {
      onScanComplete(scanCompleteData.hosts_found, scanCompleteData.duration_ms);
    }

    if (newDeviceData && onNewDevice) {
      onNewDevice(newDeviceData);
    }
  }, [events, onNewDevice, onScanComplete]);

  return {
    status,
    isLoading,
    error,
    events,
    currentPhase,
    currentProgress,
    startMonitoring,
    stopMonitoring,
    fetchStatus,
    clearEvents,
  };
}
