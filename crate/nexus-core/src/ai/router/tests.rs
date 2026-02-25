use httpmock::Method::{GET, POST};
use httpmock::MockServer;
use serde_json::json;

use crate::HostInfo;
use crate::ai::config::AiSettings;
use crate::ai::types::AiMode;

use super::{
    generate_hybrid_insights_with_settings, insights::clear_ai_insights_cache_for_tests,
    run_ai_check_with_settings,
};

fn sample_hosts() -> Vec<HostInfo> {
    let mut host = HostInfo::new(
        "192.168.1.10".to_string(),
        "AA:BB:CC:DD:EE:10".to_string(),
        "UNKNOWN".to_string(),
        "ARP".to_string(),
    );
    host.risk_score = 55;
    host.open_ports = vec![23];
    vec![host]
}

fn test_settings() -> AiSettings {
    AiSettings {
        enabled: true,
        mode: AiMode::Local,
        timeout_ms: 3_000,
        ollama_endpoint: "http://127.0.0.1:1".to_string(),
        ollama_model: "qwen3:8b".to_string(),
        gemini_endpoint: "http://127.0.0.1:1".to_string(),
        gemini_model: "gemini-test".to_string(),
        gemini_api_key: None,
        cloud_allow_sensitive: false,
    }
}

#[tokio::test]
async fn local_mode_uses_ollama_provider_successfully() {
    clear_ai_insights_cache_for_tests();

    let ollama = MockServer::start();
    ollama.mock(|when, then| {
        when.method(POST).path("/api/generate");
        then.status(200).json_body(json!({
            "response": "{\"executive_summary\":\"Local summary\",\"top_risks\":[\"r1\"],\"immediate_actions\":[\"a1\"],\"follow_up_actions\":[\"f1\"]}"
        }));
    });

    let mut settings = test_settings();
    settings.mode = AiMode::Local;
    settings.ollama_endpoint = ollama.base_url();

    let result = generate_hybrid_insights_with_settings(&sample_hosts(), &settings).await;
    assert_eq!(result.ai_provider.as_deref(), Some("ollama"));
    assert_eq!(result.ai_model.as_deref(), Some("qwen3:8b"));
    assert!(result.ai_overlay.is_some());
    assert!(result.ai_error.is_none());
}

#[tokio::test]
async fn hybrid_mode_falls_back_to_gemini_when_local_fails() {
    clear_ai_insights_cache_for_tests();

    let ollama = MockServer::start();
    ollama.mock(|when, then| {
        when.method(POST).path("/api/generate");
        then.status(500).body("local failure");
    });

    let gemini = MockServer::start();
    gemini.mock(|when, then| {
        when.method(POST)
            .path("/v1beta/models/gemini-test:generateContent");
        then.status(200).json_body(json!({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": "{\"executive_summary\":\"Cloud summary\",\"top_risks\":[\"r1\"],\"immediate_actions\":[\"a1\"],\"follow_up_actions\":[\"f1\"]}"
                    }]
                }
            }]
        }));
    });

    let mut settings = test_settings();
    settings.mode = AiMode::HybridAuto;
    settings.ollama_endpoint = ollama.base_url();
    settings.gemini_endpoint = gemini.base_url();
    settings.gemini_api_key = Some("test-key".to_string());

    let result = generate_hybrid_insights_with_settings(&sample_hosts(), &settings).await;
    assert_eq!(result.ai_provider.as_deref(), Some("gemini"));
    assert_eq!(result.ai_model.as_deref(), Some("gemini-test"));
    assert!(result.ai_overlay.is_some());
    assert!(result.ai_error.is_none());
}

#[tokio::test]
async fn ai_check_local_reports_missing_model() {
    let ollama = MockServer::start();
    ollama.mock(|when, then| {
        when.method(GET).path("/api/tags");
        then.status(200)
            .json_body(json!({ "models": [{ "name": "other:1b" }] }));
    });

    let mut settings = test_settings();
    settings.mode = AiMode::Local;
    settings.ollama_endpoint = ollama.base_url();
    settings.ollama_model = "qwen3:8b".to_string();

    let report = run_ai_check_with_settings(&settings).await;
    assert!(!report.overall_ok);
    let local = report.local.expect("local report should exist");
    assert!(local.reachable);
    assert_eq!(local.model_available, Some(false));
    assert!(local.error.unwrap_or_default().contains("not found"));
}

#[tokio::test]
async fn ai_check_hybrid_succeeds_if_cloud_available() {
    let gemini = MockServer::start();
    gemini.mock(|when, then| {
        when.method(GET).path("/v1beta/models");
        then.status(200)
            .json_body(json!({ "models": [{ "name": "models/gemini-test" }] }));
    });

    let mut settings = test_settings();
    settings.mode = AiMode::HybridAuto;
    settings.ollama_endpoint = "http://127.0.0.1:9".to_string();
    settings.gemini_endpoint = gemini.base_url();
    settings.gemini_api_key = Some("test-key".to_string());

    let report = run_ai_check_with_settings(&settings).await;
    assert!(report.overall_ok);
    let local = report.local.expect("local report should exist");
    assert!(!local.reachable);
    let cloud = report.cloud.expect("cloud report should exist");
    assert!(cloud.reachable);
    assert_eq!(cloud.model_available, Some(true));
}
