import { beforeEach, describe, expect, it } from 'vitest';

import type { ScanResult } from '../lib/api/types';
import { useNetworkRuntimeStore } from './network-runtime-store';

function resetRuntimeStore(): void {
  useNetworkRuntimeStore.setState({
    hostsByMac: {},
    lastScanResult: null,
    lastUpdatedAt: null,
  });
}

function buildScanResult(): ScanResult {
  return {
    interface_name: 'eth0',
    local_ip: '192.168.1.100',
    local_mac: '00:11:22:33:44:55',
    subnet: '192.168.1.0/24',
    scan_method: 'ARP+ICMP',
    arp_discovered: 1,
    icmp_discovered: 1,
    total_hosts: 1,
    scan_duration_ms: 900,
    active_hosts: [
      {
        ip: '192.168.1.1',
        mac: 'AA:BB:CC:DD:EE:01',
        device_type: 'ROUTER',
        risk_score: 12,
        discovery_method: 'ARP+ICMP',
        response_time_ms: 2,
      },
    ],
  };
}

describe('network runtime store', () => {
  beforeEach(() => {
    resetRuntimeStore();
  });

  it('hydrates scan hosts and applies device lifecycle events', () => {
    useNetworkRuntimeStore.getState().hydrateFromScan(buildScanResult());

    useNetworkRuntimeStore.getState().applyNetworkEvent({
      type: 'NewDeviceDiscovered',
      data: {
        ip: '192.168.1.23',
        mac: 'AA:BB:CC:DD:EE:23',
        hostname: 'printer',
        device_type: 'PRINTER',
      },
    });

    const discoveredHost =
      useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:23'];
    expect(discoveredHost).toMatchObject({
      ip: '192.168.1.23',
      mac: 'AA:BB:CC:DD:EE:23',
      hostname: 'printer',
      device_type: 'PRINTER',
      discovery_method: 'ARP+MONITOR',
      response_time_ms: 1,
    });

    useNetworkRuntimeStore.getState().applyNetworkEvent({
      type: 'DeviceWentOffline',
      data: {
        mac: 'AA:BB:CC:DD:EE:23',
        last_ip: '192.168.1.23',
        hostname: 'printer',
      },
    });

    expect(useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:23']).toMatchObject({
      discovery_method: 'MONITOR_OFFLINE',
      response_time_ms: null,
    });

    useNetworkRuntimeStore.getState().applyNetworkEvent({
      type: 'DeviceIpChanged',
      data: {
        mac: 'AA:BB:CC:DD:EE:23',
        old_ip: '192.168.1.23',
        new_ip: '192.168.1.77',
      },
    });

    expect(useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:23']?.ip).toBe(
      '192.168.1.77',
    );
  });

  it('reconciles monitor snapshots and marks missing monitor-tracked hosts offline', () => {
    useNetworkRuntimeStore.setState({
      hostsByMac: {
        'aa:bb:cc:dd:ee:10': {
          ip: '192.168.1.10',
          mac: 'AA:BB:CC:DD:EE:10',
          hostname: 'monitor-host',
          device_type: 'PC',
          risk_score: 0,
          discovery_method: 'ARP+MONITOR',
          response_time_ms: 3,
        },
        'aa:bb:cc:dd:ee:11': {
          ip: '192.168.1.11',
          mac: 'AA:BB:CC:DD:EE:11',
          hostname: 'scan-host',
          device_type: 'PC',
          risk_score: 0,
          discovery_method: 'ARP+ICMP',
          response_time_ms: 4,
        },
      },
    });

    useNetworkRuntimeStore.getState().reconcileFromMonitorSnapshot({
      is_running: true,
      scan_count: 7,
      captured_at: '2026-02-25T07:30:00.000Z',
      devices: [
        {
          mac: 'AA:BB:CC:DD:EE:11',
          ip: '192.168.1.111',
          hostname: 'scan-host',
          device_type: 'PC',
          is_online: true,
        },
      ],
    });

    const monitorTrackedHost =
      useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:10'];
    const snapshotHost = useNetworkRuntimeStore.getState().hostsByMac['aa:bb:cc:dd:ee:11'];

    expect(monitorTrackedHost).toMatchObject({
      discovery_method: 'MONITOR_OFFLINE',
      response_time_ms: null,
    });
    expect(snapshotHost).toMatchObject({
      ip: '192.168.1.111',
      discovery_method: 'ARP+MONITOR',
      response_time_ms: 4,
    });
    expect(useNetworkRuntimeStore.getState().lastUpdatedAt).toBe('2026-02-25T07:30:00.000Z');
  });
});
