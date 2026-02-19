use chrono::Utc;
use nexus_core::{HostInfo, HybridInsightsResult, generate_hybrid_insights};

use super::shared::{get_db_connection, lock_db_connection};
use super::state::AppState;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssistantMetadata {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub ai_error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceSecurityAnalysis {
    pub target: String,
    pub ip: String,
    pub mac: String,
    pub risk_score: u8,
    pub risk_level: String,
    pub executive_summary: String,
    pub key_findings: Vec<String>,
    pub recommended_actions: Vec<String>,
    pub metadata: AssistantMetadata,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NetworkReportSummary {
    pub generated_at: String,
    pub subnet: Option<String>,
    pub total_hosts: usize,
    pub online_hosts: usize,
    pub offline_hosts: usize,
    pub executive_summary: String,
    pub topology_highlights: Vec<String>,
    pub key_risks: Vec<String>,
    pub recommended_actions: Vec<String>,
    pub metadata: AssistantMetadata,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceTroubleshootAdvice {
    pub target: String,
    pub ip: String,
    pub mac: String,
    pub status: String,
    pub summary: String,
    pub likely_causes: Vec<String>,
    pub diagnostic_steps: Vec<String>,
    pub suggested_commands: Vec<String>,
    pub metadata: AssistantMetadata,
}

#[tauri::command]
pub async fn ai_analyze_device_security(device: HostInfo) -> Result<DeviceSecurityAnalysis, String> {
    if device.ip.trim().is_empty() {
        return Err("Device IP is required for security analysis".to_string());
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

#[tauri::command]
pub async fn ai_generate_network_report(
    state: tauri::State<'_, AppState>,
    hosts: Option<Vec<HostInfo>>,
    subnet: Option<String>,
) -> Result<NetworkReportSummary, String> {
    let resolved_hosts = resolve_hosts(&state, hosts)?;

    if resolved_hosts.is_empty() {
        return Err("No scan hosts available. Run a scan first.".to_string());
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
            highlights.push(format!("Top vendor footprint: {} ({} devices)", vendor, count));
        }

        dedup_and_cap(highlights, 4)
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

#[tauri::command]
pub async fn ai_troubleshoot_device(
    device: HostInfo,
    symptoms: Option<Vec<String>>,
) -> Result<DeviceTroubleshootAdvice, String> {
    if device.ip.trim().is_empty() {
        return Err("Device IP is required for troubleshooting".to_string());
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
        non_empty_or_fallback(&overlay.top_risks, fallback_likely_causes(&device, &status, &symptoms))
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
) -> Result<Vec<HostInfo>, String> {
    match hosts {
        Some(provided) if !provided.is_empty() => Ok(provided),
        _ => {
            let conn = get_db_connection(state)?;
            let conn = lock_db_connection(&conn)?;
            nexus_core::database::queries::get_latest_scan_hosts(&conn)
                .map_err(|error| format!("Failed to load latest scan hosts: {}", error))
        }
    }
}

fn metadata_from_insights(insights: &HybridInsightsResult) -> AssistantMetadata {
    AssistantMetadata {
        provider: insights.ai_provider.clone(),
        model: insights.ai_model.clone(),
        ai_error: insights.ai_error.clone(),
    }
}

fn target_label(device: &HostInfo) -> String {
    let preferred = device
        .hostname
        .as_ref()
        .map(|name| name.trim())
        .filter(|name| !name.is_empty());

    preferred
        .map(ToString::to_string)
        .unwrap_or_else(|| device.ip.clone())
}

fn risk_level(score: u8) -> &'static str {
    match score {
        80..=100 => "critical",
        60..=79 => "high",
        40..=59 => "medium",
        _ => "low",
    }
}

fn fallback_device_summary(device: &HostInfo) -> String {
    if device.open_ports.is_empty() {
        return format!(
            "{} is currently {} risk with no suspicious open ports detected.",
            target_label(device),
            risk_level(device.risk_score)
        );
    }

    format!(
        "{} is {} risk. Exposed ports: {}.",
        target_label(device),
        risk_level(device.risk_score),
        format_ports(&device.open_ports)
    )
}

fn fallback_device_findings(device: &HostInfo) -> Vec<String> {
    let mut findings = Vec::new();

    if device.open_ports.is_empty() {
        findings.push("No open ports were detected in the latest probe.".to_string());
    } else {
        findings.push(format!(
            "Open service exposure detected on ports {}.",
            format_ports(&device.open_ports)
        ));
    }

    if device.risk_score >= 60 {
        findings.push(format!(
            "Risk score is {} ({}), prioritize hardening this host.",
            device.risk_score,
            risk_level(device.risk_score)
        ));
    }

    if device.is_randomized {
        findings.push(
            "Device appears to use a randomized MAC address, which can impact trust tracking."
                .to_string(),
        );
    }

    if let Some(vendor) = device.vendor.as_ref() {
        findings.push(format!("Vendor fingerprint: {}", vendor));
    }

    dedup_and_cap(findings, 4)
}

fn fallback_device_actions(device: &HostInfo) -> Vec<String> {
    let mut actions = Vec::new();

    if device.open_ports.contains(&23) {
        actions.push("Disable Telnet (port 23) and migrate to SSH with key-based auth.".to_string());
    }
    if device.open_ports.contains(&22) {
        actions.push("Keep SSH (port 22) restricted to trusted admin IPs and enforce strong credentials.".to_string());
    }
    if device.open_ports.contains(&3389) {
        actions.push("Restrict RDP (port 3389) behind VPN/NLA and enable MFA for remote access.".to_string());
    }

    if device.risk_score >= 70 {
        actions.push(
            "Schedule an immediate patch and credential review window for this device.".to_string(),
        );
    }

    actions.push("Re-run scan after remediation to verify risk score reduction.".to_string());
    dedup_and_cap(actions, 4)
}

fn fallback_network_risks(insights: &HybridInsightsResult) -> Vec<String> {
    let mut risks: Vec<String> = insights
        .security
        .recommendations
        .iter()
        .take(4)
        .map(|recommendation| recommendation.title.clone())
        .collect();

    if risks.is_empty() {
        risks.push("No critical risks detected from deterministic checks.".to_string());
    }

    dedup_and_cap(risks, 4)
}

fn fallback_network_actions(insights: &HybridInsightsResult) -> Vec<String> {
    let mut actions: Vec<String> = insights
        .security
        .recommendations
        .iter()
        .take(4)
        .map(|recommendation| recommendation.description.clone())
        .collect();

    if actions.is_empty() {
        actions.push("Maintain baseline monitoring and schedule regular scans.".to_string());
    }

    dedup_and_cap(actions, 4)
}

fn fallback_troubleshoot_summary(device: &HostInfo, status: &str) -> String {
    if status == "offline" {
        return format!(
            "{} appears offline. Validate power, link state, addressing, and local firewall policy.",
            target_label(device)
        );
    }

    format!(
        "{} is online but may have degraded reachability. Validate latency and service health.",
        target_label(device)
    )
}

fn fallback_likely_causes(
    device: &HostInfo,
    status: &str,
    symptoms: &Option<Vec<String>>,
) -> Vec<String> {
    let mut causes = Vec::new();

    if status == "offline" {
        causes.push("Device power loss or network link disconnection.".to_string());
        causes.push("Firewall policy may be blocking ICMP/management probes.".to_string());
        causes.push("IP address may have changed (DHCP lease renewal).".to_string());
    } else {
        causes.push("Transient packet loss or network congestion.".to_string());
        causes.push("Service-level timeout on one or more exposed ports.".to_string());
    }

    if device.open_ports.contains(&22) {
        causes.push("SSH may be reachable but constrained by ACL or auth policy.".to_string());
    }

    if let Some(symptom_list) = symptoms.as_ref() {
        for symptom in symptom_list {
            let trimmed = symptom.trim();
            if !trimmed.is_empty() {
                causes.push(format!("Observed symptom: {}", trimmed));
            }
        }
    }

    dedup_and_cap(causes, 5)
}

fn fallback_diagnostic_steps(device: &HostInfo, status: &str) -> Vec<String> {
    let mut steps = Vec::new();

    if status == "offline" {
        steps.push("Confirm device power and physical/Wi-Fi link indicators.".to_string());
        steps.push("Verify the host still exists in router ARP/DHCP tables.".to_string());
        steps.push("Test reachability from scanner host and default gateway.".to_string());
    } else {
        steps.push("Measure RTT jitter and packet loss over several pings.".to_string());
        steps.push("Validate key management ports are stable and responsive.".to_string());
    }

    if !device.open_ports.is_empty() {
        steps.push(format!(
            "Verify application/service health on ports {}.",
            format_ports(&device.open_ports)
        ));
    }

    steps.push("Re-run topology scan after each corrective change.".to_string());
    dedup_and_cap(steps, 5)
}

fn build_troubleshoot_commands(device: &HostInfo, status: &str) -> Vec<String> {
    let mut commands = vec![
        format!("ping -n 4 {}", device.ip),
        format!("tracert {}", device.ip),
        format!("arp -a | findstr {}", device.ip),
    ];

    if status == "offline" {
        commands.push(format!(
            "Test-NetConnection -ComputerName {} -InformationLevel Detailed",
            device.ip
        ));
    }

    if !device.open_ports.is_empty() {
        let port = device.open_ports[0];
        commands.push(format!(
            "Test-NetConnection -ComputerName {} -Port {}",
            device.ip, port
        ));
    }

    dedup_and_cap(commands, 5)
}

fn format_ports(ports: &[u16]) -> String {
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

fn non_empty_or_fallback(source: &[String], fallback: Vec<String>) -> Vec<String> {
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

fn dedup_and_cap(values: Vec<String>, max_items: usize) -> Vec<String> {
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
