import { invoke } from "@tauri-apps/api/core";
import type {
  AiCheckReport,
  AiSettings,
  AlertRecord,
  DeviceRecord,
  HostInfo,
  HybridInsightsResult,
  LoadTestSummary,
  MonitoringStatus,
  NetworkHealth,
  NetworkStats,
  PingResult,
  PortScanResult,
  RuntimeDiagnostics,
  ScanWithAi,
  ScanRecord,
  ScanResult,
  TelemetrySeries,
  VulnerabilityDbStatus,
  VulnerabilitySyncReport,
  VendorLookupResult,
} from "./types";
import { isTauri } from "../runtime/is-tauri";

type InvokeArgs = Record<string, unknown> | undefined;

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
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
    }),
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

  // Insights
  getNetworkHealth: () => invokeCommand<NetworkHealth>("get_network_health"),
  getDeviceDistribution: () =>
    invokeCommand<Record<string, unknown>>("get_device_distribution"),
  getScanResultSchema: () =>
    invokeCommand<Record<string, unknown>>("get_scan_result_schema"),
  getAiSettings: () => invokeCommand<AiSettings>("get_ai_settings"),
  runAiCheck: () => invokeCommand<AiCheckReport>("ai_check"),
  getAiInsights: () => invokeCommand<HybridInsightsResult>("ai_insights"),

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
