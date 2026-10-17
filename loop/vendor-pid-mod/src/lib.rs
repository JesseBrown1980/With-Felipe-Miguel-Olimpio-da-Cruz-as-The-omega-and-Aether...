#![no_std]
#![forbid(unsafe_code)]
//! Byte-identical vendor of the reductions `asolaria-os-metal-kernel/pid-mod.rs`.
//!
//! Upstream: JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything@29307bf,
//! path `kernels/asolaria-os-metal-kernel/pid-mod.rs`, git blob `816c1fc7d3dae98db525536179115e40137e71df`,
//! sha256 `a86044324e98ac3b4c59d8dcc5fc1af30686456d74c2ae37d5b56a66bdc076de` (see `UPSTREAM.sha256`).
//!
//! `src/pid-mod.rs` is included unchanged via `#[path]`. This wrapper only supplies the `alloc`
//! extern crate that the upstream `use alloc::{string::String, vec::Vec}` lines resolve against; it
//! adds no code to the vendored module. The upstream carries its own 27 `#[test]` functions, which
//! run under `cargo +1.81.0 test`.

extern crate alloc;

#[path = "pid-mod.rs"]
pub mod pid_mod;
