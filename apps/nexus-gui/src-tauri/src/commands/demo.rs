use nexus_core::{AlertRecord, ScanResult};

use super::shared::{emit_scan_completed, emit_scan_progress, emit_scan_started};

/// Mock network scan for demo mode.
#[tauri::command]
pub async fn mock_scan_network(app: tauri::AppHandle) -> Result<ScanResult, String> {
    emit_scan_started(&app, 1);
    let demo_scan = crate::demo_data::generate_demo_scan();

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    emit_scan_progress(&app, "discovery", 33, "Scanning local subnet");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    emit_scan_progress(&app, "services", 66, "Profiling discovered hosts");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    emit_scan_progress(&app, "complete", 100, "Mock discovery complete");
    emit_scan_completed(&app, 1, demo_scan.total_hosts, demo_scan.scan_duration_ms);

    Ok(demo_scan)
}

/// Get demo alerts.
#[tauri::command]
pub fn get_demo_alerts() -> Result<Vec<AlertRecord>, String> {
    Ok(crate::demo_data::generate_demo_alerts())
}
