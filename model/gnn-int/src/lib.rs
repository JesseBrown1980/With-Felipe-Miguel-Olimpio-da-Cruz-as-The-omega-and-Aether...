#![forbid(unsafe_code)]

//! Integer-only (Q16) reference for message passing: a 2-layer GCN followed by an MLP
//! edge head over `[h_u || h_v]`, with a piecewise-linear hard sigmoid scored in per-mille.
//!
//! The built-in weights are UNTRAINED and HAND-SET. Nothing here is trained or evaluated;
//! the crate gives exact, deterministic integer outputs and nothing more.

pub mod graph;
pub mod model;
pub mod q16;
pub mod weights;

pub use graph::{gcn_coefficient, isqrt_u64, Graph};
pub use model::{gcn_layer, hard_sigmoid_permille, EdgeGnn};
pub use weights::{RawWeights, Weights};

use core::fmt;

/// Errors returned instead of panicking.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    /// A node id was `>= n`.
    NodeOutOfRange {
        /// The offending id.
        node: u32,
        /// Node count.
        n: usize,
    },
    /// More nodes than `u32` ids can address.
    TooManyNodes {
        /// Requested node count.
        n: usize,
    },
    /// An array had the wrong length.
    DimensionMismatch {
        /// Which array.
        what: &'static str,
        /// Required length.
        expected: usize,
        /// Supplied length.
        got: usize,
    },
    /// An embeddings slice whose length is not a multiple of `hidden`.
    RaggedEmbeddings {
        /// Supplied length.
        len: usize,
        /// Required row width.
        hidden: usize,
    },
    /// A dimension product overflowed `usize`.
    DimensionOverflow,
    /// A layer dimension (`in_dim`, `hidden` or `out_dim`) was zero.
    ZeroDimension,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::NodeOutOfRange { node, n } => write!(f, "node id {node} out of range (n = {n})"),
            Error::TooManyNodes { n } => write!(f, "{n} nodes exceed the u32 id space"),
            Error::DimensionMismatch { what, expected, got } => {
                write!(f, "{what}: expected length {expected}, got {got}")
            }
            Error::RaggedEmbeddings { len, hidden } => {
                write!(f, "embeddings: length {len} is not a multiple of hidden = {hidden}")
            }
            Error::DimensionOverflow => write!(f, "dimension product overflows usize"),
            Error::ZeroDimension => write!(f, "layer dimensions must be non-zero"),
        }
    }
}

impl std::error::Error for Error {}
