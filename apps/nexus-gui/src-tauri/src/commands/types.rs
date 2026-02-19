use nexus_core::TelemetrySample;

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
pub struct RuntimeDiagnostics {
    pub interface_count: usize,
    pub interfaces: Vec<String>,
    pub icmp_client_available: bool,
    pub monitor_running: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TelemetrySeries {
    pub metric_key: String,
    pub points: Vec<TelemetrySample>,
}
