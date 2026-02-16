import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeMouseHandler,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  Clock3,
  Loader2,
  Network,
  Play,
  Radar,
  Shield,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import DeviceNode from '../components/topology/DeviceNode';
import CyberDeviceNode from '../components/topology/CyberDeviceNode';
import MeshDeviceNode from '../components/topology/MeshDeviceNode';
import TopologyControls, { MappingDesign } from '../components/topology/TopologyControls';
import LiveTrafficMonitor from '../components/topology/LiveTrafficMonitor';
import { useScanContext, HostInfo } from '../hooks/useScan';
import { generateTopologyLayout } from '../lib/topology-layout';
import { getMappingTheme } from '../lib/mapping-themes';
import { useTheme } from '../hooks/useTheme';

// Device type color mapping for MiniMap (moved outside component for performance)
const DEVICE_TYPE_COLORS: Record<string, string> = {
  ROUTER: '#3B82F6',
  SWITCH: '#10B981',
  ACCESS_POINT: '#0EA5E9',
  FIREWALL: '#EF4444',
  SERVER: '#F59E0B',
  NAS: '#F59E0B',
  LAPTOP: '#06B6D4',
  PC: '#06B6D4',
  MOBILE: '#14B8A6',
  PRINTER: '#22D3EE',
};



interface TopologyViewProps {
  onDeviceClick?: (device: HostInfo) => void;
}

interface TopologyNodeData {
  responseTime?: number;
}

interface ScanPipelineStage {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}

const SCAN_PIPELINE_STAGES: ScanPipelineStage[] = [
  {
    id: 'interface',
    title: 'Interface Handshake',
    detail: 'Validating adapter and subnet boundaries.',
    icon: Network,
  },
  {
    id: 'discovery',
    title: 'Host Discovery',
    detail: 'ARP + ICMP probing for reachable devices.',
    icon: Radar,
  },
  {
    id: 'services',
    title: 'Service Profiling',
    detail: 'TCP fingerprinting and response telemetry.',
    icon: Activity,
  },
  {
    id: 'render',
    title: 'Graph Synthesis',
    detail: 'Preparing topology graph and edge overlays.',
    icon: Shield,
  },
];

function phaseToStageIndex(phase: string | null): number {
  if (!phase) return 0;

  switch (phase) {
    case 'interface':
    case 'init':
      return 0;
    case 'discovery':
    case 'arp':
      return 1;
    case 'services':
    case 'probe':
    case 'icmp':
    case 'tcp':
      return 2;
    case 'render':
    case 'dns':
    case 'persist':
    case 'finalize':
    case 'complete':
      return 3;
    default:
      return 0;
  }
}

export default function TopologyView({ onDeviceClick }: TopologyViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { scanResult, isScanning, tauriAvailable, scan, scanProgress, scanPhase } = useScanContext();

  // Control panel state
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


  // Generate nodes and edges from real scan data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!scanResult?.active_hosts || scanResult.active_hosts.length === 0) {
      return { nodes: [], edges: [] };
    }
    return generateTopologyLayout(scanResult.active_hosts);
  }, [scanResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when scan result changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]); // setNodes and setEdges are stable

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (!scanResult?.active_hosts) return;
    const device = scanResult.active_hosts.find(h => h.ip === node.id);
    if (device && onDeviceClick) {
      onDeviceClick(device);
    }
  }, [onDeviceClick, scanResult]);

  // Control panel handlers
  const handleLockToggle = useCallback(() => {
    setIsLocked(prev => {
      const newValue = !prev;
      localStorage.setItem('topology-locked', String(newValue));
      return newValue;
    });
  }, []);

  const handleDesignChange = useCallback((design: MappingDesign) => {
    setMappingDesign(design);
    localStorage.setItem('topology-design', design);
  }, []);

  // Get current theme configuration
  const themeConfig = useMemo(() => getMappingTheme(mappingDesign, isDark), [mappingDesign, isDark]);

  // Dynamic node types based on theme
  // Note: Using 'as any' because the three node components have slightly different prop signatures
  // (some use NodeProps<any>, others use NodeProps without type param), creating a union type
  // that doesn't strictly match ReactFlow's NodeTypes interface. This is safe since all components
  // accept the same runtime props.
  const nodeTypes = useMemo(() => {
    const component = themeConfig.nodeComponent === 'cyber'
      ? CyberDeviceNode
      : themeConfig.nodeComponent === 'mesh'
      ? MeshDeviceNode
      : DeviceNode;
    
    return { device: component } as any;
  }, [themeConfig.nodeComponent]);

  // Theme-aware colors
  const bgColor = themeConfig.backgroundGradient || themeConfig.backgroundColor;
  const edgeColor = themeConfig.edgeColor;
  const controlsBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const controlsBorder = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.3)'; // Blue for dark, grey for light
  const controlsText = isDark ? '#F8FAFC' : '#0F172A';


  // Enhanced edge styling with theme-based configuration
  const enhancedEdges: Edge[] = useMemo(() => {
    return edges.map(edge => {
      // Get latency from source node data (if available)
      const sourceNode = nodes.find(n => n.id === edge.source);
      const sourceData = sourceNode?.data as TopologyNodeData | undefined;
      const latency = typeof sourceData?.responseTime === 'number' ? sourceData.responseTime : 50;
      
      // Color based on latency: green (<50ms), yellow (<100ms), red (>100ms)
      let strokeColor = edgeColor;
      if (latency < 50) strokeColor = '#10B981'; // green
      else if (latency < 100) strokeColor = '#F59E0B'; // yellow
      else strokeColor = '#EF4444'; // red

      // Apply mapping design theme (Cyber has glow effect)
      const glowFilter = mappingDesign === 'cyber' 
        ? 'drop-shadow(0 0 4px currentColor)'
        : 'none';

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
  }, [edges, nodes, edgeColor, mappingDesign, themeConfig]);

  // Empty state
  if (!scanResult && !isScanning) {
    return (
      <div className="h-full flex flex-col">
        <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: bgColor }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-28 left-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-8 right-12 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center p-5 sm:p-8">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full rounded-3xl border border-cyan-400/20 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                    <Network className="h-3.5 w-3.5" />
                    Topology Intelligence
                  </div>
                  <h2 className="text-2xl font-black leading-tight text-slate-100 sm:text-3xl">
                    Network map is ready to initialize
                  </h2>
                  <p className="max-w-2xl text-sm text-slate-300/85 sm:text-base">
                    Run a discovery cycle to build live node relationships, risk overlays, and traffic-aware edge paths.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                  <WifiOff className="h-8 w-8 text-cyan-200" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                    <Activity className="h-3.5 w-3.5" />
                    Discovery
                  </p>
                  <p className="text-xs text-slate-300">ARP + ICMP + TCP fingerprinting for topology baseline.</p>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                    <Shield className="h-3.5 w-3.5" />
                    Risk Overlay
                  </p>
                  <p className="text-xs text-slate-300">Device types and latency-driven edge health mapping.</p>
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                    <Network className="h-3.5 w-3.5" />
                    Controls
                  </p>
                  <p className="text-xs text-slate-300">Pan, zoom, lock nodes, and switch visual design modes.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => void scan()}
                  disabled={!tauriAvailable}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  Start Discovery
                </button>
                <p className="text-xs text-slate-400">
                  Shortcut: <span className="rounded border border-slate-600 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">Cmd/Ctrl + S</span>
                </p>
              </div>

              {!tauriAvailable && (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Tauri runtime unavailable. Start with <span className="font-mono">npm run tauri dev</span> to enable discovery.
                </p>
              )}
            </motion.section>
          </div>
        </div>

        {/* Live Traffic Monitor */}
        <LiveTrafficMonitor
          visible={themeConfig.showTrafficMonitor}
          isDark={isDark}
          hasScanData={false}
        />
      </div>
    );
  }

  // Loading state
  if (isScanning) {
    const progressPct =
      scanProgress > 0
        ? scanProgress
        : Math.round(((activeStageIndex + 1) / SCAN_PIPELINE_STAGES.length) * 100);
    const activeStageLabel =
      SCAN_PIPELINE_STAGES[activeStageIndex]?.title ?? 'Topology Discovery';

    return (
      <div className="h-full flex flex-col">
        <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: bgColor }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center p-5 sm:p-8">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full rounded-3xl border border-cyan-400/20 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Discovery Pipeline Active
                  </div>
                  <h2 className="text-2xl font-black leading-tight text-slate-100 sm:text-3xl">
                    Mapping your live network fabric
                  </h2>
                  <p className="max-w-2xl text-sm text-slate-300/85 sm:text-base">
                    Collecting hosts, profiling topology signals, and preparing graph overlays for command view.
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
                    Current phase: {activeStageLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">Elapsed</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-100">
                    <Clock3 className="h-4 w-4 text-cyan-200" />
                    {scanElapsedSeconds}s
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Topology synthesis in progress</span>
                  <span className="font-semibold text-cyan-300">{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800/70">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SCAN_PIPELINE_STAGES.map((stage, idx) => {
                  const isScanComplete = scanProgress >= 100;
                  const status =
                    isScanComplete || idx < activeStageIndex
                      ? 'complete'
                      : idx === activeStageIndex
                        ? 'active'
                        : 'pending';
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.id}
                      className={`rounded-xl border p-3 ${
                        status === 'complete'
                          ? 'border-emerald-400/25 bg-emerald-500/10'
                          : status === 'active'
                            ? 'border-cyan-400/30 bg-cyan-500/10'
                            : 'border-slate-700/60 bg-slate-900/65'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
                          <Icon className="h-3.5 w-3.5 text-cyan-300" />
                          {stage.title}
                        </p>
                        {status === 'complete' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        ) : status === 'active' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300">{stage.detail}</p>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Live Traffic Monitor */}
        <LiveTrafficMonitor
          visible={themeConfig.showTrafficMonitor}
          isDark={isDark}
          hasScanData={false}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* React Flow Canvas - takes remaining space */}
      <motion.div 
        className="flex-1 relative" 
        style={{ backgroundColor: bgColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Custom Control Panel */}
        <TopologyControls
          isLocked={isLocked}
          onLockToggle={handleLockToggle}
          mappingDesign={mappingDesign}
          onDesignChange={handleDesignChange}
        />
        
        <ReactFlow
          nodes={nodes}
          edges={enhancedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
          proOptions={{ hideAttribution: true }}
          colorMode={isDark ? 'dark' : 'light'}
          className={isDark ? 'dark' : ''}
          style={{
            backgroundColor: bgColor,
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={isDark ? 20 : 20}
            size={isDark ? 1.5 : 2}
            color={themeConfig.patternColor}
          />
          <Controls
            style={{
              backgroundColor: controlsBg,
              border: `1px solid ${controlsBorder}`,
              borderRadius: 12,
              color: controlsText,
              backdropFilter: 'blur(12px)',
              boxShadow: isDark 
                ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
                : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.1)',
            }}
            showInteractive={false}
          />
          <MiniMap
            maskColor={isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(248, 250, 252, 0.85)'}
            style={{
              backgroundColor: controlsBg,
              border: `1px solid ${controlsBorder}`,
              borderRadius: 12,
              backdropFilter: 'blur(12px)',
              boxShadow: isDark 
                ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
                : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.1)',
            }}
            nodeColor={(node) => {
              const deviceType = node.data?.deviceType;
              if (!deviceType || typeof deviceType !== 'string') {
                return '#94A3B8'; // Default gray for unknown/undefined types
              }
              return DEVICE_TYPE_COLORS[deviceType] || '#94A3B8';
            }}
            pannable
            zoomable
          />
        </ReactFlow>
      </motion.div>

      {/* Live Traffic Monitor */}
      <LiveTrafficMonitor
        visible={themeConfig.showTrafficMonitor}
        isDark={isDark}
        hasScanData={!!scanResult && scanResult.active_hosts.length > 0}
      />
    </div>
  );
}
