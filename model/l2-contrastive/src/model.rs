//! `ContrastiveGNN.forward` (contrastive_gnn.py:92-122) in eval mode, in Q24 integers.
//!
//! `conv1` and `conv2` are the fallback `GCNConv` of contrastive_gnn.py:17-23, a module holding one
//! `nn.Linear` named `lin` whose `forward(x, edge_index)` returns `self.lin(x)`: the class the
//! checkpoint's keys (`conv1.lin.bias`) and module paths (`conv1`, `conv1.lin`, no `aggr_module`)
//! record. Each node's embedding therefore depends on its own features only, and each edge's outputs
//! on the features of its two end nodes.

use crate::weights::{
    CLS1_B, CLS1_W, CLS2_B, CLS2_W, CONV1_B, CONV1_W, CONV2_B, CONV2_W, EDGE_B, EDGE_W, PROJ1_B,
    PROJ1_W, PROJ2_B, PROJ2_W,
};
use std::fmt;

/// Fractional bits of every fixed-point value: Q24 is units of 2^-24.
pub const FRAC_BITS: u32 = 24;
/// `node_input_dim` of the checkpoint (`conv1.lin.weight` is 64 x 6).
pub const NODE_FEATURES: usize = 6;
/// `hidden_dim` of the checkpoint.
pub const HIDDEN: usize = 64;
/// `projection_dim` of the checkpoint (the default of contrastive_gnn.py:40).
pub const PROJECTION: usize = 64;

const ONE_Q24: i64 = 1 << FRAC_BITS;
const EXP_BITS: u32 = 62;
const ONE_EXP: u128 = 1 << EXP_BITS;
const LN2_EXP: u128 = 3_196_577_161_300_663_915;
const SIGMOID_SATURATION_Q48: u128 = 18 << (2 * FRAC_BITS);
/// `F.normalize`'s `eps=1e-12` as the float32 the clamp applies: 9223372 * 2^-63.
const EPS_SIGNIFICAND: u128 = 9_223_372;
/// eps in Q48 is 9223372 / 2^15, about 281.47 units.
const EPS_Q48_SHIFT: u32 = 15;
/// Any component of magnitude >= 282 (Q48) puts the norm above eps.
const EPS_Q48_CEIL: u128 = 282;
/// Before the square root the vector is scaled so its largest component is below 2^51.
const NORM_TOP_BITS: u32 = 51;
/// The square root is taken to 2^-8 of a unit of the scaled vector.
const NORM_ROOT_BITS: u32 = 8;

/// Why [`edge_outputs`] or [`anomaly_probabilities`] gives no outputs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModelError {
    /// Edge number `edge` names a node index `>= x.len()`; torch raises IndexError there.
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

/// Both outputs of `forward(x, edge_index, return_projections=True)` for one edge.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EdgeOutput {
    /// `probs[:, 1]` (contrastive_gnn.py:113-118, 120-121), Q24 in 0..=2^24.
    pub anomaly_q24: i64,
    /// `F.normalize(projection_head(edge_embeddings), p=2, dim=1)` (contrastive_gnn.py:87-90), Q24.
    pub projection_q24: [i64; PROJECTION],
}

/// `forward(x, edge_index)`: `probs[:, 1]` per edge, Q24 in 0..=2^24 (contrastive_gnn.py:120-121).
/// No edges gives no outputs, as the torch forward returns an empty tensor.
pub fn anomaly_probabilities(
    x: &[[i64; NODE_FEATURES]],
    edges: &[(usize, usize)],
) -> Result<Vec<i64>, ModelError> {
    let nodes = encode_nodes(x, edges)?;
    Ok(edges
        .iter()
        .map(|&(source, target)| anomaly_q24(&edge_embedding(&nodes[source], &nodes[target])))
        .collect())
}

/// `forward(x, edge_index, return_projections=True)`: `(probs[:, 1], projections)` per edge
/// (contrastive_gnn.py:116-118).
pub fn edge_outputs(
    x: &[[i64; NODE_FEATURES]],
    edges: &[(usize, usize)],
) -> Result<Vec<EdgeOutput>, ModelError> {
    let nodes = encode_nodes(x, edges)?;
    Ok(edges
        .iter()
        .map(|&(source, target)| outputs(&edge_embedding(&nodes[source], &nodes[target])))
        .collect())
}

/// The outputs of the edge `source -> target`: [`edge_outputs`] on nodes `[source, target]`,
/// edges `[[0, 1]]`, which equals its value for that edge in any graph.
pub fn edge_output(source: &[i64; NODE_FEATURES], target: &[i64; NODE_FEATURES]) -> EdgeOutput {
    outputs(&edge_embedding(&encode_node(source), &encode_node(target)))
}

fn outputs(edge: &[i128; HIDDEN]) -> EdgeOutput {
    EdgeOutput {
        anomaly_q24: anomaly_q24(edge),
        projection_q24: projection_q24(edge),
    }
}

fn round_shift(value: i128, bits: u32) -> i128 {
    (value + (1 << (bits - 1))) >> bits
}

/// `nn.Linear`: bias plus the weighted sum, in Q48 (Q24 inputs times Q24 weights), not rounded.
fn linear_q48<const IN: usize, const OUT: usize>(
    input: &[i128; IN],
    weight: &[[i32; IN]; OUT],
    bias: &[i32; OUT],
) -> [i128; OUT] {
    std::array::from_fn(|out| {
        input
            .iter()
            .zip(&weight[out])
            .fold(i128::from(bias[out]) << FRAC_BITS, |sum, (&value, &w)| {
                sum + value * i128::from(w)
            })
    })
}

/// `nn.Linear` rounded half up to Q24 once per output.
fn linear_q24<const IN: usize, const OUT: usize>(
    input: &[i128; IN],
    weight: &[[i32; IN]; OUT],
    bias: &[i32; OUT],
) -> [i128; OUT] {
    linear_q48(input, weight, bias).map(|sum| round_shift(sum, FRAC_BITS))
}

fn relu<const N: usize>(values: [i128; N]) -> [i128; N] {
    values.map(|v| v.max(0))
}

fn encode_nodes(
    x: &[[i64; NODE_FEATURES]],
    edges: &[(usize, usize)],
) -> Result<Vec<[i128; HIDDEN]>, ModelError> {
    if let Some(edge) = edges
        .iter()
        .position(|&(source, target)| source >= x.len() || target >= x.len())
    {
        return Err(ModelError::NodeIndexOutOfRange { edge });
    }
    Ok(x.iter().map(encode_node).collect())
}

/// `encode_nodes` (contrastive_gnn.py:72-78): conv1, ReLU, dropout (off in eval), conv2.
fn encode_node(features: &[i64; NODE_FEATURES]) -> [i128; HIDDEN] {
    let input = features.map(i128::from);
    let conv1 = relu(linear_q24(&input, &CONV1_W, &CONV1_B));
    linear_q24(&conv1, &CONV2_W, &CONV2_B)
}

/// `get_edge_embeddings` (contrastive_gnn.py:80-85): `edge_mlp(cat(h[row], h[col]))`, that is
/// Linear(128, 64), ReLU, Dropout(0.3) (off in eval).
fn edge_embedding(source: &[i128; HIDDEN], target: &[i128; HIDDEN]) -> [i128; HIDDEN] {
    let mut cat = [0i128; 2 * HIDDEN];
    cat[..HIDDEN].copy_from_slice(source);
    cat[HIDDEN..].copy_from_slice(target);
    relu(linear_q24(&cat, &EDGE_W, &EDGE_B))
}

/// `classifier` then `F.softmax(logits, dim=-1)[:, 1]` (contrastive_gnn.py:113-114, 121).
/// For two classes softmax's second entry is the sigmoid of `logits[1] - logits[0]`.
fn anomaly_q24(edge: &[i128; HIDDEN]) -> i64 {
    let hidden = relu(linear_q24(edge, &CLS1_W, &CLS1_B));
    let logits = linear_q48(&hidden, &CLS2_W, &CLS2_B);
    sigmoid_q24(logits[1] - logits[0])
}

/// `get_projections` (contrastive_gnn.py:87-90): `projection_head`, then `F.normalize(p=2, dim=1)`.
fn projection_q24(edge: &[i128; HIDDEN]) -> [i64; PROJECTION] {
    let hidden = relu(linear_q24(edge, &PROJ1_W, &PROJ1_B));
    normalize_q24(&linear_q48(&hidden, &PROJ2_W, &PROJ2_B))
}

fn isqrt(n: u128) -> u128 {
    if n < 2 {
        return n;
    }
    let mut root = 1u128 << ((128 - n.leading_zeros()).div_ceil(2));
    loop {
        let next = (root + n / root) / 2;
        if next >= root {
            return root;
        }
        root = next;
    }
}

fn divide_round(numerator: i128, denominator: i128) -> i64 {
    // floor(numerator / denominator + 1/2), denominator > 0.
    let rounded = (2 * numerator + denominator).div_euclid(2 * denominator);
    i64::try_from(rounded).unwrap_or(if rounded < 0 { i64::MIN } else { i64::MAX })
}

/// `F.normalize(v, p=2, dim=1, eps=1e-12)` = `v / max(||v||_2, eps)` (torch/nn/functional.py:6126-6127)
/// of a Q48 vector, rounded half up to Q24 per component. Equal to the exact reference on the 126
/// committed vectors; a vector with a component above 2^51 is rounded when scaled to 51 bits, so a
/// component at a half-unit tie there can be 1 unit away.
fn normalize_q24(v_q48: &[i128; PROJECTION]) -> [i64; PROJECTION] {
    let max = v_q48.iter().map(|v| v.unsigned_abs()).max().unwrap_or(0);
    if max < EPS_Q48_CEIL {
        let sum: u128 = v_q48.iter().map(|v| v.unsigned_abs().pow(2)).sum();
        if sum << (2 * EPS_Q48_SHIFT) < EPS_SIGNIFICAND * EPS_SIGNIFICAND {
            // ||v|| < eps: v / eps, in Q24 = v * 2^(24 + 15) / 9223372.
            let eps = EPS_SIGNIFICAND as i128;
            return v_q48.map(|v| divide_round(v << (FRAC_BITS + EPS_Q48_SHIFT), eps));
        }
    }
    let bits = 128 - max.leading_zeros();
    let scaled: [i128; PROJECTION] = if bits > NORM_TOP_BITS {
        // floor(v / 2^s + 1/2), without forming v + 2^(s-1).
        let shift = bits - NORM_TOP_BITS;
        v_q48.map(|v| ((v >> (shift - 1)) + 1) >> 1)
    } else {
        v_q48.map(|v| v << (NORM_TOP_BITS - bits))
    };
    let sum: u128 = scaled.iter().map(|v| v.unsigned_abs().pow(2)).sum();
    let root = isqrt(sum << (2 * NORM_ROOT_BITS)) as i128;
    scaled.map(|v| divide_round(v << (FRAC_BITS + NORM_ROOT_BITS), root))
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

/// 2^24 / (1 + e^-t) for t = logit_q48 / 2^48, through a Q62 range-reduced e^-|t|, rounded half
/// up once. Equal to floor(2^24 / (1 + e^-t) + 1/2) on the 1,511 committed logits; next to a
/// half-unit tie (measured: exact values less than 2^-39 units from it) it can be 1 unit away.
fn sigmoid_q24(logit_q48: i128) -> i64 {
    let magnitude = logit_q48.unsigned_abs();
    if magnitude > SIGMOID_SATURATION_Q48 {
        return if logit_q48 > 0 { ONE_Q24 } else { 0 };
    }
    let decay = exp_neg(magnitude << (EXP_BITS - 2 * FRAC_BITS));
    let denominator = ONE_EXP + decay;
    let numerator = if logit_q48 >= 0 { ONE_EXP } else { decay };
    let rounded = ((numerator << (FRAC_BITS + 1)) + denominator) / (2 * denominator);
    i64::try_from(rounded).unwrap_or(ONE_Q24)
}

#[cfg(test)]
mod tests {
    use super::*;

    const MATH: &str = include_str!("../tests/fixtures/expected-math.hbp");

    fn fields(line: &str) -> impl Iterator<Item = (&str, &str)> {
        line.split('|')
            .skip(1)
            .map(|field| field.split_once('=').expect("key=value"))
    }

    fn field<'a>(line: &'a str, key: &str) -> &'a str {
        fields(line)
            .find(|&(k, _)| k == key)
            .map(|(_, v)| v)
            .expect("field present")
    }

    fn integers(value: &str) -> Vec<i128> {
        value
            .split(',')
            .map(|v| v.parse().expect("integer"))
            .collect()
    }

    #[test]
    fn ln2_matches_the_decimal_constant() {
        let line = MATH
            .lines()
            .find(|l| l.starts_with("CONST|name=LN2_Q62|"))
            .expect("LN2_Q62 row");
        assert_eq!(integers(field(line, "value")), [LN2_EXP as i128]);
    }

    #[test]
    fn sigmoid_matches_the_decimal_reference_exactly() {
        let mut rows = 0;
        for line in MATH.lines().filter(|l| l.starts_with("SIGMOID|")) {
            let logit = integers(field(line, "logit_q48"))[0];
            let want = integers(field(line, "q24"))[0];
            assert_eq!(i128::from(sigmoid_q24(logit)), want, "{line}");
            rows += 1;
        }
        assert!(rows >= 1000, "{rows} sigmoid rows");
    }

    #[test]
    fn sigmoid_is_monotone_and_symmetric() {
        let mut previous = 0;
        let step = 1i128 << 40;
        let mut logit = -(20i128 << 48);
        while logit <= 20i128 << 48 {
            let p = sigmoid_q24(logit);
            assert!(p >= previous, "logit {logit}");
            let sum = p + sigmoid_q24(-logit);
            assert!(sum == ONE_Q24 || sum == ONE_Q24 + 1, "logit {logit}: {sum}");
            previous = p;
            logit += step;
        }
        assert_eq!(sigmoid_q24(0), ONE_Q24 / 2);
        assert_eq!(sigmoid_q24(i128::MAX), ONE_Q24);
        assert_eq!(sigmoid_q24(i128::MIN), 0);
    }

    #[test]
    fn normalize_matches_the_decimal_reference_exactly() {
        let mut rows = 0;
        for line in MATH.lines().filter(|l| l.starts_with("NORMALIZE|")) {
            let v: [i128; PROJECTION] = integers(field(line, "v_q48"))
                .try_into()
                .expect("64 components");
            let want = integers(field(line, "q24"));
            let got: Vec<i128> = normalize_q24(&v).iter().map(|&q| i128::from(q)).collect();
            assert_eq!(got, want, "{line}");
            rows += 1;
        }
        assert!(rows >= 100, "{rows} normalize rows");
    }

    #[test]
    fn isqrt_is_the_floor_square_root() {
        for n in (0u128..5000).chain([u128::MAX, 1 << 66, (1 << 66) - 1, 1 << 127]) {
            let r = isqrt(n);
            assert!(r * r <= n, "{n}");
            assert!((r + 1).checked_mul(r + 1).map_or(true, |s| s > n), "{n}");
        }
    }

    #[test]
    fn eps_bound_is_the_float32_of_1e_minus_12() {
        // The float32 nearest 1e-12 has bits 0x2B8CBCCC: significand 0x8CBCCC = 9223372, scale 2^-63.
        assert_eq!(EPS_SIGNIFICAND, 0x8C_BCCC);
        // 281^2 * 2^30 < 9223372^2 < 282^2 * 2^30: eps in Q48 lies in (281, 282).
        let eps_squared = EPS_SIGNIFICAND * EPS_SIGNIFICAND;
        assert!((EPS_Q48_CEIL - 1).pow(2) << (2 * EPS_Q48_SHIFT) < eps_squared);
        assert!(EPS_Q48_CEIL.pow(2) << (2 * EPS_Q48_SHIFT) > eps_squared);
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

    /// Largest |Q48 sum| of a layer, and the largest |Q24 output| after rounding.
    fn layer(magnitude: u128, weight_l1: u128, bias: u128) -> (u128, u128) {
        let sum = checked(
            magnitude
                .checked_mul(weight_l1)
                .and_then(|v| v.checked_add(bias << FRAC_BITS))
                .and_then(|v| v.checked_add(1 << (FRAC_BITS - 1))),
        );
        (sum, (sum >> FRAC_BITS) + 1)
    }

    #[test]
    fn no_intermediate_overflows_for_any_i64_input() {
        let (_, conv1) = layer(1 << 63, max_row_l1(&CONV1_W), max_abs(&CONV1_B));
        let (_, conv2) = layer(conv1, max_row_l1(&CONV2_W), max_abs(&CONV2_B));
        let (_, edge) = layer(conv2, max_row_l1(&EDGE_W), max_abs(&EDGE_B));
        let (_, cls1) = layer(edge, max_row_l1(&CLS1_W), max_abs(&CLS1_B));
        let logit_l1: u128 = CLS2_W[0]
            .iter()
            .zip(&CLS2_W[1])
            .map(|(&a, &b)| u128::from((i64::from(b) - i64::from(a)).unsigned_abs()))
            .sum();
        let (logit_sum, _) = layer(cls1, max_row_l1(&CLS2_W), max_abs(&CLS2_B));
        let (difference_sum, _) = layer(cls1, logit_l1, max_abs(&CLS2_B) * 2);
        let (_, proj1) = layer(edge, max_row_l1(&PROJ1_W), max_abs(&PROJ1_B));
        let (proj2_sum, _) = layer(proj1, max_row_l1(&PROJ2_W), max_abs(&PROJ2_B));
        for (name, bound) in [
            ("logit", logit_sum),
            ("logit difference", difference_sum),
            ("projection", proj2_sum),
        ] {
            assert!(
                bound < 1 << 120,
                "{name} bound 2^{}",
                128 - bound.leading_zeros()
            );
        }
        // normalize_q24 scales below 2^51 (2^51 after rounding): 64 squares and the root fit u128.
        let scaled_square_sum = (PROJECTION as u128) << (2 * NORM_TOP_BITS);
        assert!(scaled_square_sum.checked_shl(2 * NORM_ROOT_BITS).is_some());
        assert!(scaled_square_sum << (2 * NORM_ROOT_BITS) < 1 << 125);
    }

    #[test]
    fn normalize_handles_zero_tiny_and_extreme_vectors() {
        assert_eq!(normalize_q24(&[0; PROJECTION]), [0; PROJECTION]);
        let mut one_hot = [0i128; PROJECTION];
        for v in [
            1,
            281,
            282,
            1 << 40,
            1 << 51,
            1 << 52,
            i128::MAX,
            -i128::MAX,
        ] {
            one_hot[7] = v;
            let out = normalize_q24(&one_hot);
            let want = if v.unsigned_abs() < 282 {
                divide_round(v << 39, EPS_SIGNIFICAND as i128)
            } else {
                ONE_Q24 * v.signum() as i64
            };
            assert_eq!(out[7], want, "{v}");
            assert!(out.iter().enumerate().all(|(i, &q)| i == 7 || q == 0));
        }
    }
}
