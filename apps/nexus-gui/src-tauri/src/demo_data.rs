//! Demo Mode - Pre-loaded sample data for offline demonstrations
//!
//! Provides realistic network topology with sample devices, vulnerabilities, and alerts.

use std::collections::HashSet;
use std::sync::OnceLock;

use nexus_core::{
    AlertRecord, AlertSeverity, AlertType, DeviceType, HostInfo, ScanResult, SecurityGrade,
    VulnerabilityInfo,
};
use serde::Deserialize;

const DEMO_HOSTS_JSON: &str = include_str!("demo_data/hosts.json");
const DEMO_TARGET_HOST_COUNT: usize = 56;
const DEFAULT_SUBNET_PREFIX: &str = "192.168.1";

#[derive(Debug, Deserialize, Clone)]
struct DemoHostTemplate {
    ip: String,
    mac: String,
    vendor: Option<String>,
    hostname: Option<String>,
    device_type: String,
    os_guess: Option<String>,
    response_time_ms: Option<u64>,
    ttl: Option<u8>,
    #[serde(default)]
    open_ports: Vec<u16>,
    risk_score: u8,
    #[serde(default)]
    is_randomized: bool,
    #[serde(default)]
    vulnerabilities: Vec<VulnerabilityInfo>,
    #[serde(default)]
    security_grade: String,
}

fn demo_host_templates() -> &'static [DemoHostTemplate] {
    static HOSTS: OnceLock<Vec<DemoHostTemplate>> = OnceLock::new();

    HOSTS
        .get_or_init(|| {
            serde_json::from_str(DEMO_HOSTS_JSON)
                .expect("embedded demo host JSON must remain valid")
        })
        .as_slice()
}

/// Generate demo scan result with realistic sample data.
pub fn generate_demo_scan() -> ScanResult {
    let hosts = generate_demo_hosts();
    let scan_duration_ms = estimate_demo_scan_duration_ms(hosts.len());

    ScanResult {
        interface_name: "demo0".to_string(),
        local_ip: "192.168.1.100".to_string(),
        local_mac: "02:6e:65:78:75:73".to_string(),
        subnet: "192.168.1.0/24".to_string(),
        scan_method: "Demo Replay".to_string(),
        arp_discovered: hosts.len(),
        icmp_discovered: hosts.len(),
        total_hosts: hosts.len(),
        scan_duration_ms,
        active_hosts: hosts,
    }
}

fn estimate_demo_scan_duration_ms(host_count: usize) -> u64 {
    3_800 + (host_count as u64 * 165)
}

fn map_template_to_host(template: &DemoHostTemplate) -> HostInfo {
    HostInfo {
        ip: template.ip.clone(),
        mac: template.mac.clone(),
        vendor: template.vendor.clone(),
        hostname: template.hostname.clone(),
        device_type: template.device_type.parse().unwrap_or(DeviceType::Unknown),
        os_guess: template.os_guess.clone(),
        response_time_ms: template.response_time_ms,
        ttl: template.ttl,
        open_ports: template.open_ports.clone(),
        risk_score: template.risk_score,
        discovery_method: "Demo".to_string(),
        system_description: None,
        uptime_seconds: None,
        is_randomized: template.is_randomized,
        neighbors: vec![],
        vulnerabilities: template.vulnerabilities.clone(),
        port_warnings: vec![],
        security_grade: template
            .security_grade
            .parse()
            .unwrap_or(SecurityGrade::Unknown),
    }
}

fn grade_from_risk(risk_score: u8) -> SecurityGrade {
    match risk_score {
        0..=19 => SecurityGrade::A,
        20..=39 => SecurityGrade::B,
        40..=59 => SecurityGrade::C,
        60..=79 => SecurityGrade::D,
        _ => SecurityGrade::F,
    }
}

fn subnet_prefix(ip: &str) -> String {
    let segments: Vec<_> = ip.split('.').collect();
    if segments.len() == 4
        && segments[..3]
            .iter()
            .all(|segment| !segment.is_empty() && segment.chars().all(|ch| ch.is_ascii_digit()))
    {
        return format!("{}.{}.{}", segments[0], segments[1], segments[2]);
    }

    DEFAULT_SUBNET_PREFIX.to_string()
}

fn parse_mac_bytes(mac: &str) -> Option<[u8; 6]> {
    let parts: Vec<_> = mac.split(':').collect();
    if parts.len() != 6 {
        return None;
    }

    let mut bytes = [0u8; 6];
    for (index, part) in parts.iter().enumerate() {
        bytes[index] = u8::from_str_radix(part, 16).ok()?;
    }
    Some(bytes)
}

fn format_mac(bytes: [u8; 6]) -> String {
    format!(
        "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]
    )
}

fn next_available_ip(prefix: &str, used_ips: &mut HashSet<String>, next_octet: &mut u16) -> String {
    while *next_octet <= 254 {
        let candidate = format!("{prefix}.{}", *next_octet);
        *next_octet += 1;
        if used_ips.insert(candidate.clone()) {
            return candidate;
        }
    }

    for octet in 2..=254 {
        let candidate = format!("{prefix}.{octet}");
        if used_ips.insert(candidate.clone()) {
            return candidate;
        }
    }

    panic!("demo IP pool exhausted for prefix {prefix}");
}

fn next_available_mac(seed: &str, salt: usize, used_macs: &mut HashSet<String>) -> String {
    let mut bytes = parse_mac_bytes(seed).unwrap_or([0x02, 0x6e, 0x65, 0x78, 0x75, 0x00]);
    let entropy = (salt as u32)
        .wrapping_mul(0x45d9f3b)
        .wrapping_add(0xa5a5_17d3);

    // Ensure locally administered + unicast semantics.
    bytes[0] = (bytes[0] | 0x02) & 0xfe;
    bytes[3] ^= (entropy & 0xff) as u8;
    bytes[4] = bytes[4].wrapping_add(((entropy >> 8) & 0xff) as u8);
    bytes[5] = bytes[5].wrapping_add(((entropy >> 16) & 0xff) as u8);

    let mut attempts = 0u8;
    loop {
        let candidate = format_mac(bytes);
        if used_macs.insert(candidate.clone()) {
            return candidate;
        }
        bytes[5] = bytes[5].wrapping_add(1 + attempts);
        attempts = attempts.wrapping_add(1);
    }
}

/// Generate showcase-scale demo devices with variety in vendors, types, and risk levels.
fn generate_demo_hosts() -> Vec<HostInfo> {
    let mut hosts: Vec<HostInfo> = demo_host_templates()
        .iter()
        .map(map_template_to_host)
        .collect();
    if hosts.len() >= DEMO_TARGET_HOST_COUNT {
        return hosts;
    }

    let seed_hosts = hosts.clone();
    if seed_hosts.is_empty() {
        return hosts;
    }

    let prefix = subnet_prefix(&seed_hosts[0].ip);
    let mut used_ips: HashSet<String> = hosts.iter().map(|host| host.ip.clone()).collect();
    let mut used_macs: HashSet<String> = hosts.iter().map(|host| host.mac.clone()).collect();
    let mut next_octet = 2u16;

    while hosts.len() < DEMO_TARGET_HOST_COUNT {
        let next_index = hosts.len();
        let seed = &seed_hosts[next_index % seed_hosts.len()];

        // Skip cloning ROUTER / SWITCH / ACCESS_POINT — they are central hub nodes and cloning
        // them produces disconnected topology nodes with no edges.
        let is_infra = |dt: &DeviceType| {
            matches!(
                dt,
                DeviceType::Router | DeviceType::Switch | DeviceType::AccessPoint
            )
        };
        if is_infra(&seed.device_type) {
            // Pick a different seed that isn't infrastructure.
            let mut alt_offset = 1;
            loop {
                let alt_seed = &seed_hosts[(next_index + alt_offset) % seed_hosts.len()];
                if !is_infra(&alt_seed.device_type) {
                    let clone_round = ((next_index + alt_offset) / seed_hosts.len()).max(1);
                    let expansion_offset = next_index - seed_hosts.len();

                    let mut cloned = alt_seed.clone();
                    cloned.ip = next_available_ip(&prefix, &mut used_ips, &mut next_octet);
                    cloned.mac =
                        next_available_mac(&alt_seed.mac, next_index + clone_round, &mut used_macs);
                    cloned.hostname = alt_seed
                        .hostname
                        .as_ref()
                        .map(|name| format!("{name}-lab-{clone_round:02}"));
                    cloned.response_time_ms = alt_seed.response_time_ms.map(|base| {
                        base.saturating_add((expansion_offset % 18) as u64 + clone_round as u64)
                    });

                    let jitter = ((expansion_offset as i16 * 5 + clone_round as i16 * 3) % 17) - 8;
                    cloned.risk_score = (alt_seed.risk_score as i16 + jitter).clamp(2, 96) as u8;
                    cloned.security_grade = grade_from_risk(cloned.risk_score);

                    if !alt_seed.vulnerabilities.is_empty() && expansion_offset.is_multiple_of(4) {
                        cloned.vulnerabilities = alt_seed.vulnerabilities.clone();
                    } else {
                        cloned.vulnerabilities.clear();
                    }

                    hosts.push(cloned);
                    break;
                }
                alt_offset += 1;
                if alt_offset >= seed_hosts.len() {
                    // All seeds are infrastructure — should never happen with our templates.
                    break;
                }
            }
            continue;
        }

        let clone_round = (next_index / seed_hosts.len()).max(1);
        let expansion_offset = next_index - seed_hosts.len();

        let mut cloned = seed.clone();
        cloned.ip = next_available_ip(&prefix, &mut used_ips, &mut next_octet);
        cloned.mac = next_available_mac(&seed.mac, next_index + clone_round, &mut used_macs);
        cloned.hostname = seed
            .hostname
            .as_ref()
            .map(|name| format!("{name}-lab-{clone_round:02}"));
        cloned.response_time_ms = seed
            .response_time_ms
            .map(|base| base.saturating_add((expansion_offset % 18) as u64 + clone_round as u64));

        let jitter = ((expansion_offset as i16 * 5 + clone_round as i16 * 3) % 17) - 8;
        cloned.risk_score = (seed.risk_score as i16 + jitter).clamp(2, 96) as u8;
        cloned.security_grade = grade_from_risk(cloned.risk_score);

        // Keep vulnerability findings sparse so the larger dataset remains believable.
        if !seed.vulnerabilities.is_empty() && expansion_offset.is_multiple_of(4) {
            cloned.vulnerabilities = seed.vulnerabilities.clone();
        } else {
            cloned.vulnerabilities.clear();
        }

        hosts.push(cloned);
    }

    hosts.sort_by_key(|host| {
        host.ip
            .split('.')
            .next_back()
            .and_then(|octet| octet.parse::<u16>().ok())
            .unwrap_or(u16::MAX)
    });
    hosts
}

/// Generate sample alert records.
pub fn generate_demo_alerts() -> Vec<AlertRecord> {
    let now = chrono::Utc::now();

    vec![
        AlertRecord {
            id: 1,
            created_at: now - chrono::Duration::hours(2),
            alert_type: AlertType::NewDevice,
            device_id: Some(3),
            device_mac: Some("d2:81:c8:45:6b:71".to_string()),
            device_ip: Some("192.168.1.25".to_string()),

            message: "New device detected: Galaxy-S24-Ultra (Private Device)".to_string(),
            severity: AlertSeverity::Info,
            is_read: false,
        },
        AlertRecord {
            id: 2,
            created_at: now - chrono::Duration::hours(5),
            alert_type: AlertType::HighRisk,
            device_id: Some(2),
            device_mac: Some("00:0c:29:5a:8f:1d".to_string()),
            device_ip: Some("192.168.1.10".to_string()),
            message:
                "High risk device: Alienware-Aurora-R16 has critical vulnerabilities (EternalBlue, BlueKeep)"
                    .to_string(),
            severity: AlertSeverity::Critical,
            is_read: false,
        },
        AlertRecord {
            id: 3,
            created_at: now - chrono::Duration::days(1),
            alert_type: AlertType::PortChange,
            device_id: Some(5),
            device_mac: Some("44:19:b6:12:34:56".to_string()),
            device_ip: Some("192.168.1.70".to_string()),
            message: "New port detected on Ring-Stick-Up-Cam-Pro: RTSP (554)".to_string(),
            severity: AlertSeverity::Warning,
            is_read: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn demo_scan_has_showcase_scale_host_count() {
        let scan = generate_demo_scan();
        assert!(
            scan.active_hosts.len() >= 50,
            "demo host count should satisfy showcase target"
        );
        assert_eq!(scan.total_hosts, scan.active_hosts.len());
        assert!(scan.scan_duration_ms > 5_000);
    }

    #[test]
    fn demo_scan_has_unique_ip_and_mac_addresses() {
        let scan = generate_demo_scan();
        let unique_ips: HashSet<&str> = scan
            .active_hosts
            .iter()
            .map(|host| host.ip.as_str())
            .collect();
        let unique_macs: HashSet<&str> = scan
            .active_hosts
            .iter()
            .map(|host| host.mac.as_str())
            .collect();

        assert_eq!(unique_ips.len(), scan.active_hosts.len());
        assert_eq!(unique_macs.len(), scan.active_hosts.len());
    }

    #[test]
    fn demo_scan_preserves_vulnerability_signals() {
        let scan = generate_demo_scan();
        let vulnerable_hosts = scan
            .active_hosts
            .iter()
            .filter(|host| !host.vulnerabilities.is_empty())
            .count();

        assert!(vulnerable_hosts >= 4);
    }
}
