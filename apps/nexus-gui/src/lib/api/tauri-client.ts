import { invoke } from "@tauri-apps/api/core";
import type {
  AiCheckReport,
  AiRuntimeSettingsInput,
  DeviceSecurityAnalysis,
  DeviceTroubleshootAdvice,
  AiSettings,
  AlertRecord,
  DeviceRecord,
  HostInfo,
  HybridInsightsResult,
  LoadTestSummary,
  MonitoringStatus,
  MonitorSnapshot,
  NetworkHealth,
  RouterActionResult,
  RouterCapabilities,
  RouterClient,
  RouterConfigInput,
  RouterPolicyInput,
  RouterStatus,
  NetworkStats,
  PingResult,
  PortScanResult,
  RuntimeDiagnostics,
  ScanWithAi,
  ScanRecord,
  ScanResult,
  TelemetrySeries,
  NetworkReportSummary,
  VulnerabilityDbStatus,
  VulnerabilitySyncReport,
  VendorLookupResult,
} from "./types";
import { isTauri } from "../runtime/is-tauri";

type InvokeArgs = Record<string, unknown> | undefined;
const AI_INVOKE_OPTIONS = { retries: 0 } as const;

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    const code = (error as { code?: unknown }).code;

    if (typeof message === "string" && message.length > 0) {
      if (typeof code === "string" && code.length > 0) {
        return `[${code}] ${message}`;
      }
      return message;
    }
  }

  return "Unknown Tauri command error";
}

function isRetryableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("temporar") ||
    normalized.includes("busy") ||
    normalized.includes("resource unavailable") ||
    normalized.includes("connection reset") ||
    normalized.includes("network")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function invokeCommand<T>(
  command: string,
  args?: InvokeArgs,
  options?: { retries?: number; backoffMs?: number },
): Promise<T> {
  if (!isTauri()) {
    throw new Error("Tauri runtime unavailable");
  }

  const retries = options?.retries ?? 2;
  const backoffMs = options?.backoffMs ?? 150;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      const message = normalizeError(error);
      const canRetry = attempt < retries && isRetryableError(message);
      if (!canRetry) {
        throw new Error(message);
      }

      await sleep(backoffMs * Math.pow(2, attempt));
      attempt += 1;
    }
  }

  throw new Error("Unexpected invoke retry flow");
}

export const tauriClient = {
  // Scanner
  scanNetwork: (interfaceName?: string) =>
    invokeCommand<ScanResult>("scan_network", {
      interface: interfaceName ?? null,
    }),
  cancelActiveScan: () => invokeCommand<void>("cancel_active_scan"),
  mockScanNetwork: () => invokeCommand<ScanResult>("mock_scan_network"),
  getInterfaces: () => invokeCommand<string[]>("get_interfaces"),
  scanNetworkWithAi: (interfaceName?: string) =>
    invokeCommand<ScanWithAi>("scan_network_with_ai", {
      interface: interfaceName ?? null,
    }, AI_INVOKE_OPTIONS),
  runLoadTest: (
    iterations = 5,
    concurrency = 1,
    interfaceName?: string,
  ) =>
    invokeCommand<LoadTestSummary>("run_load_test", {
      interface: interfaceName ?? null,
      iterations,
      concurrency,
    }),

  // Database
  getScanHistory: (limit = 20) =>
    invokeCommand<ScanRecord[]>("get_scan_history", { limit }),
  getAllDevices: () => invokeCommand<DeviceRecord[]>("get_all_devices"),
  getDeviceByMac: (mac: string) =>
    invokeCommand<DeviceRecord | null>("get_device_by_mac", { mac }),
  updateDeviceName: (mac: string, name: string) =>
    invokeCommand<void>("update_device_name", { mac, name }),
  getNetworkStats: () => invokeCommand<NetworkStats>("get_network_stats"),
  getTelemetrySeries: (metricKey: string, limit = 30) =>
    invokeCommand<TelemetrySeries>("get_telemetry_series", {
      metricKey,
      limit,
    }),
  getUnreadAlerts: () => invokeCommand<AlertRecord[]>("get_unread_alerts"),
  getRecentAlerts: (limit = 200) =>
    invokeCommand<AlertRecord[]>("get_recent_alerts", { limit }),
  markAlertRead: (alertId: number) =>
    invokeCommand<void>("mark_alert_read", { alertId }),
  markAllAlertsRead: () => invokeCommand<void>("mark_all_alerts_read"),
  clearAllAlerts: () => invokeCommand<void>("clear_all_alerts"),
  getDatabasePath: () => invokeCommand<string>("get_database_path"),

  // Monitoring
  startMonitoring: (intervalSeconds?: number, interfaceName?: string) =>
    invokeCommand<void>("start_monitoring", {
      intervalSeconds,
      interface: interfaceName ?? null,
    }),
  stopMonitoring: () => invokeCommand<void>("stop_monitoring"),
  getMonitoringStatus: () =>
    invokeCommand<MonitoringStatus>("get_monitoring_status"),
  getMonitorSnapshot: () =>
    invokeCommand<MonitorSnapshot>("get_monitor_snapshot"),
  applyRuntimeSettings: (
    snmpEnabled: boolean,
    snmpCommunity: string,
    tcpPorts: number[],
    monitoringIntervalSeconds?: number,
  ) =>
    invokeCommand<void>("apply_runtime_settings", {
      snmpEnabled,
      snmpCommunity,
      tcpPorts,
      monitoringIntervalSeconds: monitoringIntervalSeconds ?? null,
    }),
  applyAiRuntimeSettings: (settings: AiRuntimeSettingsInput) =>
    invokeCommand<void>("apply_ai_runtime_settings", {
      settings,
    }),
  getVulnerabilityDbStatus: () =>
    invokeCommand<VulnerabilityDbStatus>("get_vulnerability_db_status"),
  syncVulnerabilityDb: () =>
    invokeCommand<VulnerabilityDbStatus>("sync_vulnerability_db"),
  syncVulnerabilityFeed: (syncRange: string) =>
    invokeCommand<VulnerabilitySyncReport>("sync_vulnerability_feed", {
      syncRange,
    }),
  getRuntimeDiagnostics: () =>
    invokeCommand<RuntimeDiagnostics>("get_runtime_diagnostics"),

  // Router Control
  configureRouter: (config: RouterConfigInput) =>
    invokeCommand<RouterStatus>("configure_router", { config }),
  getRouterProvider: () => invokeCommand<string>("get_router_provider"),
  getRouterCapabilities: () =>
    invokeCommand<RouterCapabilities>("get_router_capabilities"),
  getRouterStatus: () => invokeCommand<RouterStatus>("get_router_status"),
  listRouterClients: () => invokeCommand<RouterClient[]>("list_router_clients"),
  blockRouterClient: (mac: string) =>
    invokeCommand<RouterActionResult>("block_router_client", { mac }),
  unblockRouterClient: (mac: string) =>
    invokeCommand<RouterActionResult>("unblock_router_client", { mac }),
  applyRouterPolicy: (policy: RouterPolicyInput) =>
    invokeCommand<RouterActionResult>("apply_router_policy", { policy }),

  // Insights
  getNetworkHealth: () => invokeCommand<NetworkHealth>("get_network_health"),
  getDeviceDistribution: () =>
    invokeCommand<Record<string, unknown>>("get_device_distribution"),
  getScanResultSchema: () =>
    invokeCommand<Record<string, unknown>>("get_scan_result_schema"),
  getAiSettings: () => invokeCommand<AiSettings>("get_ai_settings"),
  runAiCheck: () => invokeCommand<AiCheckReport>("ai_check", undefined, AI_INVOKE_OPTIONS),
  getAiInsights: () => invokeCommand<HybridInsightsResult>("ai_insights", undefined, AI_INVOKE_OPTIONS),
  analyzeDeviceSecurity: (device: HostInfo) =>
    invokeCommand<DeviceSecurityAnalysis>("ai_analyze_device_security", {
      device,
    }, AI_INVOKE_OPTIONS),
  generateNetworkReport: (hosts?: HostInfo[], subnet?: string) =>
    invokeCommand<NetworkReportSummary>("ai_generate_network_report", {
      hosts: hosts && hosts.length > 0 ? hosts : null,
      subnet: subnet ?? null,
    }, AI_INVOKE_OPTIONS),
  troubleshootDevice: (device: HostInfo, symptoms?: string[]) =>
    invokeCommand<DeviceTroubleshootAdvice>("ai_troubleshoot_device", {
      device,
      symptoms: symptoms && symptoms.length > 0 ? symptoms : null,
    }, AI_INVOKE_OPTIONS),

  // Exports
  exportDevicesToCsv: () => invokeCommand<string>("export_devices_to_csv"),
  exportScanToCsv: (hosts: HostInfo[]) =>
    invokeCommand<string>("export_scan_to_csv", { hosts }),
  exportTopologyToJson: (hosts: HostInfo[], network: string) =>
    invokeCommand<string>("export_topology_to_json", { hosts, network }),
  exportScanToJson: (scan: ScanResult) =>
    invokeCommand<string>("export_scan_to_json", { scan }),
  exportScanWithAiToJson: (scanWithAi: ScanWithAi) =>
    invokeCommand<string>("export_scan_with_ai_to_json", { scanWithAi }),
  exportScanReport: (scan: ScanResult, hosts: HostInfo[]) =>
    invokeCommand<number[]>("export_scan_report", { scan, hosts }),
  exportSecurityReport: (hosts: HostInfo[]) =>
    invokeCommand<number[]>("export_security_report", { hosts }),
  exportShowcaseReport: () =>
    invokeCommand<number[]>("export_showcase_report"),

  // Tools
  pingHost: (target: string, count: number) =>
    invokeCommand<PingResult[]>("ping_host", { target, count }),
  scanPorts: (target: string, ports: number[]) =>
    invokeCommand<PortScanResult[]>("scan_ports", { target, ports }),
  lookupMacVendor: (mac: string) =>
    invokeCommand<VendorLookupResult>("lookup_mac_vendor", { mac }),

  // Demo
  getDemoAlerts: () => invokeCommand<AlertRecord[]>("get_demo_alerts"),
};
