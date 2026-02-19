import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

import { useTheme } from '../../hooks/useTheme';
import {
  CPU_THRESHOLD,
  DISK_THRESHOLD,
  MEMORY_THRESHOLD,
  MetricCell,
  buildCyberNodeColors,
  resolveDeviceIcon,
  resolveMetricColor,
  useNodeMetrics,
  type CyberNodeData,
} from './cyber-device-node';

function CyberDeviceNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CyberNodeData;
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const metrics = useNodeMetrics(nodeData.ip);
  const colors = buildCyberNodeColors(isDark);

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <motion.div
        className="cyber-node"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        style={{
          width: 240,
          background: colors.cardBg,
          borderRadius: 8,
          border: selected
            ? `2px solid ${colors.cardBorderSelected}`
            : `1px solid ${colors.cardBorder}`,
          boxShadow: selected
            ? colors.cardShadowSelected
            : colors.cardShadow,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
      >
          <div
            style={{
              padding: '12px',
              borderBottom: `1px solid ${colors.metricBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: colors.iconBg,
                border: `1px solid ${colors.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.iconColor,
              }}
            >
              {resolveDeviceIcon(nodeData.deviceType)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {nodeData.label || 'Unknown Device'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  fontFamily: 'monospace',
                  marginTop: 2,
                }}
              >
                {nodeData.ip}
              </div>
            </div>
          </div>

        <div
          style={{
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <MetricCell
            label="CPU"
            value={`${metrics.cpu}%`}
            color={resolveMetricColor(metrics.cpu, CPU_THRESHOLD)}
            labelColor={colors.textSecondary}
          />
          <MetricCell
            label="MEM"
            value={`${metrics.mem}%`}
            color={resolveMetricColor(metrics.mem, MEMORY_THRESHOLD)}
            labelColor="#64748B"
          />
          <MetricCell
            label="DISK"
            value={`${metrics.disk}%`}
            color={resolveMetricColor(metrics.disk, DISK_THRESHOLD)}
            labelColor="#64748B"
          />
          <MetricCell
            label="PROC"
            value={`${metrics.proc}`}
            color="#00D9FF"
            labelColor="#64748B"
          />
        </div>

        {nodeData.responseTime !== undefined && (
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(0, 217, 255, 0.1)',
              fontSize: 10,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Activity className="w-3 h-3" />
            <span>{nodeData.responseTime}ms</span>
          </div>
        )}
      </motion.div>
    </>
  );
}

export default CyberDeviceNode;
