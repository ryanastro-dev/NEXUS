import { useEffect, useState } from 'react';
import type { UseMonitoringReturn } from '../hooks/useMonitoring';
import { tauriClient } from '../lib/api/tauri-client';
import type {
  AiCheckReport,
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

interface SettingsProps {
  monitor: UseMonitoringReturn;
}

export default function Settings({ monitor: monitoring }: SettingsProps) {
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

    tauriClient.getInterfaces().then(setInterfaces).catch(() => setInterfaces([]));
    tauriClient.getDatabasePath().then(setDbPath).catch(() => setDbPath(null));
    tauriClient
      .getScanResultSchema()
      .then((schema) => {
        const version = schema?.schema_version;
        setScanSchemaVersion(typeof version === 'string' ? version : null);
      })
      .catch(() => setScanSchemaVersion(null));
    tauriClient.getAiSettings().then(setAiSettings).catch(() => setAiSettings(null));
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
  ]);

  const handleSave = async () => {
    setSaveStatus('saving');
    const settings = {
      snmpEnabled,
      snmpCommunity,
      scanInterval,
      tcpPorts,
      preferredInterface,
      monitoringEnabled,
      monitoringInterval,
    };

    try {
      const parsedPorts = parseTcpPorts(tcpPorts);
      const fallbackPorts = parseTcpPorts(DEFAULT_SETTINGS.tcpPorts);
      await tauriClient.applyRuntimeSettings(
        snmpEnabled,
        snmpCommunity,
        parsedPorts.length > 0 ? parsedPorts : fallbackPorts,
        monitoringInterval,
      );

      if (saveSettingsToStorage(settings)) {
        setSaveStatus('saved');
        setHasChanges(false);
        toast.success('Settings applied');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch (error) {
      setSaveStatus('idle');
      toast.error('Failed to apply settings');
      setSyncNotice(
        `Failed to apply runtime settings: ${error instanceof Error ? error.message : String(error)}`,
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

    try {
      await tauriClient.applyRuntimeSettings(
        DEFAULT_SETTINGS.snmpEnabled,
        DEFAULT_SETTINGS.snmpCommunity,
        parseTcpPorts(DEFAULT_SETTINGS.tcpPorts),
        DEFAULT_SETTINGS.monitoringInterval,
      );
    } catch {
      // Keep reset flow resilient if runtime bridge fails.
    }

    saveSettingsToStorage(DEFAULT_SETTINGS);
    setSaveStatus('saved');
    setHasChanges(false);
    toast.success('Settings reset to defaults');
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
      setSyncNotice(
        `Online sync complete (${report.range}): fetched ${report.fetched_records}, upserted ${report.upserted_records}.`,
      );
      toast.success('Vulnerability feed synced');
    } catch (error) {
      toast.error('Vulnerability sync failed');
      setSyncNotice(`Database sync failed: ${error instanceof Error ? error.message : String(error)}`);
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
        toast.warning(`Diagnostics completed with ${result.warnings.length} warning(s)`);
      } else {
        toast.success('Diagnostics passed');
      }
    } catch (error) {
      toast.error('Diagnostics failed');
      setSyncNotice(`Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col space-y-4">
        <SettingsHero panelClassName={PANEL} />

        <ConfigurationSection
          panelClassName={PANEL}
          scanInterval={scanInterval}
          onScanIntervalChange={setScanInterval}
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

        <SnmpSection
          panelClassName={PANEL}
          snmpEnabled={snmpEnabled}
          onToggle={() => setSnmpEnabled(!snmpEnabled)}
        />

        <MonitoringSection
          panelClassName={PANEL}
          monitoringEnabled={monitoringEnabled}
          monitoringInterval={monitoringInterval}
          monitoring={monitoring}
          onToggle={() => setMonitoringEnabled(!monitoringEnabled)}
          onMonitoringIntervalChange={setMonitoringInterval}
        />

        <AiEngineSection
          panelClassName={PANEL}
          aiSettings={aiSettings}
          aiCheckReport={aiCheckReport}
          aiCheckLoading={aiCheckLoading}
          aiError={aiError}
          onRunAiCheck={() => void handleAiCheck()}
        />

        <DemoModeSection panelClassName={PANEL} demoMode={demoMode} onToggle={handleDemoModeToggle} />

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

        <SettingsActions
          hasChanges={hasChanges}
          saveStatus={saveStatus}
          onReset={() => void handleReset()}
          onSave={() => void handleSave()}
        />
      </div>
    </div>
  );
}
