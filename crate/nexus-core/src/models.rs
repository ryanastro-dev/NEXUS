//! Data models for the Network Topology Mapper

use pnet::datalink::NetworkInterface;
use pnet::util::MacAddr;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::net::Ipv4Addr;
use std::str::FromStr;

/// Result structure for the host discovery scan
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub interface_name: String,
    pub local_ip: String,
    pub local_mac: String,
    pub subnet: String,
    pub scan_method: String,
    pub arp_discovered: usize,
    pub icmp_discovered: usize,
    pub total_hosts: usize,
    pub scan_duration_ms: u64,
    pub active_hosts: Vec<HostInfo>,
}

/// Information about a discovered host
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostInfo {
    pub ip: String,
    pub mac: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
    /// True if MAC is locally administered (randomized/virtual)
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub is_randomized: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_time_ms: Option<u64>,
    /// TTL value from ICMP response (used for OS fingerprinting)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl: Option<u8>,
    /// Guessed OS based on TTL value
    #[serde(skip_serializing_if = "Option::is_none")]
    pub os_guess: Option<String>,
    /// Inferred device type (ROUTER, MOBILE, PC, etc.)
    pub device_type: String,
    /// Risk score (0-100, higher = more risk)
    #[serde(default)]
    pub risk_score: u8,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub open_ports: Vec<u16>,
    pub discovery_method: String,
    // DNS/SNMP hostname
    pub hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime_seconds: Option<u64>,
    // LLDP/CDP neighbor discovery (for topology mapping)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub neighbors: Vec<NeighborInfo>,

    // Vulnerability information
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub vulnerabilities: Vec<VulnerabilityInfo>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub port_warnings: Vec<PortWarning>,
    #[serde(default)]
    pub security_grade: String, // "A", "B", "C", "D", "F"
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum SecurityGrade {
    A,
    B,
    C,
    D,
    F,
    Unknown,
}

impl SecurityGrade {
    pub fn as_str(&self) -> &'static str {
        match self {
            SecurityGrade::A => "A",
            SecurityGrade::B => "B",
            SecurityGrade::C => "C",
            SecurityGrade::D => "D",
            SecurityGrade::F => "F",
            SecurityGrade::Unknown => "",
        }
    }
}

impl fmt::Display for SecurityGrade {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for SecurityGrade {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let normalized = value.trim().to_ascii_uppercase();
        let parsed = match normalized.as_str() {
            "A" => SecurityGrade::A,
            "B" => SecurityGrade::B,
            "C" => SecurityGrade::C,
            "D" => SecurityGrade::D,
            "F" => SecurityGrade::F,
            "" | "UNKNOWN" => SecurityGrade::Unknown,
            _ => return Err(()),
        };

        Ok(parsed)
    }
}

fn parse_mac_addr(mac: &str) -> Option<MacAddr> {
    let normalized = mac.trim().replace('-', ":");
    let mut octets = [0u8; 6];
    let mut split = normalized.split(':');

    for octet in &mut octets {
        let part = split.next()?;
        *octet = u8::from_str_radix(part, 16).ok()?;
    }

    if split.next().is_some() {
        return None;
    }

    Some(MacAddr::new(
        octets[0], octets[1], octets[2], octets[3], octets[4], octets[5],
    ))
}

impl HostInfo {
    /// Canonical minimal constructor to avoid field drift across call-sites.
    pub fn new(ip: String, mac: String, device_type: String, discovery_method: String) -> Self {
        Self {
            ip,
            mac,
            vendor: None,
            is_randomized: false,
            response_time_ms: None,
            ttl: None,
            os_guess: None,
            device_type,
            risk_score: 0,
            open_ports: Vec::new(),
            discovery_method,
            hostname: None,
            system_description: None,
            uptime_seconds: None,
            neighbors: Vec::new(),
            vulnerabilities: Vec::new(),
            port_warnings: Vec::new(),
            security_grade: String::new(),
        }
    }

    pub fn ip_addr(&self) -> Option<Ipv4Addr> {
        self.ip.parse().ok()
    }

    pub fn mac_addr(&self) -> Option<MacAddr> {
        parse_mac_addr(&self.mac)
    }

    pub fn device_type_enum(&self) -> crate::network::DeviceType {
        self.device_type
            .parse()
            .unwrap_or(crate::network::DeviceType::Unknown)
    }

    pub fn set_device_type_enum(&mut self, device_type: crate::network::DeviceType) {
        self.device_type = device_type.to_string();
    }

    pub fn security_grade_enum(&self) -> SecurityGrade {
        self.security_grade
            .parse()
            .unwrap_or(SecurityGrade::Unknown)
    }

    pub fn set_security_grade_enum(&mut self, grade: SecurityGrade) {
        self.security_grade = grade.to_string();
    }
}

/// Information about a network neighbor (from LLDP/CDP)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NeighborInfo {
    /// Local port name (e.g., "GigE0/1")
    pub local_port: String,
    /// Remote device name/hostname
    pub remote_device: String,
    /// Remote port name
    pub remote_port: String,
    /// Remote device IP (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_ip: Option<String>,
}

/// Network interface information with MAC address
#[derive(Debug, Clone)]
pub struct InterfaceInfo {
    pub name: String,
    pub ip: Ipv4Addr,
    pub mac: MacAddr,
    pub prefix_len: u8,
    pub pnet_interface: NetworkInterface,
}

/// CVE vulnerability information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VulnerabilityInfo {
    pub cve_id: String,
    pub description: String,
    pub severity: String, // CRITICAL, HIGH, MEDIUM, LOW
    pub cvss_score: Option<f32>,
}

/// Port-based security warning
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortWarning {
    pub port: u16,
    pub service: String,
    pub warning: String,
    pub severity: String, // CRITICAL, HIGH, MEDIUM, LOW
    pub recommendation: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host_info_typed_accessors_parse_legacy_strings() {
        let mut host = HostInfo::new(
            "192.168.1.10".to_string(),
            "aa-bb-cc-dd-ee-ff".to_string(),
            "smart_tv".to_string(),
            "ARP".to_string(),
        );
        host.security_grade = "b".to_string();

        assert_eq!(host.ip_addr(), Some(Ipv4Addr::new(192, 168, 1, 10)));
        assert_eq!(
            host.mac_addr(),
            Some(MacAddr::new(0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff))
        );
        assert_eq!(host.device_type_enum(), crate::network::DeviceType::SmartTv);
        assert_eq!(host.security_grade_enum(), SecurityGrade::B);
    }
}
