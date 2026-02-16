import { Activity, Clock, Hash, Network, RefreshCw } from 'lucide-react';
import type { RuntimeDiagnostics } from '../../lib/api/types';

interface ConfigurationSectionProps {
  panelClassName: string;
  scanInterval: number;
  onScanIntervalChange: (value: number) => void;
  preferredInterface: string;
  onPreferredInterfaceChange: (value: string) => void;
  interfaces: string[];
  tcpPorts: string;
  onTcpPortsChange: (value: string) => void;
  dbPath: string | null;
  scanSchemaVersion: string | null;
  runtimeDiagnostics: RuntimeDiagnostics | null;
  diagnosticsLoading: boolean;
  onRunDiagnostics: () => void;
}

export function ConfigurationSection({
  panelClassName,
  scanInterval,
  onScanIntervalChange,
  preferredInterface,
  onPreferredInterfaceChange,
  interfaces,
  tcpPorts,
  onTcpPortsChange,
  dbPath,
  scanSchemaVersion,
  runtimeDiagnostics,
  diagnosticsLoading,
  onRunDiagnostics,
}: ConfigurationSectionProps) {
  return (
    <div className={`${panelClassName} p-6`}>
      <div className="mb-6 flex items-center gap-3">
        <Activity className="h-5 w-5 text-accent-blue" />
        <h2 className="text-lg font-bold text-text-primary">Configuration</h2>
      </div>
      <p className="mb-6 text-sm text-text-muted">Manage scanner behavior and application preferences.</p>

      <div className="space-y-6">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-blue" />
            <h3 className="text-base font-semibold text-text-primary">Scan Settings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                Auto-Scan Interval
              </label>
              <div className="relative">
                <Clock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <select
                  value={scanInterval}
                  onChange={(event) => onScanIntervalChange(Number(event.target.value))}
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
              <p className="mt-1.5 text-xs text-text-muted">How often to automatically scan the network.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                Preferred Interface
              </label>
              <div className="relative">
                <Network className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <select
                  value={preferredInterface}
                  onChange={(event) => onPreferredInterfaceChange(event.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-theme bg-bg-tertiary py-2.5 pr-3 pl-10 text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                >
                  <option value="">Auto detect (recommended)</option>
                  {interfaces.map((iface) => (
                    <option key={iface} value={iface}>
                      {iface}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-text-muted">
                Used for scan and monitoring sessions when available.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                TCP Ports to Probe
              </label>
              <div className="relative">
                <Hash className="absolute top-3 left-3 h-4 w-4 text-text-muted" />
                <textarea
                  value={tcpPorts}
                  onChange={(event) => onTcpPortsChange(event.target.value)}
                  className="w-full resize-none rounded-lg border border-theme bg-bg-tertiary py-2.5 pr-3 pl-10 font-mono text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                  rows={2}
                  placeholder="22, 80, 443, 8080"
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted">Comma-separated list of ports.</p>
            </div>
          </div>

          <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs text-text-secondary">
            <p>
              <span className="font-semibold text-text-primary">Detected interfaces:</span>{' '}
              {interfaces.length > 0 ? interfaces.join(', ') : 'Not available'}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-text-primary">DB path:</span> {dbPath ?? 'Unavailable'}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-text-primary">Scan schema:</span>{' '}
              {scanSchemaVersion ?? 'Unavailable'}
            </p>
          </div>

          <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Runtime Diagnostics
              </p>
              <button
                onClick={onRunDiagnostics}
                disabled={diagnosticsLoading}
                className="inline-flex items-center gap-1 rounded border border-theme bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-primary transition hover:bg-bg-hover disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                {diagnosticsLoading ? 'Running' : 'Run'}
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-text-secondary">
              <p>
                <span className="font-semibold text-text-primary">Interfaces:</span>{' '}
                {runtimeDiagnostics?.interface_count ?? 0}
              </p>
              <p>
                <span className="font-semibold text-text-primary">ICMP Client:</span>{' '}
                {runtimeDiagnostics?.icmp_client_available ? 'Available' : 'Unavailable'}
              </p>
              <p>
                <span className="font-semibold text-text-primary">Monitor:</span>{' '}
                {runtimeDiagnostics?.monitor_running ? 'Running' : 'Stopped'}
              </p>
              {runtimeDiagnostics?.warnings?.length ? (
                <ul className="list-disc pl-4 text-[11px] text-accent-amber">
                  {runtimeDiagnostics.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-accent-green">No runtime warnings detected.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
