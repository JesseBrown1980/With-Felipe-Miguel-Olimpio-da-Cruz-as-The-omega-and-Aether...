//! The public, runnable G-plane trio.
//!
//! This crate is the public runnable build of the G-plane trio. It is **not** a byte copy of the
//! operator's private `gnn-reverse-gain.mjs` (sha256 `0e381f92…ede3`, held per OWNER-RULES 7j) and
//! does not claim to be; the operator's real file, and the per-adversary identifier set inside it,
//! stay local. See `PROVENANCE.md` and `docs/security/REVERSE-GAIN-SELF-ECHO.md`.
//!
//! What runs here:
//! - **G3 reverse-gain**, the runnable centerpiece: [`reverse_gain`], the sign-flip scorer, with a
//!   [`MaskSet`] that defaults to a shipped synthetic demo set and is overridden at runtime via the
//!   `GNN_REVERSE_MASK_SET` environment variable. The JL magnitude it signs is the operator's float
//!   code, produced only in the vendored Node lane against the external HyperBEHCS engine; this crate
//!   takes it as a supplied argument and never fabricates it.
//! - **G1/G2/G4 argument-only cores**, re-exported from [`asolaria-g-planes`](g_planes): the G4
//!   [`transition`], the G1/G2 [`popcount_bits`], and the G2 [`hex_hamming`], [`score_envelope`] and
//!   [`path_pid`]. They are not re-ported here.
//! - The engine-free composition pieces: [`omniquant::vector_from_envelope`],
//!   [`quant_bus::authority_quant`], and [`bpi_codec::encode_frame`]/[`bpi_codec::decode_frame`].
//!
//! What stays absent (reproduced, not substituted): the live `:4949 /api/gnn/score` handler exists
//! nowhere on disk, so against the on-disk system the request-path g1..g4 resolve to null. The trio
//! composition is default-closed ([`quant_bus::GnnTrioFields::default_closed`]); the runnable surface
//! is the direct `reverse_gain` / self-test path.

#![forbid(unsafe_code)]

pub mod bpi_codec;
pub mod omniquant;
pub mod quant_bus;
pub mod reverse_gain;
pub mod sha256;

pub use omniquant::{vector_from_envelope, Envelope};
pub use reverse_gain::{
    magnitude_from_decimal, mine_reverse_gain, reverse_gain, self_test, sign_for, wire_event,
    MaskSet, Ratio, ReverseGainResult, SelfTest, State, StateSnapshot, Trit, MASK_SET_ENV,
};

/// The G1/G2/G4 argument-only cores, re-exported from `asolaria-g-planes` so the trio presents one
/// surface. These are the already-ported leaves; the trio does not re-port them.
pub use g_planes::{
    hex_hamming, path_pid, popcount_bits, score_envelope, transition, HexHamming, JsNumber, Latent,
    TAU_GAIN, TAU_PATH,
};
