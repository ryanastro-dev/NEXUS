import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeTypes,
  NodeMouseHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
} from '@xyflow/react';
import { motion } from 'framer-motion';

import TopologyControls, { MappingDesign } from '../../components/topology/TopologyControls';
import LiveTrafficMonitor from '../../components/topology/LiveTrafficMonitor';
import type { MappingThemeConfig } from '../../lib/mapping-themes';
import { DEVICE_TYPE_COLORS } from './constants';

interface TopologyCanvasProps {
  bgColor: string;
  controlsBg: string;
  controlsBorder: string;
  controlsText: string;
  isDark: boolean;
  isLocked: boolean;
  mappingDesign: MappingDesign;
  themeConfig: MappingThemeConfig;
  nodes: Node[];
  enhancedEdges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: NodeMouseHandler;
  nodeTypes: NodeTypes;
  onLockToggle: () => void;
  onDesignChange: (design: MappingDesign) => void;
  hasScanData: boolean;
}

export function TopologyCanvas({
  bgColor,
  controlsBg,
  controlsBorder,
  controlsText,
  isDark,
  isLocked,
  mappingDesign,
  themeConfig,
  nodes,
  enhancedEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  nodeTypes,
  onLockToggle,
  onDesignChange,
  hasScanData,
}: TopologyCanvasProps) {
  return (
    <div className="flex h-full flex-col">
      <motion.div
        className="relative flex-1"
        style={{ backgroundColor: bgColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <TopologyControls
          isLocked={isLocked}
          onLockToggle={onLockToggle}
          mappingDesign={mappingDesign}
          onDesignChange={onDesignChange}
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
            gap={20}
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
                return '#94A3B8';
              }
              return DEVICE_TYPE_COLORS[deviceType] || '#94A3B8';
            }}
            pannable
            zoomable
          />
        </ReactFlow>
      </motion.div>

      <LiveTrafficMonitor
        visible={themeConfig.showTrafficMonitor}
        isDark={isDark}
        hasScanData={hasScanData}
      />
    </div>
  );
}
