import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronUp, ChevronDown, Wrench, List, AlignLeft } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

import {
  getCollapseButtonStyle,
  getContainerStyle,
  getEmptyStateStyle,
  getEventTextColor,
  getHeaderStyle,
  getHeaderIconStyle,
  getLogContainerStyle,
  getStatusDotStyle,
  getStatusLabelStyle,
  getTimestampStyle,
  getToggleButtonStyle,
  getToggleGroupStyle,
  getTroubleshootButtonStyle,
  getTitleStyle,
  resolveEmptyStreamMessage,
  useTrafficStream,
  type LiveTrafficMonitorProps,
} from './live-traffic-monitor';

export default function LiveTrafficMonitor({
  visible,
  isDark,
  hasScanData = false,
  onTroubleshoot,
  isTroubleshooting = false,
}: LiveTrafficMonitorProps) {
  const { copy } = useLanguage();
  const liveMonitorCopy = copy.topology.liveMonitor;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'raw'>(() => {
    const saved = localStorage.getItem('traffic-monitor-view-mode');
    return saved === 'raw' ? 'raw' : 'compact';
  });
  const logContainerRef = useRef<HTMLDivElement>(null);
  const { events, streamConnected, streamStateLabel } = useTrafficStream({
    visible,
    hasScanData,
    copy: liveMonitorCopy,
  });
  const localizedStreamStateLabel =
    streamStateLabel === 'IDLE'
      ? liveMonitorCopy.stateIdle
      : streamStateLabel === 'MONITORING'
        ? liveMonitorCopy.stateMonitoring
        : streamStateLabel === 'SCANNING'
          ? liveMonitorCopy.stateScanning
          : streamStateLabel === 'CONNECTED'
            ? liveMonitorCopy.stateConnected
            : streamStateLabel === 'UNAVAILABLE'
              ? liveMonitorCopy.stateUnavailable
              : streamStateLabel;
  const showStreamStatus = streamStateLabel !== 'IDLE';

  useEffect(() => {
    localStorage.setItem('traffic-monitor-view-mode', viewMode);
  }, [viewMode]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity className="h-3.5 w-3.5" style={getHeaderIconStyle(isDark)} />
          <span style={getTitleStyle(isDark)}>
            {liveMonitorCopy.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={getToggleGroupStyle(isDark)}>
            <button
              onClick={() => setViewMode('compact')}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
              style={getToggleButtonStyle(isDark, viewMode === 'compact')}
              title={liveMonitorCopy.compactView}
            >
              <List className="h-2.5 w-2.5" />
              {liveMonitorCopy.compact}
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
              style={getToggleButtonStyle(isDark, viewMode === 'raw')}
              title={liveMonitorCopy.rawView}
            >
              <AlignLeft className="h-2.5 w-2.5" />
              {liveMonitorCopy.raw}
            </button>
          </div>

          {showStreamStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={getStatusDotStyle(streamConnected)} />
              <span style={getStatusLabelStyle(isDark)}>
                {localizedStreamStateLabel}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={getCollapseButtonStyle(isDark)}
          >
            {isCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 100, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            ref={logContainerRef}
            style={getLogContainerStyle()}
          >
            {events.length === 0 ? (
              <div style={getEmptyStateStyle(isDark)}>
                {resolveEmptyStreamMessage(streamConnected, hasScanData, {
                  emptyUnavailable: liveMonitorCopy.emptyUnavailable,
                  emptyNoEvents: liveMonitorCopy.emptyNoEvents,
                  emptyStartScan: liveMonitorCopy.emptyStartScan,
                })}
              </div>
            ) : (
              events.map((event) => {
                const action = event.action;
                const isSeparator = event.variant === 'separator';

                if (isSeparator) {
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        margin: '5px 0',
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          flex: 1,
                          background: isDark
                            ? 'rgba(100, 116, 139, 0.4)'
                            : 'rgba(148, 163, 184, 0.5)',
                        }}
                      />
                      <span
                        style={{
                          color: isDark ? '#64748B' : '#94A3B8',
                          fontSize: 9.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {event.message}
                      </span>
                      <div
                        style={{
                          height: 1,
                          flex: 1,
                          background: isDark
                            ? 'rgba(100, 116, 139, 0.4)'
                            : 'rgba(148, 163, 184, 0.5)',
                        }}
                      />
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 7,
                      marginBottom: 1.5,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 7, minWidth: 0 }}>
                      <span style={getTimestampStyle(isDark)}>
                        {event.timestamp}
                      </span>
                      <span
                        style={{
                          color: getEventTextColor(isDark, event),
                          fontFamily: viewMode === 'raw' ? 'var(--font-mono)' : undefined,
                          whiteSpace: viewMode === 'raw' ? 'pre-wrap' : undefined,
                        }}
                      >
                        {viewMode === 'raw'
                          ? `[${(event.severity ?? 'info').toUpperCase()}] ${event.rawMessage ?? event.message}`
                          : event.message}
                      </span>
                    </div>

                    {action?.kind === 'troubleshoot' && onTroubleshoot && (
                      <button
                        onClick={() => onTroubleshoot(action.target)}
                        disabled={isTroubleshooting}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold hover:brightness-110"
                        style={getTroubleshootButtonStyle(isDark, isTroubleshooting)}
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        <span>
                          {isTroubleshooting
                            ? liveMonitorCopy.working
                            : action.label || liveMonitorCopy.troubleshoot}
                        </span>
                      </button>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
