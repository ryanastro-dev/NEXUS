use nexus_core::{
    database::queries::lookup_port_warnings,
    insights::{calculate_security_grade, filter_vulnerabilities_by_context},
    ScanResult,
};

use super::super::state::AppState;
use super::db::{get_db_connection, lock_db_connection};

pub(crate) fn enrich_scan_result_security(
    state: &tauri::State<'_, AppState>,
    scan_result: &mut ScanResult,
) {
    let db_conn = match get_db_connection(state) {
        Ok(conn) => conn,
        Err(error) => {
            eprintln!(
                "[WARN] Failed to access database for vulnerability lookup: {}",
                error
            );
            for host in &mut scan_result.active_hosts {
                host.security_grade = calculate_security_grade(host);
            }
            return;
        }
    };

    let conn = match lock_db_connection(&db_conn) {
        Ok(conn) => conn,
        Err(error) => {
            eprintln!(
                "[WARN] Failed to lock database for vulnerability lookup: {}",
                error
            );
            for host in &mut scan_result.active_hosts {
                host.security_grade = calculate_security_grade(host);
            }
            return;
        }
    };

    for host in &mut scan_result.active_hosts {
        let open_ports = host.open_ports.clone();
        let vulnerabilities = if let Some(vendor) = host.vendor.as_deref() {
            filter_vulnerabilities_by_context(&conn, vendor, &host.device_type, &open_ports)
                .unwrap_or_default()
        } else {
            let mut vulns = Vec::new();
            if open_ports.contains(&23) {
                if let Ok(mut telnet) =
                    filter_vulnerabilities_by_context(&conn, "", "Unknown", &[23])
                {
                    vulns.append(&mut telnet);
                }
            }
            if open_ports.contains(&21) {
                if let Ok(mut ftp) = filter_vulnerabilities_by_context(&conn, "", "Unknown", &[21])
                {
                    vulns.append(&mut ftp);
                }
            }
            if open_ports.contains(&80) {
                if let Ok(mut http) = filter_vulnerabilities_by_context(&conn, "", "Unknown", &[80])
                {
                    vulns.append(&mut http);
                }
            }
            vulns
        };

        let port_warnings = if !open_ports.is_empty() {
            lookup_port_warnings(&conn, &open_ports).unwrap_or_default()
        } else {
            Vec::new()
        };

        host.vulnerabilities = vulnerabilities;
        host.port_warnings = port_warnings;
        host.security_grade = calculate_security_grade(host);
    }
}
