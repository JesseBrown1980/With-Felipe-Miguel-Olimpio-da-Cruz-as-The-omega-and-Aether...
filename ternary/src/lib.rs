//! The stack's shared ternary layer. Integer only, no float, `no_std` (with `alloc` for the byte
//! streams of the trijection codec).
//!
//! - The trit is the owner's [`Zero`] (`Neg = -1`, `Nil = 0`, `Pos = +1`) from `kernel/tribit`
//!   (asolaria-tribit@1292191 `src/lib.rs:91-143`), re-exported here unchanged together with the
//!   rest of that unit: [`Register`], [`Carrier`], [`TritWord`], [`prism`] / [`unprism`] over
//!   `Z/P`, [`pump_shell`] / [`pump_step`]. Nothing from it is copied or rewritten.
//! - [`trijection`]: the owner's `trijection.py` (ACER seat, "Sealed 2026-07-21", sha256
//!   `c5005b1c…`, vendored under `vendor/acer-algorithms-of-asolaria-publication-20260723/`):
//!   `trijection_forward` / `trijection_inverse` over bytes, the per-triple body of both, and the
//!   zero-trit count of its `measure()`; plus the 2/3 rule in `players/rime_27fischers.py:92`.
//! - [`balanced`]: balanced ternary of integers, least significant trit first:
//!   `to_balanced_ternary` of `trijection.py:42-48` (fixed width); the owner's `bal3` / `base3`
//!   (`reframe_check.py:12-34`, reconstruction `:44`); the fixed-width loop of
//!   `rime_27fischers.py:39-44` / `rime_agents.py:46-51`.
//! - [`cube`]: the 27-cube of three trits (law `:23-25`, `:124-139`; `trijection.py:23-25`;
//!   `rime_27fischers.py:51-52`).
#![cfg_attr(not(test), no_std)]
#![forbid(unsafe_code)]

extern crate alloc;

pub use asolaria_tribit as tribit;
pub use asolaria_tribit::{
    inv, pow, prism, pump_shell, pump_step, unprism, Carrier, Register, TritWord, Zero, G, K, P,
    TRITS_PER_U128, W,
};

pub mod balanced;
pub mod cube;
pub mod trijection;
