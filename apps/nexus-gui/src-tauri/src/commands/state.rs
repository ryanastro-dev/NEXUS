use std::sync::atomic::AtomicU32;
use std::sync::Mutex;

use tokio::sync::Mutex as TokioMutex;

use nexus_core::{AppContext, BackgroundMonitor, Database};

/// Application state holding database connection and active scan context.
pub struct AppState {
    pub db: Mutex<Database>,
    pub active_scan_context: TokioMutex<Option<AppContext>>,
    pub scan_counter: AtomicU32,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let db_path = Database::default_path();
        let db =
            Database::new(db_path).map_err(|e| format!("Failed to initialize database: {}", e))?;
        Ok(Self {
            db: Mutex::new(db),
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
