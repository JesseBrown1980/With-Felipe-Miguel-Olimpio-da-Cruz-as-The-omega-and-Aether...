//! `PIDChainRevolver` (pid-chain-revolver.mjs:20-88) with its MTP pre-warm, and the tuple form
//! of `mintPID` it calls (pid-minter.mjs:31-53, glyphs from behcs.mjs:10-12,26-35).

use crate::mtp::pre_warm_candidates;
use crate::primes::prime_at;
use crate::JsError;
use core::fmt::Write;
use sha2::{Digest, Sha256};

/// `LANE_CYCLE` (pid-chain-revolver.mjs:18); the same list as `LANES` (pid-minter.mjs:15).
pub const LANE_CYCLE: [&str; 7] = [
    "nervous",
    "circulatory",
    "skeletal",
    "muscular",
    "immune",
    "memory",
    "lymphatic",
];

/// `algorithm` of [`PidChainRevolver::pre_warm`] (pid-chain-revolver.mjs:60).
pub const PREWARM_ALGORITHM: &str = "pid-chain-revolver-mtp-prewarm.v1";

/// `sha16(input)` (pid-minter.mjs:21-23): the first 16 hex digits of SHA-256 over UTF-8.
pub fn sha16(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    digest[..8]
        .iter()
        .fold(String::with_capacity(16), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

/// `glyphAt(index, alphabet)` (behcs.mjs:26-35): `cp` and four hex digits.
pub fn glyph_at(index: i64, alphabet: i64) -> Result<String, JsError> {
    if alphabet != 256 && alphabet != 1024 {
        return Err(JsError::Range(format!(
            "alphabet must be 256 or 1024 (got {alphabet})"
        )));
    }
    if index < 0 || index >= alphabet {
        return Err(JsError::Range(format!(
            "actor index {index} outside [0, {alphabet})"
        )));
    }
    Ok(format!("cp{index:04x}"))
}

/// `validateAlphabet(alphabet)` (pid-minter.mjs:25-29).
fn validate_alphabet(alphabet: i64) -> Result<(), JsError> {
    if alphabet != 256 && alphabet != 1024 {
        return Err(JsError::Range(format!(
            "mintPID: alphabet must be 256 or 1024 (got {alphabet})"
        )));
    }
    Ok(())
}

/// ECMAScript `QuoteJSONString`, the form `JSON.stringify(lane)` gives a string in upstream's
/// message (pid-minter.mjs:40): `"` and `\` escaped, `\b \f \n \r \t`, other code points below
/// U+0020 as `\u` and four lowercase hex digits.
fn quote_json_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if u32::from(c) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", u32::from(c));
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// `mintPID({ actor, device, lane, prime, alphabet })` in tuple form (pid-minter.mjs:31-53,75-84).
pub fn mint_pid_tuple(
    actor: i64,
    device: &str,
    lane: &str,
    prime: i64,
    alphabet: i64,
) -> Result<String, JsError> {
    validate_alphabet(alphabet)?;
    if actor < 0 || actor >= alphabet {
        return Err(JsError::Range(format!(
            "mintPID: actor must be integer in [0, {alphabet}) (got {actor})"
        )));
    }
    if device.is_empty() {
        return Err(JsError::Type(
            "mintPID: device must be non-empty string".to_string(),
        ));
    }
    if !LANE_CYCLE.contains(&lane) {
        return Err(JsError::Range(format!(
            "mintPID: lane must be one of {} (got {})",
            LANE_CYCLE.join(", "),
            quote_json_string(lane)
        )));
    }
    if prime < 2 {
        return Err(JsError::Range(format!(
            "mintPID: prime must be integer >= 2 (got {prime})"
        )));
    }
    let glyph = glyph_at(actor, if actor < 256 { 256 } else { alphabet })?;
    Ok(sha16(&format!("{glyph}|{device}|{lane}|{prime}")))
}

/// One candidate of [`PidChainRevolver::pre_warm`] (pid-chain-revolver.mjs:76-84).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WarmCandidate {
    /// `head_index`.
    pub head_index: u32,
    /// `cp_predicted`.
    pub cp_predicted: i64,
    /// `bh_coord_predicted`.
    pub bh_coord_predicted: Vec<i64>,
    /// `speculative_pid`.
    pub speculative_pid: String,
    /// `actor` = `cp % alphabet`.
    pub actor: i64,
    /// `lane` = `LANE_CYCLE[cp % 7]`.
    pub lane: &'static str,
    /// `prime` = `primeAt(cp % 1000)`.
    pub prime: u64,
}

/// `preWarm` output (pid-chain-revolver.mjs:59-86).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PreWarm {
    /// `anchor`.
    pub anchor: String,
    /// `counter_at_prewarm`.
    pub counter_at_prewarm: u64,
    /// `cp0`.
    pub cp0: i64,
    /// `k`.
    pub k: i64,
    /// `candidates`.
    pub candidates: Vec<WarmCandidate>,
}

/// Options of [`PidChainRevolver::pre_warm`]; `None` is an absent key.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PreWarmOptions {
    /// `k` (default 4).
    pub k: Option<i64>,
    /// `depth` (default 1).
    pub depth: Option<i64>,
    /// `seed` (default 0).
    pub seed: Option<u32>,
    /// `cp0` (default `counter % 1024`).
    pub cp0: Option<i64>,
}

/// `PIDChainRevolver` (pid-chain-revolver.mjs:20-88) with the default `mintPID` and `primeAt`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PidChainRevolver {
    /// `anchor`.
    pub anchor: String,
    /// `counter`.
    pub counter: u64,
    /// `alphabet` (256 or 1024).
    pub alphabet: i64,
}

impl PidChainRevolver {
    /// `new PIDChainRevolver({ anchor, alphabet })` (pid-chain-revolver.mjs:21-30).
    pub fn new(anchor: &str, alphabet: Option<i64>) -> Result<PidChainRevolver, JsError> {
        if anchor.is_empty() {
            return Err(JsError::Type(
                "PIDChainRevolver: opts.anchor (string) required".to_string(),
            ));
        }
        Ok(PidChainRevolver {
            anchor: anchor.to_string(),
            counter: 0,
            alphabet: alphabet.unwrap_or(256),
        })
    }

    /// `next()` (pid-chain-revolver.mjs:32-43). An alphabet other than 256 or 1024 gives the
    /// `mintPID` RangeError (pid-minter.mjs:27) before the `%` and leaves `counter` unchanged.
    pub fn next_pid(&mut self) -> Result<String, JsError> {
        validate_alphabet(self.alphabet)?;
        let i = self.counter as i64;
        let pid = mint_pid_tuple(
            i % self.alphabet,
            &self.anchor,
            LANE_CYCLE[(i % 7) as usize],
            prime_at(i % 1000)? as i64,
            self.alphabet,
        )?;
        self.counter += 1;
        Ok(pid)
    }

    /// `reset()` (pid-chain-revolver.mjs:45-47).
    pub fn reset(&mut self) {
        self.counter = 0;
    }

    /// `preWarm(opts)` (pid-chain-revolver.mjs:53-87); leaves the revolver unchanged. Errors come in
    /// upstream's order: `mtpHeads` first, then the `mintPID` alphabet RangeError.
    pub fn pre_warm(&self, opts: PreWarmOptions) -> Result<PreWarm, JsError> {
        let k = opts.k.unwrap_or(4);
        let depth = opts.depth.unwrap_or(1);
        let seed = opts.seed.unwrap_or(0);
        let cp0 = opts.cp0.unwrap_or((self.counter % 1024) as i64).max(2);
        let mtp = pre_warm_candidates(cp0, k, depth, seed, &self.anchor)?;
        validate_alphabet(self.alphabet)?;
        let mut candidates = Vec::with_capacity(mtp.candidates.len());
        for c in mtp.candidates {
            let actor = c.cp % self.alphabet;
            let lane = LANE_CYCLE[(c.cp % 7) as usize];
            let prime = prime_at(c.cp % 1000)?;
            let speculative_pid =
                mint_pid_tuple(actor, &self.anchor, lane, prime as i64, self.alphabet)?;
            candidates.push(WarmCandidate {
                head_index: c.head_index,
                cp_predicted: c.cp,
                bh_coord_predicted: c.bh_coord,
                speculative_pid,
                actor,
                lane,
                prime,
            });
        }
        Ok(PreWarm {
            anchor: self.anchor.clone(),
            counter_at_prewarm: self.counter,
            cp0,
            k,
            candidates,
        })
    }
}
