import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeviceSecurityAnalysis, HostInfo } from '../lib/api/types';
import { useAssistant } from './useAssistant';

const assistantMocks = vi.hoisted(() => ({
  analyzeDeviceSecurity: vi.fn<(device: HostInfo) => Promise<DeviceSecurityAnalysis>>(),
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    analyzeDeviceSecurity: assistantMocks.analyzeDeviceSecurity,
    generateNetworkReport: vi.fn(),
    troubleshootDevice: vi.fn(),
  },
}));

function createDevice(overrides: Partial<HostInfo> = {}): HostInfo {
  return {
    ip: '192.168.1.33',
    mac: 'AA:BB:CC:DD:EE:33',
    device_type: 'PC',
    risk_score: 35,
    discovery_method: 'ACTIVE_SCAN',
    ...overrides,
  };
}

function createAnalysis(summary: string): DeviceSecurityAnalysis {
  return {
    target: '192.168.1.33',
    ip: '192.168.1.33',
    mac: 'AA:BB:CC:DD:EE:33',
    risk_score: 35,
    risk_level: 'Medium',
    executive_summary: summary,
    key_findings: ['Open admin port'],
    recommended_actions: ['Disable insecure service'],
    metadata: {},
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useAssistant.analyzeDeviceSecurity', () => {
  beforeEach(() => {
    assistantMocks.analyzeDeviceSecurity.mockReset();
  });

  it('deduplicates concurrent requests for the same device', async () => {
    const deferred = createDeferred<DeviceSecurityAnalysis>();
    assistantMocks.analyzeDeviceSecurity.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useAssistant());

    const device = createDevice();
    let firstCall: Promise<DeviceSecurityAnalysis | null> | undefined;
    let secondCall: Promise<DeviceSecurityAnalysis | null> | undefined;

    await act(async () => {
      firstCall = result.current.analyzeDeviceSecurity(device);
      secondCall = result.current.analyzeDeviceSecurity(device);
    });

    expect(assistantMocks.analyzeDeviceSecurity).toHaveBeenCalledTimes(1);
    expect(result.current.isAnalyzingDevice).toBe(true);

    await act(async () => {
      deferred.resolve(createAnalysis('deduped'));
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.isAnalyzingDevice).toBe(false);
    expect(result.current.deviceError).toBeNull();
    expect(result.current.deviceSecurityAnalysis?.executive_summary).toBe('deduped');
  });

  it('returns cached analysis during cooldown window', async () => {
    assistantMocks.analyzeDeviceSecurity.mockResolvedValue(createAnalysis('cached'));
    const { result } = renderHook(() => useAssistant());
    const device = createDevice();

    await act(async () => {
      await result.current.analyzeDeviceSecurity(device);
    });
    await act(async () => {
      await result.current.analyzeDeviceSecurity(device);
    });

    expect(assistantMocks.analyzeDeviceSecurity).toHaveBeenCalledTimes(1);
    expect(result.current.deviceSecurityAnalysis?.executive_summary).toBe('cached');
  });

  it('bypasses cooldown cache when force option is enabled', async () => {
    assistantMocks.analyzeDeviceSecurity
      .mockResolvedValueOnce(createAnalysis('initial'))
      .mockResolvedValueOnce(createAnalysis('forced refresh'));
    const { result } = renderHook(() => useAssistant());
    const device = createDevice();

    await act(async () => {
      await result.current.analyzeDeviceSecurity(device);
    });
    await act(async () => {
      await result.current.analyzeDeviceSecurity(device, { force: true });
    });

    expect(assistantMocks.analyzeDeviceSecurity).toHaveBeenCalledTimes(2);
    expect(result.current.deviceSecurityAnalysis?.executive_summary).toBe('forced refresh');
  });
});
