import { useCallback, useState } from 'react';

import { tauriClient } from '../lib/api/tauri-client';
import type {
  DeviceSecurityAnalysis,
  DeviceTroubleshootAdvice,
  HostInfo,
  NetworkReportSummary,
} from '../lib/api/types';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useAssistant() {
  const [isAnalyzingDevice, setIsAnalyzingDevice] = useState(false);
  const [deviceSecurityAnalysis, setDeviceSecurityAnalysis] =
    useState<DeviceSecurityAnalysis | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [networkReport, setNetworkReport] = useState<NetworkReportSummary | null>(null);
  const [networkReportError, setNetworkReportError] = useState<string | null>(null);

  const [isTroubleshooting, setIsTroubleshooting] = useState(false);
  const [troubleshootAdvice, setTroubleshootAdvice] =
    useState<DeviceTroubleshootAdvice | null>(null);
  const [troubleshootError, setTroubleshootError] = useState<string | null>(null);

  const analyzeDeviceSecurity = useCallback(async (device: HostInfo) => {
    setIsAnalyzingDevice(true);
    setDeviceError(null);

    try {
      const result = await tauriClient.analyzeDeviceSecurity(device);
      setDeviceSecurityAnalysis(result);
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setDeviceError(message);
      return null;
    } finally {
      setIsAnalyzingDevice(false);
    }
  }, []);

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
