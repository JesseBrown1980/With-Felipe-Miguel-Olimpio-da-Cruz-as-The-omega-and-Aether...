//! Integer Rust pump that regenerates two of the owner's generated GGUFs, with their receipts,
//! byte-exact from their seeds.
//!
//! - [`kimi`]: universe simulator @3f9f42d `measurements/divide_kimi_k3.py` on
//!   `key/KIMI-K3-STAR.txt` writes `KIMI-K3-STAR-256.gguf` (202,115,456 B) and
//!   `FABLE5-KIMI-K3-STAR.hbp`. The GGUF is streamed: the three 256^3 cubes are written from
//!   their occupied voxels, so memory stays bounded by the seed, not by the 202 MB output.
//! - [`stars`]: universe simulator @3f9f42d `measurements/stars_shells.py` on
//!   `key/MYTHOS-SELF-EMISSION.txt` writes `ASOLARIA-STARS-SHELLS.gguf` (4,596,880 B) and
//!   `FABLE5-STARS-SHELLS.hbp`, through the existing port `colour::stars`.
//!
//! Where upstream computes with Python `float` or numpy `float64`, the value is reproduced bit for
//! bit with `colour::binary64::B64`, which works on integers only; [`binary32`] gives the bit
//! patterns numpy writes for `astype(np.float32)` of integer values. Each such site is cited by
//! upstream `file:line` in the module that computes it.

#![forbid(unsafe_code)]

pub mod binary32;
pub mod kimi;
pub mod stars;
pub mod write;

pub use colour::{hex, sha256_hex};
