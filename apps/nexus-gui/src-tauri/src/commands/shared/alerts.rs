use nexus_core::{
    Alert as RuntimeAlert, AlertSeverity as DbAlertSeverity, AlertType as DbAlertType,
    DeviceRecord, NetworkEvent, database::queries,
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

pub(crate) fn persist_monitor_event_alert(
    conn: &rusqlite::Connection,
    event: &NetworkEvent,
) -> Result<(), String> {
    let (alert_type, device_mac, device_ip, dedupe_key, message, severity, dedupe_window_minutes) =
        match event {
            NetworkEvent::NewDeviceDiscovered {
                ip,
                mac,
                hostname,
                device_type,
            } => {
                let display_name = hostname
                    .as_deref()
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or(device_type);
                (
                    DbAlertType::NewDevice,
                    Some(mac.as_str()),
                    Some(ip.as_str()),
                    format!("monitor:new-device:{mac}"),
                    format!("New device discovered: {display_name} ({ip})"),
                    DbAlertSeverity::Warning,
                    30,
                )
            }
            NetworkEvent::DeviceWentOffline {
                mac,
                last_ip,
                hostname,
            } => {
                let display_name = hostname
                    .as_deref()
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or(mac);
                (
                    DbAlertType::DeviceOffline,
                    Some(mac.as_str()),
                    Some(last_ip.as_str()),
                    format!("monitor:device-offline:{mac}"),
                    format!("Device offline: {display_name} ({last_ip})"),
                    DbAlertSeverity::Info,
                    10,
                )
            }
            NetworkEvent::DeviceCameOnline { mac, ip, hostname } => {
                let display_name = hostname
                    .as_deref()
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or(mac);
                (
                    DbAlertType::DeviceOnline,
                    Some(mac.as_str()),
                    Some(ip.as_str()),
                    format!("monitor:device-online:{mac}"),
                    format!("Device online: {display_name} ({ip})"),
                    DbAlertSeverity::Info,
                    10,
                )
            }
            NetworkEvent::DeviceIpChanged {
                mac,
                old_ip,
                new_ip,
            } => (
                DbAlertType::IpChange,
                Some(mac.as_str()),
                Some(new_ip.as_str()),
                format!("monitor:ip-change:{mac}:{new_ip}"),
                format!("IP changed for {mac}: {old_ip} -> {new_ip}"),
                DbAlertSeverity::Warning,
                15,
            ),
            NetworkEvent::MonitoringError { message } => (
                DbAlertType::Custom,
                None,
                None,
                format!("monitor:error:{message}"),
                format!("Monitoring error: {message}"),
                DbAlertSeverity::Error,
                5,
            ),
            _ => return Ok(()),
        };

    let alert_insert = queries::AlertInsert {
        alert_type,
        device_id: None,
        device_mac,
        device_ip,
        dedupe_key: None,
        message: &message,
        severity,
    };

    queries::insert_alert_if_not_exists(conn, &alert_insert, &dedupe_key, dedupe_window_minutes)
        .map(|_| ())
        .map_err(|error| format!("Failed to persist monitor event alert: {}", error))
}
