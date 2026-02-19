//! ICMP ping scanning with TTL-based OS fingerprinting

use anyhow::Result;
use pnet::util::MacAddr;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::time::Duration;
use std::time::Instant;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinSet;

use crate::config::{max_concurrent_pings, ping_retries, ping_timeout};

/// Result of an ICMP ping including TTL for OS fingerprinting
#[derive(Debug, Clone)]
pub struct IcmpResult {
    pub duration: Duration,
    pub ttl: Option<u8>,
}

static PING_ID_COUNTER: AtomicU16 = AtomicU16::new(1);

/// Generates a random ping identifier
fn rand_id() -> u16 {
    PING_ID_COUNTER.fetch_add(1, Ordering::Relaxed)
}

fn is_cancelled(cancel_token: Option<&Arc<AtomicBool>>) -> bool {
    cancel_token
        .map(|token| token.load(Ordering::Relaxed))
        .unwrap_or(false)
}

/// Guess the operating system based on TTL value
///
/// Common default TTL values:
/// - Linux/Unix/macOS: 64
/// - Windows: 128
/// - Cisco/Network devices: 255
pub fn guess_os_from_ttl(ttl: u8) -> String {
    match ttl {
        1..=64 => "Linux/Unix/macOS".to_string(),
        65..=128 => "Windows".to_string(),
        129..=255 => "Network Device (Router/Switch)".to_string(),
        0 => "Unknown".to_string(),
    }
}

/// Pings a single IP address with retries, returns duration and TTL
async fn ping_host_with_retries(
    client: &Client,
    ip: Ipv4Addr,
    retries: u8,
    timeout: Duration,
) -> Option<IcmpResult> {
    let payload = [0u8; 56];

    for attempt in 0..retries {
        let start = Instant::now();
        match client
            .pinger(IpAddr::V4(ip), PingIdentifier(rand_id()))
            .await
            .timeout(timeout)
            .ping(PingSequence(attempt as u16), &payload)
            .await
        {
            Ok((packet, _rtt)) => {
                let ttl = match packet {
                    IcmpPacket::V4(p) => p.get_ttl(),
                    IcmpPacket::V6(_) => None,
                };
                return Some(IcmpResult {
                    duration: start.elapsed(),
                    ttl,
                });
            }
            Err(_) => continue,
        }
    }
    None
}

/// Performs ICMP scan on discovered hosts to get response times and TTL
pub async fn icmp_scan(
    arp_hosts: &HashMap<Ipv4Addr, MacAddr>,
    cancel_token: Option<Arc<AtomicBool>>,
) -> Result<HashMap<Ipv4Addr, IcmpResult>> {
    if arp_hosts.is_empty() {
        return Ok(HashMap::new());
    }

    crate::log_stderr!(
        "Phase 2: ICMP scanning {} hosts for response times...",
        arp_hosts.len()
    );

    let config = Config::default();
    let client = match Client::new(&config) {
        Ok(c) => Arc::new(c),
        Err(e) => {
            crate::log_warn!(
                "ICMP client unavailable ({}), skipping latency measurement",
                e
            );
            return Ok(HashMap::new());
        }
    };

    let concurrency = max_concurrent_pings();
    let cfg_timeout = ping_timeout();
    let cfg_retries = ping_retries();
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let results = Arc::new(Mutex::new(HashMap::new()));
    let mut tasks: JoinSet<()> = JoinSet::new();

    for &ip in arp_hosts.keys() {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("ICMP scan cancelled while scheduling targets");
            break;
        }

        let client = Arc::clone(&client);
        let semaphore = Arc::clone(&semaphore);
        let results = Arc::clone(&results);
        let cancel_token = cancel_token.clone();
        tasks.spawn(async move {
            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            let _permit = match semaphore.acquire().await {
                Ok(permit) => permit,
                Err(e) => {
                    crate::log_warn!("ICMP semaphore acquire failed for {}: {}", ip, e);
                    return;
                }
            };

            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            if let Some(icmp_result) =
                ping_host_with_retries(&client, ip, cfg_retries, cfg_timeout).await
            {
                let mut res = results.lock().await;
                res.insert(ip, icmp_result);
            }
        });
    }

    while !tasks.is_empty() {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("ICMP scan cancelled; aborting in-flight tasks");
            tasks.abort_all();
            break;
        }

        match tokio::time::timeout(Duration::from_millis(50), tasks.join_next()).await {
            Ok(Some(Err(e))) => {
                if !e.is_cancelled() {
                    crate::log_warn!("ICMP scan task failed: {}", e);
                }
            }
            Ok(Some(Ok(()))) | Err(_) => {}
            Ok(None) => break,
        }
    }

    let mut res = results.lock().await;
    crate::log_stderr!("Phase 2 complete: {} hosts responded to ICMP", res.len());

    Ok(std::mem::take(&mut *res))
}
