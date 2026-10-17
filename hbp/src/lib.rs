//! HBP/HBI content and integrity layer, Rust hot-lane port.
//!
//! Ports three upstream JS units (the measured parity domain and its limits are in HBP.md):
//!
//! - `bigpickle-rebuild/src/hbp-emitter.mjs:16-111` -> [`hbp`] (serialize_envelope, write_hbp)
//! - `bigpickle-rebuild/src/hbp-reader.mjs:20-40, 118-156` -> [`reader`] (detect_format,
//!   parse_pipe_row, verify_hbp)
//! - `reductions/repo/relay-driver/relay-envelope.mjs:1-77` -> [`relay`] (RELAY row build/parse)
//!
//! sha256 is reused from the vendored `asolaria-hbi-hbp` crate (its `sha256_hex`).
#![forbid(unsafe_code)]

pub mod hbp;
pub mod reader;
pub mod relay;

pub use asolaria_hbi_hbp::sha256_hex;
