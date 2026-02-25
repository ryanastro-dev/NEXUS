//! Database query functions.
//!
//! CRUD operations for scans, devices, alerts, telemetry, and security lookups.

mod alerts;
mod devices;
mod helpers;
mod maintenance;
mod scan;
mod security;
mod stats;
mod telemetry;
mod uptime;

pub use alerts::{
    AlertInsert, clear_all_alerts, get_recent_alerts, get_unread_alerts, insert_alert,
    insert_alert_if_not_exists, insert_alert_with_dedupe_key, mark_alert_read,
    mark_all_alerts_read,
};
pub use devices::{get_all_devices, get_device_by_mac, get_device_history, update_device_name};
pub use maintenance::normalize_legacy_fields;
pub use scan::{get_recent_scans, insert_scan};
pub use security::{lookup_port_warnings, lookup_vulnerabilities};
pub use stats::{get_latest_scan_hosts, get_network_stats};
pub use telemetry::{get_recent_telemetry, insert_telemetry_sample};
pub use uptime::apply_snmp_uptime_continuity;

#[cfg(test)]
mod tests;
