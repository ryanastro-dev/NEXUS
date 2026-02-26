import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiCheckReport, AiSettings } from '../lib/api/types';
import { __resetAiStatusForTests, useAiStatus } from './useAiStatus';

const aiStatusMocks = vi.hoisted(() => ({
  getAiSettings: vi.fn<() => Promise<AiSettings>>(),
  runAiCheck: vi.fn<() => Promise<AiCheckReport>>(),
}));

vi.mock('../lib/api/tauri-client', () => ({
  tauriClient: {
    getAiSettings: aiStatusMocks.getAiSettings,
    runAiCheck: aiStatusMocks.runAiCheck,
  },
}));

function sampleSettings(): AiSettings {
  return {
    enabled: true,
    mode: 'local',
    timeout_ms: 20000,
    ollama_endpoint: 'http://127.0.0.1:11434',
    ollama_model: 'qwen3:8b',
    gemini_endpoint: 'https://generativelanguage.googleapis.com',
    gemini_model: 'gemini-3.1-pro',
    gemini_api_key: null,
    cloud_allow_sensitive: false,
  };
}

function sampleReport(): AiCheckReport {
  return {
    ai_enabled: true,
    mode: 'local',
    timeout_ms: 20000,
    local: {
      provider: 'ollama',
      configured: true,
      reachable: true,
      model: 'qwen3:8b',
      model_available: true,
      latency_ms: 10,
      error: null,
    },
    cloud: null,
    overall_ok: true,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAiStatus', () => {
  beforeEach(() => {
    __resetAiStatusForTests();
    aiStatusMocks.getAiSettings.mockReset();
    aiStatusMocks.runAiCheck.mockReset();
    aiStatusMocks.getAiSettings.mockResolvedValue(sampleSettings());
    aiStatusMocks.runAiCheck.mockResolvedValue(sampleReport());
  });

  afterEach(() => {
    __resetAiStatusForTests();
  });

  it('shares a single startup poll across multiple subscribers', async () => {
    const deferred = createDeferred<AiCheckReport>();
    aiStatusMocks.runAiCheck.mockReturnValueOnce(deferred.promise);

    const hookA = renderHook(() => useAiStatus());
    const hookB = renderHook(() => useAiStatus());

    expect(aiStatusMocks.getAiSettings).toHaveBeenCalledTimes(1);
    expect(aiStatusMocks.runAiCheck).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(sampleReport());
      await deferred.promise;
    });

    await waitFor(() => {
      expect(hookA.result.current.loading).toBe(false);
      expect(hookB.result.current.loading).toBe(false);
    });

    hookA.unmount();
    hookB.unmount();
  });

  it('deduplicates concurrent manual refresh requests', async () => {
    const hook = renderHook(() => useAiStatus());

    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false);
    });

    aiStatusMocks.getAiSettings.mockClear();
    aiStatusMocks.runAiCheck.mockClear();

    const deferred = createDeferred<AiCheckReport>();
    aiStatusMocks.getAiSettings.mockResolvedValue(sampleSettings());
    aiStatusMocks.runAiCheck.mockReturnValueOnce(deferred.promise);

    let firstRefresh: Promise<void> = Promise.resolve();
    let secondRefresh: Promise<void> = Promise.resolve();

    await act(async () => {
      firstRefresh = hook.result.current.refresh();
      secondRefresh = hook.result.current.refresh();
    });

    expect(aiStatusMocks.getAiSettings).toHaveBeenCalledTimes(1);
    expect(aiStatusMocks.runAiCheck).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(sampleReport());
      await Promise.all([firstRefresh, secondRefresh]);
    });

    hook.unmount();
  });
});
