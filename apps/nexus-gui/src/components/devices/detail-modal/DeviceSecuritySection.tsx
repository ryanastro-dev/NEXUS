import clsx from 'clsx';
import { AlertTriangle, Shield, ShieldCheck } from 'lucide-react';

import type { AiActionTelemetry } from '../../../lib/ai-action-telemetry';
import type { DeviceSecurityAnalysis } from '../../../lib/api/types';
import type { HostInfo } from '../../../hooks/useScan';
import { useLanguage } from '../../../hooks/useLanguage';

interface DeviceSecuritySectionProps {
  device: HostInfo;
  isDark: boolean;
  analysis: DeviceSecurityAnalysis | null;
  isAnalyzing: boolean;
  analysisProgressMessage?: string | null;
  error: string | null;
  aiLatencyTelemetry: AiActionTelemetry;
}

function gradeClasses(grade: string, isDark: boolean): string {
  if (grade === 'A' || grade === 'B') {
    return isDark
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }
  if (grade === 'C' || grade === 'D') {
    return isDark
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-amber-300 bg-amber-50 text-amber-700';
  }
  if (grade === 'F') {
    return isDark
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      : 'border-rose-300 bg-rose-50 text-rose-700';
  }

  return isDark
    ? 'border-slate-600 bg-slate-800/60 text-slate-300'
    : 'border-slate-300 bg-slate-100 text-slate-600';
}

export function DeviceSecuritySection({
  device,
  isDark,
  analysis,
  isAnalyzing,
  analysisProgressMessage,
  error,
  aiLatencyTelemetry,
}: DeviceSecuritySectionProps) {
  const { copy } = useLanguage();
  const modalCopy = copy.devices.modal;
  const coreEngineCopy = copy.tools.coreEngine;
  const grade = (device.security_grade ?? 'N/A').toUpperCase();
  const vulnerabilities = device.vulnerabilities ?? [];
  const portWarnings = device.port_warnings ?? [];
  const findingCount = vulnerabilities.length + portWarnings.length;
  const hasFindings = findingCount > 0;
  const aiSourceLabel = analysis?.metadata?.provider
    ? modalCopy.security.aiSourceAiPowered
    : modalCopy.security.aiSourceRuleBased;
  const aiProviderLabel = analysis?.metadata?.provider
    ? analysis.metadata.model
      ? `${analysis.metadata.provider} (${analysis.metadata.model})`
      : analysis.metadata.provider
    : null;
  const aiMetadataError = analysis?.metadata?.ai_error?.trim() || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-cyan-500" />
        <h3
          className={clsx(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          {modalCopy.security.title}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={clsx(
            'rounded-lg border p-2.5',
            isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50',
          )}
        >
          <p className={clsx('text-[11px] uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {modalCopy.security.securityGrade}
          </p>
          <span
            className={clsx(
              'mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-bold',
              gradeClasses(grade, isDark),
            )}
          >
            {grade}
          </span>
        </div>
        <div
          className={clsx(
            'rounded-lg border p-2.5',
            isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50',
          )}
        >
          <p className={clsx('text-[11px] uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {modalCopy.security.findings}
          </p>
          <p className={clsx('mt-1 text-sm font-bold', isDark ? 'text-slate-100' : 'text-slate-900')}>
            {findingCount}
          </p>
        </div>
      </div>

      {hasFindings ? (
        <div className="space-y-2">
          {vulnerabilities.map((vulnerability) => (
            <div
              key={vulnerability.cve_id}
              className={clsx(
                'rounded-lg border p-2.5',
                isDark ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50',
              )}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className={clsx('text-xs font-bold', isDark ? 'text-rose-300' : 'text-rose-700')}>
                  {vulnerability.cve_id}
                </span>
                {typeof vulnerability.cvss_score === 'number' && (
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      isDark ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700',
                    )}
                  >
                    {modalCopy.security.cvss} {vulnerability.cvss_score.toFixed(1)}
                  </span>
                )}
              </div>
              <p className={clsx('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>
                {vulnerability.description}
              </p>
            </div>
          ))}

          {portWarnings.map((warning, index) => (
            <div
              key={`${warning.port}-${warning.service}-${index}`}
              className={clsx(
                'rounded-lg border p-2.5',
                isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50',
              )}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className={clsx('text-xs font-bold', isDark ? 'text-amber-300' : 'text-amber-700')}>
                  {modalCopy.security.portLabel
                    .replace('{port}', String(warning.port))
                    .replace('{service}', warning.service)}
                </span>
                <span className={clsx('text-[10px] font-semibold uppercase', isDark ? 'text-amber-200' : 'text-amber-700')}>
                  {warning.severity}
                </span>
              </div>
              <p className={clsx('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>
                {warning.warning}
                {warning.recommendation
                  ? ` (${modalCopy.security.recommendationPrefix}: ${warning.recommendation})`
                  : ''}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={clsx(
            'rounded-lg border px-3 py-2.5 text-xs',
            isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{modalCopy.security.noKnownFindings}</span>
          </div>
        </div>
      )}

      {(analysis || isAnalyzing || error) && (
        <div
          className={clsx(
            'space-y-2 rounded-lg border p-3',
            isDark ? 'border-cyan-400/30 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50',
          )}
        >
          <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.14em]', isDark ? 'text-cyan-300' : 'text-cyan-700')}>
            {modalCopy.security.aiRemediation}
          </p>

          {isAnalyzing && (
            <p className={clsx('text-xs', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {analysisProgressMessage ?? modalCopy.security.generatingActions}
            </p>
          )}

          {!isAnalyzing && error && (
            <p className={clsx('text-xs', isDark ? 'text-rose-300' : 'text-rose-700')}>
              {error}
            </p>
          )}

          {!isAnalyzing && analysis && (
            <div className="space-y-2">
              <p className={clsx('text-[11px]', isDark ? 'text-cyan-200' : 'text-cyan-700')}>
                {modalCopy.security.aiSource}: {aiSourceLabel}
              </p>
              {aiProviderLabel && (
                <p className={clsx('text-[11px]', isDark ? 'text-cyan-200' : 'text-cyan-700')}>
                  {modalCopy.security.provider}: {aiProviderLabel}
                </p>
              )}
              {aiMetadataError && (
                <p className={clsx('text-[11px]', isDark ? 'text-amber-200' : 'text-amber-700')}>
                  {modalCopy.security.aiError}: {aiMetadataError}
                </p>
              )}
              <p className={clsx('text-xs', isDark ? 'text-slate-200' : 'text-slate-800')}>
                {analysis.executive_summary}
              </p>
              <div className="space-y-1">
                {analysis.recommended_actions.slice(0, 4).map((action, index) => (
                  <p key={`${index}-${action}`} className={clsx('text-xs', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    {index + 1}. {action}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div
            className={clsx(
              'rounded border px-2 py-1.5 text-[11px]',
              isDark ? 'border-cyan-400/30 bg-cyan-900/20 text-cyan-100' : 'border-cyan-200 bg-cyan-100/60 text-cyan-800',
            )}
          >
            <p>
              {coreEngineCopy.telemetryStatusLabel}{' '}
              {aiLatencyTelemetry.status === 'idle'
                ? coreEngineCopy.telemetryStatusIdle
                : aiLatencyTelemetry.status === 'running'
                  ? coreEngineCopy.telemetryStatusRunning
                  : aiLatencyTelemetry.status === 'success'
                    ? coreEngineCopy.telemetryStatusSuccess
                    : coreEngineCopy.telemetryStatusError}
            </p>
            <p>
              {coreEngineCopy.telemetryStartMsLabel}{' '}
              {aiLatencyTelemetry.start_ms ?? coreEngineCopy.telemetryNotCaptured}
            </p>
            <p>
              {coreEngineCopy.telemetryEndMsLabel}{' '}
              {aiLatencyTelemetry.end_ms ?? coreEngineCopy.telemetryNotCaptured}
            </p>
            <p>
              {coreEngineCopy.telemetryDurationMsLabel}{' '}
              {aiLatencyTelemetry.duration_ms === null
                ? coreEngineCopy.telemetryNotCaptured
                : `${aiLatencyTelemetry.duration_ms} ms`}
            </p>
          </div>
        </div>
      )}

      {!analysis && !isAnalyzing && !error && (
        <div
          className={clsx(
            'rounded-lg border px-3 py-2.5 text-xs',
            isDark ? 'border-slate-700 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600',
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{modalCopy.security.clickRunHint}</span>
          </div>
        </div>
      )}
    </div>
  );
}
