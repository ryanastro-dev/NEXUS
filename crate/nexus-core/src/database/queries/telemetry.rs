use anyhow::{Context, Result};
use rusqlite::{Connection, params};

use crate::database::models::TelemetrySample;

use super::helpers::parse_datetime_column;

/// Insert a telemetry sample for historical charting.
pub fn insert_telemetry_sample(
    conn: &Connection,
    metric_key: &str,
    metric_value: f64,
    label: Option<&str>,
) -> Result<()> {
    conn.execute(
        r#"
        INSERT INTO telemetry_samples (metric_key, metric_value, label)
        VALUES (?1, ?2, ?3)
        "#,
        params![metric_key, metric_value, label],
    )
    .with_context(|| {
        format!(
            "Failed to insert telemetry sample for metric '{}'",
            metric_key
        )
    })?;

    Ok(())
}

/// Return recent telemetry samples for a specific metric key.
pub fn get_recent_telemetry(
    conn: &Connection,
    metric_key: &str,
    limit: i32,
) -> Result<Vec<TelemetrySample>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, captured_at, metric_key, metric_value, label
        FROM telemetry_samples
        WHERE metric_key = ?1
        ORDER BY captured_at DESC, id DESC
        LIMIT ?2
        "#,
    )?;

    let samples = stmt
        .query_map(params![metric_key, limit], |row| {
            Ok(TelemetrySample {
                id: row.get(0)?,
                captured_at: parse_datetime_column(row.get::<_, String>(1)?, 1)?,
                metric_key: row.get(2)?,
                metric_value: row.get(3)?,
                label: row.get(4)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(samples)
}
