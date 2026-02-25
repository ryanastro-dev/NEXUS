use chrono::{Duration as ChronoDuration, SecondsFormat, Utc};

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
pub(crate) struct NvdCve {
    pub(crate) id: String,
    #[serde(default)]
    pub(crate) published: Option<String>,
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

pub(crate) fn extract_vendor_product(cve: &NvdCve) -> (String, Option<String>) {
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

pub(crate) fn extract_cvss(cve: &NvdCve) -> (String, Option<f64>) {
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

pub(crate) fn extract_description(cve: &NvdCve) -> String {
    cve.descriptions
        .iter()
        .find(|entry| entry.lang.eq_ignore_ascii_case("en"))
        .map(|entry| entry.value.clone())
        .or_else(|| cve.descriptions.first().map(|entry| entry.value.clone()))
        .unwrap_or_else(|| "No description available".to_string())
}

pub(crate) fn parse_sync_range(sync_range: &str) -> (String, Option<String>, usize) {
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

pub(crate) async fn fetch_nvd_vulnerabilities(sync_range: &str) -> Result<Vec<NvdCve>, String> {
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
