mod adapter;
mod normalization;

use adapter::RouterAdapter;
pub(crate) use adapter::RouterAdapterOps;
use normalization::{normalize_config, normalize_mac_address};

use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyRequest,
    RouterProviderKind, RouterStatus,
};

pub struct RouterService {
    adapter: RouterAdapter,
}

impl Default for RouterService {
    fn default() -> Self {
        Self {
            adapter: RouterAdapter::from_config(RouterConfig::default()),
        }
    }
}

impl RouterService {
    pub fn configure(&mut self, config: RouterConfig) -> Result<RouterStatus, String> {
        let normalized = normalize_config(config)?;
        self.adapter = RouterAdapter::from_config(normalized);
        Ok(self.adapter.status())
    }

    pub fn provider(&self) -> RouterProviderKind {
        self.adapter.provider()
    }

    pub fn capabilities(&self) -> RouterCapabilities {
        self.adapter.capabilities()
    }

    pub fn status(&self) -> RouterStatus {
        self.adapter.status()
    }

    pub fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        self.adapter.list_clients()
    }

    pub fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = normalize_mac_address(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        self.adapter.block_client(&normalized)
    }

    pub fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        let normalized = normalize_mac_address(mac)
            .ok_or_else(|| "Invalid MAC address format. Use XX:XX:XX:XX:XX:XX.".to_string())?;
        self.adapter.unblock_client(&normalized)
    }

    pub fn apply_policy(
        &mut self,
        request: RouterPolicyRequest,
    ) -> Result<RouterActionResult, String> {
        if request.target.trim().is_empty() {
            return Err("Policy target cannot be empty".to_string());
        }
        self.adapter.apply_policy(request)
    }
}

#[cfg(test)]
mod tests;
