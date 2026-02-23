import { useState, useMemo } from 'react';
import { Search, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanContext, HostInfo } from '../hooks/useScan';
import DeviceCard from '../components/dashboard/DeviceCard';
import DeviceSkeletonCard from '../components/dashboard/DeviceSkeletonCard';

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
        (device.mac ?? '').toLowerCase().includes(search.toLowerCase()) ||
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

  const isInitialState = !scanResult && !isScanning;
  const isScanningState = isScanning && !scanResult;

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl dark:bg-slate-500/10" />
      </div>
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <AnimatePresence mode="wait">
          {isInitialState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  Asset Inventory
                </p>
                <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Devices</h1>
                <p className="mt-1.5 text-sm text-text-secondary">No scan data available.</p>
              </div>

              <motion.div
                className={`${CARD} relative flex min-h-0 flex-1 items-center justify-center overflow-hidden`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/10 to-transparent dark:from-cyan-500/10" />
                <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-100/40 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <WifiOff className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary sm:text-[2rem]">
                    Ready to discover your devices
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-text-secondary sm:text-base">
                    Start a network scan to populate inventory, classify device types, and unlock risk insights.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium">
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      Live Inventory
                    </span>
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      Online or Offline Status
                    </span>
                    <span className="rounded-full border border-theme bg-bg-tertiary/70 px-2.5 py-1 text-text-muted">
                      Risk Overview
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-text-muted">
                    {tauriAvailable
                      ? 'Use the top-right Start Scan button to begin discovery.'
                      : 'Run with `npm run tauri dev` to enable scanning.'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isScanningState && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4 flex items-center justify-between`}>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                    Asset Inventory
                  </p>
                  <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">Devices</h1>
                  <p className="mt-1.5 text-sm text-text-secondary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
                    Scanning network...
                  </p>
                </div>
              </div>
              
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <motion.div 
                  className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {Array.from({ length: 15 }).map((_, index) => (
                    <motion.div
                      key={index}
                      className="h-full"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <DeviceSkeletonCard />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {!isInitialState && !isScanningState && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <div className={`${CARD} shrink-0 p-3.5 sm:p-4`}>
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
              <div className={`${CARD} shrink-0 p-3`}>
                <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
                  <div className="relative w-full xl:w-[320px] xl:min-w-[280px] xl:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by IP, MAC, hostname..."
                      className="h-8 w-full rounded-lg border border-theme bg-bg-tertiary pl-10 pr-4 text-[13px] text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                    />
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-4">
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;

                      return (
                        <div key={tab.id} className="relative flex min-w-0">
                          {isActive && (
                            <motion.div
                              layoutId="deviceTabs"
                              className="absolute inset-0 rounded-lg border border-accent-blue/45 bg-accent-blue/10"
                              initial={false}
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <button
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative z-10 flex h-8 w-full items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-medium transition-colors ${
                              isActive
                                ? 'text-accent-blue'
                                : 'border border-theme bg-bg-tertiary/60 text-text-muted hover:text-text-primary hover:bg-bg-hover'
                            }`}
                          >
                            <span className="truncate">{tab.label}</span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${
                                isActive ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-secondary text-text-muted'
                              }`}
                            >
                              {tab.count ?? 0}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-text-muted xl:min-w-[170px] xl:text-right">
                    Showing {filteredDevices.length} of {devices.length} devices
                  </span>
                </div>
              </div>

              {/* Device Grid */}
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {filteredDevices.length === 0 ? (
                  <motion.div 
                    className={`${CARD} flex min-h-[260px] flex-col items-center justify-center py-12 text-center`}
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
                    className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {filteredDevices.map((device, index) => (
                      <motion.div
                        key={device.ip}
                        className="h-full"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
