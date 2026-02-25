use nexus_core::{TelemetrySample, monitor::DeviceSnapshot};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VulnerabilityDbStatus {
    pub cve_total: i64,
    pub embedded_cve_total: i64,
    pub port_warning_total: i64,
    pub last_published_date: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VulnerabilitySyncReport {
    pub source: String,
    pub range: String,
    pub fetched_records: usize,
    pub upserted_records: usize,
    pub status: VulnerabilityDbStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArpReceiverLifecycleDiagnostics {
    pub current_deferred_handles: usize,
    pub deferred_high_watermark: usize,
    pub total_deferred_handles: usize,
    pub total_reaped_handles: usize,
    pub dropped_over_cap: usize,
    pub cap: usize,
    pub warning_threshold: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RuntimeDiagnostics {
    pub interface_count: usize,
    pub interfaces: Vec<String>,
    pub icmp_client_available: bool,
    pub monitor_running: bool,
    pub arp_receiver_lifecycle: ArpReceiverLifecycleDiagnostics,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TelemetrySeries {
    pub metric_key: String,
    pub points: Vec<TelemetrySample>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MonitorSnapshot {
    pub is_running: bool,
    pub scan_count: u32,
    pub captured_at: String,
    pub devices: Vec<DeviceSnapshot>,
}
