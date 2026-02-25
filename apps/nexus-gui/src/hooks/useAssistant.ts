import { useCallback, useRef, useState } from 'react';

import { tauriClient } from '../lib/api/tauri-client';
import type {
  DeviceSecurityAnalysis,
  DeviceTroubleshootAdvice,
  HostInfo,
  NetworkReportSummary,
} from '../lib/api/types';

const DEVICE_ANALYSIS_COOLDOWN_MS = 20_000;

interface CachedDeviceAnalysis {
  capturedAt: number;
  analysis: DeviceSecurityAnalysis;
}

interface AnalyzeDeviceSecurityOptions {
  force?: boolean;
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

export function useAssistant() {
  const [isAnalyzingDevice, setIsAnalyzingDevice] = useState(false);
  const [deviceSecurityAnalysis, setDeviceSecurityAnalysis] =
    useState<DeviceSecurityAnalysis | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const analyzeInFlightByKeyRef = useRef(
    new Map<string, Promise<DeviceSecurityAnalysis>>(),
  );
  const recentAnalysisByKeyRef = useRef(new Map<string, CachedDeviceAnalysis>());
  const activeAnalyzeCountRef = useRef(0);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [networkReport, setNetworkReport] = useState<NetworkReportSummary | null>(null);
  const [networkReportError, setNetworkReportError] = useState<string | null>(null);

  const [isTroubleshooting, setIsTroubleshooting] = useState(false);
  const [troubleshootAdvice, setTroubleshootAdvice] =
    useState<DeviceTroubleshootAdvice | null>(null);
  const [troubleshootError, setTroubleshootError] = useState<string | null>(null);

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

  const analyzeDeviceSecurity = useCallback(async (
    device: HostInfo,
    options?: AnalyzeDeviceSecurityOptions,
  ) => {
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
    const request = tauriClient.analyzeDeviceSecurity(device);
    analyzeInFlightByKeyRef.current.set(key, request);

    try {
      const result = await request;
      recentAnalysisByKeyRef.current.set(key, {
        capturedAt: Date.now(),
        analysis: result,
      });
      setDeviceSecurityAnalysis(result);
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setDeviceError(message);
      return null;
    } finally {
      if (analyzeInFlightByKeyRef.current.get(key) === request) {
        analyzeInFlightByKeyRef.current.delete(key);
      }
      endAnalyze();
    }
  }, [beginAnalyze, endAnalyze]);

  const generateNetworkReport = useCallback(async (hosts?: HostInfo[], subnet?: string) => {
    setIsGeneratingReport(true);
    setNetworkReportError(null);

    try {
      const result = await tauriClient.generateNetworkReport(hosts, subnet);
      setNetworkReport(result);
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setNetworkReportError(message);
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  const troubleshootDevice = useCallback(async (device: HostInfo, symptoms?: string[]) => {
    setIsTroubleshooting(true);
    setTroubleshootError(null);

    try {
      const result = await tauriClient.troubleshootDevice(device, symptoms);
      setTroubleshootAdvice(result);
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setTroubleshootError(message);
      return null;
    } finally {
      setIsTroubleshooting(false);
    }
  }, []);

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
    analyzeDeviceSecurity,
    clearDeviceAnalysis,

    isGeneratingReport,
    networkReport,
    networkReportError,
    generateNetworkReport,
    clearNetworkReport,

    isTroubleshooting,
    troubleshootAdvice,
    troubleshootError,
    troubleshootDevice,
    clearTroubleshootAdvice,
  };
}
