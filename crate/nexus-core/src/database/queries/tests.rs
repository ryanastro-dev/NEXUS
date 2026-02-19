use crate::database::Database;
use crate::models::{HostInfo, ScanResult};

use super::{
    get_network_stats, get_recent_scans, get_recent_telemetry, insert_scan,
    insert_telemetry_sample, normalize_legacy_fields,
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

#[test]
fn test_normalize_legacy_fields_canonicalizes_device_type_and_grade() {
    let db = Database::in_memory().unwrap();
    let conn = db.connection();
    let conn = conn.lock().unwrap();

    conn.execute(
        r#"
        INSERT INTO scans (
            interface_name, local_ip, local_mac, subnet, scan_method,
            arp_discovered, icmp_discovered, total_hosts, duration_ms
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        "#,
        rusqlite::params![
            "eth0",
            "192.168.1.1",
            "AA:BB:CC:DD:EE:FF",
            "192.168.1.0/24",
            "arp+icmp",
            1,
            1,
            1,
            1000
        ],
    )
    .unwrap();
    let scan_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO devices (mac, device_type) VALUES (?1, ?2)",
        rusqlite::params!["AA:BB:CC:DD:EE:01", "router"],
    )
    .unwrap();
    let device_id = conn.last_insert_rowid();

    conn.execute(
        r#"
        INSERT INTO device_history (
            scan_id, device_id, ip, security_grade, is_online
        ) VALUES (?1, ?2, ?3, ?4, ?5)
        "#,
        rusqlite::params![scan_id, device_id, "192.168.1.10", "b", 1],
    )
    .unwrap();

    let summary = normalize_legacy_fields(&conn).unwrap();
    assert_eq!(summary.normalized_device_types, 1);
    assert_eq!(summary.normalized_security_grades, 1);
    assert_eq!(summary.rows_updated, 2);

    let normalized_type: String = conn
        .query_row(
            "SELECT device_type FROM devices WHERE id = ?1",
            [device_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(normalized_type, "ROUTER");

    let normalized_grade: String = conn
        .query_row(
            "SELECT security_grade FROM device_history WHERE device_id = ?1",
            [device_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(normalized_grade, "B");
}
