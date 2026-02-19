//! Security recommendations
//!
//! Generates actionable security advice based on scan results

use crate::{DeviceType, HostInfo, alerts::SUSPICIOUS_PORTS};
use serde::{Deserialize, Serialize};

/// Priority level for recommendations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Priority {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

impl Priority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Priority::Critical => "CRITICAL",
            Priority::High => "HIGH",
            Priority::Medium => "MEDIUM",
            Priority::Low => "LOW",
            Priority::Info => "INFO",
        }
    }
}

/// A security recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub priority: Priority,
    pub category: String,
    pub title: String,
    pub description: String,
    pub affected_devices: Vec<String>,
}

/// Collection of recommendations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityReport {
    pub recommendations: Vec<Recommendation>,
    pub critical_count: usize,
    pub high_count: usize,
    pub total_issues: usize,
    pub summary: String,
}

fn suspicious_port_recommendation(port: u16) -> (Priority, &'static str, String, String) {
    match port {
        23 => (
            Priority::Critical,
            "Insecure Services",
            "Telnet (port 23) detected".to_string(),
            "Telnet transmits data in plaintext. Disable it and use SSH instead.".to_string(),
        ),
        21 => (
            Priority::High,
            "Insecure Services",
            "FTP (port 21) detected".to_string(),
            "FTP is insecure. Prefer SFTP or FTPS for file transfer.".to_string(),
        ),
        3389 => (
            Priority::Medium,
            "Remote Access",
            "RDP (port 3389) exposed".to_string(),
            "RDP is a common attack target. Enforce MFA/NLA and restrict exposure via VPN or ACLs."
                .to_string(),
        ),
        5900 => (
            Priority::Medium,
            "Remote Access",
            "VNC (port 5900) exposed".to_string(),
            "VNC can be high risk when internet-exposed. Restrict access and require encrypted tunnels."
                .to_string(),
        ),
        1433 => (
            Priority::High,
            "Database Exposure",
            "MSSQL (port 1433) exposed".to_string(),
            "Direct database exposure increases breach risk. Restrict access to trusted subnets and rotate credentials."
                .to_string(),
        ),
        3306 => (
            Priority::High,
            "Database Exposure",
            "MySQL (port 3306) exposed".to_string(),
            "MySQL should not be broadly reachable. Limit network access and enforce strong auth policies."
                .to_string(),
        ),
        5432 => (
            Priority::High,
            "Database Exposure",
            "PostgreSQL (port 5432) exposed".to_string(),
            "PostgreSQL should be restricted to application tiers or trusted admin paths.".to_string(),
        ),
        27017 => (
            Priority::High,
            "Database Exposure",
            "MongoDB (port 27017) exposed".to_string(),
            "MongoDB exposure can leak sensitive data. Enable authentication and restrict ingress."
                .to_string(),
        ),
        _ => (
            Priority::Medium,
            "Exposed Services",
            format!("Suspicious service (port {}) exposed", port),
            "Review service necessity and restrict access where possible.".to_string(),
        ),
    }
}

impl SecurityReport {
    /// Generate security recommendations from scan results
    pub fn generate(hosts: &[HostInfo]) -> Self {
        let mut recommendations = Vec::new();

        // Check for high-risk devices
        let high_risk: Vec<_> = hosts.iter().filter(|h| h.risk_score >= 50).collect();

        if !high_risk.is_empty() {
            recommendations.push(Recommendation {
                priority: Priority::High,
                category: "Risk Assessment".to_string(),
                title: "High-risk devices detected".to_string(),
                description: format!(
                    "{} device(s) have elevated risk scores. Review their security posture.",
                    high_risk.len()
                ),
                affected_devices: high_risk
                    .iter()
                    .map(|h| format!("{} ({})", h.ip, h.mac))
                    .collect(),
            });
        }

        // Check for suspicious ports based on alert policy so recommendations stay aligned.
        for &port in SUSPICIOUS_PORTS {
            let affected_hosts: Vec<_> = hosts
                .iter()
                .filter(|h| h.open_ports.contains(&port))
                .collect();
            if affected_hosts.is_empty() {
                continue;
            }

            let (priority, category, title, description) = suspicious_port_recommendation(port);
            recommendations.push(Recommendation {
                priority,
                category: category.to_string(),
                title,
                description,
                affected_devices: affected_hosts.iter().map(|h| h.ip.to_string()).collect(),
            });
        }

        // Check for randomized MACs (potential rogue devices)
        let randomized: Vec<_> = hosts.iter().filter(|h| h.is_randomized).collect();

        if !randomized.is_empty() {
            recommendations.push(Recommendation {
                priority: Priority::Low,
                category: "Device Tracking".to_string(),
                title: "Randomized MAC addresses detected".to_string(),
                description: format!(
                    "{} device(s) using randomized MACs. These may be harder to track consistently.",
                    randomized.len()
                ),
                affected_devices: randomized.iter()
                    .map(|h| format!("{} ({})", h.ip, h.mac))
                    .collect(),
            });
        }

        // Check for unknown device types
        let unknown: Vec<_> = hosts
            .iter()
            .filter(|h| h.device_type_enum() == DeviceType::Unknown)
            .collect();

        if !unknown.is_empty() {
            recommendations.push(Recommendation {
                priority: Priority::Info,
                category: "Device Classification".to_string(),
                title: "Unidentified devices".to_string(),
                description: format!(
                    "{} device(s) could not be classified. Consider investigating these.",
                    unknown.len()
                ),
                affected_devices: unknown
                    .iter()
                    .map(|h| {
                        format!(
                            "{} ({})",
                            h.ip,
                            h.vendor.as_deref().unwrap_or("Unknown vendor")
                        )
                    })
                    .collect(),
            });
        }

        // If no issues, add positive note
        if recommendations.is_empty() {
            recommendations.push(Recommendation {
                priority: Priority::Info,
                category: "General".to_string(),
                title: "No major issues detected".to_string(),
                description: "Your network appears to be well-configured.".to_string(),
                affected_devices: vec![],
            });
        }

        // Count by priority
        let critical_count = recommendations
            .iter()
            .filter(|r| matches!(r.priority, Priority::Critical))
            .count();
        let high_count = recommendations
            .iter()
            .filter(|r| matches!(r.priority, Priority::High))
            .count();
        let total_issues = recommendations.len();

        // Generate summary
        let summary = if critical_count > 0 {
            format!(
                "⚠️ {} critical issue(s) require immediate attention",
                critical_count
            )
        } else if high_count > 0 {
            format!("⚡ {} high-priority recommendation(s)", high_count)
        } else {
            "✅ No critical security issues found".to_string()
        };

        Self {
            recommendations,
            critical_count,
            high_count,
            total_issues,
            summary,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn host_with_ports(ports: &[u16]) -> HostInfo {
        let mut host = HostInfo::new(
            "192.168.1.10".to_string(),
            "00:11:22:33:44:55".to_string(),
            "ROUTER".to_string(),
            "ARP".to_string(),
        );
        host.open_ports = ports.to_vec();
        host
    }

    #[test]
    fn suspicious_ports_have_matching_recommendations() {
        let report = SecurityReport::generate(&[host_with_ports(SUSPICIOUS_PORTS)]);

        assert_eq!(report.recommendations.len(), SUSPICIOUS_PORTS.len());
        for port in SUSPICIOUS_PORTS {
            let title_match = report
                .recommendations
                .iter()
                .any(|recommendation| recommendation.title.contains(&format!("port {}", port)));
            assert!(
                title_match,
                "missing recommendation title for suspicious port {}",
                port
            );
        }
    }
}
