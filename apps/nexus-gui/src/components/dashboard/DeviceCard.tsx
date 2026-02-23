import { motion } from 'framer-motion';
import { Monitor, Server, Laptop, Smartphone, Printer, Camera, Router, Cpu, Activity, Signal, Wifi } from 'lucide-react';
import { HostInfo } from '../../hooks/useScan';

interface DeviceCardProps {
  device: HostInfo;
  onClick?: () => void;
}

// Device type to icon mapping
const deviceIcons: Record<string, any> = {
  ROUTER: Router,
  SERVER: Server,
  PC: Monitor,
  LAPTOP: Laptop,
  MOBILE: Smartphone,
  PRINTER: Printer,
  CAMERA: Camera,
  SWITCH: Cpu,
};

// Device type to color mapping
const deviceColors: Record<string, string> = {
  ROUTER: '#3B82F6',
  SERVER: '#F59E0B',
  PC: '#6B7280',
  LAPTOP: '#6B7280',
  MOBILE: '#14B8A6',
  PRINTER: '#14B8A6',
  CAMERA: '#F97316',
  SWITCH: '#10B981',
};

// Utility: Format relative time
function getRelativeTime(isoTimestamp: string): string {
  const now = new Date();
  const past = new Date(isoTimestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export default function DeviceCard({ device, onClick }: DeviceCardProps) {
  const Icon = deviceIcons[device.device_type] || Monitor;
  const color = deviceColors[device.device_type] || '#6B7280';
  
  const isOnline = device.response_time_ms !== null && device.response_time_ms !== undefined;
  const isWarning = device.risk_score >= 50;
  const openPorts = device.open_ports ?? [];
  
  // Get status badge
  const getStatusBadge = () => {
    if (!isOnline) return { text: 'offline', color: 'bg-status-offline', textColor: 'text-status-offline' };
    if (isWarning) return { text: 'warning', color: 'bg-accent-amber', textColor: 'text-accent-amber' };
    return { text: 'online', color: 'bg-status-online', textColor: 'text-status-online' };
  };
  
  const status = getStatusBadge();
  
  // Format last seen timestamp
  const lastSeenText = device.last_seen 
    ? getRelativeTime(device.last_seen)
    : (isOnline ? 'Just now' : 'Unknown');

  const responseTimeText =
    device.response_time_ms !== null && device.response_time_ms !== undefined
      ? `${device.response_time_ms}ms`
      : 'N/A';

  const openPortsText =
    openPorts.length > 0
      ? `${openPorts.slice(0, 3).join(', ')}${openPorts.length > 3 ? ` +${openPorts.length - 3}` : ''}`
      : 'None';

  const vendorText = device.vendor?.trim() || 'Unknown';
  
  return (
    <motion.div
      onClick={onClick}
      className="flex h-full min-h-[292px] cursor-pointer flex-col rounded-lg border border-theme bg-bg-secondary p-3.5 transition-all hover:border-accent-blue/50 lg:p-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Header: Icon + Name + Status */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[1rem] font-semibold text-text-primary">
              {device.hostname || 'Unknown Device'}
            </h3>
            <p className="text-xs text-text-muted">
              {device.device_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <motion.div 
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${status.color}/20 ${status.textColor}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="relative flex h-2 w-2">
            {isOnline && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status.color}`} />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${status.color}`} />
          </span>
          {status.text}
        </motion.div>
      </div>

      {/* IP Address */}
      <div className="mb-3 border-b border-theme pb-3">
        <p className="mb-1 text-xs text-text-muted">IP Address</p>
        <p className="font-mono text-sm font-medium text-accent-blue">{device.ip}</p>
      </div>

      {/* Real Network Metrics */}
      <div className="mb-3 space-y-2">
        {/* Response Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Signal className="h-3 w-3 text-text-muted" />
            <span className="text-xs text-text-muted">Response Time</span>
          </div>
          <span className="text-xs font-semibold text-text-primary">{responseTimeText}</span>
        </div>

        {/* Open Ports */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-text-muted" />
            <span className="text-xs text-text-muted">Open Ports</span>
          </div>
          <span className="max-w-[150px] truncate text-xs font-semibold text-text-primary">
            {openPortsText}
          </span>
        </div>

        {/* Vendor */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Vendor</span>
          <span className="max-w-[150px] truncate text-xs font-semibold text-text-primary">
            {vendorText}
          </span>
        </div>

        {/* Risk Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Risk Score</span>
          <span 
            className={`text-xs font-semibold ${
              device.risk_score >= 70 ? 'text-accent-red' : 
              device.risk_score >= 40 ? 'text-accent-amber' : 
              'text-accent-green'
            }`}
          >
            {device.risk_score}/100
          </span>
        </div>
      </div>

      {/* Footer: Security Grade & Last Seen */}
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-theme pt-2">
        <div>
          <p className="mb-1 text-xs text-text-muted">Security Grade</p>
          <p className={`text-base font-bold ${
            ['A', 'B'].includes(device.security_grade || '') ? 'text-accent-green' :
            ['C', 'D'].includes(device.security_grade || '') ? 'text-accent-amber' :
            'text-accent-red'
          }`}>
            {device.security_grade || 'N/A'}
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <Activity className="h-2.5 w-2.5 text-text-muted" />
            <p className="text-xs text-text-muted">Last Seen</p>
          </div>
          <p className="text-xs font-semibold text-text-primary">
            {lastSeenText}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
