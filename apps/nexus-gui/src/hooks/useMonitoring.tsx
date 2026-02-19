import { useCallback, useEffect, useState } from 'react';

import { eventClient } from '../lib/api/event-client';
import { tauriClient } from '../lib/api/tauri-client';
import { isTauri } from '../lib/runtime/is-tauri';
import {
  createInitialMonitoringState,
  extractNewDeviceData,
  extractScanCompleteData,
  reduceMonitoringState,
  resolvePreferredInterface,
  type UnlistenFn,
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

  const [state, setState] = useState(createInitialMonitoringState);

  const fetchStatus = useCallback(async () => {
    if (!isTauri()) {
      return;
    }

    try {
      const status = await tauriClient.getMonitoringStatus();
      setState((previousState) => ({ ...previousState, status, error: null }));
    } catch (err) {
      setState((previousState) => ({
        ...previousState,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const startMonitoring = useCallback(
    async (intervalSeconds?: number, interfaceName?: string) => {
      setState((previousState) => ({
        ...previousState,
        isLoading: true,
        error: null,
      }));

      try {
        if (!isTauri()) {
          throw new Error('Tauri runtime unavailable');
        }

        const preferredInterface = resolvePreferredInterface(interfaceName);
        await tauriClient.startMonitoring(intervalSeconds, preferredInterface);
        await fetchStatus();
        setState((previousState) => ({ ...previousState, isLoading: false }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes('already running')) {
          await fetchStatus();
          setState((previousState) => ({
            ...previousState,
            isLoading: false,
            error: null,
          }));
          return;
        }

        setState((previousState) => ({
          ...previousState,
          isLoading: false,
          error: message,
        }));
      }
    },
    [fetchStatus],
  );

  const stopMonitoring = useCallback(async () => {
    setState((previousState) => ({
      ...previousState,
      isLoading: true,
      error: null,
    }));

    try {
      if (!isTauri()) {
        throw new Error('Tauri runtime unavailable');
      }

      await tauriClient.stopMonitoring();
      await fetchStatus();
      setState((previousState) => ({
        ...previousState,
        isLoading: false,
        currentPhase: null,
        currentProgress: 0,
      }));
    } catch (err) {
      setState((previousState) => ({
        ...previousState,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [fetchStatus]);

  const clearEvents = useCallback(() => {
    setState((previousState) => ({ ...previousState, events: [] }));
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let disposed = false;

    const setupListener = async () => {
      try {
        const unsubscribe = await eventClient.listenNetworkEvents((networkEvent) => {
          const scanCompleteData = extractScanCompleteData(networkEvent);
          const newDeviceData = extractNewDeviceData(networkEvent);

          setState((previousState) =>
            reduceMonitoringState(previousState, networkEvent, maxEvents),
          );

          if (scanCompleteData && onScanComplete) {
            onScanComplete(scanCompleteData.hosts_found, scanCompleteData.duration_ms);
          }

          if (newDeviceData && onNewDevice) {
            onNewDevice(newDeviceData);
          }
        });

        if (disposed) {
          unsubscribe();
          return;
        }

        unlisten = unsubscribe;
      } catch (err) {
        if (disposed) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    };

    void setupListener();
    void fetchStatus();

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [fetchStatus, maxEvents, onNewDevice, onScanComplete]);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    fetchStatus,
    clearEvents,
  };
}
