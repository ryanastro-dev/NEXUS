//! Tauri command surface split into focused modules.
//!
//! This keeps command signatures stable while reducing file size and
//! improving maintainability.

pub(crate) mod assistant;
pub(crate) mod database;
pub(crate) mod demo;
mod error;
pub(crate) mod exports;
pub(crate) mod insights;
pub(crate) mod monitoring;
pub(crate) mod router;
pub(crate) mod scan;
pub(crate) mod settings;
pub(crate) mod shared;
mod state;
pub(crate) mod tools;
mod types;

pub(crate) use error::{CommandError, CommandResult};
pub use state::{AppState, MonitorState, RouterState};
