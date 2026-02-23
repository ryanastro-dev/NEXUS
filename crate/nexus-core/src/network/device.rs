//! Device Type Inference Module
//!
//! Infers device types from vendor names, hostnames, and open ports.
//! Also calculates risk scores based on device characteristics.

use serde::Serialize;
use std::fmt;
use std::str::FromStr;

/// Device type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeviceType {
    Router,
    Switch,
    AccessPoint,
    Firewall,
    Server,
    Nas,
    Pc,
    Laptop,
    Mobile,
    Tablet,
    SmartTv,
    IotDevice,
    Printer,
    Camera,
    GameConsole,
    Unknown,
}

impl DeviceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceType::Router => "ROUTER",
            DeviceType::Switch => "SWITCH",
            DeviceType::AccessPoint => "ACCESS_POINT",
            DeviceType::Firewall => "FIREWALL",
            DeviceType::Server => "SERVER",
            DeviceType::Nas => "NAS",
            DeviceType::Pc => "PC",
            DeviceType::Laptop => "LAPTOP",
            DeviceType::Mobile => "MOBILE",
            DeviceType::Tablet => "TABLET",
            DeviceType::SmartTv => "SMART_TV",
            DeviceType::IotDevice => "IOT_DEVICE",
            DeviceType::Printer => "PRINTER",
            DeviceType::Camera => "CAMERA",
            DeviceType::GameConsole => "GAME_CONSOLE",
            DeviceType::Unknown => "UNKNOWN",
        }
    }
}

impl fmt::Display for DeviceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for DeviceType {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let normalized = value.trim().to_ascii_uppercase().replace(['-', ' '], "_");

        let parsed = match normalized.as_str() {
            "ROUTER" => DeviceType::Router,
            "SWITCH" => DeviceType::Switch,
            "ACCESS_POINT" | "ACCESSPOINT" => DeviceType::AccessPoint,
            "FIREWALL" => DeviceType::Firewall,
            "SERVER" => DeviceType::Server,
            "NAS" => DeviceType::Nas,
            "PC" => DeviceType::Pc,
            "LAPTOP" => DeviceType::Laptop,
            "MOBILE" => DeviceType::Mobile,
            "TABLET" => DeviceType::Tablet,
            "SMART_TV" | "SMARTTV" => DeviceType::SmartTv,
            "IOT_DEVICE" | "IOT" => DeviceType::IotDevice,
            "PRINTER" => DeviceType::Printer,
            "CAMERA" => DeviceType::Camera,
            "GAME_CONSOLE" | "GAMECONSOLE" => DeviceType::GameConsole,
            "UNKNOWN" => DeviceType::Unknown,
            _ => return Err(()),
        };

        Ok(parsed)
    }
}

/// Infer device type from vendor name
pub fn infer_device_type_from_vendor(vendor: &str) -> Option<DeviceType> {
    let vendor_lower = vendor.to_lowercase();

    // Network equipment vendors
    if contains_any(
        &vendor_lower,
        &[
            "cisco",
            "juniper",
            "mikrotik",
            "ubiquiti",
            "netgear",
            "tp-link",
            "d-link",
            "asus router",
            "linksys",
        ],
    ) {
        return Some(DeviceType::Router);
    }
    if contains_any(&vendor_lower, &["aruba", "ruckus", "meraki", "unifi"]) {
        return Some(DeviceType::AccessPoint);
    }
    if contains_any(
        &vendor_lower,
        &["fortinet", "palo alto", "checkpoint", "sonicwall"],
    ) {
        return Some(DeviceType::Firewall);
    }

    // Mobile device vendors
    if contains_any(
        &vendor_lower,
        &[
            "samsung",
            "xiaomi",
            "huawei",
            "oppo",
            "vivo",
            "oneplus",
            "realme",
            "google pixel",
        ],
    ) {
        return Some(DeviceType::Mobile);
    }

    // PC/Laptop vendors
    if contains_any(
        &vendor_lower,
        &[
            "dell", "lenovo", "hp", "hewlett", "acer", "asus", "msi", "gigabyte", "intel", "amd",
        ],
    ) {
        return Some(DeviceType::Pc);
    }

    // Server vendors
    if contains_any(&vendor_lower, &["supermicro", "ibm", "oracle", "vmware"]) {
        return Some(DeviceType::Server);
    }

    // NAS vendors
    if contains_any(
        &vendor_lower,
        &["synology", "qnap", "western digital", "seagate"],
    ) {
        return Some(DeviceType::Nas);
    }

    // Smart TV vendors
    if contains_any(
        &vendor_lower,
        &[
            "lg electronics",
            "sony",
            "tcl",
            "hisense",
            "roku",
            "amazon fire",
        ],
    ) {
        return Some(DeviceType::SmartTv);
    }

    // Printer vendors
    if contains_any(
        &vendor_lower,
        &["canon", "epson", "brother", "xerox", "ricoh", "lexmark"],
    ) {
        return Some(DeviceType::Printer);
    }

    // Camera vendors
    if contains_any(
        &vendor_lower,
        &["hikvision", "dahua", "axis", "ring", "nest", "wyze", "arlo"],
    ) {
        return Some(DeviceType::Camera);
    }

    // Game console vendors
    if contains_any(
        &vendor_lower,
        &["nintendo", "microsoft xbox", "sony playstation"],
    ) {
        return Some(DeviceType::GameConsole);
    }

    // IoT vendors
    if contains_any(
        &vendor_lower,
        &[
            "espressif",
            "tuya",
            "shelly",
            "sonoff",
            "philips hue",
            "ikea tradfri",
        ],
    ) {
        return Some(DeviceType::IotDevice);
    }

    None
}

fn infer_apple_device_type(hostname: Option<&str>, ports: &[u16]) -> Option<DeviceType> {
    if let Some(name) = hostname
        && let Some(device_type) = infer_device_type_from_hostname(name)
    {
        return Some(device_type);
    }

    // AirPlay/DAAP-like service ports are commonly exposed by Apple TV / HomePod devices.
    if ports.contains(&7000) || ports.contains(&7001) || ports.contains(&3689) {
        return Some(DeviceType::SmartTv);
    }

    // usbmuxd (62078) is commonly exposed by iOS devices over Wi-Fi.
    if ports.contains(&62078) {
        return Some(DeviceType::Mobile);
    }

    if ports.contains(&548) || ports.contains(&445) || ports.contains(&22) {
        return Some(DeviceType::Laptop);
    }

    None
}

/// Infer device type from hostname
pub fn infer_device_type_from_hostname(hostname: &str) -> Option<DeviceType> {
    let hostname_lower = hostname.to_lowercase();

    // Mobile devices
    if contains_any(
        &hostname_lower,
        &[
            "iphone", "ipad", "android", "galaxy", "pixel", "oneplus", "xiaomi", "redmi",
        ],
    ) {
        return Some(DeviceType::Mobile);
    }

    // Tablets
    if contains_any(&hostname_lower, &["tablet", "ipad"]) {
        return Some(DeviceType::Tablet);
    }

    // PCs/Laptops
    if contains_any(&hostname_lower, &["desktop", "workstation", "pc-", "-pc"]) {
        return Some(DeviceType::Pc);
    }
    if contains_any(
        &hostname_lower,
        &["laptop", "notebook", "macbook", "thinkpad", "surface"],
    ) {
        return Some(DeviceType::Laptop);
    }

    // Servers
    if contains_any(
        &hostname_lower,
        &["server", "srv", "dc-", "db-", "web-", "app-", "mail-"],
    ) {
        return Some(DeviceType::Server);
    }

    // NAS
    if contains_any(&hostname_lower, &["nas", "synology", "qnap", "diskstation"]) {
        return Some(DeviceType::Nas);
    }

    // Network devices
    if contains_any(&hostname_lower, &["router", "gateway", "gw-", "rt-"]) {
        return Some(DeviceType::Router);
    }
    if contains_any(&hostname_lower, &["switch", "sw-"]) {
        return Some(DeviceType::Switch);
    }
    if contains_any(&hostname_lower, &["ap-", "accesspoint", "wifi"]) {
        return Some(DeviceType::AccessPoint);
    }

    // Printers
    if contains_any(&hostname_lower, &["printer", "print", "prn-", "mfp-"]) {
        return Some(DeviceType::Printer);
    }

    // Cameras
    if contains_any(
        &hostname_lower,
        &["camera", "cam-", "ipcam", "cctv", "nvr", "dvr"],
    ) {
        return Some(DeviceType::Camera);
    }

    // Smart TVs
    if contains_any(
        &hostname_lower,
        &["tv-", "smarttv", "roku", "firetv", "chromecast", "appletv"],
    ) {
        return Some(DeviceType::SmartTv);
    }

    // Game consoles
    if contains_any(
        &hostname_lower,
        &["xbox", "playstation", "ps4", "ps5", "nintendo", "switch"],
    ) {
        return Some(DeviceType::GameConsole);
    }

    None
}

/// Infer device type from open ports
pub fn infer_device_type_from_ports(ports: &[u16]) -> Option<DeviceType> {
    // Common server ports
    if ports.contains(&22) && ports.contains(&80) && ports.contains(&443) {
        return Some(DeviceType::Server);
    }

    // Printer ports
    if ports.contains(&9100) || ports.contains(&631) {
        return Some(DeviceType::Printer);
    }

    // NAS ports
    if ports.contains(&5000) || ports.contains(&5001) {
        return Some(DeviceType::Nas);
    }

    // Camera ports (RTSP)
    if ports.contains(&554) || ports.contains(&8554) {
        return Some(DeviceType::Camera);
    }

    None
}

/// Infer device type using all available information
pub fn infer_device_type(
    vendor: Option<&str>,
    hostname: Option<&str>,
    ports: &[u16],
    is_gateway: bool,
) -> DeviceType {
    // Gateway is typically a router
    if is_gateway {
        return DeviceType::Router;
    }

    if let Some(v) = vendor
        && v.to_lowercase().contains("apple")
        && let Some(device_type) = infer_apple_device_type(hostname, ports)
    {
        return device_type;
    }

    // Try vendor first (most reliable)
    if let Some(v) = vendor
        && let Some(dt) = infer_device_type_from_vendor(v)
    {
        return dt;
    }

    // Try hostname
    if let Some(h) = hostname
        && let Some(dt) = infer_device_type_from_hostname(h)
    {
        return dt;
    }

    // Try ports
    if let Some(dt) = infer_device_type_from_ports(ports) {
        return dt;
    }

    DeviceType::Unknown
}

/// Calculate risk score for a device (0-100)
/// Higher score = higher risk
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

/// Helper function to check if string contains any of the patterns
fn contains_any(s: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|p| s.contains(p))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vendor_inference() {
        assert_eq!(
            infer_device_type_from_vendor("Cisco Systems"),
            Some(DeviceType::Router)
        );
        assert_eq!(infer_device_type_from_vendor("Apple Inc"), None);
        assert_eq!(
            infer_device_type_from_vendor("Dell Technologies"),
            Some(DeviceType::Pc)
        );
    }

    #[test]
    fn test_hostname_inference() {
        assert_eq!(
            infer_device_type_from_hostname("iPhone-Ryan"),
            Some(DeviceType::Mobile)
        );
        assert_eq!(
            infer_device_type_from_hostname("DESKTOP-ABC123"),
            Some(DeviceType::Pc)
        );
        assert_eq!(
            infer_device_type_from_hostname("web-server-01"),
            Some(DeviceType::Server)
        );
    }

    #[test]
    fn test_infer_device_type_router_from_vendor() {
        assert_eq!(
            infer_device_type_from_vendor("Cisco"),
            Some(DeviceType::Router)
        );
        assert_eq!(
            infer_device_type_from_vendor("TP-Link"),
            Some(DeviceType::Router)
        );
    }

    #[test]
    fn test_infer_device_type_mobile_from_vendor() {
        assert_eq!(
            infer_device_type_from_vendor("Samsung"),
            Some(DeviceType::Mobile)
        );
    }

    #[test]
    fn test_infer_device_type_apple_from_hostname_hint() {
        let result = infer_device_type(Some("Apple Inc."), Some("MacBook-Pro"), &[], false);
        assert_eq!(result, DeviceType::Laptop);
    }

    #[test]
    fn test_infer_device_type_printer_from_ports() {
        assert_eq!(
            infer_device_type_from_ports(&[631]),
            Some(DeviceType::Printer)
        );
        assert_eq!(
            infer_device_type_from_ports(&[9100]),
            Some(DeviceType::Printer)
        );
    }

    #[test]
    fn test_infer_device_type_server_from_ports() {
        assert_eq!(
            infer_device_type_from_ports(&[22, 80, 443]),
            Some(DeviceType::Server)
        );
    }

    #[test]
    fn test_infer_device_type_gateway_is_router() {
        let result = infer_device_type(
            None,
            None,
            &[],
            true, // is_gateway
        );
        assert_eq!(result, DeviceType::Router);
    }

    #[test]
    fn test_calculate_risk_score_low() {
        // Known mobile device, no suspicious ports
        let score = calculate_risk_score(
            DeviceType::Mobile,
            &[443], // HTTPS only
            false,
        );
        assert!(score < 20);
    }

    #[test]
    fn test_calculate_risk_score_high() {
        // IoT device with suspicious ports
        let score = calculate_risk_score(
            DeviceType::IotDevice,
            &[21, 23], // FTP + Telnet
            false,
        );
        assert!(score > 50);
    }

    #[test]
    fn test_calculate_risk_score_unknown_device() {
        let score = calculate_risk_score(DeviceType::Unknown, &[], false);
        // Unknown devices should have some base risk
        assert!(score >= 20);
    }

    #[test]
    fn test_calculate_risk_score_caps_at_100() {
        // Even with many risky ports, should cap at 100
        let score = calculate_risk_score(
            DeviceType::IotDevice,
            &[21, 23, 3389, 5900, 139, 445, 80, 8080],
            true, // randomized MAC
        );
        assert_eq!(score, 100);
    }

    #[test]
    fn test_calculate_risk_score_unknown_port_penalty_is_capped() {
        let noisy_registered_ports: Vec<u16> = (1024..1124).collect();
        let score = calculate_risk_score(DeviceType::Unknown, &noisy_registered_ports, false);
        assert_eq!(score, 40);
    }

    #[test]
    fn test_calculate_risk_score_ephemeral_ports_do_not_trigger_false_positive() {
        let ephemeral_ports: Vec<u16> = (49152..49252).collect();
        let score = calculate_risk_score(DeviceType::Pc, &ephemeral_ports, false);
        assert!(score <= 20);
    }

    #[test]
    fn test_device_type_parse_supports_legacy_spelling() {
        assert_eq!(
            "access point".parse::<DeviceType>().ok(),
            Some(DeviceType::AccessPoint)
        );
        assert_eq!(
            "smart-tv".parse::<DeviceType>().ok(),
            Some(DeviceType::SmartTv)
        );
        assert_eq!(
            "gameconsole".parse::<DeviceType>().ok(),
            Some(DeviceType::GameConsole)
        );
    }
}
