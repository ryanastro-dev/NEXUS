use anyhow::{Context, Result};
use chrono::{DateTime, Utc};

use crate::database::models::{AlertSeverity, AlertType};
use crate::models::SecurityGrade;
use crate::network::DeviceType;

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

pub(super) fn normalize_device_type(raw: &str) -> String {
    raw.parse::<DeviceType>()
        .unwrap_or(DeviceType::Unknown)
        .to_string()
}

pub(super) fn normalize_optional_device_type(raw: Option<String>) -> Option<String> {
    raw.map(|value| normalize_device_type(&value))
}

pub(super) fn normalize_security_grade(raw: &str) -> String {
    raw.parse::<SecurityGrade>()
        .unwrap_or(SecurityGrade::Unknown)
        .to_string()
}
