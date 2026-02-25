import clsx from 'clsx';
import { Clock } from 'lucide-react';

import { useLanguage } from '../../../hooks/useLanguage';
import { formatUptime } from './utils';

interface DeviceSystemSectionProps {
  systemDescription?: string;
  uptimeSeconds?: number;
  isDark: boolean;
}

export function DeviceSystemSection({
  systemDescription,
  uptimeSeconds,
  isDark,
}: DeviceSystemSectionProps) {
  const { copy } = useLanguage();
  const modalCopy = copy.devices.modal;

  if (!systemDescription && !uptimeSeconds) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3
        className={clsx(
          'text-sm font-semibold uppercase tracking-wider',
          isDark ? 'text-white' : 'text-slate-900',
        )}
        >
        {modalCopy.system.title}
      </h3>
      {systemDescription && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-text-primary">{systemDescription}</p>
        </div>
      )}
      {uptimeSeconds && (
        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-accent-green" />
          <span className="font-medium text-text-secondary">
            {modalCopy.system.uptime}:{' '}
            <span className={isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
              {formatUptime(uptimeSeconds)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
