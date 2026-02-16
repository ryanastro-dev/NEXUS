import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';

import {
  getCollapseButtonStyle,
  getContainerStyle,
  getEmptyStateStyle,
  getHeaderStyle,
  getLogContainerStyle,
  getStatusDotStyle,
  getStatusLabelStyle,
  getTimestampStyle,
  getTitleStyle,
  resolveEmptyStreamMessage,
  useTrafficStream,
  type LiveTrafficMonitorProps,
} from './live-traffic-monitor';

export default function LiveTrafficMonitor({
  visible,
  isDark,
  hasScanData = false,
}: LiveTrafficMonitorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const { events, streamConnected, streamStateLabel } = useTrafficStream({
    visible,
    hasScanData,
  });

  useEffect(() => {
    if (logContainerRef.current && !isCollapsed) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, isCollapsed]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      style={getContainerStyle(isDark)}
    >
      <div style={getHeaderStyle(isDark, isCollapsed)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity className="w-4 h-4" style={{ color: '#00D9FF' }} />
          <span style={getTitleStyle(isDark)}>
            Live Traffic Monitor
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={getStatusDotStyle(streamConnected)} />
            <span style={getStatusLabelStyle(isDark)}>
              {streamStateLabel}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={getCollapseButtonStyle(isDark)}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 120, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            ref={logContainerRef}
            style={getLogContainerStyle()}
          >
            {events.length === 0 ? (
              <div style={getEmptyStateStyle(isDark)}>
                {resolveEmptyStreamMessage(streamConnected, hasScanData)}
              </div>
            ) : (
              events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 4,
                  }}
                >
                  <span style={getTimestampStyle(isDark)}>
                    {event.timestamp}
                  </span>
                  <span style={{ color: event.color }}>{event.message}</span>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
