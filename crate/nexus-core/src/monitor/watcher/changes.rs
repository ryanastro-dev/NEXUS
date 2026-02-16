use std::collections::{HashMap, HashSet};
use std::time::Instant;

use super::super::events::{DeviceSnapshot, NetworkEvent};

const OFFLINE_RETENTION_SECS: u64 = 3600;

#[derive(Debug, Clone)]
pub(super) struct OfflineDeviceSnapshot {
    pub(super) device: DeviceSnapshot,
    pub(super) since: Instant,
}

/// Detect changes between scans and emit events.
pub(super) fn detect_and_emit_changes<F>(
    callback: &F,
    previous_online: &mut HashMap<String, DeviceSnapshot>,
    offline_devices: &mut HashMap<String, OfflineDeviceSnapshot>,
    unique_devices_seen: &mut HashSet<String>,
    current: &[DeviceSnapshot],
) where
    F: Fn(NetworkEvent),
{
    let now = Instant::now();
    offline_devices.retain(|_, snapshot| {
        now.duration_since(snapshot.since).as_secs() <= OFFLINE_RETENTION_SECS
    });

    let current_macs: HashMap<String, &DeviceSnapshot> = current
        .iter()
        .map(|device| (device.mac.clone(), device))
        .collect();

    for (mac, prev_device) in previous_online.iter() {
        if !current_macs.contains_key(mac) {
            tracing::debug!("[MONITOR] Device offline: {} ({})", prev_device.ip, mac);
            callback(NetworkEvent::DeviceWentOffline {
                mac: mac.clone(),
                last_ip: prev_device.ip.clone(),
                hostname: prev_device.hostname.clone(),
            });
            offline_devices.insert(
                mac.clone(),
                OfflineDeviceSnapshot {
                    device: prev_device.clone(),
                    since: now,
                },
            );
        }
    }

    let mut next_online: HashMap<String, DeviceSnapshot> = HashMap::with_capacity(current.len());

    for device in current {
        if let Some(prev_device) = previous_online.get(&device.mac) {
            if prev_device.ip != device.ip {
                tracing::debug!(
                    "[MONITOR] IP changed: {} -> {} ({})",
                    prev_device.ip,
                    device.ip,
                    device.mac
                );
                callback(NetworkEvent::DeviceIpChanged {
                    mac: device.mac.clone(),
                    old_ip: prev_device.ip.clone(),
                    new_ip: device.ip.clone(),
                });
            }
        } else if let Some(was_offline) = offline_devices.remove(&device.mac) {
            tracing::debug!(
                "[MONITOR] Device back online: {} ({})",
                device.ip,
                device.mac
            );
            callback(NetworkEvent::DeviceCameOnline {
                mac: device.mac.clone(),
                ip: device.ip.clone(),
                hostname: device.hostname.clone(),
            });

            if was_offline.device.ip != device.ip {
                tracing::debug!(
                    "[MONITOR] IP changed while offline: {} -> {} ({})",
                    was_offline.device.ip,
                    device.ip,
                    device.mac
                );
                callback(NetworkEvent::DeviceIpChanged {
                    mac: device.mac.clone(),
                    old_ip: was_offline.device.ip,
                    new_ip: device.ip.clone(),
                });
            }
        } else if unique_devices_seen.insert(device.mac.clone()) {
            tracing::debug!("[MONITOR] New device: {} ({})", device.ip, device.mac);
            callback(NetworkEvent::NewDeviceDiscovered {
                ip: device.ip.clone(),
                mac: device.mac.clone(),
                hostname: device.hostname.clone(),
                device_type: device.device_type.clone(),
            });
        }

        unique_devices_seen.insert(device.mac.clone());
        next_online.insert(device.mac.clone(), device.clone());
    }

    *previous_online = next_online;
}
