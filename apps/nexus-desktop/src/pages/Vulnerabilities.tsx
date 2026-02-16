import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

import { useScanContext } from '../hooks/useScan';
import {
  CARD,
  SecurityCard,
  SummaryCard,
  VulnerabilitiesEmptyState,
  buildVulnerabilityStats,
  filterDevicesByRisk,
  mapHostsToDevices,
  type DeviceWithVulns,
  type VulnerabilityFilter,
} from './vulnerabilities-page';

export default function Vulnerabilities() {
  const { scanResult } = useScanContext();
  const [devices, setDevices] = useState<DeviceWithVulns[]>([]);
  const [filter, setFilter] = useState<VulnerabilityFilter>('all');

  useEffect(() => {
    setDevices(mapHostsToDevices(scanResult?.active_hosts));
  }, [scanResult]);

  const stats = useMemo(() => buildVulnerabilityStats(devices), [devices]);
  const filteredDevices = useMemo(
    () => filterDevicesByRisk(devices, filter),
    [devices, filter],
  );

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-rose-300/10 blur-3xl dark:bg-rose-500/10" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} p-5 sm:p-6`}
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Security Intelligence
            </p>
            <h1 className="text-2xl font-black text-text-primary sm:text-4xl">
              Vulnerability Center
            </h1>
            <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
              Inspect vulnerability signals and port-level warnings across discovered assets.
            </p>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            title="Critical"
            count={stats.critical}
            icon={<XCircle className="h-5 w-5" />}
            color="red"
            onClick={() => setFilter('critical')}
            active={filter === 'critical'}
          />
          <SummaryCard
            title="High Risk"
            count={stats.high}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="orange"
            onClick={() => setFilter('high')}
            active={filter === 'high'}
          />
          <SummaryCard
            title="Medium Risk"
            count={stats.medium}
            icon={<Info className="h-5 w-5" />}
            color="yellow"
            onClick={() => setFilter('medium')}
            active={filter === 'medium'}
          />
          <SummaryCard
            title="Secure"
            count={stats.secure}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
            onClick={() => setFilter('all')}
            active={filter === 'all'}
          />
        </div>

        {filteredDevices.length === 0 ? (
          <VulnerabilitiesEmptyState hasScanResult={Boolean(scanResult)} filter={filter} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredDevices.map((device, index) => (
              <motion.div
                key={device.mac}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SecurityCard device={device} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
