use nexus_core::{AlertRecord, ScanResult};

use super::CommandResult;
use super::shared::{emit_scan_completed, emit_scan_progress, emit_scan_started};

/// Mock network scan for demo mode.
#[tauri::command]
pub async fn mock_scan_network(app: tauri::AppHandle) -> CommandResult<ScanResult> {
    emit_scan_started(&app, 1);
    let demo_scan = crate::demo_data::generate_demo_scan();
    let host_count = demo_scan.total_hosts;
    let pacing = std::cmp::min(480, host_count as u64 * 6);

    tokio::time::sleep(tokio::time::Duration::from_millis(550 + pacing)).await;

    emit_scan_progress(&app, "interface", 8, "Selecting capture interface");
    tokio::time::sleep(tokio::time::Duration::from_millis(280 + pacing / 2)).await;

    emit_scan_progress(
        &app,
        "discovery",
        24,
        &format!("Broadcast ARP sweep across {host_count} targets"),
    );
    tokio::time::sleep(tokio::time::Duration::from_millis(420 + pacing)).await;

    emit_scan_progress(&app, "icmp", 42, "ICMP reachability verification");
    tokio::time::sleep(tokio::time::Duration::from_millis(390 + pacing / 2)).await;

    emit_scan_progress(&app, "services", 64, "Profiling open services and ports");
    tokio::time::sleep(tokio::time::Duration::from_millis(510 + pacing)).await;

    emit_scan_progress(
        &app,
        "security",
        82,
        "Computing risk grades and vulnerability context",
    );
    tokio::time::sleep(tokio::time::Duration::from_millis(320 + pacing / 2)).await;

    emit_scan_progress(
        &app,
        "topology",
        94,
        "Building topology and runtime telemetry snapshot",
    );
    tokio::time::sleep(tokio::time::Duration::from_millis(240 + pacing / 3)).await;

    emit_scan_progress(&app, "complete", 100, "Demo replay complete");
    emit_scan_completed(&app, 1, demo_scan.total_hosts, demo_scan.scan_duration_ms);

    Ok(demo_scan)
}

/// Get demo alerts.
#[tauri::command]
pub fn get_demo_alerts() -> CommandResult<Vec<AlertRecord>> {
    Ok(crate::demo_data::generate_demo_alerts())
}
