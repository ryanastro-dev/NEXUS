import { useCallback, useEffect, useMemo, useState } from 'react';

import { tauriClient } from '../lib/api/tauri-client';
import type { AiCheckReport, AiMode, AiSettings } from '../lib/api/types';

export interface AiStatusSnapshot {
  loading: boolean;
  settings: AiSettings | null;
  report: AiCheckReport | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface AiPillState {
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
  detail: string;
}

const REFRESH_MS = 180_000;

function normalizeMode(mode: AiMode | undefined): string {
  switch (mode) {
    case 'local':
      return 'Local';
    case 'cloud':
      return 'Cloud';
    case 'hybrid_auto':
      return 'Hybrid';
    case 'disabled':
    default:
      return 'Disabled';
  }
}

export function deriveAiPillState(snapshot: {
  loading: boolean;
  settings: AiSettings | null;
  report: AiCheckReport | null;
  error: string | null;
}): AiPillState {
  if (snapshot.loading) {
    return {
      tone: 'warning',
      label: 'AI Checking',
      detail: 'Running provider diagnostics',
    };
  }

  if (!snapshot.settings?.enabled || snapshot.settings.mode === 'disabled') {
    return {
      tone: 'neutral',
      label: 'AI Disabled',
      detail: 'Enable AI in runtime config',
    };
  }

  if (snapshot.error) {
    return {
      tone: 'danger',
      label: 'AI Error',
      detail: snapshot.error,
    };
  }

  if (snapshot.report?.overall_ok) {
    return {
      tone: 'success',
      label: `AI ${normalizeMode(snapshot.report.mode)} Ready`,
      detail: 'Provider online and model reachable',
    };
  }

  if (snapshot.report) {
    return {
      tone: 'danger',
      label: `AI ${normalizeMode(snapshot.report.mode)} Not Ready`,
      detail: 'Check provider connectivity or model config',
    };
  }

  return {
    tone: 'neutral',
    label: `AI ${normalizeMode(snapshot.settings.mode)} Pending`,
    detail: 'Run diagnostics to verify readiness',
  };
}

export function useAiStatus(): AiStatusSnapshot {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [report, setReport] = useState<AiCheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextSettings, nextReport] = await Promise.all([
        tauriClient.getAiSettings(),
        tauriClient.runAiCheck(),
      ]);

      setSettings(nextSettings);
      setReport(nextReport);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);
    const onRefreshRequested = () => {
      void refresh();
    };

    window.addEventListener('ai-status-refresh', onRefreshRequested);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('ai-status-refresh', onRefreshRequested);
    };
  }, [refresh]);

  const snapshot = useMemo(
    () => ({
      loading,
      settings,
      report,
      error,
      refresh,
    }),
    [error, loading, refresh, report, settings],
  );

  return snapshot;
}
