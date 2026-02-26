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
use crate::commands::shared::{
    emit_engine_error, emit_engine_info, emit_engine_scan_phase, emit_engine_warn,
    get_db_connection, lock_db_connection,
};
use crate::commands::state::AppState;

const DEVICE_SECURITY_OP: &str = "device_security";
const NETWORK_REPORT_OP: &str = "network_report";
const TROUBLESHOOT_OP: &str = "troubleshoot";

fn assistant_message(operation: &str, stage: &str, message: &str) -> String {
    format!("[assistant][{}][{}] {}", operation, stage, message)
}

fn emit_assistant_info(
    app: &tauri::AppHandle,
    operation: &str,
    stage: &str,
    progress_pct: u8,
    message: impl Into<String>,
) {
    let message = message.into();
    emit_engine_info(app, assistant_message(operation, stage, &message));
    emit_engine_scan_phase(
        app,
        format!("assistant_{}_{}", operation, stage),
        progress_pct.min(100),
    );
}

fn emit_assistant_warn(
    app: &tauri::AppHandle,
    operation: &str,
    stage: &str,
    message: impl Into<String>,
) {
    let message = message.into();
    emit_engine_warn(app, assistant_message(operation, stage, &message));
}

fn emit_assistant_error(
    app: &tauri::AppHandle,
    operation: &str,
    stage: &str,
    message: impl Into<String>,
) {
    let message = message.into();
    emit_engine_error(app, assistant_message(operation, stage, &message));
}

fn provider_label(provider: Option<&str>, model: Option<&str>) -> Option<String> {
    provider.map(|provider_name| {
        model
            .map(|model_name| format!("{} ({})", provider_name, model_name))
            .unwrap_or_else(|| provider_name.to_string())
    })
}

pub(super) async fn ai_analyze_device_security_impl(
    app: &tauri::AppHandle,
    device: HostInfo,
) -> CommandResult<DeviceSecurityAnalysis> {
    emit_assistant_info(
        app,
        DEVICE_SECURITY_OP,
        "start",
        5,
        format!(
            "Starting device security analysis for {}",
            target_label(&device)
        ),
    );
    emit_assistant_info(
        app,
        DEVICE_SECURITY_OP,
        "validate",
        12,
        "Validating device context",
    );

    if device.ip.trim().is_empty() {
        emit_assistant_warn(
            app,
            DEVICE_SECURITY_OP,
            "invalid_input",
            "Device IP is required for security analysis",
        );
        return Err(CommandError::invalid_input(
            "Device IP is required for security analysis",
        ));
    }

    emit_assistant_info(
        app,
        DEVICE_SECURITY_OP,
        "ai_invoke",
        38,
        "Requesting hybrid AI insights",
    );
    let insights = generate_hybrid_insights(std::slice::from_ref(&device)).await;
    let metadata = metadata_from_insights(&insights);
    if let Some(provider) = provider_label(metadata.provider.as_deref(), metadata.model.as_deref())
    {
        emit_assistant_info(
            app,
            DEVICE_SECURITY_OP,
            "provider",
            72,
            format!("AI overlay generated via {}", provider),
        );
    } else if let Some(ai_error) = metadata.ai_error.as_deref() {
        emit_assistant_warn(
            app,
            DEVICE_SECURITY_OP,
            "fallback",
            format!(
                "AI unavailable; using deterministic fallback ({})",
                ai_error
            ),
        );
        emit_engine_scan_phase(app, "assistant_device_security_fallback", 72);
    } else {
        emit_assistant_warn(
            app,
            DEVICE_SECURITY_OP,
            "fallback",
            "AI unavailable; using deterministic fallback",
        );
        emit_engine_scan_phase(app, "assistant_device_security_fallback", 72);
    }
    emit_assistant_info(
        app,
        DEVICE_SECURITY_OP,
        "compose",
        88,
        "Composing prioritized findings and actions",
    );

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

    emit_assistant_info(
        app,
        DEVICE_SECURITY_OP,
        "complete",
        100,
        "Device security analysis ready",
    );

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
    app: &tauri::AppHandle,
    hosts: Option<Vec<HostInfo>>,
    subnet: Option<String>,
) -> CommandResult<NetworkReportSummary> {
    emit_assistant_info(
        app,
        NETWORK_REPORT_OP,
        "start",
        5,
        "Starting network report generation",
    );
    emit_assistant_info(
        app,
        NETWORK_REPORT_OP,
        "resolve_hosts",
        15,
        "Resolving hosts for report context",
    );
    let resolved_hosts = resolve_hosts(&state, hosts).inspect_err(|error| {
        emit_assistant_error(
            app,
            NETWORK_REPORT_OP,
            "resolve_hosts_failed",
            format!("Failed to resolve hosts: {}", error),
        );
    })?;
    emit_assistant_info(
        app,
        NETWORK_REPORT_OP,
        "hosts_ready",
        24,
        format!("Resolved {} hosts for report", resolved_hosts.len()),
    );

    if resolved_hosts.is_empty() {
        emit_assistant_warn(
            app,
            NETWORK_REPORT_OP,
            "empty_hosts",
            "No scan hosts available. Run a scan first.",
        );
        return Err(CommandError::invalid_input(
            "No scan hosts available. Run a scan first.",
        ));
    }

    emit_assistant_info(
        app,
        NETWORK_REPORT_OP,
        "ai_invoke",
        42,
        "Requesting hybrid AI insights for report summary",
    );
    let insights = generate_hybrid_insights(&resolved_hosts).await;
    let metadata = metadata_from_insights(&insights);
    if let Some(provider) = provider_label(metadata.provider.as_deref(), metadata.model.as_deref())
    {
        emit_assistant_info(
            app,
            NETWORK_REPORT_OP,
            "provider",
            70,
            format!("AI overlay generated via {}", provider),
        );
    } else if let Some(ai_error) = metadata.ai_error.as_deref() {
        emit_assistant_warn(
            app,
            NETWORK_REPORT_OP,
            "fallback",
            format!(
                "AI unavailable; using deterministic fallback ({})",
                ai_error
            ),
        );
        emit_engine_scan_phase(app, "assistant_network_report_fallback", 70);
    } else {
        emit_assistant_warn(
            app,
            NETWORK_REPORT_OP,
            "fallback",
            "AI unavailable; using deterministic fallback",
        );
        emit_engine_scan_phase(app, "assistant_network_report_fallback", 70);
    }

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

    emit_assistant_info(
        app,
        NETWORK_REPORT_OP,
        "complete",
        100,
        format!(
            "Network report ready (total_hosts={}, online={}, offline={})",
            total_hosts, online_hosts, offline_hosts
        ),
    );

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
    app: &tauri::AppHandle,
    device: HostInfo,
    symptoms: Option<Vec<String>>,
) -> CommandResult<DeviceTroubleshootAdvice> {
    emit_assistant_info(
        app,
        TROUBLESHOOT_OP,
        "start",
        5,
        format!(
            "Starting troubleshooting analysis for {}",
            target_label(&device)
        ),
    );
    emit_assistant_info(
        app,
        TROUBLESHOOT_OP,
        "validate",
        12,
        "Validating device troubleshooting context",
    );
    if device.ip.trim().is_empty() {
        emit_assistant_warn(
            app,
            TROUBLESHOOT_OP,
            "invalid_input",
            "Device IP is required for troubleshooting",
        );
        return Err(CommandError::invalid_input(
            "Device IP is required for troubleshooting",
        ));
    }

    emit_assistant_info(
        app,
        TROUBLESHOOT_OP,
        "ai_invoke",
        38,
        "Requesting hybrid AI insights for troubleshooting",
    );
    let insights = generate_hybrid_insights(std::slice::from_ref(&device)).await;
    let metadata = metadata_from_insights(&insights);
    if let Some(provider) = provider_label(metadata.provider.as_deref(), metadata.model.as_deref())
    {
        emit_assistant_info(
            app,
            TROUBLESHOOT_OP,
            "provider",
            72,
            format!("AI overlay generated via {}", provider),
        );
    } else if let Some(ai_error) = metadata.ai_error.as_deref() {
        emit_assistant_warn(
            app,
            TROUBLESHOOT_OP,
            "fallback",
            format!(
                "AI unavailable; using deterministic fallback ({})",
                ai_error
            ),
        );
        emit_engine_scan_phase(app, "assistant_troubleshoot_fallback", 72);
    } else {
        emit_assistant_warn(
            app,
            TROUBLESHOOT_OP,
            "fallback",
            "AI unavailable; using deterministic fallback",
        );
        emit_engine_scan_phase(app, "assistant_troubleshoot_fallback", 72);
    }
    emit_assistant_info(
        app,
        TROUBLESHOOT_OP,
        "compose",
        88,
        "Composing likely causes and diagnostic steps",
    );

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

    emit_assistant_info(
        app,
        TROUBLESHOOT_OP,
        "complete",
        100,
        "Troubleshooting advice ready",
    );

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
