use crate::models::{HostInfo, ScanResult, SecurityGrade};
use crate::network::DeviceType;

use super::generate_scan_report_pdf;
use super::text::wrap_text;

#[test]
fn test_generate_scan_report_pdf() {
    let scan = ScanResult {
        interface_name: "eth0".to_string(),
        local_ip: "192.168.1.100".to_string(),
        local_mac: "00:11:22:33:44:55".to_string(),
        subnet: "192.168.1.0/24".to_string(),
        scan_method: "ARP+ICMP+TCP".to_string(),
        arp_discovered: 1,
        icmp_discovered: 1,
        total_hosts: 1,
        scan_duration_ms: 12500,
        active_hosts: vec![],
    };

    let devices = vec![HostInfo {
        ip: "192.168.1.1".to_string(),
        mac: "aa:bb:cc:dd:ee:ff".to_string(),
        hostname: Some("router".to_string()),
        vendor: Some("TP-Link".to_string()),
        device_type: DeviceType::Router,
        os_guess: Some("Linux".to_string()),
        risk_score: 15,
        open_ports: vec![80, 443],
        response_time_ms: Some(5),
        is_randomized: false,
        ttl: Some(64),
        discovery_method: "ARP+ICMP+TCP".to_string(),
        system_description: None,
        uptime_seconds: None,
        neighbors: vec![],
        vulnerabilities: vec![],
        port_warnings: vec![],
        security_grade: SecurityGrade::Unknown,
    }];

    let result = generate_scan_report_pdf(&scan, &devices, None);
    assert!(result.is_ok());
    assert!(!result.expect("PDF should be generated").is_empty());
}

#[test]
fn test_wrap_text_limits_line_width() {
    let text = "This is a long sentence that should be wrapped across multiple lines for PDF rendering correctness.";
    let lines = wrap_text(text, 24);
    assert!(!lines.is_empty());
    assert!(lines.iter().all(|line| line.chars().count() <= 24));
}
