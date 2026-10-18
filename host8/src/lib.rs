#![cfg_attr(not(test), no_std)]
#![forbid(unsafe_code)]
//! Host8 lane as an in-process library: 8-byte identity derivations, seat and verb-catalog parsing,
//! C/D room routing, the two upstream PID-source derivations, and the gnn-dispatch-bridge's three
//! pure functions with its golden-row emitter. No HTTP listener, no process launch, no file read —
//! every function computes a value only (the launch site is a separate, gated step upstream; see
//! `vendor/` for the full bytes).

extern crate alloc;

pub mod bridge;
pub mod identity;
pub mod pid_sources;
pub mod rooms;
