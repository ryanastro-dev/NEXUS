use anyhow::{Result, anyhow};
use krilla::Document;
use krilla::color::rgb;
use krilla::geom::{PathBuilder, Point, Rect, Size, Transform};
use krilla::image::Image;
use krilla::num::NormalizedF32;
use krilla::page::PageSettings;
use krilla::paint::{Fill, FillRule, Stroke};
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
const COVER_LOGO_PNG: &[u8] = include_bytes!("../../../../../apps/nexus-gui/public/icon.png");
const COVER_LOGO_WIDTH_MM: f32 = 17.2;
const COVER_LOGO_TOP_MM: f32 = 253.5;
const COVER_LOGO_RIGHT_PADDING_MM: f32 = 2.0;

#[derive(Clone, Copy)]
pub(super) struct RgbColor {
    pub(super) red: u8,
    pub(super) green: u8,
    pub(super) blue: u8,
}

impl RgbColor {
    pub(super) const fn new(red: u8, green: u8, blue: u8) -> Self {
        Self { red, green, blue }
    }
}

#[derive(Clone)]
pub(super) struct TextLine {
    pub(super) text: String,
    pub(super) x_mm: f32,
    pub(super) y_mm: f32,
    pub(super) size_pt: f32,
    pub(super) bold: bool,
    pub(super) color: Option<RgbColor>,
}

#[derive(Clone)]
pub(super) struct RectShape {
    pub(super) x_mm: f32,
    pub(super) y_mm: f32,
    pub(super) width_mm: f32,
    pub(super) height_mm: f32,
    pub(super) fill_color: Option<RgbColor>,
    pub(super) fill_opacity: f32,
    pub(super) stroke_color: Option<RgbColor>,
    pub(super) stroke_width_mm: f32,
    pub(super) stroke_opacity: f32,
}

#[derive(Clone)]
pub(super) struct LineShape {
    pub(super) x1_mm: f32,
    pub(super) y1_mm: f32,
    pub(super) x2_mm: f32,
    pub(super) y2_mm: f32,
    pub(super) color: RgbColor,
    pub(super) width_mm: f32,
    pub(super) opacity: f32,
}

#[derive(Clone)]
pub(super) enum DrawCommand {
    Text(TextLine),
    Rect(RectShape),
    Line(LineShape),
}

pub(super) type PdfPage = Vec<DrawCommand>;

fn mm_to_pt(mm: f32) -> f32 {
    mm * 72.0 / 25.4
}

fn y_report_to_page_pt(y_mm: f32) -> f32 {
    mm_to_pt(PAGE_HEIGHT_MM - y_mm)
}

fn rect_y_report_to_page_pt(y_mm: f32, height_mm: f32) -> f32 {
    mm_to_pt(PAGE_HEIGHT_MM - y_mm - height_mm)
}

fn to_opacity(opacity: f32) -> NormalizedF32 {
    NormalizedF32::new(opacity.clamp(0.0, 1.0)).unwrap_or(NormalizedF32::ONE)
}

fn color_to_paint(color: RgbColor) -> krilla::paint::Paint {
    rgb::Color::new(color.red, color.green, color.blue).into()
}

fn new_page(pages: &mut Vec<PdfPage>) {
    pages.push(Vec::new());
}

fn current_page_mut(pages: &mut [PdfPage]) -> &mut PdfPage {
    let idx = pages.len().saturating_sub(1);
    &mut pages[idx]
}

pub(super) fn ensure_space(
    pages: &mut Vec<PdfPage>,
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
    pages: &mut [PdfPage],
    y_pos: &mut f32,
    text: String,
    x_mm: f32,
    size_pt: f32,
    bold: bool,
    y_step_mm: f32,
) {
    add_line_with_color(pages, y_pos, text, x_mm, size_pt, bold, y_step_mm, None);
}

#[allow(clippy::too_many_arguments)]
pub(super) fn add_line_with_color(
    pages: &mut [PdfPage],
    y_pos: &mut f32,
    text: String,
    x_mm: f32,
    size_pt: f32,
    bold: bool,
    y_step_mm: f32,
    color: Option<RgbColor>,
) {
    current_page_mut(pages).push(DrawCommand::Text(TextLine {
        text,
        x_mm,
        y_mm: *y_pos,
        size_pt,
        bold,
        color,
    }));
    *y_pos -= y_step_mm;
}

pub(super) fn add_filled_rect(
    pages: &mut [PdfPage],
    x_mm: f32,
    y_mm: f32,
    width_mm: f32,
    height_mm: f32,
    color: RgbColor,
    opacity: f32,
) {
    current_page_mut(pages).push(DrawCommand::Rect(RectShape {
        x_mm,
        y_mm,
        width_mm,
        height_mm,
        fill_color: Some(color),
        fill_opacity: opacity,
        stroke_color: None,
        stroke_width_mm: 0.0,
        stroke_opacity: 0.0,
    }));
}

#[allow(clippy::too_many_arguments)]
pub(super) fn add_rect_outline(
    pages: &mut [PdfPage],
    x_mm: f32,
    y_mm: f32,
    width_mm: f32,
    height_mm: f32,
    color: RgbColor,
    stroke_width_mm: f32,
    opacity: f32,
) {
    current_page_mut(pages).push(DrawCommand::Rect(RectShape {
        x_mm,
        y_mm,
        width_mm,
        height_mm,
        fill_color: None,
        fill_opacity: 0.0,
        stroke_color: Some(color),
        stroke_width_mm,
        stroke_opacity: opacity,
    }));
}

#[allow(clippy::too_many_arguments)]
pub(super) fn add_line_shape(
    pages: &mut [PdfPage],
    x1_mm: f32,
    y1_mm: f32,
    x2_mm: f32,
    y2_mm: f32,
    color: RgbColor,
    width_mm: f32,
    opacity: f32,
) {
    current_page_mut(pages).push(DrawCommand::Line(LineShape {
        x1_mm,
        y1_mm,
        x2_mm,
        y2_mm,
        color,
        width_mm,
        opacity,
    }));
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

fn draw_rect(surface: &mut krilla::surface::Surface<'_>, rect: &RectShape) {
    if rect.width_mm <= 0.0 || rect.height_mm <= 0.0 {
        return;
    }

    let mut builder = PathBuilder::new();
    let Some(geometry_rect) = Rect::from_xywh(
        mm_to_pt(rect.x_mm),
        rect_y_report_to_page_pt(rect.y_mm, rect.height_mm),
        mm_to_pt(rect.width_mm),
        mm_to_pt(rect.height_mm),
    ) else {
        return;
    };
    builder.push_rect(geometry_rect);
    let Some(path) = builder.finish() else {
        return;
    };

    match rect.fill_color {
        Some(color) => surface.set_fill(Some(Fill {
            paint: color_to_paint(color),
            opacity: to_opacity(rect.fill_opacity),
            rule: FillRule::default(),
        })),
        None => surface.set_fill(None),
    };

    match rect.stroke_color {
        Some(color) => {
            let mut stroke = Stroke {
                paint: color_to_paint(color),
                width: mm_to_pt(rect.stroke_width_mm.max(0.1)),
                opacity: to_opacity(rect.stroke_opacity),
                ..Default::default()
            };
            if rect.stroke_width_mm <= 0.0 {
                stroke.width = mm_to_pt(0.2);
            }
            surface.set_stroke(Some(stroke));
        }
        None => surface.set_stroke(None),
    };

    surface.draw_path(&path);
    surface.set_fill(None);
    surface.set_stroke(None);
}

fn draw_line(surface: &mut krilla::surface::Surface<'_>, line: &LineShape) {
    let mut builder = PathBuilder::new();
    builder.move_to(mm_to_pt(line.x1_mm), y_report_to_page_pt(line.y1_mm));
    builder.line_to(mm_to_pt(line.x2_mm), y_report_to_page_pt(line.y2_mm));
    let Some(path) = builder.finish() else {
        return;
    };

    surface.set_fill(None);
    surface.set_stroke(Some(Stroke {
        paint: color_to_paint(line.color),
        width: mm_to_pt(line.width_mm.max(0.1)),
        opacity: to_opacity(line.opacity),
        ..Default::default()
    }));
    surface.draw_path(&path);
    surface.set_stroke(None);
}

fn draw_page_footer(
    surface: &mut krilla::surface::Surface<'_>,
    regular_font: &Font,
    page_number: usize,
    total_pages: usize,
) {
    let mut footer_builder = PathBuilder::new();
    footer_builder.move_to(mm_to_pt(PAGE_MARGIN_X_MM), y_report_to_page_pt(16.0));
    footer_builder.line_to(
        mm_to_pt(PAGE_WIDTH_MM - PAGE_MARGIN_X_MM),
        y_report_to_page_pt(16.0),
    );
    if let Some(path) = footer_builder.finish() {
        surface.set_fill(None);
        surface.set_stroke(Some(Stroke {
            paint: color_to_paint(RgbColor::new(189, 195, 199)),
            width: mm_to_pt(0.25),
            opacity: to_opacity(0.9),
            ..Default::default()
        }));
        surface.draw_path(&path);
        surface.set_stroke(None);
    }

    surface.set_fill(Some(Fill {
        paint: color_to_paint(RgbColor::new(99, 115, 129)),
        opacity: NormalizedF32::ONE,
        rule: FillRule::default(),
    }));
    let footer_text = format!(
        "NEXUS | Confidential | Page {}/{}",
        page_number, total_pages
    );
    surface.draw_text(
        Point::from_xy(mm_to_pt(PAGE_MARGIN_X_MM), y_report_to_page_pt(10.0)),
        regular_font.clone(),
        8.0,
        &footer_text,
        false,
        TextDirection::Auto,
    );
    surface.set_fill(None);
}

fn draw_cover_logo(surface: &mut krilla::surface::Surface<'_>) {
    let Ok(image) = Image::from_png(COVER_LOGO_PNG.to_vec().into(), true) else {
        return;
    };

    let (width_px, height_px) = image.size();
    if width_px == 0 || height_px == 0 {
        return;
    }

    let target_width_mm = COVER_LOGO_WIDTH_MM;
    let aspect_ratio = height_px as f32 / width_px as f32;
    let target_height_mm = (target_width_mm * aspect_ratio).clamp(10.0, 18.0);

    let Some(target_size) = Size::from_wh(mm_to_pt(target_width_mm), mm_to_pt(target_height_mm))
    else {
        return;
    };

    let origin_x_mm =
        PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - target_width_mm - COVER_LOGO_RIGHT_PADDING_MM;
    let origin_y_mm = COVER_LOGO_TOP_MM;
    surface.push_transform(&Transform::from_translate(
        mm_to_pt(origin_x_mm),
        rect_y_report_to_page_pt(origin_y_mm, target_height_mm),
    ));
    surface.draw_image(image, target_size);
    surface.pop();
}

pub(super) fn build_pdf_bytes(_title: &str, pages: Vec<PdfPage>) -> Result<Vec<u8>> {
    let (regular_font, bold_font) = load_report_fonts()?;
    let mut doc = Document::new();
    let page_settings = PageSettings::from_wh(mm_to_pt(PAGE_WIDTH_MM), mm_to_pt(PAGE_HEIGHT_MM))
        .ok_or_else(|| anyhow!("Invalid PDF page size"))?;
    let total_pages = pages.len();

    for (index, commands) in pages.into_iter().enumerate() {
        let mut page = doc.start_page_with(page_settings.clone());
        let mut surface = page.surface();

        for command in commands {
            match command {
                DrawCommand::Text(line) => {
                    let font = if line.bold {
                        bold_font.clone()
                    } else {
                        regular_font.clone()
                    };

                    if let Some(color) = line.color {
                        surface.set_fill(Some(Fill {
                            paint: color_to_paint(color),
                            opacity: NormalizedF32::ONE,
                            rule: FillRule::default(),
                        }));
                        surface.set_stroke(None);
                    } else {
                        surface.set_fill(None);
                        surface.set_stroke(None);
                    }

                    surface.draw_text(
                        Point::from_xy(mm_to_pt(line.x_mm), y_report_to_page_pt(line.y_mm)),
                        font,
                        line.size_pt,
                        &line.text,
                        false,
                        TextDirection::Auto,
                    );

                    if line.color.is_some() {
                        surface.set_fill(None);
                    }
                }
                DrawCommand::Rect(rect) => draw_rect(&mut surface, &rect),
                DrawCommand::Line(line) => draw_line(&mut surface, &line),
            }
        }

        // Draw logo after page content so cover banner/background doesn't hide it.
        if index == 0 {
            draw_cover_logo(&mut surface);
        }

        draw_page_footer(&mut surface, &regular_font, index + 1, total_pages);
        surface.finish();
        page.finish();
    }

    doc.finish()
        .map_err(|e| anyhow!("Failed to serialize PDF document: {:?}", e))
}

pub(super) fn draw_section_header(pages: &mut [PdfPage], y_pos: &mut f32, title: &str) {
    let bar_y = *y_pos - 3.0;
    add_filled_rect(
        pages,
        PAGE_MARGIN_X_MM - 1.0,
        bar_y,
        PAGE_WIDTH_MM - (PAGE_MARGIN_X_MM * 2.0) + 2.0,
        8.0,
        RgbColor::new(235, 243, 255),
        1.0,
    );
    add_rect_outline(
        pages,
        PAGE_MARGIN_X_MM - 1.0,
        bar_y,
        PAGE_WIDTH_MM - (PAGE_MARGIN_X_MM * 2.0) + 2.0,
        8.0,
        RgbColor::new(186, 210, 240),
        0.2,
        1.0,
    );
    add_line_with_color(
        pages,
        y_pos,
        title.to_string(),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_HEADING,
        true,
        10.0,
        Some(RgbColor::new(26, 58, 124)),
    );
}

pub(super) fn draw_device_table_header(pages: &mut [PdfPage], y_pos: &mut f32) {
    let header_y = *y_pos;
    add_filled_rect(
        pages,
        PAGE_MARGIN_X_MM - 1.0,
        header_y - 2.5,
        PAGE_WIDTH_MM - (PAGE_MARGIN_X_MM * 2.0) + 2.0,
        7.5,
        RgbColor::new(241, 245, 249),
        1.0,
    );
    add_rect_outline(
        pages,
        PAGE_MARGIN_X_MM - 1.0,
        header_y - 2.5,
        PAGE_WIDTH_MM - (PAGE_MARGIN_X_MM * 2.0) + 2.0,
        7.5,
        RgbColor::new(203, 213, 225),
        0.2,
        1.0,
    );
    add_line(
        pages,
        y_pos,
        format!(
            "{:<18} {:<22} {:<20} {:>4}",
            "IP Address", "Hostname", "Device Type", "Risk"
        ),
        PAGE_MARGIN_X_MM,
        FONT_SIZE_BODY,
        true,
        8.0,
    );
    add_line_shape(
        pages,
        PAGE_MARGIN_X_MM,
        *y_pos + 1.5,
        PAGE_WIDTH_MM - PAGE_MARGIN_X_MM,
        *y_pos + 1.5,
        RgbColor::new(203, 213, 225),
        0.15,
        1.0,
    );
}
