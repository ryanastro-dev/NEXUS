import { Activity, RefreshCw } from 'lucide-react';
import type { AiCheckReport, AiSettings } from '../../lib/api/types';

interface AiEngineSectionProps {
  panelClassName: string;
  aiSettings: AiSettings | null;
  aiCheckReport: AiCheckReport | null;
  aiCheckLoading: boolean;
  aiError: string | null;
  onRunAiCheck: () => void;
}

export function AiEngineSection({
  panelClassName,
  aiSettings,
  aiCheckReport,
  aiCheckLoading,
  aiError,
  onRunAiCheck,
}: AiEngineSectionProps) {
  return (
    <div className={`${panelClassName} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-sapphire/10 p-2">
            <Activity className="h-5 w-5 text-accent-sapphire" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">AI Engine</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Validate local/cloud AI provider health and runtime configuration.
            </p>
          </div>
        </div>
        <button
          onClick={onRunAiCheck}
          disabled={aiCheckLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${aiCheckLoading ? 'animate-spin' : ''}`} />
          {aiCheckLoading ? 'Checking...' : 'Run AI Check'}
        </button>
      </div>

      <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs text-text-secondary">
        <p>
          <span className="font-semibold text-text-primary">Enabled:</span>{' '}
          {aiSettings?.enabled ? 'Yes' : 'No'}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-text-primary">Mode:</span> {aiSettings?.mode ?? 'Unavailable'}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-text-primary">Timeout:</span> {aiSettings?.timeout_ms ?? 'N/A'} ms
        </p>
      </div>

      {aiCheckReport && (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {aiCheckReport.local && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs">
              <p className="font-semibold text-text-primary">Local Provider</p>
              <p className="mt-1 text-text-secondary">
                configured: {String(aiCheckReport.local.configured)}
              </p>
              <p className="text-text-secondary">reachable: {String(aiCheckReport.local.reachable)}</p>
              <p className="text-text-secondary">model: {aiCheckReport.local.model ?? 'N/A'}</p>
            </div>
          )}
          {aiCheckReport.cloud && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs">
              <p className="font-semibold text-text-primary">Cloud Provider</p>
              <p className="mt-1 text-text-secondary">
                configured: {String(aiCheckReport.cloud.configured)}
              </p>
              <p className="text-text-secondary">reachable: {String(aiCheckReport.cloud.reachable)}</p>
              <p className="text-text-secondary">model: {aiCheckReport.cloud.model ?? 'N/A'}</p>
            </div>
          )}
        </div>
      )}

      {aiError && (
        <p className="mt-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
          {aiError}
        </p>
      )}
    </div>
  );
}
