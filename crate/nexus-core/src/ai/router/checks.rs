use reqwest::Client;
use std::time::Instant;

use crate::ai::config::AiSettings;
use crate::ai::types::{AiCheckReport, AiMode, AiProviderCheck};

pub async fn run_ai_check() -> AiCheckReport {
    let settings = AiSettings::from_env();
    run_ai_check_with_settings(&settings).await
}

pub(crate) async fn run_ai_check_with_settings(settings: &AiSettings) -> AiCheckReport {
    let mut report = AiCheckReport {
        ai_enabled: settings.enabled,
        mode: settings.mode,
        timeout_ms: settings.timeout_ms,
        local: None,
        cloud: None,
        overall_ok: !settings.enabled || settings.mode == AiMode::Disabled,
    };

    let client = match Client::builder().timeout(settings.timeout()).build() {
        Ok(c) => c,
        Err(e) => {
            let err = Some(format!("AI client init failed: {}", e));
            match settings.mode {
                AiMode::Local => {
                    report.local = Some(AiProviderCheck {
                        provider: "ollama".to_string(),
                        configured: settings.enabled,
                        reachable: false,
                        model: Some(settings.ollama_model.clone()),
                        model_available: None,
                        latency_ms: None,
                        error: err.clone(),
                    });
                }
                AiMode::Cloud => {
                    report.cloud = Some(AiProviderCheck {
                        provider: "gemini".to_string(),
                        configured: settings.gemini_api_key.is_some(),
                        reachable: false,
                        model: Some(settings.gemini_model.clone()),
                        model_available: None,
                        latency_ms: None,
                        error: err.clone(),
                    });
                }
                AiMode::HybridAuto => {
                    report.local = Some(AiProviderCheck {
                        provider: "ollama".to_string(),
                        configured: settings.enabled,
                        reachable: false,
                        model: Some(settings.ollama_model.clone()),
                        model_available: None,
                        latency_ms: None,
                        error: err.clone(),
                    });
                    report.cloud = Some(AiProviderCheck {
                        provider: "gemini".to_string(),
                        configured: settings.gemini_api_key.is_some(),
                        reachable: false,
                        model: Some(settings.gemini_model.clone()),
                        model_available: None,
                        latency_ms: None,
                        error: err,
                    });
                }
                AiMode::Disabled => {}
            }
            return report;
        }
    };

    match settings.mode {
        AiMode::Disabled => {}
        AiMode::Local => {
            report.local = Some(check_ollama(&client, settings).await);
        }
        AiMode::Cloud => {
            report.cloud = Some(check_gemini(&client, settings).await);
        }
        AiMode::HybridAuto => {
            report.local = Some(check_ollama(&client, settings).await);
            report.cloud = Some(check_gemini(&client, settings).await);
        }
    }

    report.overall_ok = match settings.mode {
        AiMode::Disabled => true,
        AiMode::Local => report
            .local
            .as_ref()
            .is_some_and(|c| c.reachable && c.model_available.unwrap_or(false)),
        AiMode::Cloud => report
            .cloud
            .as_ref()
            .is_some_and(|c| c.reachable && c.model_available.unwrap_or(false)),
        AiMode::HybridAuto => {
            let local_ok = report
                .local
                .as_ref()
                .is_some_and(|c| c.reachable && c.model_available.unwrap_or(false));
            let cloud_ok = report
                .cloud
                .as_ref()
                .is_some_and(|c| c.reachable && c.model_available.unwrap_or(false));
            local_ok || cloud_ok
        }
    };

    report
}

async fn check_ollama(client: &Client, settings: &AiSettings) -> AiProviderCheck {
    let start = Instant::now();
    let endpoint = settings.ollama_endpoint.trim_end_matches('/');
    let url = format!("{}/api/tags", endpoint);

    let mut out = AiProviderCheck {
        provider: "ollama".to_string(),
        configured: settings.enabled,
        reachable: false,
        model: Some(settings.ollama_model.clone()),
        model_available: None,
        latency_ms: None,
        error: None,
    };

    match client.get(url).send().await {
        Ok(resp) => {
            out.latency_ms = Some(start.elapsed().as_millis() as u64);
            let status = resp.status();
            if !status.is_success() {
                out.error = Some(format!("Ollama tags request failed with {}", status));
                return out;
            }
            out.reachable = true;
            match resp.json::<serde_json::Value>().await {
                Ok(payload) => {
                    let available = payload
                        .get("models")
                        .and_then(|v| v.as_array())
                        .map(|models| {
                            models.iter().any(|m| {
                                m.get("name").and_then(|v| v.as_str()).is_some_and(|name| {
                                    model_name_matches(&settings.ollama_model, name)
                                })
                            })
                        })
                        .unwrap_or(false);
                    out.model_available = Some(available);
                    if !available {
                        out.error = Some(format!(
                            "Configured model '{}' not found in Ollama local tags",
                            settings.ollama_model
                        ));
                    }
                }
                Err(e) => {
                    out.error = Some(format!("Failed to parse Ollama tags response: {}", e));
                }
            }
        }
        Err(e) => {
            out.error = Some(format!("Failed to reach Ollama endpoint: {}", e));
        }
    }

    out
}

async fn check_gemini(client: &Client, settings: &AiSettings) -> AiProviderCheck {
    let start = Instant::now();
    let mut out = AiProviderCheck {
        provider: "gemini".to_string(),
        configured: settings.gemini_api_key.is_some(),
        reachable: false,
        model: Some(settings.gemini_model.clone()),
        model_available: None,
        latency_ms: None,
        error: None,
    };

    let api_key = match settings.gemini_api_key.as_ref() {
        Some(k) => k,
        None => {
            out.error = Some("NEXUS_AI_GEMINI_API_KEY is not configured".to_string());
            return out;
        }
    };

    let endpoint = settings.gemini_endpoint.trim_end_matches('/');
    let url = format!("{}/v1beta/models?key={}", endpoint, api_key);

    match client.get(url).send().await {
        Ok(resp) => {
            out.latency_ms = Some(start.elapsed().as_millis() as u64);
            let status = resp.status();
            if !status.is_success() {
                out.error = Some(format!("Gemini models request failed with {}", status));
                return out;
            }
            out.reachable = true;
            match resp.json::<serde_json::Value>().await {
                Ok(payload) => {
                    let available = payload
                        .get("models")
                        .and_then(|v| v.as_array())
                        .map(|models| {
                            models.iter().any(|m| {
                                m.get("name").and_then(|v| v.as_str()).is_some_and(|name| {
                                    model_name_matches(&settings.gemini_model, name)
                                })
                            })
                        })
                        .unwrap_or(false);
                    out.model_available = Some(available);
                    if !available {
                        out.error = Some(format!(
                            "Configured model '{}' not listed by Gemini models API",
                            settings.gemini_model
                        ));
                    }
                }
                Err(e) => {
                    out.error = Some(format!("Failed to parse Gemini models response: {}", e));
                }
            }
        }
        Err(e) => {
            out.error = Some(format!("Failed to reach Gemini endpoint: {}", e));
        }
    }

    out
}

fn model_name_matches(configured: &str, available: &str) -> bool {
    available == configured
        || available.ends_with(configured)
        || available
            .strip_prefix("models/")
            .is_some_and(|name| name == configured)
}
