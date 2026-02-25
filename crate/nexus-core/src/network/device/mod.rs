//! Device type inference and risk scoring.
//!
//! Split into focused modules to keep heuristics maintainable while preserving
//! existing behavior and public API.

mod inference;
mod patterns;
mod risk;
mod types;

pub use inference::infer_device_type;
pub use risk::calculate_risk_score;
pub use types::DeviceType;

#[cfg(test)]
mod tests;
