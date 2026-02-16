use std::sync::{Arc, Mutex};

use super::super::state::AppState;
use super::super::types::VulnerabilityDbStatus;

pub(crate) fn get_db_connection(
    state: &tauri::State<'_, AppState>,
) -> Result<Arc<Mutex<rusqlite::Connection>>, String> {
    let db = state
        .db
        .lock()
        .map_err(|_| "Database state lock poisoned".to_string())?;
    Ok(db.connection())
}

pub(crate) fn lock_db_connection(
    conn: &Arc<Mutex<rusqlite::Connection>>,
) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, String> {
    conn.lock()
        .map_err(|_| "Database connection lock poisoned".to_string())
}

pub(crate) fn vulnerability_db_status_from_conn(
    conn: &rusqlite::Connection,
) -> Result<VulnerabilityDbStatus, String> {
    let cve_total: i64 = conn
        .query_row("SELECT COUNT(*) FROM cve_cache", [], |row| row.get(0))
        .map_err(|error| format!("Failed to query vulnerability count: {}", error))?;

    let embedded_cve_total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cve_cache WHERE source = 'embedded'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Failed to query embedded vulnerability count: {}", error))?;

    let port_warning_total: i64 = conn
        .query_row("SELECT COUNT(*) FROM port_warnings", [], |row| row.get(0))
        .map_err(|error| format!("Failed to query port warning count: {}", error))?;

    let last_published_date: Option<String> = conn
        .query_row("SELECT MAX(published_date) FROM cve_cache", [], |row| {
            row.get(0)
        })
        .map_err(|error| {
            format!(
                "Failed to query latest vulnerability publication date: {}",
                error
            )
        })?;

    Ok(VulnerabilityDbStatus {
        cve_total,
        embedded_cve_total,
        port_warning_total,
        last_published_date,
    })
}
