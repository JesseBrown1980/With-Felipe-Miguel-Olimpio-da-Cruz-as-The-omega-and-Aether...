//! An integer-only QR reader: the jsQR decoder that the owner's colour QR page runs
//! (the-colour-qr @ 1938a9b `index.html:125-10226`), ported to Rust 1.81 with no floating
//! point.
//!
//! Owner decision 2026-10-17: "Integer-only reader as the default, `rqrr` kept as a labelled
//! secondary". The-colour-qr README.md:5: "Rust 1.81 with clippy. Integer arithmetic and ternary
//! (trits) only — never float."
//!
//! [`read`] is `jsQR(data, width, height, {inversionAttempts: "attemptBoth"})` as the page calls
//! it on one plane (index.html:10242). Each step follows the page's lines:
//!
//! | step | module | index.html |
//! |---|---|---|
//! | grey plane, 8×8 block black points, 5×5 threshold | [`binarize`] | 534-624 |
//! | finder and alignment quads by run-length ratios, scores, grouping | [`locate`] | 9817-10222 |
//! | perspective transform and module sampling | [`extract`] | 9716-9815 |
//! | version and format information, unmasking, codeword order, blocks | [`decode`] | 628-942 |
//! | Reed-Solomon over GF(256) | [`reed_solomon`] | 239-443, 8272-8399 |
//! | segments: numeric, alphanumeric, byte, kanji, ECI | [`decode_data`] | 944-1222 |
//!
//! Where jsQR computes a JS number from integers alone (grey values, black points, run-length
//! ratio tests) this crate computes the same value in exact integers. Where it computes points,
//! distances, scores, the module size and the perspective transform, this crate holds each
//! value as the page's JS number, an IEEE-754 binary64 bit pattern, and applies the page's
//! operations with their roundings in integers ([`binary64`]), so it gets the page's values bit
//! for bit. README "How the integer reader follows jsQR" lists every integer form.
#![forbid(unsafe_code)]

pub mod binarize;
pub mod binary64;
pub mod bit_matrix;
pub mod decode;
pub mod decode_data;
pub mod extract;
pub mod locate;
pub mod reed_solomon;
mod shift_jis;
mod tables;

pub use binary64::Dbl;
pub use bit_matrix::BitMatrix;
pub use decode_data::{Chunk, Decoded};
pub use locate::{Location, Point};

/// Largest image side this reader accepts. jsQR has no limit; this bound keeps every pixel
/// index and integer sum inside its type (README "Bounds"). A larger image reads as no symbol.
pub const MAX_SIDE: usize = 1 << 15;

/// A JS exception inside jsQR. The page calls jsQR inside `try { } catch (e) { }`
/// (index.html:10242), so a throw ends the whole call with no result, inverted pass included.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Thrown;

/// What one successful read returns: jsQR's result object (index.html:464-480) with the
/// location points it used.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QrCode {
    /// `version`.
    pub version: u32,
    /// `binaryData`: every segment's bytes in order.
    pub bytes: Vec<u8>,
    /// `data`: the segments' text in order (a byte segment that is not UTF-8 adds nothing,
    /// index.html:1048-1053).
    pub text: String,
    /// `chunks`.
    pub chunks: Vec<Chunk>,
    /// The finder patterns, alignment pattern and dimension of the location that decoded
    /// (`location.topLeftFinderPattern` etc., index.html:470-478), as the page's JS numbers.
    pub location: Location,
    /// `location.topRightCorner`, `topLeftCorner`, `bottomRightCorner`, `bottomLeftCorner`
    /// (index.html:470-473): the transform at the symbol's corners, as the page's JS numbers.
    pub corners: [Point; 4],
    /// Which of the two located positions decoded: 0 = quad centres, 1 = recentred
    /// (index.html:10142-10176).
    pub location_index: usize,
    /// `true` when the symbol came from the inverted binarisation (index.html:498-500).
    pub inverted: bool,
    /// `true` when it decoded only after the mirror across the diagonal (index.html:926-940).
    pub mirrored: bool,
}

/// `jsQR(data, width, height, {inversionAttempts: "attemptBoth"})` (index.html:488-502) on one
/// grey plane, row-major, one byte per pixel.
///
/// The page hands jsQR `planeData(img, ch)` (index.html:10230-10235): R = G = B = the plane
/// value `v`, alpha 255. jsQR's grey for that pixel, `Uint8Clamped(0.2126 v + 0.7152 v +
/// 0.0722 v)` (index.html:545), is `v` for every `v` in 0..=255: the three products and two
/// sums differ from `v` by less than 2^-40 in total and the clamp rounds to the nearest
/// integer. So the plane goes in as jsQR's grey matrix unchanged.
pub fn read(width: usize, height: usize, grey: &[u8]) -> Option<QrCode> {
    if width == 0
        || height == 0
        || width > MAX_SIDE
        || height > MAX_SIDE
        || grey.len() != width * height
    {
        return None;
    }
    let (binarized, inverted) = binarize::binarize(grey, width, height);
    match scan(&binarized) {
        Ok(Some(code)) => Some(code),
        Ok(None) => match scan(&inverted) {
            Ok(Some(mut code)) => {
                code.inverted = true;
                Some(code)
            }
            _ => None,
        },
        Err(Thrown) => None,
    }
}

/// `scan(matrix)` (index.html:455-484): every located position in order; the first that
/// decodes is the result.
fn scan(matrix: &BitMatrix) -> Result<Option<QrCode>, Thrown> {
    let Some(locations) = locate::locate(matrix) else {
        return Ok(None);
    };
    for (location_index, location) in locations.into_iter().enumerate() {
        let mut extracted = extract::extract(matrix, &location);
        if let Some((decoded, mirrored)) = decode::decode(&mut extracted)? {
            return Ok(Some(QrCode {
                version: decoded.version,
                bytes: decoded.bytes,
                text: decoded.text,
                chunks: decoded.chunks,
                corners: extract::corners(&location),
                location,
                location_index,
                inverted: false,
                mirrored,
            }));
        }
    }
    Ok(None)
}
