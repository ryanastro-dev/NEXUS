import clsx from 'clsx';
import { FileText, Loader2, Wrench, X } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
import type { AiActionTelemetry } from '../../lib/ai-action-telemetry';
import type { DeviceTroubleshootAdvice, NetworkReportSummary } from '../../lib/api/types';

interface TopologyAssistantOverlayProps {
  isDark: boolean;
  isGeneratingReport: boolean;
  networkReport: NetworkReportSummary | null;
  networkReportError: string | null;
  networkReportProgressMessage?: string | null;
  onCloseReport: () => void;
  networkReportLatencyTelemetry?: AiActionTelemetry;
  isTroubleshooting: boolean;
  troubleshootAdvice: DeviceTroubleshootAdvice | null;
  troubleshootError: string | null;
  troubleshootProgressMessage?: string | null;
  onCloseTroubleshoot: () => void;
  troubleshootLatencyTelemetry?: AiActionTelemetry;
}

export function TopologyAssistantOverlay({
  isDark,
  isGeneratingReport,
  networkReport,
  networkReportError,
  networkReportProgressMessage,
  onCloseReport,
  networkReportLatencyTelemetry,
  isTroubleshooting,
  troubleshootAdvice,
  troubleshootError,
  troubleshootProgressMessage,
  onCloseTroubleshoot,
  troubleshootLatencyTelemetry,
}: TopologyAssistantOverlayProps) {
  const { copy } = useLanguage();
  const topologyCopy = copy.topology;
  const coreEngineCopy = copy.tools.coreEngine;
  const showReportCard = isGeneratingReport || Boolean(networkReport) || Boolean(networkReportError);
  const showTroubleshootCard =
    isTroubleshooting || Boolean(troubleshootAdvice) || Boolean(troubleshootError);
  const reportAiSourceLabel = networkReport?.metadata?.provider
    ? topologyCopy.assistant.aiSourceAiPowered
    : topologyCopy.assistant.aiSourceRuleBased;
  const reportProviderLabel = networkReport?.metadata?.provider
    ? networkReport.metadata.model
      ? `${networkReport.metadata.provider} (${networkReport.metadata.model})`
      : networkReport.metadata.provider
    : null;
  const reportAiError = networkReport?.metadata?.ai_error?.trim() || null;
  const troubleshootAiSourceLabel = troubleshootAdvice?.metadata?.provider
    ? topologyCopy.assistant.aiSourceAiPowered
    : topologyCopy.assistant.aiSourceRuleBased;
  const troubleshootProviderLabel = troubleshootAdvice?.metadata?.provider
    ? troubleshootAdvice.metadata.model
      ? `${troubleshootAdvice.metadata.provider} (${troubleshootAdvice.metadata.model})`
      : troubleshootAdvice.metadata.provider
    : null;
  const troubleshootAiError = troubleshootAdvice?.metadata?.ai_error?.trim() || null;
  const formatLatencyMetric = (value: number | null | undefined, withMs?: boolean) => {
    if (value === null || value === undefined) {
      return coreEngineCopy.telemetryNotCaptured;
    }
    return withMs ? `${value} ms` : String(value);
  };
  const toStatusLabel = (value: AiActionTelemetry['status'] | undefined) => {
    if (!value) {
      return coreEngineCopy.telemetryStatusIdle;
    }
    if (value === 'running') {
      return coreEngineCopy.telemetryStatusRunning;
    }
    if (value === 'success') {
      return coreEngineCopy.telemetryStatusSuccess;
    }
    if (value === 'error') {
      return coreEngineCopy.telemetryStatusError;
    }
    return coreEngineCopy.telemetryStatusIdle;
  };

  if (!showReportCard && !showTroubleshootCard) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 flex w-full max-w-sm flex-col gap-3">
      {showReportCard && (
        <div
          className={clsx(
            'pointer-events-auto rounded-xl border p-3 shadow-xl backdrop-blur-xl',
            isDark
              ? 'border-cyan-400/30 bg-slate-900/90 text-slate-100'
              : 'border-cyan-200 bg-white/95 text-slate-900',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isGeneratingReport ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              ) : (
                <FileText className="h-4 w-4 text-cyan-400" />
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                {topologyCopy.assistant.networkReport}
              </p>
            </div>
            {!isGeneratingReport && (
              <button
                onClick={onCloseReport}
                className={clsx(
                  'rounded-md p-1 transition-colors',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100',
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isGeneratingReport && (
            <p className={clsx('text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {networkReportProgressMessage ?? topologyCopy.assistant.buildingSummary}
            </p>
          )}

          {!isGeneratingReport && networkReportError && (
            <p className={clsx('text-sm', isDark ? 'text-rose-300' : 'text-rose-700')}>
              {networkReportError}
            </p>
          )}

          {!isGeneratingReport && networkReport && (
            <div className="space-y-2">
              <p className={clsx('text-xs', isDark ? 'text-cyan-300' : 'text-cyan-700')}>
                {topologyCopy.assistant.aiSource}: {reportAiSourceLabel}
              </p>
              {reportProviderLabel && (
                <p className={clsx('text-xs', isDark ? 'text-cyan-300' : 'text-cyan-700')}>
                  {topologyCopy.assistant.provider}: {reportProviderLabel}
                </p>
              )}
              {reportAiError && (
                <p className={clsx('text-xs', isDark ? 'text-amber-300' : 'text-amber-700')}>
                  {topologyCopy.assistant.aiError}: {reportAiError}
                </p>
              )}
              <p className={clsx('text-sm', isDark ? 'text-slate-200' : 'text-slate-800')}>
                {networkReport.executive_summary}
              </p>
              <p className={clsx('text-xs', isDark ? 'text-cyan-300' : 'text-cyan-700')}>
                {topologyCopy.assistant.hostsSummary
                  .replace('{total}', String(networkReport.total_hosts))
                  .replace('{online}', String(networkReport.online_hosts))
                  .replace('{offline}', String(networkReport.offline_hosts))}
              </p>
              <div className={clsx('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>
                {networkReport.recommended_actions.slice(0, 2).map((action) => (
                  <p key={action}>- {action}</p>
                ))}
              </div>
            </div>
          )}

          {networkReportLatencyTelemetry && (
            <div
              className={clsx(
                'mt-2 rounded border px-2 py-1.5 text-[11px]',
                isDark ? 'border-cyan-400/20 bg-cyan-950/30 text-cyan-100' : 'border-cyan-200 bg-cyan-100/60 text-cyan-800',
              )}
            >
              <p>{coreEngineCopy.telemetryStatusLabel} {toStatusLabel(networkReportLatencyTelemetry.status)}</p>
              <p>{coreEngineCopy.telemetryStartMsLabel} {formatLatencyMetric(networkReportLatencyTelemetry.start_ms)}</p>
              <p>{coreEngineCopy.telemetryEndMsLabel} {formatLatencyMetric(networkReportLatencyTelemetry.end_ms)}</p>
              <p>{coreEngineCopy.telemetryDurationMsLabel} {formatLatencyMetric(networkReportLatencyTelemetry.duration_ms, true)}</p>
            </div>
          )}
        </div>
      )}

      {showTroubleshootCard && (
        <div
          className={clsx(
            'pointer-events-auto rounded-xl border p-3 shadow-xl backdrop-blur-xl',
            isDark
              ? 'border-indigo-400/30 bg-slate-900/90 text-slate-100'
              : 'border-indigo-200 bg-white/95 text-slate-900',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTroubleshooting ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              ) : (
                <Wrench className="h-4 w-4 text-indigo-400" />
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                {topologyCopy.assistant.troubleshoot}
              </p>
            </div>
            {!isTroubleshooting && (
              <button
                onClick={onCloseTroubleshoot}
                className={clsx(
                  'rounded-md p-1 transition-colors',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100',
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isTroubleshooting && (
            <p className={clsx('text-sm', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {troubleshootProgressMessage ?? topologyCopy.assistant.collectingTroubleshoot}
            </p>
          )}

          {!isTroubleshooting && troubleshootError && (
            <p className={clsx('text-sm', isDark ? 'text-rose-300' : 'text-rose-700')}>
              {troubleshootError}
            </p>
          )}

          {!isTroubleshooting && troubleshootAdvice && (
            <div className="space-y-2">
              <p className={clsx('text-xs', isDark ? 'text-indigo-300' : 'text-indigo-700')}>
                {topologyCopy.assistant.aiSource}: {troubleshootAiSourceLabel}
              </p>
              {troubleshootProviderLabel && (
                <p className={clsx('text-xs', isDark ? 'text-indigo-300' : 'text-indigo-700')}>
                  {topologyCopy.assistant.provider}: {troubleshootProviderLabel}
                </p>
              )}
              {troubleshootAiError && (
                <p className={clsx('text-xs', isDark ? 'text-amber-300' : 'text-amber-700')}>
                  {topologyCopy.assistant.aiError}: {troubleshootAiError}
                </p>
              )}
              <p className={clsx('text-sm', isDark ? 'text-slate-200' : 'text-slate-800')}>
                {troubleshootAdvice.summary}
              </p>
              <div className={clsx('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>
                {troubleshootAdvice.diagnostic_steps.slice(0, 2).map((step) => (
                  <p key={step}>- {step}</p>
                ))}
              </div>
            </div>
          )}

          {troubleshootLatencyTelemetry && (
            <div
              className={clsx(
                'mt-2 rounded border px-2 py-1.5 text-[11px]',
                isDark ? 'border-indigo-400/20 bg-indigo-950/30 text-indigo-100' : 'border-indigo-200 bg-indigo-100/60 text-indigo-800',
              )}
            >
              <p>{coreEngineCopy.telemetryStatusLabel} {toStatusLabel(troubleshootLatencyTelemetry.status)}</p>
              <p>{coreEngineCopy.telemetryStartMsLabel} {formatLatencyMetric(troubleshootLatencyTelemetry.start_ms)}</p>
              <p>{coreEngineCopy.telemetryEndMsLabel} {formatLatencyMetric(troubleshootLatencyTelemetry.end_ms)}</p>
              <p>{coreEngineCopy.telemetryDurationMsLabel} {formatLatencyMetric(troubleshootLatencyTelemetry.duration_ms, true)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
