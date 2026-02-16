use crate::database::Database;
use crate::models::{HostInfo, ScanResult};

use super::{
    get_network_stats, get_recent_scans, get_recent_telemetry, insert_scan, insert_telemetry_sample,
};

#[test]
fn test_insert_and_get_scan() {
    let db = Database::in_memory().unwrap();
    let conn = db.connection();
    let conn = conn.lock().unwrap();

    let result = ScanResult {
        interface_name: "eth0".to_string(),
        local_ip: "192.168.1.1".to_string(),
        local_mac: "AA:BB:CC:DD:EE:FF".to_string(),
        subnet: "192.168.1.0/24".to_string(),
        scan_method: "arp+icmp".to_string(),
        arp_discovered: 5,
        icmp_discovered: 3,
        total_hosts: 5,
        scan_duration_ms: 1500,
        active_hosts: vec![],
    };

    let scan_id = insert_scan(&conn, &result).unwrap();
    assert!(scan_id > 0);

    let scans = get_recent_scans(&conn, 10).unwrap();
    assert_eq!(scans.len(), 1);
    assert_eq!(scans[0].interface_name, "eth0");
}

#[test]
fn test_network_stats() {
    let db = Database::in_memory().unwrap();
    let conn = db.connection();
    let conn = conn.lock().unwrap();

    let stats = get_network_stats(&conn).unwrap();
    assert_eq!(stats.total_devices, 0);
    assert_eq!(stats.total_scans, 0);
}

#[test]
fn test_insert_scan_is_atomic_on_host_failure() {
    let db = Database::in_memory().unwrap();
    let conn = db.connection();
    let conn = conn.lock().unwrap();

    conn.execute_batch(
        r#"
            CREATE TRIGGER fail_device_insert
            AFTER INSERT ON devices
            BEGIN
                SELECT RAISE(FAIL, 'forced device insert failure');
            END;
            "#,
    )
    .unwrap();

    let host = HostInfo::new(
        "192.168.1.10".to_string(),
        "AA:BB:CC:DD:EE:01".to_string(),
        "UNKNOWN".to_string(),
        "ARP".to_string(),
    );

    let result = ScanResult {
        interface_name: "eth0".to_string(),
        local_ip: "192.168.1.1".to_string(),
        local_mac: "AA:BB:CC:DD:EE:FF".to_string(),
        subnet: "192.168.1.0/24".to_string(),
        scan_method: "arp+icmp".to_string(),
        arp_discovered: 1,
        icmp_discovered: 0,
        total_hosts: 1,
        scan_duration_ms: 1500,
        active_hosts: vec![host],
    };

    assert!(insert_scan(&conn, &result).is_err());

    let scan_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM scans", [], |row| row.get(0))
        .unwrap();
    assert_eq!(scan_count, 0, "scan row must rollback on host failure");
}

#[test]
fn test_insert_and_get_recent_telemetry() {
    let db = Database::in_memory().unwrap();
    let conn = db.connection();
    let conn = conn.lock().unwrap();

    insert_telemetry_sample(&conn, "scan.duration_ms", 1024.0, Some("scan #1")).unwrap();
    insert_telemetry_sample(&conn, "scan.duration_ms", 980.0, Some("scan #2")).unwrap();
    insert_telemetry_sample(&conn, "scan.hosts_found", 12.0, Some("scan #2")).unwrap();

    let duration_samples = get_recent_telemetry(&conn, "scan.duration_ms", 10).unwrap();
    assert_eq!(duration_samples.len(), 2);
    assert_eq!(duration_samples[0].metric_key, "scan.duration_ms");
    assert!(duration_samples[0].metric_value > 0.0);

    let host_samples = get_recent_telemetry(&conn, "scan.hosts_found", 10).unwrap();
    assert_eq!(host_samples.len(), 1);
    assert_eq!(host_samples[0].metric_value, 12.0);
}
