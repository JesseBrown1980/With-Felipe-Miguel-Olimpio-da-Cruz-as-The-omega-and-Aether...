//! AETHER UNIVERSE - a crystal universe you read, not move. Nine regions, nine secrets: eight
//! recomputed in full by an integer-only kernel, the ninth (the White Field) over the page you hold
//! or the genuine enwik8, its xz share cited and never recomputed. Rust 1.81, std plus the repo's
//! own `asolaria-tribit`.
//!
//! Integer only: this crate refuses float arithmetic at compile time (the lints below) and a test
//! greps the sources. No Node, no V8, no JavaScript, no JSON, anywhere in the game, its saves or its
//! build: every save, snapshot and receipt is HBP rows, row-exact HBI and `.sha256` sidecars.
//!
//! The architecture is the Omega 5.3 authority split, as game code:
//!
//! ```text
//! Kernel (kernel, agents, world, secrets)  the only state authority; deterministic; no I/O
//!   -> Snapshot (snapshot)                 HBP rows + CHAIN row, sealed by sha256, chained by sha16
//!   -> Atlas (atlas)                       read-only: renders sealed snapshots, never the Kernel
//!   -> Console (game, commands, script)    parses commands into Missions; writes every tick
//! Evidence (hbp, sha256, evidence)         rows, index, sidecars, verify, the final seal
//! ```

#![deny(
    clippy::float_arithmetic,
    clippy::cast_precision_loss,
    clippy::float_cmp
)]
#![forbid(unsafe_code)]

pub mod agents;
pub mod atlas;
pub mod commands;
pub mod evidence;
pub mod game;
pub mod hbp;
pub mod kernel;
pub mod probe;
pub mod script;
pub mod secrets;
pub mod sha256;
pub mod sieve;
pub mod snapshot;
pub mod sources;
pub mod story;
pub mod trits;
pub mod wide;
pub mod world;
