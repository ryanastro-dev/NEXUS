use nexus_core::{HostInfo, HybridInsightsResult};

use super::types::AssistantMetadata;

pub(super) fn metadata_from_insights(insights: &HybridInsightsResult) -> AssistantMetadata {
    AssistantMetadata {
        provider: insights.ai_provider.clone(),
        model: insights.ai_model.clone(),
        ai_error: insights.ai_error.clone(),
    }
}

pub(super) fn target_label(device: &HostInfo) -> String {
    let preferred = device
        .hostname
        .as_ref()
        .map(|name| name.trim())
        .filter(|name| !name.is_empty());

    preferred
        .map(ToString::to_string)
        .unwrap_or_else(|| device.ip.clone())
}

pub(super) fn risk_level(score: u8) -> &'static str {
    match score {
        80..=100 => "critical",
        60..=79 => "high",
        40..=59 => "medium",
        _ => "low",
    }
}

pub(super) fn format_ports(ports: &[u16]) -> String {
    if ports.is_empty() {
        return "none".to_string();
    }

    let mut unique = ports.to_vec();
    unique.sort_unstable();
    unique.dedup();
    unique
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(", ")
}

pub(super) fn non_empty_or_fallback(source: &[String], fallback: Vec<String>) -> Vec<String> {
    let collected: Vec<String> = source
        .iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect();

    if collected.is_empty() {
        return fallback;
    }

    dedup_and_cap(collected, 5)
}

pub(super) fn dedup_and_cap(values: Vec<String>, max_items: usize) -> Vec<String> {
    let mut deduped = Vec::new();

    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }

        if deduped.iter().any(|existing: &String| existing == trimmed) {
            continue;
        }

        deduped.push(trimmed.to_string());

        if deduped.len() >= max_items {
            break;
        }
    }

    deduped
}
