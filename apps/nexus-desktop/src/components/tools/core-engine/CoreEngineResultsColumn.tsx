import { Loader2, Terminal } from 'lucide-react';

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
  return (
    <div className="space-y-3">
      <div className={`${CARD} p-5`}>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Engine Output</h3>
        <div className="space-y-2 text-xs text-text-secondary">
          {scanResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">Scan with AI</p>
              <p className="mt-1">interface: {scanResult.scan.interface_name}</p>
              <p>hosts: {scanResult.scan.total_hosts}</p>
              <p>duration: {scanResult.scan.scan_duration_ms} ms</p>
              <p>ai overlay: {scanResult.ai?.ai_overlay ? 'available' : 'not available'}</p>
              <button
                onClick={onExportAiScanJson}
                disabled={exportingAiJson}
                className="mt-2 inline-flex items-center gap-2 rounded border border-theme bg-bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-text-primary transition hover:bg-bg-hover disabled:opacity-60"
              >
                {exportingAiJson ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Terminal className="h-3.5 w-3.5" />
                    Export AI JSON
                  </>
                )}
              </button>
            </div>
          )}

          {insightsResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">AI Insights</p>
              <p className="mt-1">health score: {insightsResult.health.score}</p>
              <p>grade: {insightsResult.health.grade}</p>
              <p>issues: {insightsResult.security.total_issues}</p>
            </div>
          )}

          {loadResult && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="font-semibold text-text-primary">Load Test Summary</p>
              <p className="mt-1">successful scans: {loadResult.successful_scans}</p>
              <p>failed scans: {loadResult.failed_scans}</p>
              <p>wall time: {loadResult.wall_time_ms} ms</p>
              <p>avg scan: {loadResult.avg_scan_duration_ms.toFixed(1)} ms</p>
            </div>
          )}

          {engineEvents.length > 0 && (
            <div className="rounded border border-theme bg-bg-tertiary/40 p-3">
              <p className="mb-1.5 font-semibold text-text-primary">Live Engine Events</p>
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {engineEvents.slice(0, 10).map((event, index) => (
                  <p key={`${event.kind}-${index}`} className="text-[11px] text-text-secondary">
                    {formatEngineEvent(event)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {!scanResult && !insightsResult && !loadResult && engineEvents.length === 0 && (
            <div className="flex h-28 items-center justify-center rounded border border-dashed border-theme text-text-muted">
              Run a core engine action to view output
            </div>
          )}
        </div>
      </div>

      {(scanError || insightsError || loadError) && (
        <div className={`${CARD} border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red`}>
          {scanError && <p>Scan error: {scanError}</p>}
          {insightsError && <p>Insights error: {insightsError}</p>}
          {loadError && <p>Load error: {loadError}</p>}
        </div>
      )}

      {aiOverlaySummary && (
        <div className={`${CARD} p-5`}>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">AI Overlay Summary</h3>
          {aiProviderLabel && (
            <p className="mb-2 text-xs text-text-secondary">provider: {aiProviderLabel}</p>
          )}
          <p className="rounded border border-theme bg-bg-tertiary/40 p-3 text-xs text-text-secondary">
            {aiOverlaySummary.executive_summary}
          </p>
        </div>
      )}
    </div>
  );
}
