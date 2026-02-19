use chrono::{Duration as ChronoDuration, SecondsFormat, Utc};
use nexus_core::{
    database::seed_cves::{seed_port_warnings, seed_vulnerabilities},
    AppEvent,
};
use tauri::Emitter;

use super::shared::{get_db_connection, lock_db_connection, vulnerability_db_status_from_conn};
use super::state::AppState;
use super::types::{VulnerabilityDbStatus, VulnerabilitySyncReport};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct AiRuntimeSettingsInput {
    pub enabled: bool,
    pub mode: String,
    pub timeout_ms: u64,
    pub ollama_endpoint: String,
    pub ollama_model: String,
    pub gemini_endpoint: String,
    pub gemini_model: String,
    pub gemini_api_key: Option<String>,
    pub cloud_allow_sensitive: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdResponse {
    #[serde(default)]
    vulnerabilities: Vec<NvdVulnerabilityEnvelope>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdVulnerabilityEnvelope {
    cve: NvdCve,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdCve {
    id: String,
    #[serde(default)]
    published: Option<String>,
    #[serde(default)]
    descriptions: Vec<NvdDescription>,
    #[serde(default)]
    metrics: Option<NvdMetrics>,
    #[serde(default)]
    configurations: Option<Vec<NvdConfiguration>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdDescription {
    lang: String,
    value: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdMetrics {
    #[serde(default, rename = "cvssMetricV31")]
    cvss_metric_v31: Option<Vec<NvdCvssMetric>>,
    #[serde(default, rename = "cvssMetricV30")]
    cvss_metric_v30: Option<Vec<NvdCvssMetric>>,
    #[serde(default, rename = "cvssMetricV2")]
    cvss_metric_v2: Option<Vec<NvdCvssMetric>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdCvssMetric {
    #[serde(default, rename = "cvssData")]
    cvss_data: Option<NvdCvssData>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdCvssData {
    #[serde(default, rename = "baseScore")]
    base_score: Option<f64>,
    #[serde(default, rename = "baseSeverity")]
    base_severity: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdConfiguration {
    #[serde(default)]
    nodes: Vec<NvdNode>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdNode {
    #[serde(default, rename = "cpeMatch")]
    cpe_match: Vec<NvdCpeMatch>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct NvdCpeMatch {
    #[serde(default)]
    vulnerable: Option<bool>,
    criteria: String,
}

fn cpe_to_vendor_product(criteria: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = criteria.split(':').collect();
    if parts.len() < 6 {
        return None;
    }

    let vendor = parts[3].trim();
    let product = parts[4].trim();
    if vendor.is_empty() || vendor == "*" || product.is_empty() || product == "*" {
        return None;
    }

    Some((vendor.to_string(), product.to_string()))
}

fn extract_vendor_product(cve: &NvdCve) -> (String, Option<String>) {
    let Some(configurations) = cve.configurations.as_ref() else {
        return ("*".to_string(), None);
    };

    for configuration in configurations {
        for node in &configuration.nodes {
            for cpe_match in &node.cpe_match {
                if cpe_match.vulnerable == Some(false) {
                    continue;
                }
                if let Some((vendor, product)) = cpe_to_vendor_product(&cpe_match.criteria) {
                    return (vendor, Some(product));
                }
            }
        }
    }

    ("*".to_string(), None)
}

fn extract_cvss(cve: &NvdCve) -> (String, Option<f64>) {
    let Some(metrics) = cve.metrics.as_ref() else {
        return ("UNKNOWN".to_string(), None);
    };

    for entries in [
        &metrics.cvss_metric_v31,
        &metrics.cvss_metric_v30,
        &metrics.cvss_metric_v2,
    ]
    .into_iter()
    .flatten()
    {
        if let Some(data) = entries.iter().find_map(|entry| entry.cvss_data.as_ref()) {
            let severity = data
                .base_severity
                .clone()
                .unwrap_or_else(|| "UNKNOWN".to_string())
                .to_uppercase();
            return (severity, data.base_score);
        }
    }

    ("UNKNOWN".to_string(), None)
}

fn extract_description(cve: &NvdCve) -> String {
    cve.descriptions
        .iter()
        .find(|entry| entry.lang.eq_ignore_ascii_case("en"))
        .map(|entry| entry.value.clone())
        .or_else(|| cve.descriptions.first().map(|entry| entry.value.clone()))
        .unwrap_or_else(|| "No description available".to_string())
}

fn parse_sync_range(sync_range: &str) -> (String, Option<String>, usize) {
    match sync_range {
        "latest_5000" => ("latest_5000".to_string(), None, 5_000),
        "last_30_days" => {
            let start =
                (Utc::now() - ChronoDuration::days(30)).to_rfc3339_opts(SecondsFormat::Secs, true);
            ("last_30_days".to_string(), Some(start), 3_000)
        }
        "last_90_days" => {
            let start =
                (Utc::now() - ChronoDuration::days(90)).to_rfc3339_opts(SecondsFormat::Secs, true);
            ("last_90_days".to_string(), Some(start), 6_000)
        }
        _ => ("latest_1000".to_string(), None, 1_000),
    }
}

async fn fetch_nvd_vulnerabilities(sync_range: &str) -> Result<Vec<NvdCve>, String> {
    let (normalized_range, pub_start_date, desired_limit) = parse_sync_range(sync_range);
    let per_page = desired_limit.min(2_000);
    let mut start_index = 0usize;
    let mut all_cves: Vec<NvdCve> = Vec::new();
    let nvd_api_key = std::env::var("NVD_API_KEY")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let max_retries = 3u32;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(25))
        .user_agent("NetMapper/0.3.1 (desktop)")
        .build()
        .map_err(|e| format!("Failed to initialize vulnerability feed client: {}", e))?;

    while all_cves.len() < desired_limit {
        let mut query = vec![
            ("startIndex", start_index.to_string()),
            ("resultsPerPage", per_page.to_string()),
        ];
        if let Some(start) = pub_start_date.as_ref() {
            query.push(("pubStartDate", start.clone()));
        }

        let mut attempt = 0u32;
        let payload = loop {
            let mut request = client
                .get("https://services.nvd.nist.gov/rest/json/cves/2.0")
                .query(&query);
            if let Some(api_key) = nvd_api_key.as_deref() {
                request = request.header("apiKey", api_key);
            }

            match request.send().await {
                Ok(response) => {
                    let status = response.status();
                    if status.is_success() {
                        let parsed = response
                            .json::<NvdResponse>()
                            .await
                            .map_err(|e| format!("Failed to decode NVD response: {}", e))?;
                        break parsed;
                    }

                    let can_retry = (status.as_u16() == 429 || status.is_server_error())
                        && attempt < max_retries;
                    if can_retry {
                        let retry_after_secs = response
                            .headers()
                            .get(reqwest::header::RETRY_AFTER)
                            .and_then(|value| value.to_str().ok())
                            .and_then(|value| value.parse::<u64>().ok());

                        let delay_ms = retry_after_secs
                            .map(|secs| secs.saturating_mul(1_000))
                            .unwrap_or_else(|| 400 * (1u64 << attempt))
                            .min(15_000);

                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                        attempt += 1;
                        continue;
                    }

                    return Err(format!(
                        "NVD sync request returned HTTP {} (startIndex={})",
                        status, start_index
                    ));
                }
                Err(e) => {
                    if attempt < max_retries {
                        let delay_ms = (400 * (1u64 << attempt)).min(8_000);
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                        attempt += 1;
                        continue;
                    }

                    return Err(format!(
                        "NVD sync request failed after retries (startIndex={}): {}",
                        start_index, e
                    ));
                }
            }
        };

        let batch: Vec<NvdCve> = payload
            .vulnerabilities
            .into_iter()
            .map(|entry| entry.cve)
            .collect();
        if batch.is_empty() {
            break;
        }

        start_index += batch.len();
        all_cves.extend(batch);

        if (normalized_range == "latest_1000" || normalized_range == "latest_5000")
            && all_cves.len() >= desired_limit
        {
            break;
        }

        if normalized_range.starts_with("last_") && start_index >= desired_limit {
            break;
        }
    }

    all_cves.truncate(desired_limit);
    Ok(all_cves)
}

/// Apply runtime-tunable core engine settings from the GUI.
#[tauri::command]
pub fn apply_runtime_settings(
    snmp_enabled: bool,
    snmp_community: String,
    tcp_ports: Vec<u16>,
    monitoring_interval_seconds: Option<u64>,
) -> Result<(), String> {
    let community = snmp_community.trim();
    if community.is_empty() {
        return Err("SNMP community cannot be empty".to_string());
    }

    if tcp_ports.contains(&0) {
        return Err("TCP port list contains invalid port 0".to_string());
    }

    let mut unique_ports = std::collections::BTreeSet::new();
    for port in tcp_ports {
        unique_ports.insert(port);
    }

    let tcp_ports_csv = unique_ports
        .iter()
        .map(|port| port.to_string())
        .collect::<Vec<_>>()
        .join(",");

    std::env::set_var(
        "NEXUS_SNMP_ENABLED",
        if snmp_enabled { "true" } else { "false" },
    );
    std::env::set_var("NEXUS_SNMP_COMMUNITY", community);
    if !tcp_ports_csv.is_empty() {
        std::env::set_var("NEXUS_TCP_PROBE_PORTS", tcp_ports_csv);
    }

    if let Some(interval) = monitoring_interval_seconds {
        let clamped = interval.clamp(5, 86_400);
        std::env::set_var("NEXUS_DEFAULT_MONITOR_INTERVAL", clamped.to_string());
    }

    Ok(())
}

/// Apply runtime AI routing/provider settings from the GUI.
#[tauri::command]
pub fn apply_ai_runtime_settings(settings: AiRuntimeSettingsInput) -> Result<(), String> {
    let mode = settings.mode.trim().to_ascii_lowercase();
    if !matches!(mode.as_str(), "disabled" | "local" | "cloud" | "hybrid_auto") {
        return Err("Invalid AI mode. Use disabled/local/cloud/hybrid_auto".to_string());
    }

    let timeout_ms = settings.timeout_ms.clamp(500, 60_000);
    let ollama_endpoint = settings.ollama_endpoint.trim();
    let ollama_model = settings.ollama_model.trim();
    let gemini_endpoint = settings.gemini_endpoint.trim();
    let gemini_model = settings.gemini_model.trim();
    let gemini_api_key = settings
        .gemini_api_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if matches!(mode.as_str(), "local" | "hybrid_auto")
        && (ollama_endpoint.is_empty() || ollama_model.is_empty())
    {
        return Err("Ollama endpoint and model are required for local/hybrid mode".to_string());
    }

    if matches!(mode.as_str(), "cloud" | "hybrid_auto")
        && (gemini_endpoint.is_empty() || gemini_model.is_empty())
    {
        return Err("Gemini endpoint and model are required for cloud/hybrid mode".to_string());
    }

    std::env::set_var(
        "NEXUS_AI_ENABLED",
        if settings.enabled { "true" } else { "false" },
    );
    std::env::set_var("NEXUS_AI_MODE", mode);
    std::env::set_var("NEXUS_AI_TIMEOUT_MS", timeout_ms.to_string());

    if !ollama_endpoint.is_empty() {
        std::env::set_var("NEXUS_AI_ENDPOINT", ollama_endpoint);
    }
    if !ollama_model.is_empty() {
        std::env::set_var("NEXUS_AI_MODEL", ollama_model);
    }

    if !gemini_endpoint.is_empty() {
        std::env::set_var("NEXUS_AI_GEMINI_ENDPOINT", gemini_endpoint);
    }
    if !gemini_model.is_empty() {
        std::env::set_var("NEXUS_AI_GEMINI_MODEL", gemini_model);
    }

    match gemini_api_key {
        Some(key) => std::env::set_var("NEXUS_AI_GEMINI_API_KEY", key),
        None => std::env::remove_var("NEXUS_AI_GEMINI_API_KEY"),
    }

    std::env::set_var(
        "NEXUS_AI_CLOUD_ALLOW_SENSITIVE",
        if settings.cloud_allow_sensitive {
            "true"
        } else {
            "false"
        },
    );

    Ok(())
}

/// Read vulnerability database status for Settings diagnostics.
#[tauri::command]
pub fn get_vulnerability_db_status(
    state: tauri::State<'_, AppState>,
) -> Result<VulnerabilityDbStatus, String> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;
    vulnerability_db_status_from_conn(&conn)
}

/// Re-seed embedded vulnerability and port warning datasets.
#[tauri::command]
pub fn sync_vulnerability_db(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<VulnerabilityDbStatus, String> {
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

    vulnerability_db_status_from_conn(&conn)
}

/// Pull CVE records from NVD feed and upsert into local vulnerability cache.
#[tauri::command]
pub async fn sync_vulnerability_feed(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    sync_range: Option<String>,
) -> Result<VulnerabilitySyncReport, String> {
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
        return Err(error);
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
