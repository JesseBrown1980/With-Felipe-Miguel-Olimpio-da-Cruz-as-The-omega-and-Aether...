//! Integer port of the owner's HyperBEHCS vector quants, `johnsonLindenstrauss`, `turboQuant`,
//! `polarQuant` and `tripleQuant` (+ `reconstructTriple`) of Asolaria-ASI-On-Metal-Fabric-and-matrix
//! `tools/falcon/omni-acer/lib/hyperbehcs-core.cjs` (vendored under `vendor/`), reproducing every
//! packet field and fingerprint bit for bit as Node v22.22.0 (V8 12.4.254.21) on x86-64 runs the
//! file; Node on arm64 was not measured.
//!
//! Registry slots (ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp lines 15-18, vendored):
//!
//! | n | id | upstream lines | port |
//! |---|---|---|---|
//! | 9 | `Q-JL-ACHLIOPTAS-SEEDED-v1` | 61-90 | [`johnson_lindenstrauss`] |
//! | 10 | `Q-TURBO-MINMAX-U8-v1` | 92-115 | [`turbo_quant`] |
//! | 11 | `Q-POLAR-RTHETA-v1` | 117-150 | [`polar_quant`] |
//! | 12 | `Q-TRIPLE-SPHERICAL-v1` | 152-213 | [`triple_quant`], [`reconstruct_triple`] |
//!
//! Numbers are IEEE-754 binary64 bit patterns computed with integers ([`Number`]); `Math.atan2`,
//! `Math.acos`, `Math.sin` and `Math.cos` follow V8's fdlibm source ([`fdlibm`]); a packet's
//! `fingerprint` is `sha256` of the text `JSON.stringify` gives for it, written directly into the
//! hash ([`JlPacket::fingerprint_preimage`] and siblings). No floating-point type is used.

#![forbid(unsafe_code)]

pub mod core;
pub mod fdlibm;
pub mod number;
pub mod text;

pub use crate::core::{
    achlioptas_weight, johnson_lindenstrauss, normalize_vector, polar_quant, quant_bits,
    reconstruct_triple, round, sha16, sha256_hex, triple_quant, turbo_quant, vector_from_text,
    JlPacket, Options, PolarMetadata, PolarPacket, TripleMetadata, TriplePacket, TurboMetadata,
    TurboPacket, TRIPLE_LANES, ZERO_COUNTERS,
};
pub use crate::number::Number;
pub use crate::text::number_to_string;

/// A registry slot this crate ports: `QUANT|n=<n>|id=<id>|...|owner=<owner>`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Slot {
    /// `n`.
    pub n: u32,
    /// `id`.
    pub id: &'static str,
    /// `alias`.
    pub alias: &'static str,
    /// `algorithm` field of the packet the slot produces.
    pub algorithm: &'static str,
}

/// The owner path every slot names.
pub const OWNER: &str =
    "Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs";

/// Registry rows n=9..12.
pub const SLOTS: [Slot; 4] = [
    Slot {
        n: 9,
        id: "Q-JL-ACHLIOPTAS-SEEDED-v1",
        alias: "JL-Achlioptas",
        algorithm: JlPacket::ALGORITHM,
    },
    Slot {
        n: 10,
        id: "Q-TURBO-MINMAX-U8-v1",
        alias: "Turbo-uniform",
        algorithm: TurboPacket::ALGORITHM,
    },
    Slot {
        n: 11,
        id: "Q-POLAR-RTHETA-v1",
        alias: "Polar-pair",
        algorithm: PolarPacket::ALGORITHM,
    },
    Slot {
        n: 12,
        id: "Q-TRIPLE-SPHERICAL-v1",
        alias: "Triple-spherical",
        algorithm: TriplePacket::ALGORITHM,
    },
];
