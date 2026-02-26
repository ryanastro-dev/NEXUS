import { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { tauriClient } from '../lib/api/tauri-client';
import type {
  AiCheckReport,
  AiMode,
  AiSettings,
  RuntimeDiagnostics,
  VulnerabilityDbStatus,
} from '../lib/api/types';
import { toast } from '../components/common/Toast';
import {
  AiEngineSection,
  ConfigurationSection,
  DEFAULT_SETTINGS,
  DemoModeSection,
  loadSettings,
  MonitoringSection,
  PANEL,
  parseTcpPorts,
  saveSettingsToStorage,
  SettingsActions,
  SettingsHero,
  SnmpSection,
  VULN_DB_SYNC_KEY,
  VulnerabilityDbSection,
} from './settings-page';



interface SettingsGroupLabelProps {
  title: string;
  badgeLabel: string;
  description?: string;
  tone: 'runtime' | 'manual' | 'experimental';
}

function SettingsGroupLabel({ title, badgeLabel, description, tone }: SettingsGroupLabelProps) {
  const toneStyles =
    tone === 'runtime'
      ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300'
      : tone === 'manual'
        ? 'border-cyan-300/60 bg-cyan-100/70 text-cyan-700 dark:border-cyan-500/35 dark:bg-cyan-500/10 dark:text-cyan-300'
        : 'border-amber-300/60 bg-amber-100/70 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300';

  return (
    <div className="px-1 pb-0.5 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-secondary">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-text-muted">{description}</p> : null}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${toneStyles}`}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}

export default function Settings() {
  const { copy } = useLanguage();
  const settingsCopy = copy.settings;
  const monitoring = useMonitoring();
  const [snmpEnabled, setSnmpEnabled] = useState(DEFAULT_SETTINGS.snmpEnabled);
  const [snmpCommunity, setSnmpCommunity] = useState(DEFAULT_SETTINGS.snmpCommunity);
  const [scanInterval, setScanInterval] = useState(DEFAULT_SETTINGS.scanInterval);
  const [tcpPorts, setTcpPorts] = useState(DEFAULT_SETTINGS.tcpPorts);
  const [preferredInterface, setPreferredInterface] = useState(DEFAULT_SETTINGS.preferredInterface);
  const [monitoringEnabled, setMonitoringEnabled] = useState(DEFAULT_SETTINGS.monitoringEnabled);
  const [monitoringInterval, setMonitoringInterval] = useState(DEFAULT_SETTINGS.monitoringInterval);

  const [demoMode, setDemoMode] = useState(localStorage.getItem('demo-mode-enabled') === 'true');
  const [autoUpdateVulnDB, setAutoUpdateVulnDB] = useState(false);
  const [syncRange, setSyncRange] = useState('latest_1000');
  const [vulnDBExpanded, setVulnDBExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [scanSchemaVersion, setScanSchemaVersion] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiEnabled, setAiEnabled] = useState(DEFAULT_SETTINGS.aiEnabled);
  const [aiMode, setAiMode] = useState<AiMode>(DEFAULT_SETTINGS.aiMode);
  const [autoAiOnDeviceOpen, setAutoAiOnDeviceOpen] = useState(
    DEFAULT_SETTINGS.autoAiOnDeviceOpen,
  );
  const [aiTimeoutMs, setAiTimeoutMs] = useState(DEFAULT_SETTINGS.aiTimeoutMs);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(DEFAULT_SETTINGS.ollamaEndpoint);
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_SETTINGS.ollamaModel);
  const [geminiEndpoint, setGeminiEndpoint] = useState(DEFAULT_SETTINGS.geminiEndpoint);
  const [geminiModel, setGeminiModel] = useState(DEFAULT_SETTINGS.geminiModel);
  const [geminiApiKey, setGeminiApiKey] = useState(DEFAULT_SETTINGS.geminiApiKey);
  const [cloudAllowSensitive, setCloudAllowSensitive] = useState(
    DEFAULT_SETTINGS.cloudAllowSensitive,
  );
  const [aiApplyLoading, setAiApplyLoading] = useState(false);
  const [aiCheckReport, setAiCheckReport] = useState<AiCheckReport | null>(null);
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [vulnDbStatus, setVulnDbStatus] = useState<VulnerabilityDbStatus | null>(null);
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [vulnDbLastSync, setVulnDbLastSync] = useState<string | null>(
    localStorage.getItem(VULN_DB_SYNC_KEY),
  );

  const embeddedCVEs = vulnDbStatus?.embedded_cve_total ?? 0;
  const downloadedCVEs = Math.max(
    (vulnDbStatus?.cve_total ?? 0) - (vulnDbStatus?.embedded_cve_total ?? 0),
    0,
  );
  const lastUpdate = vulnDbLastSync ?? vulnDbStatus?.last_published_date ?? null;

  useEffect(() => {
    const settings = loadSettings();
    setSnmpEnabled(settings.snmpEnabled);
    setSnmpCommunity(settings.snmpCommunity);
    setScanInterval(settings.scanInterval);
    setTcpPorts(settings.tcpPorts);
    setPreferredInterface(settings.preferredInterface || '');
    setMonitoringEnabled(settings.monitoringEnabled || false);
    setMonitoringInterval(settings.monitoringInterval || 60);
    setAiEnabled(settings.aiEnabled === true);
    setAiMode(settings.aiEnabled ? settings.aiMode : 'disabled');
    setAutoAiOnDeviceOpen(settings.autoAiOnDeviceOpen !== false);
    setAiTimeoutMs(settings.aiTimeoutMs || DEFAULT_SETTINGS.aiTimeoutMs);
    setOllamaEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
    setOllamaModel(settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel);
    setGeminiEndpoint(settings.geminiEndpoint || DEFAULT_SETTINGS.geminiEndpoint);
    setGeminiModel(settings.geminiModel || DEFAULT_SETTINGS.geminiModel);
    setGeminiApiKey(settings.geminiApiKey || '');
    setCloudAllowSensitive(settings.cloudAllowSensitive === true);

    tauriClient.getInterfaces().then(setInterfaces).catch(() => setInterfaces([]));
    tauriClient.getDatabasePath().then(setDbPath).catch(() => setDbPath(null));
    tauriClient
      .getScanResultSchema()
      .then((schema) => {
        const version = schema?.schema_version;
        setScanSchemaVersion(typeof version === 'string' ? version : null);
      })
      .catch(() => setScanSchemaVersion(null));
    tauriClient
      .getAiSettings()
      .then((runtimeAiSettings) => {
        setAiSettings(runtimeAiSettings);
        setAiEnabled(runtimeAiSettings.enabled);
        setAiMode(runtimeAiSettings.mode);
        setAiTimeoutMs(runtimeAiSettings.timeout_ms);
        setOllamaEndpoint(runtimeAiSettings.ollama_endpoint);
        setOllamaModel(runtimeAiSettings.ollama_model);
        setGeminiEndpoint(runtimeAiSettings.gemini_endpoint);
        setGeminiModel(runtimeAiSettings.gemini_model);
        setGeminiApiKey(runtimeAiSettings.gemini_api_key ?? '');
        setCloudAllowSensitive(runtimeAiSettings.cloud_allow_sensitive);
      })
      .catch(() => setAiSettings(null));
    tauriClient
      .getVulnerabilityDbStatus()
      .then(setVulnDbStatus)
      .catch(() => setVulnDbStatus(null));
    tauriClient
      .getRuntimeDiagnostics()
      .then(setRuntimeDiagnostics)
      .catch(() => setRuntimeDiagnostics(null));
  }, []);

  useEffect(() => {
    const current = {
      snmpEnabled,
      snmpCommunity,
      scanInterval,
      tcpPorts,
      preferredInterface,
      monitoringEnabled,
      monitoringInterval,
      aiEnabled,
      aiMode,
      autoAiOnDeviceOpen,
      aiTimeoutMs,
      ollamaEndpoint,
      ollamaModel,
      geminiEndpoint,
      geminiModel,
      geminiApiKey,
      cloudAllowSensitive,
    };
    const saved = loadSettings();
    const changed = JSON.stringify(current) !== JSON.stringify(saved);
    setHasChanges(changed);
  }, [
    snmpEnabled,
    snmpCommunity,
    scanInterval,
    tcpPorts,
    preferredInterface,
    monitoringEnabled,
    monitoringInterval,
    aiEnabled,
    aiMode,
    autoAiOnDeviceOpen,
    aiTimeoutMs,
    ollamaEndpoint,
    ollamaModel,
    geminiEndpoint,
    geminiModel,
    geminiApiKey,
    cloudAllowSensitive,
  ]);

  const aiHasChanges =
    aiSettings === null ||
    aiSettings.enabled !== aiEnabled ||
    aiSettings.mode !== (aiEnabled ? aiMode : 'disabled') ||
    aiSettings.timeout_ms !== aiTimeoutMs ||
    aiSettings.ollama_endpoint !== ollamaEndpoint ||
    aiSettings.ollama_model !== ollamaModel ||
    aiSettings.gemini_endpoint !== geminiEndpoint ||
    aiSettings.gemini_model !== geminiModel ||
    (aiSettings.gemini_api_key ?? '') !== geminiApiKey ||
    aiSettings.cloud_allow_sensitive !== cloudAllowSensitive;

  const applyAiRuntimeConfig = async () => {
    await tauriClient.applyAiRuntimeSettings({
      enabled: aiEnabled,
      mode: aiEnabled ? aiMode : 'disabled',
      timeout_ms: Number.isFinite(aiTimeoutMs) ? aiTimeoutMs : DEFAULT_SETTINGS.aiTimeoutMs,
      ollama_endpoint: ollamaEndpoint.trim() || DEFAULT_SETTINGS.ollamaEndpoint,
      ollama_model: ollamaModel.trim() || DEFAULT_SETTINGS.ollamaModel,
      gemini_endpoint: geminiEndpoint.trim() || DEFAULT_SETTINGS.geminiEndpoint,
      gemini_model: geminiModel.trim() || DEFAULT_SETTINGS.geminiModel,
      gemini_api_key: geminiApiKey.trim() ? geminiApiKey.trim() : null,
      cloud_allow_sensitive: cloudAllowSensitive,
    });
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const normalizedMonitoringInterval =
      Number.isFinite(monitoringInterval) && monitoringInterval > 0
        ? monitoringInterval
        : DEFAULT_SETTINGS.monitoringInterval;
    const settings = {
      snmpEnabled,
      snmpCommunity,
      scanInterval,
      tcpPorts,
      preferredInterface,
      monitoringEnabled,
      monitoringInterval: normalizedMonitoringInterval,
      aiEnabled,
      aiMode: aiEnabled ? aiMode : 'disabled',
      autoAiOnDeviceOpen,
      aiTimeoutMs,
      ollamaEndpoint,
      ollamaModel,
      geminiEndpoint,
      geminiModel,
      geminiApiKey,
      cloudAllowSensitive,
    };

    try {
      const parsedPorts = parseTcpPorts(tcpPorts);
      const fallbackPorts = parseTcpPorts(DEFAULT_SETTINGS.tcpPorts);
      await tauriClient.applyRuntimeSettings(
        snmpEnabled,
        snmpCommunity,
        parsedPorts.length > 0 ? parsedPorts : fallbackPorts,
        normalizedMonitoringInterval,
      );
      if (monitoring.status.is_running) {
        await tauriClient.startMonitoring(normalizedMonitoringInterval);
        await monitoring.fetchStatus();
      }
      await applyAiRuntimeConfig();
      const latestAiSettings = await tauriClient.getAiSettings();
      setAiSettings(latestAiSettings);
      window.dispatchEvent(new Event('ai-status-refresh'));

      if (saveSettingsToStorage(settings)) {
        setSaveStatus('saved');
        setHasChanges(false);
        toast.success(settingsCopy.toasts.settingsApplied);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch (error) {
      setSaveStatus('idle');
      toast.error(settingsCopy.toasts.settingsApplyFailed);
      setSyncNotice(
        `${settingsCopy.notices.applyRuntimeFailedPrefix} ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleReset = async () => {
    setSnmpEnabled(DEFAULT_SETTINGS.snmpEnabled);
    setSnmpCommunity(DEFAULT_SETTINGS.snmpCommunity);
    setScanInterval(DEFAULT_SETTINGS.scanInterval);
    setTcpPorts(DEFAULT_SETTINGS.tcpPorts);
    setPreferredInterface(DEFAULT_SETTINGS.preferredInterface);
    setMonitoringEnabled(DEFAULT_SETTINGS.monitoringEnabled);
    setMonitoringInterval(DEFAULT_SETTINGS.monitoringInterval);
    setAiEnabled(DEFAULT_SETTINGS.aiEnabled);
    setAiMode(DEFAULT_SETTINGS.aiMode);
    setAutoAiOnDeviceOpen(DEFAULT_SETTINGS.autoAiOnDeviceOpen);
    setAiTimeoutMs(DEFAULT_SETTINGS.aiTimeoutMs);
    setOllamaEndpoint(DEFAULT_SETTINGS.ollamaEndpoint);
    setOllamaModel(DEFAULT_SETTINGS.ollamaModel);
    setGeminiEndpoint(DEFAULT_SETTINGS.geminiEndpoint);
    setGeminiModel(DEFAULT_SETTINGS.geminiModel);
    setGeminiApiKey(DEFAULT_SETTINGS.geminiApiKey);
    setCloudAllowSensitive(DEFAULT_SETTINGS.cloudAllowSensitive);

    try {
      await tauriClient.applyRuntimeSettings(
        DEFAULT_SETTINGS.snmpEnabled,
        DEFAULT_SETTINGS.snmpCommunity,
        parseTcpPorts(DEFAULT_SETTINGS.tcpPorts),
        DEFAULT_SETTINGS.monitoringInterval,
      );
      if (monitoring.status.is_running) {
        await tauriClient.startMonitoring(DEFAULT_SETTINGS.monitoringInterval);
        await monitoring.fetchStatus();
      }
      await tauriClient.applyAiRuntimeSettings({
        enabled: DEFAULT_SETTINGS.aiEnabled,
        mode: DEFAULT_SETTINGS.aiMode,
        timeout_ms: DEFAULT_SETTINGS.aiTimeoutMs,
        ollama_endpoint: DEFAULT_SETTINGS.ollamaEndpoint,
        ollama_model: DEFAULT_SETTINGS.ollamaModel,
        gemini_endpoint: DEFAULT_SETTINGS.geminiEndpoint,
        gemini_model: DEFAULT_SETTINGS.geminiModel,
        gemini_api_key: null,
        cloud_allow_sensitive: DEFAULT_SETTINGS.cloudAllowSensitive,
      });
      const latestAiSettings = await tauriClient.getAiSettings();
      setAiSettings(latestAiSettings);
      window.dispatchEvent(new Event('ai-status-refresh'));
    } catch {
      // Keep reset flow resilient if runtime bridge fails.
    }

    saveSettingsToStorage(DEFAULT_SETTINGS);
    setSaveStatus('saved');
    setHasChanges(false);
    toast.success(settingsCopy.toasts.settingsReset);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSyncDatabase = async () => {
    setSyncNotice(null);
    setIsSyncing(true);
    try {
      const report = await tauriClient.syncVulnerabilityFeed(syncRange);
      setVulnDbStatus(report.status);
      const syncTimestamp = new Date().toISOString();
      setVulnDbLastSync(syncTimestamp);
      localStorage.setItem(VULN_DB_SYNC_KEY, syncTimestamp);
      setSyncNotice(settingsCopy.notices.onlineSyncComplete
        .replace('{range}', report.range)
        .replace('{fetched}', String(report.fetched_records))
        .replace('{upserted}', String(report.upserted_records)));
      toast.success(settingsCopy.toasts.syncSuccess);
    } catch (error) {
      toast.error(settingsCopy.toasts.syncFailure);
      setSyncNotice(`${settingsCopy.notices.dbSyncFailedPrefix} ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDemoModeToggle = () => {
    const newValue = !demoMode;
    setDemoMode(newValue);
    localStorage.setItem('demo-mode-enabled', newValue.toString());
    setTimeout(() => window.location.reload(), 300);
  };

  const handleAutoAiOnDeviceOpenToggle = () => {
    setAutoAiOnDeviceOpen((current) => {
      const next = !current;
      const saved = loadSettings();
      saveSettingsToStorage({
        ...saved,
        autoAiOnDeviceOpen: next,
      });
      return next;
    });
  };

  const handleApplyAiSettings = async () => {
    setAiApplyLoading(true);
    setAiError(null);
    try {
      await applyAiRuntimeConfig();
      const nextAiSettings = await tauriClient.getAiSettings();
      setAiSettings(nextAiSettings);
      const stored = loadSettings();
      saveSettingsToStorage({
        ...stored,
        aiEnabled,
        aiMode: aiEnabled ? aiMode : 'disabled',
        aiTimeoutMs,
        ollamaEndpoint,
        ollamaModel,
        geminiEndpoint,
        geminiModel,
        geminiApiKey,
        cloudAllowSensitive,
      });
      window.dispatchEvent(new Event('ai-status-refresh'));
      toast.success(settingsCopy.toasts.aiApplySuccess);
      await handleAiCheck();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAiError(message);
      toast.error(settingsCopy.toasts.aiApplyFailure);
    } finally {
      setAiApplyLoading(false);
    }
  };

  const handleAiCheck = async () => {
    setAiCheckLoading(true);
    setAiError(null);
    try {
      const report = await tauriClient.runAiCheck();
      setAiCheckReport(report);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      setAiCheckLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const result = await tauriClient.getRuntimeDiagnostics();
      setRuntimeDiagnostics(result);
      if (result.warnings.length > 0) {
        toast.warning(settingsCopy.toasts.diagnosticsWithWarnings.replace('{count}', String(result.warnings.length)));
      } else {
        toast.success(settingsCopy.toasts.diagnosticsPassed);
      }
    } catch (error) {
      toast.error(settingsCopy.toasts.diagnosticsFailed);
      setSyncNotice(`${settingsCopy.notices.diagnosticsFailedPrefix} ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3 pb-1">
            <SettingsHero panelClassName={PANEL} />

            <SettingsGroupLabel
              title={settingsCopy.groups.runtime.title}
              badgeLabel={settingsCopy.groups.runtime.badge}
              tone="runtime"
            />

            <ConfigurationSection
              panelClassName={PANEL}
              preferredInterface={preferredInterface}
              onPreferredInterfaceChange={setPreferredInterface}
              interfaces={interfaces}
              tcpPorts={tcpPorts}
              onTcpPortsChange={setTcpPorts}
              dbPath={dbPath}
              scanSchemaVersion={scanSchemaVersion}
              runtimeDiagnostics={runtimeDiagnostics}
              diagnosticsLoading={diagnosticsLoading}
              onRunDiagnostics={() => void handleRunDiagnostics()}
            />

            <MonitoringSection
              panelClassName={PANEL}
              monitoringEnabled={monitoringEnabled}
              monitoringInterval={monitoringInterval}
              monitoring={monitoring}
              onToggle={() => setMonitoringEnabled(!monitoringEnabled)}
              onMonitoringIntervalChange={setMonitoringInterval}
            />

            <SnmpSection
              panelClassName={PANEL}
              snmpEnabled={snmpEnabled}
              onToggle={() => setSnmpEnabled(!snmpEnabled)}
            />

            <AiEngineSection
              panelClassName={PANEL}
              aiSettings={aiSettings}
              aiEnabled={aiEnabled}
              aiMode={aiMode}
              autoAiOnDeviceOpen={autoAiOnDeviceOpen}
              aiTimeoutMs={aiTimeoutMs}
              ollamaEndpoint={ollamaEndpoint}
              ollamaModel={ollamaModel}
              geminiEndpoint={geminiEndpoint}
              geminiModel={geminiModel}
              geminiApiKey={geminiApiKey}
              cloudAllowSensitive={cloudAllowSensitive}
              aiApplyLoading={aiApplyLoading}
              aiHasChanges={aiHasChanges}
              aiCheckReport={aiCheckReport}
              aiCheckLoading={aiCheckLoading}
              aiError={aiError}
              onAiEnabledToggle={() => {
                setAiEnabled((previous) => !previous);
                if (aiMode === 'disabled') {
                  setAiMode('local');
                }
              }}
              onAiModeChange={setAiMode}
              onAutoAiOnDeviceOpenToggle={handleAutoAiOnDeviceOpenToggle}
              onAiTimeoutChange={(value) =>
                setAiTimeoutMs(
                  Number.isFinite(value)
                    ? Math.max(500, Math.min(60000, Math.round(value)))
                    : DEFAULT_SETTINGS.aiTimeoutMs,
                )
              }
              onOllamaEndpointChange={setOllamaEndpoint}
              onOllamaModelChange={setOllamaModel}
              onGeminiEndpointChange={setGeminiEndpoint}
              onGeminiModelChange={setGeminiModel}
              onGeminiApiKeyChange={setGeminiApiKey}
              onCloudAllowSensitiveToggle={() => setCloudAllowSensitive((value) => !value)}
              onApplyAiSettings={() => void handleApplyAiSettings()}
              onRunAiCheck={() => void handleAiCheck()}
            />

            <SettingsGroupLabel
              title={settingsCopy.groups.manual.title}
              badgeLabel={settingsCopy.groups.manual.badge}
              tone="manual"
            />

            <VulnerabilityDbSection
              panelClassName={PANEL}
              autoUpdateVulnDB={autoUpdateVulnDB}
              onAutoUpdateToggle={() => setAutoUpdateVulnDB(!autoUpdateVulnDB)}
              vulnDBExpanded={vulnDBExpanded}
              onExpandToggle={() => setVulnDBExpanded(!vulnDBExpanded)}
              syncRange={syncRange}
              onSyncRangeChange={setSyncRange}
              embeddedCVEs={embeddedCVEs}
              downloadedCVEs={downloadedCVEs}
              lastUpdate={lastUpdate}
              isSyncing={isSyncing}
              syncNotice={syncNotice}
              onSyncDatabase={() => void handleSyncDatabase()}
            />

            <SettingsGroupLabel
              title={settingsCopy.groups.experimental.title}
              badgeLabel={settingsCopy.groups.experimental.badge}
              tone="experimental"
            />

            <DemoModeSection panelClassName={PANEL} demoMode={demoMode} onToggle={handleDemoModeToggle} />
          </div>
        </div>

        <div className={`${PANEL} shrink-0 p-3 sm:p-4`}>
          <SettingsActions
            hasChanges={hasChanges}
            saveStatus={saveStatus}
            onReset={() => void handleReset()}
            onSave={() => void handleSave()}
          />
        </div>
      </div>
    </div>
  );
}
