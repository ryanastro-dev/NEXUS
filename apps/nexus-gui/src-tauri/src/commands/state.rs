use std::sync::atomic::AtomicU32;

use tokio::sync::Mutex as TokioMutex;

use nexus_core::{AppContext, BackgroundMonitor, Database, RouterService};

/// Application state holding database connection and active scan context.
pub struct AppState {
    pub db: Database,
    pub active_scan_context: TokioMutex<Option<AppContext>>,
    pub scan_counter: AtomicU32,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let db_path = Database::default_path();
        let db =
            Database::new(db_path).map_err(|e| format!("Failed to initialize database: {}", e))?;
        Ok(Self {
            db,
            active_scan_context: TokioMutex::new(None),
            scan_counter: AtomicU32::new(0),
        })
    }
}

/// Monitoring state holding background monitor.
pub struct MonitorState {
    pub monitor: TokioMutex<BackgroundMonitor>,
}

impl MonitorState {
    pub fn new() -> Self {
        Self {
            monitor: TokioMutex::new(BackgroundMonitor::new()),
        }
    }
}

/// Router control state holding current provider adapter service.
pub struct RouterState {
    pub service: TokioMutex<RouterService>,
}

impl RouterState {
    pub fn new() -> Self {
        Self {
            service: TokioMutex::new(RouterService::default()),
        }
    }
}
