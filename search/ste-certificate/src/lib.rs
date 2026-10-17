//! Exact-integer port of the Sidon-Tower-Embedding (STE) distance-uniqueness certificate and the
//! two distance probes beside it, from `01-rebuild/_scratch/` of
//! `JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything` @ `29307bf`
//! (vendored byte-identical in `vendor/scratch/`).
//!
//! - [`cross_fix`]: `sidon-cross-fix.mjs`, the certificate. BigInt values are `u128`.
//! - [`distance_probe`]: `distance-probe.mjs`, the linear `bhIndex` and prime-cube-weighted probes.
//! - [`sidon_probe`]: `sidon-probe.mjs`, single-tower Sidon sets and the `BIG`-spaced layout.
//!
//! The scripts' JavaScript Number values are all integers below 2^53 (`tests/jsnum.rs`), where
//! `+`, `-`, `*`, `%`, `Math.abs` and `Math.max` are exact, so they are `u64` here. The public
//! functions equal the scripts' Number functions on inputs that keep every value below 2^53;
//! for [`sidon::erdos_turan`] that is `p < 2^26`. Each `stdout_lines` function returns the
//! lines the script passes to `console.log`, in order.

#![no_std]
#![forbid(unsafe_code)]

extern crate alloc;

pub mod cross_fix;
pub mod distance_probe;
pub mod sidon;
pub mod sidon_probe;
