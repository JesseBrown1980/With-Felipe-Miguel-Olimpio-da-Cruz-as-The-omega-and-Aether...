//! Deterministic PID minter (bigpickle pid-minter.mjs:15-84).
//!
//! `mint_from_tuple` = `sha16("<glyph>|<device>|<lane>|<prime>")` where `<glyph>` is `cp<4hex>` of the
//! actor; `mint_from_index` = `sha16("idx:<index>:a<alphabet>")`. Pure functions, no hidden state.

use crate::glyph::glyph_at;
use crate::sha::sha16;

/// The 7-lane canon (pid-minter.mjs:15).
pub const LANES: [&str; 7] = [
    "nervous",
    "circulatory",
    "skeletal",
    "muscular",
    "immune",
    "memory",
    "lymphatic",
];

/// Big-Pickle busCount target (pid-minter.mjs:19 `100_000_000_000n`).
pub const MAX_INDEX: u64 = 100_000_000_000;

/// Mint-input validation failures (pid-minter.mjs:25-45,62-66 throw the matching RangeError/TypeError).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MintError {
    BadAlphabet,
    BadActor,
    BadDevice,
    BadLane,
    BadPrime,
    IndexOutOfRange,
}

fn valid_alphabet(alphabet: u32) -> bool {
    alphabet == 256 || alphabet == 1024
}

/// Tuple form: `mintPID({ actor, device, lane, prime, alphabet })` (pid-minter.mjs:31-53).
pub fn mint_from_tuple(
    actor: u32,
    device: &str,
    lane: &str,
    prime: u64,
    alphabet: u32,
) -> Result<String, MintError> {
    if !valid_alphabet(alphabet) {
        return Err(MintError::BadAlphabet);
    }
    if actor >= alphabet {
        return Err(MintError::BadActor);
    }
    if device.is_empty() {
        return Err(MintError::BadDevice);
    }
    if !LANES.contains(&lane) {
        return Err(MintError::BadLane);
    }
    if prime < 2 {
        return Err(MintError::BadPrime);
    }
    // Subset embedding: an actor below 256 uses the 256-table glyph, whose cp-notation is identical
    // to the 1024-table glyph at the same index (pid-minter.mjs:50), so the hash input is `cp<4hex>`.
    let glyph = glyph_at(actor);
    Ok(sha16(&format!("{glyph}|{device}|{lane}|{prime}")))
}

/// Index form: `mintPID({ index, alphabet })` (pid-minter.mjs:55-73).
pub fn mint_from_index(index: u64, alphabet: u32) -> Result<String, MintError> {
    if !valid_alphabet(alphabet) {
        return Err(MintError::BadAlphabet);
    }
    if index >= MAX_INDEX {
        return Err(MintError::IndexOutOfRange);
    }
    Ok(sha16(&format!("idx:{index}:a{alphabet}")))
}
