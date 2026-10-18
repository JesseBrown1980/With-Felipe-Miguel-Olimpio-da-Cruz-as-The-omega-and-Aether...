//! Rust 1.81 port of the PHASE-1 RELAY auto-driver (E=0): local lane append + verify +
//! reverse-walk, the append-only HBP ledger writer, the byte-offset HBI sidecar, and the
//! EMIT carve-out guard (structural path guard and content scan). The RELAY row grammar itself
//! is the `hbp` crate (`hbp::relay`, port of relay-envelope.mjs); this crate depends on it and
//! does not duplicate it.
//!
//! Upstream: reductions repo @29307bf, relay-driver/ (relay-driver.mjs blob fa6b5dbc,
//! relay-hbp-writer.mjs blob 037432fa, relay-hbi-indexer.mjs blob 9a0290c7,
//! relay-carveout.mjs blob bd5e6d0f). Lane output is byte-identical to the JS on the measured
//! domain stated in PROVENANCE.md. Paths follow node `path.posix` (the crate is POSIX-only).
#![forbid(unsafe_code)]

pub mod carveout;
pub mod driver;
pub mod indexer;
pub mod jsnum;
pub mod writer;

pub use driver::{
    emit, lane_head, lane_paths, reverse_walk, verify_lane, EmitArgs, LaneHead, LanePaths,
};
pub use hbp::relay;
