//! PID-chain revolver: per-request rotor minting a fresh PID per step (bigpickle pid-chain-revolver.mjs:18-47).
//!
//! `next_pid` is the port of `.next()` (renamed so it is not mistaken for `Iterator::next`). `preWarm`
//! (pid-chain-revolver.mjs:53-87) depends on the MTP lane (mtp-heads.mjs `preWarmCandidates`) and is not
//! brought into this crate; see the crate report.

use crate::pid_minter::{mint_from_tuple, MintError};
use crate::primes::prime_at;

/// Lane cycle, 7 lanes (pid-chain-revolver.mjs:18).
pub const LANE_CYCLE: [&str; 7] = [
    "nervous",
    "circulatory",
    "skeletal",
    "muscular",
    "immune",
    "memory",
    "lymphatic",
];

/// One rotor per execution context; each `next_pid` derives a PID from `(anchor, counter)`.
pub struct PidChainRevolver {
    anchor: String,
    pub counter: u64,
    alphabet: u32,
}

impl PidChainRevolver {
    /// New rotor anchored to `anchor`, alphabet 256 (the default). An empty anchor is
    /// `Err(BadDevice)`: upstream throws `TypeError` (pid-chain-revolver.mjs:22-24).
    pub fn new(anchor: &str) -> Result<Self, MintError> {
        Self::with_alphabet(anchor, 256)
    }

    /// New rotor with an explicit alphabet. Upstream accepts any alphabet here and its first `.next()`
    /// throws `RangeError` unless it is 256 or 1024 (pid-minter.mjs:20-24); this returns
    /// `Err(BadAlphabet)` at construction, so every rotor that exists can mint.
    pub fn with_alphabet(anchor: &str, alphabet: u32) -> Result<Self, MintError> {
        if anchor.is_empty() {
            return Err(MintError::BadDevice);
        }
        if alphabet != 256 && alphabet != 1024 {
            return Err(MintError::BadAlphabet);
        }
        Ok(Self {
            anchor: anchor.to_string(),
            counter: 0,
            alphabet,
        })
    }

    /// The anchor (the minter's `device`).
    pub fn anchor(&self) -> &str {
        &self.anchor
    }

    /// The alphabet (256 or 1024).
    pub fn alphabet(&self) -> u32 {
        self.alphabet
    }

    /// Mint the next PID and advance the counter (port of `.next()`, pid-chain-revolver.mjs:32-43).
    pub fn next_pid(&mut self) -> String {
        let i = self.counter;
        let actor = (i % u64::from(self.alphabet)) as u32;
        let lane = LANE_CYCLE[(i % LANE_CYCLE.len() as u64) as usize];
        let prime = u64::from(prime_at((i % 1000) as usize));
        let pid = mint_from_tuple(actor, &self.anchor, lane, prime, self.alphabet)
            .expect("anchor non-empty and alphabet 256/1024 are checked at construction");
        self.counter += 1;
        pid
    }

    /// Reset the counter to 0 (pid-chain-revolver.mjs:45-47).
    pub fn reset(&mut self) {
        self.counter = 0;
    }
}
