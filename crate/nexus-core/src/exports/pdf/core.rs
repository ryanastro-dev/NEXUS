use anyhow::{Result, anyhow};
use krilla::Document;
use krilla::geom::Point;
use krilla::page::PageSettings;
use krilla::text::{Font, TextDirection};
use std::path::PathBuf;

pub(super) const FONT_SIZE_TITLE: f32 = 24.0;
pub(super) const FONT_SIZE_HEADING: f32 = 16.0;
pub(super) const FONT_SIZE_SUBHEADING: f32 = 12.0;
pub(super) const FONT_SIZE_BODY: f32 = 10.0;
pub(super) const PAGE_WIDTH_MM: f32 = 210.0;
pub(super) const PAGE_HEIGHT_MM: f32 = 297.0;
pub(super) const PAGE_START_Y_MM: f32 = 270.0;
pub(super) const PAGE_BOTTOM_Y_MM: f32 = 20.0;
pub(super) const PAGE_MARGIN_X_MM: f32 = 20.0;

#[derive(Clone)]
pub(super) struct TextLine {
    pub(super) text: String,
    pub(super) x_mm: f32,
    pub(super) y_mm: f32,
    pub(super) size_pt: f32,
    pub(super) bold: bool,
}

fn mm_to_pt(mm: f32) -> f32 {
    mm * 72.0 / 25.4
}

fn new_page(pages: &mut Vec<Vec<TextLine>>) {
    pages.push(Vec::new());
}

fn current_page_mut(pages: &mut [Vec<TextLine>]) -> &mut Vec<TextLine> {
    let idx = pages.len().saturating_sub(1);
    &mut pages[idx]
}

pub(super) fn ensure_space(
    pages: &mut Vec<Vec<TextLine>>,
    y_pos: &mut f32,
    min_y: f32,
    continuation_title: Option<&str>,
) {
    if *y_pos >= min_y {
        return;
    }

    new_page(pages);
    *y_pos = PAGE_START_Y_MM;

    if let Some(title) = continuation_title {
        add_line(
            pages.as_mut_slice(),
            y_pos,
            title.to_string(),
            PAGE_MARGIN_X_MM,
            FONT_SIZE_HEADING,
            true,
            10.0,
        );
    }
}

pub(super) fn add_line(
    pages: &mut [Vec<TextLine>],
    y_pos: &mut f32,
    text: String,
    x_mm: f32,
    size_pt: f32,
    bold: bool,
    y_step_mm: f32,
) {
    current_page_mut(pages).push(TextLine {
        text,
        x_mm,
        y_mm: *y_pos,
        size_pt,
        bold,
    });
    *y_pos -= y_step_mm;
}

fn font_candidate_paths() -> (Vec<PathBuf>, Vec<PathBuf>) {
    let mut regular = Vec::new();
    let mut bold = Vec::new();

    if cfg!(target_os = "windows") {
        let windir = std::env::var_os("WINDIR")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
        let fonts = windir.join("Fonts");
        regular.push(fonts.join("arial.ttf"));
        regular.push(fonts.join("segoeui.ttf"));
        regular.push(fonts.join("calibri.ttf"));
        bold.push(fonts.join("arialbd.ttf"));
        bold.push(fonts.join("segoeuib.ttf"));
        bold.push(fonts.join("calibrib.ttf"));
    } else if cfg!(target_os = "macos") {
        regular.push(PathBuf::from(
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ));
        regular.push(PathBuf::from(
            "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        ));
        regular.push(PathBuf::from("/Library/Fonts/Arial.ttf"));
        bold.push(PathBuf::from(
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ));
        bold.push(PathBuf::from(
            "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf",
        ));
        bold.push(PathBuf::from("/Library/Fonts/Arial Bold.ttf"));
    } else {
        regular.push(PathBuf::from(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ));
        regular.push(PathBuf::from(
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ));
        regular.push(PathBuf::from(
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        ));
        bold.push(PathBuf::from(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ));
        bold.push(PathBuf::from(
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ));
        bold.push(PathBuf::from(
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        ));
    }

    (regular, bold)
}

fn load_font(paths: &[PathBuf]) -> Option<Font> {
    for path in paths {
        if let Ok(bytes) = std::fs::read(path)
            && let Some(font) = Font::new(bytes.into(), 0)
        {
            return Some(font);
        }
    }
    None
}

fn load_report_fonts() -> Result<(Font, Font)> {
    let (regular_paths, bold_paths) = font_candidate_paths();
    let regular = load_font(&regular_paths).ok_or_else(|| {
        anyhow!(
            "No compatible system font found for PDF export. Tried: {}",
            regular_paths
                .iter()
                .map(|p| p.display().to_string())
                .collect::<Vec<_>>()
                .join(", ")
        )
    })?;

    let bold = load_font(&bold_paths).unwrap_or_else(|| regular.clone());
    Ok((regular, bold))
}

pub(super) fn build_pdf_bytes(_title: &str, pages: Vec<Vec<TextLine>>) -> Result<Vec<u8>> {
    let (regular_font, bold_font) = load_report_fonts()?;
    let mut doc = Document::new();
    let page_settings = PageSettings::from_wh(mm_to_pt(PAGE_WIDTH_MM), mm_to_pt(PAGE_HEIGHT_MM))
        .ok_or_else(|| anyhow!("Invalid PDF page size"))?;

    for lines in pages {
        let mut page = doc.start_page_with(page_settings.clone());
        let mut surface = page.surface();

        for line in lines {
            let font = if line.bold {
                bold_font.clone()
            } else {
                regular_font.clone()
            };
            surface.draw_text(
                Point::from_xy(mm_to_pt(line.x_mm), mm_to_pt(line.y_mm)),
                font,
                line.size_pt,
                &line.text,
                false,
                TextDirection::Auto,
            );
        }

        surface.finish();
        page.finish();
    }

    doc.finish()
        .map_err(|e| anyhow!("Failed to serialize PDF document: {:?}", e))
}

pub(super) fn draw_section_header(pages: &mut [Vec<TextLine>], y_pos: &mut f32, title: &str) {
    add_line(
        pages,
        y_pos,
        title.to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_HEADING,
        true,
        10.0,
    );
}

pub(super) fn draw_device_table_header(pages: &mut [Vec<TextLine>], y_pos: &mut f32) {
    add_line(
        pages,
        y_pos,
        "IP Address | Hostname | Device Type | Risk Score".to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        true,
        8.0,
    );
}
