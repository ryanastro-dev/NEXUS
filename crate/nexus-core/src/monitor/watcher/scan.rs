use std::collections::HashMap;
use std::time::Duration;

use super::super::events::{DeviceSnapshot, NetworkEvent};
use crate::{
    InterfaceInfo, active_arp_scan, calculate_subnet_ips, dns_scan, find_interface_by_name,
    find_valid_interface, infer_device_type, lookup_vendor_info, tcp_probe_scan,
};

const BACKGROUND_ARP_PHASE_TIMEOUT_SECS: u64 = 15;

/// Resolve the interface used for a monitor session.
pub(super) fn resolve_monitor_interface(
    interface_name: Option<&str>,
) -> Result<InterfaceInfo, String> {
    if let Some(name) = interface_name {
        find_interface_by_name(name)
            .map_err(|error| format!("Requested interface '{}' is unavailable: {}", name, error))
    } else {
        find_valid_interface().map_err(|error| format!("Interface error: {}", error))
    }
}

/// Run a background scan and return device snapshots.
pub(super) async fn run_background_scan<F>(
    callback: &F,
    interface: &InterfaceInfo,
) -> Result<Vec<DeviceSnapshot>, String>
where
    F: Fn(NetworkEvent),
{
    callback(NetworkEvent::ScanProgress {
        phase: "INIT".to_string(),
        percent: 5,
        message: format!("Using interface {} ({})", interface.name, interface.ip),
    });

    let (subnet, ips) =
        calculate_subnet_ips(interface).map_err(|error| format!("Subnet error: {}", error))?;

    callback(NetworkEvent::ScanProgress {
        phase: "ARP".to_string(),
        percent: 20,
        message: format!("ARP scanning {} hosts...", ips.len()),
    });

    let arp_scan_handle = {
        let interface_clone = interface.clone();
        let ips_clone = ips.clone();
        let subnet_clone = subnet;

        tokio::task::spawn_blocking(move || {
            active_arp_scan(&interface_clone, &ips_clone, &subnet_clone)
        })
    };

    let arp_hosts = match tokio::time::timeout(
        Duration::from_secs(BACKGROUND_ARP_PHASE_TIMEOUT_SECS),
        arp_scan_handle,
    )
    .await
    {
        Ok(joined) => joined
            .map_err(|error| format!("ARP task error: {}", error))?
            .map_err(|error| format!("ARP scan error: {}", error))?,
        Err(_) => {
            tracing::warn!(
                "[MONITOR] ARP phase exceeded {}s timeout; continuing with empty ARP host set",
                BACKGROUND_ARP_PHASE_TIMEOUT_SECS
            );
            HashMap::new()
        }
    };

    callback(NetworkEvent::ScanProgress {
        phase: "TCP".to_string(),
        percent: 50,
        message: format!("TCP probing {} hosts...", arp_hosts.len()),
    });

    let port_results = tcp_probe_scan(&arp_hosts)
        .await
        .map_err(|error| format!("TCP scan error: {}", error))?;

    callback(NetworkEvent::ScanProgress {
        phase: "DNS".to_string(),
        percent: 80,
        message: "Resolving hostnames...".to_string(),
    });

    let host_ips: Vec<std::net::Ipv4Addr> = arp_hosts
        .keys()
        .filter(|ip| **ip != interface.ip)
        .copied()
        .collect();

    let dns_hostnames = dns_scan(&host_ips).await;

    callback(NetworkEvent::ScanProgress {
        phase: "COMPLETE".to_string(),
        percent: 100,
        message: "Scan complete".to_string(),
    });

    let devices: Vec<DeviceSnapshot> = arp_hosts
        .iter()
        .filter(|(ip, _)| **ip != interface.ip)
        .map(|(ip, mac)| {
            let mac_str = format!("{}", mac);
            let vendor_info = lookup_vendor_info(&mac_str);
            let open_ports = port_results.get(ip).cloned().unwrap_or_default();
            let is_gateway = ip.octets()[3] == 1 || open_ports.contains(&80);

            let device_type = infer_device_type(
                vendor_info.vendor.as_deref(),
                dns_hostnames.get(ip).map(|s| s.as_str()),
                &open_ports,
                is_gateway,
            );

            DeviceSnapshot {
                mac: mac_str,
                ip: ip.to_string(),
                hostname: dns_hostnames.get(ip).cloned(),
                device_type: device_type.as_str().to_string(),
                is_online: true,
            }
        })
        .collect();

    Ok(devices)
}
