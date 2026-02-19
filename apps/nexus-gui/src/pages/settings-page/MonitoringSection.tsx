import { Clock, Radio } from 'lucide-react';
import Select from '../../components/common/Select';
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
  const intervalOptions = [
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
  ];

  return (
    <div className={`${panelClassName} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-teal/10 p-2">
            <Radio className="h-5 w-5 text-accent-teal" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Network Monitoring</h3>
          </div>
        </div>
        <AppToggle enabled={monitoringEnabled} onToggle={onToggle} />
      </div>

      <div className="space-y-4 border-t border-theme pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted">Startup behavior:</span>
          <span
            className={`rounded-full border px-2 py-0.5 font-semibold ${
              monitoringEnabled
                ? 'border-accent-green/40 bg-accent-green/15 text-accent-green'
                : 'border-slate-400/40 bg-slate-400/10 text-text-secondary'
            }`}
          >
            {monitoringEnabled ? 'Auto-start Enabled' : 'Manual start only'}
          </span>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Monitoring Interval
          </label>
          <Select
            options={intervalOptions}
            value={monitoringInterval}
            onChange={(value) => onMonitoringIntervalChange(Number(value))}
            leftIcon={<Clock className="h-4 w-4" />}
            searchable={false}
            fullWidth
          />
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
          {monitoring.status.is_running ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Active Interval:</span>
                <span className="font-medium text-text-primary">
                  {monitoring.status.interval_seconds}s
                </span>
              </div>
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
          ) : (
            <p className="text-xs text-text-muted">
              Monitoring is currently stopped. Use "Start Live Monitor" on Dashboard when needed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
