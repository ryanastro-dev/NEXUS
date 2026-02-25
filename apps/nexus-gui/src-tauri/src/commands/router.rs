use std::str::FromStr;

use nexus_core::{
    RouterActionResult, RouterCapabilities, RouterClient, RouterConfig, RouterPolicyAction,
    RouterPolicyRequest, RouterProviderKind, RouterStatus,
};

use super::{CommandResult, RouterState};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RouterConfigInput {
    pub provider: String,
    pub address: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RouterPolicyInput {
    pub target: String,
    pub action: String,
    pub value: Option<String>,
}

#[tauri::command]
pub async fn configure_router(
    router_state: tauri::State<'_, RouterState>,
    config: RouterConfigInput,
) -> CommandResult<RouterStatus> {
    let provider = RouterProviderKind::from_str(&config.provider)?;
    let mut service = router_state.service.lock().await;
    service
        .configure(RouterConfig {
            provider,
            address: config.address,
            username: config.username,
            password: config.password,
            port: config.port,
        })
        .map_err(Into::into)
}

#[tauri::command]
pub async fn get_router_provider(
    router_state: tauri::State<'_, RouterState>,
) -> CommandResult<String> {
    let service = router_state.service.lock().await;
    Ok(service.provider().as_str().to_string())
}

#[tauri::command]
pub async fn get_router_capabilities(
    router_state: tauri::State<'_, RouterState>,
) -> CommandResult<RouterCapabilities> {
    let service = router_state.service.lock().await;
    Ok(service.capabilities())
}

#[tauri::command]
pub async fn get_router_status(
    router_state: tauri::State<'_, RouterState>,
) -> CommandResult<RouterStatus> {
    let service = router_state.service.lock().await;
    Ok(service.status())
}

#[tauri::command]
pub async fn list_router_clients(
    router_state: tauri::State<'_, RouterState>,
) -> CommandResult<Vec<RouterClient>> {
    let service = router_state.service.lock().await;
    service.list_clients().map_err(Into::into)
}

#[tauri::command]
pub async fn block_router_client(
    router_state: tauri::State<'_, RouterState>,
    mac: String,
) -> CommandResult<RouterActionResult> {
    let mut service = router_state.service.lock().await;
    service.block_client(&mac).map_err(Into::into)
}

#[tauri::command]
pub async fn unblock_router_client(
    router_state: tauri::State<'_, RouterState>,
    mac: String,
) -> CommandResult<RouterActionResult> {
    let mut service = router_state.service.lock().await;
    service.unblock_client(&mac).map_err(Into::into)
}

#[tauri::command]
pub async fn apply_router_policy(
    router_state: tauri::State<'_, RouterState>,
    policy: RouterPolicyInput,
) -> CommandResult<RouterActionResult> {
    let action = RouterPolicyAction::from_str(&policy.action)?;
    let mut service = router_state.service.lock().await;
    service
        .apply_policy(RouterPolicyRequest {
            target: policy.target,
            action,
            value: policy.value,
        })
        .map_err(Into::into)
}
