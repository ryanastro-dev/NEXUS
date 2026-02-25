use nexus_core::{
    HostInfo, ScanResult, ScanWithAi, SecurityReport, database::queries, export_devices_csv,
    export_hosts_csv, export_scan_result_json, export_scan_result_with_ai_json,
    export_topology_json, generate_network_health_pdf, generate_scan_report_pdf,
};
use std::sync::OnceLock;

use super::shared::{get_db_connection, lock_db_connection};
use super::{AppState, CommandResult};

/// Export devices to CSV.
#[tauri::command]
pub fn export_devices_to_csv(state: tauri::State<'_, AppState>) -> CommandResult<String> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    let devices =
        queries::get_all_devices(&conn).map_err(|e| format!("Failed to get devices: {}", e))?;

    export_devices_csv(&devices)
        .map_err(|e| format!("Failed to export CSV: {}", e))
        .map_err(Into::into)
}

/// Export current scan hosts to CSV.
#[tauri::command]
pub fn export_scan_to_csv(hosts: Vec<HostInfo>) -> CommandResult<String> {
    export_hosts_csv(&hosts)
        .map_err(|e| format!("Failed to export CSV: {}", e))
        .map_err(Into::into)
}

/// Export topology data to JSON.
#[tauri::command]
pub fn export_topology_to_json(hosts: Vec<HostInfo>, network: String) -> CommandResult<String> {
    export_topology_json(&hosts, &network)
        .map_err(|e| format!("Failed to export JSON: {}", e))
        .map_err(Into::into)
}

/// Export full scan result to JSON.
#[tauri::command]
pub fn export_scan_to_json(scan: ScanResult) -> CommandResult<String> {
    export_scan_result_json(&scan)
        .map_err(|e| format!("Failed to export JSON: {}", e))
        .map_err(Into::into)
}

/// Export scan result with optional AI overlay to JSON.
#[tauri::command]
pub fn export_scan_with_ai_to_json(scan_with_ai: ScanWithAi) -> CommandResult<String> {
    export_scan_result_with_ai_json(&scan_with_ai.scan, scan_with_ai.ai.as_ref())
        .map_err(|e| format!("Failed to export JSON: {}", e))
        .map_err(Into::into)
}

/// Generate and export scan report PDF.
#[tauri::command]
pub fn export_scan_report(
    state: tauri::State<'_, AppState>,
    scan: ScanResult,
    hosts: Vec<HostInfo>,
) -> CommandResult<Vec<u8>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    let stats = queries::get_network_stats(&conn).ok();

    generate_scan_report_pdf(&scan, &hosts, stats.as_ref())
        .map_err(|e| format!("Failed to generate PDF: {}", e))
        .map_err(Into::into)
}

/// Generate and export network health/security report PDF.
#[tauri::command]
pub fn export_security_report(hosts: Vec<HostInfo>) -> CommandResult<Vec<u8>> {
    let recommendations = SecurityReport::generate(&hosts);

    generate_network_health_pdf(&recommendations)
        .map_err(|e| format!("Failed to generate PDF: {}", e))
        .map_err(Into::into)
}

/// Export a pre-generated showcase scan report PDF (works without running live scan first).
#[tauri::command]
pub fn export_showcase_report() -> CommandResult<Vec<u8>> {
    static SHOWCASE_REPORT_CACHE: OnceLock<Vec<u8>> = OnceLock::new();

    if let Some(cached) = SHOWCASE_REPORT_CACHE.get() {
        return Ok(cached.clone());
    }

    let mut demo_scan = crate::demo_data::generate_demo_scan();
    demo_scan.scan_method = "Showcase Demo Replay".to_string();

    let hosts = demo_scan.active_hosts.clone();
    let report = generate_scan_report_pdf(&demo_scan, &hosts, None)
        .map_err(|e| format!("Failed to generate showcase PDF: {}", e))?;

    let _ = SHOWCASE_REPORT_CACHE.set(report.clone());
    Ok(report)
}
