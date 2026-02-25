use reqwest::Client;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};
use std::time::{Duration, Instant};

use crate::HostInfo;
use crate::ai::config::AiSettings;
use crate::ai::provider::AiProvider;
use crate::ai::providers::ollama::OllamaProvider;
use crate::ai::redaction::build_ai_input_digest;
use crate::ai::types::{AiMode, HybridInsightsResult};

use super::shared::{apply_provider_result, build_base_result, build_gemini_provider};

#[derive(Clone)]
struct CachedInsightsEntry {
    inserted_at: Instant,
    result: HybridInsightsResult,
}

static AI_INSIGHTS_CACHE: OnceLock<RwLock<HashMap<String, CachedInsightsEntry>>> = OnceLock::new();

fn insights_cache() -> &'static RwLock<HashMap<String, CachedInsightsEntry>> {
    AI_INSIGHTS_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

fn ai_cache_ttl() -> Duration {
    Duration::from_secs(crate::config::ai_cache_ttl_seconds())
}

fn build_insights_cache_key(hosts: &[HostInfo], settings: &AiSettings) -> String {
    let mut host_lines: Vec<String> = hosts
        .iter()
        .map(|host| {
            let mut ports = host.open_ports.clone();
            ports.sort_unstable();
            let port_blob = ports
                .into_iter()
                .map(|port| port.to_string())
                .collect::<Vec<_>>()
                .join(",");

            format!(
                "{}|{}|{}|{}|{}|{}|{}|{}",
                host.ip,
                host.mac,
                host.device_type_enum(),
                host.risk_score,
                host.security_grade_enum(),
                host.is_randomized,
                host.vendor.as_deref().unwrap_or_default(),
                port_blob
            )
        })
        .collect();
    host_lines.sort_unstable();

    let mut hasher = Sha256::new();
    hasher.update(if settings.enabled { b"1" } else { b"0" });
    hasher.update(format!("{:?}", settings.mode).as_bytes());
    hasher.update(settings.ollama_endpoint.as_bytes());
    hasher.update(settings.ollama_model.as_bytes());
    hasher.update(settings.gemini_endpoint.as_bytes());
    hasher.update(settings.gemini_model.as_bytes());
    hasher.update(if settings.cloud_allow_sensitive {
        b"1"
    } else {
        b"0"
    });

    for line in host_lines {
        hasher.update(line.as_bytes());
        hasher.update(b"\n");
    }

    hex::encode(hasher.finalize())
}

fn read_cached_insights(cache_key: &str) -> Option<HybridInsightsResult> {
    let ttl = ai_cache_ttl();
    let now = Instant::now();

    let maybe_entry = match insights_cache().read() {
        Ok(guard) => guard.get(cache_key).cloned(),
        Err(poisoned) => poisoned.into_inner().get(cache_key).cloned(),
    };

    let entry = maybe_entry?;
    if now.duration_since(entry.inserted_at) <= ttl {
        return Some(entry.result);
    }

    match insights_cache().write() {
        Ok(mut guard) => {
            guard.remove(cache_key);
        }
        Err(poisoned) => {
            poisoned.into_inner().remove(cache_key);
        }
    }

    None
}

fn write_cached_insights(cache_key: String, result: &HybridInsightsResult) {
    let entry = CachedInsightsEntry {
        inserted_at: Instant::now(),
        result: result.clone(),
    };

    match insights_cache().write() {
        Ok(mut guard) => {
            guard.insert(cache_key, entry);
        }
        Err(poisoned) => {
            poisoned.into_inner().insert(cache_key, entry);
        }
    }
}

#[cfg(test)]
pub(crate) fn clear_ai_insights_cache_for_tests() {
    match insights_cache().write() {
        Ok(mut guard) => guard.clear(),
        Err(poisoned) => poisoned.into_inner().clear(),
    }
}

pub async fn generate_hybrid_insights(hosts: &[HostInfo]) -> HybridInsightsResult {
    let settings = AiSettings::from_env();
    generate_hybrid_insights_with_settings(hosts, &settings).await
}

pub(crate) async fn generate_hybrid_insights_with_settings(
    hosts: &[HostInfo],
    settings: &AiSettings,
) -> HybridInsightsResult {
    let cache_key = build_insights_cache_key(hosts, settings);
    if let Some(cached) = read_cached_insights(&cache_key) {
        return cached;
    }

    let mut result = build_base_result(hosts);

    if !settings.enabled || settings.mode == AiMode::Disabled {
        write_cached_insights(cache_key, &result);
        return result;
    }

    let client = match Client::builder().timeout(settings.timeout()).build() {
        Ok(c) => c,
        Err(e) => {
            result.ai_error = Some(format!("AI client init failed: {}", e));
            write_cached_insights(cache_key, &result);
            return result;
        }
    };

    let local_input = build_ai_input_digest(
        hosts,
        &result.health,
        &result.security,
        &result.device_distribution,
        &result.vendor_distribution,
        false,
    );

    let local_provider = OllamaProvider::new(
        settings.ollama_endpoint.clone(),
        settings.ollama_model.clone(),
    );

    match settings.mode {
        AiMode::Local => {
            apply_provider_result(&mut result, &local_provider, &client, &local_input).await;
        }
        AiMode::Cloud => {
            let cloud_input = build_ai_input_digest(
                hosts,
                &result.health,
                &result.security,
                &result.device_distribution,
                &result.vendor_distribution,
                !settings.cloud_allow_sensitive,
            );
            match build_gemini_provider(settings) {
                Ok(cloud_provider) => {
                    apply_provider_result(&mut result, &cloud_provider, &client, &cloud_input).await
                }
                Err(e) => result.ai_error = Some(format!("Cloud AI failed: {}", e)),
            }
        }
        AiMode::HybridAuto => match local_provider.generate_overlay(&client, &local_input).await {
            Ok(overlay) => {
                result.ai_overlay = Some(overlay);
                result.ai_provider = Some(local_provider.provider_id().to_string());
                result.ai_model = Some(local_provider.model_name().to_string());
            }
            Err(local_err) => {
                tracing::warn!(
                    "Local AI failed in hybrid mode, trying cloud: {}",
                    local_err
                );
                let cloud_input = build_ai_input_digest(
                    hosts,
                    &result.health,
                    &result.security,
                    &result.device_distribution,
                    &result.vendor_distribution,
                    !settings.cloud_allow_sensitive,
                );
                match build_gemini_provider(settings) {
                    Ok(cloud_provider) => {
                        match cloud_provider.generate_overlay(&client, &cloud_input).await {
                            Ok(overlay) => {
                                result.ai_overlay = Some(overlay);
                                result.ai_provider = Some(cloud_provider.provider_id().to_string());
                                result.ai_model = Some(cloud_provider.model_name().to_string());
                            }
                            Err(cloud_err) => {
                                result.ai_error = Some(format!(
                                    "Hybrid AI failed. local={}, cloud={}",
                                    local_err, cloud_err
                                ));
                            }
                        }
                    }
                    Err(cloud_cfg_err) => {
                        result.ai_error = Some(format!(
                            "Hybrid AI failed. local={}, cloud-config={}",
                            local_err, cloud_cfg_err
                        ));
                    }
                }
            }
        },
        AiMode::Disabled => {}
    }

    write_cached_insights(cache_key, &result);
    result
}
