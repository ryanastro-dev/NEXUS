use nexus_core::{
    MonitoringStatus, NetworkEvent, arp_receiver_lifecycle_metrics, database::queries,
    list_valid_interfaces,
};
use tauri::Emitter;

use super::shared::{get_db_connection, persist_monitor_event_alert};
use super::types::{ArpReceiverLifecycleDiagnostics, MonitorSnapshot, RuntimeDiagnostics};
use super::{AppState, CommandResult, MonitorState};

/// Start background network monitoring.
#[tauri::command]
pub async fn start_monitoring(
    state: tauri::State<'_, AppState>,
    monitor_state: tauri::State<'_, MonitorState>,
    app: tauri::AppHandle,
    interval_seconds: Option<u64>,
    interface: Option<String>,
) -> CommandResult<()> {
    let db_conn = get_db_connection(&state)?;
    let monitor = monitor_state.monitor.lock().await;

    let app_handle = app.clone();
    let callback_db_conn = db_conn.clone();
    let callback = move |event: NetworkEvent| {
        let _ = app_handle.emit("network-event", &event);

        if let Ok(conn) = callback_db_conn.lock()
            && let Err(error) = persist_monitor_event_alert(&conn, &event)
        {
            eprintln!("[WARN] Failed to persist monitor event alert: {}", error);
        }

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
            let arp_lifecycle = arp_receiver_lifecycle_metrics();
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
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "arp.deferred_handles.current",
                    arp_lifecycle.current_deferred_handles as f64,
                    Some(&label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "arp.deferred_handles.high_watermark",
                    arp_lifecycle.deferred_high_watermark as f64,
                    Some(&label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "arp.deferred_handles.dropped_total",
                    arp_lifecycle.dropped_over_cap as f64,
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

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "arp.deferred_handles.current",
                    "metric_value": arp_lifecycle.current_deferred_handles,
                    "label": label,
                }),
            );

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "arp.deferred_handles.high_watermark",
                    "metric_value": arp_lifecycle.deferred_high_watermark,
                    "label": label,
                }),
            );

            let _ = app_handle.emit(
                "telemetry-event",
                serde_json::json!({
                    "metric_key": "arp.deferred_handles.dropped_total",
                    "metric_value": arp_lifecycle.dropped_over_cap,
                    "label": label,
                }),
            );
        }
    };

    monitor
        .start_with_interface(callback, interval_seconds, interface)
        .await
        .map_err(Into::into)
}

/// Stop background network monitoring.
#[tauri::command]
pub async fn stop_monitoring(monitor_state: tauri::State<'_, MonitorState>) -> CommandResult<()> {
    let monitor = monitor_state.monitor.lock().await;
    monitor.stop();
    Ok(())
}

/// Get current monitoring status.
#[tauri::command]
pub async fn get_monitoring_status(
    monitor_state: tauri::State<'_, MonitorState>,
) -> CommandResult<MonitoringStatus> {
    let monitor = monitor_state.monitor.lock().await;
    Ok(monitor.status().await)
}

/// Get live monitor device snapshot for frontend state reconciliation.
#[tauri::command]
pub async fn get_monitor_snapshot(
    monitor_state: tauri::State<'_, MonitorState>,
) -> CommandResult<MonitorSnapshot> {
    let monitor = monitor_state.monitor.lock().await;
    let status = monitor.status().await;
    let devices = monitor.online_snapshot().await;

    Ok(MonitorSnapshot {
        is_running: status.is_running,
        scan_count: status.scan_count,
        captured_at: chrono::Utc::now().to_rfc3339(),
        devices,
    })
}

/// Run runtime capability diagnostics (interfaces, ICMP support, monitor state).
#[tauri::command]
pub async fn get_runtime_diagnostics(
    monitor_state: tauri::State<'_, MonitorState>,
) -> CommandResult<RuntimeDiagnostics> {
    let interfaces = list_valid_interfaces();
    let interface_count = interfaces.len();
    let icmp_client_available = surge_ping::Client::new(&surge_ping::Config::default()).is_ok();
    let arp_lifecycle = arp_receiver_lifecycle_metrics();

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
    if arp_lifecycle.current_deferred_handles >= arp_lifecycle.warning_threshold {
        warnings.push(format!(
            "Deferred ARP receiver handles at {}/{} (warning threshold {}).",
            arp_lifecycle.current_deferred_handles,
            arp_lifecycle.cap,
            arp_lifecycle.warning_threshold
        ));
    }
    if arp_lifecycle.dropped_over_cap > 0 {
        warnings.push(format!(
            "Deferred ARP receiver join cap reached {} time(s); review receiver lifecycle pressure.",
            arp_lifecycle.dropped_over_cap
        ));
    }

    Ok(RuntimeDiagnostics {
        interface_count,
        interfaces,
        icmp_client_available,
        monitor_running,
        arp_receiver_lifecycle: ArpReceiverLifecycleDiagnostics {
            current_deferred_handles: arp_lifecycle.current_deferred_handles,
            deferred_high_watermark: arp_lifecycle.deferred_high_watermark,
            total_deferred_handles: arp_lifecycle.total_deferred_handles,
            total_reaped_handles: arp_lifecycle.total_reaped_handles,
            dropped_over_cap: arp_lifecycle.dropped_over_cap,
            cap: arp_lifecycle.cap,
            warning_threshold: arp_lifecycle.warning_threshold,
        },
        warnings,
    })
}
