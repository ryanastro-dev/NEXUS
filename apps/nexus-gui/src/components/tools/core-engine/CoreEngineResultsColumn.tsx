import { Loader2, Terminal } from 'lucide-react';

import { useLanguage } from '../../../hooks/useLanguage';
import type {
  EngineEventType,
  HybridInsightsResult,
  LoadTestSummary,
  ScanWithAi,
} from '../../../lib/api/types';
import { CARD } from './constants';
import { formatEngineEvent } from './formatters';

interface CoreEngineResultsColumnProps {
  scanResult: ScanWithAi | null;
  insightsResult: HybridInsightsResult | null;
  loadResult: LoadTestSummary | null;
  engineEvents: EngineEventType[];
  scanError: string | null;
  insightsError: string | null;
  loadError: string | null;
  exportingAiJson: boolean;
  aiOverlaySummary: {
    executive_summary: string;
  } | null;
  aiProviderLabel: string | null;
  onExportAiScanJson: () => void;
}

export function CoreEngineResultsColumn({
  scanResult,
  insightsResult,
  loadResult,
  engineEvents,
  scanError,
  insightsError,
  loadError,
  exportingAiJson,
  aiOverlaySummary,
  aiProviderLabel,
  onExportAiScanJson,
}: CoreEngineResultsColumnProps) {
  const { copy } = useLanguage();
  const coreEngineCopy = copy.tools.coreEngine;

  return (
    <div className="space-y-3">
      <div className={`${CARD} p-4`}>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">{coreEngineCopy.outputTitle}</h3>
        <div className="space-y-2 text-xs text-text-secondary">
          {scanResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">{coreEngineCopy.resultScanWithAi}</p>
              <p className="mt-1">{coreEngineCopy.interfaceLabel} {scanResult.scan.interface_name}</p>
              <p>{coreEngineCopy.hosts} {scanResult.scan.total_hosts}</p>
              <p>{coreEngineCopy.duration} {scanResult.scan.scan_duration_ms} ms</p>
              <p>
                {coreEngineCopy.aiOverlay}{' '}
                {scanResult.ai?.ai_overlay ? coreEngineCopy.available : coreEngineCopy.notAvailable}
              </p>
              {scanResult.ai?.ai_error && (
                <p className="mt-1 text-accent-amber">
                  {coreEngineCopy.aiError} {scanResult.ai.ai_error}
                </p>
              )}
              <button
                onClick={onExportAiScanJson}
                disabled={exportingAiJson}
                className="mt-2 inline-flex items-center gap-2 rounded border border-theme bg-bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-text-primary transition hover:bg-bg-hover disabled:opacity-60"
              >
                {exportingAiJson ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {coreEngineCopy.exporting}
                  </>
                ) : (
                  <>
                    <Terminal className="h-3.5 w-3.5" />
                    {coreEngineCopy.exportAiJson}
                  </>
                )}
              </button>
            </div>
          )}

          {insightsResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">{coreEngineCopy.resultAiInsights}</p>
              <p className="mt-1">{coreEngineCopy.healthScore} {insightsResult.health.score}</p>
              <p>{coreEngineCopy.grade} {insightsResult.health.grade}</p>
              <p>{coreEngineCopy.issues} {insightsResult.security.total_issues}</p>
            </div>
          )}

          {loadResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">{coreEngineCopy.resultLoadTest}</p>
              <p className="mt-1">{coreEngineCopy.successfulScans} {loadResult.successful_scans}</p>
              <p>{coreEngineCopy.failedScans} {loadResult.failed_scans}</p>
              <p>{coreEngineCopy.wallTime} {loadResult.wall_time_ms} ms</p>
              <p>{coreEngineCopy.avgScan} {loadResult.avg_scan_duration_ms.toFixed(1)} ms</p>
            </div>
          )}

          {engineEvents.length > 0 && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="mb-1.5 font-semibold text-text-primary">{coreEngineCopy.liveEngineEvents}</p>
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {engineEvents.slice(0, 10).map((event, index) => (
                  <p key={`${event.kind}-${index}`} className="text-[11px] text-text-secondary">
                    {formatEngineEvent(event, coreEngineCopy)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {!scanResult && !insightsResult && !loadResult && engineEvents.length === 0 && (
            <div className="flex h-28 items-center justify-center rounded border border-dashed border-theme text-text-muted">
              {coreEngineCopy.runActionHint}
            </div>
          )}
        </div>
      </div>

      {(scanError || insightsError || loadError) && (
        <div className={`${CARD} border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red`}>
          {scanError && <p>{coreEngineCopy.scanError} {scanError}</p>}
          {insightsError && <p>{coreEngineCopy.insightsError} {insightsError}</p>}
          {loadError && <p>{coreEngineCopy.loadError} {loadError}</p>}
        </div>
      )}

      {aiOverlaySummary && (
        <div className={`${CARD} p-4`}>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            {coreEngineCopy.aiOverlaySummary}
          </h3>
          {aiProviderLabel && (
            <p className="mb-2 text-xs text-text-secondary">
              {coreEngineCopy.provider} {aiProviderLabel}
            </p>
          )}
          <p className="rounded border border-theme bg-bg-tertiary/40 p-3 text-xs text-text-secondary">
            {aiOverlaySummary.executive_summary}
          </p>
        </div>
      )}
    </div>
  );
}
