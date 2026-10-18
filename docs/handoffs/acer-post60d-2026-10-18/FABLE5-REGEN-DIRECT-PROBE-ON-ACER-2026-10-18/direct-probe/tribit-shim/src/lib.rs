//! Shim: exposes ACER's canonical tribit kernel (sha256 50e4cb85…) under the crate name `asolaria_tribit`,
//! so aether's `cloud/direct.rs` compiles byte-unchanged on ACER. Reused via #[path], never copied.
#[path = "C:/asolaria-acer/asolaria-os/kernel/core/src/tribit/mod.rs"]
mod tribit;
pub use tribit::*;
