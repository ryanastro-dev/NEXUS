use nexus_core::{AppContext, AppEvent};
use std::sync::Arc;
use tauri::Emitter;

use super::super::state::AppState;
use super::context::app_context_from_state;

pub(crate) fn emit_scan_progress(app: &tauri::AppHandle, phase: &str, progress: u8, message: &str) {
    let _ = app.emit(
        "scan-progress",
        serde_json::json!({
            "phase": phase,
            "progress": progress,
            "message": message,
        }),
    );
    let _ = app.emit(
        "network-event",
        nexus_core::NetworkEvent::ScanProgress {
            phase: phase.to_string(),
            percent: progress,
            message: message.to_string(),
        },
    );
}

pub(crate) fn emit_scan_started(app: &tauri::AppHandle, scan_number: u32) {
    let _ = app.emit(
        "network-event",
        nexus_core::NetworkEvent::ScanStarted { scan_number },
    );
}

pub(crate) fn emit_scan_completed(
    app: &tauri::AppHandle,
    scan_number: u32,
    hosts_found: usize,
    duration_ms: u64,
) {
    let _ = app.emit(
        "network-event",
        nexus_core::NetworkEvent::ScanCompleted {
            scan_number,
            hosts_found,
            duration_ms,
        },
    );
}

fn normalize_scan_phase(phase: &str) -> String {
    phase.trim().to_ascii_lowercase()
}

fn scan_phase_message(phase: &str) -> &'static str {
    match phase {
        "init" | "interface" => "Preparing interface and subnet context",
        "arp" | "discovery" => "Running host discovery sweep",
        "tcp" | "services" => "Profiling reachable hosts and services",
        "ai" => "Generating AI summary and recommendations",
        "ai_fallback" => "AI provider unavailable; using deterministic fallback output",
        "snmp" => "Collecting SNMP metadata and neighbor links",
        "dns" | "render" => "Building topology graph payload",
        "complete" => "Topology discovery complete",
        _ => "Processing scan pipeline",
    }
}

fn emit_engine_event(app: &tauri::AppHandle, event: &AppEvent) {
    let _ = app.emit("engine-event", event);
}

pub(crate) fn emit_engine_app_event(app: &tauri::AppHandle, event: AppEvent) {
    emit_engine_event(app, &event);
}

pub(crate) fn emit_engine_info(app: &tauri::AppHandle, message: impl Into<String>) {
    emit_engine_app_event(
        app,
        AppEvent::Info {
            message: message.into(),
        },
    );
}

pub(crate) fn emit_engine_warn(app: &tauri::AppHandle, message: impl Into<String>) {
    emit_engine_app_event(
        app,
        AppEvent::Warn {
            message: message.into(),
        },
    );
}

pub(crate) fn emit_engine_error(app: &tauri::AppHandle, message: impl Into<String>) {
    emit_engine_app_event(
        app,
        AppEvent::Error {
            message: message.into(),
        },
    );
}

pub(crate) fn emit_engine_scan_phase(
    app: &tauri::AppHandle,
    phase: impl Into<String>,
    progress_pct: u8,
) {
    emit_engine_app_event(
        app,
        AppEvent::ScanPhase {
            phase: phase.into(),
            progress_pct,
        },
    );
}

fn attach_engine_event_hook(context: AppContext, app: &tauri::AppHandle) -> AppContext {
    let app_handle = app.clone();
    context.with_event_hook(Arc::new(move |event| {
        emit_engine_event(&app_handle, event);

        if let AppEvent::ScanPhase {
            phase,
            progress_pct,
        } = event
        {
            let phase_norm = normalize_scan_phase(phase);
            let message = scan_phase_message(&phase_norm);
            emit_scan_progress(&app_handle, &phase_norm, *progress_pct, message);
        }
        if let AppEvent::Cancelled { stage } = event {
            let message = format!("Scan cancelled during {}", stage);
            emit_scan_progress(&app_handle, "cancelled", 100, &message);
        }
    }))
}

pub(crate) fn app_context_from_state_with_events(
    state: &tauri::State<'_, AppState>,
    app: &tauri::AppHandle,
) -> Result<AppContext, String> {
    let context = app_context_from_state(state)?;
    Ok(attach_engine_event_hook(context, app))
}
