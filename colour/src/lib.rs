//! Integer Rust ports of the Asolaria rainbow and gradiated colour formulas.
//!
//! Each module ports one upstream source line by line and cites it as `file:line`:
//!
//! - [`stars`]: universe simulator `measurements/stars_shells.py` (gradiated star colour, star key,
//!   shells, emergence rounds, rings, and the GGUF and receipt it writes).
//! - [`verdict`]: universe simulator `measurements/divide_kimi_k3.py:50-118` (pre-registered colour
//!   verdict and the three dominance populations), table in `gguf/stars/COLOUR-CODE.md`.
//! - [`colorpid`]: universe simulator `engines/omni_hotel.py:39-49` (ColorPID: pid colour,
//!   blast radius, rainbow12, sphere27, saturation).
//! - [`oil`]: FOLLOW `codes/double_rainbow_to_gguf.py` (integer luma, 12-bin hue, spatial and
//!   temporal gradients, the colour-state descriptor and its 3,174-byte GGUF).
//! - [`rainbow27v2`]: stone-to-moss `experiments/seat3/rainbow27_v2/rainbow27_v2.py`.
//! - [`rainbow7`]: stone-to-moss `experiments/seat1/rainbow7/rainbow7_bank.py` (band addresses).
//! - [`flashlight`]: universe simulator `measurements/pump_glyphs_mythos.py:74-116` and
//!   `measurements/asolaria_herself.py:56-99,135-138` (P, R, G look-up tables and bijections and
//!   their RPR composition; the D table is produced by the vendored Python only).
//!
//! [`binary64`] reproduces the IEEE-754 double arithmetic those sources run, using integers only.
//! The vendored upstream crate `vendor/rainbow27-check` is built and run on its own.

#![forbid(unsafe_code)]

pub mod binary64;
pub mod colorpid;
pub mod flashlight;
pub mod gguf;
pub mod oil;
pub mod rainbow27v2;
pub mod rainbow7;
pub mod stars;
pub mod verdict;

use sha2::{Digest, Sha256};

/// Lower-case hex SHA-256 of `bytes`, as Python `hashlib.sha256(bytes).hexdigest()`.
pub fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

/// Lower-case hex of `bytes`.
pub fn hex(bytes: &[u8]) -> String {
    use core::fmt::Write;
    bytes.iter().fold(String::new(), |mut out, b| {
        let _ = write!(out, "{b:02x}");
        out
    })
}
