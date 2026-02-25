use std::time::Instant;

use nexus_core::{guess_os_from_ttl, lookup_vendor_info};

use super::CommandResult;

/// Ping result with latency and TTL information.
#[derive(serde::Serialize)]
pub struct PingResult {
    success: bool,
    latency_ms: Option<f64>,
    ttl: Option<u8>,
    os_guess: Option<String>,
    error: Option<String>,
}

/// Ping a single host.
#[tauri::command]
pub async fn ping_host(target: String, count: u32) -> CommandResult<Vec<PingResult>> {
    use std::net::{IpAddr, ToSocketAddrs};
    use std::time::Duration;

    use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};

    let ip = if let Ok(addr) = target.parse::<IpAddr>() {
        addr
    } else {
        let addr_str = format!("{}:0", target);
        match addr_str.to_socket_addrs() {
            Ok(mut addrs) => {
                if let Some(socket_addr) = addrs.next() {
                    socket_addr.ip()
                } else {
                    return Err("Could not resolve hostname".into());
                }
            }
            Err(_) => return Err("Invalid IP address or hostname".into()),
        }
    };

    let config = Config::default();
    let client =
        Client::new(&config).map_err(|e| format!("Failed to create ICMP client: {}", e))?;

    let mut results = Vec::new();
    let payload = [0u8; 56];

    for i in 0..count {
        let start = Instant::now();

        let mut pinger = client.pinger(ip, PingIdentifier(1234)).await;
        match tokio::time::timeout(
            Duration::from_secs(2),
            pinger
                .timeout(Duration::from_secs(2))
                .ping(PingSequence(i as u16), &payload),
        )
        .await
        {
            Ok(Ok((packet, _rtt))) => {
                let latency = start.elapsed().as_secs_f64() * 1000.0;
                let ttl = match packet {
                    IcmpPacket::V4(p) => p.get_ttl(),
                    IcmpPacket::V6(_) => None,
                };
                let os_guess = ttl.map(guess_os_from_ttl);

                results.push(PingResult {
                    success: true,
                    latency_ms: Some(latency),
                    ttl,
                    os_guess,
                    error: None,
                });
            }
            Ok(Err(e)) => {
                results.push(PingResult {
                    success: false,
                    latency_ms: None,
                    ttl: None,
                    os_guess: None,
                    error: Some(format!("Ping failed: {}", e)),
                });
            }
            Err(_) => {
                results.push(PingResult {
                    success: false,
                    latency_ms: None,
                    ttl: None,
                    os_guess: None,
                    error: Some("Request timed out".to_string()),
                });
            }
        }

        if i < count - 1 {
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }

    Ok(results)
}

/// Port scan result.
#[derive(serde::Serialize)]
pub struct PortScanResult {
    port: u16,
    is_open: bool,
    service: Option<String>,
}

/// Scan ports on a target host.
#[tauri::command]
pub async fn scan_ports(target: String, ports: Vec<u16>) -> CommandResult<Vec<PortScanResult>> {
    use std::net::{IpAddr, ToSocketAddrs};
    use std::time::Duration;

    use tokio::time::timeout;

    let ip = if let Ok(addr) = target.parse::<IpAddr>() {
        addr
    } else {
        let addr_str = format!("{}:0", target);
        match addr_str.to_socket_addrs() {
            Ok(mut addrs) => {
                if let Some(socket_addr) = addrs.next() {
                    socket_addr.ip()
                } else {
                    return Err("Could not resolve hostname".into());
                }
            }
            Err(_) => return Err("Invalid IP address or hostname".into()),
        }
    };

    let mut results = Vec::new();

    for port in ports {
        let addr = std::net::SocketAddr::new(ip, port);
        let is_open = matches!(
            timeout(Duration::from_secs(2), tokio::net::TcpStream::connect(addr)).await,
            Ok(Ok(_))
        );

        let service = if is_open {
            Some(get_service_name(port))
        } else {
            None
        };

        results.push(PortScanResult {
            port,
            is_open,
            service,
        });
    }

    Ok(results)
}

fn get_service_name(port: u16) -> String {
    match port {
        20 => "FTP Data".to_string(),
        21 => "FTP".to_string(),
        22 => "SSH".to_string(),
        23 => "Telnet".to_string(),
        25 => "SMTP".to_string(),
        53 => "DNS".to_string(),
        80 => "HTTP".to_string(),
        110 => "POP3".to_string(),
        143 => "IMAP".to_string(),
        443 => "HTTPS".to_string(),
        445 => "SMB".to_string(),
        3306 => "MySQL".to_string(),
        3389 => "RDP".to_string(),
        5432 => "PostgreSQL".to_string(),
        8080 => "HTTP Alt".to_string(),
        _ => "Unknown".to_string(),
    }
}

/// MAC vendor lookup result.
#[derive(serde::Serialize)]
pub struct VendorLookupResult {
    mac: String,
    vendor: Option<String>,
    is_randomized: bool,
}

/// Look up vendor for a MAC address.
#[tauri::command]
pub fn lookup_mac_vendor(mac: String) -> CommandResult<VendorLookupResult> {
    let vendor_info = lookup_vendor_info(&mac);

    Ok(VendorLookupResult {
        mac: mac.clone(),
        vendor: vendor_info.vendor,
        is_randomized: vendor_info.is_randomized,
    })
}
