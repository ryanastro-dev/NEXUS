//! PDF export functionality
//!
//! Generate professional PDF reports using krilla.

mod core;
mod health_report;
mod scan_report;
mod text;

pub use health_report::generate_network_health_pdf;
pub use scan_report::generate_scan_report_pdf;

#[cfg(test)]
mod tests;
