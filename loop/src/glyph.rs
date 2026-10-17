//! BEHCS glyph token: `cp<4 hex>` for a codepoint index (bigpickle behcs.mjs:11,26-35).
//!
//! The BEHCS-256 glyphs are the first 256 of the BEHCS-1024 glyphs by construction, so the cp-notation
//! token for an index is the same in both alphabets; only the validation bound differs, enforced by the
//! caller (pid_minter).

pub const BEHCS256_SIZE: u32 = 256;
pub const BEHCS1024_SIZE: u32 = 1024;

/// `cp<4 hex>` token for `index` (`cp${i.toString(16).padStart(4,'0')}`).
pub fn glyph_at(index: u32) -> String {
    format!("cp{index:04x}")
}
