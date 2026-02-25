use super::inference::{
    infer_device_type, infer_device_type_from_hostname, infer_device_type_from_ports,
    infer_device_type_from_vendor,
};
use super::risk::calculate_risk_score;
use super::types::DeviceType;

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
