mod client;
mod helpers;

use std::collections::{HashMap, HashSet};
use std::net::{Ipv4Addr, TcpStream, ToSocketAddrs};
use std::time::Duration;

use client::ApiClient;

use crate::router::service::RouterAdapterOps;
use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyAction,
    RouterPolicyRequest, RouterProviderKind, RouterStatus,
};

pub(super) const DEFAULT_MIKROTIK_API_PORT: u16 = 8728;
pub(super) const DEFAULT_MIKROTIK_TLS_PORT: u16 = 8729;
pub(super) const CONNECT_TIMEOUT_MS: u64 = 1500;
pub(super) const IO_TIMEOUT_MS: u64 = 3000;
const BLOCK_RULE_COMMENT_PREFIX: &str = "NEXUS_BLOCK_";
const BLOCK_IP_RULE_COMMENT_PREFIX: &str = "NEXUS_BLOCK_IP_";
const LIMIT_QUEUE_PREFIX: &str = "NEXUS_LIMIT_";
const PRIORITY_QUEUE_PREFIX: &str = "NEXUS_PRIORITY_";
pub(crate) struct MikrotikRouterAdapter {
    config: RouterConfig,
}

impl RouterAdapterOps for MikrotikRouterAdapter {
    fn provider(&self) -> RouterProviderKind {
        RouterProviderKind::Mikrotik
    }

    fn capabilities(&self) -> RouterCapabilities {
        RouterCapabilities {
            list_clients: true,
            block_client: true,
            unblock_client: true,
            apply_policy: true,
            traffic_stats: false,
            qos: true,
            vlan: false,
            dhcp_leases: true,
        }
    }

    fn status(&self) -> RouterStatus {
        let address = self.config.address.clone();
        let port = self.config.port.unwrap_or(DEFAULT_MIKROTIK_API_PORT);
        let mut connected = false;
        let note = match address.as_deref() {
            Some(host) => {
                let reachable = format!("{host}:{port}")
                    .to_socket_addrs()
                    .ok()
                    .into_iter()
                    .flatten()
                    .any(|socket| {
                        TcpStream::connect_timeout(
                            &socket,
                            Duration::from_millis(CONNECT_TIMEOUT_MS),
                        )
                        .is_ok()
                    });
                if !reachable {
                    format!(
                        "Unable to reach RouterOS API at {}:{} within {}ms.",
                        host, port, CONNECT_TIMEOUT_MS
                    )
                } else {
                    match self.connect_client() {
                        Ok(_) => {
                            connected = true;
                            format!(
                                "Connected and authenticated to RouterOS API at {}:{}.",
                                host, port
                            )
                        }
                        Err(error) => format!(
                            "RouterOS API reachable at {}:{}, but authentication failed: {}",
                            host, port, error
                        ),
                    }
                }
            }
            None => "Router address is missing. Configure target RouterOS host/IP.".to_string(),
        };

        RouterStatus {
            provider: RouterProviderKind::Mikrotik,
            connected,
            address,
            model: Some("MikroTik RouterOS API".to_string()),
            firmware_version: None,
            note: Some(note),
        }
    }

    fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        let mut client = self.connect_client()?;
        let blocked = Self::blocked_macs(&mut client)?;
        let lease_rows = client
            .command(vec![
                "/ip/dhcp-server/lease/print".to_string(),
                "=.proplist=address,mac-address,host-name,server".to_string(),
            ])?
            .rows;

        let mut by_mac: HashMap<String, RouterClient> = HashMap::new();
        for row in lease_rows {
            let Some(mac_raw) = Self::non_empty(row.get("mac-address")) else {
                continue;
            };
            let Some(mac) = Self::normalize_mac(&mac_raw) else {
                continue;
            };

            by_mac.entry(mac.clone()).or_insert_with(|| RouterClient {
                blocked: blocked.contains(&mac),
                mac: mac.clone(),
                ip: Self::non_empty(row.get("address")),
                hostname: Self::non_empty(row.get("host-name")),
                interface_name: Self::non_empty(row.get("server")),
                signal_dbm: None,
                rx_mbps: None,
                tx_mbps: None,
            });
        }

        let arp_rows = client
            .command(vec![
                "/ip/arp/print".to_string(),
                "=.proplist=address,mac-address,interface".to_string(),
            ])?
            .rows;
        for row in arp_rows {
            let Some(mac_raw) = Self::non_empty(row.get("mac-address")) else {
                continue;
            };
            let Some(mac) = Self::normalize_mac(&mac_raw) else {
                continue;
            };

            let entry = by_mac.entry(mac.clone()).or_insert_with(|| RouterClient {
                blocked: blocked.contains(&mac),
                mac: mac.clone(),
                ip: None,
                hostname: None,
                interface_name: None,
                signal_dbm: None,
                rx_mbps: None,
                tx_mbps: None,
            });
            if entry.ip.is_none() {
                entry.ip = Self::non_empty(row.get("address"));
            }
            if entry.interface_name.is_none() {
                entry.interface_name = Self::non_empty(row.get("interface"));
            }
            entry.blocked = blocked.contains(&mac);
        }

        let mut clients: Vec<RouterClient> = by_mac.into_values().collect();
        clients.sort_by(|a, b| a.mac.cmp(&b.mac));
        Ok(clients)
    }

    fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let mac = Self::normalize_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;

        let mut client = self.connect_client()?;
        let comment = Self::block_comment_mac(&mac);
        for id in Self::find_filter_ids_by_comment(&mut client, &comment)? {
            Self::remove_filter_by_id(&mut client, &id)?;
        }
        Self::add_block_rule_for_mac(&mut client, &mac, &comment)?;

        Ok(RouterActionResult {
            success: true,
            message: format!("RouterOS drop rule applied for MAC {}.", mac),
        })
    }

    fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let mac = Self::normalize_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;

        let mut client = self.connect_client()?;
        let comment = Self::block_comment_mac(&mac);
        let ids = Self::find_filter_ids_by_comment(&mut client, &comment)?;
        if ids.is_empty() {
            return Ok(RouterActionResult {
                success: true,
                message: format!("No RouterOS block rule found for MAC {}.", mac),
            });
        }
        for id in ids {
            Self::remove_filter_by_id(&mut client, &id)?;
        }

        Ok(RouterActionResult {
            success: true,
            message: format!("RouterOS block rule removed for MAC {}.", mac),
        })
    }

    fn apply_policy(&mut self, request: RouterPolicyRequest) -> Result<RouterActionResult, String> {
        match request.action {
            RouterPolicyAction::Deny => {
                if request.target.parse::<Ipv4Addr>().is_ok() {
                    let mut client = self.connect_client()?;
                    let comment = Self::block_comment_ip(&request.target);
                    for id in Self::find_filter_ids_by_comment(&mut client, &comment)? {
                        Self::remove_filter_by_id(&mut client, &id)?;
                    }
                    Self::add_block_rule_for_ip(&mut client, &request.target, &comment)?;
                    return Ok(RouterActionResult {
                        success: true,
                        message: format!(
                            "RouterOS drop rule applied for source IP {}.",
                            request.target
                        ),
                    });
                }
                self.block_client(&request.target)
            }
            RouterPolicyAction::Allow => {
                if request.target.parse::<Ipv4Addr>().is_ok() {
                    let mut client = self.connect_client()?;
                    let comment = Self::block_comment_ip(&request.target);
                    let ids = Self::find_filter_ids_by_comment(&mut client, &comment)?;
                    for id in ids {
                        Self::remove_filter_by_id(&mut client, &id)?;
                    }
                    return Ok(RouterActionResult {
                        success: true,
                        message: format!(
                            "RouterOS drop rule removed for source IP {}.",
                            request.target
                        ),
                    });
                }
                self.unblock_client(&request.target)
            }
            RouterPolicyAction::LimitBandwidth => {
                let limit = request
                    .value
                    .as_deref()
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .ok_or_else(|| {
                        "Limit bandwidth requires value (example: 10M or 10M/10M).".to_string()
                    })?;
                let normalized_limit = if limit.contains('/') {
                    limit.to_string()
                } else {
                    format!("{0}/{0}", limit)
                };

                let mut client = self.connect_client()?;
                let target_ip = Self::resolve_target_ipv4(&mut client, &request.target)?;
                let queue_name = Self::queue_name(LIMIT_QUEUE_PREFIX, &request.target);
                Self::upsert_queue(
                    &mut client,
                    &queue_name,
                    &target_ip,
                    Some(&normalized_limit),
                    None,
                )?;
                Ok(RouterActionResult {
                    success: true,
                    message: format!(
                        "RouterOS bandwidth limit '{}' applied to {} (IP {}).",
                        normalized_limit, request.target, target_ip
                    ),
                })
            }
            RouterPolicyAction::Prioritize => {
                let mut client = self.connect_client()?;
                let target_ip = Self::resolve_target_ipv4(&mut client, &request.target)?;
                let queue_name = Self::queue_name(PRIORITY_QUEUE_PREFIX, &request.target);
                let optional_limit = request
                    .value
                    .as_deref()
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .map(|value| {
                        if value.contains('/') {
                            value.to_string()
                        } else {
                            format!("{0}/{0}", value)
                        }
                    });
                Self::upsert_queue(
                    &mut client,
                    &queue_name,
                    &target_ip,
                    optional_limit.as_deref(),
                    Some("1/1"),
                )?;
                Ok(RouterActionResult {
                    success: true,
                    message: format!(
                        "RouterOS priority queue applied to {} (IP {}).",
                        request.target, target_ip
                    ),
                })
            }
        }
    }
}
