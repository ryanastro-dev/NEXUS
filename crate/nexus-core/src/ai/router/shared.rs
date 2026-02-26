use reqwest::Client;

use crate::ai::config::AiSettings;
use crate::ai::provider::AiProvider;
use crate::ai::providers::gemini::GeminiProvider;
use crate::ai::types::{AiInputDigest, HybridInsightsResult};
use crate::{DeviceDistribution, HostInfo, NetworkHealth, SecurityReport, VendorDistribution};

pub(super) async fn apply_provider_result<P: AiProvider>(
    result: &mut HybridInsightsResult,
    provider: &P,
    client: &Client,
    input: &AiInputDigest,
) {
    match provider.generate_overlay(client, input).await {
        Ok(overlay) => {
            result.ai_overlay = Some(overlay);
            result.ai_provider = Some(provider.provider_id().to_string());
            result.ai_model = Some(provider.model_name().to_string());
        }
        Err(e) => {
            let label = provider.provider_id();
            let capitalized = match label {
                "ollama" => "Local",
                "gemini" => "Cloud",
                _ => "AI",
            };
            result.ai_error = Some(format!("{} AI failed: {:#}", capitalized, e));
        }
    }
}

pub(super) fn build_gemini_provider(settings: &AiSettings) -> anyhow::Result<GeminiProvider> {
    let api_key = settings.gemini_api_key.clone().ok_or_else(|| {
        anyhow::anyhow!("NEXUS_AI_GEMINI_API_KEY is required for cloud/hybrid cloud fallback")
    })?;

    Ok(GeminiProvider::new(
        settings.gemini_endpoint.clone(),
        settings.gemini_model.clone(),
        api_key,
    ))
}

pub(super) fn build_base_result(hosts: &[HostInfo]) -> HybridInsightsResult {
    let health = NetworkHealth::calculate(hosts);
    let security = SecurityReport::generate(hosts);
    let device_distribution = DeviceDistribution::calculate(hosts);
    let vendor_distribution = VendorDistribution::calculate(hosts);

    HybridInsightsResult {
        health,
        security,
        device_distribution,
        vendor_distribution,
        ai_overlay: None,
        ai_provider: None,
        ai_model: None,
        ai_error: None,
    }
}
