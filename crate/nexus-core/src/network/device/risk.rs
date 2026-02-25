use super::types::DeviceType;

/// Calculate risk score for a device (0-100).
/// Higher score = higher risk.
pub fn calculate_risk_score(
    device_type: DeviceType,
    open_ports: &[u16],
    is_randomized_mac: bool,
) -> u8 {
    let mut score: u16 = 0;

    // Base score by device type
    score += match device_type {
        DeviceType::Server => 20u16,
        DeviceType::Router | DeviceType::Firewall => 15u16,
        DeviceType::Nas => 15u16,
        DeviceType::Camera => 25u16, // IoT cameras are often vulnerable
        DeviceType::IotDevice => 30u16, // IoT devices are risky
        DeviceType::Printer => 10u16,
        DeviceType::Pc | DeviceType::Laptop => 10u16,
        DeviceType::Mobile | DeviceType::Tablet => 5u16,
        DeviceType::SmartTv => 15u16,
        DeviceType::GameConsole => 5u16,
        DeviceType::Switch | DeviceType::AccessPoint => 10u16,
        DeviceType::Unknown => 20u16, // Unknown devices are concerning
    };

    // Add risk for open ports.
    // Unknown/dynamic ports are capped to avoid false-positive F grades on high-port workloads.
    let mut unknown_port_penalty = 0u16;
    for &port in open_ports {
        match port {
            21 => score += 15u16,          // FTP - unencrypted
            23 => score += 20u16,          // Telnet - very insecure
            25 => score += 5u16,           // SMTP
            53 => score += 5u16,           // DNS
            80 => score += 5u16,           // HTTP
            139 | 445 => score += 15u16,   // SMB - often targeted
            443 => score += 2u16,          // HTTPS - relatively safe
            3389 => score += 15u16,        // RDP - often targeted
            5900..=5910 => score += 15u16, // VNC
            8080 | 8443 => score += 5u16,  // Alt HTTP/HTTPS
            _ => {
                unknown_port_penalty += unknown_port_risk_penalty(port);
            }
        }
    }
    score += unknown_port_penalty.min(20);

    // Randomized MAC slightly increases uncertainty
    if is_randomized_mac {
        score += 5u16;
    }

    // Cap at 100
    score.min(100) as u8
}

fn unknown_port_risk_penalty(port: u16) -> u16 {
    match port {
        1..=1023 => 2u16,      // uncommon privileged/service ports
        1024..=49151 => 1u16,  // registered service ports
        49152..=65535 => 0u16, // ephemeral ports
        _ => 0u16,
    }
}
