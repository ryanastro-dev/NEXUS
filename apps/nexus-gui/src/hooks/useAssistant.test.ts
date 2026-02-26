import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DeviceSecurityAnalysis,
  DeviceTroubleshootAdvice,
  HostInfo,
  NetworkReportSummary,
} from '../lib/api/types';
import { useAssistant } from './useAssistant';

const assistantMocks = vi.hoisted(() => ({
  analyzeDeviceSecurity: vi.fn<(device: HostInfo) => Promise<DeviceSecurityAnalysis>>(),
  generateNetworkReport: vi.fn<
    (hosts?: HostInfo[], subnet?: string) => Promise<NetworkReportSummary>
  >(),
  troubleshootDevice: vi.fn<
    (device: HostInfo, symptoms?: string[]) => Promise<DeviceTroubleshootAdvice>
  >(),
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    analyzeDeviceSecurity: assistantMocks.analyzeDeviceSecurity,
    generateNetworkReport: assistantMocks.generateNetworkReport,
    troubleshootDevice: assistantMocks.troubleshootDevice,
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

function createNetworkReport(summary: string): NetworkReportSummary {
  return {
    generated_at: new Date().toISOString(),
    subnet: '192.168.1.0/24',
    total_hosts: 3,
    online_hosts: 2,
    offline_hosts: 1,
    executive_summary: summary,
    topology_highlights: ['highlight'],
    key_risks: ['risk'],
    recommended_actions: ['action'],
    metadata: {},
  };
}

function createTroubleshootAdvice(summary: string): DeviceTroubleshootAdvice {
  return {
    target: '192.168.1.33',
    ip: '192.168.1.33',
    mac: 'AA:BB:CC:DD:EE:33',
    status: 'offline',
    summary,
    likely_causes: ['cause'],
    diagnostic_steps: ['step'],
    suggested_commands: ['ping 192.168.1.33'],
    metadata: {},
  };
}

describe('useAssistant.analyzeDeviceSecurity', () => {
  beforeEach(() => {
    assistantMocks.analyzeDeviceSecurity.mockReset();
    assistantMocks.generateNetworkReport.mockReset();
    assistantMocks.troubleshootDevice.mockReset();
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
    expect(result.current.aiActionTelemetry.device_security.status).toBe('success');
    expect(result.current.aiActionTelemetry.device_security.samples).toBe(1);
    expect(result.current.aiActionTelemetry.device_security.start_ms).not.toBeNull();
    expect(result.current.aiActionTelemetry.device_security.end_ms).not.toBeNull();
    expect(result.current.aiActionTelemetry.device_security.duration_ms).not.toBeNull();
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

  it('deduplicates concurrent network report requests for same inputs', async () => {
    const deferred = createDeferred<NetworkReportSummary>();
    assistantMocks.generateNetworkReport.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useAssistant());
    const hosts = [createDevice({ ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:10' })];

    let firstCall: Promise<NetworkReportSummary | null> | undefined;
    let secondCall: Promise<NetworkReportSummary | null> | undefined;

    await act(async () => {
      firstCall = result.current.generateNetworkReport(hosts, '192.168.1.0/24');
      secondCall = result.current.generateNetworkReport(hosts, '192.168.1.0/24');
    });

    expect(assistantMocks.generateNetworkReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(createNetworkReport('deduped report'));
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.isGeneratingReport).toBe(false);
    expect(result.current.networkReport?.executive_summary).toBe('deduped report');
    expect(result.current.aiActionTelemetry.network_report.status).toBe('success');
    expect(result.current.aiActionTelemetry.network_report.samples).toBe(1);
  });

  it('deduplicates concurrent troubleshoot requests for same inputs', async () => {
    const deferred = createDeferred<DeviceTroubleshootAdvice>();
    assistantMocks.troubleshootDevice.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useAssistant());
    const device = createDevice();
    const symptoms = ['offline', 'latency spike'];

    let firstCall: Promise<DeviceTroubleshootAdvice | null> | undefined;
    let secondCall: Promise<DeviceTroubleshootAdvice | null> | undefined;

    await act(async () => {
      firstCall = result.current.troubleshootDevice(device, symptoms);
      secondCall = result.current.troubleshootDevice(device, symptoms);
    });

    expect(assistantMocks.troubleshootDevice).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(createTroubleshootAdvice('deduped troubleshoot'));
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.isTroubleshooting).toBe(false);
    expect(result.current.troubleshootAdvice?.summary).toBe('deduped troubleshoot');
    expect(result.current.aiActionTelemetry.troubleshoot.status).toBe('success');
    expect(result.current.aiActionTelemetry.troubleshoot.samples).toBe(1);
  });

  it('records error telemetry when AI call fails', async () => {
    assistantMocks.analyzeDeviceSecurity.mockRejectedValueOnce(new Error('ai timeout'));
    const { result } = renderHook(() => useAssistant());
    const device = createDevice();

    await act(async () => {
      await result.current.analyzeDeviceSecurity(device);
    });

    expect(result.current.deviceError).toContain('ai timeout');
    expect(result.current.aiActionTelemetry.device_security.status).toBe('error');
    expect(result.current.aiActionTelemetry.device_security.samples).toBe(1);
    expect(result.current.aiActionTelemetry.device_security.duration_ms).not.toBeNull();
  });
});
