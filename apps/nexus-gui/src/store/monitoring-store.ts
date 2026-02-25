import { create } from "zustand";

import { eventClient } from "../lib/api/event-client";
import { tauriClient } from "../lib/api/tauri-client";
import { isTauri } from "../lib/runtime/is-tauri";
import {
  createInitialMonitoringState,
  reduceMonitoringState,
  resolvePreferredInterface,
} from "../hooks/monitoring";
import type { MonitoringState, NetworkEventType } from "../hooks/monitoring";
import { useNetworkRuntimeStore } from "./network-runtime-store";

interface MonitoringStoreState extends MonitoringState {
  applyNetworkEvent: (networkEvent: NetworkEventType, maxEvents: number) => void;
  fetchStatus: () => Promise<void>;
  startMonitoring: (
    intervalSeconds?: number,
    interfaceName?: string,
  ) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  clearEvents: () => void;
}

let monitoringEventLimit = 50;
let monitoringBridgeInitialized = false;
let monitoringBridgeSetupPromise: Promise<void> | null = null;
let monitoringBridgeUnlisten: (() => void) | null = null;
const SNAPSHOT_DRIFT_GUARD_INTERVAL_MS = 10000;
const SNAPSHOT_SYNC_MIN_INTERVAL_MS = 1500;
let snapshotDriftGuardTimer: ReturnType<typeof setInterval> | null = null;
let snapshotSyncInFlight: Promise<void> | null = null;
let lastSnapshotSyncAt = 0;

function startSnapshotDriftGuardTimer(): void {
  if (snapshotDriftGuardTimer) {
    return;
  }

  snapshotDriftGuardTimer = setInterval(() => {
    const isRunning = useMonitoringStore.getState().status.is_running;
    if (!isRunning) {
      stopSnapshotDriftGuardTimer();
      return;
    }

    void reconcileRuntimeHostsFromSnapshot(false);
  }, SNAPSHOT_DRIFT_GUARD_INTERVAL_MS);
}

function stopSnapshotDriftGuardTimer(): void {
  if (!snapshotDriftGuardTimer) {
    return;
  }
  clearInterval(snapshotDriftGuardTimer);
  snapshotDriftGuardTimer = null;
}

async function reconcileRuntimeHostsFromSnapshot(force: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const state = useMonitoringStore.getState();
  if (!force && !state.status.is_running) {
    return;
  }

  const now = Date.now();
  if (!force && now - lastSnapshotSyncAt < SNAPSHOT_SYNC_MIN_INTERVAL_MS) {
    return;
  }
  if (snapshotSyncInFlight) {
    return snapshotSyncInFlight;
  }

  snapshotSyncInFlight = (async () => {
    try {
      const snapshot = await tauriClient.getMonitorSnapshot();
      useNetworkRuntimeStore.getState().reconcileFromMonitorSnapshot(snapshot);
      useMonitoringStore.setState((previousState) => ({
        ...previousState,
        status: {
          ...previousState.status,
          is_running: snapshot.is_running,
          scan_count: Math.max(previousState.status.scan_count, snapshot.scan_count),
        },
      }));
      lastSnapshotSyncAt = Date.now();

      if (snapshot.is_running) {
        startSnapshotDriftGuardTimer();
      } else {
        stopSnapshotDriftGuardTimer();
      }
    } catch (err) {
      if (force) {
        useMonitoringStore.setState((previousState) => ({
          ...previousState,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    } finally {
      snapshotSyncInFlight = null;
    }
  })();

  return snapshotSyncInFlight;
}

export const useMonitoringStore = create<MonitoringStoreState>((set, get) => ({
  ...createInitialMonitoringState(),
  applyNetworkEvent: (networkEvent, maxEvents) =>
    set((previousState) =>
      reduceMonitoringState(previousState, networkEvent, maxEvents),
    ),
  fetchStatus: async () => {
    if (!isTauri()) {
      return;
    }

    try {
      const status = await tauriClient.getMonitoringStatus();
      set((previousState) => ({ ...previousState, status, error: null }));
      if (status.is_running) {
        startSnapshotDriftGuardTimer();
        await reconcileRuntimeHostsFromSnapshot(true);
      } else {
        stopSnapshotDriftGuardTimer();
      }
    } catch (err) {
      set((previousState) => ({
        ...previousState,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  },
  startMonitoring: async (intervalSeconds, interfaceName) => {
    set((previousState) => ({
      ...previousState,
      isLoading: true,
      error: null,
    }));

    try {
      if (!isTauri()) {
        throw new Error("Tauri runtime unavailable");
      }

      const preferredInterface = resolvePreferredInterface(interfaceName);
      await tauriClient.startMonitoring(intervalSeconds, preferredInterface);
      await get().fetchStatus();
      set((previousState) => ({ ...previousState, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("already running")) {
        await get().fetchStatus();
        set((previousState) => ({
          ...previousState,
          isLoading: false,
          error: null,
        }));
        return;
      }

      set((previousState) => ({
        ...previousState,
        isLoading: false,
        error: message,
      }));
    }
  },
  stopMonitoring: async () => {
    set((previousState) => ({
      ...previousState,
      isLoading: true,
      error: null,
    }));

    try {
      if (!isTauri()) {
        throw new Error("Tauri runtime unavailable");
      }

      await tauriClient.stopMonitoring();
      await get().fetchStatus();
      stopSnapshotDriftGuardTimer();
      set((previousState) => ({
        ...previousState,
        isLoading: false,
        currentPhase: null,
        currentProgress: 0,
      }));
    } catch (err) {
      set((previousState) => ({
        ...previousState,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  },
  clearEvents: () => set((previousState) => ({ ...previousState, events: [] })),
}));

export async function ensureMonitoringEventBridge(
  maxEvents = 50,
): Promise<void> {
  monitoringEventLimit = Math.max(monitoringEventLimit, maxEvents);

  if (monitoringBridgeInitialized) {
    return;
  }
  if (monitoringBridgeSetupPromise) {
    return monitoringBridgeSetupPromise;
  }
  if (!isTauri()) {
    return;
  }

  monitoringBridgeSetupPromise = (async () => {
    try {
      const unsubscribe = await eventClient.listenNetworkEvents((networkEvent) => {
        useMonitoringStore.getState().applyNetworkEvent(networkEvent, monitoringEventLimit);
        useNetworkRuntimeStore.getState().applyNetworkEvent(networkEvent);

        if (networkEvent.type === "MonitoringStarted") {
          startSnapshotDriftGuardTimer();
          void reconcileRuntimeHostsFromSnapshot(true);
          return;
        }
        if (networkEvent.type === "MonitoringStopped") {
          stopSnapshotDriftGuardTimer();
          return;
        }
        if (networkEvent.type === "ScanCompleted") {
          void reconcileRuntimeHostsFromSnapshot(true);
        }
      });
      monitoringBridgeUnlisten = unsubscribe;
      monitoringBridgeInitialized = true;
    } catch (err) {
      useMonitoringStore.setState((previousState) => ({
        ...previousState,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      monitoringBridgeSetupPromise = null;
    }
  })();

  return monitoringBridgeSetupPromise;
}

export function teardownMonitoringEventBridgeForTests(): void {
  if (monitoringBridgeUnlisten) {
    monitoringBridgeUnlisten();
    monitoringBridgeUnlisten = null;
  }
  stopSnapshotDriftGuardTimer();
  monitoringBridgeInitialized = false;
  monitoringBridgeSetupPromise = null;
  snapshotSyncInFlight = null;
  lastSnapshotSyncAt = 0;
}
