import { useEffect, useMemo } from 'react';
import { create } from 'zustand';

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
const AI_STATUS_REFRESH_EVENT = 'ai-status-refresh';

interface AiStatusStoreState {
  loading: boolean;
  settings: AiSettings | null;
  report: AiCheckReport | null;
  error: string | null;
  refresh: () => Promise<void>;
}

let refreshInFlight: Promise<void> | null = null;
let activeSubscribers = 0;
let refreshTimer: number | null = null;
let refreshEventHandler: (() => void) | null = null;

const useAiStatusStore = create<AiStatusStoreState>((set) => ({
  loading: true,
  settings: null,
  report: null,
  error: null,
  refresh: async () => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    const run = async () => {
      set({ loading: true, error: null });

      try {
        const [nextSettings, nextReport] = await Promise.all([
          tauriClient.getAiSettings(),
          tauriClient.runAiCheck(),
        ]);

        set({
          settings: nextSettings,
          report: nextReport,
          error: null,
        });
      } catch (refreshError) {
        set({
          error: refreshError instanceof Error ? refreshError.message : String(refreshError),
        });
      } finally {
        set({ loading: false });
      }
    };

    refreshInFlight = run().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  },
}));

function startGlobalPolling(refresh: () => Promise<void>) {
  if (typeof window === 'undefined') {
    return;
  }

  if (refreshTimer !== null) {
    return;
  }

  void refresh();
  refreshTimer = window.setInterval(() => {
    void refresh();
  }, REFRESH_MS);

  refreshEventHandler = () => {
    void refresh();
  };
  window.addEventListener(AI_STATUS_REFRESH_EVENT, refreshEventHandler);
}

function stopGlobalPolling() {
  if (typeof window === 'undefined') {
    return;
  }

  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (refreshEventHandler) {
    window.removeEventListener(AI_STATUS_REFRESH_EVENT, refreshEventHandler);
    refreshEventHandler = null;
  }
}

export function __resetAiStatusForTests() {
  stopGlobalPolling();
  activeSubscribers = 0;
  refreshInFlight = null;
  useAiStatusStore.setState({
    loading: true,
    settings: null,
    report: null,
    error: null,
  });
}

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
  const loading = useAiStatusStore((state) => state.loading);
  const settings = useAiStatusStore((state) => state.settings);
  const report = useAiStatusStore((state) => state.report);
  const error = useAiStatusStore((state) => state.error);
  const refresh = useAiStatusStore((state) => state.refresh);

  useEffect(() => {
    activeSubscribers += 1;
    startGlobalPolling(refresh);

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      if (activeSubscribers === 0) {
        stopGlobalPolling();
      }
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
