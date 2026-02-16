use anyhow::{Context, Result};
use chrono::{DateTime, Utc};

use crate::database::models::{AlertSeverity, AlertType};

pub(super) fn parse_datetime(value: String) -> Result<DateTime<Utc>> {
    DateTime::parse_from_str(&format!("{} +0000", value), "%Y-%m-%d %H:%M:%S %z")
        .map(|dt| dt.with_timezone(&Utc))
        .with_context(|| format!("Invalid datetime value in database: {}", value))
}

pub(super) fn parse_datetime_column(
    value: String,
    column: usize,
) -> rusqlite::Result<DateTime<Utc>> {
    DateTime::parse_from_str(&format!("{} +0000", value), "%Y-%m-%d %H:%M:%S %z")
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                column,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })
}

pub(super) fn parse_alert_type_or_default(raw: &str) -> AlertType {
    match raw.parse() {
        Ok(value) => value,
        Err(_) => {
            tracing::warn!("Unknown alert type in database: {}", raw);
            AlertType::Custom
        }
    }
}

pub(super) fn parse_alert_severity_or_default(raw: &str) -> AlertSeverity {
    match raw.parse() {
        Ok(value) => value,
        Err(_) => {
            tracing::warn!("Unknown alert severity in database: {}", raw);
            AlertSeverity::Info
        }
    }
}
