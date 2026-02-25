use std::collections::HashSet;

use super::*;

impl CiscoRouterAdapter {
    pub(crate) fn new(config: RouterConfig) -> Self {
        Self { config }
    }

    pub(super) fn normalize_mac(mac: &str) -> Option<String> {
        let hex: String = mac.chars().filter(|c| c.is_ascii_hexdigit()).collect();
        if hex.len() < 12 {
            return None;
        }
        let tail = &hex[hex.len() - 12..];
        let mut out = String::with_capacity(17);
        for (index, chunk) in tail.as_bytes().chunks(2).enumerate() {
            if index > 0 {
                out.push(':');
            }
            out.push(chunk[0] as char);
            out.push(chunk[1] as char);
        }
        Some(out.to_ascii_uppercase())
    }

    pub(super) fn require<'a>(value: &'a Option<String>, field: &str) -> Result<&'a str, String> {
        value
            .as_deref()
            .filter(|entry| !entry.trim().is_empty())
            .ok_or_else(|| format!("Cisco provider requires {}", field))
    }

    pub(super) fn address(&self) -> Result<&str, String> {
        Self::require(&self.config.address, "router address")
    }

    pub(super) fn username(&self) -> Result<&str, String> {
        Self::require(&self.config.username, "username")
    }

    pub(super) fn ssh_port(&self) -> u16 {
        self.config.port.unwrap_or(DEFAULT_CISCO_SSH_PORT)
    }

    pub(super) fn netconf_port(&self) -> u16 {
        DEFAULT_CISCO_NETCONF_PORT
    }

    pub(super) fn ssh_target(&self) -> Result<String, String> {
        Ok(format!("{}@{}", self.username()?, self.address()?))
    }

    pub(super) fn run_ssh_script(&self, commands: &[String]) -> Result<String, String> {
        let target = self.ssh_target()?;
        run_ssh_script(&target, self.ssh_port(), commands, SSH_CONNECT_TIMEOUT_SECS)
    }

    pub(super) fn run_netconf_rpc(&self, rpc_xml: &str) -> Result<String, String> {
        let target = self.ssh_target()?;
        run_netconf_rpc(
            &target,
            self.netconf_port(),
            rpc_xml,
            SSH_CONNECT_TIMEOUT_SECS,
        )
    }

    pub(super) fn parse_dhcp_bindings(output: &str) -> Vec<(String, String)> {
        let mut seen = HashSet::new();
        let mut bindings = Vec::new();
        for line in output.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 2 {
                continue;
            }
            let ip = parts.iter().find_map(|token| {
                token
                    .parse::<Ipv4Addr>()
                    .ok()
                    .map(|parsed| parsed.to_string())
            });
            let mac = parts.iter().find_map(|token| Self::normalize_mac(token));
            if let (Some(ip), Some(mac)) = (ip, mac)
                && seen.insert(mac.clone())
            {
                bindings.push((ip, mac));
            }
        }
        bindings
    }

    pub(super) fn route_name_for_target(target: &str) -> String {
        let suffix: String = target
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() {
                    c.to_ascii_uppercase()
                } else {
                    '_'
                }
            })
            .collect();
        format!("{}{}", BLOCK_ROUTE_NAME_PREFIX, suffix)
    }
}
