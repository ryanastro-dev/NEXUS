import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkEventType } from '../lib/api/types';
import { createInitialMonitoringState } from '../hooks/monitoring';
import { useNetworkRuntimeStore } from './network-runtime-store';
import {
  ensureMonitoringEventBridge,
  teardownMonitoringEventBridgeForTests,
  useMonitoringStore,
} from './monitoring-store';

const monitoringStoreMocks = vi.hoisted(() => ({
  isTauri: vi.fn<() => boolean>(),
  listenNetworkEvents: vi.fn<
    (handler: (payload: NetworkEventType) => void) => Promise<() => void>
  >(),
  getMonitorSnapshot: vi.fn(),
  getMonitoringStatus: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
}));

vi.mock('../lib/runtime/is-tauri', () => ({
  isTauri: monitoringStoreMocks.isTauri,
}));

vi.mock('../lib/api/event-client', () => ({
  eventClient: {
    listenNetworkEvents: monitoringStoreMocks.listenNetworkEvents,
  },
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    getMonitorSnapshot: monitoringStoreMocks.getMonitorSnapshot,
    getMonitoringStatus: monitoringStoreMocks.getMonitoringStatus,
    startMonitoring: monitoringStoreMocks.startMonitoring,
    stopMonitoring: monitoringStoreMocks.stopMonitoring,
  },
}));

function resetStores(): void {
  useMonitoringStore.setState((state) => ({
    ...state,
    ...createInitialMonitoringState(),
  }));
  useNetworkRuntimeStore.setState({
    hostsByMac: {},
    lastScanResult: null,
    lastUpdatedAt: null,
  });
}

describe('monitoring store event bridge', () => {
  let networkEventHandler: ((payload: NetworkEventType) => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    teardownMonitoringEventBridgeForTests();
    resetStores();
    networkEventHandler = null;

    monitoringStoreMocks.isTauri.mockReset();
    monitoringStoreMocks.listenNetworkEvents.mockReset();
    monitoringStoreMocks.getMonitorSnapshot.mockReset();
    monitoringStoreMocks.getMonitoringStatus.mockReset();
    monitoringStoreMocks.startMonitoring.mockReset();
    monitoringStoreMocks.stopMonitoring.mockReset();

    monitoringStoreMocks.isTauri.mockReturnValue(true);
    monitoringStoreMocks.listenNetworkEvents.mockImplementation(async (handler) => {
      networkEventHandler = handler;
      return () => {};
    });
    monitoringStoreMocks.getMonitorSnapshot.mockResolvedValue({
      is_running: true,
      scan_count: 2,
      captured_at: '2026-02-25T07:10:00.000Z',
      devices: [],
    });
  });

  afterEach(() => {
    teardownMonitoringEventBridgeForTests();
    vi.useRealTimers();
  });

  it('registers a single network event listener and forwards device events to runtime store', async () => {
    await ensureMonitoringEventBridge(40);
    await ensureMonitoringEventBridge(60);

    expect(monitoringStoreMocks.listenNetworkEvents).toHaveBeenCalledTimes(1);
    expect(networkEventHandler).not.toBeNull();

    networkEventHandler?.({
      type: 'NewDeviceDiscovered',
      data: {
        ip: '192.168.1.200',
        mac: 'AA:BB:CC:DD:EE:99',
        hostname: 'lab-node',
        device_type: 'PC',
      },
    });

    const host = useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:99'];
    expect(host).toMatchObject({
      ip: '192.168.1.200',
      mac: 'AA:BB:CC:DD:EE:99',
      hostname: 'lab-node',
      device_type: 'PC',
      discovery_method: 'ARP+MONITOR',
    });
    expect(useMonitoringStore.getState().events[0]?.type).toBe('NewDeviceDiscovered');
  });

  it('runs snapshot drift guard on MonitoringStarted and stops it on MonitoringStopped', async () => {
    await ensureMonitoringEventBridge();
    expect(networkEventHandler).not.toBeNull();

    networkEventHandler?.({
      type: 'MonitoringStarted',
      data: { interval_seconds: 5 },
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(monitoringStoreMocks.getMonitorSnapshot).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10000);
    expect(monitoringStoreMocks.getMonitorSnapshot).toHaveBeenCalledTimes(2);

    networkEventHandler?.({
      type: 'MonitoringStopped',
    });

    const callsBeforeStop = monitoringStoreMocks.getMonitorSnapshot.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20000);
    expect(monitoringStoreMocks.getMonitorSnapshot).toHaveBeenCalledTimes(callsBeforeStop);
  });
});
