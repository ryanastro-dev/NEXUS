import { Clock, Radio } from 'lucide-react';
import type { UseMonitoringReturn } from '../../hooks/useMonitoring';
import { AppToggle } from './AppToggle';

interface MonitoringSectionProps {
  panelClassName: string;
  monitoringEnabled: boolean;
  monitoringInterval: number;
  monitoring: UseMonitoringReturn;
  onToggle: () => void;
  onMonitoringIntervalChange: (value: number) => void;
}

export function MonitoringSection({
  panelClassName,
  monitoringEnabled,
  monitoringInterval,
  monitoring,
  onToggle,
  onMonitoringIntervalChange,
}: MonitoringSectionProps) {
  return (
    <div className={`${panelClassName} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-teal/10 p-2">
            <Radio className="h-5 w-5 text-accent-teal" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Network Monitoring</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Auto-start real-time network monitoring on app launch.
            </p>
          </div>
        </div>
        <AppToggle enabled={monitoringEnabled} onToggle={onToggle} />
      </div>

      {monitoringEnabled && (
        <div className="space-y-4 border-t border-theme pt-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Monitoring Interval
            </label>
            <div className="relative">
              <Clock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <select
                value={monitoringInterval}
                onChange={(event) => onMonitoringIntervalChange(Number(event.target.value))}
                className="w-full cursor-pointer appearance-none rounded-lg border border-theme bg-bg-tertiary py-2.5 pr-3 pl-10 text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
              >
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
              </select>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">How often to scan the network.</p>
          </div>

          <div className="rounded-lg bg-bg-tertiary p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Current Status:</span>
              <span
                className={`rounded px-2 py-1 text-xs font-bold ${
                  monitoring.status.is_running
                    ? 'bg-accent-green/20 text-accent-green'
                    : 'bg-gray-500/20 text-gray-500'
                }`}
              >
                {monitoring.status.is_running ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
            {monitoring.status.is_running && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Scans Completed:</span>
                  <span className="font-medium text-text-primary">{monitoring.status.scan_count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Devices Online:</span>
                  <span className="font-medium text-text-primary">
                    {monitoring.status.devices_online} / {monitoring.status.devices_total}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
