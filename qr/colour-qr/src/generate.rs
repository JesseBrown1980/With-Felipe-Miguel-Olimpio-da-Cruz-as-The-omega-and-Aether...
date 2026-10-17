//! "To generate" (the-colour-qr README.md:38-49).

use crate::png_io::{encode_png, RgbImage};
use crate::{
    Error, CHUNK_BYTES, DARK, FILLER, IMAGE_PX, LIGHT, MODULE_PX, PLANES, QR_MODULES, QR_VERSION,
    QUIET_MODULES,
};
use base64::Engine;
use qrcode::bits::Bits;
use qrcode::{Color, EcLevel, QrCode, Version};

/// Steps 1-3 (README.md:40-43): cut `payload` into 2,100-byte chunks, the last one the
/// remainder, and prepend each chunk's index `i` as a 4-byte little-endian uint32.
/// An empty payload has no chunks.
pub fn indexed_chunks(payload: &[u8]) -> Result<Vec<Vec<u8>>, Error> {
    let count = payload.len().div_ceil(CHUNK_BYTES);
    payload
        .chunks(CHUNK_BYTES)
        .enumerate()
        .map(|(i, body)| {
            let index = u32::try_from(i).map_err(|_| Error::TooManyChunks(count))?;
            let mut chunk = Vec::with_capacity(crate::INDEX_BYTES + body.len());
            chunk.extend_from_slice(&index.to_le_bytes());
            chunk.extend_from_slice(body);
            Ok(chunk)
        })
        .collect()
}

/// Step 4 (README.md:44): standard base64 alphabet with `=` padding, the form `atob` in
/// index.html:10236 reads.
pub fn base64_text(indexed_chunk: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(indexed_chunk)
}

/// One ordinary QR symbol: `width * width` modules, row-major, `true` = dark.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Symbol {
    pub width: usize,
    pub dark: Vec<bool>,
}

/// Step 5 (README.md:45): the base64 text as one byte-mode segment in a version-40, level-L
/// symbol (derivation at [`crate::QR_VERSION`]); mask and Reed-Solomon blocks are the
/// `qrcode` crate's standard ones.
pub fn symbol(text: &[u8]) -> Result<Symbol, Error> {
    let mut bits = Bits::new(Version::Normal(QR_VERSION));
    bits.push_byte_data(text).map_err(Error::Qr)?;
    bits.push_terminator(EcLevel::L).map_err(Error::Qr)?;
    let code = QrCode::with_bits(bits, EcLevel::L).map_err(Error::Qr)?;
    let width = code.width();
    let dark = code
        .into_colors()
        .into_iter()
        .map(|c| c == Color::Dark)
        .collect();
    Ok(Symbol { width, dark })
}

/// One composed colour code: its 1-based number (README.md:67-68 "code 11") and the chunk
/// index each plane carries (`None` = filler).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Code {
    pub number: usize,
    pub planes: [Option<u32>; PLANES],
    pub image: RgbImage,
}

/// Step 6 (README.md:46-47): red, green and blue planes from up to three symbols; a plane
/// with no symbol is filler. Each symbol sits at `MODULE_PX` pixels per module inside a
/// `QUIET_MODULES` light quiet zone.
pub fn compose(planes: [Option<&Symbol>; PLANES]) -> RgbImage {
    let mut data = vec![0u8; IMAGE_PX * IMAGE_PX * PLANES];
    for y in 0..IMAGE_PX {
        for x in 0..IMAGE_PX {
            for (ch, plane) in planes.iter().enumerate() {
                data[(y * IMAGE_PX + x) * PLANES + ch] = match plane {
                    None => FILLER,
                    Some(sym) => module_value(sym, x / MODULE_PX, y / MODULE_PX),
                };
            }
        }
    }
    RgbImage {
        width: IMAGE_PX,
        height: IMAGE_PX,
        data,
    }
}

fn module_value(sym: &Symbol, mx: usize, my: usize) -> u8 {
    let inside = |m: usize| m >= QUIET_MODULES && m < QUIET_MODULES + sym.width;
    if inside(mx) && inside(my) && sym.dark[(my - QUIET_MODULES) * sym.width + mx - QUIET_MODULES] {
        DARK
    } else {
        LIGHT
    }
}

/// The whole "To generate" direction: one composed image per three chunks, chunk `3k` red,
/// `3k+1` green, `3k+2` blue.
pub fn generate(payload: &[u8]) -> Result<Vec<Code>, Error> {
    let chunks = indexed_chunks(payload)?;
    let symbols = chunks
        .iter()
        .map(|c| symbol(base64_text(c).as_bytes()))
        .collect::<Result<Vec<_>, _>>()?;
    debug_assert!(symbols.iter().all(|s| s.width == QR_MODULES));
    Ok(symbols
        .chunks(PLANES)
        .enumerate()
        .map(|(k, group)| {
            let mut planes = [None; PLANES];
            let mut indices = [None; PLANES];
            for (ch, sym) in group.iter().enumerate() {
                planes[ch] = Some(sym);
                indices[ch] = u32::try_from(k * PLANES + ch).ok();
            }
            Code {
                number: k + 1,
                planes: indices,
                image: compose(planes),
            }
        })
        .collect())
}

/// [`generate`] followed by PNG encoding of each code.
pub fn generate_png(payload: &[u8]) -> Result<Vec<(Code, Vec<u8>)>, Error> {
    generate(payload)?
        .into_iter()
        .map(|code| {
            let png = encode_png(&code.image)?;
            Ok((code, png))
        })
        .collect()
}
