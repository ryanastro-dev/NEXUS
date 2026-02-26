import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edge, NodeMouseHandler, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import LiveTrafficMonitor from '../components/topology/LiveTrafficMonitor';
import type { TroubleshootTarget } from '../components/topology/live-traffic-monitor';
import DeviceNode from '../components/topology/DeviceNode';
import CyberDeviceNode from '../components/topology/CyberDeviceNode';
import MeshDeviceNode from '../components/topology/MeshDeviceNode';
import type { MappingDesign, TopologyViewMode } from '../components/topology/TopologyControls';
import { useAssistant } from '../hooks/useAssistant';
import { HostInfo, useScanContext } from '../hooks/useScan';
import { useTheme } from '../hooks/useTheme';
import { getMappingTheme } from '../lib/mapping-themes';
import { generateTopologyLayout } from '../lib/topology-layout';
import { useDeviceDetailStore } from '../store/device-detail-store';
import { useNetworkRuntimeStore } from '../store/network-runtime-store';
import {
  TopologyAssistantOverlay,
  TopologyCanvas,
  TopologyCanvas3D,
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

const TOPOLOGY_AUTO_PLAY_INTERVAL_MS = 7000;
const TOPOLOGY_DESIGN_SEQUENCE: MappingDesign[] = ['default', 'cyber', 'mesh'];

function nextMappingDesign(current: MappingDesign): MappingDesign {
  const currentIndex = TOPOLOGY_DESIGN_SEQUENCE.indexOf(current);
  if (currentIndex === -1) {
    return TOPOLOGY_DESIGN_SEQUENCE[0];
  }

  const nextIndex = (currentIndex + 1) % TOPOLOGY_DESIGN_SEQUENCE.length;
  return TOPOLOGY_DESIGN_SEQUENCE[nextIndex];
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
  const runtimeHostsByMac = useNetworkRuntimeStore((state) => state.hostsByMac);
  const openDeviceDetails = useDeviceDetailStore((state) => state.openDeviceDetails);
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
  const [viewMode, setViewMode] = useState<TopologyViewMode>(() => {
    const saved = localStorage.getItem('topology-view-mode');
    return saved === '3d' ? '3d' : '2d';
  });
  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    const saved = localStorage.getItem('topology-auto-play');
    return saved === 'true';
  });
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);
  const activeStageIndex = useMemo(() => phaseToStageIndex(scanPhase), [scanPhase]);
  const runtimeHosts = useMemo(() => Object.values(runtimeHostsByMac), [runtimeHostsByMac]);
  const topologyHosts = useMemo(
    () => (runtimeHosts.length > 0 ? runtimeHosts : (scanResult?.active_hosts ?? [])),
    [runtimeHosts, scanResult?.active_hosts],
  );

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

  useEffect(() => {
    if (!isAutoPlay) {
      return;
    }
    if (isScanning || topologyHosts.length === 0) {
      return;
    }

    const autoPlayTimer = window.setInterval(() => {
      setMappingDesign((currentDesign) => {
        const nextDesign = nextMappingDesign(currentDesign);
        localStorage.setItem('topology-design', nextDesign);
        return nextDesign;
      });
    }, TOPOLOGY_AUTO_PLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(autoPlayTimer);
    };
  }, [isAutoPlay, isScanning, topologyHosts.length]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (topologyHosts.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateTopologyLayout(topologyHosts);
  }, [topologyHosts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setEdges, setNodes]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      if (topologyHosts.length === 0) return;
      const device = topologyHosts.find((host) => host.ip === nodeId);
      if (device && onDeviceClick) {
        onDeviceClick(device);
      } else if (device) {
        openDeviceDetails(device);
      }
    },
    [onDeviceClick, openDeviceDetails, topologyHosts],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      handleSelectNode(String(node.id));
    },
    [handleSelectNode],
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
    setIsAutoPlay(false);
    localStorage.setItem('topology-auto-play', 'false');
  }, []);

  const handleAutoPlayToggle = useCallback(() => {
    setIsAutoPlay((previous) => {
      const next = !previous;
      localStorage.setItem('topology-auto-play', String(next));
      return next;
    });
  }, []);

  const handleViewModeChange = useCallback((mode: TopologyViewMode) => {
    setViewMode(mode);
    localStorage.setItem('topology-view-mode', mode);
  }, []);

  const themeConfig = useMemo(() => getMappingTheme(mappingDesign, isDark), [mappingDesign, isDark]);

  const handleGenerateReport = useCallback(() => {
    const hosts = topologyHosts.length > 0 ? topologyHosts : undefined;
    const subnet = scanResult?.subnet;
    void generateNetworkReport(hosts, subnet);
  }, [generateNetworkReport, topologyHosts, scanResult?.subnet]);

  const handleTroubleshootOffline = useCallback(
    (target: TroubleshootTarget) => {
      const matchedHost = topologyHosts.find((host) => {
        const byMac = target.mac && host.mac.toLowerCase() === target.mac.toLowerCase();
        const byIp = target.ip && host.ip === target.ip;
        return Boolean(byMac || byIp);
      });

      const host = matchedHost ?? buildFallbackHost(target);
      void troubleshootDevice(host, ['Device transitioned to offline state in monitor event stream.']);
    },
    [topologyHosts, troubleshootDevice],
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

  const hasScanData = topologyHosts.length > 0;

  let topologyContent: ReactNode;
  if (!hasScanData && !isScanning) {
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
      viewMode === '3d' ? (
        <TopologyCanvas3D
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          bgColor={bgColor}
          isDark={isDark}
          isLocked={isLocked}
          mappingDesign={mappingDesign}
          themeConfig={themeConfig}
          nodes={nodes}
          enhancedEdges={enhancedEdges}
          onNodeSelect={handleSelectNode}
          onLockToggle={handleLockToggle}
          onDesignChange={handleDesignChange}
          isAutoPlay={isAutoPlay}
          onAutoPlayToggle={handleAutoPlayToggle}
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
      ) : (
        <TopologyCanvas
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
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
          isAutoPlay={isAutoPlay}
          onAutoPlayToggle={handleAutoPlayToggle}
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
      )
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
