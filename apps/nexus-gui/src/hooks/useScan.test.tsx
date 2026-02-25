import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScanResult } from '../lib/api/types';
import { useScan } from './useScan';

const scanMocks = vi.hoisted(() => ({
  isTauri: vi.fn<() => boolean>(),
  scanNetwork: vi.fn<(preferredInterface?: string) => Promise<ScanResult>>(),
  mockScanNetwork: vi.fn<() => Promise<ScanResult>>(),
  cancelActiveScan: vi.fn<() => Promise<void>>(),
  listenNetworkEvents: vi.fn<
    (handler: (payload: unknown) => void) => Promise<() => void>
  >(),
}));

vi.mock('../lib/runtime/is-tauri', () => ({
  isTauri: scanMocks.isTauri,
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    scanNetwork: scanMocks.scanNetwork,
    mockScanNetwork: scanMocks.mockScanNetwork,
    cancelActiveScan: scanMocks.cancelActiveScan,
  },
}));

vi.mock('../lib/api/event-client', () => ({
  eventClient: {
    listenNetworkEvents: scanMocks.listenNetworkEvents,
  },
}));

function buildScanResult(): ScanResult {
  return {
    interface_name: 'eth0',
    local_ip: '192.168.88.10',
    local_mac: '00:11:22:33:44:55',
    subnet: '192.168.88.0/24',
    scan_method: 'Active ARP + ICMP + TCP',
    arp_discovered: 1,
    icmp_discovered: 1,
    total_hosts: 1,
    scan_duration_ms: 1500,
    active_hosts: [
      {
        ip: '192.168.88.1',
        mac: 'AA:BB:CC:DD:EE:01',
        device_type: 'ROUTER',
        risk_score: 20,
        discovery_method: 'ARP+ICMP+TCP',
      },
    ],
  };
}

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolve?.(value);
    },
  };
}

describe('useScan', () => {
  beforeEach(() => {
    localStorage.clear();
    scanMocks.isTauri.mockReset();
    scanMocks.scanNetwork.mockReset();
    scanMocks.mockScanNetwork.mockReset();
    scanMocks.cancelActiveScan.mockReset();
    scanMocks.listenNetworkEvents.mockReset();
    scanMocks.isTauri.mockReturnValue(true);
    scanMocks.cancelActiveScan.mockResolvedValue(undefined);
    scanMocks.listenNetworkEvents.mockResolvedValue(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('runs normal scan with preferred interface and returns to ready state', async () => {
    localStorage.setItem(
      'netmapper-settings',
      JSON.stringify({ preferredInterface: 'Ethernet 2' }),
    );
    scanMocks.scanNetwork.mockResolvedValue(buildScanResult());

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.scan();
    });

    expect(scanMocks.scanNetwork).toHaveBeenCalledWith('Ethernet 2');
    expect(scanMocks.mockScanNetwork).not.toHaveBeenCalled();
    expect(result.current.scanStatus).toBe('complete');
    expect(result.current.scanResult?.total_hosts).toBe(1);
    expect(result.current.scanPhase).toBe('complete');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    expect(result.current.scanStatus).toBe('ready');
    expect(result.current.scanProgress).toBe(0);
    expect(result.current.scanPhase).toBeNull();
  });

  it('uses demo scan command when demo mode is enabled', async () => {
    localStorage.setItem('demo-mode-enabled', 'true');
    scanMocks.mockScanNetwork.mockResolvedValue(buildScanResult());

    const { result } = renderHook(() => useScan());

    await act(async () => {
      await result.current.scan();
    });

    expect(scanMocks.mockScanNetwork).toHaveBeenCalledTimes(1);
    expect(scanMocks.scanNetwork).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
  });

  it('stopScan cancels active request and clears scan state', async () => {
    const deferredScan = createDeferred<ScanResult>();
    scanMocks.scanNetwork.mockReturnValue(deferredScan.promise);

    const { result } = renderHook(() => useScan());

    act(() => {
      void result.current.scan();
    });

    expect(result.current.isScanning).toBe(true);

    act(() => {
      result.current.stopScan();
    });

    expect(scanMocks.cancelActiveScan).toHaveBeenCalledTimes(1);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanStatus).toBe('ready');

    deferredScan.resolve(buildScanResult());
    await act(async () => {
      await Promise.resolve();
    });
  });
});
