use nexus_core::{AlertRecord, DeviceRecord, NetworkStats, ScanRecord, database::queries};

use super::shared::{get_db_connection, lock_db_connection};
use super::types::TelemetrySeries;
use super::{AppState, CommandResult};

/// Get recent scan history.
#[tauri::command]
pub fn get_scan_history(
    state: tauri::State<'_, AppState>,
    limit: Option<i32>,
) -> CommandResult<Vec<ScanRecord>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::get_recent_scans(&conn, limit.unwrap_or(20))
        .map_err(|e| format!("Failed to get scan history: {}", e))
        .map_err(Into::into)
}

/// Get all known devices.
#[tauri::command]
pub fn get_all_devices(state: tauri::State<'_, AppState>) -> CommandResult<Vec<DeviceRecord>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::get_all_devices(&conn)
        .map_err(|e| format!("Failed to get devices: {}", e))
        .map_err(Into::into)
}

/// Get device by MAC address.
#[tauri::command]
pub fn get_device_by_mac(
    state: tauri::State<'_, AppState>,
    mac: String,
) -> CommandResult<Option<DeviceRecord>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::get_device_by_mac(&conn, &mac)
        .map_err(|e| format!("Failed to get device: {}", e))
        .map_err(Into::into)
}

/// Update device custom name.
#[tauri::command]
pub fn update_device_name(
    state: tauri::State<'_, AppState>,
    mac: String,
    name: String,
) -> CommandResult<()> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::update_device_name(&conn, &mac, &name)
        .map_err(|e| format!("Failed to update device name: {}", e))
        .map_err(Into::into)
}

/// Get network statistics.
#[tauri::command]
pub fn get_network_stats(state: tauri::State<'_, AppState>) -> CommandResult<NetworkStats> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::get_network_stats(&conn)
        .map_err(|e| format!("Failed to get network stats: {}", e))
        .map_err(Into::into)
}

/// Get recent telemetry samples for one metric key.
#[tauri::command]
pub fn get_telemetry_series(
    state: tauri::State<'_, AppState>,
    metric_key: String,
    limit: Option<i32>,
) -> CommandResult<TelemetrySeries> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;
    let limit = limit.unwrap_or(30).clamp(1, 500);
    let mut points = queries::get_recent_telemetry(&conn, &metric_key, limit)
        .map_err(|e| format!("Failed to get telemetry series: {}", e))?;
    points.reverse();

    Ok(TelemetrySeries { metric_key, points })
}

/// Get unread alerts.
#[tauri::command]
pub fn get_unread_alerts(state: tauri::State<'_, AppState>) -> CommandResult<Vec<AlertRecord>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::get_unread_alerts(&conn)
        .map_err(|e| format!("Failed to get alerts: {}", e))
        .map_err(Into::into)
}

/// Get recent alerts (read + unread), newest first.
#[tauri::command]
pub fn get_recent_alerts(
    state: tauri::State<'_, AppState>,
    limit: Option<i32>,
) -> CommandResult<Vec<AlertRecord>> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;
    let capped_limit = limit.unwrap_or(200).clamp(1, 2000);

    queries::get_recent_alerts(&conn, capped_limit)
        .map_err(|e| format!("Failed to get recent alerts: {}", e))
        .map_err(Into::into)
}

/// Mark alert as read.
#[tauri::command]
pub fn mark_alert_read(state: tauri::State<'_, AppState>, alert_id: i64) -> CommandResult<()> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::mark_alert_read(&conn, alert_id)
        .map_err(|e| format!("Failed to mark alert read: {}", e))
        .map_err(Into::into)
}

/// Mark all alerts as read.
#[tauri::command]
pub fn mark_all_alerts_read(state: tauri::State<'_, AppState>) -> CommandResult<()> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::mark_all_alerts_read(&conn)
        .map_err(|e| format!("Failed to mark alerts read: {}", e))
        .map_err(Into::into)
}

/// Clear all alerts.
#[tauri::command]
pub fn clear_all_alerts(state: tauri::State<'_, AppState>) -> CommandResult<()> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    queries::clear_all_alerts(&conn)
        .map_err(|e| format!("Failed to clear alerts: {}", e))
        .map_err(Into::into)
}

/// Get database path (for diagnostics).
#[tauri::command]
pub fn get_database_path(state: tauri::State<'_, AppState>) -> CommandResult<String> {
    Ok(state.db.path().to_string_lossy().to_string())
}
