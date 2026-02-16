import clsx from 'clsx';
import { Shield } from 'lucide-react';

interface DevicePortsSectionProps {
  openPorts: number[];
  isDark: boolean;
}

export function DevicePortsSection({ openPorts, isDark }: DevicePortsSectionProps) {
  if (openPorts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-cyan-500" />
        <h3
          className={clsx(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          Open Ports ({openPorts.length})
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {openPorts.map((port) => (
          <span
            key={port}
            className={clsx(
              'rounded-md border px-3 py-1.5 font-mono text-sm transition-colors',
              isDark
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
          >
            {port}
          </span>
        ))}
      </div>
    </div>
  );
}
