mod helpers;
mod transport;

use std::net::Ipv4Addr;

use transport::{
    output_preview as transport_output_preview, probe_tcp_endpoint, run_netconf_rpc, run_ssh_script,
};

use crate::router::service::RouterAdapterOps;
use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyAction,
    RouterPolicyRequest, RouterProviderKind, RouterStatus,
};

const DEFAULT_CISCO_SSH_PORT: u16 = 22;
const DEFAULT_CISCO_NETCONF_PORT: u16 = 830;
const PROBE_TIMEOUT_MS: u64 = 900;
const SSH_CONNECT_TIMEOUT_SECS: u64 = 6;
const BLOCK_ROUTE_NAME_PREFIX: &str = "NEXUS_BLOCK_";

pub(crate) struct CiscoRouterAdapter {
    config: RouterConfig,
}

impl RouterAdapterOps for CiscoRouterAdapter {
    fn provider(&self) -> RouterProviderKind {
        RouterProviderKind::Cisco
    }

    fn capabilities(&self) -> RouterCapabilities {
        RouterCapabilities {
            list_clients: true,
            block_client: true,
            unblock_client: true,
            apply_policy: true,
            traffic_stats: false,
            qos: false,
            vlan: false,
            dhcp_leases: true,
        }
    }

    fn status(&self) -> RouterStatus {
        let address = self.config.address.clone();
        let port = self.ssh_port();
        let connected = address
            .as_deref()
            .is_some_and(|host| probe_tcp_endpoint(host, port, PROBE_TIMEOUT_MS));

        let note = match address.as_deref() {
            Some(host) if connected => {
                if self
                    .config
                    .username
                    .as_deref()
                    .is_some_and(|value| !value.trim().is_empty())
                {
                    format!(
                        "SSH transport reachable at {}:{}; CLI/NETCONF execution layer is ready (key-based auth recommended).",
                        host, port
                    )
                } else {
                    format!(
                        "SSH transport reachable at {}:{}, but username is not set for command execution.",
                        host, port
                    )
                }
            }
            Some(host) => format!(
                "Unable to reach {}:{} within {}ms; verify IP/port/firewall.",
                host, port, PROBE_TIMEOUT_MS
            ),
            None => "Router address is missing. Configure target Cisco host/IP.".to_string(),
        };

        RouterStatus {
            provider: RouterProviderKind::Cisco,
            connected,
            address,
            model: Some("Cisco IOS-XE SSH/NETCONF".to_string()),
            firmware_version: None,
            note: Some(note),
        }
    }

    fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        let output = self.run_ssh_script(&[
            "terminal length 0".to_string(),
            "show ip dhcp binding".to_string(),
        ])?;

        let mut clients: Vec<RouterClient> = Self::parse_dhcp_bindings(&output)
            .into_iter()
            .map(|(ip, mac)| RouterClient {
                mac,
                ip: Some(ip),
                hostname: None,
                interface_name: Some("dhcp-binding".to_string()),
                signal_dbm: None,
                rx_mbps: None,
                tx_mbps: None,
                blocked: false,
            })
            .collect();

        clients.sort_by(|left, right| left.mac.cmp(&right.mac));
        Ok(clients)
    }

    fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized_mac = Self::normalize_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        let clients = self.list_clients()?;
        let target_ip = clients
            .iter()
            .find(|client| client.mac == normalized_mac)
            .and_then(|client| client.ip.clone())
            .ok_or_else(|| {
                format!(
                    "Cannot resolve IP for MAC {} from Cisco DHCP bindings. Deny by MAC requires DHCP visibility.",
                    normalized_mac
                )
            })?;

        let route_name = Self::route_name_for_target(&normalized_mac);
        self.run_ssh_script(&[
            "terminal length 0".to_string(),
            "configure terminal".to_string(),
            format!(
                "ip route {} 255.255.255.255 Null0 name {}",
                target_ip, route_name
            ),
            "end".to_string(),
            "write memory".to_string(),
        ])?;

        Ok(RouterActionResult {
            success: true,
            message: format!(
                "Cisco host block route applied for MAC {} (IP {}).",
                normalized_mac, target_ip
            ),
        })
    }

    fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized_mac = Self::normalize_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        let clients = self.list_clients()?;
        let target_ip = clients
            .iter()
            .find(|client| client.mac == normalized_mac)
            .and_then(|client| client.ip.clone())
            .ok_or_else(|| {
                format!(
                    "Cannot resolve IP for MAC {} from Cisco DHCP bindings.",
                    normalized_mac
                )
            })?;

        let route_name = Self::route_name_for_target(&normalized_mac);
        self.run_ssh_script(&[
            "terminal length 0".to_string(),
            "configure terminal".to_string(),
            format!(
                "no ip route {} 255.255.255.255 Null0 name {}",
                target_ip, route_name
            ),
            "end".to_string(),
            "write memory".to_string(),
        ])?;

        Ok(RouterActionResult {
            success: true,
            message: format!(
                "Cisco host block route removed for MAC {} (IP {}).",
                normalized_mac, target_ip
            ),
        })
    }

    fn apply_policy(&mut self, request: RouterPolicyRequest) -> Result<RouterActionResult, String> {
        if let Some(value) = request.value.as_deref() {
            if let Some(cli_payload) = value.strip_prefix("cli:") {
                let mut commands = vec!["terminal length 0".to_string()];
                commands.extend(
                    cli_payload
                        .lines()
                        .map(str::trim)
                        .filter(|line| !line.is_empty())
                        .map(ToString::to_string),
                );
                if commands.len() == 1 {
                    return Err("No CLI commands provided after 'cli:' prefix".to_string());
                }
                let output = self.run_ssh_script(&commands)?;
                return Ok(RouterActionResult {
                    success: true,
                    message: format!("Cisco CLI applied: {}", transport_output_preview(&output)),
                });
            }

            if let Some(netconf_payload) = value.strip_prefix("netconf:") {
                let output = self.run_netconf_rpc(netconf_payload)?;
                return Ok(RouterActionResult {
                    success: true,
                    message: format!(
                        "Cisco NETCONF RPC applied: {}",
                        transport_output_preview(&output)
                    ),
                });
            }
        }

        match request.action {
            RouterPolicyAction::Deny => {
                if request.target.parse::<Ipv4Addr>().is_ok() {
                    let route_name = Self::route_name_for_target(&request.target);
                    self.run_ssh_script(&[
                        "terminal length 0".to_string(),
                        "configure terminal".to_string(),
                        format!(
                            "ip route {} 255.255.255.255 Null0 name {}",
                            request.target, route_name
                        ),
                        "end".to_string(),
                        "write memory".to_string(),
                    ])?;
                    return Ok(RouterActionResult {
                        success: true,
                        message: format!("Cisco host block route applied for {}.", request.target),
                    });
                }
                self.block_client(&request.target)
            }
            RouterPolicyAction::Allow => {
                if request.target.parse::<Ipv4Addr>().is_ok() {
                    let route_name = Self::route_name_for_target(&request.target);
                    self.run_ssh_script(&[
                        "terminal length 0".to_string(),
                        "configure terminal".to_string(),
                        format!(
                            "no ip route {} 255.255.255.255 Null0 name {}",
                            request.target, route_name
                        ),
                        "end".to_string(),
                        "write memory".to_string(),
                    ])?;
                    return Ok(RouterActionResult {
                        success: true,
                        message: format!("Cisco host block route removed for {}.", request.target),
                    });
                }
                self.unblock_client(&request.target)
            }
            RouterPolicyAction::LimitBandwidth | RouterPolicyAction::Prioritize => Err(
                "For Cisco QoS/policy, pass explicit commands using value prefix 'cli:' or 'netconf:'"
                    .to_string(),
            ),
        }
    }
}
