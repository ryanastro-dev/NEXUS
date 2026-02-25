use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum RouterProviderKind {
    #[default]
    Mock,
    LaptopAp,
    Mikrotik,
    Cisco,
}

impl FromStr for RouterProviderKind {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "mock" => Ok(Self::Mock),
            "laptop_ap" | "laptop-ap" | "laptopap" | "laptop" => Ok(Self::LaptopAp),
            "mikrotik" | "routeros" => Ok(Self::Mikrotik),
            "cisco" | "iosxe" | "ios-xe" => Ok(Self::Cisco),
            _ => Err(format!(
                "Unsupported router provider '{}'. Expected one of: mock, laptop_ap, mikrotik, cisco.",
                value
            )),
        }
    }
}

impl RouterProviderKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mock => "mock",
            Self::LaptopAp => "laptop_ap",
            Self::Mikrotik => "mikrotik",
            Self::Cisco => "cisco",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RouterConfig {
    pub provider: RouterProviderKind,
    pub address: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterCapabilities {
    pub list_clients: bool,
    pub block_client: bool,
    pub unblock_client: bool,
    pub apply_policy: bool,
    pub traffic_stats: bool,
    pub qos: bool,
    pub vlan: bool,
    pub dhcp_leases: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterStatus {
    pub provider: RouterProviderKind,
    pub connected: bool,
    pub address: Option<String>,
    pub model: Option<String>,
    pub firmware_version: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterClient {
    pub mac: String,
    pub ip: Option<String>,
    pub hostname: Option<String>,
    pub interface_name: Option<String>,
    pub signal_dbm: Option<i32>,
    pub rx_mbps: Option<f64>,
    pub tx_mbps: Option<f64>,
    pub blocked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RouterPolicyAction {
    Allow,
    Deny,
    LimitBandwidth,
    Prioritize,
}

impl FromStr for RouterPolicyAction {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "allow" => Ok(Self::Allow),
            "deny" | "block" => Ok(Self::Deny),
            "limit_bandwidth" | "limit-bandwidth" | "limit" => Ok(Self::LimitBandwidth),
            "prioritize" | "priority" => Ok(Self::Prioritize),
            _ => Err(format!(
                "Unsupported policy action '{}'. Expected: allow, deny, limit_bandwidth, prioritize.",
                value
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterPolicyRequest {
    pub target: String,
    pub action: RouterPolicyAction,
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouterActionResult {
    pub success: bool,
    pub message: String,
}
