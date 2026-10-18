//! Registry slot 28, the white-room cube address: `deriveCubeAddress` of
//! `pipeline/whiteroom-consumer-index.mjs` of Shannon-and-the-gnns-stage @ 32f9670 (blob
//! e572da93), cited as `consumer:<line>`. The Shannon stage README (lines 121-122): "The acer
//! consumer mirrors surviving patterns into deterministic 3×6×6 cube addresses."
//!
//! Ported: lines 62-66 over the pre-image text. Not ported: `stableStringify` (lines 104-110),
//! which serializes an arbitrary JSON value; the caller supplies its output, which upstream
//! hashes (line 62). The consumer's bus polling and JSON state file (lines 112-235) are HTTP and
//! JSON I/O.

use crate::sha256_hex;

/// `CUBE_LAYERS` (`consumer:17`).
pub const CUBE_LAYERS: u32 = 3;
/// `CUBE_AXIS` (`consumer:18`).
pub const CUBE_AXIS: u32 = 6;

/// `{ pattern_sha, cube_address: [layer, axis1, axis2] }` (`consumer:66`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CubeAddress {
    /// `pattern_sha`, the full sha256 hex of the pre-image.
    pub pattern_sha: String,
    /// `[layer, axis1, axis2]`.
    pub cube_address: [u32; 3],
}

/// `consumer:62-66`: `layer = hex[0..3] % 3`, `axis1 = hex[3..4] % 6`, `axis2 = hex[4..5] % 6`
/// of `sha256(norm)`, where `norm = stableStringify(patternPayload)`.
pub fn derive_cube_address(norm: &str) -> CubeAddress {
    let pattern_sha = sha256_hex(norm.as_bytes());
    let hex = |a: usize, b: usize| u32::from_str_radix(&pattern_sha[a..b], 16).expect("sha256 hex");
    CubeAddress {
        cube_address: [
            hex(0, 3) % CUBE_LAYERS,
            hex(3, 4) % CUBE_AXIS,
            hex(4, 5) % CUBE_AXIS,
        ],
        pattern_sha,
    }
}
