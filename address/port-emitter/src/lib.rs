#![forbid(unsafe_code)]
//! Hilbert-traced nested logical ports (`port.port.port`), ported to integer Rust 1.81 from
//! bigpickle-rebuild@c592599 `src/port-address-emitter.mjs` (git blob 8ccac7c13e4c, 99 lines).
//!
//! Upstream header (port-address-emitter.mjs:1-2): "the 4th rotation axis: a Hilbert-traced
//! port.port.port LOGICAL address per agent, multiplexed in ONE process (never a real socket)."
//!
//! - [`ports_for_index`] and [`capacity`]: port-address-emitter.mjs:28-54. The 2D trace is
//!   `aether_loop::district_fabric::hilbert_xy` (the loop crate's port of district-fabric.mjs:61-74),
//!   called where upstream calls the imported `hilbertXY` (:20, :46), not duplicated here.
//! - [`address_string`], [`index_for_pid`], [`PortAddressEmitter`], [`port_addr_row`]: :56-99, ported
//!   because the upstream unit test (`tests/unit/port-address-emitter.test.mjs`, blob 2f594c535e1d)
//!   asserts on them; `tests/upstream_unit.rs` reproduces its nine tests.
//!
//! Upstream has no runtime caller (the unit test is its only importer), so nothing else is wired.
//! Integer domain: indexes are `u64` (upstream applies `Math.max(0, Math.floor(index))` to a JS Number,
//! :42, which is the identity on these), `bits <= MAX_BITS`, ports are `u32`. `next_address` adds
//! `start + counter` as JS Numbers do (:80-81, through `l0_edge::jsnum::Dbl`). No floating point.

pub mod emitter;
pub mod ports;

pub use emitter::{
    address_string, index_for_pid, port_addr_row, Address, EmitterOpts, PortAddressEmitter,
};
pub use ports::{capacity, ports_for_index, CapacityRangeError, MAX_BITS};

/// Loopback IP, the fallback of `process.env.ASOLARIA_PORT_IP || '127.0.0.1'` (port-address-emitter.mjs:22).
pub const DEFAULT_IP: &str = "127.0.0.1";
/// Nesting depth, the fallback of `Number(process.env.ASOLARIA_PORT_LEVELS || 3)` (:23).
pub const DEFAULT_LEVELS: u32 = 3;
/// Bits per port, the fallback of `Number(process.env.ASOLARIA_PORT_BITS || 16)` (:24).
pub const DEFAULT_BITS: u32 = 16;
