use chrono::Utc;
use nexus_core::{HostInfo, generate_hybrid_insights};

use super::fallback::{
    build_troubleshoot_commands, fallback_device_actions, fallback_device_findings,
    fallback_device_summary, fallback_diagnostic_steps, fallback_likely_causes,
    fallback_network_actions, fallback_network_risks, fallback_troubleshoot_summary,
};
use super::types::{DeviceSecurityAnalysis, DeviceTroubleshootAdvice, NetworkReportSummary};
use super::utils::{metadata_from_insights, non_empty_or_fallback, risk_level, target_label};
use crate::commands::CommandError;
use crate::commands::CommandResult;
use crate::commands::shared::{get_db_connection, lock_db_connection};
use crate::commands::state::AppState;

pub(super) async fn ai_analyze_device_security_impl(
    device: HostInfo,
) -> CommandResult<DeviceSecurityAnalysis> {
    if device.ip.trim().is_empty() {
        return Err(CommandError::invalid_input(
            "Device IP is required for security analysis",
        ));
    }

    let insights = generate_hybrid_insights(std::slice::from_ref(&device)).await;
    let metadata = metadata_from_insights(&insights);

    let key_findings = if let Some(overlay) = insights.ai_overlay.as_ref() {
        non_empty_or_fallback(&overlay.top_risks, fallback_device_findings(&device))
    } else {
        fallback_device_findings(&device)
    };

    let recommended_actions = if let Some(overlay) = insights.ai_overlay.as_ref() {
        let mut actions = overlay.immediate_actions.clone();
        actions.extend(overlay.follow_up_actions.iter().take(2).cloned());
        non_empty_or_fallback(&actions, fallback_device_actions(&device))
    } else {
        fallback_device_actions(&device)
    };

    let executive_summary = insights
        .ai_overlay
        .as_ref()
        .map(|overlay| overlay.executive_summary.clone())
        .unwrap_or_else(|| fallback_device_summary(&device));

    Ok(DeviceSecurityAnalysis {
        target: target_label(&device),
        ip: device.ip.clone(),
        mac: device.mac.clone(),
        risk_score: device.risk_score,
        risk_level: risk_level(device.risk_score).to_string(),
        executive_summary,
        key_findings,
        recommended_actions,
        metadata,
    })
}

pub(super) async fn ai_generate_network_report_impl(
    state: tauri::State<'_, AppState>,
    hosts: Option<Vec<HostInfo>>,
    subnet: Option<String>,
) -> CommandResult<NetworkReportSummary> {
    let resolved_hosts = resolve_hosts(&state, hosts)?;

    if resolved_hosts.is_empty() {
        return Err(CommandError::invalid_input(
            "No scan hosts available. Run a scan first.",
        ));
    }

    let insights = generate_hybrid_insights(&resolved_hosts).await;
    let metadata = metadata_from_insights(&insights);

    let total_hosts = resolved_hosts.len();
    let online_hosts = resolved_hosts
        .iter()
        .filter(|host| host.response_time_ms.is_some())
        .count();
    let offline_hosts = total_hosts.saturating_sub(online_hosts);

    let executive_summary = insights
        .ai_overlay
        .as_ref()
        .map(|overlay| overlay.executive_summary.clone())
        .unwrap_or_else(|| {
            format!(
                "Discovered {} hosts ({} online, {} offline). Health score {}{} with {} total security issues.",
                total_hosts,
                online_hosts,
                offline_hosts,
                insights.health.score,
                insights.health.grade,
                insights.security.total_issues
            )
        });

    let topology_highlights = {
        let mut highlights = vec![
            insights.device_distribution.summary.clone(),
            format!(
                "Network health: {}{} ({})",
                insights.health.score, insights.health.grade, insights.health.status
            ),
        ];

        if let Some(dominant) = insights.device_distribution.dominant_type.as_ref() {
            highlights.push(format!("Dominant device type: {}", dominant));
        }

        if let Some((vendor, count)) = insights.vendor_distribution.top_vendors.first() {
            highlights.push(format!(
                "Top vendor footprint: {} ({} devices)",
                vendor, count
            ));
        }

        super::utils::dedup_and_cap(highlights, 4)
    };

    let key_risks = if let Some(overlay) = insights.ai_overlay.as_ref() {
        non_empty_or_fallback(&overlay.top_risks, fallback_network_risks(&insights))
    } else {
        fallback_network_risks(&insights)
    };

    let recommended_actions = if let Some(overlay) = insights.ai_overlay.as_ref() {
        let mut actions = overlay.immediate_actions.clone();
        actions.extend(overlay.follow_up_actions.iter().take(2).cloned());
        non_empty_or_fallback(&actions, fallback_network_actions(&insights))
    } else {
        fallback_network_actions(&insights)
    };

    Ok(NetworkReportSummary {
        generated_at: Utc::now().to_rfc3339(),
        subnet,
        total_hosts,
        online_hosts,
        offline_hosts,
        executive_summary,
        topology_highlights,
        key_risks,
        recommended_actions,
        metadata,
    })
}

pub(super) async fn ai_troubleshoot_device_impl(
    device: HostInfo,
    symptoms: Option<Vec<String>>,
) -> CommandResult<DeviceTroubleshootAdvice> {
    if device.ip.trim().is_empty() {
        return Err(CommandError::invalid_input(
            "Device IP is required for troubleshooting",
        ));
    }

    let insights = generate_hybrid_insights(std::slice::from_ref(&device)).await;
    let metadata = metadata_from_insights(&insights);

    let status = if device.response_time_ms.is_some() {
        "online"
    } else {
        "offline"
    }
    .to_string();

    let summary = insights
        .ai_overlay
        .as_ref()
        .map(|overlay| overlay.executive_summary.clone())
        .unwrap_or_else(|| fallback_troubleshoot_summary(&device, &status));

    let likely_causes = if let Some(overlay) = insights.ai_overlay.as_ref() {
        non_empty_or_fallback(
            &overlay.top_risks,
            fallback_likely_causes(&device, &status, &symptoms),
        )
    } else {
        fallback_likely_causes(&device, &status, &symptoms)
    };

    let diagnostic_steps = if let Some(overlay) = insights.ai_overlay.as_ref() {
        non_empty_or_fallback(
            &overlay.immediate_actions,
            fallback_diagnostic_steps(&device, &status),
        )
    } else {
        fallback_diagnostic_steps(&device, &status)
    };

    let suggested_commands = build_troubleshoot_commands(&device, &status);

    Ok(DeviceTroubleshootAdvice {
        target: target_label(&device),
        ip: device.ip.clone(),
        mac: device.mac.clone(),
        status,
        summary,
        likely_causes,
        diagnostic_steps,
        suggested_commands,
        metadata,
    })
}

fn resolve_hosts(
    state: &tauri::State<'_, AppState>,
    hosts: Option<Vec<HostInfo>>,
) -> CommandResult<Vec<HostInfo>> {
    match hosts {
        Some(provided) if !provided.is_empty() => Ok(provided),
        _ => {
            let conn = get_db_connection(state)?;
            let conn = lock_db_connection(&conn)?;
            nexus_core::database::queries::get_latest_scan_hosts(&conn)
                .map_err(|error| format!("Failed to load latest scan hosts: {}", error))
                .map_err(Into::into)
        }
    }
}
