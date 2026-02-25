use super::patterns::{
    AP_HOSTNAME_PATTERNS, AP_VENDOR_PATTERNS, CAMERA_HOSTNAME_PATTERNS, CAMERA_VENDOR_PATTERNS,
    FIREWALL_VENDOR_PATTERNS, GAME_CONSOLE_HOSTNAME_PATTERNS, GAME_CONSOLE_VENDOR_PATTERNS,
    IOT_VENDOR_PATTERNS, LAPTOP_HOSTNAME_PATTERNS, MOBILE_HOSTNAME_PATTERNS,
    MOBILE_VENDOR_PATTERNS, NAS_HOSTNAME_PATTERNS, NAS_VENDOR_PATTERNS, PC_HOSTNAME_PATTERNS,
    PC_VENDOR_PATTERNS, PRINTER_HOSTNAME_PATTERNS, PRINTER_VENDOR_PATTERNS,
    ROUTER_HOSTNAME_PATTERNS, ROUTER_VENDOR_PATTERNS, SERVER_HOSTNAME_PATTERNS,
    SERVER_VENDOR_PATTERNS, SMART_TV_HOSTNAME_PATTERNS, SMART_TV_VENDOR_PATTERNS,
    SWITCH_HOSTNAME_PATTERNS, TABLET_HOSTNAME_PATTERNS, contains_any,
};
use super::types::DeviceType;

/// Infer device type from vendor name.
pub(super) fn infer_device_type_from_vendor(vendor: &str) -> Option<DeviceType> {
    let vendor_lower = vendor.to_lowercase();

    // Network equipment vendors
    if contains_any(&vendor_lower, ROUTER_VENDOR_PATTERNS) {
        return Some(DeviceType::Router);
    }
    if contains_any(&vendor_lower, AP_VENDOR_PATTERNS) {
        return Some(DeviceType::AccessPoint);
    }
    if contains_any(&vendor_lower, FIREWALL_VENDOR_PATTERNS) {
        return Some(DeviceType::Firewall);
    }

    // Mobile device vendors
    if contains_any(&vendor_lower, MOBILE_VENDOR_PATTERNS) {
        return Some(DeviceType::Mobile);
    }

    // PC/Laptop vendors
    if contains_any(&vendor_lower, PC_VENDOR_PATTERNS) {
        return Some(DeviceType::Pc);
    }

    // Server vendors
    if contains_any(&vendor_lower, SERVER_VENDOR_PATTERNS) {
        return Some(DeviceType::Server);
    }

    // NAS vendors
    if contains_any(&vendor_lower, NAS_VENDOR_PATTERNS) {
        return Some(DeviceType::Nas);
    }

    // Smart TV vendors
    if contains_any(&vendor_lower, SMART_TV_VENDOR_PATTERNS) {
        return Some(DeviceType::SmartTv);
    }

    // Printer vendors
    if contains_any(&vendor_lower, PRINTER_VENDOR_PATTERNS) {
        return Some(DeviceType::Printer);
    }

    // Camera vendors
    if contains_any(&vendor_lower, CAMERA_VENDOR_PATTERNS) {
        return Some(DeviceType::Camera);
    }

    // Game console vendors
    if contains_any(&vendor_lower, GAME_CONSOLE_VENDOR_PATTERNS) {
        return Some(DeviceType::GameConsole);
    }

    // IoT vendors
    if contains_any(&vendor_lower, IOT_VENDOR_PATTERNS) {
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

/// Infer device type from hostname.
pub(super) fn infer_device_type_from_hostname(hostname: &str) -> Option<DeviceType> {
    let hostname_lower = hostname.to_lowercase();

    // Mobile devices
    if contains_any(&hostname_lower, MOBILE_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Mobile);
    }

    // Tablets
    if contains_any(&hostname_lower, TABLET_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Tablet);
    }

    // PCs/Laptops
    if contains_any(&hostname_lower, PC_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Pc);
    }
    if contains_any(&hostname_lower, LAPTOP_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Laptop);
    }

    // Servers
    if contains_any(&hostname_lower, SERVER_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Server);
    }

    // NAS
    if contains_any(&hostname_lower, NAS_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Nas);
    }

    // Network devices
    if contains_any(&hostname_lower, ROUTER_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Router);
    }
    if contains_any(&hostname_lower, SWITCH_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Switch);
    }
    if contains_any(&hostname_lower, AP_HOSTNAME_PATTERNS) {
        return Some(DeviceType::AccessPoint);
    }

    // Printers
    if contains_any(&hostname_lower, PRINTER_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Printer);
    }

    // Cameras
    if contains_any(&hostname_lower, CAMERA_HOSTNAME_PATTERNS) {
        return Some(DeviceType::Camera);
    }

    // Smart TVs
    if contains_any(&hostname_lower, SMART_TV_HOSTNAME_PATTERNS) {
        return Some(DeviceType::SmartTv);
    }

    // Game consoles
    if contains_any(&hostname_lower, GAME_CONSOLE_HOSTNAME_PATTERNS) {
        return Some(DeviceType::GameConsole);
    }

    None
}

/// Infer device type from open ports.
pub(super) fn infer_device_type_from_ports(ports: &[u16]) -> Option<DeviceType> {
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

/// Infer device type using all available information.
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
