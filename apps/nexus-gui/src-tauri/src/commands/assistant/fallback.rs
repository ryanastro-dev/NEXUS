use nexus_core::{HostInfo, HybridInsightsResult};

use super::utils::{dedup_and_cap, format_ports, risk_level, target_label};

pub(super) fn fallback_device_summary(device: &HostInfo) -> String {
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

pub(super) fn fallback_device_findings(device: &HostInfo) -> Vec<String> {
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

pub(super) fn fallback_device_actions(device: &HostInfo) -> Vec<String> {
    let mut actions = Vec::new();

    if device.open_ports.contains(&23) {
        actions
            .push("Disable Telnet (port 23) and migrate to SSH with key-based auth.".to_string());
    }
    if device.open_ports.contains(&22) {
        actions.push(
            "Keep SSH (port 22) restricted to trusted admin IPs and enforce strong credentials."
                .to_string(),
        );
    }
    if device.open_ports.contains(&3389) {
        actions.push(
            "Restrict RDP (port 3389) behind VPN/NLA and enable MFA for remote access.".to_string(),
        );
    }

    if device.risk_score >= 70 {
        actions.push(
            "Schedule an immediate patch and credential review window for this device.".to_string(),
        );
    }

    actions.push("Re-run scan after remediation to verify risk score reduction.".to_string());
    dedup_and_cap(actions, 4)
}

pub(super) fn fallback_network_risks(insights: &HybridInsightsResult) -> Vec<String> {
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

pub(super) fn fallback_network_actions(insights: &HybridInsightsResult) -> Vec<String> {
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

pub(super) fn fallback_troubleshoot_summary(device: &HostInfo, status: &str) -> String {
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

pub(super) fn fallback_likely_causes(
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

pub(super) fn fallback_diagnostic_steps(device: &HostInfo, status: &str) -> Vec<String> {
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

pub(super) fn build_troubleshoot_commands(device: &HostInfo, status: &str) -> Vec<String> {
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
