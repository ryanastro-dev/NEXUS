import clsx from 'clsx';
import { FileText, Loader2, Wrench, X } from 'lucide-react';

import { useLanguage } from '../../hooks/useLanguage';
import type { DeviceTroubleshootAdvice, NetworkReportSummary } from '../../lib/api/types';

interface TopologyAssistantOverlayProps {
  isDark: boolean;
  isGeneratingReport: boolean;
  networkReport: NetworkReportSummary | null;
  networkReportError: string | null;
  onCloseReport: () => void;
  isTroubleshooting: boolean;
  troubleshootAdvice: DeviceTroubleshootAdvice | null;
  troubleshootError: string | null;
  onCloseTroubleshoot: () => void;
}

export function TopologyAssistantOverlay({
  isDark,
  isGeneratingReport,
  networkReport,
  networkReportError,
  onCloseReport,
  isTroubleshooting,
  troubleshootAdvice,
  troubleshootError,
  onCloseTroubleshoot,
}: TopologyAssistantOverlayProps) {
  const { copy } = useLanguage();
  const topologyCopy = copy.topology;
  const showReportCard = isGeneratingReport || Boolean(networkReport) || Boolean(networkReportError);
  const showTroubleshootCard =
    isTroubleshooting || Boolean(troubleshootAdvice) || Boolean(troubleshootError);

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
              {topologyCopy.assistant.buildingSummary}
            </p>
          )}

          {!isGeneratingReport && networkReportError && (
            <p className={clsx('text-sm', isDark ? 'text-rose-300' : 'text-rose-700')}>
              {networkReportError}
            </p>
          )}

          {!isGeneratingReport && networkReport && (
            <div className="space-y-2">
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
              {topologyCopy.assistant.collectingTroubleshoot}
            </p>
          )}

          {!isTroubleshooting && troubleshootError && (
            <p className={clsx('text-sm', isDark ? 'text-rose-300' : 'text-rose-700')}>
              {troubleshootError}
            </p>
          )}

          {!isTroubleshooting && troubleshootAdvice && (
            <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}
