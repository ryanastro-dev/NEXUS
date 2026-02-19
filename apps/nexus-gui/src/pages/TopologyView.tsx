import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edge, NodeMouseHandler, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LiveTrafficMonitor from '../components/topology/LiveTrafficMonitor';
import type { TroubleshootTarget } from '../components/topology/live-traffic-monitor';
import DeviceNode from '../components/topology/DeviceNode';
import CyberDeviceNode from '../components/topology/CyberDeviceNode';
import MeshDeviceNode from '../components/topology/MeshDeviceNode';
import type { MappingDesign } from '../components/topology/TopologyControls';
import { useAssistant } from '../hooks/useAssistant';
import { HostInfo, useScanContext } from '../hooks/useScan';
import { useTheme } from '../hooks/useTheme';
import { getMappingTheme } from '../lib/mapping-themes';
import { generateTopologyLayout } from '../lib/topology-layout';
import {
  TopologyAssistantOverlay,
  TopologyCanvas,
  TopologyEmptyState,
  TopologyLoadingState,
  phaseToStageIndex,
  resolveLatencyEdgeColor,
} from './topology-view';

interface TopologyViewProps {
  onDeviceClick?: (device: HostInfo) => void;
}

interface TopologyNodeData {
  responseTime?: number;
}

function buildFallbackHost(target: TroubleshootTarget): HostInfo {
  return {
    ip: target.ip?.trim() || '0.0.0.0',
    mac: target.mac?.trim() || 'UNKNOWN',
    hostname: target.hostname,
    device_type: target.device_type ?? 'UNKNOWN',
    risk_score: 0,
    discovery_method: 'MONITOR_EVENT',
    open_ports: [],
    response_time_ms: null,
  };
}

export default function TopologyView({ onDeviceClick }: TopologyViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { scanResult, isScanning, tauriAvailable, scan, scanProgress, scanPhase } = useScanContext();
  const {
    isGeneratingReport,
    networkReport,
    networkReportError,
    generateNetworkReport,
    clearNetworkReport,
    isTroubleshooting,
    troubleshootAdvice,
    troubleshootError,
    troubleshootDevice,
    clearTroubleshootAdvice,
  } = useAssistant();

  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('topology-locked');
    return saved === 'true';
  });

  const [mappingDesign, setMappingDesign] = useState<MappingDesign>(() => {
    const saved = localStorage.getItem('topology-design') as MappingDesign;
    if (saved === 'cyber' || saved === 'mesh') return saved;
    return 'default';
  });
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);
  const activeStageIndex = useMemo(() => phaseToStageIndex(scanPhase), [scanPhase]);

  useEffect(() => {
    if (!isScanning) {
      setScanElapsedSeconds(0);
      return;
    }

    const elapsedTimer = window.setInterval(() => {
      setScanElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(elapsedTimer);
    };
  }, [isScanning]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!scanResult?.active_hosts || scanResult.active_hosts.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateTopologyLayout(scanResult.active_hosts);
  }, [scanResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setEdges, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!scanResult?.active_hosts) return;
      const device = scanResult.active_hosts.find((host) => host.ip === node.id);
      if (device && onDeviceClick) {
        onDeviceClick(device);
      }
    },
    [onDeviceClick, scanResult],
  );

  const handleLockToggle = useCallback(() => {
    setIsLocked((prev) => {
      const newValue = !prev;
      localStorage.setItem('topology-locked', String(newValue));
      return newValue;
    });
  }, []);

  const handleDesignChange = useCallback((design: MappingDesign) => {
    setMappingDesign(design);
    localStorage.setItem('topology-design', design);
  }, []);

  const themeConfig = useMemo(() => getMappingTheme(mappingDesign, isDark), [mappingDesign, isDark]);

  const handleGenerateReport = useCallback(() => {
    const hosts = scanResult?.active_hosts;
    const subnet = scanResult?.subnet;
    void generateNetworkReport(hosts, subnet);
  }, [generateNetworkReport, scanResult?.active_hosts, scanResult?.subnet]);

  const handleTroubleshootOffline = useCallback(
    (target: TroubleshootTarget) => {
      const matchedHost = scanResult?.active_hosts.find((host) => {
        const byMac = target.mac && host.mac.toLowerCase() === target.mac.toLowerCase();
        const byIp = target.ip && host.ip === target.ip;
        return Boolean(byMac || byIp);
      });

      const host = matchedHost ?? buildFallbackHost(target);
      void troubleshootDevice(host, ['Device transitioned to offline state in monitor event stream.']);
    },
    [scanResult?.active_hosts, troubleshootDevice],
  );

  // Safe cast for ReactFlow node-type registry compatibility across custom node components.
  const nodeTypes = useMemo(() => {
    const component =
      themeConfig.nodeComponent === 'cyber'
        ? CyberDeviceNode
        : themeConfig.nodeComponent === 'mesh'
          ? MeshDeviceNode
          : DeviceNode;

    return { device: component } as any;
  }, [themeConfig.nodeComponent]);

  const bgColor = themeConfig.backgroundGradient || themeConfig.backgroundColor;
  const edgeColor = themeConfig.edgeColor;
  const controlsBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const controlsBorder = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.3)';
  const controlsText = isDark ? '#F8FAFC' : '#0F172A';

  const enhancedEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const sourceData = sourceNode?.data as TopologyNodeData | undefined;
      const latency =
        typeof sourceData?.responseTime === 'number' ? sourceData.responseTime : Number.NaN;

      const strokeColor = resolveLatencyEdgeColor(latency, edgeColor);
      const glowFilter = mappingDesign === 'cyber' ? 'drop-shadow(0 0 4px currentColor)' : 'none';

      return {
        ...edge,
        type: themeConfig.edgeStyle,
        animated: true,
        style: {
          stroke: strokeColor,
          strokeWidth: themeConfig.edgeWidth,
          opacity: themeConfig.edgeOpacity,
          filter: glowFilter,
        },
      };
    });
  }, [edgeColor, edges, mappingDesign, nodes, themeConfig]);

  const hasScanData = Boolean(scanResult && scanResult.active_hosts.length > 0);

  let topologyContent: ReactNode;
  if (!scanResult && !isScanning) {
    topologyContent = (
      <TopologyEmptyState
        bgColor={bgColor}
        tauriAvailable={tauriAvailable}
        isDark={isDark}
        onScan={() => {
          void scan();
        }}
      />
    );
  } else if (isScanning) {
    topologyContent = (
      <TopologyLoadingState
        bgColor={bgColor}
        scanProgress={scanProgress}
        activeStageIndex={activeStageIndex}
        scanElapsedSeconds={scanElapsedSeconds}
        isDark={isDark}
      />
    );
  } else {
    topologyContent = (
      <TopologyCanvas
        bgColor={bgColor}
        controlsBg={controlsBg}
        controlsBorder={controlsBorder}
        controlsText={controlsText}
        isDark={isDark}
        isLocked={isLocked}
        mappingDesign={mappingDesign}
        themeConfig={themeConfig}
        nodes={nodes}
        enhancedEdges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onLockToggle={handleLockToggle}
        onDesignChange={handleDesignChange}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        assistantOverlay={
          <TopologyAssistantOverlay
            isDark={isDark}
            isGeneratingReport={isGeneratingReport}
            networkReport={networkReport}
            networkReportError={networkReportError}
            onCloseReport={clearNetworkReport}
            isTroubleshooting={isTroubleshooting}
            troubleshootAdvice={troubleshootAdvice}
            troubleshootError={troubleshootError}
            onCloseTroubleshoot={clearTroubleshootAdvice}
          />
        }
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">{topologyContent}</div>
      <LiveTrafficMonitor
        visible={themeConfig.showTrafficMonitor}
        isDark={isDark}
        hasScanData={hasScanData}
        onTroubleshoot={handleTroubleshootOffline}
        isTroubleshooting={isTroubleshooting}
      />
    </div>
  );
}
