export type AiActionTelemetryStatus = 'idle' | 'running' | 'success' | 'error';

export interface AiActionTelemetry {
  start_ms: number | null;
  end_ms: number | null;
  duration_ms: number | null;
  avg_duration_ms: number | null;
  samples: number;
  status: AiActionTelemetryStatus;
}

export function createAiActionTelemetry(): AiActionTelemetry {
  return {
    start_ms: null,
    end_ms: null,
    duration_ms: null,
    avg_duration_ms: null,
    samples: 0,
    status: 'idle',
  };
}

export function beginAiActionTelemetry(
  previous: AiActionTelemetry,
  startedAtMs: number,
): AiActionTelemetry {
  return {
    ...previous,
    start_ms: startedAtMs,
    end_ms: null,
    duration_ms: null,
    status: 'running',
  };
}

export function finishAiActionTelemetry(
  previous: AiActionTelemetry,
  startedAtMs: number,
  endedAtMs: number,
  status: Extract<AiActionTelemetryStatus, 'success' | 'error'>,
): AiActionTelemetry {
  const durationMs = Math.max(0, endedAtMs - startedAtMs);
  const samples = previous.samples + 1;
  const avgDurationMs =
    previous.avg_duration_ms === null
      ? durationMs
      : (previous.avg_duration_ms * previous.samples + durationMs) / samples;

  return {
    ...previous,
    start_ms: startedAtMs,
    end_ms: endedAtMs,
    duration_ms: durationMs,
    avg_duration_ms: Number(avgDurationMs.toFixed(1)),
    samples,
    status,
  };
}
