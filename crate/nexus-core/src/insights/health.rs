//! Network health scoring
//!
//! Calculates overall network security health score

use crate::{DeviceType, HostInfo};
use serde::{Deserialize, Serialize};

/// Network health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkHealth {
    /// Overall health score (0-100)
    pub score: u8,
    /// Health status label
    pub status: String,
    /// Letter grade (A, B, C, D, F)
    pub grade: char,
    /// Breakdown of score components
    pub breakdown: HealthBreakdown,
    /// Summary insights
    pub insights: Vec<String>,
}

/// Score breakdown by category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthBreakdown {
    /// Security score component (0..security_weight points)
    pub security: u8,
    /// Network stability component (0..stability_weight points)
    pub stability: u8,
    /// Device compliance component (0..compliance_weight points)
    pub compliance: u8,
}

fn clamp_component_penalty(raw_penalty: usize, max_component: u8) -> u8 {
    raw_penalty.min(max_component as usize) as u8
}

impl NetworkHealth {
    /// Calculate network health from scan results
    pub fn calculate(hosts: &[HostInfo]) -> Self {
        let total = hosts.len();
        if total == 0 {
            return Self::empty();
        }

        let (security_weight, stability_weight, compliance_weight) =
            crate::config::health_component_weights();

        // Calculate security score (0..security_weight)
        let high_risk_count = hosts.iter().filter(|h| h.risk_score >= 50).count();
        let medium_risk_count = hosts
            .iter()
            .filter(|h| h.risk_score >= 25 && h.risk_score < 50)
            .count();

        let security = if high_risk_count == 0 && medium_risk_count == 0 {
            security_weight
        } else {
            let penalty_40 = clamp_component_penalty(
                high_risk_count
                    .saturating_mul(15)
                    .saturating_add(medium_risk_count.saturating_mul(5)),
                40,
            );
            let scaled_penalty = ((penalty_40 as u16 * security_weight as u16) + 20) / 40;
            security_weight.saturating_sub(scaled_penalty as u8)
        };

        // Calculate stability score (0..stability_weight)
        let responsive_count = hosts
            .iter()
            .filter(|h| h.response_time_ms.is_some())
            .count();
        let response_rate = responsive_count as f32 / total as f32;
        let stability = (response_rate * stability_weight as f32) as u8;

        // Calculate compliance score (0..compliance_weight)
        let randomized_count = hosts.iter().filter(|h| h.is_randomized).count();
        let unknown_count = hosts
            .iter()
            .filter(|h| h.device_type_enum() == DeviceType::Unknown)
            .count();
        let compliance_penalty_30 = clamp_component_penalty(
            randomized_count
                .saturating_mul(3)
                .saturating_add(unknown_count.saturating_mul(2)),
            30,
        );
        let scaled_compliance_penalty =
            ((compliance_penalty_30 as u16 * compliance_weight as u16) + 15) / 30;
        let compliance = compliance_weight.saturating_sub(scaled_compliance_penalty as u8);

        // Total score
        let score = security + stability + compliance;

        // Determine grade
        let grade = match score {
            90..=100 => 'A',
            80..=89 => 'B',
            70..=79 => 'C',
            60..=69 => 'D',
            _ => 'F',
        };

        // Determine status
        let status = match score {
            80..=100 => "Excellent".to_string(),
            60..=79 => "Good".to_string(),
            40..=59 => "Fair".to_string(),
            20..=39 => "Poor".to_string(),
            _ => "Critical".to_string(),
        };

        // Generate insights
        let mut insights = Vec::new();
        insights.push(format!("{} devices scanned", total));

        if high_risk_count > 0 {
            insights.push(format!("⚠️ {} high-risk devices detected", high_risk_count));
        }
        if randomized_count > 0 {
            insights.push(format!(
                "🔒 {} devices using randomized MACs",
                randomized_count
            ));
        }
        if unknown_count > 0 {
            insights.push(format!("❓ {} unidentified device types", unknown_count));
        }
        if score >= 80 {
            insights.push("✅ Network health is good".to_string());
        }

        Self {
            score,
            status,
            grade,
            breakdown: HealthBreakdown {
                security,
                stability,
                compliance,
            },
            insights,
        }
    }

    fn empty() -> Self {
        Self {
            score: 0,
            status: "No Data".to_string(),
            grade: 'N',
            breakdown: HealthBreakdown {
                security: 0,
                stability: 0,
                compliance: 0,
            },
            insights: vec!["No devices scanned".to_string()],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_test_host(
        index: usize,
        risk_score: u8,
        randomized: bool,
        device_type: &str,
    ) -> HostInfo {
        let mut host = HostInfo::new(
            format!("192.168.1.{}", (index % 254) + 1),
            format!(
                "02:00:00:00:{:02x}:{:02x}",
                ((index / 256) % 256) as u8,
                (index % 256) as u8
            ),
            device_type.to_string(),
            "ARP".to_string(),
        );
        host.risk_score = risk_score;
        host.is_randomized = randomized;
        host.response_time_ms = Some(1);
        host
    }

    #[test]
    fn security_penalty_does_not_wrap_on_large_high_risk_counts() {
        let hosts: Vec<HostInfo> = (0..18)
            .map(|index| build_test_host(index, 50, false, "ROUTER"))
            .collect();

        let health = NetworkHealth::calculate(&hosts);

        assert_eq!(health.breakdown.security, 0);
    }

    #[test]
    fn compliance_penalty_does_not_wrap_on_large_unknown_counts() {
        let mut hosts: Vec<HostInfo> = (0..127)
            .map(|index| build_test_host(index, 0, false, "UNKNOWN"))
            .collect();
        hosts.push(build_test_host(127, 0, true, "UNKNOWN"));

        let health = NetworkHealth::calculate(&hosts);

        assert_eq!(health.breakdown.compliance, 0);
    }
}
