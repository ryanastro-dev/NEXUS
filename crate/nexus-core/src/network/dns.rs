//! DNS Reverse Lookup for hostname resolution
//!
//! Resolves IP addresses to hostnames using reverse DNS queries.
//! Includes an in-memory TTL cache to avoid redundant lookups across
//! successive monitor scans.

use dns_lookup::lookup_addr;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};
use tokio::sync::Mutex as TokioMutex;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

/// Maximum concurrent DNS lookups
const MAX_CONCURRENT_DNS: usize = 50;

/// DNS lookup timeout (synchronous, so we use spawn_blocking)
const DNS_TIMEOUT_MS: u64 = 1000;

/// How long a cached DNS entry stays valid before a fresh lookup is needed.
const DNS_CACHE_TTL: Duration = Duration::from_secs(300); // 5 minutes

/// Maximum number of entries in the cache (prevents unbounded growth).
const DNS_CACHE_MAX_ENTRIES: usize = 1024;

// ── In-memory TTL cache ──────────────────────────────────────────────────────

#[derive(Clone)]
struct CacheEntry {
    hostname: Option<String>,
    inserted_at: Instant,
}

impl CacheEntry {
    fn is_expired(&self) -> bool {
        self.inserted_at.elapsed() > DNS_CACHE_TTL
    }
}

/// Global DNS cache – thread-safe via `std::sync::Mutex` (lightweight, no async).
fn dns_cache() -> &'static std::sync::Mutex<HashMap<Ipv4Addr, CacheEntry>> {
    static CACHE: OnceLock<std::sync::Mutex<HashMap<Ipv4Addr, CacheEntry>>> = OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

/// Read a cached hostname if the entry exists and hasn't expired.
fn cache_get(ip: Ipv4Addr) -> Option<Option<String>> {
    let cache = dns_cache().lock().ok()?;
    let entry = cache.get(&ip)?;
    if entry.is_expired() {
        None // stale → needs refresh
    } else {
        Some(entry.hostname.clone())
    }
}

/// Write a lookup result (including negative results) into the cache.
fn cache_put(ip: Ipv4Addr, hostname: Option<String>) {
    if let Ok(mut cache) = dns_cache().lock() {
        // Evict expired entries when we're near capacity.
        if cache.len() >= DNS_CACHE_MAX_ENTRIES {
            cache.retain(|_, entry| !entry.is_expired());
        }
        cache.insert(
            ip,
            CacheEntry {
                hostname,
                inserted_at: Instant::now(),
            },
        );
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn is_cancelled(cancel_token: Option<&Arc<AtomicBool>>) -> bool {
    cancel_token
        .map(|token| token.load(Ordering::Relaxed))
        .unwrap_or(false)
}

/// Perform reverse DNS lookup for a single IP address
pub fn reverse_lookup(ip: Ipv4Addr) -> Option<String> {
    let ip_addr = IpAddr::V4(ip);
    match lookup_addr(&ip_addr) {
        Ok(hostname) => {
            // Don't return if hostname is just the IP address
            if hostname != ip.to_string() {
                Some(hostname)
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

/// Perform reverse DNS lookup for multiple IP addresses concurrently.
///
/// Results are served from a 5-minute TTL in-memory cache when available,
/// avoiding redundant network queries across successive monitor scans.
pub async fn dns_scan(
    ips: &[Ipv4Addr],
    cancel_token: Option<Arc<AtomicBool>>,
) -> HashMap<Ipv4Addr, String> {
    if ips.is_empty() {
        return HashMap::new();
    }

    crate::log_stderr!("Phase 5: DNS reverse lookup for {} hosts...", ips.len());

    let results = Arc::new(TokioMutex::new(HashMap::new()));

    // 1) Serve what we can from the cache; collect IPs that need a fresh lookup.
    let mut need_lookup: Vec<Ipv4Addr> = Vec::with_capacity(ips.len());

    for &ip in ips {
        match cache_get(ip) {
            Some(Some(hostname)) => {
                // Cache hit (positive)
                results.lock().await.insert(ip, hostname);
            }
            Some(None) => {
                // Cache hit (negative — previously resolved to nothing)
            }
            None => {
                // Cache miss or expired
                need_lookup.push(ip);
            }
        }
    }

    let cache_hits = ips.len() - need_lookup.len();
    if cache_hits > 0 {
        crate::log_stderr!(
            "  DNS cache: {} hits, {} to resolve",
            cache_hits,
            need_lookup.len()
        );
    }

    // 2) Resolve the remaining IPs concurrently.
    if !need_lookup.is_empty() {
        let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_DNS));
        let mut tasks: JoinSet<()> = JoinSet::new();

        for ip in need_lookup {
            if is_cancelled(cancel_token.as_ref()) {
                crate::log_warn!("DNS scan cancelled while scheduling targets");
                break;
            }

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
                        crate::log_warn!("DNS semaphore acquire failed for {}: {}", ip, e);
                        return;
                    }
                };

                if is_cancelled(cancel_token.as_ref()) {
                    return;
                }

                // Run DNS lookup in blocking thread with timeout
                let lookup_result = tokio::time::timeout(
                    Duration::from_millis(DNS_TIMEOUT_MS),
                    tokio::task::spawn_blocking(move || reverse_lookup(ip)),
                )
                .await;

                match lookup_result {
                    Ok(Ok(resolved)) => {
                        // Cache the result (positive or negative).
                        cache_put(ip, resolved.clone());
                        if let Some(hostname) = resolved {
                            results.lock().await.insert(ip, hostname);
                        }
                    }
                    Ok(Err(e)) => {
                        crate::log_warn!("DNS worker join failed for {}: {}", ip, e);
                    }
                    Err(_) => {
                        // Timeout — cache as negative so we don't retry immediately.
                        cache_put(ip, None);
                    }
                }
            });
        }

        while !tasks.is_empty() {
            if is_cancelled(cancel_token.as_ref()) {
                crate::log_warn!("DNS scan cancelled; aborting in-flight tasks");
                tasks.abort_all();
                break;
            }

            match tokio::time::timeout(Duration::from_millis(50), tasks.join_next()).await {
                Ok(Some(Err(e))) => {
                    if !e.is_cancelled() {
                        crate::log_warn!("DNS scan task failed: {}", e);
                    }
                }
                Ok(Some(Ok(()))) | Err(_) => {}
                Ok(None) => break,
            }
        }
    }

    let mut res = results.lock().await;
    crate::log_stderr!("Phase 5 complete: {} hostnames resolved", res.len());

    std::mem::take(&mut *res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reverse_lookup_localhost() {
        let result = reverse_lookup(Ipv4Addr::new(127, 0, 0, 1));
        println!("Localhost reverse lookup: {:?}", result);
        // Usually returns "localhost" or similar
    }

    #[test]
    fn cache_hit_avoids_duplicate_lookup() {
        let ip = Ipv4Addr::new(10, 0, 0, 42);
        let hostname = "test-host.local".to_string();

        // Initially empty
        assert!(cache_get(ip).is_none());

        // Insert
        cache_put(ip, Some(hostname.clone()));

        // Should hit
        let cached = cache_get(ip);
        assert_eq!(cached, Some(Some(hostname)));
    }

    #[test]
    fn negative_cache_entry_prevents_retry() {
        let ip = Ipv4Addr::new(10, 0, 0, 99);

        cache_put(ip, None);

        // Should return Some(None) — cache hit with no hostname
        assert_eq!(cache_get(ip), Some(None));
    }

    #[tokio::test]
    async fn dns_scan_returns_cached_results() {
        let ip = Ipv4Addr::new(10, 99, 99, 1);
        let hostname = "cached-demo.local".to_string();
        cache_put(ip, Some(hostname.clone()));

        let result = dns_scan(&[ip], None).await;
        assert_eq!(result.get(&ip), Some(&hostname));
    }
}
