use nexus_core::{BackgroundMonitor, NetworkEvent};
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[tokio::test]
#[ignore = "network environment dependent; run via scripts/desktop-smoke.ps1"]
async fn monitor_sequence_emits_started_stream_and_stopped() {
    let monitor = BackgroundMonitor::new();
    let events: Arc<Mutex<Vec<NetworkEvent>>> = Arc::new(Mutex::new(Vec::new()));
    let sink = Arc::clone(&events);

    monitor
        .start_with_interface(
            move |event| {
                sink.lock().expect("monitor event lock").push(event);
            },
            Some(1),
            None,
        )
        .await
        .expect("monitor should start");

    tokio::time::timeout(Duration::from_secs(12), async {
        loop {
            let captured = events.lock().expect("monitor event lock");
            let has_started = captured
                .iter()
                .any(|event| matches!(event, NetworkEvent::MonitoringStarted { .. }));
            let has_stream = captured.iter().any(|event| {
                matches!(
                    event,
                    NetworkEvent::ScanStarted { .. } | NetworkEvent::ScanProgress { .. }
                )
            });

            if has_started && has_stream {
                break;
            }

            drop(captured);
            tokio::time::sleep(Duration::from_millis(150)).await;
        }
    })
    .await
    .expect("monitor should emit start and stream events");

    monitor.stop();

    tokio::time::timeout(Duration::from_secs(12), async {
        loop {
            let captured = events.lock().expect("monitor event lock");
            let has_stopped = captured
                .iter()
                .any(|event| matches!(event, NetworkEvent::MonitoringStopped));

            if has_stopped {
                break;
            }

            drop(captured);
            tokio::time::sleep(Duration::from_millis(150)).await;
        }
    })
    .await
    .expect("monitor should emit stop event");
}
