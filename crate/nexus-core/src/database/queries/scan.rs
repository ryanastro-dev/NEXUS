use anyhow::{Context, Result};
use rusqlite::{Connection, OptionalExtension, params};

use crate::database::models::ScanRecord;
use crate::models::{HostInfo, ScanResult};

use super::helpers::{normalize_device_type, normalize_security_grade, parse_datetime_column};

/// Insert a scan result into the database.
pub fn insert_scan(conn: &Connection, result: &ScanResult) -> Result<i64> {
    conn.execute_batch("SAVEPOINT insert_scan")
        .context("Failed to start insert_scan transaction")?;

    let insert_result = (|| -> Result<i64> {
        conn.execute(
            r#"
            INSERT INTO scans (
                interface_name, local_ip, local_mac, subnet, scan_method,
                arp_discovered, icmp_discovered, total_hosts, duration_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            params![
                result.interface_name,
                result.local_ip,
                result.local_mac,
                result.subnet,
                result.scan_method,
                result.arp_discovered as i32,
                result.icmp_discovered as i32,
                result.total_hosts as i32,
                result.scan_duration_ms as i64,
            ],
        )
        .context("Failed to insert scan")?;

        let scan_id = conn.last_insert_rowid();

        for host in &result.active_hosts {
            upsert_device_from_host(conn, host, scan_id)?;
        }

        Ok(scan_id)
    })();

    match insert_result {
        Ok(scan_id) => {
            conn.execute_batch("RELEASE SAVEPOINT insert_scan")
                .context("Failed to commit insert_scan transaction")?;
            Ok(scan_id)
        }
        Err(error) => {
            let _ = conn
                .execute_batch("ROLLBACK TO SAVEPOINT insert_scan; RELEASE SAVEPOINT insert_scan");
            Err(error)
        }
    }
}

fn upsert_device_from_host(conn: &Connection, host: &HostInfo, scan_id: i64) -> Result<i64> {
    let normalized_device_type = normalize_device_type(&host.device_type);
    let normalized_security_grade = normalize_security_grade(&host.security_grade);

    let existing_device_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM devices WHERE mac = ?1",
            params![&host.mac],
            |row| row.get(0),
        )
        .optional()
        .context("Failed to lookup existing device by MAC")?;

    let device_id = if let Some(id) = existing_device_id {
        conn.execute(
            r#"
            UPDATE devices SET
                last_seen = datetime('now'),
                last_ip = ?2,
                vendor = COALESCE(?3, vendor),
                is_randomized = ?4,
                risk_score = ?5,
                device_type = COALESCE(?6, device_type),
                hostname = COALESCE(?7, hostname),
                os_guess = COALESCE(?8, os_guess)
            WHERE id = ?1
            "#,
            params![
                id,
                &host.ip,
                &host.vendor,
                if host.is_randomized { 1 } else { 0 },
                host.risk_score as i32,
                &normalized_device_type,
                &host.hostname,
                &host.os_guess,
            ],
        )
        .context("Failed to update device")?;
        id
    } else {
        conn.execute(
            r#"
            INSERT INTO devices (
                mac, last_ip, vendor, is_randomized, risk_score, device_type, hostname, os_guess
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            params![
                &host.mac,
                &host.ip,
                &host.vendor,
                if host.is_randomized { 1 } else { 0 },
                host.risk_score as i32,
                &normalized_device_type,
                &host.hostname,
                &host.os_guess,
            ],
        )
        .context("Failed to insert device")?;
        conn.last_insert_rowid()
    };

    let open_ports = host
        .open_ports
        .iter()
        .map(|port| port.to_string())
        .collect::<Vec<_>>()
        .join(",");

    conn.execute(
        r#"
        INSERT INTO device_history (
            scan_id, device_id, ip, response_time_ms, ttl, risk_score, is_randomized,
            security_grade, is_online, discovery_method, open_ports
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        "#,
        params![
            scan_id,
            device_id,
            &host.ip,
            host.response_time_ms.map(|t| t as i64),
            host.ttl.map(|t| t as i32),
            host.risk_score as i32,
            if host.is_randomized { 1 } else { 0 },
            &normalized_security_grade,
            true,
            &host.discovery_method,
            open_ports,
        ],
    )
    .context("Failed to insert device history")?;

    Ok(device_id)
}

/// Get recent scans.
pub fn get_recent_scans(conn: &Connection, limit: i32) -> Result<Vec<ScanRecord>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, scan_time, interface_name, local_ip, local_mac, subnet,
               scan_method, arp_discovered, icmp_discovered, total_hosts, duration_ms
        FROM scans
        ORDER BY scan_time DESC
        LIMIT ?1
        "#,
    )?;

    let scans = stmt
        .query_map(params![limit], |row| {
            Ok(ScanRecord {
                id: row.get(0)?,
                scan_time: parse_datetime_column(row.get::<_, String>(1)?, 1)?,
                interface_name: row.get(2)?,
                local_ip: row.get(3)?,
                local_mac: row.get(4)?,
                subnet: row.get(5)?,
                scan_method: row.get(6)?,
                arp_discovered: row.get(7)?,
                icmp_discovered: row.get(8)?,
                total_hosts: row.get(9)?,
                duration_ms: row.get(10)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(scans)
}
