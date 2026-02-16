use nexus_core::{database::queries, ScanResult};
use tauri::Emitter;

use super::super::state::AppState;
use super::db::{get_db_connection, lock_db_connection};

fn average_scan_latency_ms(scan_result: &ScanResult) -> Option<f64> {
    let mut total = 0.0f64;
    let mut count = 0usize;
    for host in &scan_result.active_hosts {
        if let Some(latency) = host.response_time_ms {
            total += latency as f64;
            count += 1;
        }
    }
    if count == 0 {
        None
    } else {
        Some(total / count as f64)
    }
}

pub(crate) fn persist_scan_telemetry(
    state: &tauri::State<'_, AppState>,
    app: &tauri::AppHandle,
    scan_result: &ScanResult,
    label: &str,
) {
    let throughput_hps = if scan_result.scan_duration_ms == 0 {
        0.0
    } else {
        scan_result.total_hosts as f64 / (scan_result.scan_duration_ms as f64 / 1000.0)
    };
    let avg_latency = average_scan_latency_ms(scan_result);

    match get_db_connection(state) {
        Ok(db_conn) => match lock_db_connection(&db_conn) {
            Ok(conn) => {
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.duration_ms",
                    scan_result.scan_duration_ms as f64,
                    Some(label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.hosts_found",
                    scan_result.total_hosts as f64,
                    Some(label),
                );
                let _ = queries::insert_telemetry_sample(
                    &conn,
                    "scan.throughput_hosts_per_sec",
                    throughput_hps,
                    Some(label),
                );
                if let Some(latency) = avg_latency {
                    let _ = queries::insert_telemetry_sample(
                        &conn,
                        "scan.avg_latency_ms",
                        latency,
                        Some(label),
                    );
                }

                let _ = app.emit(
                    "telemetry-event",
                    serde_json::json!({
                        "metric_key": "scan.duration_ms",
                        "metric_value": scan_result.scan_duration_ms,
                        "label": label,
                    }),
                );

                let _ = app.emit(
                    "telemetry-event",
                    serde_json::json!({
                        "metric_key": "scan.hosts_found",
                        "metric_value": scan_result.total_hosts,
                        "label": label,
                    }),
                );

                let _ = app.emit(
                    "telemetry-event",
                    serde_json::json!({
                        "metric_key": "scan.throughput_hosts_per_sec",
                        "metric_value": throughput_hps,
                        "label": label,
                    }),
                );

                if let Some(latency) = avg_latency {
                    let _ = app.emit(
                        "telemetry-event",
                        serde_json::json!({
                            "metric_key": "scan.avg_latency_ms",
                            "metric_value": latency,
                            "label": label,
                        }),
                    );
                }
            }
            Err(error) => {
                eprintln!(
                    "[WARN] Failed to lock database for telemetry persistence: {}",
                    error
                );
            }
        },
        Err(error) => {
            eprintln!(
                "[WARN] Failed to get database connection for telemetry persistence: {}",
                error
            );
        }
    }
}
