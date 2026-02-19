import { Cpu, Gauge, Loader2, Play, Shield } from 'lucide-react';

import Select from '../../common/Select';
import { CARD } from './constants';

interface CoreEngineActionsCardProps {
  interfaces: string[];
  selectedInterface: string;
  onSelectedInterfaceChange: (value: string) => void;
  scanLoading: boolean;
  insightsLoading: boolean;
  loadIterations: number;
  onLoadIterationsChange: (value: number) => void;
  loadConcurrency: number;
  onLoadConcurrencyChange: (value: number) => void;
  loadLoading: boolean;
  onScanWithAi: () => void;
  onAiInsights: () => void;
  onLoadTest: () => void;
}

export function CoreEngineActionsCard({
  interfaces,
  selectedInterface,
  onSelectedInterfaceChange,
  scanLoading,
  insightsLoading,
  loadIterations,
  onLoadIterationsChange,
  loadConcurrency,
  onLoadConcurrencyChange,
  loadLoading,
  onScanWithAi,
  onAiInsights,
  onLoadTest,
}: CoreEngineActionsCardProps) {
  const inputClass =
    'h-11 w-full rounded-xl border border-theme bg-bg-tertiary px-3 text-sm text-text-primary focus:border-accent-blue focus:outline-none';
  const interfaceOptions = [
    { value: '', label: 'Auto detect' },
    ...interfaces.map((iface) => ({ value: iface, label: iface })),
  ];

  return (
    <div className={`${CARD} space-y-4 p-4`}>
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-accent-blue" />
        <h2 className="text-base font-bold text-text-primary">Core Engine Actions</h2>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase text-text-secondary">Interface</label>
        <Select
          options={interfaceOptions}
          value={selectedInterface}
          onChange={(value) => onSelectedInterfaceChange(String(value))}
          searchable={interfaces.length > 8}
          fullWidth
        />
      </div>

      <div className="space-y-2">
        <button
          onClick={onScanWithAi}
          disabled={scanLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-bold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110 disabled:opacity-50"
        >
          {scanLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Scan with AI
            </>
          )}
        </button>

        <button
          onClick={onAiInsights}
          disabled={insightsLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-theme bg-bg-secondary px-4 text-sm font-semibold text-text-primary transition hover:bg-bg-hover disabled:opacity-50"
        >
          {insightsLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              AI Insights (Latest Scan)
            </>
          )}
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-theme bg-bg-tertiary/40 p-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-accent-blue" />
          <p className="text-sm font-semibold text-text-primary">Load Test</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-text-secondary">Iterations</label>
            <input
              type="number"
              min={1}
              max={50}
              value={loadIterations}
              onChange={(event) => onLoadIterationsChange(Number(event.target.value || 1))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-text-secondary">
              Concurrency
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={loadConcurrency}
              onChange={(event) => onLoadConcurrencyChange(Number(event.target.value || 1))}
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={onLoadTest}
          disabled={loadLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {loadLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Load Test
            </>
          )}
        </button>
      </div>
    </div>
  );
}
