use crate::router::{RouterConfig, RouterProviderKind};

use super::RouterService;

#[test]
fn provider_parsing_accepts_aliases() {
    assert_eq!(
        "routeros"
            .parse::<RouterProviderKind>()
            .expect("routeros alias should parse"),
        RouterProviderKind::Mikrotik
    );
    assert_eq!(
        "ios-xe"
            .parse::<RouterProviderKind>()
            .expect("ios-xe alias should parse"),
        RouterProviderKind::Cisco
    );
}

#[test]
fn mock_block_unblock_cycle_updates_client_state() {
    let mut service = RouterService::default();
    let clients = service.list_clients().expect("mock clients should load");
    let first_mac = clients
        .first()
        .expect("mock clients should not be empty")
        .mac
        .clone();

    service
        .block_client(&first_mac)
        .expect("block should succeed in mock provider");
    let blocked = service
        .list_clients()
        .expect("clients should load after block");
    assert!(
        blocked
            .iter()
            .any(|client| client.mac == first_mac && client.blocked)
    );

    service
        .unblock_client(&first_mac)
        .expect("unblock should succeed in mock provider");
    let unblocked = service
        .list_clients()
        .expect("clients should load after unblock");
    assert!(
        unblocked
            .iter()
            .any(|client| client.mac == first_mac && !client.blocked)
    );
}

#[test]
fn mikrotik_config_requires_credentials() {
    let mut service = RouterService::default();
    let error = service
        .configure(RouterConfig {
            provider: RouterProviderKind::Mikrotik,
            address: Some("192.168.88.1".to_string()),
            username: None,
            password: None,
            port: Some(8728),
        })
        .expect_err("mikrotik should require credentials");
    assert!(error.contains("requires username"));
}

#[test]
fn configure_router_requires_address_for_hardware_providers() {
    let mut service = RouterService::default();
    let error = service
        .configure(RouterConfig {
            provider: RouterProviderKind::Cisco,
            address: None,
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            port: None,
        })
        .expect_err("cisco without address should fail");
    assert!(error.contains("requires router address"));
}

#[test]
fn configure_router_applies_default_ports() {
    let mut service = RouterService::default();
    service
        .configure(RouterConfig {
            provider: RouterProviderKind::Mikrotik,
            address: Some("192.168.88.1".to_string()),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            port: None,
        })
        .expect("mikrotik config should succeed with default port");
    let status = service.status();
    assert_eq!(status.address.as_deref(), Some("192.168.88.1"));
}

#[test]
fn cisco_config_requires_username() {
    let mut service = RouterService::default();
    let error = service
        .configure(RouterConfig {
            provider: RouterProviderKind::Cisco,
            address: Some("192.168.1.1".to_string()),
            username: None,
            password: None,
            port: None,
        })
        .expect_err("cisco provider should require username");
    assert!(error.contains("requires username"));
}

#[test]
fn block_client_rejects_invalid_mac_format() {
    let mut service = RouterService::default();
    let error = service
        .block_client("not-a-mac")
        .expect_err("invalid mac should be rejected");
    assert!(error.contains("Invalid MAC address format"));
}

#[test]
fn mikrotik_capabilities_match_current_implementation_scope() {
    let mut service = RouterService::default();
    service
        .configure(RouterConfig {
            provider: RouterProviderKind::Mikrotik,
            address: Some("192.168.88.1".to_string()),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            port: None,
        })
        .expect("mikrotik config should succeed");

    let caps = service.capabilities();
    assert!(caps.list_clients);
    assert!(caps.block_client);
    assert!(caps.unblock_client);
    assert!(caps.apply_policy);
    assert!(caps.qos);
    assert!(caps.dhcp_leases);
    assert!(!caps.traffic_stats);
    assert!(!caps.vlan);
}

#[test]
fn cisco_capabilities_match_current_implementation_scope() {
    let mut service = RouterService::default();
    service
        .configure(RouterConfig {
            provider: RouterProviderKind::Cisco,
            address: Some("192.168.1.1".to_string()),
            username: Some("admin".to_string()),
            password: Some("secret".to_string()),
            port: None,
        })
        .expect("cisco config should succeed");

    let caps = service.capabilities();
    assert!(caps.list_clients);
    assert!(caps.block_client);
    assert!(caps.unblock_client);
    assert!(caps.apply_policy);
    assert!(caps.dhcp_leases);
    assert!(!caps.traffic_stats);
    assert!(!caps.qos);
    assert!(!caps.vlan);
}

#[test]
fn laptop_ap_capabilities_match_current_implementation_scope() {
    let mut service = RouterService::default();
    service
        .configure(RouterConfig {
            provider: RouterProviderKind::LaptopAp,
            address: None,
            username: None,
            password: None,
            port: None,
        })
        .expect("laptop ap config should succeed");

    let caps = service.capabilities();
    let supports_firewall_enforcement = cfg!(any(target_os = "windows", target_os = "linux"));
    assert!(caps.list_clients);
    assert_eq!(caps.block_client, supports_firewall_enforcement);
    assert_eq!(caps.unblock_client, supports_firewall_enforcement);
    assert!(!caps.apply_policy);
    assert!(!caps.traffic_stats);
    assert!(!caps.qos);
    assert!(!caps.vlan);
    assert!(!caps.dhcp_leases);
}
