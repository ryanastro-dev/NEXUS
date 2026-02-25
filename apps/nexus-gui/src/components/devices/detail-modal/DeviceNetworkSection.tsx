import clsx from 'clsx';
import { Activity } from 'lucide-react';

import { useLanguage } from '../../../hooks/useLanguage';
import type { HostInfo } from '../../../hooks/useScan';
import { InfoCard } from './InfoCard';

interface DeviceNetworkSectionProps {
  device: HostInfo;
  isDark: boolean;
}

export function DeviceNetworkSection({ device, isDark }: DeviceNetworkSectionProps) {
  const { copy } = useLanguage();
  const modalCopy = copy.devices.modal;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-blue-500" />
        <h3
          className={clsx(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          {modalCopy.network.title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoCard isDark={isDark} label={modalCopy.network.ipAddress} value={device.ip} mono />
        <InfoCard isDark={isDark} label={modalCopy.network.macAddress} value={device.mac} mono />
        <InfoCard
          isDark={isDark}
          label={modalCopy.network.vendor}
          value={device.vendor || modalCopy.network.unknownVendor}
        />
        <InfoCard isDark={isDark} label={modalCopy.network.discovery} value={device.discovery_method} />
        {device.response_time_ms !== null && device.response_time_ms !== undefined && (
          <InfoCard
            isDark={isDark}
            label={modalCopy.network.latency}
            value={`${device.response_time_ms.toFixed(1)}ms`}
            accent="#3B82F6"
          />
        )}
        {device.ttl && <InfoCard isDark={isDark} label={modalCopy.network.ttl} value={device.ttl.toString()} />}
        {device.os_guess && (
          <InfoCard
            isDark={isDark}
            label={modalCopy.network.osDetection}
            value={device.os_guess}
            span2
            accent="#0EA5E9"
          />
        )}
      </div>
    </div>
  );
}
