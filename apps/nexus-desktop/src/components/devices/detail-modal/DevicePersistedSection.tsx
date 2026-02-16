import clsx from 'clsx';
import { Clock } from 'lucide-react';

import type { DeviceRecord } from '../../../lib/api/types';
import { InfoCard } from './InfoCard';
import { formatDateTime } from './utils';

interface DevicePersistedSectionProps {
  persistedDevice: DeviceRecord;
  isDark: boolean;
}

export function DevicePersistedSection({
  persistedDevice,
  isDark,
}: DevicePersistedSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-cyan-500" />
        <h3
          className={clsx(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          Persisted Record
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          isDark={isDark}
          label="First Seen"
          value={formatDateTime(persistedDevice.first_seen)}
        />
        <InfoCard
          isDark={isDark}
          label="Last Seen"
          value={formatDateTime(persistedDevice.last_seen)}
        />
        {persistedDevice.last_ip && (
          <InfoCard isDark={isDark} label="Last Known IP" value={persistedDevice.last_ip} mono />
        )}
        {persistedDevice.custom_name && (
          <InfoCard isDark={isDark} label="Custom Name" value={persistedDevice.custom_name} />
        )}
        {persistedDevice.notes && (
          <InfoCard isDark={isDark} label="Notes" value={persistedDevice.notes} span2 />
        )}
      </div>
    </div>
  );
}
