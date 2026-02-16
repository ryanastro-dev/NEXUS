import { motion } from 'framer-motion';
import clsx from 'clsx';

import type { HostInfo } from '../../hooks/useScan';
import { useTheme } from '../../hooks/useTheme';
import {
  DeviceModalHeader,
  DeviceNetworkSection,
  DevicePersistedSection,
  DevicePortsSection,
  DeviceSummaryCards,
  DeviceSystemSection,
  usePersistedDevice,
} from './detail-modal';

interface DeviceDetailModalProps {
  device: HostInfo | null;
  onClose: () => void;
}

export default function DeviceDetailModal({ device, onClose }: DeviceDetailModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const persistedDevice = usePersistedDevice(device);

  if (!device) return null;

  const isOnline = device.response_time_ms !== null && device.response_time_ms !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className={clsx('absolute inset-0', isDark ? 'bg-black/80' : 'bg-black/40')}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      <motion.div
        className={clsx(
          'relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl',
          isDark ? 'bg-[#1a1f2e]' : 'bg-white',
        )}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <DeviceModalHeader
          isDark={isDark}
          isOnline={isOnline}
          title={device.hostname || device.ip}
          subtitle={device.device_type}
          onClose={onClose}
        />

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <DeviceSummaryCards isDark={isDark} isOnline={isOnline} riskScore={device.risk_score} />

          <DeviceNetworkSection device={device} isDark={isDark} />

          {persistedDevice && <DevicePersistedSection persistedDevice={persistedDevice} isDark={isDark} />}

          <DevicePortsSection openPorts={device.open_ports ?? []} isDark={isDark} />

          <DeviceSystemSection
            systemDescription={device.system_description}
            uptimeSeconds={device.uptime_seconds}
            isDark={isDark}
          />
        </div>

        <div
          className={clsx(
            'flex justify-end border-t p-4',
            isDark ? 'border-white/10 bg-[#0f1419]' : 'border-slate-200 bg-slate-50',
          )}
        >
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
