//! The owner's colour QR carrier (`JesseBrown1980/the-colour-qr` @ `1938a9b`), both directions,
//! in Rust 1.81.
//!
//! README.md:18 "Three ordinary QR symbols, one per RGB channel, in one image."
//! [`generate`] follows "To generate" (README.md:38-49) and [`ungenerate`] follows
//! "To un-generate" (README.md:51-60) together with the reader in `index.html` (`planeData`,
//! `b64`, `take`, `render`, the save handler and the file path, index.html:10228-10289).
//!
//! The QR symbols themselves are ordinary: the `qrcode` crate encodes them (README.md:45 "No
//! custom encoder") and the `rqrr` crate reads them (README.md:54 "ordinary QR decode"; rqrr
//! computes its geometry in floating point, see README "Floating point"). This crate does
//! chunking, the index header, base64, plane composition, plane extraction and reassembly, all
//! in integers.
#![forbid(unsafe_code)]

pub mod generate;
pub mod png_io;
pub mod ungenerate;

pub use generate::{generate, generate_png, indexed_chunks, symbol, Code, Symbol};
pub use png_io::{decode_png, encode_png, RgbImage, RgbaImage};
pub use ungenerate::{atob, take, ungenerate, Chunks, PlaneRead, Reassembled};

/// README.md:41 "Cut it into chunks of **2,100 bytes**. The last chunk is the remainder."
pub const CHUNK_BYTES: usize = 2100;

/// README.md:42 "prepend a **4-byte little-endian uint32** of `i`. That is the Fischer index."
pub const INDEX_BYTES: usize = 4;

/// Planes per image, in README.md:46 order: chunk `3k` red, `3k+1` green, `3k+2` blue.
pub const PLANES: usize = 3;

/// Plane names as index.html:10239 `names=["R","G","B"]`.
pub const PLANE_NAMES: [&str; PLANES] = ["R", "G", "B"];

/// QR version for every symbol, derived from the 2,100-byte chunk size: an indexed chunk is
/// 2,104 bytes, its padded base64 is 4 * ceil(2104 / 3) = 2,808 characters, one byte-mode
/// segment of 4 + 16 header bits + 8 per character = 22,484 bits. ISO/IEC 18004 data capacity
/// at version 40 is L 23,648 / M 18,672 / Q 13,328 / H 10,208 bits, so only level L holds it;
/// at level L the smallest version that holds it is 39 (22,496 bits). README.md:84 says
/// "A version-40 symbol is 177 modules" of the measured codes; version 40 also holds it, so
/// version 40 is used for every chunk, the remainder included, and every plane has one size.
pub const QR_VERSION: i16 = 40;

/// Modules per side of a version-40 symbol (README.md:84 "177 modules").
pub const QR_MODULES: usize = 177;

/// Pixels per module: README.md:85 names "the ~3 px floor any decoder needs".
pub const MODULE_PX: usize = 3;

/// Quiet zone in modules on each side: the ISO/IEC 18004 minimum for QR symbols.
pub const QUIET_MODULES: usize = 4;

/// Plane value of a dark module.
pub const DARK: u8 = 0;

/// Plane value of a light module and of the quiet zone.
pub const LIGHT: u8 = 255;

/// Plane value of a filler plane (README.md:47 "holds no symbol"): every pixel light.
pub const FILLER: u8 = LIGHT;

/// Side of one composed image in pixels: (177 + 2 * 4) * 3 = 555.
pub const IMAGE_PX: usize = (QR_MODULES + 2 * QUIET_MODULES) * MODULE_PX;

/// Errors from either direction.
#[derive(Debug)]
pub enum Error {
    /// The payload needs more than 2^32 chunks, so an index no longer fits a uint32.
    TooManyChunks(usize),
    /// The QR encoder refused the data.
    Qr(qrcode::types::QrError),
    /// PNG encoding or decoding failed.
    Png(String),
}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Error::TooManyChunks(n) => write!(f, "{n} chunks do not fit a uint32 index"),
            Error::Qr(e) => write!(f, "qr: {e}"),
            Error::Png(e) => write!(f, "png: {e}"),
        }
    }
}

impl std::error::Error for Error {}

/// Lowercase hex of a sha256 digest of `bytes`.
pub fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(bytes);
    let mut out = String::with_capacity(64);
    for b in digest.iter() {
        out.push(char::from(b"0123456789abcdef"[usize::from(b >> 4)]));
        out.push(char::from(b"0123456789abcdef"[usize::from(b & 15)]));
    }
    out
}
