//! `PrototypeGNN` (prototype_gnn.py:27-132) in eval mode, in Q24 integers, with the layer layout of its trained
//! checkpoint: the `conv*.lin.bias` keys and module tree are those of the file's fallback `GCNConv`
//! (prototype_gnn.py:17-24), whose forward is `self.lin(x)` (line 24).

use crate::weights::{
    CONV1_B, CONV1_W, CONV2_B, CONV2_W, PROJ0_B, PROJ0_W, PROJ2_B, PROJ2_W, PROTOTYPES,
};
use std::fmt;

/// Fraction bits of every Q24 value.
pub const FRAC_BITS: u32 = 24;
/// `node_input_dim` (gnn-l1-l2-status.test.mjs:68-72 expects 6 for the :4795 server).
pub const NODE_FEATURES: usize = 6;
/// `hidden_dim` (64 in the same test).
pub const HIDDEN: usize = 64;
/// `num_classes` (2 in the same test).
pub const CLASSES: usize = 2;
/// One Q24 node or edge embedding.
pub type Embedding = [i128; HIDDEN];

const ONE_Q24: i64 = 1 << FRAC_BITS;
/// `temperature: float = 0.1` (prototype_gnn.py:39); `-d / 0.1` (line 103) is `-10 * d`.
const INVERSE_TEMPERATURE: i128 = 10;
const LOGIT_BITS: u32 = 2 * FRAC_BITS;
const EXP_BITS: u32 = 62;
const ONE_EXP: u128 = 1 << EXP_BITS;
const LN2_EXP: u128 = 3_196_577_161_300_663_915;
const SIGMOID_SATURATION_Q48: u128 = 18 << LOGIT_BITS;
/// `exp_neg` is within 12 units of 2^-62 of e^-|t| (at most 18 series terms, each rounded to 1/2 unit, and
/// `LN2_EXP` within 0.053 units per octave), so its quotient is within 2^-34 of 2^24 * sigmoid(t).
const TIE_WINDOW_BITS: u32 = 32;

/// What the model computes for one edge.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EdgeOutput {
    /// `get_edge_embeddings` row (prototype_gnn.py:76-78), Q24.
    pub embedding: Embedding,
    /// `compute_prototype_distances` row (prototype_gnn.py:89-105): per class,
    /// `-min_k sum((e - p_ck)^2) / 0.1`, exact in Q48.
    pub logits_q48: [i128; CLASSES],
    /// `forward` value (prototype_gnn.py:128-131): `softmax(logits)[1]`, Q24 in 0..=2^24, round half up.
    pub probability_q24: i64,
}

/// Why [`edge_outputs`] gives no outputs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModelError {
    /// Edge number `edge` names a node index `>= x.len()`; torch raises IndexError at prototype_gnn.py:77.
    NodeIndexOutOfRange { edge: usize },
}

impl fmt::Display for ModelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ModelError::NodeIndexOutOfRange { edge } => {
                write!(f, "edge {edge} names a node index out of range")
            }
        }
    }
}

impl std::error::Error for ModelError {}

/// `encode_nodes` (prototype_gnn.py:65-71) in eval mode: conv1, ReLU, conv2 per node, Q24.
/// The fallback `GCNConv.forward` returns `self.lin(x)` (line 24), so no edge enters.
pub fn encode_nodes(x: &[[i64; NODE_FEATURES]]) -> Vec<Embedding> {
    x.iter()
        .map(|row| {
            let conv1 = linear(&row.map(i128::from), &CONV1_W, &CONV1_B);
            linear(&conv1.map(|v| v.max(0)), &CONV2_W, &CONV2_B)
        })
        .collect()
}

/// `get_edge_embeddings`, `compute_prototype_distances` and `forward` (prototype_gnn.py:73-131) per edge.
pub fn edge_outputs(
    x: &[[i64; NODE_FEATURES]],
    edges: &[(usize, usize)],
) -> Result<Vec<EdgeOutput>, ModelError> {
    if let Some(edge) = edges
        .iter()
        .position(|&(source, target)| source >= x.len() || target >= x.len())
    {
        return Err(ModelError::NodeIndexOutOfRange { edge });
    }
    let h = encode_nodes(x);
    Ok(edges
        .iter()
        .map(|&(source, target)| edge_output(&h[source], &h[target]))
        .collect())
}

/// `forward` (prototype_gnn.py:107-131): `probs[:, 1]` per edge, Q24.
pub fn forward(
    x: &[[i64; NODE_FEATURES]],
    edges: &[(usize, usize)],
) -> Result<Vec<i64>, ModelError> {
    Ok(edge_outputs(x, edges)?
        .iter()
        .map(|output| output.probability_q24)
        .collect())
}

/// [`edge_outputs`] of the two-node graph `[source, target]` with the one edge `(0, 1)`; a helper added for this
/// stack (prototype_gnn.py has no such method).
pub fn pair_output(source: &[i64; NODE_FEATURES], target: &[i64; NODE_FEATURES]) -> EdgeOutput {
    let h = encode_nodes(&[*source, *target]);
    edge_output(&h[0], &h[1])
}

fn edge_output(source: &Embedding, target: &Embedding) -> EdgeOutput {
    let pair: [i128; 2 * HIDDEN] = std::array::from_fn(|i| {
        if i < HIDDEN {
            source[i]
        } else {
            target[i - HIDDEN]
        }
    });
    let hidden = linear(&pair, &PROJ0_W, &PROJ0_B).map(|v| v.max(0));
    let embedding = linear(&hidden, &PROJ2_W, &PROJ2_B);
    let logits_q48 = prototype_logits(&embedding);
    EdgeOutput {
        embedding,
        logits_q48,
        probability_q24: sigmoid_q24(logits_q48[1] - logits_q48[0]),
    }
}

fn round_shift(value: i128, bits: u32) -> i128 {
    (value + (1 << (bits - 1))) >> bits
}

/// `nn.Linear`: `sum(x * w) + b`, one round half up to Q24 per output.
fn linear<const IN: usize>(
    input: &[i128; IN],
    weight: &[[i32; IN]; HIDDEN],
    bias: &[i32; HIDDEN],
) -> Embedding {
    std::array::from_fn(|out| {
        let sum: i128 = input
            .iter()
            .zip(&weight[out])
            .map(|(&value, &w)| value * i128::from(w))
            .sum();
        round_shift(sum + (i128::from(bias[out]) << FRAC_BITS), FRAC_BITS)
    })
}

/// prototype_gnn.py:96-103: squared distance to every prototype, the minimum per class, `-d / 0.1`.
fn prototype_logits(embedding: &Embedding) -> [i128; CLASSES] {
    PROTOTYPES.map(|class| {
        let nearest = class.iter().fold(i128::MAX, |nearest, prototype| {
            let distance: i128 = embedding
                .iter()
                .zip(prototype)
                .map(|(&e, &p)| {
                    let diff = e - i128::from(p);
                    diff * diff
                })
                .sum();
            nearest.min(distance)
        });
        -INVERSE_TEMPERATURE * nearest
    })
}

fn exp_neg(magnitude: u128) -> u128 {
    let octaves = magnitude / LN2_EXP;
    let remainder = magnitude - octaves * LN2_EXP;
    let mut sum = ONE_EXP;
    let mut term = ONE_EXP;
    let mut n: u128 = 1;
    while term != 0 {
        term = (term * remainder + (n << (EXP_BITS - 1))) / (n << EXP_BITS);
        if n % 2 == 1 {
            sum -= term;
        } else {
            sum += term;
        }
        n += 1;
    }
    match u32::try_from(octaves) {
        Ok(0) => sum,
        Ok(shift) if shift < EXP_BITS => (sum + (1 << (shift - 1))) >> shift,
        _ => 0,
    }
}

/// `softmax([l0, l1])[1] = 1 / (1 + e^(l0 - l1))` of `t = l1 - l0` in Q48, as Q24 rounded half up.
/// When the series quotient lies within 2^-32 of a half, [`round_near_half`] decides the side exactly.
fn sigmoid_q24(logit_q48: i128) -> i64 {
    let magnitude = logit_q48.unsigned_abs();
    if magnitude > SIGMOID_SATURATION_Q48 {
        return if logit_q48 > 0 { ONE_Q24 } else { 0 };
    }
    let decay = exp_neg(magnitude << (EXP_BITS - LOGIT_BITS));
    let denominator = ONE_EXP + decay;
    let numerator = if logit_q48 >= 0 { ONE_EXP } else { decay };
    let dividend = (numerator << (FRAC_BITS + 1)) + denominator;
    let window = 2 * denominator;
    let (rounded, remainder) = (dividend / window, dividend % window);
    let rounded = if remainder << TIE_WINDOW_BITS < window {
        round_near_half(logit_q48, magnitude, rounded)
    } else if (window - remainder) << TIE_WINDOW_BITS <= window {
        round_near_half(logit_q48, magnitude, rounded + 1)
    } else {
        rounded
    };
    i64::try_from(rounded).unwrap_or(ONE_Q24)
}

/// `upper` if `2^24 * sigmoid(t) > upper - 1/2`, else `upper - 1`. With `a = 2 upper - 1` and `b = 2^25 - a`, that is
/// `b e^|t| > a` for `t > 0` and `a e^|t| < b` for `t < 0`; equality needs a rational `e^|t|`, so `t = 0`.
fn round_near_half(logit_q48: i128, magnitude: u128, upper: u128) -> u128 {
    let a = 2 * upper - 1;
    let b = (1 << (FRAC_BITS + 1)) - a;
    let above = if logit_q48 > 0 {
        exp_exceeds(magnitude, b, a)
    } else {
        !exp_exceeds(magnitude, a, b)
    };
    if above {
        upper
    } else {
        upper - 1
    }
}

/// Whether `factor * e^(m / 2^48) > bound`, from lower and upper sums of the series of `e^(m / 2^48)` in units of
/// `2^-(64 limbs)`, doubling `limbs` until the two sums fall on the same side of `bound`.
fn exp_exceeds(m: u128, factor: u128, bound: u128) -> bool {
    let mut limbs = 2;
    loop {
        let (low, high) = exp_series_bounds(m, limbs);
        let mut target = vec![0; limbs + 2];
        target[limbs] = bound as u64;
        if big_cmp(&big_mul_small(&low, factor as u64), &target).is_gt() {
            return true;
        }
        if big_cmp(&big_mul_small(&high, factor as u64), &target).is_lt() {
            return false;
        }
        limbs *= 2;
    }
}

/// `(low, high)` with `low <= 2^(64 limbs) e^(m / 2^48) <= high`: the terms `y^n / n!` rounded down and up, and,
/// once `n + 1 >= 2y`, the remaining terms bounded by the last upper term.
fn exp_series_bounds(m: u128, limbs: usize) -> (Vec<u64>, Vec<u64>) {
    let mut one = vec![0; limbs + 2];
    one[limbs] = 1;
    let (mut low, mut high) = (one.clone(), one.clone());
    let (mut low_term, mut high_term) = (one.clone(), one);
    let mut n: u64 = 1;
    loop {
        low_term = big_scale(&low_term, m as u64, n, false);
        high_term = big_scale(&high_term, m as u64, n, true);
        big_add(&mut low, &low_term);
        big_add(&mut high, &high_term);
        let tail_bounded = u128::from(n + 1) << LOGIT_BITS >= 2 * m;
        if tail_bounded && high_term[1..].iter().all(|&limb| limb == 0) && high_term[0] <= 1 {
            big_add(&mut high, &high_term);
            return (low, high);
        }
        n += 1;
    }
}

/// `term * m / (n 2^48)`, rounded down or up, on little-endian u64 limbs of a fixed width.
fn big_scale(term: &[u64], m: u64, n: u64, round_up: bool) -> Vec<u64> {
    let mut value = big_mul_small(term, m);
    for divisor in [1 << LOGIT_BITS, n] {
        let mut remainder = 0u128;
        for limb in value.iter_mut().rev() {
            let current = (remainder << 64) | u128::from(*limb);
            *limb = (current / u128::from(divisor)) as u64;
            remainder = current % u128::from(divisor);
        }
        if round_up && remainder != 0 {
            big_add(&mut value, &[1]);
        }
    }
    value
}

fn big_mul_small(value: &[u64], factor: u64) -> Vec<u64> {
    let mut carry = 0u128;
    value
        .iter()
        .map(|&limb| {
            let product = u128::from(limb) * u128::from(factor) + carry;
            carry = product >> 64;
            product as u64
        })
        .collect()
}

fn big_add(sum: &mut [u64], value: &[u64]) {
    let mut carry = 0u128;
    for (i, limb) in sum.iter_mut().enumerate() {
        let total = u128::from(*limb) + u128::from(value.get(i).copied().unwrap_or(0)) + carry;
        *limb = total as u64;
        carry = total >> 64;
    }
}

fn big_cmp(a: &[u64], b: &[u64]) -> std::cmp::Ordering {
    a.iter().rev().cmp(b.iter().rev())
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXPECTED: &str = include_str!("../tests/fixtures/expected-int.hbp");

    fn row_value(line: &str, key: &str) -> i128 {
        line.split('|')
            .skip(1)
            .map(|field| field.split_once('=').expect("key=value"))
            .find(|&(k, _)| k == key)
            .map(|(_, v)| v.parse().expect("integer"))
            .expect("field present")
    }

    #[test]
    fn ln2_matches_the_decimal_constant() {
        let line = EXPECTED
            .lines()
            .find(|l| l.starts_with("CONST|name=LN2_Q62|"))
            .expect("LN2_Q62 row");
        assert_eq!(row_value(line, "value"), LN2_EXP as i128);
    }

    #[test]
    fn sigmoid_matches_the_decimal_reference_exactly() {
        let mut rows = 0;
        for line in EXPECTED.lines().filter(|l| l.starts_with("SIGMOID|")) {
            let logit = row_value(line, "logit_q48");
            let want = row_value(line, "q24");
            assert_eq!(i128::from(sigmoid_q24(logit)), want, "{line}");
            rows += 1;
        }
        assert!(rows >= 1700, "{rows} sigmoid rows");
    }

    #[test]
    fn sigmoid_is_monotone_and_symmetric() {
        let mut previous = 0;
        let step = 1i128 << 40;
        let mut logit = -(20i128 << 48);
        while logit <= 20i128 << 48 {
            let p = sigmoid_q24(logit);
            assert!(p >= previous, "logit {logit}");
            assert_eq!(p + sigmoid_q24(-logit), ONE_Q24, "logit {logit}");
            previous = p;
            logit += step;
        }
        assert_eq!(sigmoid_q24(0), ONE_Q24 / 2);
        assert_eq!(sigmoid_q24(i128::MAX), ONE_Q24);
        assert_eq!(sigmoid_q24(i128::MIN), 0);
    }

    #[test]
    fn exp_exceeds_doubles_the_precision_until_the_sums_decide() {
        // p / q is a convergent of e with q e - p = 1.6e-20, which the 128-bit sums leave undecided.
        let (p, q) = (5_739_439_214_861_417_731u128, 2_111_421_691_000_680_031u128);
        let (low, high) = exp_series_bounds(1 << LOGIT_BITS, 2);
        let target = [0, 0, p as u64, 0];
        assert!(big_cmp(&big_mul_small(&low, q as u64), &target).is_le());
        assert!(big_cmp(&big_mul_small(&high, q as u64), &target).is_ge());
        assert!(exp_exceeds(1 << LOGIT_BITS, q, p));
        assert!(!exp_exceeds(1 << LOGIT_BITS, q, p + 1));
    }

    fn max_row_l1<const IN: usize>(weight: &[[i32; IN]]) -> u128 {
        weight
            .iter()
            .map(|row| row.iter().map(|w| u128::from(w.unsigned_abs())).sum())
            .max()
            .unwrap_or(0)
    }

    fn max_abs(values: &[i32]) -> u128 {
        values
            .iter()
            .map(|w| u128::from(w.unsigned_abs()))
            .max()
            .unwrap_or(0)
    }

    fn checked(value: Option<u128>) -> u128 {
        let value = value.expect("bound fits u128");
        assert!(value <= i128::MAX as u128, "bound {value} exceeds i128");
        value
    }

    /// Bound on |output| of `linear` for inputs bounded by `magnitude`, with the sum checked against i128.
    fn linear_bound(magnitude: u128, weight_l1: u128, bias: u128) -> u128 {
        let sum = checked(
            magnitude
                .checked_mul(weight_l1)
                .and_then(|v| v.checked_add(bias << FRAC_BITS))
                .and_then(|v| v.checked_add(1 << (FRAC_BITS - 1))),
        );
        (sum >> FRAC_BITS) + 1
    }

    #[test]
    fn no_intermediate_overflows_for_any_i64_input() {
        let conv1 = linear_bound(1 << 63, max_row_l1(&CONV1_W), max_abs(&CONV1_B));
        let conv2 = linear_bound(conv1, max_row_l1(&CONV2_W), max_abs(&CONV2_B));
        let proj0 = linear_bound(conv2, max_row_l1(&PROJ0_W), max_abs(&PROJ0_B));
        let embedding = linear_bound(proj0, max_row_l1(&PROJ2_W), max_abs(&PROJ2_B));
        let prototype = PROTOTYPES
            .iter()
            .flatten()
            .map(|p| max_abs(p))
            .max()
            .unwrap_or(0);
        let diff = checked(embedding.checked_add(prototype));
        let distance = checked(
            diff.checked_mul(diff)
                .and_then(|v| v.checked_mul(HIDDEN as u128)),
        );
        let logit = checked(distance.checked_mul(INVERSE_TEMPERATURE as u128));
        let logit_difference = checked(logit.checked_mul(2));
        assert!(
            logit_difference < 1 << 120,
            "logit difference bound 2^{}",
            128 - logit_difference.leading_zeros()
        );
    }
}
