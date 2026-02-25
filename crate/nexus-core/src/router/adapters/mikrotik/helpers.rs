use super::*;

impl MikrotikRouterAdapter {
    pub(crate) fn new(config: RouterConfig) -> Self {
        Self { config }
    }

    pub(super) fn normalize_mac(mac: &str) -> Option<String> {
        let hex: String = mac.chars().filter(|c| c.is_ascii_hexdigit()).collect();
        if hex.len() != 12 {
            return None;
        }
        let mut out = String::with_capacity(17);
        for (idx, chunk) in hex.as_bytes().chunks(2).enumerate() {
            if idx > 0 {
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
            .filter(|v| !v.trim().is_empty())
            .ok_or_else(|| format!("MikroTik provider requires {}", field))
    }

    pub(super) fn connect_client(&self) -> Result<ApiClient, String> {
        let address = Self::require(&self.config.address, "router address")?;
        let username = Self::require(&self.config.username, "username")?;
        let password = Self::require(&self.config.password, "password")?;
        let port = self.config.port.unwrap_or(DEFAULT_MIKROTIK_API_PORT);

        let mut client = ApiClient::connect(address, port)?;
        client
            .login(username, password)
            .map_err(|e| format!("RouterOS authentication failed: {}", e))?;
        Ok(client)
    }

    pub(super) fn non_empty(value: Option<&String>) -> Option<String> {
        value
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
    }

    pub(super) fn is_true(value: Option<&String>) -> bool {
        value
            .map(|v| v.trim().to_ascii_lowercase())
            .is_some_and(|v| matches!(v.as_str(), "1" | "true" | "yes" | "on"))
    }

    pub(super) fn block_comment_mac(mac: &str) -> String {
        format!("{}{}", BLOCK_RULE_COMMENT_PREFIX, mac.replace(':', ""))
    }

    pub(super) fn block_comment_ip(ip: &str) -> String {
        format!("{}{}", BLOCK_IP_RULE_COMMENT_PREFIX, ip.replace('.', "_"))
    }

    pub(super) fn fetch_filter_rows(
        client: &mut ApiClient,
    ) -> Result<Vec<HashMap<String, String>>, String> {
        Ok(client
            .command(vec![
                "/ip/firewall/filter/print".to_string(),
                "=.proplist=.id,comment,src-mac-address,src-address,disabled".to_string(),
            ])?
            .rows)
    }

    pub(super) fn remove_filter_by_id(client: &mut ApiClient, id: &str) -> Result<(), String> {
        client.command(vec![
            "/ip/firewall/filter/remove".to_string(),
            format!("=.id={}", id),
        ])?;
        Ok(())
    }

    pub(super) fn find_filter_ids_by_comment(
        client: &mut ApiClient,
        comment: &str,
    ) -> Result<Vec<String>, String> {
        let mut ids = Vec::new();
        for row in Self::fetch_filter_rows(client)? {
            if row.get("comment").map(String::as_str) != Some(comment) {
                continue;
            }
            if let Some(id) = Self::non_empty(row.get(".id")) {
                ids.push(id);
            }
        }
        Ok(ids)
    }

    pub(super) fn blocked_macs(client: &mut ApiClient) -> Result<HashSet<String>, String> {
        let mut set = HashSet::new();
        for row in Self::fetch_filter_rows(client)? {
            let comment = row.get("comment").map(String::as_str).unwrap_or_default();
            if !comment.starts_with(BLOCK_RULE_COMMENT_PREFIX) || Self::is_true(row.get("disabled"))
            {
                continue;
            }
            if let Some(mac) =
                Self::non_empty(row.get("src-mac-address")).and_then(|m| Self::normalize_mac(&m))
            {
                set.insert(mac);
            }
        }
        Ok(set)
    }

    pub(super) fn resolve_target_ipv4(
        client: &mut ApiClient,
        target: &str,
    ) -> Result<String, String> {
        if target.parse::<Ipv4Addr>().is_ok() {
            return Ok(target.to_string());
        }
        let target_mac = Self::normalize_mac(target)
            .ok_or_else(|| "Target must be IPv4 or MAC address".to_string())?;

        let lease_rows = client
            .command(vec![
                "/ip/dhcp-server/lease/print".to_string(),
                "=.proplist=address,mac-address".to_string(),
            ])?
            .rows;
        for row in lease_rows {
            let Some(mac) = Self::non_empty(row.get("mac-address")) else {
                continue;
            };
            if Self::normalize_mac(&mac) != Some(target_mac.clone()) {
                continue;
            }
            if let Some(ip) = Self::non_empty(row.get("address"))
                && ip.parse::<Ipv4Addr>().is_ok()
            {
                return Ok(ip);
            }
        }

        let arp_rows = client
            .command(vec![
                "/ip/arp/print".to_string(),
                "=.proplist=address,mac-address".to_string(),
            ])?
            .rows;
        for row in arp_rows {
            let Some(mac) = Self::non_empty(row.get("mac-address")) else {
                continue;
            };
            if Self::normalize_mac(&mac) != Some(target_mac.clone()) {
                continue;
            }
            if let Some(ip) = Self::non_empty(row.get("address"))
                && ip.parse::<Ipv4Addr>().is_ok()
            {
                return Ok(ip);
            }
        }

        Err(format!("Unable to resolve IPv4 for target {}", target))
    }

    pub(super) fn queue_name(prefix: &str, target: &str) -> String {
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
        format!("{}{}", prefix, suffix)
    }

    pub(super) fn upsert_queue(
        client: &mut ApiClient,
        queue_name: &str,
        target_ipv4: &str,
        max_limit: Option<&str>,
        priority: Option<&str>,
    ) -> Result<(), String> {
        let existing = client.command(vec![
            "/queue/simple/print".to_string(),
            "=.proplist=.id,name".to_string(),
            format!("?name={}", queue_name),
        ])?;
        let target = format!("{}/32", target_ipv4);

        let mut words = if let Some(row) = existing.rows.first()
            && let Some(id) = Self::non_empty(row.get(".id"))
        {
            vec![
                "/queue/simple/set".to_string(),
                format!("=.id={}", id),
                format!("=target={}", target),
            ]
        } else {
            vec![
                "/queue/simple/add".to_string(),
                format!("=name={}", queue_name),
                format!("=target={}", target),
            ]
        };

        if let Some(limit) = max_limit {
            words.push(format!("=max-limit={}", limit));
        }
        if let Some(p) = priority {
            words.push(format!("=priority={}", p));
        }
        client.command(words)?;
        Ok(())
    }

    pub(super) fn add_block_rule_for_mac(
        client: &mut ApiClient,
        mac: &str,
        comment: &str,
    ) -> Result<(), String> {
        client.command(vec![
            "/ip/firewall/filter/add".to_string(),
            "=chain=forward".to_string(),
            "=action=drop".to_string(),
            format!("=src-mac-address={}", mac),
            format!("=comment={}", comment),
            "=disabled=no".to_string(),
        ])?;
        Ok(())
    }

    pub(super) fn add_block_rule_for_ip(
        client: &mut ApiClient,
        ip: &str,
        comment: &str,
    ) -> Result<(), String> {
        client.command(vec![
            "/ip/firewall/filter/add".to_string(),
            "=chain=forward".to_string(),
            "=action=drop".to_string(),
            format!("=src-address={}", ip),
            format!("=comment={}", comment),
            "=disabled=no".to_string(),
        ])?;
        Ok(())
    }
}
