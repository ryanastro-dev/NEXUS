mod nvd;
mod runtime;

use nexus_core::{
    AppEvent,
    database::seed_cves::{seed_port_warnings, seed_vulnerabilities},
};
use tauri::Emitter;

use self::nvd::{
    extract_cvss, extract_description, extract_vendor_product, fetch_nvd_vulnerabilities,
    parse_sync_range,
};
pub use self::runtime::AiRuntimeSettingsInput;
use super::shared::{get_db_connection, lock_db_connection, vulnerability_db_status_from_conn};
use super::types::{VulnerabilityDbStatus, VulnerabilitySyncReport};
use super::{AppState, CommandResult};

/// Apply runtime-tunable core engine settings from the GUI.
#[tauri::command]
pub fn apply_runtime_settings(
    snmp_enabled: bool,
    snmp_community: String,
    tcp_ports: Vec<u16>,
    monitoring_interval_seconds: Option<u64>,
) -> CommandResult<()> {
    runtime::apply_runtime_settings_impl(
        snmp_enabled,
        snmp_community,
        tcp_ports,
        monitoring_interval_seconds,
    )
    .map_err(Into::into)
}

/// Apply runtime AI routing/provider settings from the GUI.
#[tauri::command]
pub fn apply_ai_runtime_settings(settings: AiRuntimeSettingsInput) -> CommandResult<()> {
    runtime::apply_ai_runtime_settings_impl(settings).map_err(Into::into)
}

/// Read vulnerability database status for Settings diagnostics.
#[tauri::command]
pub fn get_vulnerability_db_status(
    state: tauri::State<'_, AppState>,
) -> CommandResult<VulnerabilityDbStatus> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;
    vulnerability_db_status_from_conn(&conn).map_err(Into::into)
}

/// Re-seed embedded vulnerability and port warning datasets.
#[tauri::command]
pub fn sync_vulnerability_db(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> CommandResult<VulnerabilityDbStatus> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    let _ = app.emit(
        "engine-event",
        AppEvent::Info {
            message: "Refreshing embedded vulnerability database".to_string(),
        },
    );

    seed_vulnerabilities(&conn)
        .map_err(|e| format!("Failed to seed vulnerability cache: {}", e))?;
    seed_port_warnings(&conn).map_err(|e| format!("Failed to seed port warnings: {}", e))?;

    vulnerability_db_status_from_conn(&conn).map_err(Into::into)
}

/// Pull CVE records from NVD feed and upsert into local vulnerability cache.
#[tauri::command]
pub async fn sync_vulnerability_feed(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    sync_range: Option<String>,
) -> CommandResult<VulnerabilitySyncReport> {
    let requested_range = sync_range.unwrap_or_else(|| "latest_1000".to_string());
    let (normalized_range, _, _) = parse_sync_range(&requested_range);

    let _ = app.emit(
        "engine-event",
        AppEvent::Info {
            message: format!("Starting online vulnerability sync ({})", normalized_range),
        },
    );

    let cves = fetch_nvd_vulnerabilities(&normalized_range).await?;
    let fetched_records = cves.len();

    let db_conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&db_conn)?;

    conn.execute_batch("BEGIN IMMEDIATE TRANSACTION")
        .map_err(|e| format!("Failed to start vulnerability sync transaction: {}", e))?;

    let mut upserted_records = 0usize;
    let upsert_result: Result<(), String> = (|| {
        for cve in &cves {
            let (vendor, product) = extract_vendor_product(cve);
            let description = extract_description(cve);
            let (severity, cvss_score) = extract_cvss(cve);

            conn.execute(
                r#"
                INSERT INTO cve_cache (
                    vendor, product, cve_id, description, severity, cvss_score, published_date, source
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'nvd')
                ON CONFLICT(vendor, cve_id) DO UPDATE SET
                    product = excluded.product,
                    description = excluded.description,
                    severity = excluded.severity,
                    cvss_score = excluded.cvss_score,
                    published_date = excluded.published_date,
                    source = excluded.source
                "#,
                rusqlite::params![
                    vendor,
                    product,
                    cve.id,
                    description,
                    severity,
                    cvss_score,
                    cve.published
                ],
            )
            .map_err(|e| format!("Failed to upsert CVE {}: {}", cve.id, e))?;

            upserted_records += 1;
        }
        Ok(())
    })();

    if let Err(error) = upsert_result {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(error.into());
    }

    seed_port_warnings(&conn)
        .map_err(|e| format!("Failed to ensure port warnings after sync: {}", e))?;

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("Failed to commit vulnerability sync transaction: {}", e))?;

    let status = vulnerability_db_status_from_conn(&conn)?;

    let _ = app.emit(
        "engine-event",
        AppEvent::Info {
            message: format!(
                "Online vulnerability sync complete: {} records fetched, {} upserted",
                fetched_records, upserted_records
            ),
        },
    );

    Ok(VulnerabilitySyncReport {
        source: "nvd".to_string(),
        range: normalized_range,
        fetched_records,
        upserted_records,
        status,
    })
}
