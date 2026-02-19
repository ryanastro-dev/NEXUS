//! TCP port probing

use anyhow::Result;
use pnet::util::MacAddr;
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinSet;

use crate::config::{max_concurrent_pings, tcp_probe_ports, tcp_probe_timeout};

fn is_cancelled(cancel_token: Option<&Arc<AtomicBool>>) -> bool {
    cancel_token
        .map(|token| token.load(Ordering::Relaxed))
        .unwrap_or(false)
}

/// Probes a single host for open ports
async fn probe_host_ports(
    ip: Ipv4Addr,
    ports: &[u16],
    timeout: std::time::Duration,
    cancel_token: Option<Arc<AtomicBool>>,
) -> Vec<u16> {
    let mut open_ports = Vec::new();
    let mut probe_tasks: JoinSet<Option<u16>> = JoinSet::new();

    for &port in ports {
        if is_cancelled(cancel_token.as_ref()) {
            break;
        }

        let addr = std::net::SocketAddr::new(std::net::IpAddr::V4(ip), port);
        let cancel_token = cancel_token.clone();
        probe_tasks.spawn(async move {
            if is_cancelled(cancel_token.as_ref()) {
                return None;
            }
            if let Ok(Ok(_)) =
                tokio::time::timeout(timeout, tokio::net::TcpStream::connect(addr)).await
            {
                Some(port)
            } else {
                None
            }
        });
    }

    while !probe_tasks.is_empty() {
        if is_cancelled(cancel_token.as_ref()) {
            probe_tasks.abort_all();
            break;
        }

        match tokio::time::timeout(
            std::time::Duration::from_millis(50),
            probe_tasks.join_next(),
        )
        .await
        {
            Ok(Some(Ok(Some(port)))) => open_ports.push(port),
            Ok(Some(Ok(None))) | Err(_) => {}
            Ok(Some(Err(e))) => {
                if !e.is_cancelled() {
                    crate::log_warn!("TCP per-port probe task failed for {}: {}", ip, e);
                }
            }
            Ok(None) => break,
        }
    }

    open_ports.sort_unstable();
    open_ports
}

/// Performs TCP probe scan on discovered hosts
pub async fn tcp_probe_scan(
    hosts: &HashMap<Ipv4Addr, MacAddr>,
    cancel_token: Option<Arc<AtomicBool>>,
) -> Result<HashMap<Ipv4Addr, Vec<u16>>> {
    let ports = Arc::new(tcp_probe_ports());
    let timeout = tcp_probe_timeout();
    let concurrency = max_concurrent_pings();

    crate::log_stderr!(
        "Phase 3: TCP probing {} hosts ({} ports each)...",
        hosts.len(),
        ports.len()
    );

    let semaphore = Arc::new(Semaphore::new(concurrency));
    let port_results: Arc<Mutex<HashMap<Ipv4Addr, Vec<u16>>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let mut tasks: JoinSet<()> = JoinSet::new();

    for &ip in hosts.keys() {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("TCP scan cancelled while scheduling targets");
            break;
        }

        let semaphore = Arc::clone(&semaphore);
        let port_results = Arc::clone(&port_results);
        let ports = Arc::clone(&ports);
        let cancel_token = cancel_token.clone();

        tasks.spawn(async move {
            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            let _permit = match semaphore.acquire().await {
                Ok(permit) => permit,
                Err(e) => {
                    crate::log_warn!("TCP semaphore acquire failed for {}: {}", ip, e);
                    return;
                }
            };

            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            let open_ports = probe_host_ports(ip, &ports, timeout, cancel_token).await;
            if !open_ports.is_empty() {
                let mut results = port_results.lock().await;
                results.insert(ip, open_ports);
            }
        });
    }

    while !tasks.is_empty() {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("TCP scan cancelled; aborting in-flight tasks");
            tasks.abort_all();
            break;
        }

        match tokio::time::timeout(std::time::Duration::from_millis(50), tasks.join_next()).await {
            Ok(Some(Err(e))) => {
                if !e.is_cancelled() {
                    crate::log_warn!("TCP probe task failed: {}", e);
                }
            }
            Ok(Some(Ok(()))) | Err(_) => {}
            Ok(None) => break,
        }
    }

    let mut results = port_results.lock().await;
    let hosts_with_ports = results.len();
    let total_ports: usize = results.values().map(|v| v.len()).sum();

    crate::log_stderr!(
        "Phase 3 complete: {} hosts with open ports ({} ports total)",
        hosts_with_ports,
        total_ports
    );

    Ok(std::mem::take(&mut *results))
}
