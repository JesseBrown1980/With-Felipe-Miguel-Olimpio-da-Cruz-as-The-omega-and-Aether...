//! G3 reverse-gain scorer, the runnable centerpiece of the trio.
//!
//! Upstream mechanism (published in `docs/security/REVERSE-GAIN-SELF-ECHO.md` and OWNER-RULES 7j):
//! `score = sign * jlMagnitude(env)`, with `sign = MASK_GLYPHS.has(env.glyph) ? -1 : +1`. The
//! "deception inversion" is that one sign flip on a set-membership test. `jlMagnitude` (the Euclidean
//! norm of the JL-projected quant vector) is the owner's float code and runs only in the vendored
//! Node lane against the external HyperBEHCS engine; it is never fabricated here. This port takes the
//! magnitude as a supplied argument and performs the sign flip exactly, as an integer bit operation.
//!
//! The per-adversary identifier set (`MASK_GLYPHS` upstream) is never embedded in this artifact. The
//! shipped default is a synthetic demo set ([`MaskSet::synthetic`]); an operator points
//! [`MaskSet::from_env`] at their own set at runtime via `GNN_REVERSE_MASK_SET`.

use std::collections::BTreeSet;
use std::path::Path;

use g_planes::JsNumber;
use l0_edge::jsnum::Dbl;

const SIGN_BIT: u64 = 1 << 63;

/// Environment variable naming a newline-delimited file of the operator's own mask identifiers.
pub const MASK_SET_ENV: &str = "GNN_REVERSE_MASK_SET";

/// The synthetic demo mask set, shipped so the plane runs with no setup. A demo fixture, not
/// intelligence: every token is opaque and obviously synthetic (see `data/example-mask-glyphs.txt`).
const SYNTHETIC_MASK_GLYPHS: &str = include_str!("../data/example-mask-glyphs.txt");

/// A balanced trit: the reverse-gain sign direction (`-1` mask, `+1` honest) or `0` (not yet scored).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Trit {
    Negative,
    #[default]
    Zero,
    Positive,
}

impl Trit {
    /// The signed value `-1`, `0` or `+1`.
    pub fn as_i8(self) -> i8 {
        match self {
            Trit::Negative => -1,
            Trit::Zero => 0,
            Trit::Positive => 1,
        }
    }
}

/// An exact integer ratio `num / den`, reported in place of a float (OWNER-RULES 4). The upstream
/// `state()` divides as a JavaScript float; that float stays in the vendored Node lane.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Ratio {
    pub num: u64,
    pub den: u64,
}

/// The set of mask identifiers membership is tested against. Supplied by the caller; the shipped
/// default is synthetic and an operator overrides it at runtime.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MaskSet {
    glyphs: BTreeSet<String>,
}

impl MaskSet {
    /// An empty set: no glyph is a mask, every score is positive. This is OWNER-RULES 7j's literal
    /// "empty default", selectable for an operator who wants the plane to ship with no tokens at all.
    pub fn empty() -> MaskSet {
        MaskSet {
            glyphs: BTreeSet::new(),
        }
    }

    /// The shipped synthetic demo set, so the plane runs out of the box without real tokens.
    pub fn synthetic() -> MaskSet {
        MaskSet {
            glyphs: parse_tokens(SYNTHETIC_MASK_GLYPHS),
        }
    }

    /// A set from caller-supplied identifiers (one per entry; blank and `#` lines are not filtered).
    pub fn from_tokens<I, S>(tokens: I) -> MaskSet
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        MaskSet {
            glyphs: tokens.into_iter().map(Into::into).collect(),
        }
    }

    /// A set parsed from a newline-delimited file; blank lines and `#` comments are ignored and each
    /// line is trimmed.
    pub fn read_path(path: &Path) -> std::io::Result<MaskSet> {
        let text = std::fs::read_to_string(path)?;
        Ok(MaskSet {
            glyphs: parse_tokens(&text),
        })
    }

    /// The operator's set from `GNN_REVERSE_MASK_SET` when that names a readable file, else the
    /// synthetic default. A set but unreadable path is returned as an error, not silently defaulted,
    /// so a misconfigured operator does not score against the demo set by accident.
    pub fn from_env() -> std::io::Result<MaskSet> {
        match std::env::var_os(MASK_SET_ENV) {
            Some(path) => MaskSet::read_path(Path::new(&path)),
            None => Ok(MaskSet::synthetic()),
        }
    }

    /// True when `glyph` is in the set (the upstream `MASK_GLYPHS.has(glyph)` test).
    pub fn contains(&self, glyph: &str) -> bool {
        self.glyphs.contains(glyph)
    }

    /// The number of identifiers in the set (upstream `MASK_GLYPHS.size`).
    pub fn len(&self) -> usize {
        self.glyphs.len()
    }

    /// True when the set holds no identifiers.
    pub fn is_empty(&self) -> bool {
        self.glyphs.is_empty()
    }
}

fn parse_tokens(text: &str) -> BTreeSet<String> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(String::from)
        .collect()
}

/// The reverse-gain core: `sign * jl_distance`. `is_mask` flips the sign of the supplied magnitude,
/// which is exact — multiplying any binary64 by `-1.0` only flips its sign bit (`+1.0` is identity).
pub fn reverse_gain(jl_distance: JsNumber, is_mask: bool) -> JsNumber {
    if is_mask {
        JsNumber::from_bits(jl_distance.to_bits() ^ SIGN_BIT)
    } else {
        jl_distance
    }
}

/// The reverse-gain sign for a glyph: `-1` when it is a mask glyph, `+1` otherwise.
pub fn sign_for(is_mask: bool) -> Trit {
    if is_mask {
        Trit::Negative
    } else {
        Trit::Positive
    }
}

/// One scored envelope, mirroring the upstream `mineReverseGain` return
/// `{ score, mask_flipped, sign, glyph, jl_distance }`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReverseGainResult {
    pub score: JsNumber,
    pub mask_flipped: bool,
    pub sign: Trit,
    pub glyph: String,
    pub jl_distance: JsNumber,
}

/// Score one glyph against `mask` given its supplied JL magnitude (upstream `mineReverseGain(env)`,
/// with `jlMagnitude(env)` already evaluated in the Node lane and passed in as `jl_distance`).
pub fn mine_reverse_gain(glyph: &str, jl_distance: JsNumber, mask: &MaskSet) -> ReverseGainResult {
    let is_mask = mask.contains(glyph);
    ReverseGainResult {
        score: reverse_gain(jl_distance, is_mask),
        mask_flipped: is_mask,
        sign: sign_for(is_mask),
        glyph: glyph.to_string(),
        jl_distance,
    }
}

/// The `{ glyph, score, sign }` payload the upstream `wire()` publishes on `gnnReverseGain`. The
/// conductor bus that carries it lives in the vendored Node lane and is not reinvented here.
pub fn wire_event(result: &ReverseGainResult) -> (&str, JsNumber, Trit) {
    (&result.glyph, result.score, result.sign)
}

/// The plane's running counters, mirroring the upstream module state
/// (`_scored`, `_honest`, `_maskFlipped`, `_lastSign`).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct State {
    scored: u64,
    honest: u64,
    mask_flipped: u64,
    last_sign: Trit,
}

/// A read of [`State`], with sign ratios as exact integers (OWNER-RULES 4).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StateSnapshot {
    pub scored: u64,
    pub positive: u64,
    pub negative: u64,
    pub pos_ratio: Ratio,
    pub neg_ratio: Ratio,
    pub last_sign: Trit,
    pub mask_glyph_count: usize,
}

impl State {
    /// Score one glyph and fold it into the counters, returning the per-envelope result.
    pub fn score(
        &mut self,
        glyph: &str,
        jl_distance: JsNumber,
        mask: &MaskSet,
    ) -> ReverseGainResult {
        let result = mine_reverse_gain(glyph, jl_distance, mask);
        self.scored += 1;
        if result.mask_flipped {
            self.mask_flipped += 1;
        } else {
            self.honest += 1;
        }
        self.last_sign = result.sign;
        result
    }

    /// The current counters. `den` is `scored`, or `1` when nothing has been scored, matching the
    /// upstream `const total = _scored || 1`.
    pub fn snapshot(&self, mask: &MaskSet) -> StateSnapshot {
        let den = self.scored.max(1);
        StateSnapshot {
            scored: self.scored,
            positive: self.honest,
            negative: self.mask_flipped,
            pos_ratio: Ratio {
                num: self.honest,
                den,
            },
            neg_ratio: Ratio {
                num: self.mask_flipped,
                den,
            },
            last_sign: self.last_sign,
            mask_glyph_count: mask.len(),
        }
    }
}

/// A supplied JL magnitude built from the exact decimal `units / 10^digits`, for self-tests,
/// examples and referee rows. This is a supplied demo input, never a fabricated JL value.
pub fn magnitude_from_decimal(units: u64, digits: u32) -> JsNumber {
    JsNumber::from_dbl(Dbl::decimal(units, digits))
}

/// True when `score` is a negative finite double; the magnitudes fed here are always positive, so the
/// sign bit alone decides.
pub fn is_negative(score: JsNumber) -> bool {
    score.to_bits() & SIGN_BIT != 0
}

/// Self-test over the synthetic set and supplied demo magnitudes: a mask token must score negative
/// (`sign = -1`, `mask_flipped = true`), a non-mask token must score positive. Mirrors the shape of
/// the upstream `selfTest`, using only synthetic tokens.
pub fn self_test() -> SelfTest {
    let mask = MaskSet::synthetic();
    let mut state = State::default();

    let masked = state.score(
        "synthetic-adversary-0001",
        magnitude_from_decimal(25, 1),
        &mask,
    );
    let honest = state.score(
        "synthetic-honest-leak-0001",
        magnitude_from_decimal(25, 1),
        &mask,
    );
    let honest_two = state.score(
        "synthetic-honest-leak-0002",
        magnitude_from_decimal(712, 3),
        &mask,
    );

    let mask_ok = masked.mask_flipped && masked.sign == Trit::Negative && is_negative(masked.score);
    let honest_ok =
        !honest.mask_flipped && honest.sign == Trit::Positive && !is_negative(honest.score);
    let honest_two_ok = !honest_two.mask_flipped
        && honest_two.sign == Trit::Positive
        && !is_negative(honest_two.score);

    SelfTest {
        ok: mask_ok && honest_ok && honest_two_ok,
        mask_test: masked,
        honest_test: honest,
        honest_reference: honest_two,
        state: state.snapshot(&mask),
    }
}

/// The result of [`self_test`].
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SelfTest {
    pub ok: bool,
    pub mask_test: ReverseGainResult,
    pub honest_test: ReverseGainResult,
    pub honest_reference: ReverseGainResult,
    pub state: StateSnapshot,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn synthetic_set_has_eight_tokens() {
        assert_eq!(MaskSet::synthetic().len(), 8);
        assert!(MaskSet::synthetic().contains("synthetic-adversary-0001"));
        assert!(!MaskSet::synthetic().contains("synthetic-honest-leak-0001"));
        assert!(MaskSet::empty().is_empty());
    }

    #[test]
    fn sign_flip_is_exact() {
        let d = magnitude_from_decimal(25, 1);
        // mask: -2.5, honest: +2.5; flipping twice is identity.
        let masked = reverse_gain(d, true);
        assert!(is_negative(masked));
        assert_eq!(reverse_gain(masked, true), d);
        assert_eq!(reverse_gain(d, false), d);
    }

    #[test]
    fn mine_matches_membership() {
        let mask = MaskSet::synthetic();
        let m = mine_reverse_gain("example-mask-token-a", magnitude_from_decimal(1, 0), &mask);
        assert_eq!(m.sign, Trit::Negative);
        assert!(m.mask_flipped);
        let h = mine_reverse_gain("not-in-the-set", magnitude_from_decimal(1, 0), &mask);
        assert_eq!(h.sign, Trit::Positive);
        assert!(!h.mask_flipped);
    }

    #[test]
    fn state_counts_and_ratios() {
        let mask = MaskSet::synthetic();
        let mut state = State::default();
        state.score(
            "synthetic-adversary-0001",
            magnitude_from_decimal(1, 0),
            &mask,
        );
        state.score("honest-a", magnitude_from_decimal(1, 0), &mask);
        state.score("honest-b", magnitude_from_decimal(1, 0), &mask);
        let snap = state.snapshot(&mask);
        assert_eq!(snap.scored, 3);
        assert_eq!(snap.positive, 2);
        assert_eq!(snap.negative, 1);
        assert_eq!(snap.pos_ratio, Ratio { num: 2, den: 3 });
        assert_eq!(snap.neg_ratio, Ratio { num: 1, den: 3 });
        assert_eq!(snap.last_sign, Trit::Positive);
        assert_eq!(snap.mask_glyph_count, 8);
    }

    #[test]
    fn empty_state_ratio_denominator_is_one() {
        let snap = State::default().snapshot(&MaskSet::empty());
        assert_eq!(snap.pos_ratio, Ratio { num: 0, den: 1 });
        assert_eq!(snap.mask_glyph_count, 0);
    }

    #[test]
    fn self_test_passes_on_synthetic_set() {
        assert!(self_test().ok);
    }
}
