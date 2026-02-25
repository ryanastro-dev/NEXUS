use anyhow::Result;
use chrono::Utc;
use std::collections::BTreeMap;

use crate::database::NetworkStats;
use crate::models::{HostInfo, ScanResult};

use super::core::{
    FONT_SIZE_BODY, FONT_SIZE_TITLE, PAGE_BOTTOM_Y_MM, PAGE_MARGIN_X_MM, PAGE_START_Y_MM, add_line,
    build_pdf_bytes, draw_device_table_header, draw_section_header, ensure_space,
};
use super::text::truncate_for_row;

const CHART_BAR_WIDTH: usize = 30;

struct RiskDistribution {
    critical: usize,
    high: usize,
    medium: usize,
    low: usize,
}

fn build_risk_distribution(devices: &[HostInfo]) -> RiskDistribution {
    let mut distribution = RiskDistribution {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    for device in devices {
        match device.risk_score {
            80..=100 => distribution.critical += 1,
            60..=79 => distribution.high += 1,
            40..=59 => distribution.medium += 1,
            _ => distribution.low += 1,
        }
    }

    distribution
}

fn build_chart_line(label: &str, count: usize, total: usize) -> String {
    let filled = if total == 0 {
        0
    } else {
        (((count as f64 / total as f64) * CHART_BAR_WIDTH as f64).round() as usize)
            .min(CHART_BAR_WIDTH)
    };
    let bar = format!(
        "{}{}",
        "#".repeat(filled),
        "-".repeat(CHART_BAR_WIDTH - filled)
    );
    format!("{label:<8} [{bar}] {count:>3}")
}

fn top_device_type_mix(devices: &[HostInfo], limit: usize) -> Vec<(String, usize)> {
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for device in devices {
        *counts
            .entry(device.device_type.as_str().to_string())
            .or_default() += 1;
    }

    let mut pairs: Vec<(String, usize)> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    pairs.into_iter().take(limit).collect()
}

/// Generate a scan report PDF
pub fn generate_scan_report_pdf(
    scan: &ScanResult,
    devices: &[HostInfo],
    stats: Option<&NetworkStats>,
) -> Result<Vec<u8>> {
    let mut pages: Vec<Vec<super::core::TextLine>> = vec![Vec::new()];
    let mut y_pos = PAGE_START_Y_MM;
    let generated_at = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();
    let risk_distribution = build_risk_distribution(devices);
    let vulnerable_hosts = devices
        .iter()
        .filter(|device| !device.vulnerabilities.is_empty() || !device.port_warnings.is_empty())
        .count();
    let secure_grade_hosts = devices
        .iter()
        .filter(|device| matches!(device.security_grade, crate::models::SecurityGrade::A))
        .count();
    let average_latency_ms = {
        let latencies: Vec<u64> = devices
            .iter()
            .filter_map(|device| device.response_time_ms)
            .collect();
        if latencies.is_empty() {
            0.0
        } else {
            latencies.iter().sum::<u64>() as f64 / latencies.len() as f64
        }
    };
    let high_risk_count = devices
        .iter()
        .filter(|device| device.risk_score >= 50)
        .count();
    let low_latency_count = devices
        .iter()
        .filter(|device| device.response_time_ms.unwrap_or(999) < 10)
        .count();

    // Cover page - branded opening suitable for showcase handouts.
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "NEXUS Showcase Report".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_TITLE,
        true,
        15.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "Network Intelligence and Security Summary".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        9.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("Generated: {}", generated_at),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        10.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "Prepared for: Digital Myanmar Forum Showcase".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!(
            "Snapshot: {} hosts in {}",
            scan.active_hosts.len(),
            scan.subnet
        ),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!(
            "Replay Duration: {:.2}s",
            scan.scan_duration_ms as f64 / 1000.0
        ),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        12.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "------------------------------------------------------------".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        10.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Cover Highlights");

    let cover_notes = [
        format!("* High-risk hosts (>=50): {high_risk_count}"),
        format!("* Hosts with known findings: {vulnerable_hosts}"),
        format!("* Grade A secure hosts: {secure_grade_hosts}"),
        format!("* Average observed latency: {:.1} ms", average_latency_ms),
    ];

    for note in cover_notes {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            note,
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    if let Some(stats) = stats {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            format!("* Total known devices: {}", stats.total_devices),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            format!("* New devices detected: {}", stats.new_devices_24h),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    // KPI and chart block on page 2.
    pages.push(Vec::new());
    y_pos = PAGE_START_Y_MM;

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "Executive Snapshot".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_TITLE,
        true,
        14.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "KPI Block");
    let kpi_rows = [
        format!("Total Hosts        : {}", devices.len()),
        format!("High-Risk Hosts    : {}", high_risk_count),
        format!("Known Findings     : {}", vulnerable_hosts),
        format!("Low-Latency Hosts  : {}", low_latency_count),
        format!("Average Latency    : {:.1} ms", average_latency_ms),
    ];
    for row in kpi_rows {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            row,
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Risk Distribution Chart");
    let total = devices.len();
    for (label, count) in [
        ("Critical", risk_distribution.critical),
        ("High", risk_distribution.high),
        ("Medium", risk_distribution.medium),
        ("Low", risk_distribution.low),
    ] {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            build_chart_line(label, count, total),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Device Type Mix");
    for (device_type, count) in top_device_type_mix(devices, 6) {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            build_chart_line(&truncate_for_row(&device_type, 8), count, total),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        " ".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        5.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Executive Summary");

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("* High-risk devices: {}", high_risk_count),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("* Low-latency devices: {}", low_latency_count),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Device Inventory");
    draw_device_table_header(pages.as_mut_slice(), &mut y_pos);

    for device in devices {
        ensure_space(
            &mut pages,
            &mut y_pos,
            PAGE_BOTTOM_Y_MM,
            Some("Device Inventory (continued)"),
        );

        if y_pos >= PAGE_START_Y_MM - 11.0 {
            draw_device_table_header(pages.as_mut_slice(), &mut y_pos);
        }

        let hostname = device.hostname.as_deref().unwrap_or("N/A");
        let row = format!(
            "{} | {} | {} | {}",
            truncate_for_row(&device.ip, 18),
            truncate_for_row(hostname, 22),
            truncate_for_row(device.device_type.as_str(), 20),
            device.risk_score
        );

        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            row,
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            6.0,
        );
    }

    build_pdf_bytes("Network Scan Report", pages)
}
