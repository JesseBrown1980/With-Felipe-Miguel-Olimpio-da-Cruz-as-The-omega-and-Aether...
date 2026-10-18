//! PNG to 8-bit RGB through the `png` crate.

use crate::Error;

/// 8-bit RGB pixels, row-major, three bytes per pixel.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RgbImage {
    pub width: usize,
    pub height: usize,
    pub data: Vec<u8>,
}

impl RgbImage {
    /// `px[x, y]` of a Pillow RGB image; `None` where Pillow raises IndexError.
    pub fn pixel(&self, x: usize, y: usize) -> Option<[u8; 3]> {
        if x >= self.width || y >= self.height {
            return None;
        }
        let i = (y * self.width + x) * 3;
        Some([self.data[i], self.data[i + 1], self.data[i + 2]])
    }
}

fn png_err(e: impl core::fmt::Display) -> Error {
    Error::Png(e.to_string())
}

/// The stored samples of an 8-bit RGB PNG, with no transformation: what Pillow's `Image.open`
/// gives in mode "RGB", where verify-frames.py:49-50 converts nothing. Every other colour type
/// and bit depth is refused, not converted: the ten frames are 8-bit RGB, and Pillow's
/// `convert("RGB")` for the other types is not measured here.
pub fn decode_png(bytes: &[u8]) -> Result<RgbImage, Error> {
    let mut dec = png::Decoder::new(bytes);
    dec.set_transformations(png::Transformations::IDENTITY);
    let mut reader = dec.read_info().map_err(png_err)?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(png_err)?;
    if info.color_type != png::ColorType::Rgb || info.bit_depth != png::BitDepth::Eight {
        return Err(Error::Unsupported(format!(
            "{:?} at {:?}; only 8-bit RGB is read",
            info.color_type, info.bit_depth
        )));
    }
    let width = usize::try_from(info.width).map_err(png_err)?;
    let height = usize::try_from(info.height).map_err(png_err)?;
    let mut data = Vec::with_capacity(width * height * 3);
    for y in 0..height {
        let start = y * info.line_size;
        data.extend_from_slice(&buf[start..start + width * 3]);
    }
    Ok(RgbImage {
        width,
        height,
        data,
    })
}
