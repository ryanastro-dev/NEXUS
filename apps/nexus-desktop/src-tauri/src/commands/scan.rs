use std::sync::atomic::Ordering;

use nexus_core::{
    detect_alerts, detect_alerts_without_baseline, execute_command_typed, list_valid_interfaces,
    AppCommand, AppCommandResult, LoadTestSummary, ScanResult, ScanWithAi,
};

use super::shared::{
    app_context_from_state_with_events, emit_scan_completed, emit_scan_progress, emit_scan_started,
    enrich_scan_result_security, load_known_devices_for_alerts, persist_alerts,
    persist_scan_telemetry,
};
use super::state::AppState;

/// Perform a network scan and save to database.
#[tauri::command]
pub async fn scan_network(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    interface: Option<String>,
) -> Result<ScanResult, String> {
    let scan_number = state.scan_counter.fetch_add(1, Ordering::SeqCst) + 1;
    emit_scan_started(&app, scan_number);

    let known_devices = load_known_devices_for_alerts(&state);
    let context = app_context_from_state_with_events(&state, &app)?;
    {
        let mut active_scan = state.active_scan_context.lock().await;
        *active_scan = Some(context.clone());
    }

    let command_result = execute_command_typed(AppCommand::Scan { interface }, &context).await;

    {
        let mut active_scan = state.active_scan_context.lock().await;
        *active_scan = None;
    }

    let mut scan_result = match command_result.map_err(|e| format!("Scan failed: {}", e))? {
        AppCommandResult::Scan(scan_with_ai) => scan_with_ai.scan,
        _ => return Err("Unexpected scan response shape".to_string()),
    };

    emit_scan_progress(
        &app,
        "render",
        92,
        "Applying vulnerability and alert overlays",
    );
    enrich_scan_result_security(&state, &mut scan_result);

    let detected_alerts = if let Some(known) = known_devices.as_ref() {
        detect_alerts(known, &scan_result.active_hosts)
    } else {
        eprintln!(
            "[WARN] Known-device baseline unavailable; generating baseline-independent alerts only"
        );
        detect_alerts_without_baseline(&scan_result.active_hosts)
    };
    persist_alerts(&state, &detected_alerts);

    emit_scan_progress(&app, "complete", 100, "Topology discovery complete");
    emit_scan_completed(
        &app,
        scan_number,
        scan_result.total_hosts,
        scan_result.scan_duration_ms,
    );
    persist_scan_telemetry(
        &state,
        &app,
        &scan_result,
        &format!("scan #{}", scan_number),
    );

    Ok(scan_result)
}

/// Request cancellation for the currently running scan (if any).
#[tauri::command]
pub async fn cancel_active_scan(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let active_scan = state.active_scan_context.lock().await;
    if let Some(context) = active_scan.as_ref() {
        context.cancel();
    }
    Ok(())
}

/// Get available network interfaces.
#[tauri::command]
pub fn get_interfaces() -> Result<Vec<String>, String> {
    let interfaces = list_valid_interfaces();
    if interfaces.is_empty() {
        return Err("No valid interfaces found".to_string());
    }
    Ok(interfaces)
}

/// Run a full core-engine scan flow and include optional AI overlay output.
#[tauri::command]
pub async fn scan_network_with_ai(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    interface: Option<String>,
) -> Result<ScanWithAi, String> {
    let scan_number = state.scan_counter.fetch_add(1, Ordering::SeqCst) + 1;
    emit_scan_started(&app, scan_number);

    let known_devices = load_known_devices_for_alerts(&state);
    let context = app_context_from_state_with_events(&state, &app)?;
    {
        let mut active_scan = state.active_scan_context.lock().await;
        *active_scan = Some(context.clone());
    }

    let command_result = execute_command_typed(AppCommand::Scan { interface }, &context).await;

    {
        let mut active_scan = state.active_scan_context.lock().await;
        *active_scan = None;
    }

    let mut scan_with_ai = match command_result.map_err(|e| format!("AI scan failed: {}", e))? {
        AppCommandResult::Scan(scan_with_ai) => scan_with_ai,
        _ => return Err("Unexpected scan-with-ai response shape".to_string()),
    };

    emit_scan_progress(
        &app,
        "render",
        92,
        "Applying vulnerability and alert overlays",
    );
    enrich_scan_result_security(&state, &mut scan_with_ai.scan);

    let detected_alerts = if let Some(known) = known_devices.as_ref() {
        detect_alerts(known, &scan_with_ai.scan.active_hosts)
    } else {
        eprintln!(
            "[WARN] Known-device baseline unavailable; generating baseline-independent alerts only"
        );
        detect_alerts_without_baseline(&scan_with_ai.scan.active_hosts)
    };
    persist_alerts(&state, &detected_alerts);

    emit_scan_completed(
        &app,
        scan_number,
        scan_with_ai.scan.total_hosts,
        scan_with_ai.scan.scan_duration_ms,
    );
    persist_scan_telemetry(
        &state,
        &app,
        &scan_with_ai.scan,
        &format!("ai scan #{}", scan_number),
    );

    Ok(scan_with_ai)
}

/// Run the core-engine load test harness.
#[tauri::command]
pub async fn run_load_test(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    interface: Option<String>,
    iterations: u32,
    concurrency: usize,
) -> Result<LoadTestSummary, String> {
    let context = app_context_from_state_with_events(&state, &app)?;
    let result = execute_command_typed(
        AppCommand::LoadTest {
            interface,
            iterations,
            concurrency,
        },
        &context,
    )
    .await
    .map_err(|e| format!("Load test failed: {}", e))?;

    match result {
        AppCommandResult::LoadTest(summary) => Ok(summary),
        _ => Err("Unexpected load-test response shape".to_string()),
    }
}

/// Generate machine-readable schema for ScanResult contract.
#[tauri::command]
pub fn get_scan_result_schema() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "schema_version": "1.0.0",
        "scan_result_fields": [
            "interface_name", "local_ip", "local_mac", "subnet", "scan_method",
            "arp_discovered", "icmp_discovered", "total_hosts", "scan_duration_ms", "active_hosts"
        ],
        "host_info_fields": [
            "ip", "mac", "vendor", "is_randomized", "response_time_ms", "ttl",
            "os_guess", "device_type", "risk_score", "open_ports", "discovery_method",
            "hostname", "system_description", "uptime_seconds", "neighbors",
            "vulnerabilities", "port_warnings", "security_grade"
        ]
    }))
}
