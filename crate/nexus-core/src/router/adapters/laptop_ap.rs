use std::collections::{HashMap, HashSet};
use std::net::Ipv4Addr;
use std::process::Command;

use crate::router::service::RouterAdapterOps;
use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyRequest,
    RouterProviderKind, RouterStatus,
};

pub(crate) struct LaptopApRouterAdapter {
    config: RouterConfig,
    blocked_clients: HashSet<String>,
    blocked_targets: HashMap<String, String>,
}

impl LaptopApRouterAdapter {
    pub fn new(config: RouterConfig) -> Self {
        Self {
            config,
            blocked_clients: HashSet::new(),
            blocked_targets: HashMap::new(),
        }
    }

    fn normalized_mac(mac: &str) -> Option<String> {
        let hex_only: String = mac.chars().filter(|ch| ch.is_ascii_hexdigit()).collect();
        if hex_only.len() != 12 {
            return None;
        }

        let mut normalized = String::with_capacity(17);
        for (index, chunk) in hex_only.as_bytes().chunks(2).enumerate() {
            if index > 0 {
                normalized.push(':');
            }
            normalized.push(chunk[0] as char);
            normalized.push(chunk[1] as char);
        }
        Some(normalized.to_ascii_uppercase())
    }

    fn read_arp_table() -> Option<String> {
        #[cfg(target_os = "windows")]
        let output = Command::new("arp").arg("-a").output().ok()?;
        #[cfg(not(target_os = "windows"))]
        let output = Command::new("arp").arg("-an").output().ok()?;

        if !output.status.success() {
            return None;
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();
        if text.trim().is_empty() {
            None
        } else {
            Some(text)
        }
    }

    fn parse_arp_line(line: &str) -> Option<(String, String)> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }

        // Unix-like format: ? (192.168.137.2) at aa:bb:cc:dd:ee:ff on ...
        if let Some((prefix, suffix)) = trimmed.split_once(" at ") {
            let ip_start = prefix.find('(')?;
            let ip_end = prefix[ip_start + 1..].find(')')? + ip_start + 1;
            let ip_text = prefix[ip_start + 1..ip_end].trim();
            let ip: Ipv4Addr = ip_text.parse().ok()?;
            let mac_token = suffix.split_whitespace().next()?;
            let mac = Self::normalized_mac(mac_token)?;
            return Some((ip.to_string(), mac));
        }

        // Windows format: 192.168.137.2  aa-bb-cc-dd-ee-ff  dynamic
        let mut columns = trimmed.split_whitespace();
        let ip_token = columns.next()?;
        let mac_token = columns.next()?;
        let ip: Ipv4Addr = ip_token.parse().ok()?;
        let mac = Self::normalized_mac(mac_token)?;
        Some((ip.to_string(), mac))
    }

    fn fallback_clients(&self) -> Vec<RouterClient> {
        let mac = "02:00:00:00:00:01".to_string();
        vec![RouterClient {
            mac: mac.clone(),
            ip: Some("192.168.137.2".to_string()),
            hostname: Some("ap-client-1".to_string()),
            interface_name: Some("laptop_ap".to_string()),
            signal_dbm: Some(-62),
            rx_mbps: Some(54.0),
            tx_mbps: Some(43.2),
            blocked: self.blocked_clients.contains(&mac),
        }]
    }

    fn discover_clients_from_arp(&self) -> Vec<RouterClient> {
        let Some(output) = Self::read_arp_table() else {
            return Vec::new();
        };

        let mut seen = HashSet::new();
        output
            .lines()
            .filter_map(Self::parse_arp_line)
            .filter(|(_, mac)| seen.insert(mac.clone()))
            .map(|(ip, mac)| RouterClient {
                blocked: self.blocked_clients.contains(&mac),
                mac,
                ip: Some(ip),
                hostname: None,
                interface_name: Some("laptop_ap".to_string()),
                signal_dbm: None,
                rx_mbps: None,
                tx_mbps: None,
            })
            .collect()
    }

    fn hosted_network_state_note() -> (bool, String) {
        #[cfg(target_os = "windows")]
        {
            let output = Command::new("netsh")
                .args(["wlan", "show", "hostednetwork"])
                .output();
            if let Ok(process) = output
                && process.status.success()
            {
                let text = String::from_utf8_lossy(&process.stdout).to_ascii_lowercase();
                if text.contains("status") && text.contains("started") {
                    return (
                        true,
                        "Windows hosted network detected as started. Laptop AP fallback active."
                            .to_string(),
                    );
                }
                if text.contains("status") && text.contains("not started") {
                    return (
                        false,
                        "Windows hosted network not started. Start Mobile Hotspot for full Laptop AP behavior."
                            .to_string(),
                    );
                }
            }
        }

        (
            true,
            "Temporary fallback mode. Use MikroTik/Cisco provider for production control."
                .to_string(),
        )
    }

    fn supports_enforcement() -> bool {
        cfg!(any(target_os = "windows", target_os = "linux"))
    }

    fn with_privilege_hint(message: impl AsRef<str>) -> String {
        let message = message.as_ref().trim().to_string();
        let lower = message.to_ascii_lowercase();
        let needs_hint = [
            "permission denied",
            "operation not permitted",
            "access is denied",
            "requires elevation",
            "a required privilege is not held by the client",
            "must be root",
            "not permitted",
        ]
        .iter()
        .any(|token| lower.contains(token));

        if needs_hint {
            format!(
                "{} Hint: run NEXUS GUI with Administrator/root privileges and retry.",
                message
            )
        } else {
            message
        }
    }

    #[cfg(target_os = "windows")]
    fn blocked_rule_name(mac: &str, direction: &str) -> String {
        let compact: String = mac.chars().filter(|ch| ch.is_ascii_hexdigit()).collect();
        format!(
            "NEXUS_LAPTOP_AP_BLOCK_{}_{}",
            compact.to_ascii_uppercase(),
            direction.to_ascii_uppercase()
        )
    }

    fn resolve_client_ip_for_mac(&self, mac: &str) -> Option<String> {
        self.discover_clients_from_arp()
            .into_iter()
            .find(|client| client.mac == mac)
            .and_then(|client| client.ip)
    }

    #[cfg(target_os = "windows")]
    fn apply_firewall_block(mac: &str, ip: &str) -> Result<(), String> {
        Self::apply_windows_firewall_block(mac, ip)
    }

    #[cfg(target_os = "linux")]
    fn apply_firewall_block(_mac: &str, ip: &str) -> Result<(), String> {
        Self::apply_linux_firewall_block(ip)
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    fn apply_firewall_block(_mac: &str, _ip: &str) -> Result<(), String> {
        Err("Laptop AP firewall enforcement is not supported on this OS.".to_string())
    }

    #[cfg(target_os = "windows")]
    fn remove_firewall_block(mac: &str, _ip: Option<&str>) -> Result<(), String> {
        Self::remove_windows_firewall_block(mac)
    }

    #[cfg(target_os = "linux")]
    fn remove_firewall_block(_mac: &str, ip: Option<&str>) -> Result<(), String> {
        let Some(ip) = ip else {
            return Err(
                "Cannot remove Linux firewall block without a known target IP.".to_string(),
            );
        };
        Self::remove_linux_firewall_block(ip)
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    fn remove_firewall_block(_mac: &str, _ip: Option<&str>) -> Result<(), String> {
        Err("Laptop AP firewall enforcement is not supported on this OS.".to_string())
    }

    #[cfg(target_os = "windows")]
    fn apply_windows_firewall_block(mac: &str, ip: &str) -> Result<(), String> {
        for direction in ["in", "out"] {
            let rule_name = Self::blocked_rule_name(mac, direction);
            let _ = Command::new("netsh")
                .args([
                    "advfirewall",
                    "firewall",
                    "delete",
                    "rule",
                    &format!("name={}", rule_name),
                ])
                .output();

            let output = Command::new("netsh")
                .args([
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    &format!("name={}", rule_name),
                    &format!("dir={}", direction),
                    "action=block",
                    "enable=yes",
                    "profile=any",
                    &format!("remoteip={}", ip),
                ])
                .output()
                .map_err(|error| {
                    Self::with_privilege_hint(format!(
                        "Failed to execute netsh add rule command: {}",
                        error
                    ))
                })?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return Err(format!(
                    "Windows firewall rule add failed for {} ({}): {} {}",
                    ip, direction, stdout, stderr
                )
                .pipe(Self::with_privilege_hint));
            }
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn remove_windows_firewall_block(mac: &str) -> Result<(), String> {
        for direction in ["in", "out"] {
            let rule_name = Self::blocked_rule_name(mac, direction);
            Command::new("netsh")
                .args([
                    "advfirewall",
                    "firewall",
                    "delete",
                    "rule",
                    &format!("name={}", rule_name),
                ])
                .output()
                .map_err(|error| {
                    Self::with_privilege_hint(format!(
                        "Failed to execute netsh delete rule command: {}",
                        error
                    ))
                })?;
        }
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn apply_linux_firewall_block(ip: &str) -> Result<(), String> {
        for args in [
            vec!["-C", "FORWARD", "-s", ip, "-j", "DROP"],
            vec!["-C", "FORWARD", "-d", ip, "-j", "DROP"],
        ] {
            let check = Command::new("iptables")
                .args(&args)
                .output()
                .map_err(|error| {
                    Self::with_privilege_hint(format!(
                        "Failed to execute iptables check command ({}): {}",
                        ip, error
                    ))
                })?;

            if check.status.success() {
                continue;
            }

            let mut add_args = args.clone();
            add_args[0] = "-I";
            let add = Command::new("iptables")
                .args(&add_args)
                .output()
                .map_err(|error| {
                    Self::with_privilege_hint(format!(
                        "Failed to execute iptables add command ({}): {}",
                        ip, error
                    ))
                })?;

            if !add.status.success() {
                let stderr = String::from_utf8_lossy(&add.stderr).trim().to_string();
                let stdout = String::from_utf8_lossy(&add.stdout).trim().to_string();
                return Err(format!(
                    "iptables block add failed for {}: {} {}",
                    ip, stdout, stderr
                )
                .pipe(Self::with_privilege_hint));
            }
        }
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn remove_linux_firewall_block(ip: &str) -> Result<(), String> {
        for args in [
            vec!["-D", "FORWARD", "-s", ip, "-j", "DROP"],
            vec!["-D", "FORWARD", "-d", ip, "-j", "DROP"],
        ] {
            Command::new("iptables")
                .args(&args)
                .output()
                .map_err(|error| {
                    Self::with_privilege_hint(format!(
                        "Failed to execute iptables delete command ({}): {}",
                        ip, error
                    ))
                })?;
        }
        Ok(())
    }
}

impl RouterAdapterOps for LaptopApRouterAdapter {
    fn provider(&self) -> RouterProviderKind {
        RouterProviderKind::LaptopAp
    }

    fn capabilities(&self) -> RouterCapabilities {
        RouterCapabilities {
            list_clients: true,
            block_client: Self::supports_enforcement(),
            unblock_client: Self::supports_enforcement(),
            apply_policy: false,
            traffic_stats: false,
            qos: false,
            vlan: false,
            dhcp_leases: false,
        }
    }

    fn status(&self) -> RouterStatus {
        let (connected, state_note) = Self::hosted_network_state_note();
        let enforcement_note = if Self::supports_enforcement() {
            "Firewall-backed block/unblock is enabled for this OS (may require elevated privileges)."
        } else {
            "Firewall-backed block/unblock is not available on this OS."
        };
        RouterStatus {
            provider: RouterProviderKind::LaptopAp,
            connected,
            address: self
                .config
                .address
                .clone()
                .or_else(|| Some("192.168.137.1".to_string())),
            model: Some("Laptop AP Fallback".to_string()),
            firmware_version: None,
            note: Some(format!("{} {}", state_note, enforcement_note)),
        }
    }

    fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        let clients = self.discover_clients_from_arp();
        if clients.is_empty() {
            return Ok(self.fallback_clients());
        }
        Ok(clients)
    }

    fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = Self::normalized_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        if !Self::supports_enforcement() {
            return Err(
                "Laptop AP block is unsupported on this OS. Switch to MikroTik/Cisco provider."
                    .to_string(),
            );
        }
        let ip = self.resolve_client_ip_for_mac(&normalized).ok_or_else(|| {
            format!(
                "Unable to resolve IP for MAC {} from ARP table; connect client and retry.",
                normalized
            )
        })?;
        Self::apply_firewall_block(&normalized, &ip)?;
        self.blocked_clients.insert(normalized.clone());
        self.blocked_targets.insert(normalized.clone(), ip.clone());
        Ok(RouterActionResult {
            success: true,
            message: format!(
                "Client {} blocked via OS firewall rule (target IP {}).",
                normalized, ip
            ),
        })
    }

    fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = Self::normalized_mac(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        if !Self::supports_enforcement() {
            return Err(
                "Laptop AP unblock is unsupported on this OS. Switch to MikroTik/Cisco provider."
                    .to_string(),
            );
        }
        let known_ip = self
            .blocked_targets
            .get(&normalized)
            .cloned()
            .or_else(|| self.resolve_client_ip_for_mac(&normalized));
        Self::remove_firewall_block(&normalized, known_ip.as_deref())?;
        self.blocked_clients.remove(&normalized);
        self.blocked_targets.remove(&normalized);
        Ok(RouterActionResult {
            success: true,
            message: format!("Client {} unblocked and firewall rule removed.", normalized),
        })
    }

    fn apply_policy(
        &mut self,
        _request: RouterPolicyRequest,
    ) -> Result<RouterActionResult, String> {
        Err("Laptop AP mode does not support policy push. Switch to MikroTik/Cisco provider for policy APIs.".to_string())
    }
}

trait Pipe: Sized {
    fn pipe<T>(self, op: impl FnOnce(Self) -> T) -> T {
        op(self)
    }
}

impl<T> Pipe for T {}

#[cfg(test)]
mod tests {
    use super::LaptopApRouterAdapter;

    #[test]
    fn privilege_hint_is_appended_for_permission_errors() {
        let message = LaptopApRouterAdapter::with_privilege_hint("Access is denied");
        assert!(message.contains("Administrator/root privileges"));
    }

    #[test]
    fn privilege_hint_is_not_appended_for_general_errors() {
        let message = LaptopApRouterAdapter::with_privilege_hint("Unable to resolve ARP entry");
        assert!(!message.contains("Administrator/root privileges"));
    }
}
