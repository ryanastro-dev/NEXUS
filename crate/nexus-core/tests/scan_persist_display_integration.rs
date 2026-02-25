#![cfg(feature = "integration")]

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use nexus_core::database::{Database, queries};
use nexus_core::{
    AiMode, AiSettings, AppCommandResult, AppContext, CliCommand, HostInfo, ScanResult,
    execute_command_typed,
};

fn disabled_ai_settings() -> AiSettings {
    AiSettings {
        enabled: false,
        mode: AiMode::Disabled,
        timeout_ms: 1000,
        ollama_endpoint: "http://127.0.0.1:11434".to_string(),
        ollama_model: "qwen3:8b".to_string(),
        gemini_endpoint: "https://generativelanguage.googleapis.com".to_string(),
        gemini_model: "gemini-2.5-flash".to_string(),
        gemini_api_key: None,
        cloud_allow_sensitive: false,
    }
}

fn unique_temp_db_path(prefix: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after unix epoch")
        .as_nanos();
    std::env::temp_dir().join(format!("{}_{}.db", prefix, timestamp))
}

fn build_mock_scan_result() -> ScanResult {
    let mut gateway = HostInfo::new(
        "192.168.88.1".to_string(),
        "AA:BB:CC:DD:EE:01".to_string(),
        "ROUTER".to_string(),
        "ARP+ICMP+TCP".to_string(),
    );
    gateway.vendor = Some("MikroTik".to_string());
    gateway.hostname = Some("edge-router".to_string());
    gateway.response_time_ms = Some(2);
    gateway.open_ports = vec![22, 80, 8728];
    gateway.risk_score = 18;

    let mut laptop = HostInfo::new(
        "192.168.88.20".to_string(),
        "AA:BB:CC:DD:EE:20".to_string(),
        "PC".to_string(),
        "ARP+ICMP".to_string(),
    );
    laptop.vendor = Some("Dell".to_string());
    laptop.hostname = Some("ops-laptop".to_string());
    laptop.response_time_ms = Some(7);
    laptop.open_ports = vec![443];
    laptop.risk_score = 30;

    ScanResult {
        interface_name: "eth0".to_string(),
        local_ip: "192.168.88.10".to_string(),
        local_mac: "00:11:22:33:44:55".to_string(),
        subnet: "192.168.88.0/24".to_string(),
        scan_method: "Mock Integration Scan".to_string(),
        arp_discovered: 2,
        icmp_discovered: 2,
        total_hosts: 2,
        scan_duration_ms: 950,
        active_hosts: vec![gateway, laptop],
    }
}

#[tokio::test]
async fn mock_scan_persists_and_surfaces_through_ai_insights_read_path() {
    let db_path = unique_temp_db_path("nexus_scan_persist_display");
    let mock_scan = build_mock_scan_result();

    let db = Database::new(db_path.clone()).expect("database should initialize");
    {
        let conn = db.connection();
        let conn = conn.lock().expect("database lock should not be poisoned");
        let scan_id = queries::insert_scan(&conn, &mock_scan).expect("scan insert should succeed");
        assert!(scan_id > 0);

        let latest_hosts = queries::get_latest_scan_hosts(&conn)
            .expect("latest host query should return persisted scan");
        assert_eq!(latest_hosts.len(), mock_scan.total_hosts);
        assert!(
            latest_hosts.iter().any(|host| host.ip == "192.168.88.1"),
            "gateway host should be present in latest scan hosts"
        );

        let recent_scans =
            queries::get_recent_scans(&conn, 1).expect("recent scan query should succeed");
        assert_eq!(recent_scans.len(), 1);
        assert_eq!(recent_scans[0].total_hosts, mock_scan.total_hosts as i32);
    }
    drop(db);

    let context = AppContext::from_env()
        .with_ai_settings(disabled_ai_settings())
        .with_db_path(db_path.clone());
    let ai_result = execute_command_typed(CliCommand::AiInsights, &context)
        .await
        .expect("ai insights should read from persisted scan");

    match ai_result {
        AppCommandResult::AiInsights(payload) => {
            assert_eq!(payload.device_distribution.total, mock_scan.total_hosts);
            assert!(payload.health.score <= 100);
            assert!(
                !payload.security.summary.trim().is_empty(),
                "security summary should be generated for persisted data"
            );
        }
        _ => panic!("expected AppCommandResult::AiInsights"),
    }

    let _ = std::fs::remove_file(db_path);
}
