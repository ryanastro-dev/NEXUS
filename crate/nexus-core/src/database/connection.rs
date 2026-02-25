//! Database connection and initialization
//!
//! Handles SQLite connection pooling and database setup

use anyhow::{Context, Result, anyhow};
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use super::schema;

/// Database wrapper with thread-safe connection
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    path: PathBuf,
}

impl Database {
    fn configure_connection(conn: &Connection, use_wal: bool) -> Result<()> {
        // Improve concurrency/read latency and reduce SQLITE_BUSY during monitor + UI access.
        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .context("Failed to enable SQLite foreign key constraints")?;
        conn.execute_batch("PRAGMA busy_timeout = 5000;")
            .context("Failed to configure SQLite busy timeout")?;

        if use_wal {
            conn.execute_batch("PRAGMA journal_mode = WAL;")
                .context("Failed to enable SQLite WAL mode")?;
            conn.execute_batch("PRAGMA synchronous = NORMAL;")
                .context("Failed to configure SQLite synchronous mode")?;
        }

        Ok(())
    }

    /// Creates a new database connection
    ///
    /// # Arguments
    /// * `path` - Path to the SQLite database file (created if not exists)
    pub fn new(path: PathBuf) -> Result<Self> {
        // Create parent directories if needed
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).context("Failed to create database directory")?;
        }

        let conn = Connection::open(&path).context("Failed to open database")?;
        Self::configure_connection(&conn, true)?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            path,
        };

        // Initialize schema
        db.initialize()?;

        Ok(db)
    }

    /// Creates an in-memory database (for testing)
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory().context("Failed to open in-memory database")?;
        // WAL is not meaningful for in-memory databases.
        Self::configure_connection(&conn, false)?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            path: PathBuf::from(":memory:"),
        };

        db.initialize()?;

        Ok(db)
    }

    /// Initialize database schema
    fn initialize(&self) -> Result<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| anyhow!("Database connection lock poisoned during initialization"))?;
        schema::create_tables(&conn)?;

        // Seed vulnerability database if empty
        let cve_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM cve_cache", [], |row| row.get(0))
            .context("Failed to query CVE cache count during database initialization")?;

        if cve_count == 0 {
            use super::seed_cves::{seed_port_warnings, seed_vulnerabilities};
            seed_vulnerabilities(&conn)?;
            seed_port_warnings(&conn)?;
        }

        Ok(())
    }

    /// Get a reference to the connection
    pub fn connection(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.conn)
    }

    /// Get database path
    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    /// Get default database path for the application
    pub fn default_path() -> PathBuf {
        // Use platform-specific app data directory
        #[cfg(target_os = "windows")]
        let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));

        #[cfg(target_os = "macos")]
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));

        #[cfg(target_os = "linux")]
        let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        let base = PathBuf::from(".");

        base.join("NetworkTopologyMapper").join("data.db")
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: Arc::clone(&self.conn),
            path: self.path.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn test_in_memory_db() {
        let db = Database::in_memory().expect("Failed to create in-memory db");
        assert_eq!(db.path().to_str(), Some(":memory:"));
    }

    #[test]
    fn test_default_path() {
        let path = Database::default_path();
        assert!(path.to_str().unwrap().contains("NetworkTopologyMapper"));
    }

    #[test]
    fn test_file_database_enables_wal_mode() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "nexus-core-wal-{}-{}.db",
            std::process::id(),
            timestamp
        ));

        let db = Database::new(path.clone()).expect("Failed to create file database");
        let connection = db.connection();
        let conn = connection
            .lock()
            .expect("Database connection lock poisoned in wal mode test");

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .expect("Failed to query SQLite journal mode");
        assert_eq!(journal_mode.to_ascii_lowercase(), "wal");

        drop(conn);
        drop(db);

        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.to_string_lossy()));
        let _ = std::fs::remove_file(format!("{}-shm", path.to_string_lossy()));
    }
}
