import { useState, useMemo } from 'react';
import { Search, WifiOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScanContext, HostInfo } from '../hooks/useScan';
import DeviceCard from '../components/dashboard/DeviceCard';
import TabFilter from '../components/common/TabFilter';

interface DeviceListProps {
  onDeviceClick?: (device: HostInfo) => void;
}

const CARD =
  'rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65';

export default function DeviceList({ onDeviceClick }: DeviceListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const { scanResult, isScanning, tauriAvailable } = useScanContext();
  const devices = scanResult?.active_hosts ?? [];

  const isOnline = (device: HostInfo) => {
    if (device.response_time_ms !== null && device.response_time_ms !== undefined) {
      return true;
    }

    if ((device.open_ports?.length ?? 0) > 0) {
      return true;
    }

    const method = device.discovery_method.toUpperCase();
    return method.includes('ARP') || method.includes('TCP') || method === 'LOCAL';
  };
  
  // Calculate counts for tabs
  const onlineDevices = devices.filter(isOnline);
  const warningDevices = devices.filter(d => d.risk_score >= 50);
  const offlineDevices = devices.filter(d => !isOnline(d));
  
  // Filter devices based on active tab and search
  const filteredDevices = useMemo(() => {
    let filtered = devices;
    
    // Filter by tab
    if (activeTab === 'online') {
      filtered = onlineDevices;
    } else if (activeTab === 'warning') {
      filtered = warningDevices;
    } else if (activeTab === 'offline') {
      filtered = offlineDevices;
    }
    
    // Filter by search
    if (search) {
      filtered = filtered.filter((device) =>
        device.ip.includes(search) ||
        device.mac.toLowerCase().includes(search.toLowerCase()) ||
        device.hostname?.toLowerCase().includes(search.toLowerCase()) ||
        device.vendor?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered;
  }, [devices, activeTab, search, onlineDevices, warningDevices, offlineDevices]);
  
  // Tab configuration
  const tabs = [
    { id: 'all', label: 'All Devices', count: devices.length },
    { id: 'online', label: 'Online', count: onlineDevices.length },
    { id: 'warning', label: 'Warning', count: warningDevices.length },
    { id: 'offline', label: 'Offline', count: offlineDevices.length },
  ];

  // Empty state
  if (!scanResult && !isScanning) {
    return (
      <div className="relative flex-1 overflow-y-auto bg-bg-primary p-3 sm:p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
          <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl dark:bg-slate-500/10" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className={`${CARD} p-3.5 sm:p-4`}>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Asset Inventory
            </p>
            <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Devices</h1>
            <p className="mt-1.5 text-sm text-text-secondary">No scan data available.</p>
          </div>

          <motion.div 
            className={`${CARD} flex min-h-[400px] flex-col items-center justify-center text-center`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <WifiOff className="w-16 h-16 text-text-muted mb-4" />
            <p className="text-text-muted">
              {tauriAvailable 
                ? 'Click "Start Scan" to discover devices'
                : 'Run with `npm run tauri dev` to enable scanning'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isScanning && !scanResult) {
    return (
      <div className="relative flex-1 overflow-y-auto bg-bg-primary p-3 sm:p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
          <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl dark:bg-slate-500/10" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className={`${CARD} p-3.5 sm:p-4`}>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Asset Inventory
            </p>
            <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Devices</h1>
            <p className="mt-1.5 text-sm text-text-secondary">Scanning network...</p>
          </div>
          <div className={`${CARD} flex min-h-[400px] flex-col items-center justify-center`}>
            <Loader2 className="w-16 h-16 text-accent-blue animate-spin mb-4" />
            <p className="text-text-muted">Discovering devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl dark:bg-slate-500/10" />
      </div>
      <div className="relative z-10 space-y-3">
      <div className={`${CARD} p-3.5 sm:p-4`}>
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
          Asset Inventory
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-black text-text-primary sm:text-3xl">Devices</h1>
          <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-xs font-semibold text-text-muted">
            {devices.length} discovered
          </span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Search, filter, and inspect discovered network assets by state and risk.
        </p>
      </div>

      {/* Unified controls: search + filters */}
      <div className={`${CARD} p-3`}>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by IP, MAC, hostname..."
              className="h-9 w-full rounded-lg border border-theme bg-bg-tertiary pl-10 pr-4 text-[13px] text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="rounded-full border border-theme bg-bg-tertiary/80 px-2 py-0.5">
              Online {onlineDevices.length}
            </span>
            <span className="rounded-full border border-theme bg-bg-tertiary/80 px-2 py-0.5">
              Warning {warningDevices.length}
            </span>
            <span className="rounded-full border border-theme bg-bg-tertiary/80 px-2 py-0.5">
              Offline {offlineDevices.length}
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-2 border-t border-theme/80 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <TabFilter
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            compact
          />
          <span className="text-xs font-medium text-text-muted">
            Showing {filteredDevices.length} of {devices.length} devices
          </span>
        </div>
      </div>

      {/* Device Grid */}
      {filteredDevices.length === 0 ? (
        <motion.div 
          className={`${CARD} flex flex-col items-center justify-center py-12 text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <WifiOff className="mb-2.5 h-10 w-10 text-text-muted" />
          <p className="text-text-muted">
            {search ? 'No devices match your search' : 'No devices found'}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredDevices.map((device, index) => (
            <motion.div
              key={device.ip}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <DeviceCard
                device={device}
                onClick={() => onDeviceClick?.(device)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>
    </div>
  );
}
