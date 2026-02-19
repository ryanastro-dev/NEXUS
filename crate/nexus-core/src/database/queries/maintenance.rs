use anyhow::{Context, Result};
use rusqlite::{Connection, params};

use crate::database::models::NormalizationSummary;

use super::helpers::{normalize_device_type, normalize_security_grade};

/// Normalize legacy rows so typed fields are stored in canonical string format.
///
/// This is safe to run multiple times; unchanged rows are skipped.
pub fn normalize_legacy_fields(conn: &Connection) -> Result<NormalizationSummary> {
    conn.execute_batch("SAVEPOINT normalize_legacy_fields")
        .context("Failed to start normalize_legacy_fields transaction")?;

    let normalize_result = (|| -> Result<NormalizationSummary> {
        let mut normalized_device_types = 0usize;
        let mut normalized_security_grades = 0usize;

        {
            let mut stmt = conn
                .prepare("SELECT id, device_type FROM devices WHERE device_type IS NOT NULL")
                .context("Failed to prepare devices normalization query")?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?))
                })
                .context("Failed to read devices for normalization")?;

            for row in rows {
                let (id, raw_device_type_opt) = row.context("Failed to decode device row")?;
                let Some(raw_device_type) = raw_device_type_opt else {
                    continue;
                };

                let normalized = normalize_device_type(&raw_device_type);
                if normalized != raw_device_type {
                    conn.execute(
                        "UPDATE devices SET device_type = ?2 WHERE id = ?1",
                        params![id, normalized],
                    )
                    .with_context(|| {
                        format!("Failed to normalize devices.device_type for id={id}")
                    })?;
                    normalized_device_types += 1;
                }
            }
        }

        {
            let mut stmt = conn
                .prepare("SELECT id, security_grade FROM device_history")
                .context("Failed to prepare device_history normalization query")?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, Option<String>>(1)?))
                })
                .context("Failed to read device_history for normalization")?;

            for row in rows {
                let (id, raw_grade_opt) = row.context("Failed to decode device_history row")?;
                let raw_grade = raw_grade_opt.unwrap_or_default();
                let normalized = normalize_security_grade(&raw_grade);

                if normalized != raw_grade {
                    conn.execute(
                        "UPDATE device_history SET security_grade = ?2 WHERE id = ?1",
                        params![id, normalized],
                    )
                    .with_context(|| {
                        format!("Failed to normalize device_history.security_grade for id={id}")
                    })?;
                    normalized_security_grades += 1;
                }
            }
        }

        Ok(NormalizationSummary {
            normalized_device_types,
            normalized_security_grades,
            rows_updated: normalized_device_types + normalized_security_grades,
        })
    })();

    match normalize_result {
        Ok(summary) => {
            conn.execute_batch("RELEASE SAVEPOINT normalize_legacy_fields")
                .context("Failed to commit normalize_legacy_fields transaction")?;
            Ok(summary)
        }
        Err(error) => {
            let _ = conn.execute_batch(
                "ROLLBACK TO SAVEPOINT normalize_legacy_fields; RELEASE SAVEPOINT normalize_legacy_fields",
            );
            Err(error)
        }
    }
}
