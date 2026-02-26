import { useCallback, useEffect, useRef, useState } from 'react';

import {
  beginAiActionTelemetry,
  createAiActionTelemetry,
  finishAiActionTelemetry,
  type AiActionTelemetry,
} from '../lib/ai-action-telemetry';
import { eventClient } from '../lib/api/event-client';
import { tauriClient } from '../lib/api/tauri-client';
import type {
  DeviceSecurityAnalysis,
  DeviceTroubleshootAdvice,
  EngineEventType,
  HostInfo,
  NetworkReportSummary,
} from '../lib/api/types';
import { isTauri } from '../lib/runtime/is-tauri';

const DEVICE_ANALYSIS_COOLDOWN_MS = 20_000;
const ASSISTANT_EVENT_PATTERN =
  /^\[assistant\]\[(device_security|network_report|troubleshoot)\]\[([a-z0-9_]+)\]\s*(.+)$/i;

interface CachedDeviceAnalysis {
  capturedAt: number;
  analysis: DeviceSecurityAnalysis;
}

interface AnalyzeDeviceSecurityOptions {
  force?: boolean;
}

interface AssistantProgressEvent {
  operation: 'device_security' | 'network_report' | 'troubleshoot';
  stage: string;
  message: string;
}

export interface AssistantAiActionTelemetry {
  device_security: AiActionTelemetry;
  network_report: AiActionTelemetry;
  troubleshoot: AiActionTelemetry;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildDeviceAnalysisKey(device: HostInfo): string {
  const mac = device.mac?.trim().toLowerCase();
  const ip = device.ip?.trim();

  if (mac && ip) {
    return `${mac}|${ip}`;
  }
  if (mac) {
    return `mac:${mac}`;
  }
  if (ip) {
    return `ip:${ip}`;
  }

  return `host:${(device.hostname ?? 'unknown').trim().toLowerCase()}`;
}

function buildNetworkReportKey(hosts?: HostInfo[], subnet?: string): string {
  const subnetPart = subnet?.trim() || 'auto-subnet';
  if (!hosts || hosts.length === 0) {
    return `latest-scan|${subnetPart}`;
  }

  const hostParts = hosts
    .map((host) => buildDeviceAnalysisKey(host))
    .sort();

  return `provided-hosts|${subnetPart}|${hostParts.join(',')}`;
}

function buildTroubleshootKey(device: HostInfo, symptoms?: string[]): string {
  const devicePart = buildDeviceAnalysisKey(device);
  const symptomsPart = (symptoms ?? [])
    .map((symptom) => symptom.trim().toLowerCase())
    .filter((symptom) => symptom.length > 0)
    .sort()
    .join('|');

  return `${devicePart}|${symptomsPart || 'no-symptoms'}`;
}

function pruneExpiredAnalysisCache(
  cache: Map<string, CachedDeviceAnalysis>,
  nowMs: number,
) {
  for (const [key, value] of cache) {
    if (nowMs - value.capturedAt >= DEVICE_ANALYSIS_COOLDOWN_MS) {
      cache.delete(key);
    }
  }
}

function parseAssistantProgressEvent(event: EngineEventType): AssistantProgressEvent | null {
  if (event.kind !== 'info' && event.kind !== 'warn' && event.kind !== 'error') {
    return null;
  }

  const match = event.message.match(ASSISTANT_EVENT_PATTERN);
  if (!match) {
    return null;
  }

  const operation = match[1].toLowerCase() as AssistantProgressEvent['operation'];
  const stage = match[2].toLowerCase();
  const message = match[3].trim();

  return {
    operation,
    stage,
    message: message.length > 0 ? message : `${operation} ${stage}`,
  };
}

export function useAssistant() {
  const [isAnalyzingDevice, setIsAnalyzingDevice] = useState(false);
  const [deviceSecurityAnalysis, setDeviceSecurityAnalysis] =
    useState<DeviceSecurityAnalysis | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceProgressMessage, setDeviceProgressMessage] = useState<string | null>(null);
  const analyzeInFlightByKeyRef = useRef(
    new Map<string, Promise<DeviceSecurityAnalysis>>(),
  );
  const recentAnalysisByKeyRef = useRef(new Map<string, CachedDeviceAnalysis>());
  const activeAnalyzeCountRef = useRef(0);
  const reportInFlightByKeyRef = useRef(
    new Map<string, Promise<NetworkReportSummary>>(),
  );
  const activeReportCountRef = useRef(0);
  const troubleshootInFlightByKeyRef = useRef(
    new Map<string, Promise<DeviceTroubleshootAdvice>>(),
  );
  const activeTroubleshootCountRef = useRef(0);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [networkReport, setNetworkReport] = useState<NetworkReportSummary | null>(null);
  const [networkReportError, setNetworkReportError] = useState<string | null>(null);
  const [networkReportProgressMessage, setNetworkReportProgressMessage] =
    useState<string | null>(null);

  const [isTroubleshooting, setIsTroubleshooting] = useState(false);
  const [troubleshootAdvice, setTroubleshootAdvice] =
    useState<DeviceTroubleshootAdvice | null>(null);
  const [troubleshootError, setTroubleshootError] = useState<string | null>(null);
  const [troubleshootProgressMessage, setTroubleshootProgressMessage] =
    useState<string | null>(null);
  const [aiActionTelemetry, setAiActionTelemetry] = useState<AssistantAiActionTelemetry>({
    device_security: createAiActionTelemetry(),
    network_report: createAiActionTelemetry(),
    troubleshoot: createAiActionTelemetry(),
  });

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        const unsubscribe = await eventClient.listenEngineEvents((payload) => {
          const parsed = parseAssistantProgressEvent(payload);
          if (!parsed) {
            return;
          }

          switch (parsed.operation) {
            case 'device_security':
              setDeviceProgressMessage(parsed.message);
              break;
            case 'network_report':
              setNetworkReportProgressMessage(parsed.message);
              break;
            case 'troubleshoot':
              setTroubleshootProgressMessage(parsed.message);
              break;
            default:
              break;
          }
        });

        if (disposed) {
          unsubscribe();
          return;
        }
        unlisten = unsubscribe;
      } catch {
        // Keep assistant flows operational even if engine-event streaming is unavailable.
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

  const beginAnalyze = useCallback(() => {
    activeAnalyzeCountRef.current += 1;
    setIsAnalyzingDevice(true);
  }, []);

  const endAnalyze = useCallback(() => {
    activeAnalyzeCountRef.current = Math.max(0, activeAnalyzeCountRef.current - 1);
    if (activeAnalyzeCountRef.current === 0) {
      setIsAnalyzingDevice(false);
    }
  }, []);

  const beginReport = useCallback(() => {
    activeReportCountRef.current += 1;
    setIsGeneratingReport(true);
  }, []);

  const endReport = useCallback(() => {
    activeReportCountRef.current = Math.max(0, activeReportCountRef.current - 1);
    if (activeReportCountRef.current === 0) {
      setIsGeneratingReport(false);
    }
  }, []);

  const beginTroubleshoot = useCallback(() => {
    activeTroubleshootCountRef.current += 1;
    setIsTroubleshooting(true);
  }, []);

  const endTroubleshoot = useCallback(() => {
    activeTroubleshootCountRef.current = Math.max(0, activeTroubleshootCountRef.current - 1);
    if (activeTroubleshootCountRef.current === 0) {
      setIsTroubleshooting(false);
    }
  }, []);

  const beginLatencyTelemetry = useCallback(
    (action: keyof AssistantAiActionTelemetry, startedAtMs: number) => {
      setAiActionTelemetry((previous) => ({
        ...previous,
        [action]: beginAiActionTelemetry(previous[action], startedAtMs),
      }));
    },
    [],
  );

  const finishLatencyTelemetry = useCallback(
    (
      action: keyof AssistantAiActionTelemetry,
      startedAtMs: number,
      status: 'success' | 'error',
    ) => {
      const endedAtMs = Date.now();
      setAiActionTelemetry((previous) => ({
        ...previous,
        [action]: finishAiActionTelemetry(previous[action], startedAtMs, endedAtMs, status),
      }));
    },
    [],
  );

  const analyzeDeviceSecurity = useCallback(async (
    device: HostInfo,
    options?: AnalyzeDeviceSecurityOptions,
  ) => {
    setDeviceProgressMessage(null);
    const force = options?.force ?? false;
    const key = buildDeviceAnalysisKey(device);
    const nowMs = Date.now();

    pruneExpiredAnalysisCache(recentAnalysisByKeyRef.current, nowMs);

    if (!force) {
      const cached = recentAnalysisByKeyRef.current.get(key);
      if (cached && nowMs - cached.capturedAt < DEVICE_ANALYSIS_COOLDOWN_MS) {
        setDeviceError(null);
        setDeviceSecurityAnalysis(cached.analysis);
        return cached.analysis;
      }
    }

    const existingRequest = analyzeInFlightByKeyRef.current.get(key);
    if (existingRequest) {
      beginAnalyze();
      setDeviceError(null);

      try {
        const result = await existingRequest;
        setDeviceSecurityAnalysis(result);
        return result;
      } catch (error) {
        const message = getErrorMessage(error);
        setDeviceError(message);
        return null;
      } finally {
        endAnalyze();
      }
    }

    beginAnalyze();
    setDeviceError(null);
    const startedAtMs = Date.now();
    beginLatencyTelemetry('device_security', startedAtMs);
    const request = tauriClient.analyzeDeviceSecurity(device);
    analyzeInFlightByKeyRef.current.set(key, request);

    try {
      const result = await request;
      recentAnalysisByKeyRef.current.set(key, {
        capturedAt: Date.now(),
        analysis: result,
      });
      setDeviceSecurityAnalysis(result);
      finishLatencyTelemetry('device_security', startedAtMs, 'success');
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setDeviceError(message);
      finishLatencyTelemetry('device_security', startedAtMs, 'error');
      return null;
    } finally {
      if (analyzeInFlightByKeyRef.current.get(key) === request) {
        analyzeInFlightByKeyRef.current.delete(key);
      }
      endAnalyze();
    }
  }, [beginAnalyze, beginLatencyTelemetry, endAnalyze, finishLatencyTelemetry]);

  const generateNetworkReport = useCallback(async (hosts?: HostInfo[], subnet?: string) => {
    const key = buildNetworkReportKey(hosts, subnet);
    const existingRequest = reportInFlightByKeyRef.current.get(key);
    if (existingRequest) {
      beginReport();
      setNetworkReportError(null);
      try {
        const result = await existingRequest;
        setNetworkReport(result);
        return result;
      } catch (error) {
        const message = getErrorMessage(error);
        setNetworkReportError(message);
        return null;
      } finally {
        endReport();
      }
    }

    beginReport();
    setNetworkReportError(null);
    setNetworkReportProgressMessage(null);
    const startedAtMs = Date.now();
    beginLatencyTelemetry('network_report', startedAtMs);
    const request = tauriClient.generateNetworkReport(hosts, subnet);
    reportInFlightByKeyRef.current.set(key, request);

    try {
      const result = await request;
      setNetworkReport(result);
      finishLatencyTelemetry('network_report', startedAtMs, 'success');
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setNetworkReportError(message);
      finishLatencyTelemetry('network_report', startedAtMs, 'error');
      return null;
    } finally {
      if (reportInFlightByKeyRef.current.get(key) === request) {
        reportInFlightByKeyRef.current.delete(key);
      }
      endReport();
    }
  }, [beginLatencyTelemetry, beginReport, endReport, finishLatencyTelemetry]);

  const troubleshootDevice = useCallback(async (device: HostInfo, symptoms?: string[]) => {
    const key = buildTroubleshootKey(device, symptoms);
    const existingRequest = troubleshootInFlightByKeyRef.current.get(key);
    if (existingRequest) {
      beginTroubleshoot();
      setTroubleshootError(null);
      try {
        const result = await existingRequest;
        setTroubleshootAdvice(result);
        return result;
      } catch (error) {
        const message = getErrorMessage(error);
        setTroubleshootError(message);
        return null;
      } finally {
        endTroubleshoot();
      }
    }

    beginTroubleshoot();
    setTroubleshootError(null);
    setTroubleshootProgressMessage(null);
    const startedAtMs = Date.now();
    beginLatencyTelemetry('troubleshoot', startedAtMs);
    const request = tauriClient.troubleshootDevice(device, symptoms);
    troubleshootInFlightByKeyRef.current.set(key, request);

    try {
      const result = await request;
      setTroubleshootAdvice(result);
      finishLatencyTelemetry('troubleshoot', startedAtMs, 'success');
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setTroubleshootError(message);
      finishLatencyTelemetry('troubleshoot', startedAtMs, 'error');
      return null;
    } finally {
      if (troubleshootInFlightByKeyRef.current.get(key) === request) {
        troubleshootInFlightByKeyRef.current.delete(key);
      }
      endTroubleshoot();
    }
  }, [beginLatencyTelemetry, beginTroubleshoot, endTroubleshoot, finishLatencyTelemetry]);

  const clearDeviceAnalysis = useCallback(() => {
    setDeviceSecurityAnalysis(null);
    setDeviceError(null);
  }, []);

  const clearNetworkReport = useCallback(() => {
    setNetworkReport(null);
    setNetworkReportError(null);
  }, []);

  const clearTroubleshootAdvice = useCallback(() => {
    setTroubleshootAdvice(null);
    setTroubleshootError(null);
  }, []);

  return {
    isAnalyzingDevice,
    deviceSecurityAnalysis,
    deviceError,
    deviceProgressMessage,
    analyzeDeviceSecurity,
    clearDeviceAnalysis,

    isGeneratingReport,
    networkReport,
    networkReportError,
    networkReportProgressMessage,
    generateNetworkReport,
    clearNetworkReport,

    isTroubleshooting,
    troubleshootAdvice,
    troubleshootError,
    troubleshootProgressMessage,
    troubleshootDevice,
    clearTroubleshootAdvice,
    aiActionTelemetry,
  };
}
