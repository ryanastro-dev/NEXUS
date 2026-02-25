use nexus_core::{
    AiCheckReport, AiSettings, AppCommand, AppCommandResult, AppContext, AppEvent,
    HybridInsightsResult, execute_command_typed,
};
use tauri::Emitter;

use super::shared::{app_context_from_state_with_events, get_db_connection, lock_db_connection};
use super::{AppState, CommandResult};

/// Get network health score from current scan.
#[tauri::command]
pub fn get_network_health(state: tauri::State<'_, AppState>) -> CommandResult<serde_json::Value> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    let hosts = nexus_core::database::queries::get_latest_scan_hosts(&conn)
        .map_err(|e| format!("Failed to get latest scan host data: {}", e))?;
    let health = nexus_core::NetworkHealth::calculate(&hosts);

    Ok(serde_json::json!({
        "score": health.score,
        "grade": health.grade.to_string(),
        "status": health.status,
        "breakdown": {
            "security": health.breakdown.security,
            "stability": health.breakdown.stability,
            "compliance": health.breakdown.compliance
        },
        "insights": health.insights
    }))
}

/// Get device distribution stats.
#[tauri::command]
pub fn get_device_distribution(
    state: tauri::State<'_, AppState>,
) -> CommandResult<serde_json::Value> {
    let conn = get_db_connection(&state)?;
    let conn = lock_db_connection(&conn)?;

    let devices = nexus_core::database::queries::get_all_devices(&conn)
        .map_err(|e| format!("Failed to get devices: {}", e))?;

    let mut by_type: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for device in &devices {
        let dtype = device
            .device_type
            .clone()
            .unwrap_or_else(|| "UNKNOWN".to_string());
        *by_type.entry(dtype).or_insert(0) += 1;
    }

    Ok(serde_json::json!({
        "total": devices.len(),
        "by_type": by_type,
    }))
}

/// Get AI runtime settings sourced from environment variables.
#[tauri::command]
pub fn get_ai_settings() -> CommandResult<AiSettings> {
    Ok(AiSettings::from_env())
}

fn attach_engine_event_hook(context: AppContext, app: &tauri::AppHandle) -> AppContext {
    let app_handle = app.clone();
    context.with_event_hook(std::sync::Arc::new(move |event| {
        let _ = app_handle.emit("engine-event", event);
        if let AppEvent::Cancelled { stage } = event {
            let _ = app_handle.emit(
                "scan-progress",
                serde_json::json!({
                    "phase": "cancelled",
                    "progress": 100,
                    "message": format!("Scan cancelled during {}", stage),
                }),
            );
        }
    }))
}

/// Run AI provider diagnostics for local/cloud configuration.
#[tauri::command]
pub async fn ai_check(app: tauri::AppHandle) -> CommandResult<AiCheckReport> {
    let context = attach_engine_event_hook(AppContext::from_env(), &app);
    let result = execute_command_typed(AppCommand::AiCheck, &context)
        .await
        .map_err(|e| format!("AI check failed: {}", e))?;

    match result {
        AppCommandResult::AiCheck(report) => Ok(report),
        _ => Err("Unexpected AI check response shape".into()),
    }
}

/// Generate hybrid AI insights from the latest persisted scan.
#[tauri::command]
pub async fn ai_insights(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> CommandResult<HybridInsightsResult> {
    let context = app_context_from_state_with_events(&state, &app)?;
    let result = execute_command_typed(AppCommand::AiInsights, &context)
        .await
        .map_err(|e| format!("AI insights failed: {}", e))?;

    match result {
        AppCommandResult::AiInsights(insights) => Ok(insights),
        _ => Err("Unexpected AI insights response shape".into()),
    }
}
