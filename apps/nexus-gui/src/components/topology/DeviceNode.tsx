import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

import { useTheme } from '../../hooks/useTheme';
import {
  DEVICE_COLORS,
  DEVICE_ICONS,
  FALLBACK_DEVICE_COLOR,
  buildHandleStyle,
  buildHoverShadow,
  buildNodeContainerStyle,
  buildRiskBadgeStyle,
  buildThemeTokens,
  type DeviceNodeData,
} from './device-node';

function DeviceNode({ data, selected }: NodeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const nodeData = data as unknown as DeviceNodeData;
  const Icon = DEVICE_ICONS[nodeData.deviceType] || HelpCircle;
  const color = DEVICE_COLORS[nodeData.deviceType] || FALLBACK_DEVICE_COLOR;
  const themeTokens = buildThemeTokens(isDark, selected, color);

  return (
    <motion.div
      style={buildNodeContainerStyle(themeTokens, isDark, selected, color)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: selected ? 1.05 : 1,
        opacity: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      whileHover={{
        scale: 1.03,
        boxShadow: buildHoverShadow(isDark, color),
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={buildHandleStyle(color, themeTokens.handleBorder)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={buildHandleStyle(color, themeTokens.handleBorder)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${color}25, ${color}40)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          animate={
            nodeData.isOnline
              ? {
                  boxShadow: [
                    `0 0 0 0 ${color}00`,
                    `0 0 0 4px ${color}20`,
                    `0 0 0 0 ${color}00`,
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon style={{ width: 22, height: 22, color }} />
        </motion.div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: '13px',
              color: themeTokens.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nodeData.label}
          </p>
          <p
            style={{
              margin: '2px 0 0 0',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: themeTokens.textMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nodeData.ip}
          </p>
        </div>

        <motion.div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: nodeData.isOnline ? '#22C55E' : '#EF4444',
            flexShrink: 0,
          }}
          animate={
            nodeData.isOnline
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(34, 197, 94, 0.7)',
                    '0 0 0 6px rgba(34, 197, 94, 0)',
                    '0 0 0 0 rgba(34, 197, 94, 0)',
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${themeTokens.dividerColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: themeTokens.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {nodeData.deviceType.replace('_', ' ')}
        </span>
        {nodeData.riskScore !== undefined && nodeData.riskScore > 0 && (
          <motion.span
            style={buildRiskBadgeStyle(nodeData.riskScore)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            Risk: {nodeData.riskScore}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

export default DeviceNode;
