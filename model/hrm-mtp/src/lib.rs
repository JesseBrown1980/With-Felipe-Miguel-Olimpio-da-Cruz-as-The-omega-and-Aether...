//! Integer port of the Asolaria prediction triad of bigpickle-rebuild (`hilbert.mjs`,
//! `zeta-process.mjs`, `hrm-slow-fast.mjs`, `mtp-heads.mjs`, `PIDChainRevolver.preWarm`) and of
//! the universe simulator's HRM and MTP slice agents (players/rime_agents.py,
//! players/rime_windunwind.py).

#![forbid(unsafe_code)]

pub mod fdlibm;
pub mod hilbert;
pub mod hrm;
pub mod log2fx;
pub mod mtp;
pub mod primes;
pub mod revolver;
pub mod rime;
pub mod sf64;
pub mod trig;
pub mod zeta;

use core::fmt;

/// An exception the upstream JavaScript throws, with its message, or an argument outside the
/// ported domain.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JsError {
    /// `RangeError(message)`.
    Range(String),
    /// `TypeError(message)`.
    Type(String),
    /// The argument is outside the domain this port reproduces exactly.
    Domain(String),
}

impl fmt::Display for JsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JsError::Range(m) => write!(f, "RangeError: {m}"),
            JsError::Type(m) => write!(f, "TypeError: {m}"),
            JsError::Domain(m) => write!(f, "outside the ported domain: {m}"),
        }
    }
}

impl std::error::Error for JsError {}
