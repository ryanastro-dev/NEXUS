use nexus_core::{
    database::queries, Alert as RuntimeAlert, AlertSeverity as DbAlertSeverity,
    AlertType as DbAlertType, DeviceRecord,
};

use super::super::state::AppState;
use super::db::{get_db_connection, lock_db_connection};

fn map_alert_type(alert: &RuntimeAlert) -> DbAlertType {
    match alert.alert_type.as_str() {
        "NEW_DEVICE" => DbAlertType::NewDevice,
        "DEVICE_OFFLINE" => DbAlertType::DeviceOffline,
        "DEVICE_ONLINE" => DbAlertType::DeviceOnline,
        "HIGH_RISK" => DbAlertType::HighRisk,
        "UNUSUAL_PORT" => DbAlertType::PortChange,
        "IP_CHANGED" => DbAlertType::IpChange,
        _ => DbAlertType::Custom,
    }
}

fn map_alert_severity(alert: &RuntimeAlert) -> DbAlertSeverity {
    match alert.severity.as_str() {
        "CRITICAL" => DbAlertSeverity::Critical,
        "HIGH" => DbAlertSeverity::Error,
        "MEDIUM" => DbAlertSeverity::Warning,
        "LOW" => DbAlertSeverity::Info,
        _ => DbAlertSeverity::Info,
    }
}

fn extract_port_from_alert_message(message: &str) -> Option<u16> {
    message
        .split(|ch: char| !ch.is_ascii_digit())
        .find_map(|chunk| chunk.parse::<u16>().ok())
}

fn build_alert_dedupe_key(alert: &RuntimeAlert) -> String {
    let mac = alert.device_mac.as_deref().unwrap_or("unknown-mac");
    let ip = alert.device_ip.as_deref().unwrap_or("unknown-ip");

    match alert.alert_type.as_str() {
        "NEW_DEVICE" => format!("new-device:{mac}"),
        "DEVICE_OFFLINE" => format!("device-offline:{mac}"),
        "DEVICE_ONLINE" => format!("device-online:{mac}"),
        "HIGH_RISK" => format!("high-risk:{mac}"),
        "UNUSUAL_PORT" => {
            let port = extract_port_from_alert_message(&alert.message)
                .map(|p| p.to_string())
                .unwrap_or_else(|| "unknown".to_string());
            format!("unusual-port:{mac}:{port}")
        }
        "IP_CHANGED" => format!("ip-changed:{mac}:{ip}"),
        _ => format!("custom:{mac}:{ip}"),
    }
}

pub(crate) fn load_known_devices_for_alerts(
    state: &tauri::State<'_, AppState>,
) -> Option<Vec<DeviceRecord>> {
    match get_db_connection(state) {
        Ok(db_conn) => match lock_db_connection(&db_conn) {
            Ok(conn) => match queries::get_all_devices(&conn) {
                Ok(devices) => Some(devices),
                Err(error) => {
                    eprintln!(
                        "[WARN] Failed to load known devices for alert baseline: {}",
                        error
                    );
                    None
                }
            },
            Err(error) => {
                eprintln!(
                    "[WARN] Failed to lock database for alert baseline: {}",
                    error
                );
                None
            }
        },
        Err(error) => {
            eprintln!(
                "[WARN] Failed to open database for alert baseline: {}",
                error
            );
            None
        }
    }
}

pub(crate) fn persist_alerts(state: &tauri::State<'_, AppState>, detected_alerts: &[RuntimeAlert]) {
    match get_db_connection(state) {
        Ok(db_conn) => match lock_db_connection(&db_conn) {
            Ok(conn) => {
                for alert in detected_alerts {
                    let alert_type = map_alert_type(alert);
                    let severity = map_alert_severity(alert);
                    let dedupe_key = build_alert_dedupe_key(alert);
                    let alert_insert = queries::AlertInsert {
                        alert_type,
                        device_id: None,
                        device_mac: alert.device_mac.as_deref(),
                        device_ip: alert.device_ip.as_deref(),
                        dedupe_key: None,
                        message: &alert.message,
                        severity,
                    };
                    if let Err(error) =
                        queries::insert_alert_if_not_exists(&conn, &alert_insert, &dedupe_key, 30)
                    {
                        eprintln!("[WARN] Failed to save alert to database: {}", error);
                    }
                }
            }
            Err(error) => eprintln!(
                "[WARN] Failed to acquire database lock for alert persistence: {}",
                error
            ),
        },
        Err(error) => eprintln!(
            "[WARN] Failed to acquire database lock for alert persistence: {}",
            error
        ),
    }
}
