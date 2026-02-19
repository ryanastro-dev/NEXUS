use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use tokio::sync::Mutex;

use super::super::events::{DeviceSnapshot, NetworkEvent};
use crate::DeviceType;

fn is_unknown_passive_mac(mac: &str) -> bool {
    mac.starts_with("unknown_")
}

fn is_unknown_device_type(device_type: &str) -> bool {
    device_type
        .parse::<DeviceType>()
        .unwrap_or(DeviceType::Unknown)
        == DeviceType::Unknown
}

pub(super) async fn upsert_passive_device<F>(
    passive_devices: &Arc<Mutex<HashMap<String, DeviceSnapshot>>>,
    unique_devices_seen: &Arc<Mutex<HashSet<String>>>,
    snapshot: DeviceSnapshot,
    callback: &F,
) where
    F: Fn(NetworkEvent),
{
    let key = snapshot.mac.clone();

    let mut map = passive_devices.lock().await;
    let is_new = !map.contains_key(&key);
    map.insert(key, snapshot.clone());
    drop(map);
    let should_emit_new = unique_devices_seen
        .lock()
        .await
        .insert(snapshot.mac.clone());

    if is_new && should_emit_new {
        callback(NetworkEvent::NewDeviceDiscovered {
            ip: snapshot.ip,
            mac: snapshot.mac,
            hostname: snapshot.hostname,
            device_type: snapshot.device_type,
        });
    }
}

pub(super) async fn apply_arp_enrichment(
    passive_devices: &Arc<Mutex<HashMap<String, DeviceSnapshot>>>,
    unique_devices_seen: &Arc<Mutex<HashSet<String>>>,
    sender_ip: &str,
    sender_mac: &str,
) {
    let mut map = passive_devices.lock().await;
    let matching_keys: Vec<(String, bool)> = map
        .iter()
        .filter(|(_, snapshot)| snapshot.ip == sender_ip && snapshot.mac != sender_mac)
        .map(|(key, _)| (key.clone(), is_unknown_passive_mac(key)))
        .collect();

    let mut replaced_unknown_keys = Vec::new();
    for (old_key, was_unknown) in matching_keys {
        if let Some(mut snapshot) = map.remove(&old_key) {
            if was_unknown {
                replaced_unknown_keys.push(old_key.clone());
            }
            snapshot.mac = sender_mac.to_string();
            if let Some(existing) = map.get_mut(sender_mac) {
                if existing.hostname.is_none() {
                    existing.hostname = snapshot.hostname.take();
                }
                if is_unknown_device_type(&existing.device_type)
                    && !is_unknown_device_type(&snapshot.device_type)
                {
                    existing.device_type = snapshot.device_type;
                }
            } else {
                map.insert(snapshot.mac.clone(), snapshot);
            }
        }
    }
    drop(map);

    if !replaced_unknown_keys.is_empty() {
        let mut unique = unique_devices_seen.lock().await;
        for old_key in replaced_unknown_keys {
            unique.remove(&old_key);
        }
        unique.insert(sender_mac.to_string());
    }
}

pub(super) async fn merge_active_and_passive_devices(
    active_devices: Vec<DeviceSnapshot>,
    passive_devices: &Arc<Mutex<HashMap<String, DeviceSnapshot>>>,
) -> Vec<DeviceSnapshot> {
    let passive = passive_devices.lock().await;
    let mut merged = active_devices;

    let mut seen_macs: HashSet<String> = merged.iter().map(|device| device.mac.clone()).collect();
    let mut seen_ips: HashSet<String> = merged.iter().map(|device| device.ip.clone()).collect();

    for snapshot in passive.values() {
        if seen_macs.contains(&snapshot.mac) {
            continue;
        }

        // Unknown passive MACs are soft identities. Skip them when active scan already has same IP.
        if is_unknown_passive_mac(&snapshot.mac) && seen_ips.contains(&snapshot.ip) {
            continue;
        }

        merged.push(snapshot.clone());
        seen_macs.insert(snapshot.mac.clone());
        seen_ips.insert(snapshot.ip.clone());
    }

    merged
}
