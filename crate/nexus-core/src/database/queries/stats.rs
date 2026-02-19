use anyhow::Result;
use rusqlite::{Connection, OptionalExtension};

use crate::database::models::NetworkStats;
use crate::models::HostInfo;

use super::helpers::{normalize_device_type, normalize_security_grade, parse_datetime};

/// Get host-like records from the latest scan for insight calculations.
pub fn get_latest_scan_hosts(conn: &Connection) -> Result<Vec<HostInfo>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT
            d.last_ip,
            d.mac,
            d.vendor,
            d.device_type,
            d.hostname,
            dh.response_time_ms,
            dh.risk_score,
            dh.is_randomized,
            dh.security_grade,
            dh.open_ports
        FROM device_history dh
        JOIN devices d ON d.id = dh.device_id
        WHERE dh.scan_id = (SELECT MAX(id) FROM scans)
        ORDER BY d.mac
        "#,
    )?;

    let hosts = stmt
        .query_map([], |row| {
            let ip = row
                .get::<_, Option<String>>(0)?
                .unwrap_or_else(|| "0.0.0.0".to_string());
            let mac: String = row.get(1)?;
            let vendor: Option<String> = row.get(2)?;
            let device_type = row
                .get::<_, Option<String>>(3)?
                .map(|value| normalize_device_type(&value))
                .unwrap_or_else(|| normalize_device_type("UNKNOWN"));
            let hostname: Option<String> = row.get(4)?;
            let response_time_ms = row.get::<_, Option<i64>>(5)?.map(|value| value as u64);
            let raw_risk_score: i32 = row.get(6)?;
            let risk_score = if raw_risk_score < 0 {
                tracing::warn!(
                    "Negative risk_score {} found in database; clamping to 0",
                    raw_risk_score
                );
                0
            } else if raw_risk_score > 100 {
                tracing::warn!(
                    "Out-of-range risk_score {} found in database; clamping to 100",
                    raw_risk_score
                );
                100
            } else {
                raw_risk_score as u8
            };
            let is_randomized = row.get::<_, i32>(7)? == 1;
            let security_grade_raw = row.get::<_, Option<String>>(8)?.unwrap_or_default();
            let ports_str = row.get::<_, Option<String>>(9)?.unwrap_or_default();

            let mut host = HostInfo::new(ip, mac, device_type, "DATABASE".to_string());
            host.vendor = vendor;
            host.hostname = hostname;
            host.response_time_ms = response_time_ms;
            host.risk_score = risk_score;
            host.is_randomized = is_randomized;
            host.security_grade = normalize_security_grade(&security_grade_raw);
            host.open_ports = ports_str
                .split(',')
                .filter(|port| !port.is_empty())
                .filter_map(|port| port.parse::<u16>().ok())
                .collect();
            if host.security_grade.is_empty() {
                let inferred_grade = crate::insights::calculate_security_grade_enum(&host);
                host.set_security_grade_enum(inferred_grade);
            }
            Ok(host)
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(hosts)
}

/// Get network statistics.
pub fn get_network_stats(conn: &Connection) -> Result<NetworkStats> {
    let total_devices: i64 =
        conn.query_row("SELECT COUNT(*) FROM devices", [], |row| row.get(0))?;

    let online_devices: i64 = conn
        .query_row(
            r#"
        SELECT COUNT(DISTINCT device_id) FROM device_history
        WHERE scan_id = (SELECT MAX(id) FROM scans)
        "#,
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let offline_devices = total_devices - online_devices;

    let new_devices_24h: i64 = conn.query_row(
        r#"
        SELECT COUNT(*) FROM devices
        WHERE first_seen >= datetime('now', '-24 hours')
        "#,
        [],
        |row| row.get(0),
    )?;

    let high_risk_devices: i64 = conn
        .query_row(
            r#"
        SELECT COUNT(DISTINCT device_id) FROM device_history
        WHERE scan_id = (SELECT MAX(id) FROM scans) AND risk_score > 70
        "#,
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_scans: i64 = conn.query_row("SELECT COUNT(*) FROM scans", [], |row| row.get(0))?;

    let last_scan_time_raw: Option<String> = conn
        .query_row(
            "SELECT scan_time FROM scans ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?;

    let last_scan_time = match last_scan_time_raw {
        Some(raw) => Some(parse_datetime(raw)?),
        None => None,
    };

    Ok(NetworkStats {
        total_devices,
        online_devices,
        offline_devices,
        new_devices_24h,
        high_risk_devices,
        total_scans,
        last_scan_time,
    })
}
