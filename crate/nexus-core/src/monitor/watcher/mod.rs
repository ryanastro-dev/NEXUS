//! Background network watcher
//!
//! Provides continuous network scanning in background thread.
//! Uses callbacks for event notification (Tauri-agnostic).

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::time::Duration;

use tokio::sync::Mutex;

use super::events::{DeviceSnapshot, MonitoringStatus, NetworkEvent};
use super::passive_integration::{passive_device_to_snapshot, start_passive_listeners};
use crate::config::{default_monitor_interval, max_monitor_interval, min_monitor_interval};

mod changes;
mod passive;
mod scan;
#[cfg(test)]
mod tests;

use changes::{OfflineDeviceSnapshot, detect_and_emit_changes};
use passive::{apply_arp_enrichment, merge_active_and_passive_devices, upsert_passive_device};
use scan::{resolve_monitor_interface, run_background_scan};

/// Event callback type.
pub type EventCallback = Arc<dyn Fn(NetworkEvent) + Send + Sync>;

/// Background network monitor.
pub struct BackgroundMonitor {
    is_running: Arc<AtomicBool>,
    interval_seconds: Arc<Mutex<u64>>,
    scan_count: Arc<AtomicU32>,
    last_scan_time: Arc<Mutex<Option<String>>>,
    /// Current online devices from previous scan (MAC -> DeviceSnapshot)
    previous_devices: Arc<Mutex<HashMap<String, DeviceSnapshot>>>,
    /// Recently-offline devices for "came online" event correlation.
    offline_devices: Arc<Mutex<HashMap<String, OfflineDeviceSnapshot>>>,
    /// Live passive discoveries from mDNS/ARP listeners.
    passive_devices: Arc<Mutex<HashMap<String, DeviceSnapshot>>>,
    /// Session-wide unique device identities seen across all scans.
    unique_devices_seen: Arc<Mutex<HashSet<String>>>,
    /// Active interface selected for the current monitor session.
    selected_interface_name: Arc<Mutex<Option<String>>>,
}

impl BackgroundMonitor {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            interval_seconds: Arc::new(Mutex::new(default_monitor_interval())),
            scan_count: Arc::new(AtomicU32::new(0)),
            last_scan_time: Arc::new(Mutex::new(None)),
            previous_devices: Arc::new(Mutex::new(HashMap::new())),
            offline_devices: Arc::new(Mutex::new(HashMap::new())),
            passive_devices: Arc::new(Mutex::new(HashMap::new())),
            unique_devices_seen: Arc::new(Mutex::new(HashSet::new())),
            selected_interface_name: Arc::new(Mutex::new(None)),
        }
    }

    /// Start background monitoring with event callback.
    pub async fn start<F>(&self, callback: F, interval: Option<u64>) -> Result<(), String>
    where
        F: Fn(NetworkEvent) + Send + Sync + 'static,
    {
        self.start_with_interface(callback, interval, None).await
    }

    /// Start background monitoring pinned to a single interface.
    ///
    /// If `interface_name` is `None`, the best valid interface is selected once
    /// at start time and reused for the full monitoring session.
    pub async fn start_with_interface<F>(
        &self,
        callback: F,
        interval: Option<u64>,
        interface_name: Option<String>,
    ) -> Result<(), String>
    where
        F: Fn(NetworkEvent) + Send + Sync + 'static,
    {
        let requested_interval = interval
            .unwrap_or(default_monitor_interval())
            .clamp(min_monitor_interval(), max_monitor_interval());

        if self.is_running.load(Ordering::SeqCst) {
            // Idempotent start: keep current loop and optionally update interval.
            *self.interval_seconds.lock().await = requested_interval;
            if let Some(requested) = interface_name.as_deref()
                && let Some(current) = self.selected_interface_name.lock().await.clone()
                && !current.eq_ignore_ascii_case(requested)
            {
                return Err(format!(
                    "Monitoring is already running on interface '{}'. Stop it before switching to '{}'.",
                    current, requested
                ));
            }
            return Ok(());
        }

        let interval_secs = requested_interval;
        let selected_interface = resolve_monitor_interface(interface_name.as_deref())?;

        *self.interval_seconds.lock().await = interval_secs;
        *self.selected_interface_name.lock().await = Some(selected_interface.name.clone());
        self.is_running.store(true, Ordering::SeqCst);
        self.scan_count.store(0, Ordering::SeqCst);
        self.unique_devices_seen.lock().await.clear();
        self.previous_devices.lock().await.clear();
        self.offline_devices.lock().await.clear();
        self.passive_devices.lock().await.clear();

        let callback = Arc::new(callback);

        callback(NetworkEvent::MonitoringStarted {
            interval_seconds: interval_secs,
        });

        let is_running = Arc::clone(&self.is_running);
        let scan_count = Arc::clone(&self.scan_count);
        let last_scan_time = Arc::clone(&self.last_scan_time);
        let previous_devices = Arc::clone(&self.previous_devices);
        let offline_devices = Arc::clone(&self.offline_devices);
        let passive_devices = Arc::clone(&self.passive_devices);
        let unique_devices_seen = Arc::clone(&self.unique_devices_seen);
        let interval_seconds = Arc::clone(&self.interval_seconds);
        let selected_interface_name = Arc::clone(&self.selected_interface_name);
        let scan_interface = selected_interface.clone();
        let cb = Arc::clone(&callback);

        let is_running_for_passive = Arc::clone(&self.is_running);
        let passive_map = Arc::clone(&self.passive_devices);
        let unique_for_passive = Arc::clone(&self.unique_devices_seen);
        let cb_passive = Arc::clone(&callback);

        match start_passive_listeners(&scan_interface.pnet_interface).await {
            Ok((mut mdns_rx, mut arp_rx_opt)) => {
                tokio::spawn(async move {
                    let mut arp_ip_to_mac: HashMap<String, String> = HashMap::new();

                    tracing::info!("[MONITOR] Passive listener bridge started");

                    while is_running_for_passive.load(Ordering::SeqCst) {
                        tokio::select! {
                            mdns_device = mdns_rx.recv() => {
                                match mdns_device {
                                    Some(device) => {
                                        let mut snapshot = passive_device_to_snapshot(device);
                                        if let Some(mac) = arp_ip_to_mac.get(&snapshot.ip) {
                                            snapshot.mac = mac.clone();
                                        }
                                        upsert_passive_device(
                                            &passive_map,
                                            &unique_for_passive,
                                            snapshot,
                                            &*cb_passive,
                                        )
                                        .await;
                                    }
                                    None => break,
                                }
                            }
                            arp_event = async {
                                if let Some(rx) = arp_rx_opt.as_mut() {
                                    rx.recv().await
                                } else {
                                    tokio::time::sleep(Duration::from_millis(500)).await;
                                    None
                                }
                            } => {
                                if let Some(event) = arp_event {
                                    arp_ip_to_mac.insert(event.sender_ip.clone(), event.sender_mac.clone());
                                    apply_arp_enrichment(
                                        &passive_map,
                                        &unique_for_passive,
                                        &event.sender_ip,
                                        &event.sender_mac,
                                    )
                                    .await;
                                } else if arp_rx_opt.is_some() {
                                    tracing::warn!("[MONITOR] ARP passive channel closed");
                                    arp_rx_opt = None;
                                }
                            }
                            _ = tokio::time::sleep(Duration::from_millis(250)) => {}
                        }
                    }

                    tracing::info!("[MONITOR] Passive listener bridge stopped");
                });
            }
            Err(error) => {
                tracing::warn!("[MONITOR] Passive listeners unavailable: {}", error);
            }
        }

        tokio::spawn(async move {
            tracing::info!(
                "[MONITOR] Background monitoring started (interval: {}s)",
                interval_secs
            );

            while is_running.load(Ordering::SeqCst) {
                let current_scan = scan_count.fetch_add(1, Ordering::SeqCst) + 1;
                let interval = *interval_seconds.lock().await;

                (*cb)(NetworkEvent::ScanStarted {
                    scan_number: current_scan,
                });

                tracing::debug!("[MONITOR] Starting scan #{}", current_scan);
                let start = std::time::Instant::now();

                match run_background_scan(&*cb, &scan_interface).await {
                    Ok(devices) => {
                        let merged_devices =
                            merge_active_and_passive_devices(devices, &passive_devices).await;
                        let duration = start.elapsed().as_millis() as u64;

                        *last_scan_time.lock().await = Some(chrono::Utc::now().to_rfc3339());

                        let mut prev = previous_devices.lock().await;
                        let mut offline = offline_devices.lock().await;
                        let mut unique = unique_devices_seen.lock().await;
                        detect_and_emit_changes(
                            &*cb,
                            &mut prev,
                            &mut offline,
                            &mut unique,
                            &merged_devices,
                        );

                        (*cb)(NetworkEvent::ScanCompleted {
                            scan_number: current_scan,
                            hosts_found: merged_devices.len(),
                            duration_ms: duration,
                        });

                        tracing::debug!(
                            "[MONITOR] Scan #{} complete: {} hosts in {}ms",
                            current_scan,
                            merged_devices.len(),
                            duration
                        );
                    }
                    Err(error) => {
                        tracing::warn!("[MONITOR] Scan #{} failed: {}", current_scan, error);
                        (*cb)(NetworkEvent::MonitoringError { message: error });
                    }
                }

                for _ in 0..interval {
                    if !is_running.load(Ordering::SeqCst) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }

            tracing::info!("[MONITOR] Background monitoring stopped");
            *selected_interface_name.lock().await = None;
            (*cb)(NetworkEvent::MonitoringStopped);
        });

        Ok(())
    }

    /// Stop background monitoring.
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Get current monitoring status.
    pub async fn status(&self) -> MonitoringStatus {
        let online_count = self.previous_devices.lock().await.len();
        let total_seen = self.unique_devices_seen.lock().await.len();

        MonitoringStatus {
            is_running: self.is_running.load(Ordering::SeqCst),
            interval_seconds: *self.interval_seconds.lock().await,
            scan_count: self.scan_count.load(Ordering::SeqCst),
            last_scan_time: self.last_scan_time.lock().await.clone(),
            devices_online: online_count,
            devices_total: total_seen,
        }
    }

    /// Check if monitoring is running.
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    /// Selected monitor interface name for current session (if running).
    pub async fn selected_interface(&self) -> Option<String> {
        self.selected_interface_name.lock().await.clone()
    }
}

impl Default for BackgroundMonitor {
    fn default() -> Self {
        Self::new()
    }
}
