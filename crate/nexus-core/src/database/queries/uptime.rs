use anyhow::{Context, Result};
use rusqlite::{Connection, OptionalExtension, params};

const SNMP_TIMETICKS_WRAP_SECONDS: u64 = (u32::MAX as u64) / 100;
const WRAP_PREV_NEAR_MAX_SECONDS: u64 = SNMP_TIMETICKS_WRAP_SECONDS - (7 * 24 * 60 * 60);
const WRAP_CURRENT_LOW_SECONDS: u64 = 7 * 24 * 60 * 60;

#[derive(Debug, Clone)]
struct SnmpUptimeRow {
    last_raw_uptime_seconds: u64,
    wrap_count: u64,
    reboot_count: u64,
    continuous_uptime_seconds: u64,
}

fn load_uptime_row(conn: &Connection, device_key: &str) -> Result<Option<SnmpUptimeRow>> {
    conn.query_row(
        r#"
        SELECT last_raw_uptime_seconds, wrap_count, reboot_count, continuous_uptime_seconds
        FROM snmp_uptime_state
        WHERE device_key = ?1
        "#,
        params![device_key],
        |row| {
            Ok(SnmpUptimeRow {
                last_raw_uptime_seconds: row.get::<_, i64>(0)? as u64,
                wrap_count: row.get::<_, i64>(1)? as u64,
                reboot_count: row.get::<_, i64>(2)? as u64,
                continuous_uptime_seconds: row.get::<_, i64>(3)? as u64,
            })
        },
    )
    .optional()
    .context("Failed to load SNMP uptime continuity state")
}

fn persist_uptime_row(conn: &Connection, device_key: &str, row: &SnmpUptimeRow) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO snmp_uptime_state (
            device_key,
            last_raw_uptime_seconds,
            wrap_count,
            reboot_count,
            continuous_uptime_seconds,
            updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        ON CONFLICT(device_key) DO UPDATE SET
            last_raw_uptime_seconds = excluded.last_raw_uptime_seconds,
            wrap_count = excluded.wrap_count,
            reboot_count = excluded.reboot_count,
            continuous_uptime_seconds = excluded.continuous_uptime_seconds,
            updated_at = excluded.updated_at
        "#,
        params![
            device_key,
            row.last_raw_uptime_seconds as i64,
            row.wrap_count as i64,
            row.reboot_count as i64,
            row.continuous_uptime_seconds as i64,
        ],
    )
    .context("Failed to persist SNMP uptime continuity state")?;

    Ok(())
}

fn normalize_device_key(device_key: &str) -> String {
    device_key.trim().to_ascii_uppercase()
}

/// Apply persisted wrap-aware continuity model for SNMP uptime.
///
/// SNMP `sysUpTime` wraps roughly every 497 days.
/// This keeps uptime monotonic across wraps while still resetting on real reboot.
pub fn apply_snmp_uptime_continuity(
    conn: &Connection,
    device_key: &str,
    raw_uptime_seconds: u64,
) -> Result<u64> {
    let device_key = normalize_device_key(device_key);
    if device_key.is_empty() {
        return Ok(raw_uptime_seconds);
    }

    let existing = load_uptime_row(conn, &device_key)?;

    let next = match existing {
        None => SnmpUptimeRow {
            last_raw_uptime_seconds: raw_uptime_seconds,
            wrap_count: 0,
            reboot_count: 0,
            continuous_uptime_seconds: raw_uptime_seconds,
        },
        Some(mut row) => {
            if raw_uptime_seconds >= row.last_raw_uptime_seconds {
                let candidate = raw_uptime_seconds
                    .saturating_add(row.wrap_count.saturating_mul(SNMP_TIMETICKS_WRAP_SECONDS));
                row.continuous_uptime_seconds =
                    std::cmp::max(row.continuous_uptime_seconds, candidate);
            } else {
                let wrap_detected = row.last_raw_uptime_seconds >= WRAP_PREV_NEAR_MAX_SECONDS
                    && raw_uptime_seconds <= WRAP_CURRENT_LOW_SECONDS;

                if wrap_detected {
                    row.wrap_count = row.wrap_count.saturating_add(1);
                    let candidate = raw_uptime_seconds
                        .saturating_add(row.wrap_count.saturating_mul(SNMP_TIMETICKS_WRAP_SECONDS));
                    row.continuous_uptime_seconds =
                        std::cmp::max(row.continuous_uptime_seconds, candidate);
                    tracing::info!(
                        device_key = %device_key,
                        wrap_count = row.wrap_count,
                        "Detected SNMP sysUpTime wrap; preserving uptime continuity"
                    );
                } else {
                    row.wrap_count = 0;
                    row.reboot_count = row.reboot_count.saturating_add(1);
                    row.continuous_uptime_seconds = raw_uptime_seconds;
                    tracing::debug!(
                        device_key = %device_key,
                        reboot_count = row.reboot_count,
                        "SNMP uptime decreased without wrap pattern; treating as reboot"
                    );
                }
            }

            row.last_raw_uptime_seconds = raw_uptime_seconds;
            row
        }
    };

    persist_uptime_row(conn, &device_key, &next)?;
    Ok(next.continuous_uptime_seconds)
}
