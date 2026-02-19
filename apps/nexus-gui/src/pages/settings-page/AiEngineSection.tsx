import { Activity, RefreshCw, Wand2, Shield, Cpu, Cloud } from 'lucide-react';
import Select from '../../components/common/Select';
import type { AiCheckReport, AiMode, AiSettings } from '../../lib/api/types';
import { AppToggle } from './AppToggle';

interface AiEngineSectionProps {
  panelClassName: string;
  aiSettings: AiSettings | null;
  aiEnabled: boolean;
  aiMode: AiMode;
  aiTimeoutMs: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  geminiEndpoint: string;
  geminiModel: string;
  geminiApiKey: string;
  cloudAllowSensitive: boolean;
  aiApplyLoading: boolean;
  aiHasChanges: boolean;
  aiCheckReport: AiCheckReport | null;
  aiCheckLoading: boolean;
  aiError: string | null;
  onAiEnabledToggle: () => void;
  onAiModeChange: (value: AiMode) => void;
  onAiTimeoutChange: (value: number) => void;
  onOllamaEndpointChange: (value: string) => void;
  onOllamaModelChange: (value: string) => void;
  onGeminiEndpointChange: (value: string) => void;
  onGeminiModelChange: (value: string) => void;
  onGeminiApiKeyChange: (value: string) => void;
  onCloudAllowSensitiveToggle: () => void;
  onApplyAiSettings: () => void;
  onRunAiCheck: () => void;
}

export function AiEngineSection({
  panelClassName,
  aiSettings,
  aiEnabled,
  aiMode,
  aiTimeoutMs,
  ollamaEndpoint,
  ollamaModel,
  geminiEndpoint,
  geminiModel,
  geminiApiKey,
  cloudAllowSensitive,
  aiApplyLoading,
  aiHasChanges,
  aiCheckReport,
  aiCheckLoading,
  aiError,
  onAiEnabledToggle,
  onAiModeChange,
  onAiTimeoutChange,
  onOllamaEndpointChange,
  onOllamaModelChange,
  onGeminiEndpointChange,
  onGeminiModelChange,
  onGeminiApiKeyChange,
  onCloudAllowSensitiveToggle,
  onApplyAiSettings,
  onRunAiCheck,
}: AiEngineSectionProps) {
  const showLocalConfig = aiEnabled && (aiMode === 'local' || aiMode === 'hybrid_auto');
  const showCloudConfig = aiEnabled && (aiMode === 'cloud' || aiMode === 'hybrid_auto');
  const aiModeOptions = [
    { value: 'disabled', label: 'Disabled' },
    { value: 'local', label: 'Local (Ollama)' },
    { value: 'cloud', label: 'Cloud (Gemini)' },
    { value: 'hybrid_auto', label: 'Hybrid Auto' },
  ];

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
              Choose Local Ollama / Cloud Gemini / Hybrid mode and validate readiness.
            </p>
          </div>
        </div>
        <AppToggle enabled={aiEnabled} onToggle={onAiEnabledToggle} />
      </div>

      {aiEnabled ? (
        <div className="space-y-4 border-t border-theme pt-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">AI Mode</label>
            <Select
              options={aiModeOptions}
              value={aiMode}
              onChange={(value) => onAiModeChange(value as AiMode)}
              searchable={false}
              fullWidth
            />
            <p className="mt-1.5 text-xs text-text-muted">
              Local keeps traffic on your machine. Cloud requires API key. Hybrid uses local first, then cloud fallback.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">Timeout (ms)</label>
            <input
              type="number"
              min={500}
              max={60000}
              step={100}
              value={aiTimeoutMs}
              onChange={(event) => onAiTimeoutChange(Number(event.target.value))}
              className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
            />
          </div>

          {showLocalConfig && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent-blue" />
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Local Provider (Ollama)</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Endpoint</label>
                  <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={(event) => onOllamaEndpointChange(event.target.value)}
                    className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Model</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(event) => onOllamaModelChange(event.target.value)}
                    className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                    placeholder="qwen3:8b"
                  />
                </div>
              </div>
            </div>
          )}

          {showCloudConfig && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Cloud className="h-4 w-4 text-accent-sapphire" />
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Cloud Provider (Gemini)</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Endpoint</label>
                  <input
                    type="text"
                    value={geminiEndpoint}
                    onChange={(event) => onGeminiEndpointChange(event.target.value)}
                    className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                    placeholder="https://generativelanguage.googleapis.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Model</label>
                  <input
                    type="text"
                    value={geminiModel}
                    onChange={(event) => onGeminiModelChange(event.target.value)}
                    className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                    placeholder="gemini-2.5-flash"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(event) => onGeminiApiKeyChange(event.target.value)}
                    className="w-full rounded-lg border border-theme bg-bg-tertiary px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-blue focus:outline-none"
                    placeholder="AIza..."
                    autoComplete="off"
                  />
                </div>

                <button
                  onClick={onCloudAllowSensitiveToggle}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    cloudAllowSensitive
                      ? 'bg-accent-amber/15 text-accent-amber'
                      : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  {cloudAllowSensitive ? 'Sensitive cloud payload: Allowed' : 'Sensitive cloud payload: Redacted'}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onApplyAiSettings}
              disabled={aiApplyLoading || !aiHasChanges}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <Wand2 className={`h-3.5 w-3.5 ${aiApplyLoading ? 'animate-pulse' : ''}`} />
              {aiApplyLoading ? 'Applying...' : 'Apply AI Settings'}
            </button>

            <button
              onClick={onRunAiCheck}
              disabled={aiCheckLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-xs font-bold text-text-primary transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${aiCheckLoading ? 'animate-spin' : ''}`} />
              {aiCheckLoading ? 'Checking...' : 'Run AI Check'}
            </button>
          </div>
        </div>
      ) : null}

      {aiEnabled ? (
        <div className="mt-4 rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs text-text-secondary">
          <p>
            <span className="font-semibold text-text-primary">Runtime Enabled:</span>{' '}
            {aiSettings?.enabled ? 'Yes' : 'No'}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-text-primary">Runtime Mode:</span> {aiSettings?.mode ?? 'Unavailable'}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-text-primary">Timeout:</span> {aiSettings?.timeout_ms ?? 'N/A'} ms
          </p>
        </div>
      ) : null}

      {aiEnabled && aiCheckReport && (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {aiCheckReport.local && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs">
              <p className="font-semibold text-text-primary">Local Provider</p>
              <p className="mt-1 text-text-secondary">configured: {String(aiCheckReport.local.configured)}</p>
              <p className="text-text-secondary">reachable: {String(aiCheckReport.local.reachable)}</p>
              <p className="text-text-secondary">model: {aiCheckReport.local.model ?? 'N/A'}</p>
              <p className="text-text-secondary">latency: {aiCheckReport.local.latency_ms ?? 'N/A'} ms</p>
            </div>
          )}
          {aiCheckReport.cloud && (
            <div className="rounded-lg border border-theme bg-bg-tertiary/40 p-3 text-xs">
              <p className="font-semibold text-text-primary">Cloud Provider</p>
              <p className="mt-1 text-text-secondary">configured: {String(aiCheckReport.cloud.configured)}</p>
              <p className="text-text-secondary">reachable: {String(aiCheckReport.cloud.reachable)}</p>
              <p className="text-text-secondary">model: {aiCheckReport.cloud.model ?? 'N/A'}</p>
              <p className="text-text-secondary">latency: {aiCheckReport.cloud.latency_ms ?? 'N/A'} ms</p>
            </div>
          )}
        </div>
      )}

      {aiEnabled && aiError && (
        <p className="mt-3 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
          {aiError}
        </p>
      )}
    </div>
  );
}
