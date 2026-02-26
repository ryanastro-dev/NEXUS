import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import type { HostInfo } from '../../hooks/useScan';
import { useAssistant } from '../../hooks/useAssistant';
import { useAiStatus } from '../../hooks/useAiStatus';
import { useLanguage } from '../../hooks/useLanguage';
import { SETTINGS_UPDATED_EVENT } from '../../lib/events/settings-sync';
import { useTheme } from '../../hooks/useTheme';
import {
  DeviceModalHeader,
  DeviceNetworkSection,
  DevicePersistedSection,
  DevicePortsSection,
  DeviceSecuritySection,
  DeviceSummaryCards,
  DeviceSystemSection,
  usePersistedDevice,
} from './detail-modal';

interface DeviceDetailModalProps {
  device: HostInfo | null;
  onClose: () => void;
}

const SETTINGS_STORAGE_KEY = 'netmapper-settings';
const AUTO_AI_ON_OPEN_KEY = 'autoAiOnDeviceOpen';
const LEGACY_AUTO_AI_ON_OPEN_KEY = 'device-drilldown-auto-ai-on-open';

function readAutoAiOnOpenPreference(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.[AUTO_AI_ON_OPEN_KEY] === 'boolean') {
        return parsed[AUTO_AI_ON_OPEN_KEY];
      }
    }
  } catch {
    // Ignore malformed settings and use fallback defaults.
  }

  const legacyRaw = localStorage.getItem(LEGACY_AUTO_AI_ON_OPEN_KEY);
  if (legacyRaw === 'false') {
    return false;
  }
  return true;
}

export default function DeviceDetailModal({ device, onClose }: DeviceDetailModalProps) {
  const { theme } = useTheme();
  const { copy } = useLanguage();
  const modalCopy = copy.devices.modal;
  const isDark = theme === 'dark';
  const { settings } = useAiStatus();
  const isAiDisabled = !settings?.enabled || settings?.mode === 'disabled';
  const persistedDevice = usePersistedDevice(device);
  const autoTriggeredKeyRef = useRef<string | null>(null);
  const [autoAnalyzeOnOpen, setAutoAnalyzeOnOpen] = useState<boolean>(
    readAutoAiOnOpenPreference,
  );
  const {
    isAnalyzingDevice,
    deviceSecurityAnalysis,
    deviceError,
    deviceProgressMessage,
    aiActionTelemetry,
    analyzeDeviceSecurity,
    clearDeviceAnalysis,
  } = useAssistant();

  useEffect(() => {
    clearDeviceAnalysis();
    autoTriggeredKeyRef.current = null;
  }, [device?.mac, clearDeviceAnalysis]);

  const isOnline = device?.response_time_ms !== null && device?.response_time_ms !== undefined;
  const deviceKey = device ? `${device.mac}|${device.ip}` : null;

  useEffect(() => {
    const refresh = () => {
      setAutoAnalyzeOnOpen(readAutoAiOnOpenPreference());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== SETTINGS_STORAGE_KEY) {
        return;
      }
      refresh();
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!device || !autoAnalyzeOnOpen || isAiDisabled || isAnalyzingDevice || !deviceKey) {
      return;
    }

    if (autoTriggeredKeyRef.current === deviceKey) {
      return;
    }

    autoTriggeredKeyRef.current = deviceKey;
    void analyzeDeviceSecurity(device);
  }, [
    analyzeDeviceSecurity,
    autoAnalyzeOnOpen,
    device,
    deviceKey,
    isAiDisabled,
    isAnalyzingDevice,
  ]);

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        className={clsx('absolute inset-0', isDark ? 'bg-black/80' : 'bg-black/40')}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      <motion.aside
        className={clsx(
          'relative z-10 flex h-full w-full max-w-[640px] flex-col overflow-hidden border-l shadow-2xl',
          isDark ? 'border-white/10 bg-[#121722]' : 'border-slate-200 bg-white',
        )}
        initial={{ opacity: 0.9, x: 64 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 35 }}
      >
        <DeviceModalHeader
          isDark={isDark}
          isOnline={isOnline}
          title={device.hostname || device.ip}
          subtitle={device.device_type}
          isAiDisabled={isAiDisabled}
          onAnalyzeSecurity={() => {
            void analyzeDeviceSecurity(device, { force: true });
          }}
          isAnalyzingSecurity={isAnalyzingDevice}
          onClose={onClose}
        />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <DeviceSecuritySection
            device={device}
            isDark={isDark}
            analysis={deviceSecurityAnalysis}
            isAnalyzing={isAnalyzingDevice}
            analysisProgressMessage={deviceProgressMessage}
            error={deviceError}
            aiLatencyTelemetry={aiActionTelemetry.device_security}
          />

          <DeviceSummaryCards isDark={isDark} isOnline={isOnline} riskScore={device.risk_score} />

          <DeviceNetworkSection device={device} isDark={isDark} />

          {persistedDevice && <DevicePersistedSection persistedDevice={persistedDevice} isDark={isDark} />}

          <DevicePortsSection openPorts={device.open_ports ?? []} isDark={isDark} />

          <DeviceSystemSection
            systemDescription={device.system_description}
            uptimeSeconds={device.uptime_seconds}
            isDark={isDark}
          />
        </div>

        <div
          className={clsx(
            'flex justify-end border-t p-4',
            isDark ? 'border-white/10 bg-[#0f1419]' : 'border-slate-200 bg-slate-50',
          )}
        >
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {modalCopy.close}
          </button>
        </div>
      </motion.aside>
    </div>
  );
}
