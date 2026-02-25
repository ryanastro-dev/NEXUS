import clsx from 'clsx';
import { Clock } from 'lucide-react';

import { useLanguage } from '../../../hooks/useLanguage';
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
  const { copy, locale } = useLanguage();
  const modalCopy = copy.devices.modal;

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
          {modalCopy.persisted.title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          isDark={isDark}
          label={modalCopy.persisted.firstSeen}
          value={formatDateTime(persistedDevice.first_seen, locale)}
        />
        <InfoCard
          isDark={isDark}
          label={modalCopy.persisted.lastSeen}
          value={formatDateTime(persistedDevice.last_seen, locale)}
        />
        {persistedDevice.last_ip && (
          <InfoCard
            isDark={isDark}
            label={modalCopy.persisted.lastKnownIp}
            value={persistedDevice.last_ip}
            mono
          />
        )}
        {persistedDevice.custom_name && (
          <InfoCard
            isDark={isDark}
            label={modalCopy.persisted.customName}
            value={persistedDevice.custom_name}
          />
        )}
        {persistedDevice.notes && (
          <InfoCard isDark={isDark} label={modalCopy.persisted.notes} value={persistedDevice.notes} span2 />
        )}
      </div>
    </div>
  );
}
