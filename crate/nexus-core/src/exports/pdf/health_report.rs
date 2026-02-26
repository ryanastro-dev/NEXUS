use anyhow::Result;
use chrono::Utc;

use crate::insights::SecurityReport;

use super::core::{
    FONT_SIZE_BODY, FONT_SIZE_SUBHEADING, FONT_SIZE_TITLE, PAGE_MARGIN_X_MM, PAGE_START_Y_MM,
    PdfPage, add_line, build_pdf_bytes, draw_section_header, ensure_space,
};
use super::text::wrap_text;

/// Generate a network health PDF report
pub fn generate_network_health_pdf(recommendations: &SecurityReport) -> Result<Vec<u8>> {
    let mut pages: Vec<PdfPage> = vec![Vec::new()];
    let mut y_pos = PAGE_START_Y_MM;

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        "Network Security Report".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_TITLE,
        true,
        15.0,
    );

    let report_date = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("Generated: {}", report_date),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        15.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, &recommendations.summary);
    y_pos -= 5.0;

    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("Critical Issues: {}", recommendations.critical_count),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("High Priority: {}", recommendations.high_count),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        7.0,
    );
    add_line(
        pages.as_mut_slice(),
        &mut y_pos,
        format!("Total Recommendations: {}", recommendations.total_issues),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        false,
        15.0,
    );

    draw_section_header(pages.as_mut_slice(), &mut y_pos, "Security Recommendations");

    for rec in &recommendations.recommendations {
        ensure_space(
            &mut pages,
            &mut y_pos,
            35.0,
            Some("Security Recommendations (continued)"),
        );

        let priority_text = format!("[{}] {}", rec.priority.as_str(), rec.title);
        add_line(
            pages.as_mut_slice(),
            &mut y_pos,
            priority_text,
            PAGE_MARGIN_X_MM,
            FONT_SIZE_SUBHEADING,
            true,
            7.0,
        );

        for line in wrap_text(&rec.description, 88) {
            ensure_space(
                &mut pages,
                &mut y_pos,
                35.0,
                Some("Security Recommendations (continued)"),
            );
            add_line(
                pages.as_mut_slice(),
                &mut y_pos,
                line,
                PAGE_MARGIN_X_MM + 5.0,
                FONT_SIZE_BODY,
                false,
                7.0,
            );
        }

        if !rec.affected_devices.is_empty() {
            let devices_text = if rec.affected_devices.len() <= 3 {
                format!("Affected: {}", rec.affected_devices.join(", "))
            } else {
                format!(
                    "Affected: {} (and {} more)",
                    rec.affected_devices[..3].join(", "),
                    rec.affected_devices.len() - 3
                )
            };

            let wrapped_devices = wrap_text(&devices_text, 88);
            let wrapped_count = wrapped_devices.len();
            for (idx, line) in wrapped_devices.into_iter().enumerate() {
                ensure_space(
                    &mut pages,
                    &mut y_pos,
                    35.0,
                    Some("Security Recommendations (continued)"),
                );
                add_line(
                    pages.as_mut_slice(),
                    &mut y_pos,
                    line,
                    PAGE_MARGIN_X_MM + 5.0,
                    FONT_SIZE_BODY,
                    false,
                    if idx + 1 == wrapped_count { 10.0 } else { 7.0 },
                );
            }
        } else {
            y_pos -= 5.0;
        }
    }

    build_pdf_bytes("Network Health Report", pages)
}
