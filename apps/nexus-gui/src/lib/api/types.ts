export interface VulnerabilityInfo {
  cve_id: string;
  description: string;
  severity: string;
  cvss_score?: number;
}

export interface PortWarning {
  port: number;
  service: string;
  warning: string;
  severity: string;
  recommendation?: string;
}

export interface NeighborInfo {
  local_port: string;
  remote_device: string;
  remote_port: string;
  remote_ip?: string;
}

export interface HostInfo {
  ip: string;
  mac: string;
  vendor?: string;
  is_randomized?: boolean;
  response_time_ms?: number | null;
  ttl?: number;
  os_guess?: string;
  device_type: string;
  risk_score: number;
  open_ports?: number[];
  discovery_method: string;
  hostname?: string;
  system_description?: string;
  uptime_seconds?: number;
  neighbors?: NeighborInfo[];
  vulnerabilities?: VulnerabilityInfo[];
  port_warnings?: PortWarning[];
  security_grade?: string;
  last_seen?: string;
}

export interface ScanResult {
  interface_name: string;
  local_ip: string;
  local_mac: string;
  subnet: string;
  scan_method: string;
  arp_discovered: number;
  icmp_discovered: number;
  total_hosts: number;
  scan_duration_ms: number;
  active_hosts: HostInfo[];
}

export interface ScanRecord {
  id: number;
  scan_time: string;
  interface_name: string;
  local_ip: string;
  local_mac: string;
  subnet: string;
  scan_method: string;
  arp_discovered: number;
  icmp_discovered: number;
  total_hosts: number;
  duration_ms: number;
}

export interface DeviceRecord {
  id: number;
  mac: string;
  first_seen: string;
  last_seen: string;
  last_ip?: string;
  vendor?: string;
  device_type?: string;
  hostname?: string;
  os_guess?: string;
  custom_name?: string;
  notes?: string;
}

export interface AlertRecord {
  id: number;
  created_at: string;
  alert_type: string;
  device_id?: number;
  device_mac?: string;
  device_ip?: string;
  message: string;
  severity: string;
  is_read: boolean;
}

export interface NetworkStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  new_devices_24h: number;
  high_risk_devices: number;
  total_scans: number;
  last_scan_time?: string;
}

export interface NetworkHealth {
  score: number;
  grade: string;
  status: string;
  breakdown: {
    security: number;
    stability: number;
    compliance: number;
  };
  insights: string[];
}

export interface SecurityRecommendation {
  priority: string;
  category: string;
  title: string;
  description: string;
  affected_devices: string[];
}

export interface SecurityReport {
  recommendations: SecurityRecommendation[];
  critical_count: number;
  high_count: number;
  total_issues: number;
  summary: string;
}

export interface DeviceDistribution {
  total: number;
  by_type: Record<string, number>;
  percentages: Record<string, number>;
  dominant_type?: string | null;
  summary: string;
}

export interface VendorDistribution {
  total: number;
  by_vendor: Record<string, number>;
  top_vendors: Array<[string, number]>;
}

export type AiMode = "disabled" | "local" | "cloud" | "hybrid_auto";

export interface AiProviderCheck {
  provider: string;
  configured: boolean;
  reachable: boolean;
  model?: string | null;
  model_available?: boolean | null;
  latency_ms?: number | null;
  error?: string | null;
}

export interface AiCheckReport {
  ai_enabled: boolean;
  mode: AiMode;
  timeout_ms: number;
  local?: AiProviderCheck | null;
  cloud?: AiProviderCheck | null;
  overall_ok: boolean;
}

export interface AiInsightOverlay {
  executive_summary: string;
  top_risks: string[];
  immediate_actions: string[];
  follow_up_actions: string[];
}

export interface HybridInsightsResult {
  health: NetworkHealth;
  security: SecurityReport;
  device_distribution: DeviceDistribution;
  vendor_distribution: VendorDistribution;
  ai_overlay?: AiInsightOverlay | null;
  ai_provider?: string | null;
  ai_model?: string | null;
  ai_error?: string | null;
}

export interface AssistantMetadata {
  provider?: string | null;
  model?: string | null;
  ai_error?: string | null;
}

export interface DeviceSecurityAnalysis {
  target: string;
  ip: string;
  mac: string;
  risk_score: number;
  risk_level: string;
  executive_summary: string;
  key_findings: string[];
  recommended_actions: string[];
  metadata: AssistantMetadata;
}

export interface NetworkReportSummary {
  generated_at: string;
  subnet?: string | null;
  total_hosts: number;
  online_hosts: number;
  offline_hosts: number;
  executive_summary: string;
  topology_highlights: string[];
  key_risks: string[];
  recommended_actions: string[];
  metadata: AssistantMetadata;
}

export interface DeviceTroubleshootAdvice {
  target: string;
  ip: string;
  mac: string;
  status: string;
  summary: string;
  likely_causes: string[];
  diagnostic_steps: string[];
  suggested_commands: string[];
  metadata: AssistantMetadata;
}

export interface AiSettings {
  enabled: boolean;
  mode: AiMode;
  timeout_ms: number;
  ollama_endpoint: string;
  ollama_model: string;
  gemini_endpoint: string;
  gemini_model: string;
  gemini_api_key?: string | null;
  cloud_allow_sensitive: boolean;
}

export interface AiRuntimeSettingsInput {
  enabled: boolean;
  mode: AiMode;
  timeout_ms: number;
  ollama_endpoint: string;
  ollama_model: string;
  gemini_endpoint: string;
  gemini_model: string;
  gemini_api_key?: string | null;
  cloud_allow_sensitive: boolean;
}

export interface ScanWithAi {
  scan: ScanResult;
  ai?: HybridInsightsResult | null;
}

export interface LoadTestSummary {
  interface_name: string;
  iterations: number;
  concurrency: number;
  successful_scans: number;
  failed_scans: number;
  wall_time_ms: number;
  avg_scan_duration_ms: number;
  min_scan_duration_ms: number;
  max_scan_duration_ms: number;
  avg_hosts_found: number;
}

export interface MonitoringStatus {
  is_running: boolean;
  interval_seconds: number;
  scan_count: number;
  last_scan_time?: string;
  devices_online: number;
  devices_total: number;
}

export interface VulnerabilityDbStatus {
  cve_total: number;
  embedded_cve_total: number;
  port_warning_total: number;
  last_published_date?: string | null;
}

export interface VulnerabilitySyncReport {
  source: string;
  range: string;
  fetched_records: number;
  upserted_records: number;
  status: VulnerabilityDbStatus;
}

export interface RuntimeDiagnostics {
  interface_count: number;
  interfaces: string[];
  icmp_client_available: boolean;
  monitor_running: boolean;
  warnings: string[];
}

export interface TelemetrySample {
  id: number;
  captured_at: string;
  metric_key: string;
  metric_value: number;
  label?: string | null;
}

export interface TelemetrySeries {
  metric_key: string;
  points: TelemetrySample[];
}

export interface TelemetryEvent {
  metric_key: string;
  metric_value: number;
  label?: string | null;
}

export type NetworkEventType =
  | { type: "MonitoringStarted"; data: { interval_seconds: number } }
  | { type: "MonitoringStopped" }
  | { type: "ScanStarted"; data: { scan_number: number } }
  | {
      type: "ScanProgress";
      data: { phase: string; percent: number; message: string };
    }
  | {
      type: "ScanCompleted";
      data: { scan_number: number; hosts_found: number; duration_ms: number };
    }
  | {
      type: "NewDeviceDiscovered";
      data: { ip: string; mac: string; hostname?: string; device_type: string };
    }
  | {
      type: "DeviceWentOffline";
      data: { mac: string; last_ip: string; hostname?: string };
    }
  | {
      type: "DeviceCameOnline";
      data: { mac: string; ip: string; hostname?: string };
    }
  | {
      type: "DeviceIpChanged";
      data: { mac: string; old_ip: string; new_ip: string };
    }
  | { type: "MonitoringError"; data: { message: string } };

export type EngineEventType =
  | { kind: "info"; message: string }
  | { kind: "warn"; message: string }
  | { kind: "error"; message: string }
  | { kind: "scan_phase"; phase: string; progress_pct: number }
  | { kind: "scan_persisted"; scan_id: number; path: string }
  | { kind: "cancelled"; stage: string };

export interface PingResult {
  success: boolean;
  latency_ms: number | null;
  ttl: number | null;
  os_guess: string | null;
  error: string | null;
}

export interface PortScanResult {
  port: number;
  is_open: boolean;
  service: string | null;
}

export interface VendorLookupResult {
  mac: string;
  vendor: string | null;
  is_randomized: boolean;
}
