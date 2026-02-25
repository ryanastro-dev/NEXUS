import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HostInfo, ScanResult } from '../lib/api/types';
import { useExport } from './useExport';

const exportMocks = vi.hoisted(() => ({
  save: vi.fn<() => Promise<string | null>>(),
  writeFile: vi.fn<(path: string, data: Uint8Array) => Promise<void>>(),
  exportDevicesToCsv: vi.fn<() => Promise<string>>(),
  exportScanReport: vi.fn<(scan: ScanResult, hosts: HostInfo[]) => Promise<number[]>>(),
  exportShowcaseReport: vi.fn<() => Promise<number[]>>(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: exportMocks.save,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: exportMocks.writeFile,
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    exportDevicesToCsv: exportMocks.exportDevicesToCsv,
    exportScanReport: exportMocks.exportScanReport,
    exportScanToCsv: vi.fn(),
    exportTopologyToJson: vi.fn(),
    exportScanToJson: vi.fn(),
    exportSecurityReport: vi.fn(),
    exportShowcaseReport: exportMocks.exportShowcaseReport,
  },
}));

function buildHost(): HostInfo {
  return {
    ip: '192.168.88.20',
    mac: 'AA:BB:CC:DD:EE:20',
    device_type: 'PC',
    risk_score: 10,
    discovery_method: 'ARP+ICMP',
  };
}

function buildScanResult(hosts: HostInfo[]): ScanResult {
  return {
    interface_name: 'eth0',
    local_ip: '192.168.88.10',
    local_mac: '00:11:22:33:44:55',
    subnet: '192.168.88.0/24',
    scan_method: 'Active ARP + ICMP + TCP',
    arp_discovered: hosts.length,
    icmp_discovered: hosts.length,
    total_hosts: hosts.length,
    scan_duration_ms: 1200,
    active_hosts: hosts,
  };
}

describe('useExport', () => {
  beforeEach(() => {
    exportMocks.save.mockReset();
    exportMocks.writeFile.mockReset();
    exportMocks.exportDevicesToCsv.mockReset();
    exportMocks.exportScanReport.mockReset();
    exportMocks.exportShowcaseReport.mockReset();
    exportMocks.writeFile.mockResolvedValue();
  });

  it('exports devices CSV and writes encoded bytes to selected file path', async () => {
    exportMocks.exportDevicesToCsv.mockResolvedValue('ip,mac\n192.168.88.1,AA');
    exportMocks.save.mockResolvedValue('C:\\temp\\devices.csv');

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportDevicesCSV();
    });

    expect(exportMocks.exportDevicesToCsv).toHaveBeenCalledTimes(1);
    expect(exportMocks.save).toHaveBeenCalledTimes(1);
    expect(exportMocks.writeFile).toHaveBeenCalledTimes(1);
    const [path, data] = exportMocks.writeFile.mock.calls[0];
    expect(path).toBe('C:\\temp\\devices.csv');
    expect(Array.from(data)).toEqual(Array.from(new TextEncoder().encode('ip,mac\n192.168.88.1,AA')));
    expect(result.current.exportingType).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles export failures and surfaces an error message', async () => {
    exportMocks.exportDevicesToCsv.mockRejectedValue(new Error('csv export failed'));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportDevicesCSV();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('csv export failed');
    });
    expect(result.current.exportingType).toBeNull();
  });

  it('exports PDF reports as binary output', async () => {
    const host = buildHost();
    const scan = buildScanResult([host]);
    exportMocks.exportScanReport.mockResolvedValue([37, 80, 68, 70]);
    exportMocks.save.mockResolvedValue('C:\\temp\\scan.pdf');

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportScanReportPDF(scan, [host]);
    });

    expect(exportMocks.exportScanReport).toHaveBeenCalledWith(scan, [host]);
    expect(exportMocks.writeFile).toHaveBeenCalledTimes(1);
    const [path, data] = exportMocks.writeFile.mock.calls[0];
    expect(path).toBe('C:\\temp\\scan.pdf');
    expect(data).toEqual(new Uint8Array([37, 80, 68, 70]));
    expect(result.current.error).toBeNull();
  });

  it('exports pre-generated showcase PDF without scan payload', async () => {
    exportMocks.exportShowcaseReport.mockResolvedValue([37, 80, 68, 70]);
    exportMocks.save.mockResolvedValue('C:\\temp\\showcase.pdf');

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportShowcaseReportPDF();
    });

    expect(exportMocks.exportShowcaseReport).toHaveBeenCalledTimes(1);
    expect(exportMocks.writeFile).toHaveBeenCalledTimes(1);
    const [path, data] = exportMocks.writeFile.mock.calls[0];
    expect(path).toBe('C:\\temp\\showcase.pdf');
    expect(data).toEqual(new Uint8Array([37, 80, 68, 70]));
    expect(result.current.error).toBeNull();
  });
});
