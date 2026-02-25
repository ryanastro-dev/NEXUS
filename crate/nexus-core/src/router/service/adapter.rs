use crate::router::adapters::{
    cisco::CiscoRouterAdapter, laptop_ap::LaptopApRouterAdapter, mikrotik::MikrotikRouterAdapter,
    mock::MockRouterAdapter,
};
use crate::router::types::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyRequest,
    RouterProviderKind, RouterStatus,
};

pub(crate) trait RouterAdapterOps {
    fn provider(&self) -> RouterProviderKind;
    fn capabilities(&self) -> RouterCapabilities;
    fn status(&self) -> RouterStatus;
    fn list_clients(&self) -> Result<Vec<RouterClient>, String>;
    fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String>;
    fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String>;
    fn apply_policy(&mut self, request: RouterPolicyRequest) -> Result<RouterActionResult, String>;
}

pub(super) enum RouterAdapter {
    Mock(MockRouterAdapter),
    LaptopAp(LaptopApRouterAdapter),
    Mikrotik(MikrotikRouterAdapter),
    Cisco(CiscoRouterAdapter),
}

impl RouterAdapter {
    pub(super) fn from_config(config: RouterConfig) -> Self {
        match config.provider {
            RouterProviderKind::Mock => Self::Mock(MockRouterAdapter::new(config)),
            RouterProviderKind::LaptopAp => Self::LaptopAp(LaptopApRouterAdapter::new(config)),
            RouterProviderKind::Mikrotik => Self::Mikrotik(MikrotikRouterAdapter::new(config)),
            RouterProviderKind::Cisco => Self::Cisco(CiscoRouterAdapter::new(config)),
        }
    }

    pub(super) fn provider(&self) -> RouterProviderKind {
        match self {
            Self::Mock(adapter) => adapter.provider(),
            Self::LaptopAp(adapter) => adapter.provider(),
            Self::Mikrotik(adapter) => adapter.provider(),
            Self::Cisco(adapter) => adapter.provider(),
        }
    }

    pub(super) fn capabilities(&self) -> RouterCapabilities {
        match self {
            Self::Mock(adapter) => adapter.capabilities(),
            Self::LaptopAp(adapter) => adapter.capabilities(),
            Self::Mikrotik(adapter) => adapter.capabilities(),
            Self::Cisco(adapter) => adapter.capabilities(),
        }
    }

    pub(super) fn status(&self) -> RouterStatus {
        match self {
            Self::Mock(adapter) => adapter.status(),
            Self::LaptopAp(adapter) => adapter.status(),
            Self::Mikrotik(adapter) => adapter.status(),
            Self::Cisco(adapter) => adapter.status(),
        }
    }

    pub(super) fn list_clients(&self) -> Result<Vec<RouterClient>, String> {
        match self {
            Self::Mock(adapter) => adapter.list_clients(),
            Self::LaptopAp(adapter) => adapter.list_clients(),
            Self::Mikrotik(adapter) => adapter.list_clients(),
            Self::Cisco(adapter) => adapter.list_clients(),
        }
    }

    pub(super) fn block_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        match self {
            Self::Mock(adapter) => adapter.block_client(mac),
            Self::LaptopAp(adapter) => adapter.block_client(mac),
            Self::Mikrotik(adapter) => adapter.block_client(mac),
            Self::Cisco(adapter) => adapter.block_client(mac),
        }
    }

    pub(super) fn unblock_client(&mut self, mac: &str) -> Result<RouterActionResult, String> {
        match self {
            Self::Mock(adapter) => adapter.unblock_client(mac),
            Self::LaptopAp(adapter) => adapter.unblock_client(mac),
            Self::Mikrotik(adapter) => adapter.unblock_client(mac),
            Self::Cisco(adapter) => adapter.unblock_client(mac),
        }
    }

    pub(super) fn apply_policy(
        &mut self,
        request: RouterPolicyRequest,
    ) -> Result<RouterActionResult, String> {
        match self {
            Self::Mock(adapter) => adapter.apply_policy(request),
            Self::LaptopAp(adapter) => adapter.apply_policy(request),
            Self::Mikrotik(adapter) => adapter.apply_policy(request),
            Self::Cisco(adapter) => adapter.apply_policy(request),
        }
    }
}
