//! The owner's `JesseBrown1980/asolaria-matrix-in-colour` @ `7035def` in Rust 1.81:
//! `verify-frames.py` ported to integers ([`verify`]), a second read of the frames in the one
//! format their receipts name ([`stored`]), and the rows the repository seals ([`hbp`]).
#![forbid(unsafe_code)]

pub mod frame;
pub mod hbp;
pub mod stored;
pub mod verify;

pub use frame::{decode_png, RgbImage};
pub use stored::{read_stored_png, StoredPng};
pub use verify::{cell_grid, frame_names, frame_row, verify_frames, FrameRow, Report};

use core::fmt;
use sha2::{Digest, Sha256};

/// verify-frames.py:21 `GRID, CELL, MARGIN = 100, 10, 12`.
pub const GRID: usize = 100;
pub const CELL: usize = 10;
pub const MARGIN: usize = 12;

/// The vendored repository, relative to the crate root.
pub const VENDOR: &str = "vendor/asolaria-matrix-in-colour";

#[derive(Debug)]
pub enum Error {
    Io(std::io::Error),
    Png(String),
    /// A PNG the port does not read: anything but 8-bit RGB.
    Unsupported(String),
    Format(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Io(e) => write!(f, "io: {e}"),
            Error::Png(e) => write!(f, "png: {e}"),
            Error::Unsupported(e) => write!(f, "unsupported: {e}"),
            Error::Format(e) => write!(f, "format: {e}"),
        }
    }
}

impl std::error::Error for Error {}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Error::Io(e)
    }
}

/// Lowercase hex sha256, as `hashlib.sha256(..).hexdigest()` prints it.
pub fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(char::from(DIGITS[usize::from(b >> 4)]));
        s.push(char::from(DIGITS[usize::from(b & 15)]));
    }
    s
}
