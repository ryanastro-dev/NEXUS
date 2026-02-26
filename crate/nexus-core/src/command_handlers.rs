use anyhow::Result;

use crate::ai::{generate_hybrid_insights_with_settings, run_ai_check_with_settings};
use crate::app::{AppContext, AppEvent, LoadTestSummary, ScanWithAi};
use crate::scan_workflow::{persist_scan_result, run_load_test, scan_network};
use crate::{find_interface_by_name, find_valid_interface, list_valid_interfaces};

pub(crate) fn collect_interfaces() -> Vec<String> {
    list_valid_interfaces()
}

pub(crate) async fn ai_check_report(context: &AppContext) -> Result<crate::AiCheckReport> {
    ensure_not_cancelled(context, "ai-check")?;
    context.emit_event(AppEvent::Info {
        message: "Running AI provider diagnostics".to_string(),
    });
    Ok(run_ai_check_with_settings(context.ai_settings()).await)
}

pub(crate) async fn ai_insights_result(
    context: &AppContext,
) -> Result<crate::HybridInsightsResult> {
    ensure_not_cancelled(context, "ai-insights")?;
    context.emit_event(AppEvent::Info {
        message: "Loading latest persisted scan for AI insights".to_string(),
    });
    let db = crate::database::Database::new(context.db_path().to_path_buf()).map_err(|e| {
        anyhow::anyhow!(
            "Failed to open database. Run a scan first to create baseline data: {}",
            e
        )
    })?;

    let hosts = {
        let conn = db.connection();
        let conn = conn
            .lock()
            .map_err(|_| anyhow::anyhow!("Database connection lock poisoned"))?;
        crate::database::queries::get_latest_scan_hosts(&conn)
            .map_err(|e| anyhow::anyhow!("Failed to load hosts from latest scan history: {}", e))?
    };

    if hosts.is_empty() {
        return Err(anyhow::anyhow!(
            "No hosts found in latest persisted scan. Run `nexus-core scan` with persistence workflow first."
        ));
    }

    Ok(generate_hybrid_insights_with_settings(&hosts, context.ai_settings()).await)
}

pub(crate) async fn scan_with_ai(
    interface: Option<String>,
    context: &AppContext,
) -> Result<ScanWithAi> {
    ensure_not_cancelled(context, "scan")?;
    crate::log_stderr!(
        "NEXUS Core Engine — Network Discovery v{}",
        env!("CARGO_PKG_VERSION")
    );
    crate::log_stderr!("Active ARP + ICMP + TCP Scanning Mode");
    crate::log_stderr!("================================================");

    let selected_interface = select_interface(interface)?;
    let result = scan_network(&selected_interface, Some(context)).await?;

    match persist_scan_result(&result, context.db_path()) {
        Ok(persisted) => {
            context.emit_event(AppEvent::ScanPersisted {
                scan_id: persisted.scan_id,
                path: persisted.path,
            });
        }
        Err(e) => {
            crate::log_error!(
                "Scan persistence failed (continuing with JSON output): {}",
                e
            );
            context.emit_event(AppEvent::Warn {
                message: format!(
                    "Scan persistence failed (continuing with JSON output): {}",
                    e
                ),
            });
        }
    }

    let ai_result = if context.ai_settings().enabled {
        context.emit_event(AppEvent::Info {
            message: "AI analysis started: generating overlay from latest scan data".to_string(),
        });
        context.emit_event(AppEvent::ScanPhase {
            phase: "ai".to_string(),
            progress_pct: 95,
        });

        let insights =
            generate_hybrid_insights_with_settings(&result.active_hosts, context.ai_settings())
                .await;

        if let Some(provider) = insights.ai_provider.as_deref() {
            let model_suffix = insights
                .ai_model
                .as_deref()
                .map(|model| format!(" ({})", model))
                .unwrap_or_default();
            context.emit_event(AppEvent::Info {
                message: format!(
                    "AI overlay completed via provider {}{}",
                    provider, model_suffix
                ),
            });
        } else if let Some(error) = insights.ai_error.as_deref() {
            context.emit_event(AppEvent::Warn {
                message: format!(
                    "AI provider unavailable; deterministic fallback response used: {}",
                    error
                ),
            });
            context.emit_event(AppEvent::ScanPhase {
                phase: "ai_fallback".to_string(),
                progress_pct: 97,
            });
        } else {
            context.emit_event(AppEvent::Warn {
                message: "AI overlay unavailable; deterministic fallback response used".to_string(),
            });
            context.emit_event(AppEvent::ScanPhase {
                phase: "ai_fallback".to_string(),
                progress_pct: 97,
            });
        }

        Some(insights)
    } else {
        None
    };

    Ok(ScanWithAi {
        scan: result,
        ai: ai_result,
    })
}

pub(crate) async fn load_test_summary(
    interface: Option<String>,
    iterations: u32,
    concurrency: usize,
    context: &AppContext,
) -> Result<LoadTestSummary> {
    ensure_not_cancelled(context, "load-test")?;
    context.emit_event(AppEvent::Info {
        message: format!(
            "Starting load test (iterations={}, concurrency={})",
            iterations, concurrency
        ),
    });
    crate::log_stderr!(
        "NEXUS Core Engine — Load Test v{} (iterations={}, concurrency={})",
        env!("CARGO_PKG_VERSION"),
        iterations,
        concurrency
    );

    let selected_interface = select_interface(interface)?;
    let summary =
        run_load_test(&selected_interface, iterations, concurrency, Some(context)).await?;
    context.emit_event(AppEvent::Info {
        message: format!(
            "Load test completed: successful_scans={}, failed_scans={}",
            summary.successful_scans, summary.failed_scans
        ),
    });
    Ok(summary)
}

pub(crate) async fn normalize_db(
    context: &AppContext,
) -> Result<crate::database::NormalizationSummary> {
    ensure_not_cancelled(context, "db-normalize")?;
    context.emit_event(AppEvent::Info {
        message: "Normalizing legacy database values".to_string(),
    });

    let db = crate::database::Database::new(context.db_path().to_path_buf()).map_err(|e| {
        anyhow::anyhow!(
            "Failed to open database for normalization at {}: {}",
            context.db_path().display(),
            e
        )
    })?;

    let summary = {
        let conn = db.connection();
        let conn = conn
            .lock()
            .map_err(|_| anyhow::anyhow!("Database connection lock poisoned"))?;
        crate::database::queries::normalize_legacy_fields(&conn)
            .map_err(|e| anyhow::anyhow!("Failed to normalize legacy database values: {}", e))?
    };

    context.emit_event(AppEvent::Info {
        message: format!(
            "Normalization complete: {} row updates",
            summary.rows_updated
        ),
    });

    Ok(summary)
}

fn ensure_not_cancelled(context: &AppContext, stage: &str) -> Result<()> {
    if context.is_cancelled() {
        context.emit_event(AppEvent::Cancelled {
            stage: stage.to_string(),
        });
        return Err(anyhow::anyhow!("Operation cancelled ({})", stage));
    }
    Ok(())
}

fn select_interface(interface: Option<String>) -> Result<crate::InterfaceInfo> {
    match interface {
        Some(name) => {
            crate::log_stderr!("Using requested interface: {}", name);
            find_interface_by_name(&name)
        }
        None => {
            crate::log_stderr!("Detecting network interfaces...");
            find_valid_interface()
        }
    }
}
