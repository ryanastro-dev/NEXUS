import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TopologyView from './TopologyView';
import { useDeviceDetailStore } from '../store/device-detail-store';
import { useNetworkRuntimeStore } from '../store/network-runtime-store';

const topologyMocks = vi.hoisted(() => ({
  useTheme: vi.fn(),
  useScanContext: vi.fn(),
  useAssistant: vi.fn(),
  getMappingTheme: vi.fn(),
  generateTopologyLayout: vi.fn(),
  lastOnNodeClick: null as null | ((event: unknown, node: { id: string }) => void),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: topologyMocks.useTheme,
}));

vi.mock('../hooks/useScan', () => ({
  useScanContext: topologyMocks.useScanContext,
}));

vi.mock('../hooks/useAssistant', () => ({
  useAssistant: topologyMocks.useAssistant,
}));

vi.mock('../lib/mapping-themes', () => ({
  getMappingTheme: topologyMocks.getMappingTheme,
}));

vi.mock('../lib/topology-layout', () => ({
  generateTopologyLayout: topologyMocks.generateTopologyLayout,
}));

vi.mock('../components/topology/LiveTrafficMonitor', () => ({
  default: ({
    visible,
    hasScanData,
  }: {
    visible: boolean;
    hasScanData: boolean;
  }) => (
    <section data-testid="traffic-monitor">
      {visible ? 'visible' : 'hidden'}:{hasScanData ? 'data' : 'empty'}
    </section>
  ),
}));

vi.mock('./topology-view', () => ({
  phaseToStageIndex: () => 0,
  resolveLatencyEdgeColor: () => '#38bdf8',
  TopologyAssistantOverlay: ({ networkReport }: { networkReport: unknown }) => (
    <section data-testid="assistant-overlay">{networkReport ? 'report' : 'none'}</section>
  ),
  TopologyCanvas: ({
    nodes,
    enhancedEdges,
    assistantOverlay,
    onNodeClick,
  }: {
    nodes: Array<{ id: string }>;
    enhancedEdges: Array<{ id: string }>;
    assistantOverlay: ReactNode;
    onNodeClick: (event: unknown, node: { id: string }) => void;
  }) => (
    (() => {
      topologyMocks.lastOnNodeClick = onNodeClick;
      return (
        <section data-testid="topology-canvas">
          nodes:{nodes.length} edges:{enhancedEdges.length}
          {assistantOverlay}
        </section>
      );
    })()
  ),
  TopologyEmptyState: ({ tauriAvailable }: { tauriAvailable: boolean }) => (
    <section data-testid="topology-empty">{tauriAvailable ? 'tauri' : 'browser'}</section>
  ),
  TopologyLoadingState: ({ scanProgress }: { scanProgress: number }) => (
    <section data-testid="topology-loading">{scanProgress}</section>
  ),
}));

function setupCommonMocks() {
  topologyMocks.useTheme.mockReturnValue({ theme: 'light' });
  topologyMocks.useAssistant.mockReturnValue({
    isGeneratingReport: false,
    networkReport: null,
    networkReportError: null,
    generateNetworkReport: vi.fn(),
    clearNetworkReport: vi.fn(),
    isTroubleshooting: false,
    troubleshootAdvice: null,
    troubleshootError: null,
    troubleshootDevice: vi.fn(),
    clearTroubleshootAdvice: vi.fn(),
  });
  topologyMocks.getMappingTheme.mockReturnValue({
    nodeComponent: 'default',
    backgroundGradient: '',
    backgroundColor: '#0f172a',
    edgeColor: '#38bdf8',
    edgeStyle: 'smoothstep',
    edgeWidth: 2,
    edgeOpacity: 0.8,
    showTrafficMonitor: true,
  });
  topologyMocks.generateTopologyLayout.mockImplementation((hosts: Array<{ ip: string }>) => ({
    nodes: hosts.map((host) => ({ id: host.ip, data: {} })),
    edges: [],
  }));
}

describe('TopologyView snapshots', () => {
  beforeEach(() => {
    topologyMocks.lastOnNodeClick = null;
    useDeviceDetailStore.getState().closeDeviceDetails();
    useNetworkRuntimeStore.setState({
      hostsByMac: {},
      lastScanResult: null,
      lastUpdatedAt: null,
    });
  });

  it('renders empty state snapshot', () => {
    setupCommonMocks();
    topologyMocks.useScanContext.mockReturnValue({
      scanResult: null,
      isScanning: false,
      tauriAvailable: true,
      scan: vi.fn(),
      scanProgress: 0,
      scanPhase: null,
    });

    const { asFragment } = render(<TopologyView />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders discovered topology snapshot', () => {
    setupCommonMocks();
    topologyMocks.useScanContext.mockReturnValue({
      scanResult: {
        interface_name: 'eth0',
        local_ip: '192.168.88.10',
        local_mac: '00:11:22:33:44:55',
        subnet: '192.168.88.0/24',
        scan_method: 'Active ARP + ICMP + TCP',
        arp_discovered: 1,
        icmp_discovered: 1,
        total_hosts: 1,
        scan_duration_ms: 1000,
        active_hosts: [
          {
            ip: '192.168.88.1',
            mac: 'AA:BB:CC:DD:EE:01',
            device_type: 'ROUTER',
            risk_score: 12,
            discovery_method: 'ARP+ICMP',
          },
        ],
      },
      isScanning: false,
      tauriAvailable: true,
      scan: vi.fn(),
      scanProgress: 100,
      scanPhase: 'complete',
    });

    const { asFragment } = render(<TopologyView />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('opens detail store when a topology node is clicked', () => {
    setupCommonMocks();
    topologyMocks.useScanContext.mockReturnValue({
      scanResult: {
        interface_name: 'eth0',
        local_ip: '192.168.88.10',
        local_mac: '00:11:22:33:44:55',
        subnet: '192.168.88.0/24',
        scan_method: 'Active ARP + ICMP + TCP',
        arp_discovered: 1,
        icmp_discovered: 1,
        total_hosts: 1,
        scan_duration_ms: 1000,
        active_hosts: [
          {
            ip: '192.168.88.1',
            mac: 'AA:BB:CC:DD:EE:01',
            hostname: 'gateway',
            device_type: 'ROUTER',
            risk_score: 12,
            discovery_method: 'ARP+ICMP',
          },
        ],
      },
      isScanning: false,
      tauriAvailable: true,
      scan: vi.fn(),
      scanProgress: 100,
      scanPhase: 'complete',
    });

    render(<TopologyView />);
    topologyMocks.lastOnNodeClick?.({}, { id: '192.168.88.1' });

    expect(useDeviceDetailStore.getState().selectedDevice?.ip).toBe('192.168.88.1');
  });
});
