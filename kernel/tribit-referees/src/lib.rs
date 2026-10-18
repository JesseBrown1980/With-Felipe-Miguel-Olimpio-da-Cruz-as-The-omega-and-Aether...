//! Cold-lane integer ports of three of the owner's balanced-ternary research scripts, each
//! checked against the vendored script it follows (byte-equal stdout). No stack consumer: these
//! are referees beside `kernel/tribit`, with no request-path edge.
//!
//! - [`crank`]: `crank.py`, the `1/3 : 2/3` split over full periods, 13 levels.
//! - [`compose`]: `compose.py`, the closure under nesting to depth 13 and one path to depth 81.
//! - [`trunk`]: `trunk.py`, the low 320 balanced digits of `2^n`, `n = 0..=N`.
//!
//! [`binary64`] is the integer model of the binary64 values the scripts print or compute.
#![forbid(unsafe_code)]

pub mod binary64;
pub mod compose;
pub mod crank;
pub mod frac;
pub mod trunk;
pub mod wide;
