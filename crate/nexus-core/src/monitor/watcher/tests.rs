use std::collections::{HashMap, HashSet};
use std::sync::{Arc as StdArc, Mutex as StdMutex};

use super::super::events::{DeviceSnapshot, NetworkEvent};
use super::changes::{OfflineDeviceSnapshot, detect_and_emit_changes};
use super::passive::apply_arp_enrichment;
use tokio::sync::Mutex;

#[test]
fn detect_changes_skips_duplicate_new_event_for_already_seen_mac() {
    let events: StdArc<StdMutex<Vec<NetworkEvent>>> = StdArc::new(StdMutex::new(Vec::new()));
    let events_capture = StdArc::clone(&events);
    let callback = move |event: NetworkEvent| {
        events_capture.lock().expect("event lock").push(event);
    };

    let current = vec![DeviceSnapshot {
        mac: "AA:BB:CC:DD:EE:FF".to_string(),
        ip: "192.168.1.50".to_string(),
        hostname: Some("passive-device".to_string()),
        device_type: "UNKNOWN".to_string(),
        is_online: true,
    }];

    let mut previous_online: HashMap<String, DeviceSnapshot> = HashMap::new();
    let mut offline_devices: HashMap<String, OfflineDeviceSnapshot> = HashMap::new();
    let mut unique_devices_seen: HashSet<String> = HashSet::from(["AA:BB:CC:DD:EE:FF".to_string()]);

    detect_and_emit_changes(
        &callback,
        &mut previous_online,
        &mut offline_devices,
        &mut unique_devices_seen,
        &current,
    );

    let events = events.lock().expect("event lock");
    assert!(
        !events
            .iter()
            .any(|event| matches!(event, NetworkEvent::NewDeviceDiscovered { .. })),
        "new-device event should be deduped when MAC is already seen"
    );
}

#[tokio::test]
async fn arp_enrichment_reconciles_unknown_identity_in_unique_set() {
    let passive_devices = StdArc::new(Mutex::new(HashMap::from([(
        "unknown_192.168.1.77".to_string(),
        DeviceSnapshot {
            mac: "unknown_192.168.1.77".to_string(),
            ip: "192.168.1.77".to_string(),
            hostname: Some("mdns-device".to_string()),
            device_type: "Unknown".to_string(),
            is_online: true,
        },
    )])));
    let unique_devices_seen = StdArc::new(Mutex::new(HashSet::from([
        "unknown_192.168.1.77".to_string()
    ])));

    apply_arp_enrichment(
        &passive_devices,
        &unique_devices_seen,
        "192.168.1.77",
        "AA:BB:CC:DD:EE:77",
    )
    .await;

    let map = passive_devices.lock().await;
    assert!(map.contains_key("AA:BB:CC:DD:EE:77"));
    assert!(!map.contains_key("unknown_192.168.1.77"));
    drop(map);

    let unique = unique_devices_seen.lock().await;
    assert!(unique.contains("AA:BB:CC:DD:EE:77"));
    assert!(!unique.contains("unknown_192.168.1.77"));
}
