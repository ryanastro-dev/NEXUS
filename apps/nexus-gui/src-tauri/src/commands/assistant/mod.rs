mod commands;
mod fallback;
mod types;
mod utils;

use nexus_core::HostInfo;

use crate::commands::CommandResult;
pub use types::{DeviceSecurityAnalysis, DeviceTroubleshootAdvice, NetworkReportSummary};

#[tauri::command]
pub async fn ai_analyze_device_security(
    app: tauri::AppHandle,
    device: HostInfo,
) -> CommandResult<DeviceSecurityAnalysis> {
    commands::ai_analyze_device_security_impl(&app, device).await
}

#[tauri::command]
pub async fn ai_generate_network_report(
    state: tauri::State<'_, crate::commands::state::AppState>,
    app: tauri::AppHandle,
    hosts: Option<Vec<HostInfo>>,
    subnet: Option<String>,
) -> CommandResult<NetworkReportSummary> {
    commands::ai_generate_network_report_impl(state, &app, hosts, subnet).await
}

#[tauri::command]
pub async fn ai_troubleshoot_device(
    app: tauri::AppHandle,
    device: HostInfo,
    symptoms: Option<Vec<String>>,
) -> CommandResult<DeviceTroubleshootAdvice> {
    commands::ai_troubleshoot_device_impl(&app, device, symptoms).await
}
