//! Network Topology Mapper - Tauri Backend
//!
//! This module provides the bridge between the React UI and the Rust scanner.
//! Includes database integration for historical data storage.
//! Includes real-time network monitoring.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod demo_data;

use commands::{AppState, MonitorState, RouterState};
use tauri::{Listener, Manager};

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.unminimize();
        let _ = main_window.set_focus();
    }
}

fn close_splash_window(app: &tauri::AppHandle) {
    if let Some(splash_window) = app.get_webview_window("splash") {
        let _ = splash_window.close();
    }
}

fn should_keep_running_in_background(app: &tauri::AppHandle) -> bool {
    let monitor_state = app.state::<MonitorState>();
    monitor_state
        .monitor
        .try_lock()
        .map(|monitor| monitor.is_running())
        .unwrap_or(false)
}

fn main() {
    // Initialize structured logging system
    if let Err(e) = nexus_core::logging::init_logging() {
        eprintln!("Warning: Failed to initialize logging: {}", e);
        eprintln!("Continuing without file logging...");
    }

    tracing::info!("Network Topology Mapper starting...");

    // Initialize application state with database
    let app_state = match AppState::new() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize application state: {}", e);
            std::process::exit(1);
        }
    };

    tracing::info!("Database initialized successfully");

    // Initialize monitoring state
    let monitor_state = MonitorState::new();

    tracing::info!("Monitoring state initialized");

    // Initialize router control state
    let router_state = RouterState::new();

    tracing::info!("Router control state initialized");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        focus_main_window(app);
        close_splash_window(app);
    }));

    let builder = builder.setup(|app| {
        let app_handle = app.handle().clone();
        app.listen("ui-ready", move |_| {
            focus_main_window(&app_handle);
            close_splash_window(&app_handle);
        });

        if let Some(main_window) = app.get_webview_window("main") {
            let app_handle_for_close = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event
                    && should_keep_running_in_background(&app_handle_for_close)
                {
                    tracing::info!(
                        "Close intercepted while monitoring is active; app moved to background"
                    );
                    api.prevent_close();
                    if let Some(window) = app_handle_for_close.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            });
        }
        Ok(())
    });

    builder
        .manage(app_state)
        .manage(monitor_state)
        .manage(router_state)
        .invoke_handler(tauri::generate_handler![
            // Scanner commands
            commands::scan::scan_network,
            commands::scan::cancel_active_scan,
            commands::scan::scan_network_with_ai,
            commands::scan::run_load_test,
            commands::scan::get_interfaces,
            // Database commands - History
            commands::database::get_scan_history,
            // Database commands - Devices
            commands::database::get_all_devices,
            commands::database::get_device_by_mac,
            commands::database::update_device_name,
            // Database commands - Stats
            commands::database::get_network_stats,
            commands::database::get_telemetry_series,
            // Database commands - Alerts
            commands::database::get_unread_alerts,
            commands::database::get_recent_alerts,
            commands::database::mark_alert_read,
            commands::database::mark_all_alerts_read,
            commands::database::clear_all_alerts,
            // Monitoring commands
            commands::monitoring::start_monitoring,
            commands::monitoring::stop_monitoring,
            commands::monitoring::get_monitoring_status,
            commands::monitoring::get_monitor_snapshot,
            commands::monitoring::get_runtime_diagnostics,
            // Router control commands
            commands::router::configure_router,
            commands::router::get_router_provider,
            commands::router::get_router_capabilities,
            commands::router::get_router_status,
            commands::router::list_router_clients,
            commands::router::block_router_client,
            commands::router::unblock_router_client,
            commands::router::apply_router_policy,
            // AI Insights commands
            commands::insights::get_ai_settings,
            commands::insights::ai_check,
            commands::insights::ai_insights,
            commands::insights::get_network_health,
            commands::insights::get_device_distribution,
            commands::assistant::ai_analyze_device_security,
            commands::assistant::ai_generate_network_report,
            commands::assistant::ai_troubleshoot_device,
            // Export commands
            commands::exports::export_devices_to_csv,
            commands::exports::export_scan_to_csv,
            commands::exports::export_topology_to_json,
            commands::exports::export_scan_to_json,
            commands::exports::export_scan_report,
            commands::exports::export_security_report,
            commands::exports::export_showcase_report,
            // Network Tools commands
            commands::tools::ping_host,
            commands::tools::scan_ports,
            commands::tools::lookup_mac_vendor,
            // Demo Mode commands
            commands::demo::mock_scan_network,
            commands::demo::get_demo_alerts,
            // Debug
            commands::database::get_database_path,
            commands::scan::get_scan_result_schema,
            commands::settings::apply_runtime_settings,
            commands::settings::apply_ai_runtime_settings,
            commands::settings::get_vulnerability_db_status,
            commands::settings::sync_vulnerability_db,
            commands::settings::sync_vulnerability_feed,
            commands::exports::export_scan_with_ai_to_json,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("error while running tauri application: {}", e);
            std::process::exit(1);
        });
}
