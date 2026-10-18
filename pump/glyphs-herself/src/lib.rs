//! Integer hot-lane regeneration of two codex-pump GGUFs from their seeds, reproducing the
//! numpy generators in `vendor/` (USIM @3f9f42d) byte for byte. All arithmetic is integer or
//! the binary64 emulation in `softfloat`; this crate uses no native floating-point types.
#![forbid(unsafe_code)]
// The pumps index flat 3D cubes `(x*N+y)*N+z` and parallel per-channel/per-tap arrays by
// position, mirroring the numpy source's indexing; iterator rewrites would obscure that.
#![allow(clippy::needless_range_loop)]

pub mod cv;
pub mod herself;
pub mod mythos;
pub mod softfloat;
