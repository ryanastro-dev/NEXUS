import { fireEvent, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DeviceList from './DeviceList';
import { useDeviceDetailStore } from '../store/device-detail-store';
import { useNetworkRuntimeStore } from '../store/network-runtime-store';

const listMocks = vi.hoisted(() => ({
  useScanContext: vi.fn(),
}));

vi.mock('../hooks/useScan', () => ({
  useScanContext: listMocks.useScanContext,
}));

vi.mock('../components/dashboard/DeviceCard', () => ({
  default: ({ device, onClick }: { device: { ip: string }; onClick?: () => void }) => (
    <article data-testid="device-card" onClick={onClick}>
      {device.ip}
    </article>
  ),
}));

vi.mock('../components/dashboard/DeviceSkeletonCard', () => ({
  default: () => <article data-testid="device-skeleton">skeleton</article>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      layoutId: _layoutId,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      layoutId?: string;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('DeviceList snapshots', () => {
  beforeEach(() => {
    useDeviceDetailStore.getState().closeDeviceDetails();
    useNetworkRuntimeStore.setState({
      hostsByMac: {},
      lastScanResult: null,
      lastUpdatedAt: null,
    });
  });

  const discoveredScanPayload = {
    interface_name: 'eth0',
    local_ip: '192.168.88.10',
    local_mac: '00:11:22:33:44:55',
    subnet: '192.168.88.0/24',
    scan_method: 'Active ARP + ICMP + TCP',
    arp_discovered: 2,
    icmp_discovered: 2,
    total_hosts: 2,
    scan_duration_ms: 1200,
    active_hosts: [
      {
        ip: '192.168.88.1',
        mac: 'AA:BB:CC:DD:EE:01',
        hostname: 'gateway',
        vendor: 'MikroTik',
        device_type: 'ROUTER',
        risk_score: 18,
        open_ports: [22, 80, 8728],
        discovery_method: 'ARP+ICMP+TCP',
        response_time_ms: 2,
      },
      {
        ip: '192.168.88.20',
        mac: 'AA:BB:CC:DD:EE:20',
        hostname: 'laptop',
        vendor: 'Dell',
        device_type: 'PC',
        risk_score: 25,
        open_ports: [443],
        discovery_method: 'ARP+ICMP',
        response_time_ms: 5,
      },
    ],
  } as const;

  it('renders initial empty-state snapshot', () => {
    listMocks.useScanContext.mockReturnValue({
      scanResult: null,
      isScanning: false,
      tauriAvailable: true,
    });

    const { asFragment } = render(<DeviceList />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders discovered devices snapshot', () => {
    listMocks.useScanContext.mockReturnValue({
      scanResult: discoveredScanPayload,
      isScanning: false,
      tauriAvailable: true,
    });

    const { asFragment } = render(<DeviceList />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens detail store when card is clicked without explicit onDeviceClick prop', () => {
    listMocks.useScanContext.mockReturnValue({
      scanResult: discoveredScanPayload,
      isScanning: false,
      tauriAvailable: true,
    });

    render(<DeviceList />);
    fireEvent.click(screen.getAllByTestId('device-card')[0]);

    expect(useDeviceDetailStore.getState().selectedDevice?.ip).toBe('192.168.88.1');
  });
});
