//! Integer port of the functions in the Asolaria fabric GNN plane modules that compute from their
//! arguments alone (fnns@c4b2458 `src/planes/`, pinned in PROVENANCE.md):
//! - G4: the GLSM latent-state `transition` (glsm.mjs:31-76);
//! - G1: `popcount16` (gnn-edge-mining.mjs:30-35);
//! - G2: `hexHamming`, `popcount`, `scoreEnvelope` and `pathPid` (gnn-forward-genius.mjs:28-68).
//!
//! JavaScript numbers are held exactly, as IEEE-754 binary64 bit patterns ([`JsNumber`]) or as
//! [`l0_edge::jsnum::Dbl`]; no float type is used. The plane wrappers that call `enrichEnvelope`,
//! `quantMetadata`, `AUTHORITY_FIELDS` or `encodeFrame` are not reproduced: those modules have no file
//! on disk, and PROVENANCE.md lists where the owner registered them. The G3 reverse-gain plane is not
//! here either: fnns README.md:109 reads "G3 source is withheld due to PII."

#![forbid(unsafe_code)]

use l0_edge::jsnum::Dbl;

const SIGN_BIT: u64 = 1 << 63;
const EXPONENT_FIELD: u64 = 0x7FF0_0000_0000_0000;

/// A JavaScript number as its IEEE-754 binary64 bit pattern. Equality is bit identity; numeric
/// comparisons go through an integer total order on the bits that is exact for every finite value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct JsNumber {
    bits: u64,
}

impl JsNumber {
    pub const fn from_bits(bits: u64) -> JsNumber {
        JsNumber { bits }
    }

    pub const fn to_bits(self) -> u64 {
        self.bits
    }

    /// The same double as a non-negative [`Dbl`] holds.
    pub fn from_dbl(value: Dbl) -> JsNumber {
        JsNumber {
            bits: value.to_bits(),
        }
    }

    /// `Number.isFinite(x)`: false for NaN and both infinities (exponent field all ones).
    pub fn is_finite(self) -> bool {
        self.bits & EXPONENT_FIELD != EXPONENT_FIELD
    }

    /// Key whose integer order is the numeric order of finite doubles; -0 and +0 share key 0.
    fn order_key(self) -> i64 {
        let magnitude = (self.bits & !SIGN_BIT) as i64;
        if self.bits & SIGN_BIT == 0 {
            magnitude
        } else {
            -magnitude
        }
    }
}

/// glsm.mjs:40 `TAU_PATH = 0.5`.
pub const TAU_PATH: JsNumber = JsNumber::from_bits(0x3FE0_0000_0000_0000);
/// glsm.mjs:41 `TAU_GAIN = 0.5`.
pub const TAU_GAIN: JsNumber = JsNumber::from_bits(0x3FE0_0000_0000_0000);

/// The five latent states of the G4 machine, in upstream order (glsm.mjs:31-37 `LATENT_STATES`).
/// `gate/verdict` `KNOWN_G4_STATES` (gate/verdict/src/lib.rs:83-89) lists "UNKNOWN" and four of these
/// strings and omits "DESCRIBED", which fischer-kernel.mjs:69-70 weights 0 ("neutral — just started").
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Latent {
    Described,
    EdgeMined,
    PathFound,
    MistakeFlagged,
    Converged,
}

impl Latent {
    pub fn as_str(self) -> &'static str {
        match self {
            Latent::Described => "DESCRIBED",
            Latent::EdgeMined => "EDGE_MINED",
            Latent::PathFound => "PATH_FOUND",
            Latent::MistakeFlagged => "MISTAKE_FLAGGED",
            Latent::Converged => "CONVERGED",
        }
    }

    /// `None` for a string outside `LATENT_STATES`; glsm.mjs:55 maps such a `prev_state` to "DESCRIBED".
    pub fn from_g4_state(s: &str) -> Option<Latent> {
        match s {
            "DESCRIBED" => Some(Latent::Described),
            "EDGE_MINED" => Some(Latent::EdgeMined),
            "PATH_FOUND" => Some(Latent::PathFound),
            "MISTAKE_FLAGGED" => Some(Latent::MistakeFlagged),
            "CONVERGED" => Some(Latent::Converged),
            _ => None,
        }
    }
}

/// G4 GLSM `transition(prev_state, { edge_weight, path_confidence, reverse_gain })` (glsm.mjs:53-76).
/// `None` is an input that is not of type number; it and a non-finite double both return `prev`
/// (glsm.mjs:56-58). Only this pure function is ported: `glsmEmit` (glsm.mjs:80-126) also keeps the
/// module state `_current` (:43), needs all three antecedent rows (:83-85) and records only changes (:90-92).
pub fn transition(
    prev: Latent,
    edge_weight: Option<JsNumber>,
    path_confidence: Option<JsNumber>,
    reverse_gain: Option<JsNumber>,
) -> Latent {
    let (edge_weight, path_confidence, reverse_gain) =
        match (edge_weight, path_confidence, reverse_gain) {
            (Some(e), Some(p), Some(r)) if e.is_finite() && p.is_finite() && r.is_finite() => {
                (e.order_key(), p.order_key(), r.order_key())
            }
            _ => return prev,
        };
    match prev {
        Latent::Converged => Latent::Converged,
        Latent::Described => {
            if edge_weight > 0 {
                Latent::EdgeMined
            } else {
                Latent::Described
            }
        }
        Latent::EdgeMined => {
            if path_confidence >= TAU_PATH.order_key() {
                Latent::PathFound
            } else {
                Latent::EdgeMined
            }
        }
        Latent::PathFound => {
            if reverse_gain < 0 {
                Latent::MistakeFlagged
            } else if reverse_gain >= TAU_GAIN.order_key() {
                Latent::Converged
            } else {
                Latent::PathFound
            }
        }
        Latent::MistakeFlagged => {
            if path_confidence >= TAU_PATH.order_key() {
                Latent::PathFound
            } else {
                Latent::MistakeFlagged
            }
        }
    }
}

/// G1 `popcount16(bits)` (gnn-edge-mining.mjs:30-35) and G2 `popcount(bitstr)`
/// (gnn-forward-genius.mjs:47-53): the count of '1' code units, 0 for "". '1' is one UTF-8 byte and
/// never part of a multi-byte sequence, so the byte count equals JavaScript's code-unit count.
/// The G1 weight divides this by `AUTHORITY_FIELDS.length` (gnn-edge-mining.mjs:78-80), a list with no
/// file on disk, so that divisor is not reproduced.
pub fn popcount_bits(bits: &str) -> u32 {
    bits.bytes().filter(|&b| b == b'1').count() as u32
}

/// Matching and total bit counts of G2 `hexHamming`; its value is `bits === 0 ? 0 : match / bits`
/// (gnn-forward-genius.mjs:44), held here as the exact pair.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HexHamming {
    pub matching: u64,
    pub bits: u64,
}

impl HexHamming {
    /// The double JavaScript returns: `match / bits`, or 0 when `bits` is 0 (gnn-forward-genius.mjs:44).
    pub fn value(self) -> Dbl {
        if self.bits == 0 {
            Dbl::ZERO
        } else {
            Dbl::from_ratio(self.matching, self.bits)
        }
    }
}

/// G2 `hexHamming(a, b)` (gnn-forward-genius.mjs:30-45) over UTF-16 code units, as JavaScript indexes
/// and measures strings. A code unit that is not an ASCII hex digit makes `parseInt(a[i], 16)` NaN
/// (:35-36), which `x ^ y` (:37) reads as 0. A JavaScript string holding a lone surrogate has no `&str`.
pub fn hex_hamming(a: &str, b: &str) -> HexHamming {
    let len_a = a.encode_utf16().count();
    let len_b = b.encode_utf16().count();
    if len_a == 0 || len_b == 0 || len_a != len_b {
        return HexHamming {
            matching: 0,
            bits: 0,
        };
    }
    let mut matching = 0u64;
    let mut bits = 0u64;
    for (x, y) in a.encode_utf16().zip(b.encode_utf16()) {
        let diff = parse_hex_unit(x) ^ parse_hex_unit(y);
        matching += u64::from(4 - diff.count_ones());
        bits += 4;
    }
    HexHamming { matching, bits }
}

/// `parseInt(unit, 16)` for a one-code-unit string, with NaN as 0 (its `ToInt32`).
fn parse_hex_unit(unit: u16) -> u32 {
    match unit {
        0x30..=0x39 => u32::from(unit - 0x30),
        0x41..=0x46 => u32::from(unit - 0x41 + 10),
        0x61..=0x66 => u32::from(unit - 0x61 + 10),
        _ => 0,
    }
}

/// G2 `scoreEnvelope(env, seedJsQuant)` (gnn-forward-genius.mjs:57-62):
/// `0.7 * hexHamming(js_quant, seed) + 0.3 * (popcount(authority_quant) / 16)`, each operation rounded
/// as binary64. Pass "" for an absent `env.js_quant` / `env.authority_quant` (`|| ''`, :58-59).
pub fn score_envelope(js_quant: &str, authority_quant: &str, seed_js_quant: &str) -> Dbl {
    let sim = hex_hamming(js_quant, seed_js_quant).value();
    let auth = Dbl::from_ratio(u64::from(popcount_bits(authority_quant)), 16);
    Dbl::decimal(7, 1) * sim + Dbl::decimal(3, 1) * auth
}

/// Largest integer JavaScript holds exactly (`Number.MAX_SAFE_INTEGER`).
pub const MAX_SAFE_INTEGER: i64 = (1 << 53) - 1;

/// G2 `pathPid(rooms)` (gnn-forward-genius.mjs:65-68). For a safe integer `String(Number(r) || 0)` is
/// its decimal form; `None` when a room is outside +-`MAX_SAFE_INTEGER`, where this port has no claim.
pub fn path_pid(rooms: &[i64]) -> Option<String> {
    if rooms
        .iter()
        .any(|r| r.unsigned_abs() > MAX_SAFE_INTEGER as u64)
    {
        return None;
    }
    let tag = rooms
        .iter()
        .map(i64::to_string)
        .collect::<Vec<_>>()
        .join("-");
    Some(format!("G2-FWD-GENIUS-PATH-{tag}-PID-2026-05-19"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const HALF: JsNumber = JsNumber::from_bits(0x3FE0_0000_0000_0000);
    const NEG_ZERO: JsNumber = JsNumber::from_bits(SIGN_BIT);

    fn num(units: u64, digits: u32) -> Option<JsNumber> {
        Some(JsNumber::from_dbl(Dbl::decimal(units, digits)))
    }

    fn neg(units: u64, digits: u32) -> Option<JsNumber> {
        Some(JsNumber::from_bits(
            Dbl::decimal(units, digits).to_bits() | SIGN_BIT,
        ))
    }

    #[test]
    fn latent_str_roundtrip_matches_upstream_order() {
        for s in [
            "DESCRIBED",
            "EDGE_MINED",
            "PATH_FOUND",
            "MISTAKE_FLAGGED",
            "CONVERGED",
        ] {
            assert_eq!(Latent::from_g4_state(s).unwrap().as_str(), s);
        }
        assert_eq!(Latent::from_g4_state("UNKNOWN"), None);
    }

    #[test]
    fn taus_are_the_double_one_half() {
        assert_eq!(JsNumber::from_dbl(Dbl::decimal(5, 1)), TAU_PATH);
        assert_eq!(TAU_GAIN, HALF);
    }

    #[test]
    fn glsm_self_test_walk() {
        // glsm.mjs:148-159, each step's inputs and expected state.
        let walk = [
            (num(8, 1), num(1, 1), num(0, 0), Latent::EdgeMined),
            (num(8, 1), num(7, 1), num(0, 0), Latent::PathFound),
            (num(8, 1), num(7, 1), neg(3, 1), Latent::MistakeFlagged),
            (num(9, 1), num(9, 1), num(1, 1), Latent::PathFound),
            (num(9, 1), num(9, 1), num(8, 1), Latent::Converged),
        ];
        let mut state = Latent::Described;
        for (ew, pc, rg, expect) in walk {
            state = transition(state, ew, pc, rg);
            assert_eq!(state, expect);
        }
    }

    #[test]
    fn inputs_below_the_e4_grid_keep_their_sign_and_side_of_one_half() {
        assert_eq!(
            transition(Latent::Described, num(1, 6), num(0, 0), num(0, 0)),
            Latent::EdgeMined
        );
        assert_eq!(
            transition(Latent::PathFound, num(1, 0), num(0, 0), neg(386, 7)),
            Latent::MistakeFlagged
        );
        assert_eq!(
            transition(
                Latent::MistakeFlagged,
                num(1, 0),
                num(4_999_848, 7),
                num(0, 0)
            ),
            Latent::MistakeFlagged
        );
    }

    #[test]
    fn signed_zero_and_non_finite() {
        let zero = Some(JsNumber::from_bits(0));
        assert_eq!(
            transition(Latent::PathFound, zero, zero, Some(NEG_ZERO)),
            Latent::PathFound
        );
        assert_eq!(
            transition(Latent::Described, Some(NEG_ZERO), zero, zero),
            Latent::Described
        );
        let nan = Some(JsNumber::from_bits(0x7FF8_0000_0000_0000));
        let inf = Some(JsNumber::from_bits(0x7FF0_0000_0000_0000));
        assert_eq!(
            transition(Latent::EdgeMined, nan, Some(HALF), zero),
            Latent::EdgeMined
        );
        assert_eq!(
            transition(Latent::EdgeMined, zero, inf, zero),
            Latent::EdgeMined
        );
        assert_eq!(
            transition(Latent::EdgeMined, None, Some(HALF), zero),
            Latent::EdgeMined
        );
    }

    #[test]
    fn hex_hamming_counts_code_units() {
        assert_eq!(
            hex_hamming("ffff", "ffff"),
            HexHamming {
                matching: 16,
                bits: 16
            }
        );
        assert_eq!(hex_hamming("0000", "ffff").matching, 0);
        assert_eq!(hex_hamming("fff", "ffff").bits, 0);
        assert_eq!(hex_hamming("0g", "00").matching, 8);
        assert_eq!(hex_hamming("\u{e9}", "00").bits, 0);
        assert_eq!(hex_hamming("\u{e9}", "0").matching, 4);
    }

    #[test]
    fn path_pid_joins_rooms() {
        assert_eq!(
            path_pid(&[100, -5]).as_deref(),
            Some("G2-FWD-GENIUS-PATH-100--5-PID-2026-05-19")
        );
        assert_eq!(path_pid(&[MAX_SAFE_INTEGER + 1]), None);
    }
}
