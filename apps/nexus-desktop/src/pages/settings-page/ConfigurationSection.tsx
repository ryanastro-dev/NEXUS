import { Activity, Hash, Network, RefreshCw } from 'lucide-react';
import Select from '../../components/common/Select';
import type { RuntimeDiagnostics } from '../../lib/api/types';

interface ConfigurationSectionProps {
  panelClassName: string;
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
  const preferredInterfaceOptions = [
    { value: '', label: 'Auto detect (recommended)' },
    ...interfaces.map((iface) => ({ value: iface, label: iface })),
  ];

  return (
    <div className={`${panelClassName} p-5`}>
      <div className="mb-5 flex items-center gap-3">
        <Activity className="h-5 w-5 text-accent-blue" />
        <h2 className="text-base font-bold text-text-primary">Scanner Configuration</h2>
      </div>

      <div className="space-y-5">
        <div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
                Preferred Interface
              </label>
              <Select
                options={preferredInterfaceOptions}
                value={preferredInterface}
                onChange={(value) => onPreferredInterfaceChange(String(value))}
                leftIcon={<Network className="h-4 w-4" />}
                searchable={interfaces.length > 8}
                fullWidth
              />
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
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="h-full rounded-xl border border-theme bg-bg-tertiary/40 p-3.5 text-xs text-text-secondary">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Runtime Context
              </p>
              <div className="space-y-1.5">
                <p className="leading-5">
                  <span className="font-semibold text-text-primary">Detected interfaces:</span>{' '}
                  <span className="break-all">{interfaces.length > 0 ? interfaces.join(', ') : 'Not available'}</span>
                </p>
                <p className="leading-5">
                  <span className="font-semibold text-text-primary">DB path:</span>{' '}
                  <span className="break-all">{dbPath ?? 'Unavailable'}</span>
                </p>
                <p className="leading-5">
                  <span className="font-semibold text-text-primary">Scan schema:</span>{' '}
                  {scanSchemaVersion ?? 'Unavailable'}
                </p>
              </div>
            </div>

            <div className="h-full rounded-xl border border-theme bg-bg-tertiary/40 p-3.5">
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
    </div>
  );
}
