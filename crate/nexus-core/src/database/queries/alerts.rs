use anyhow::{Context, Result};
use rusqlite::{Connection, OptionalExtension, params};

use crate::database::models::{AlertRecord, AlertSeverity, AlertType};

use super::helpers::{
    parse_alert_severity_or_default, parse_alert_type_or_default, parse_datetime_column,
};

/// Parameters used to insert an alert record.
pub struct AlertInsert<'a> {
    pub alert_type: AlertType,
    pub device_id: Option<i64>,
    pub device_mac: Option<&'a str>,
    pub device_ip: Option<&'a str>,
    pub dedupe_key: Option<&'a str>,
    pub message: &'a str,
    pub severity: AlertSeverity,
}

/// Insert an alert.
pub fn insert_alert(
    conn: &Connection,
    alert_type: AlertType,
    device_id: Option<i64>,
    device_mac: Option<&str>,
    device_ip: Option<&str>,
    message: &str,
    severity: AlertSeverity,
) -> Result<i64> {
    let alert = AlertInsert {
        alert_type,
        device_id,
        device_mac,
        device_ip,
        dedupe_key: None,
        message,
        severity,
    };
    insert_alert_with_dedupe_key(conn, &alert)
}

/// Insert an alert with an optional semantic dedupe key.
pub fn insert_alert_with_dedupe_key(conn: &Connection, alert: &AlertInsert<'_>) -> Result<i64> {
    conn.execute(
        r#"
        INSERT INTO alerts (
            alert_type, device_id, device_mac, device_ip, dedupe_key, message, severity
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            alert.alert_type.to_string(),
            alert.device_id,
            alert.device_mac,
            alert.device_ip,
            alert.dedupe_key,
            alert.message,
            alert.severity.to_string(),
        ],
    )
    .context("Failed to insert alert")?;

    Ok(conn.last_insert_rowid())
}

/// Insert alert only if a matching unread alert does not already exist recently.
pub fn insert_alert_if_not_exists(
    conn: &Connection,
    alert: &AlertInsert<'_>,
    dedupe_key: &str,
    dedupe_window_minutes: i64,
) -> Result<Option<i64>> {
    let window_minutes = dedupe_window_minutes.max(1);
    let window_expr = format!("-{} minutes", window_minutes);

    let existing: Option<i64> = conn
        .query_row(
            r#"
            SELECT id
            FROM alerts
            WHERE alert_type = ?1
              AND COALESCE(device_mac, '') = COALESCE(?2, '')
              AND COALESCE(dedupe_key, '') = ?3
              AND is_read = 0
              AND created_at >= datetime('now', ?4)
            ORDER BY id DESC
            LIMIT 1
            "#,
            params![
                alert.alert_type.to_string(),
                alert.device_mac,
                dedupe_key,
                window_expr
            ],
            |row| row.get(0),
        )
        .optional()?;

    if existing.is_some() {
        return Ok(None);
    }

    let deduped_alert = AlertInsert {
        alert_type: alert.alert_type.clone(),
        device_id: alert.device_id,
        device_mac: alert.device_mac,
        device_ip: alert.device_ip,
        dedupe_key: Some(dedupe_key),
        message: alert.message,
        severity: alert.severity.clone(),
    };

    let id = insert_alert_with_dedupe_key(conn, &deduped_alert)?;
    Ok(Some(id))
}

/// Get unread alerts.
pub fn get_unread_alerts(conn: &Connection) -> Result<Vec<AlertRecord>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, created_at, alert_type, device_id, device_mac, device_ip,
               message, severity, is_read
        FROM alerts
        WHERE is_read = 0
        ORDER BY created_at DESC
        "#,
    )?;

    let alerts = stmt
        .query_map([], |row| {
            let alert_type_str: String = row.get(2)?;
            let severity_str: String = row.get(7)?;

            Ok(AlertRecord {
                id: row.get(0)?,
                created_at: parse_datetime_column(row.get::<_, String>(1)?, 1)?,
                alert_type: parse_alert_type_or_default(&alert_type_str),
                device_id: row.get(3)?,
                device_mac: row.get(4)?,
                device_ip: row.get(5)?,
                message: row.get(6)?,
                severity: parse_alert_severity_or_default(&severity_str),
                is_read: row.get::<_, i32>(8)? == 1,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(alerts)
}

/// Mark alert as read.
pub fn mark_alert_read(conn: &Connection, alert_id: i64) -> Result<()> {
    conn.execute(
        "UPDATE alerts SET is_read = 1 WHERE id = ?1",
        params![alert_id],
    )
    .context("Failed to mark alert read")?;
    Ok(())
}

/// Mark all alerts as read.
pub fn mark_all_alerts_read(conn: &Connection) -> Result<()> {
    conn.execute("UPDATE alerts SET is_read = 1", [])
        .context("Failed to mark all alerts read")?;
    Ok(())
}

/// Clear all alerts.
pub fn clear_all_alerts(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM alerts", [])
        .context("Failed to clear all alerts")?;
    Ok(())
}
