use crate::router::types::{RouterConfig, RouterProviderKind};

const DEFAULT_MIKROTIK_API_PORT: u16 = 8728;
const DEFAULT_CISCO_SSH_PORT: u16 = 22;

fn normalize_optional_field(value: Option<String>) -> Option<String> {
    value
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
}

pub(super) fn normalize_config(config: RouterConfig) -> Result<RouterConfig, String> {
    let provider = config.provider;
    let address = normalize_optional_field(config.address);
    let username = normalize_optional_field(config.username);
    let password = normalize_optional_field(config.password);

    if config.port == Some(0) {
        return Err("Router port must be between 1 and 65535".to_string());
    }

    let port = match provider {
        RouterProviderKind::Mikrotik => Some(config.port.unwrap_or(DEFAULT_MIKROTIK_API_PORT)),
        RouterProviderKind::Cisco => Some(config.port.unwrap_or(DEFAULT_CISCO_SSH_PORT)),
        RouterProviderKind::Mock | RouterProviderKind::LaptopAp => config.port,
    };

    if matches!(
        provider,
        RouterProviderKind::Mikrotik | RouterProviderKind::Cisco
    ) && address.is_none()
    {
        return Err(format!(
            "{} provider requires router address.",
            provider.as_str()
        ));
    }

    if matches!(
        provider,
        RouterProviderKind::Mikrotik | RouterProviderKind::Cisco
    ) && username.is_none()
    {
        return Err(format!("{} provider requires username.", provider.as_str()));
    }

    if provider == RouterProviderKind::Mikrotik && password.is_none() {
        return Err("mikrotik provider requires password.".to_string());
    }

    Ok(RouterConfig {
        provider,
        address,
        username,
        password,
        port,
    })
}

pub(super) fn normalize_mac_address(mac: &str) -> Option<String> {
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
