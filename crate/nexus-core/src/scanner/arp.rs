//! Active ARP scanning with adaptive timing

use anyhow::{Result, anyhow};
use ipnetwork::Ipv4Network;
use pnet::datalink::{self, Channel};
use pnet::packet::Packet;
use pnet::packet::arp::{ArpHardwareTypes, ArpOperations, ArpPacket, MutableArpPacket};
use pnet::packet::ethernet::{EtherTypes, EthernetPacket, MutableEthernetPacket};
use pnet::util::MacAddr;
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::config::{
    arp_check_interval_ms, arp_deferred_receiver_handle_cap, arp_deferred_receiver_warn_threshold,
    arp_idle_timeout_ms, arp_max_wait_ms, arp_rounds,
};
use crate::models::InterfaceInfo;
use crate::network::is_special_address;

/// Broadcast MAC address for ARP requests
const BROADCAST_MAC: MacAddr = MacAddr(0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
/// Max per-round budget for transmitting ARP requests on slow adapters.
const ARP_SEND_BUDGET_MS: u64 = 8000;
type DeferredReceiverJoin = std::thread::JoinHandle<()>;
static DEFERRED_ARP_RECEIVER_JOINS: OnceLock<Mutex<Vec<DeferredReceiverJoin>>> = OnceLock::new();
static DEFERRED_ARP_RECEIVER_PENDING: AtomicUsize = AtomicUsize::new(0);
static DEFERRED_ARP_RECEIVER_HIGH_WATERMARK: AtomicUsize = AtomicUsize::new(0);
static DEFERRED_ARP_RECEIVER_TOTAL_DEFERRED: AtomicUsize = AtomicUsize::new(0);
static DEFERRED_ARP_RECEIVER_TOTAL_REAPED: AtomicUsize = AtomicUsize::new(0);
static DEFERRED_ARP_RECEIVER_DROPPED_OVER_CAP: AtomicUsize = AtomicUsize::new(0);
static DEFERRED_ARP_RECEIVER_LAST_WARNED_PENDING: AtomicUsize = AtomicUsize::new(0);

/// Runtime lifecycle metrics for deferred ARP receiver join handles.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ArpReceiverLifecycleMetrics {
    /// Current number of deferred receiver handles pending best-effort join.
    pub current_deferred_handles: usize,
    /// Maximum observed pending deferred handle depth.
    pub deferred_high_watermark: usize,
    /// Total number of receiver handles added to deferred cleanup queue.
    pub total_deferred_handles: usize,
    /// Total number of deferred handles reaped (joined) successfully/attempted.
    pub total_reaped_handles: usize,
    /// Total deferred handles dropped because queue reached configured cap.
    pub dropped_over_cap: usize,
    /// Configured deferred-handle cap in effect for this snapshot.
    pub cap: usize,
    /// Configured warning threshold in effect for this snapshot.
    pub warning_threshold: usize,
}

fn deferred_receiver_joins() -> &'static Mutex<Vec<DeferredReceiverJoin>> {
    DEFERRED_ARP_RECEIVER_JOINS.get_or_init(|| Mutex::new(Vec::new()))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct DeferredJoinQueueResult {
    pending: usize,
    warning_threshold: usize,
    cap: usize,
    dropped_over_cap: bool,
    dropped_over_cap_total: usize,
}

fn update_deferred_receiver_high_watermark(pending: usize) {
    loop {
        let previous = DEFERRED_ARP_RECEIVER_HIGH_WATERMARK.load(Ordering::Relaxed);
        if pending <= previous {
            return;
        }
        if DEFERRED_ARP_RECEIVER_HIGH_WATERMARK
            .compare_exchange(previous, pending, Ordering::Relaxed, Ordering::Relaxed)
            .is_ok()
        {
            return;
        }
    }
}

fn maybe_warn_deferred_receiver_depth(pending: usize, warning_threshold: usize, cap: usize) {
    if pending < warning_threshold {
        DEFERRED_ARP_RECEIVER_LAST_WARNED_PENDING.store(0, Ordering::Relaxed);
        return;
    }

    loop {
        let last_warned = DEFERRED_ARP_RECEIVER_LAST_WARNED_PENDING.load(Ordering::Relaxed);
        if pending <= last_warned {
            return;
        }

        if DEFERRED_ARP_RECEIVER_LAST_WARNED_PENDING
            .compare_exchange(last_warned, pending, Ordering::Relaxed, Ordering::Relaxed)
            .is_ok()
        {
            crate::log_warn!(
                "ARP deferred receiver handles reached {} pending (warning threshold {}, cap {})",
                pending,
                warning_threshold,
                cap
            );
            return;
        }
    }
}

fn reap_finished_receiver_joins_locked(joins: &mut Vec<DeferredReceiverJoin>) -> usize {
    if joins.is_empty() {
        DEFERRED_ARP_RECEIVER_PENDING.store(0, Ordering::Relaxed);
        DEFERRED_ARP_RECEIVER_LAST_WARNED_PENDING.store(0, Ordering::Relaxed);
        return 0;
    }

    let warning_threshold = arp_deferred_receiver_warn_threshold();
    let cap = arp_deferred_receiver_handle_cap();
    let mut pending = Vec::with_capacity(joins.len());
    let mut reaped = 0usize;

    for handle in joins.drain(..) {
        if handle.is_finished() {
            reaped += 1;
            if handle.join().is_err() {
                crate::log_warn!("Deferred ARP receiver thread panicked while joining");
            }
        } else {
            pending.push(handle);
        }
    }

    *joins = pending;
    let pending_count = joins.len();
    DEFERRED_ARP_RECEIVER_PENDING.store(pending_count, Ordering::Relaxed);
    if reaped > 0 {
        DEFERRED_ARP_RECEIVER_TOTAL_REAPED.fetch_add(reaped, Ordering::Relaxed);
    }
    maybe_warn_deferred_receiver_depth(pending_count, warning_threshold, cap);
    reaped
}

fn reap_deferred_receiver_joins() {
    let mut joins = match deferred_receiver_joins().lock() {
        Ok(joins) => joins,
        Err(poisoned) => {
            crate::log_warn!("Deferred ARP receiver join registry lock poisoned; recovering");
            poisoned.into_inner()
        }
    };

    let reaped = reap_finished_receiver_joins_locked(&mut joins);
    let pending_count = joins.len();

    if reaped > 0 {
        crate::log_stderr!(
            "Reaped {} deferred ARP receiver thread handle(s); {} pending",
            reaped,
            pending_count
        );
    }
}

fn defer_receiver_join(handle: DeferredReceiverJoin) -> DeferredJoinQueueResult {
    let cap = arp_deferred_receiver_handle_cap();
    let warning_threshold = arp_deferred_receiver_warn_threshold();

    let mut joins = match deferred_receiver_joins().lock() {
        Ok(joins) => joins,
        Err(poisoned) => {
            crate::log_warn!("Deferred ARP receiver join registry lock poisoned; recovering");
            poisoned.into_inner()
        }
    };

    let _ = reap_finished_receiver_joins_locked(&mut joins);
    if joins.len() >= cap {
        drop(handle);
        let dropped_total =
            DEFERRED_ARP_RECEIVER_DROPPED_OVER_CAP.fetch_add(1, Ordering::Relaxed) + 1;
        crate::log_warn!(
            "Deferred ARP receiver join queue hit cap {}; dropping handle ({} dropped total)",
            cap,
            dropped_total
        );
        return DeferredJoinQueueResult {
            pending: joins.len(),
            warning_threshold,
            cap,
            dropped_over_cap: true,
            dropped_over_cap_total: dropped_total,
        };
    }

    joins.push(handle);
    let pending = joins.len();
    DEFERRED_ARP_RECEIVER_PENDING.store(pending, Ordering::Relaxed);
    DEFERRED_ARP_RECEIVER_TOTAL_DEFERRED.fetch_add(1, Ordering::Relaxed);
    update_deferred_receiver_high_watermark(pending);
    maybe_warn_deferred_receiver_depth(pending, warning_threshold, cap);

    DeferredJoinQueueResult {
        pending,
        warning_threshold,
        cap,
        dropped_over_cap: false,
        dropped_over_cap_total: DEFERRED_ARP_RECEIVER_DROPPED_OVER_CAP.load(Ordering::Relaxed),
    }
}

/// Snapshot lifecycle metrics for deferred ARP receiver handle management.
pub fn arp_receiver_lifecycle_metrics() -> ArpReceiverLifecycleMetrics {
    ArpReceiverLifecycleMetrics {
        current_deferred_handles: DEFERRED_ARP_RECEIVER_PENDING.load(Ordering::Relaxed),
        deferred_high_watermark: DEFERRED_ARP_RECEIVER_HIGH_WATERMARK.load(Ordering::Relaxed),
        total_deferred_handles: DEFERRED_ARP_RECEIVER_TOTAL_DEFERRED.load(Ordering::Relaxed),
        total_reaped_handles: DEFERRED_ARP_RECEIVER_TOTAL_REAPED.load(Ordering::Relaxed),
        dropped_over_cap: DEFERRED_ARP_RECEIVER_DROPPED_OVER_CAP.load(Ordering::Relaxed),
        cap: arp_deferred_receiver_handle_cap(),
        warning_threshold: arp_deferred_receiver_warn_threshold(),
    }
}

/// Creates an ARP request packet
fn create_arp_request(
    source_mac: MacAddr,
    source_ip: Ipv4Addr,
    target_ip: Ipv4Addr,
) -> Result<Vec<u8>> {
    let mut buffer = vec![0u8; 42];

    // Build Ethernet frame
    {
        let mut ethernet_packet = MutableEthernetPacket::new(&mut buffer[..14])
            .ok_or_else(|| anyhow!("Failed to construct Ethernet packet buffer"))?;
        ethernet_packet.set_destination(BROADCAST_MAC);
        ethernet_packet.set_source(source_mac);
        ethernet_packet.set_ethertype(EtherTypes::Arp);
    }

    // Build ARP packet
    {
        let mut arp_packet = MutableArpPacket::new(&mut buffer[14..42])
            .ok_or_else(|| anyhow!("Failed to construct ARP packet buffer"))?;
        arp_packet.set_hardware_type(ArpHardwareTypes::Ethernet);
        arp_packet.set_protocol_type(EtherTypes::Ipv4);
        arp_packet.set_hw_addr_len(6);
        arp_packet.set_proto_addr_len(4);
        arp_packet.set_operation(ArpOperations::Request);
        arp_packet.set_sender_hw_addr(source_mac);
        arp_packet.set_sender_proto_addr(source_ip);
        arp_packet.set_target_hw_addr(MacAddr::zero());
        arp_packet.set_target_proto_addr(target_ip);
    }

    Ok(buffer)
}

/// Performs Adaptive ARP scan with early termination
pub fn active_arp_scan(
    interface: &InterfaceInfo,
    target_ips: &[Ipv4Addr],
    subnet: &Ipv4Network,
) -> Result<HashMap<Ipv4Addr, MacAddr>> {
    // Best-effort cleanup for any previously deferred ARP receiver joins.
    reap_deferred_receiver_joins();

    let cfg_arp_max_wait_ms = arp_max_wait_ms();
    let cfg_arp_check_interval_ms = arp_check_interval_ms();
    let cfg_arp_idle_timeout_ms = arp_idle_timeout_ms();
    let cfg_arp_rounds = arp_rounds();

    crate::log_stderr!(
        "Phase 1: Active ARP scanning {} hosts (adaptive timing)...",
        target_ips.len()
    );

    // Bound send/receive blocking so slow virtual adapters do not stall full scans.
    let channel_config = datalink::Config {
        read_timeout: Some(Duration::from_millis(100)),
        write_timeout: Some(Duration::from_millis(50)),
        ..Default::default()
    };

    // Open datalink channel
    let (mut tx, mut rx) = match datalink::channel(&interface.pnet_interface, channel_config) {
        Ok(Channel::Ethernet(tx, rx)) => (tx, rx),
        Ok(_) => return Err(anyhow!("Unsupported channel type")),
        Err(e) => {
            let error_msg = format!("{}", e);
            if error_msg.contains("requires")
                || error_msg.contains("permission")
                || error_msg.contains("Access")
                || error_msg.contains("Npcap")
                || error_msg.contains("WinPcap")
            {
                return Err(anyhow!(
                    "Failed to open network interface for ARP scanning.\n\n\
                     On Windows, this requires Npcap to be installed:\n\
                     1. Download from: https://npcap.com/#download\n\
                     2. Install with 'WinPcap API-compatible Mode' checked\n\
                     3. Run this program as Administrator\n\n\
                     Original error: {}",
                    e
                ));
            }
            return Err(anyhow!("Failed to open datalink channel: {}", e));
        }
    };

    let discovered: Arc<std::sync::Mutex<HashMap<Ipv4Addr, MacAddr>>> =
        Arc::new(std::sync::Mutex::new(HashMap::new()));
    let host_count = Arc::new(AtomicUsize::new(0));
    let receiver_stop = Arc::new(AtomicBool::new(false));
    let scan_start = Instant::now();

    // Calculate total timeout for receiver thread (all rounds + buffer)
    let total_timeout = Duration::from_millis(cfg_arp_max_wait_ms * cfg_arp_rounds as u64 + 500);

    let discovered_clone = Arc::clone(&discovered);
    let host_count_clone = Arc::clone(&host_count);
    let receiver_stop_clone = Arc::clone(&receiver_stop);
    let subnet_clone = *subnet;

    // Start receiver thread
    let receiver_handle = std::thread::spawn(move || {
        let deadline = Instant::now() + total_timeout;

        while Instant::now() < deadline && !receiver_stop_clone.load(Ordering::SeqCst) {
            match rx.next() {
                Ok(packet) => {
                    if let Some(ethernet) = EthernetPacket::new(packet)
                        && ethernet.get_ethertype() == EtherTypes::Arp
                        && let Some(arp) = ArpPacket::new(ethernet.payload())
                        && arp.get_operation() == ArpOperations::Reply
                    {
                        let sender_ip = arp.get_sender_proto_addr();
                        let sender_mac = arp.get_sender_hw_addr();

                        if subnet_clone.contains(sender_ip)
                            && !is_special_address(sender_ip, &subnet_clone)
                        {
                            let mut map = match discovered_clone.lock() {
                                Ok(map) => map,
                                Err(_) => {
                                    crate::log_stderr!(
                                        "ARP receiver map lock poisoned; stopping receiver thread"
                                    );
                                    break;
                                }
                            };
                            if let std::collections::hash_map::Entry::Vacant(e) =
                                map.entry(sender_ip)
                            {
                                e.insert(sender_mac);
                                host_count_clone.fetch_add(1, Ordering::SeqCst);
                            }
                        }
                    }
                }
                Err(e) => {
                    if matches!(
                        e.kind(),
                        std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
                    ) {
                        continue;
                    }

                    crate::log_warn!("ARP receiver error: {}", e);
                    std::thread::sleep(Duration::from_millis(1));
                }
            }
        }
    });

    // Give receiver time to start
    std::thread::sleep(Duration::from_millis(10));

    // Adaptive ARP scan rounds
    for round in 1..=cfg_arp_rounds {
        let round_start = Instant::now();
        let initial_count = host_count.load(Ordering::SeqCst);

        // Get remaining IPs to scan
        let remaining: Vec<Ipv4Addr> = {
            let discovered_map = discovered
                .lock()
                .map_err(|_| anyhow!("ARP discovered-host map lock poisoned"))?;
            target_ips
                .iter()
                .filter(|ip| !discovered_map.contains_key(ip))
                .copied()
                .collect()
        };

        if remaining.is_empty() {
            crate::log_stderr!(
                "Round {}/{}: All hosts found, skipping",
                round,
                cfg_arp_rounds
            );
            break;
        }

        crate::log_stderr!(
            "Round {}/{}: Blasting {} requests ({} already found)...",
            round,
            cfg_arp_rounds,
            remaining.len(),
            initial_count
        );

        let send_budget = Duration::from_millis(ARP_SEND_BUDGET_MS);

        // BLAST: Send all requests as fast as possible
        for (sent_requests, target_ip) in remaining.iter().enumerate() {
            if round_start.elapsed() >= send_budget {
                let skipped = remaining.len().saturating_sub(sent_requests);
                crate::log_stderr!(
                    "Round {} send budget reached ({}ms): sent {}, skipped {} remaining targets",
                    round,
                    ARP_SEND_BUDGET_MS,
                    sent_requests,
                    skipped
                );
                break;
            }

            match create_arp_request(interface.mac, interface.ip, *target_ip) {
                Ok(packet) => match tx.send_to(&packet, None) {
                    Some(Ok(_)) => {}
                    Some(Err(e)) => {
                        crate::log_stderr!("Failed to send ARP request to {}: {}", target_ip, e);
                    }
                    None => {
                        crate::log_stderr!(
                            "Failed to send ARP request to {}: no transmit channel",
                            target_ip
                        );
                    }
                },
                Err(e) => {
                    crate::log_stderr!("Failed to create ARP request for {}: {}", target_ip, e);
                }
            }
        }

        // ADAPTIVE WAIT: Check periodically, stop early if idle
        let max_wait = Duration::from_millis(cfg_arp_max_wait_ms);
        let check_interval = Duration::from_millis(cfg_arp_check_interval_ms);
        let idle_timeout = Duration::from_millis(cfg_arp_idle_timeout_ms);

        let mut last_count = host_count.load(Ordering::SeqCst);
        let mut last_change = Instant::now();

        while round_start.elapsed() < max_wait {
            std::thread::sleep(check_interval);

            let current_count = host_count.load(Ordering::SeqCst);

            if current_count > last_count {
                // New hosts found, reset idle timer
                last_count = current_count;
                last_change = Instant::now();
            } else if last_change.elapsed() >= idle_timeout {
                // No new hosts for idle_timeout, stop early
                crate::log_stderr!(
                    "Round {} early exit: no new hosts for {}ms",
                    round,
                    cfg_arp_idle_timeout_ms
                );
                break;
            }
        }

        let final_count = host_count.load(Ordering::SeqCst);
        crate::log_stderr!(
            "Round {} complete: {} hosts found ({} new) in {:?}",
            round,
            final_count,
            final_count - initial_count,
            round_start.elapsed()
        );
    }

    // Close the TX side and request receiver stop once rounds are done.
    // On some adapters this helps unblock `rx.next()` promptly.
    drop(tx);
    receiver_stop.store(true, Ordering::SeqCst);

    // Wait briefly for the receiver to finish without stalling the whole scan.
    let join_wait_ms = cfg_arp_check_interval_ms.saturating_mul(2).clamp(200, 1000);
    let join_deadline = Instant::now() + Duration::from_millis(join_wait_ms);
    while !receiver_handle.is_finished() && Instant::now() < join_deadline {
        std::thread::sleep(Duration::from_millis(10));
    }

    if receiver_handle.is_finished() {
        if receiver_handle.join().is_err() {
            return Err(anyhow!("ARP receiver thread panicked"));
        }
    } else {
        // Avoid detached join-helper threads. Queue this handle for best-effort join
        // at the start of the next scan cycle.
        let result = defer_receiver_join(receiver_handle);
        if result.dropped_over_cap {
            crate::log_warn!(
                "ARP receiver thread did not stop within {}ms; deferred join queue is at cap {} ({} pending, {} dropped total)",
                join_wait_ms,
                result.cap,
                result.pending,
                result.dropped_over_cap_total
            );
        } else {
            crate::log_warn!(
                "ARP receiver thread did not stop within {}ms; queued for deferred join ({} pending)",
                join_wait_ms,
                result.pending
            );
            if result.pending >= result.warning_threshold {
                crate::log_warn!(
                    "Deferred ARP join queue pending {} is above warning threshold {}",
                    result.pending,
                    result.warning_threshold
                );
            }
        }
    }

    let mut map = discovered
        .lock()
        .map_err(|_| anyhow!("ARP discovered-host map lock poisoned"))?;
    for (ip, mac) in map.iter() {
        crate::log_stderr!("[ARP] Found: {} -> {}", ip, mac);
    }

    crate::log_stderr!(
        "Phase 1 complete: {} hosts found in {:?}",
        map.len(),
        scan_start.elapsed()
    );

    Ok(std::mem::take(&mut *map))
}
