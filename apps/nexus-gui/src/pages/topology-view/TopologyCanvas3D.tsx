import { Edge, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';

import TopologyControls, {
  MappingDesign,
  TopologyViewMode,
} from '../../components/topology/TopologyControls';
import type { MappingThemeConfig } from '../../lib/mapping-themes';
import { DEVICE_TYPE_COLORS } from './constants';

interface TopologyNodeData {
  label?: string;
  ip?: string;
  deviceType?: string;
  isOnline?: boolean;
  responseTime?: number;
  riskScore?: number;
}

interface Topology3DNode {
  id: string;
  label: string;
  deviceType: string;
  isOnline: boolean;
  responseTime: number | null;
  riskScore: number;
  color: string;
  val: number;
}

interface Topology3DLink {
  source: string;
  target: string;
  color: string;
  width: number;
  particles: number;
}

interface OrbitControlsLike {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
}

interface TopologyCanvas3DProps {
  viewMode?: TopologyViewMode;
  onViewModeChange?: (mode: TopologyViewMode) => void;
  bgColor: string;
  isDark: boolean;
  isLocked: boolean;
  mappingDesign: MappingDesign;
  themeConfig: MappingThemeConfig;
  nodes: Node[];
  enhancedEdges: Edge[];
  onNodeSelect: (nodeId: string) => void;
  onLockToggle: () => void;
  onDesignChange: (design: MappingDesign) => void;
  isAutoPlay?: boolean;
  onAutoPlayToggle?: () => void;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  assistantOverlay?: ReactNode;
}

function resolve3DBackground(bgColor: string, isDark: boolean): string {
  const trimmed = bgColor.trim().toLowerCase();
  if (trimmed.startsWith('linear-gradient')) {
    return isDark ? '#020617' : '#f8fafc';
  }
  return bgColor;
}

export function TopologyCanvas3D({
  viewMode = '2d',
  onViewModeChange,
  bgColor,
  isDark,
  isLocked,
  mappingDesign,
  themeConfig,
  nodes,
  enhancedEdges,
  onNodeSelect,
  onLockToggle,
  onDesignChange,
  isAutoPlay = false,
  onAutoPlayToggle,
  onGenerateReport,
  isGeneratingReport = false,
  assistantOverlay,
}: TopologyCanvas3DProps) {
  const graphRef = useRef<ForceGraphMethods<Topology3DNode, Topology3DLink> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const threeBackground = useMemo(
    () => resolve3DBackground(bgColor, isDark),
    [bgColor, isDark],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: Math.max(1, Math.round(container.clientWidth)),
        height: Math.max(1, Math.round(container.clientHeight)),
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const graphData = useMemo(() => {
    const mappedNodes: Topology3DNode[] = nodes.map((node) => {
      const data = (node.data ?? {}) as TopologyNodeData;
      const deviceType = typeof data.deviceType === 'string' ? data.deviceType : 'UNKNOWN';
      const riskScore = Number.isFinite(data.riskScore) ? Number(data.riskScore) : 0;
      const responseTime = Number.isFinite(data.responseTime)
        ? Number(data.responseTime)
        : null;
      const isOnline = data.isOnline !== false;
      const label = data.label?.trim() || data.ip?.trim() || String(node.id);

      return {
        id: String(node.id),
        label,
        deviceType,
        isOnline,
        responseTime,
        riskScore,
        color: DEVICE_TYPE_COLORS[deviceType] ?? '#94A3B8',
        val: Math.max(4, 4 + riskScore / 18),
      };
    });

    const knownIds = new Set(mappedNodes.map((node) => node.id));
    const mappedLinks: Topology3DLink[] = enhancedEdges
      .map((edge) => {
        const source = String(edge.source);
        const target = String(edge.target);
        if (!knownIds.has(source) || !knownIds.has(target)) {
          return null;
        }

        return {
          source,
          target,
          color: typeof edge.style?.stroke === 'string' ? edge.style.stroke : themeConfig.edgeColor,
          width:
            typeof edge.style?.strokeWidth === 'number'
              ? edge.style.strokeWidth
              : themeConfig.edgeWidth,
          particles: mappingDesign === 'cyber' ? 2 : 1,
        };
      })
      .filter((link): link is Topology3DLink => link !== null);

    return { nodes: mappedNodes, links: mappedLinks };
  }, [enhancedEdges, mappingDesign, nodes, themeConfig.edgeColor, themeConfig.edgeWidth]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graphData.nodes.length === 0) {
      return;
    }

    graph.zoomToFit(800, 80);
  }, [graphData]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const controls = graph.controls() as OrbitControlsLike;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = isAutoPlay;
    controls.autoRotateSpeed = 0.4;
  }, [isAutoPlay]);

  return (
    <div className="flex h-full flex-col">
      <motion.div
        className="relative flex-1 overflow-hidden"
        style={{ backgroundColor: threeBackground }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <TopologyControls
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          isLocked={isLocked}
          onLockToggle={onLockToggle}
          mappingDesign={mappingDesign}
          onDesignChange={onDesignChange}
          isAutoPlay={isAutoPlay}
          onAutoPlayToggle={onAutoPlayToggle}
          onGenerateReport={onGenerateReport}
          isGeneratingReport={isGeneratingReport}
        />

        {assistantOverlay}

        <div ref={containerRef} className="absolute inset-0">
          {dimensions.width > 0 && dimensions.height > 0 ? (
            <ForceGraph3D<Topology3DNode, Topology3DLink>
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor={threeBackground}
              showNavInfo={false}
              nodeColor={(node) => node.color}
              nodeVal={(node) => node.val}
              nodeOpacity={0.95}
              nodeResolution={12}
              nodeLabel={(node) =>
                `${node.label}\n${node.deviceType} • Risk ${node.riskScore}\n${
                  node.responseTime !== null ? `Latency ${node.responseTime.toFixed(1)}ms` : 'Offline'
                }`
              }
              linkColor={(link) => link.color}
              linkWidth={(link) => link.width}
              linkOpacity={isDark ? 0.55 : 0.6}
              linkDirectionalParticles={(link) => link.particles}
              linkDirectionalParticleWidth={1.2}
              linkDirectionalParticleSpeed={() => 0.007}
              linkDirectionalParticleColor={(link) => link.color}
              enableNavigationControls
              enableNodeDrag={!isLocked}
              onNodeClick={(node) => {
                onNodeSelect(String(node.id));
              }}
              cooldownTicks={120}
              warmupTicks={80}
              d3VelocityDecay={0.35}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
