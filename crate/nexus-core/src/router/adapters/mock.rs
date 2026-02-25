use std::collections::HashSet;

use crate::router::service::RouterAdapterOps;
use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyRequest,
    RouterProviderKind, RouterStatus,
};

pub(crate) struct MockRouterAdapter {
    config: RouterConfig,
    blocked_clients: HashSet<String>,
}

impl MockRouterAdapter {
    pub fn new(config: RouterConfig) -> Self {
        Self {
            config,
            blocked_clients: HashSet::new(),
        }
    }

    fn normalized_mac(mac: &str) -> String {
        mac.trim().to_ascii_uppercase()
    }
}

impl RouterAdapterOps for MockRouterAdapter {
    fn provider(&self) -> RouterProviderKind {
        RouterProviderKind::Mock
    }

    fn capabilities(&self) -> RouterCapabilities {
        RouterCapabilities {
            list_clients: true,
            block_client: true,
            unblock_client: true,
            apply_policy: true,
            traffic_stats: true,
            qos: true,
            vlan: true,
            dhcp_leases: true,
        }
    }

    fn status(&self) -> RouterStatus {
        RouterStatus {
            provider: RouterProviderKind::Mock,
            connected: true,
            address: self.config.address.clone(),
            model: Some("NEXUS Mock Router".to_string()),
            firmware_version: Some("simulated-1.0".to_string()),
            note: Some("Mock backend for UI and API integration testing.".to_string()),
        }
    }

    fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        let clients = [
            ("AA:BB:CC:DD:EE:01", "192.168.137.10", "operator-laptop"),
            ("AA:BB:CC:DD:EE:02", "192.168.137.20", "field-phone"),
            ("AA:BB:CC:DD:EE:03", "192.168.137.30", "camera-node"),
        ];

        Ok(clients
            .iter()
            .map(|(mac, ip, host)| {
                let normalized = Self::normalized_mac(mac);
                RouterClient {
                    mac: normalized.clone(),
                    ip: Some((*ip).to_string()),
                    hostname: Some((*host).to_string()),
                    interface_name: Some("wlan0".to_string()),
                    signal_dbm: Some(-55),
                    rx_mbps: Some(72.2),
                    tx_mbps: Some(65.3),
                    blocked: self.blocked_clients.contains(&normalized),
                }
            })
            .collect())
    }

    fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = Self::normalized_mac(mac);
        let inserted = self.blocked_clients.insert(normalized.clone());
        let message = if inserted {
            format!("Mock: client {} marked as blocked.", normalized)
        } else {
            format!("Mock: client {} was already blocked.", normalized)
        };
        Ok(RouterActionResult {
            success: true,
            message,
        })
    }

    fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = Self::normalized_mac(mac);
        let removed = self.blocked_clients.remove(&normalized);
        let message = if removed {
            format!("Mock: client {} unblocked.", normalized)
        } else {
            format!("Mock: client {} was not blocked.", normalized)
        };
        Ok(RouterActionResult {
            success: true,
            message,
        })
    }

    fn apply_policy(&mut self, request: RouterPolicyRequest) -> Result<RouterActionResult, String> {
        Ok(RouterActionResult {
            success: true,
            message: format!(
                "Mock: applied policy {:?} to '{}' with value {:?}.",
                request.action, request.target, request.value
            ),
        })
    }
}
