import { useEffect, useMemo, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

import { eventClient } from '../../../lib/api/event-client';
import { tauriClient } from '../../../lib/api/tauri-client';
import type {
  AiCheckReport,
  AiSettings,
  EngineEventType,
  HybridInsightsResult,
  LoadTestSummary,
  ScanWithAi,
} from '../../../lib/api/types';
import { isTauri } from '../../../lib/runtime/is-tauri';
import { useLanguage } from '../../../hooks/useLanguage';

function resolveAiReadinessMessage(
  settings: AiSettings,
  report: AiCheckReport | null,
  copy: {
    readinessDisabled: string;
    readinessUnavailable: string;
    readinessReady: string;
    readinessLocalNotReachable: string;
    readinessCloudNotReachable: string;
    readinessHybridUnavailable: string;
    readinessNoProvider: string;
  },
): string {
  if (!settings.enabled || settings.mode === 'disabled') {
    return copy.readinessDisabled;
  }

  if (!report) {
    return copy.readinessUnavailable;
  }

  if (report.overall_ok) {
    return copy.readinessReady;
  }

  if (report.mode === 'local') {
    return report.local?.error ?? copy.readinessLocalNotReachable;
  }

  if (report.mode === 'cloud') {
    return report.cloud?.error ?? copy.readinessCloudNotReachable;
  }

  const localError = report.local?.error;
  const cloudError = report.cloud?.error;
  if (localError && cloudError) {
    return copy.readinessHybridUnavailable
      .replace('{local}', localError)
      .replace('{cloud}', cloudError);
  }

  return localError ?? cloudError ?? copy.readinessNoProvider;
}

async function runAiReadinessCheckWithCopy(copy: {
  readinessDisabled: string;
  readinessUnavailable: string;
  readinessReady: string;
  readinessLocalNotReachable: string;
  readinessCloudNotReachable: string;
  readinessHybridUnavailable: string;
  readinessNoProvider: string;
}): Promise<{
  ready: boolean;
  message: string;
}> {
  const settings = await tauriClient.getAiSettings();
  if (!settings.enabled || settings.mode === 'disabled') {
    return {
      ready: false,
      message: resolveAiReadinessMessage(settings, null, copy),
    };
  }

  const report = await tauriClient.runAiCheck();
  return {
    ready: report.overall_ok,
    message: resolveAiReadinessMessage(settings, report, copy),
  };
}

export function useCoreEngineTools() {
  const { copy } = useLanguage();
  const coreEngineCopy = copy.tools.coreEngine;
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState('');

  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanWithAi | null>(null);

  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<HybridInsightsResult | null>(null);

  const [loadIterations, setLoadIterations] = useState(5);
  const [loadConcurrency, setLoadConcurrency] = useState(1);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadResult, setLoadResult] = useState<LoadTestSummary | null>(null);
  const [engineEvents, setEngineEvents] = useState<EngineEventType[]>([]);
  const [exportingAiJson, setExportingAiJson] = useState(false);
  const [aiReadinessLoading, setAiReadinessLoading] = useState(true);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [aiReadinessMessage, setAiReadinessMessage] = useState<string | null>(null);

  useEffect(() => {
    tauriClient.getInterfaces().then(setInterfaces).catch(() => setInterfaces([]));
  }, [coreEngineCopy]);

  useEffect(() => {
    let disposed = false;

    const refreshAiReadiness = async () => {
      setAiReadinessLoading(true);
      try {
        const readiness = await runAiReadinessCheckWithCopy(coreEngineCopy);
        if (!disposed) {
          setAiReady(readiness.ready);
          setAiReadinessMessage(readiness.message);
        }
      } catch (error) {
        if (!disposed) {
          setAiReady(false);
          setAiReadinessMessage(
            coreEngineCopy.readinessCheckFailed.replace(
              '{message}',
              error instanceof Error ? error.message : String(error),
            ),
          );
        }
      } finally {
        if (!disposed) {
          setAiReadinessLoading(false);
        }
      }
    };

    void refreshAiReadiness();

    const onAiSettingsRefresh = () => {
      void refreshAiReadiness();
    };
    window.addEventListener('ai-status-refresh', onAiSettingsRefresh);

    return () => {
      disposed = true;
      window.removeEventListener('ai-status-refresh', onAiSettingsRefresh);
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    const setup = async () => {
      try {
        const unsubscribe = await eventClient.listenEngineEvents((payload) => {
          setEngineEvents((prev) => [payload, ...prev].slice(0, 40));
        });

        if (disposed) {
          unsubscribe();
          return;
        }
        unlisten = unsubscribe;
      } catch {
        // Keep tools usable even if event bridge is unavailable.
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const chosenInterface = selectedInterface.trim() ? selectedInterface : undefined;

  const aiOverlaySummary = useMemo(() => {
    const source = scanResult?.ai ?? insightsResult;
    return source?.ai_overlay ?? null;
  }, [scanResult?.ai, insightsResult]);

  const aiProviderLabel = useMemo(() => {
    const source = scanResult?.ai ?? insightsResult;
    if (!source?.ai_provider) {
      return null;
    }

    return source.ai_model ? `${source.ai_provider} (${source.ai_model})` : source.ai_provider;
  }, [scanResult?.ai, insightsResult]);

  const handleScanWithAi = async () => {
    setScanLoading(true);
    setScanError(null);
    try {
      const readiness = await runAiReadinessCheckWithCopy(coreEngineCopy);
      setAiReady(readiness.ready);
      setAiReadinessMessage(readiness.message);

      if (!readiness.ready) {
        setScanError(readiness.message);
        return;
      }

      const result = await tauriClient.scanNetworkWithAi(chosenInterface);
      setScanResult(result);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setScanLoading(false);
    }
  };

  const handleAiInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const result = await tauriClient.getAiInsights();
      setInsightsResult(result);
    } catch (error) {
      setInsightsError(error instanceof Error ? error.message : String(error));
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleLoadTest = async () => {
    setLoadLoading(true);
    setLoadError(null);
    try {
      const result = await tauriClient.runLoadTest(
        Math.max(1, Math.min(50, loadIterations)),
        Math.max(1, Math.min(16, loadConcurrency)),
        chosenInterface,
      );
      setLoadResult(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadLoading(false);
    }
  };

  const handleExportAiScanJson = async () => {
    if (!scanResult) {
      return;
    }

    if (!isTauri()) {
      setScanError(coreEngineCopy.tauriExportUnavailable);
      return;
    }

    setExportingAiJson(true);
    try {
      const json = await tauriClient.exportScanWithAiToJson(scanResult);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filePath = await save({
        defaultPath: `scan-with-ai-${timestamp}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) {
        return;
      }

      const encoded = new TextEncoder().encode(json);
      await writeFile(filePath, encoded);
    } catch (error) {
      setScanError(
        coreEngineCopy.exportFailed.replace(
          '{message}',
          error instanceof Error ? error.message : String(error),
        ),
      );
    } finally {
      setExportingAiJson(false);
    }
  };

  return {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    scanLoading,
    scanError,
    scanResult,
    insightsLoading,
    insightsError,
    insightsResult,
    loadIterations,
    setLoadIterations,
    loadConcurrency,
    setLoadConcurrency,
    loadLoading,
    loadError,
    loadResult,
    engineEvents,
    exportingAiJson,
    aiReadinessLoading,
    aiReady,
    aiReadinessMessage,
    aiOverlaySummary,
    aiProviderLabel,
    handleScanWithAi,
    handleAiInsights,
    handleLoadTest,
    handleExportAiScanJson,
  };
}
