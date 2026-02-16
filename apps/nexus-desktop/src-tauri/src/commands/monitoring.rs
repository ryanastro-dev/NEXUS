use nexus_core::{database::queries, list_valid_interfaces, MonitoringStatus, NetworkEvent};
use tauri::Emitter;

use super::shared::get_db_connection;
use super::state::{AppState, MonitorState};
use super::types::RuntimeDiagnostics;

/// Start background network monitoring.
#[tauri::command]
pub async fn start_monitoring(
    state: tauri::State<'_, AppState>,
    monitor_state: tauri::State<'_, MonitorState>,
    app: tauri::AppHandle,
    interval_seconds: Option<u64>,
    interface: Option<String>,
) -> Result<(), String> {
    let db_conn = get_db_connection(&state)?;
    let monitor = monitor_state.monitor.lock().await;

    let app_handle = app.clone();
    let callback_db_conn = db_conn.clone();
    let callback = move |event: NetworkEvent| {
        let _ = app_handle.emit("network-event", &event);

        if let NetworkEvent::ScanCompleted {
            scan_number,
            hosts_found,
            duration_ms,
        } = event
        {
            let throughput_hps = if duration_ms == 0 {
                0.0
            } else {
                hosts_found as f64 / (duration_ms as f64 / 1000.0)
            };
            let label = format!("monitor scan #{}", scan_number);

            if let Ok(conn) = callback_db_conn.lock() {
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.duration_ms",
                    duration_ms as f64,
                    Some(&label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.hosts_found",
                    hosts_found as f64,
                    Some(&label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.throughput_hosts_per_sec",
                    throughput_hps,
                    Some(&label),
                );
            }

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "scan.duration_ms",
                    "metric_value": duration_ms,
                    "label": label,
                }),
            );

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "scan.hosts_found",
                    "metric_value": hosts_found,
                    "label": label,
                }),
            );

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "scan.throughput_hosts_per_sec",
                    "metric_value": throughput_hps,
                    "label": label,
                }),
            );
        }
    };

    monitor
        .start_with_interface(callback, interval_seconds, interface)
        .await
}

/// Stop background network monitoring.
#[tauri::command]
pub async fn stop_monitoring(monitor_state: tauri::State<'_, MonitorState>) -> Result<(), String> {
    let monitor = monitor_state.monitor.lock().await;
    monitor.stop();
    Ok(())
}

/// Get current monitoring status.
#[tauri::command]
pub async fn get_monitoring_status(
    monitor_state: tauri::State<'_, MonitorState>,
) -> Result<MonitoringStatus, String> {
    let monitor = monitor_state.monitor.lock().await;
    Ok(monitor.status().await)
}

/// Run runtime capability diagnostics (interfaces, ICMP support, monitor state).
#[tauri::command]
pub async fn get_runtime_diagnostics(
    monitor_state: tauri::State<'_, MonitorState>,
) -> Result<RuntimeDiagnostics, String> {
    let interfaces = list_valid_interfaces();
    let interface_count = interfaces.len();
    let icmp_client_available = surge_ping::Client::new(&surge_ping::Config::default()).is_ok();

    let monitor = monitor_state.monitor.lock().await;
    let monitor_running = monitor.status().await.is_running;

    let mut warnings = Vec::new();
    if interface_count == 0 {
        warnings.push(
            "No valid IPv4 interface detected. Verify adapter state and permissions.".to_string(),
        );
    }
    if !icmp_client_available {
        warnings.push(
            "ICMP client unavailable. Ping latency metrics may be degraded without elevated privileges."
                .to_string(),
        );
    }

    Ok(RuntimeDiagnostics {
        interface_count,
        interfaces,
        icmp_client_available,
        monitor_running,
        warnings,
    })
}
