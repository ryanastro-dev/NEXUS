import type { TelemetryEvent, TelemetrySeries } from '../../lib/api/types';

import type { DashboardPayload } from './types';

const MAX_TELEMETRY_POINTS = 40;

function appendTelemetryPoint(
  series: TelemetrySeries | null,
  event: TelemetryEvent,
  maxPoints = MAX_TELEMETRY_POINTS,
): TelemetrySeries {
  const point = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    captured_at: new Date().toISOString(),
    metric_key: event.metric_key,
    metric_value: event.metric_value,
    label: event.label ?? null,
  };

  return {
    metric_key: event.metric_key,
    points: [...(series?.points ?? []), point].slice(-maxPoints),
  };
}

export function applyTelemetryEvent(
  payload: DashboardPayload,
  event: TelemetryEvent,
): DashboardPayload {
  if (event.metric_key === 'scan.hosts_found') {
    return {
      ...payload,
      telemetryHosts: appendTelemetryPoint(payload.telemetryHosts, event),
    };
  }

  if (event.metric_key === 'scan.duration_ms') {
    return {
      ...payload,
      telemetryDuration: appendTelemetryPoint(payload.telemetryDuration, event),
    };
  }

  if (event.metric_key === 'scan.avg_latency_ms') {
    return {
      ...payload,
      telemetryLatency: appendTelemetryPoint(payload.telemetryLatency, event),
    };
  }

  if (event.metric_key === 'scan.throughput_hosts_per_sec') {
    return {
      ...payload,
      telemetryThroughput: appendTelemetryPoint(payload.telemetryThroughput, event),
    };
  }

  return payload;
}
