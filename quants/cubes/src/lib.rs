#![forbid(unsafe_code)]
//! Combined-quant registry slots 21 and 25-28
//! (`vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` lines 27,
//! 31-34). Every module is the owner's code: vendored Rust, or an integer port of the owner's
//! JavaScript that a stdlib Python referee (`tools/referee.py`) mirrors line by line.
//!
//! | slot | id | module | upstream |
//! |---|---|---|---|
//! | 21 | `Q-CUBE3200-ABSORB-v1` | [`qprism`] | Q-PRISM `host8/qprism_cube_host8.rs` (vendored Rust) |
//! | 25 | `Q-WORD-GLYPH-BUCKET8-v1` | [`ingest`] | reductions `cubes/ingest-google-to-cube.mjs` |
//! | 26 | `Q-SHARD-CUBE-v1` | [`shard`] | Asolaria-hermes-work `room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs` |
//! | 27 | `Q-TENSOR-OMNISHANNON-COLLAPSE-v1` | none (engines located in asolaria-behcs-256 `tools/cube/`, not brought in; document lines quoted) | reductions `ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md` |
//! | 28 | `Q-WHITEROOM-GULP-MINT-v1` | [`whiteroom`], [`gc`], [`consumer`] | asolaria-whiteroom-engine, after-100B `backend/gc-runtime.mjs`, Shannon stage `pipeline/whiteroom-consumer-index.mjs` |
//!
//! No floating-point type is used: JavaScript doubles go through `l0_edge::jsnum::Dbl` and
//! `quant_hyperbehcs::Number`.

pub mod consumer;
pub mod gc;
pub mod ingest;
pub mod qprism;
pub mod shard;
pub mod whiteroom;

use sha2::{Digest, Sha256};

/// Lowercase hex of `sha256(bytes)`: Node's `createHash('sha256').update(s, 'utf8').digest('hex')`
/// for a string `s` whose UTF-8 bytes are `bytes`.
pub fn sha256_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let digest = Sha256::digest(bytes);
    let mut out = String::with_capacity(64);
    for b in digest {
        out.push(HEX[usize::from(b >> 4)] as char);
        out.push(HEX[usize::from(b & 15)] as char);
    }
    out
}
