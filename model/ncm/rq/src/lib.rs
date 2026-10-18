#![forbid(unsafe_code)]

//! Integer-only tests of the residual-quantization derivations D1 and D2.
//!
//! [`d1`] runs greedy coarse-to-fine residual quantization in one dimension with the balanced
//! codebook `{-3^k, 0, +3^k}` and checks it reproduces the balanced-ternary trits of the
//! kernel's [`asolaria_tribit::Zero`]. [`d2`] implements the 1/3/9/27 sum-down / repeat-up
//! schedule and an exactly invertible integer lifting transform for blocks of three.
//!
//! Every value in this crate is an integer. There is no floating point and no division other
//! than exact Euclidean `div_euclid` / `rem_euclid` by the constant 3.

pub mod d1;
pub mod d2;
pub mod rng;

pub use asolaria_tribit as tribit;
