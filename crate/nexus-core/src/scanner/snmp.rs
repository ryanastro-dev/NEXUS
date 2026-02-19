//! SNMP enrichment for discovered hosts
//!
//! Queries common SNMP OIDs to get additional device information:
//! - sysName (1.3.6.1.2.1.1.5.0) - Hostname
//! - sysDescr (1.3.6.1.2.1.1.1.0) - System description
//! - sysUpTime (1.3.6.1.2.1.1.3.0) - Uptime in centiseconds

use anyhow::Result;
use snmp2::{AsyncSession, Oid, Value};
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinSet;
use tokio::time::timeout;

use crate::config::{snmp_community, snmp_port, snmp_timeout};

/// SNMP enrichment data for a single host
#[derive(Debug, Clone, Default)]
pub struct SnmpData {
    pub hostname: Option<String>,
    pub system_description: Option<String>,
    pub uptime_seconds: Option<u64>,
    /// LLDP/CDP neighbor information (for topology mapping)
    pub neighbors: Vec<SnmpNeighbor>,
}

/// LLDP/CDP neighbor info from SNMP
#[derive(Debug, Clone)]
pub struct SnmpNeighbor {
    pub local_port: String,
    pub remote_device: String,
    pub remote_port: String,
    pub remote_ip: Option<String>,
}

/// Common SNMP OID arrays (u64 type required by snmp2)
const OID_SYS_NAME: &[u64] = &[1, 3, 6, 1, 2, 1, 1, 5, 0];
const OID_SYS_DESCR: &[u64] = &[1, 3, 6, 1, 2, 1, 1, 1, 0];
const OID_SYS_UPTIME: &[u64] = &[1, 3, 6, 1, 2, 1, 1, 3, 0];

// LLDP OIDs for neighbor discovery (requires SNMP walk)
// lldpRemSysName: 1.0.8802.1.1.2.1.4.1.1.9 - Remote system name
// lldpRemPortId: 1.0.8802.1.1.2.1.4.1.1.7 - Remote port ID
// lldpLocPortDesc: 1.0.8802.1.1.2.1.3.7.1.4 - Local port description
#[allow(dead_code)]
const OID_LLDP_REM_SYS_NAME: &[u64] = &[1, 0, 8802, 1, 1, 2, 1, 4, 1, 1, 9];

/// Maximum concurrent SNMP queries
const MAX_CONCURRENT_SNMP: usize = 20;

fn truncate_for_display(input: &str, max_chars: usize) -> String {
    let mut chars = input.chars();
    let truncated: String = chars.by_ref().take(max_chars).collect();
    if chars.next().is_some() {
        format!("{truncated}...")
    } else {
        truncated
    }
}

fn is_cancelled(cancel_token: Option<&Arc<AtomicBool>>) -> bool {
    cancel_token
        .map(|token| token.load(Ordering::Relaxed))
        .unwrap_or(false)
}

/// Query a single host for SNMP data
async fn query_host_snmp(
    ip: Ipv4Addr,
    port: u16,
    timeout_dur: std::time::Duration,
    community: &str,
) -> Option<SnmpData> {
    let addr = format!("{}:{}", ip, port);

    // Create async session with SNMPv2c
    let mut session = match timeout(
        timeout_dur,
        AsyncSession::new_v2c(&addr, community.as_bytes(), 0),
    )
    .await
    {
        Ok(Ok(s)) => s,
        _ => return None,
    };

    let mut data = SnmpData::default();

    // Query sysName
    if let Ok(oid) = Oid::from(OID_SYS_NAME)
        && let Ok(Ok(mut response)) = timeout(timeout_dur, session.get(&oid)).await
        && let Some((_, Value::OctetString(bytes))) = response.varbinds.next()
    {
        let name = String::from_utf8_lossy(bytes).trim().to_string();
        if !name.is_empty() {
            data.hostname = Some(name);
        }
    }

    // Query sysDescr
    if let Ok(oid) = Oid::from(OID_SYS_DESCR)
        && let Ok(Ok(mut response)) = timeout(timeout_dur, session.get(&oid)).await
        && let Some((_, Value::OctetString(bytes))) = response.varbinds.next()
    {
        let descr = String::from_utf8_lossy(bytes).trim().to_string();
        if !descr.is_empty() {
            // Truncate very long descriptions on a UTF-8 character boundary.
            let descr = truncate_for_display(&descr, 200);
            data.system_description = Some(descr);
        }
    }

    // Query sysUpTime (in centiseconds, convert to seconds)
    if let Ok(oid) = Oid::from(OID_SYS_UPTIME)
        && let Ok(Ok(mut response)) = timeout(timeout_dur, session.get(&oid)).await
        && let Some((_, Value::Timeticks(ticks))) = response.varbinds.next()
    {
        // Timeticks is in centiseconds (1/100 sec) and wraps at u32::MAX by SNMP design.
        data.uptime_seconds = Some(ticks as u64 / 100);
    }

    // Only return if we got at least some data
    if data.hostname.is_some() || data.system_description.is_some() || data.uptime_seconds.is_some()
    {
        Some(data)
    } else {
        None
    }
}

/// Enrich discovered hosts with SNMP data
///
/// Queries each discovered host for SNMP information.
/// Returns a HashMap mapping IP addresses to their SNMP data.
pub async fn snmp_enrich(
    hosts: &[Ipv4Addr],
    cancel_token: Option<Arc<AtomicBool>>,
) -> Result<HashMap<Ipv4Addr, SnmpData>> {
    if hosts.is_empty() {
        return Ok(HashMap::new());
    }

    crate::log_stderr!("Phase 4: SNMP enrichment for {} hosts...", hosts.len());

    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_SNMP));
    let results = Arc::new(Mutex::new(HashMap::new()));
    let timeout_dur = snmp_timeout();
    let port = snmp_port();
    let community = Arc::new(snmp_community());
    let mut tasks: JoinSet<()> = JoinSet::new();

    for &ip in hosts {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("SNMP scan cancelled while scheduling targets");
            break;
        }

        let semaphore = Arc::clone(&semaphore);
        let results = Arc::clone(&results);
        let community = Arc::clone(&community);
        let cancel_token = cancel_token.clone();
        tasks.spawn(async move {
            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            let _permit = match semaphore.acquire().await {
                Ok(permit) => permit,
                Err(e) => {
                    crate::log_warn!("SNMP semaphore acquire failed for {}: {}", ip, e);
                    return;
                }
            };

            if is_cancelled(cancel_token.as_ref()) {
                return;
            }

            if let Some(data) = query_host_snmp(ip, port, timeout_dur, &community).await {
                let mut map = results.lock().await;
                map.insert(ip, data);
            }
        });
    }

    while !tasks.is_empty() {
        if is_cancelled(cancel_token.as_ref()) {
            crate::log_warn!("SNMP scan cancelled; aborting in-flight tasks");
            tasks.abort_all();
            break;
        }

        match tokio::time::timeout(std::time::Duration::from_millis(50), tasks.join_next()).await {
            Ok(Some(Err(e))) => {
                if !e.is_cancelled() {
                    crate::log_warn!("SNMP task failed: {}", e);
                }
            }
            Ok(Some(Ok(()))) | Err(_) => {}
            Ok(None) => break,
        }
    }

    let mut map = results.lock().await;
    let enriched_count = map.len();

    crate::log_stderr!(
        "Phase 4 complete: {} hosts responded to SNMP",
        enriched_count
    );

    Ok(std::mem::take(&mut *map))
}
