//! PNG in and out, through the `png` crate.

use crate::Error;

/// 8-bit RGB pixels, row-major, three bytes per pixel.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RgbImage {
    pub width: usize,
    pub height: usize,
    pub data: Vec<u8>,
}

/// 8-bit RGBA pixels, row-major, four bytes per pixel: the layout of the canvas `ImageData`
/// that index.html:10287 hands to `take`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RgbaImage {
    pub width: usize,
    pub height: usize,
    pub data: Vec<u8>,
}

fn png_err(e: impl core::fmt::Display) -> Error {
    Error::Png(e.to_string())
}

/// 8-bit RGB PNG with no colour-space chunks, compression `Best`, filter `Up` on every row,
/// so the same image always gives the same bytes with the locked crate versions.
pub fn encode_png(img: &RgbImage) -> Result<Vec<u8>, Error> {
    let width = u32::try_from(img.width).map_err(png_err)?;
    let height = u32::try_from(img.height).map_err(png_err)?;
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, width, height);
        enc.set_color(png::ColorType::Rgb);
        enc.set_depth(png::BitDepth::Eight);
        enc.set_compression(png::Compression::Best);
        enc.set_filter(png::FilterType::Up);
        enc.set_adaptive_filter(png::AdaptiveFilterType::NonAdaptive);
        let mut writer = enc.write_header().map_err(png_err)?;
        writer.write_image_data(&img.data).map_err(png_err)?;
        writer.finish().map_err(png_err)?;
    }
    Ok(out)
}

/// Decode a PNG to 8-bit RGBA: palette and low bit depths expanded, 16-bit samples reduced to
/// their high byte, grey copied to R, G and B, alpha 255 where the file has none. Stored RGB and
/// alpha are kept as they are, with no colour-space conversion; where alpha is below 255 the
/// page's canvas can hold other RGB (all 0 at alpha 0, measured; README "The Rust reader next
/// to the page").
pub fn decode_png(bytes: &[u8]) -> Result<RgbaImage, Error> {
    let mut dec = png::Decoder::new(bytes);
    dec.set_transformations(png::Transformations::normalize_to_color8());
    let mut reader = dec.read_info().map_err(png_err)?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(png_err)?;
    let width = usize::try_from(info.width).map_err(png_err)?;
    let height = usize::try_from(info.height).map_err(png_err)?;
    let samples = info.color_type.samples();
    let mut data = Vec::with_capacity(width * height * 4);
    for y in 0..height {
        let row = &buf[y * info.line_size..y * info.line_size + width * samples];
        for px in row.chunks_exact(samples) {
            let rgba = match info.color_type {
                png::ColorType::Grayscale => [px[0], px[0], px[0], 255],
                png::ColorType::GrayscaleAlpha => [px[0], px[0], px[0], px[1]],
                png::ColorType::Rgb => [px[0], px[1], px[2], 255],
                png::ColorType::Rgba => [px[0], px[1], px[2], px[3]],
                png::ColorType::Indexed => {
                    return Err(Error::Png("indexed colour left after expansion".into()))
                }
            };
            data.extend_from_slice(&rgba);
        }
    }
    Ok(RgbaImage {
        width,
        height,
        data,
    })
}
