use anyhow::Result;
use chrono::Utc;
use std::collections::BTreeMap;

use crate::database::NetworkStats;
use crate::models::{HostInfo, ScanResult};

use super::core::{
    FONT_SIZE_BODY, FONT_SIZE_TITLE, PAGE_BOTTOM_Y_MM, PAGE_MARGIN_X_MM, PAGE_START_Y_MM,
    PAGE_WIDTH_MM, PdfPage, RgbColor, add_filled_rect, add_line, add_line_shape,
    add_line_with_color, add_rect_outline, build_pdf_bytes, draw_device_table_header,
    draw_section_header, ensure_space,
};
use super::text::truncate_for_row;

const CHART_BAR_WIDTH_MM: f32 = 86.0;

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

fn write_absolute_text(
    pages: &mut [PdfPage],
    x_mm: f32,
    y_mm: f32,
    text: String,
    size_pt: f32,
    bold: bool,
    color: Option<RgbColor>,
) {
    let mut cursor = y_mm;
    add_line_with_color(pages, &mut cursor, text, x_mm, size_pt, bold, 0.0, color);
}

fn draw_kpi_badge(
    pages: &mut [PdfPage],
    x_mm: f32,
    y_mm: f32,
    label: &str,
    value: usize,
    accent: RgbColor,
) {
    add_filled_rect(pages, x_mm, y_mm, 40.0, 15.0, accent, 0.12);
    add_rect_outline(pages, x_mm, y_mm, 40.0, 15.0, accent, 0.22, 0.9);

    write_absolute_text(
        pages,
        x_mm + 2.0,
        y_mm + 10.0,
        label.to_string(),
        8.4,
        true,
        Some(accent),
    );
    write_absolute_text(
        pages,
        x_mm + 2.0,
        y_mm + 4.0,
        format!("{value} hosts"),
        FONT_SIZE_BODY,
        false,
        Some(RgbColor::new(30, 41, 59)),
    );
}

fn draw_bar_row(
    pages: &mut [PdfPage],
    y_pos: &mut f32,
    label: &str,
    count: usize,
    total: usize,
    color: RgbColor,
) {
    let bar_x = PAGE_MARGIN_X_MM + 62.0;
    let bar_y = *y_pos - 3.0;
    let ratio = if total == 0 {
        0.0
    } else {
        (count as f32 / total as f32).clamp(0.0, 1.0)
    };
    let fill_width = CHART_BAR_WIDTH_MM * ratio;

    add_line(
        pages,
        y_pos,
        format!("{label:<12} {count:>3}"),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        8.0,
    );
    add_filled_rect(
        pages,
        bar_x,
        bar_y,
        CHART_BAR_WIDTH_MM,
        4.0,
        RgbColor::new(226, 232, 240),
        1.0,
    );
    if fill_width > 0.0 {
        add_filled_rect(pages, bar_x, bar_y, fill_width, 4.0, color, 1.0);
    }
    add_rect_outline(
        pages,
        bar_x,
        bar_y,
        CHART_BAR_WIDTH_MM,
        4.0,
        RgbColor::new(148, 163, 184),
        0.12,
        1.0,
    );
}

fn draw_cover_banner(pages: &mut [PdfPage], generated_at: &str) {
    let banner_x = PAGE_MARGIN_X_MM - 2.0;
    let banner_y = 250.0;
    let banner_width = PAGE_WIDTH_MM - (PAGE_MARGIN_X_MM * 2.0) + 4.0;

    add_filled_rect(
        pages,
        banner_x,
        banner_y,
        banner_width,
        24.0,
        RgbColor::new(30, 64, 175),
        0.98,
    );
    add_rect_outline(
        pages,
        banner_x,
        banner_y,
        banner_width,
        24.0,
        RgbColor::new(191, 219, 254),
        0.25,
        0.6,
    );

    write_absolute_text(
        pages,
        PAGE_MARGIN_X_MM + 1.5,
        266.0,
        "NEXUS Showcase Report".to_string(),
        FONT_SIZE_TITLE,
        true,
        Some(RgbColor::new(248, 250, 252)),
    );
    write_absolute_text(
        pages,
        PAGE_MARGIN_X_MM + 1.5,
        257.0,
        "Network Intelligence and Security Summary".to_string(),
        FONT_SIZE_BODY,
        false,
        Some(RgbColor::new(224, 242, 254)),
    );
    write_absolute_text(
        pages,
        PAGE_MARGIN_X_MM + 1.5,
        252.5,
        format!("Generated: {generated_at}"),
        FONT_SIZE_BODY,
        false,
        Some(RgbColor::new(219, 234, 254)),
    );
}

/// Generate a scan report PDF
pub fn generate_scan_report_pdf(
    scan: &ScanResult,
    devices: &[HostInfo],
    stats: Option<&NetworkStats>,
) -> Result<Vec<u8>> {
    let mut pages: Vec<PdfPage> = vec![Vec::new()];
    let mut y_pos: f32;
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

    draw_cover_banner(pages.as_mut_slice(), &generated_at);
    y_pos = 240.0;

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
        8.0,
    );

    add_line_shape(
        pages.as_mut_slice(),
        PAGE_MARGIN_X_MM,
        y_pos + 2.0,
        PAGE_WIDTH_MM - PAGE_MARGIN_X_MM,
        y_pos + 2.0,
        RgbColor::new(191, 219, 254),
        0.25,
        1.0,
    );
    y_pos -= 3.0;

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Cover Highlights");

    let cover_notes = [
        format!("High-risk hosts (>=50): {high_risk_count}"),
        format!("Hosts with known findings: {vulnerable_hosts}"),
        format!("Grade A secure hosts: {secure_grade_hosts}"),
        format!("Average observed latency: {:.1} ms", average_latency_ms),
    ];

    for note in cover_notes {
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            format!("• {note}"),
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
            format!("• Total known devices: {}", stats.total_devices),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            format!("• New devices detected: {}", stats.new_devices_24h),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_BODY,
            false,
            7.0,
        );
    }

    // KPI and chart block on page 2.
    pages.push(Vec::new());
    y_pos = PAGE_START_Y_MM;

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "KPI Snapshot");

    // Keep enough vertical gap so header text and first KPI row don't collide.
    let kpi_y = y_pos - 8.0;
    draw_kpi_badge(
        pages.as_mut_slice(),
        PAGE_MARGIN_X_MM,
        kpi_y,
        "Critical",
        risk_distribution.critical,
        RgbColor::new(220, 38, 38),
    );
    draw_kpi_badge(
        pages.as_mut_slice(),
        PAGE_MARGIN_X_MM + 44.0,
        kpi_y,
        "High",
        risk_distribution.high,
        RgbColor::new(234, 88, 12),
    );
    draw_kpi_badge(
        pages.as_mut_slice(),
        PAGE_MARGIN_X_MM + 88.0,
        kpi_y,
        "Medium",
        risk_distribution.medium,
        RgbColor::new(202, 138, 4),
    );
    draw_kpi_badge(
        pages.as_mut_slice(),
        PAGE_MARGIN_X_MM + 132.0,
        kpi_y,
        "Low",
        risk_distribution.low,
        RgbColor::new(22, 163, 74),
    );
    y_pos = kpi_y - 18.0;

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
    for (label, count, color) in [
        (
            "Critical",
            risk_distribution.critical,
            RgbColor::new(220, 38, 38),
        ),
        ("High", risk_distribution.high, RgbColor::new(234, 88, 12)),
        (
            "Medium",
            risk_distribution.medium,
            RgbColor::new(202, 138, 4),
        ),
        ("Low", risk_distribution.low, RgbColor::new(22, 163, 74)),
    ] {
        ensure_space(
            &mut pages,
            &mut y_pos,
            PAGE_BOTTOM_Y_MM + 20.0,
            Some("Risk Distribution Chart (continued)"),
        );
        draw_bar_row(pages.as_mut_slice(), &mut y_pos, label, count, total, color);
    }

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Device Type Mix");
    for (device_type, count) in top_device_type_mix(devices, 6) {
        ensure_space(
            &mut pages,
            &mut y_pos,
            PAGE_BOTTOM_Y_MM + 20.0,
            Some("Device Type Mix (continued)"),
        );
        draw_bar_row(
            pages.as_mut_slice(),
            &mut y_pos,
            &truncate_for_row(&device_type, 12),
            count,
            total,
            RgbColor::new(59, 130, 246),
        );
    }

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Executive Summary");
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("• High-risk devices: {}", high_risk_count),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("• Low-latency devices: {}", low_latency_count),
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
            "{:<18} {:<22} {:<20} {:>4}",
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
        add_line_shape(
            pages.as_mut_slice(),
            PAGE_MARGIN_X_MM,
            y_pos + 1.3,
            PAGE_WIDTH_MM - PAGE_MARGIN_X_MM,
            y_pos + 1.3,
            RgbColor::new(226, 232, 240),
            0.12,
            1.0,
        );
    }

    build_pdf_bytes("Network Scan Report", pages)
}
