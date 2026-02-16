use anyhow::{Context, Result};
use rusqlite::{Connection, params};

use crate::database::models::{DeviceHistoryRecord, DeviceRecord};

use super::helpers::parse_datetime_column;

/// Get all devices.
pub fn get_all_devices(conn: &Connection) -> Result<Vec<DeviceRecord>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, mac, first_seen, last_seen, last_ip, vendor, risk_score,
               device_type, hostname, os_guess, custom_name, notes
        FROM devices
        ORDER BY last_seen DESC
        "#,
    )?;

    let devices = stmt
        .query_map([], |row| {
            Ok(DeviceRecord {
                id: row.get(0)?,
                mac: row.get(1)?,
                first_seen: parse_datetime_column(row.get::<_, String>(2)?, 2)?,
                last_seen: parse_datetime_column(row.get::<_, String>(3)?, 3)?,
                last_ip: row.get(4)?,
                vendor: row.get(5)?,
                risk_score: row.get(6)?,
                device_type: row.get(7)?,
                hostname: row.get(8)?,
                os_guess: row.get(9)?,
                custom_name: row.get(10)?,
                notes: row.get(11)?,
                security_grade: None,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(devices)
}

/// Get device by MAC address.
pub fn get_device_by_mac(conn: &Connection, mac: &str) -> Result<Option<DeviceRecord>> {
    let result = conn.query_row(
        r#"
        SELECT id, mac, first_seen, last_seen, last_ip, vendor, risk_score,
               device_type, hostname, os_guess, custom_name, notes
        FROM devices WHERE mac = ?1
        "#,
        params![mac],
        |row| {
            Ok(DeviceRecord {
                id: row.get(0)?,
                mac: row.get(1)?,
                first_seen: parse_datetime_column(row.get::<_, String>(2)?, 2)?,
                last_seen: parse_datetime_column(row.get::<_, String>(3)?, 3)?,
                last_ip: row.get(4)?,
                vendor: row.get(5)?,
                risk_score: row.get(6)?,
                device_type: row.get(7)?,
                hostname: row.get(8)?,
                os_guess: row.get(9)?,
                custom_name: row.get(10)?,
                notes: row.get(11)?,
                security_grade: None,
            })
        },
    );

    match result {
        Ok(device) => Ok(Some(device)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

/// Update device custom name.
pub fn update_device_name(conn: &Connection, mac: &str, custom_name: &str) -> Result<()> {
    conn.execute(
        "UPDATE devices SET custom_name = ?2 WHERE mac = ?1",
        params![mac, custom_name],
    )
    .context("Failed to update device name")?;
    Ok(())
}

/// Get device history for a specific device.
pub fn get_device_history(
    conn: &Connection,
    device_id: i64,
    limit: i32,
) -> Result<Vec<DeviceHistoryRecord>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, scan_id, device_id, ip, response_time_ms, ttl,
               risk_score, is_online, discovery_method, open_ports
        FROM device_history
        WHERE device_id = ?1
        ORDER BY id DESC
        LIMIT ?2
        "#,
    )?;

    let history = stmt
        .query_map(params![device_id, limit], |row| {
            let ports_str: String = row.get::<_, Option<String>>(9)?.unwrap_or_default();
            let open_ports: Vec<u16> = ports_str
                .split(',')
                .filter_map(|value| value.parse().ok())
                .collect();

            Ok(DeviceHistoryRecord {
                id: row.get(0)?,
                scan_id: row.get(1)?,
                device_id: row.get(2)?,
                ip: row.get(3)?,
                response_time_ms: row.get(4)?,
                ttl: row.get(5)?,
                risk_score: row.get(6)?,
                is_online: row.get::<_, i32>(7)? == 1,
                discovery_method: row.get(8)?,
                open_ports,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(history)
}
