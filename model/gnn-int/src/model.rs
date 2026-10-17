//! GCN layers and the edge-scoring head.

use crate::graph::Graph;
use crate::q16::{round_shift_wide, saturate, FRAC_BITS};
use crate::weights::Weights;
use crate::Error;

fn check_len(what: &'static str, rows: usize, cols: usize, got: usize) -> Result<(), Error> {
    let expected = rows.checked_mul(cols).ok_or(Error::DimensionOverflow)?;
    if expected == got {
        Ok(())
    } else {
        Err(Error::DimensionMismatch { what, expected, got })
    }
}

/// One GCN layer: `ReLU(Â · H · W + b)` with `Â = D^-1/2 (A+I) D^-1/2`.
///
/// `h` is `n x in_dim`, `w` is `in_dim x out_dim`, `b` is `out_dim`, all Q16 row-major.
/// Sums are `i128` (saturating; exact for any input that fits in memory); each output is
/// rounded once (half away from zero), saturated to `i32`, then ReLU'd. Zero dims are `Err`.
pub fn gcn_layer(
    graph: &Graph,
    h: &[i32],
    in_dim: usize,
    w: &[i32],
    b: &[i32],
    out_dim: usize,
) -> Result<Vec<i32>, Error> {
    if in_dim == 0 || out_dim == 0 {
        return Err(Error::ZeroDimension);
    }
    let n = graph.node_count();
    check_len("features", n, in_dim, h.len())?;
    check_len("weight", in_dim, out_dim, w.len())?;
    check_len("bias", 1, out_dim, b.len())?;

    // H·W per node, exact Q32.
    let mut hw = vec![0i128; n * out_dim];
    for (row, out) in h.chunks_exact(in_dim).zip(hw.chunks_exact_mut(out_dim)) {
        for (&x, w_row) in row.iter().zip(w.chunks_exact(out_dim)) {
            for (acc, &wk) in out.iter_mut().zip(w_row) {
                *acc = acc.saturating_add(i128::from(i64::from(x) * i64::from(wk)));
            }
        }
    }

    // Â·(H·W) + b, exact Q48, one rounding to Q16.
    let mut out = vec![0i32; n * out_dim];
    let mut acc = vec![0i128; out_dim];
    for (i, out_row) in out.chunks_exact_mut(out_dim).enumerate() {
        for (a, &bias) in acc.iter_mut().zip(b) {
            *a = i128::from(bias) << (2 * FRAC_BITS);
        }
        for (&j, &c) in graph.neighbors(i).iter().zip(graph.coefficients(i)) {
            let src = &hw[j as usize * out_dim..(j as usize + 1) * out_dim];
            for (a, &v) in acc.iter_mut().zip(src) {
                *a = a.saturating_add(v.saturating_mul(i128::from(c)));
            }
        }
        for (o, &a) in out_row.iter_mut().zip(&acc) {
            *o = saturate(round_shift_wide(a, 2 * FRAC_BITS)).max(0);
        }
    }
    Ok(out)
}

/// Hard sigmoid of a Q32 logit, in per-mille: `clamp(1000 * (x/4 + 1/2), 0, 1000)`, one rounding.
pub fn hard_sigmoid_permille(logit_q32: i128) -> u16 {
    // 1000 * (x/4 + 1/2) = 1000 * (x_q32 + 2^33) / 2^34
    let num = logit_q32.saturating_add(1i128 << 33).saturating_mul(1000);
    if num <= 0 {
        0
    } else {
        round_shift_wide(num, 34).min(1000) as u16
    }
}

/// Two GCN layers plus an MLP edge head over `[h_u || h_v]`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EdgeGnn {
    weights: Weights,
}

impl EdgeGnn {
    /// Wraps validated weights.
    pub fn new(weights: Weights) -> Self {
        Self { weights }
    }

    /// Uses the UNTRAINED, hand-set weight table.
    pub fn hand_set() -> Self {
        Self::new(Weights::hand_set())
    }

    /// The model's weights.
    pub fn weights(&self) -> &Weights {
        &self.weights
    }

    /// Node embeddings (`n x hidden`, Q16) after both GCN layers.
    pub fn embed(&self, graph: &Graph, features: &[i32]) -> Result<Vec<i32>, Error> {
        let w = self.weights.raw();
        let h1 = gcn_layer(graph, features, w.in_dim, &w.gcn1_w, &w.gcn1_b, w.hidden)?;
        gcn_layer(graph, &h1, w.hidden, &w.gcn2_w, &w.gcn2_b, w.hidden)
    }

    /// Score in `0..=1000` for the ordered pair `(u, v)` given embeddings from [`EdgeGnn::embed`].
    /// `z = ReLU(W1 [h_u || h_v] + b1)` is rounded to Q16; the logit `w2 · z + b2` is not.
    pub fn score(&self, embeddings: &[i32], u: u32, v: u32) -> Result<u16, Error> {
        let w = self.weights.raw();
        let hidden = w.hidden;
        if embeddings.len() % hidden != 0 {
            return Err(Error::RaggedEmbeddings { len: embeddings.len(), hidden });
        }
        let n = embeddings.len() / hidden;
        let row = |node: u32| -> Result<&[i32], Error> {
            let i = node as usize;
            if i >= n {
                return Err(Error::NodeOutOfRange { node, n });
            }
            Ok(&embeddings[i * hidden..(i + 1) * hidden])
        };
        let (hu, hv) = (row(u)?, row(v)?);

        let mut z: Vec<i128> = w.head1_b.iter().map(|&b| i128::from(b) << FRAC_BITS).collect();
        for (&x, w_row) in hu.iter().chain(hv).zip(w.head1_w.chunks_exact(hidden)) {
            for (acc, &wk) in z.iter_mut().zip(w_row) {
                *acc = acc.saturating_add(i128::from(i64::from(x) * i64::from(wk)));
            }
        }
        let mut logit = i128::from(w.head2_b) << FRAC_BITS;
        for (&zq32, &w2) in z.iter().zip(&w.head2_w) {
            let zq16 = saturate(round_shift_wide(zq32, FRAC_BITS)).max(0);
            logit = logit.saturating_add(i128::from(i64::from(zq16) * i64::from(w2)));
        }
        Ok(hard_sigmoid_permille(logit))
    }

    /// Embeds the graph and scores each ordered pair.
    pub fn score_pairs(
        &self,
        graph: &Graph,
        features: &[i32],
        pairs: &[(u32, u32)],
    ) -> Result<Vec<u16>, Error> {
        let emb = self.embed(graph, features)?;
        pairs.iter().map(|&(u, v)| self.score(&emb, u, v)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::q16::ONE;

    #[test]
    fn hard_sigmoid_points() {
        let q32 = |x: i64| i128::from(x) << 32;
        assert_eq!(hard_sigmoid_permille(0), 500);
        assert_eq!(hard_sigmoid_permille(q32(2)), 1000);
        assert_eq!(hard_sigmoid_permille(q32(-2)), 0);
        assert_eq!(hard_sigmoid_permille(q32(100)), 1000);
        assert_eq!(hard_sigmoid_permille(q32(-100)), 0);
        assert_eq!(hard_sigmoid_permille(q32(1)), 750);
        assert_eq!(hard_sigmoid_permille(q32(-1)), 250);
        // exact ties: x = +-0.25 -> 562.5 / 437.5 -> 563 / 438
        assert_eq!(hard_sigmoid_permille(1i128 << 30), 563);
        assert_eq!(hard_sigmoid_permille(-(1i128 << 30)), 438);
        assert_eq!(hard_sigmoid_permille(i128::MAX), 1000);
        assert_eq!(hard_sigmoid_permille(i128::MIN), 0);
    }

    #[test]
    fn single_node_layer_is_dense_relu() {
        let g = Graph::from_edges(1, &[]).unwrap();
        // x = [1.0, -2.0]; W = [[0.5, 1], [0.25, 1]]; b = [0.125, 0]
        let h = [ONE, -2 * ONE];
        let w = [ONE / 2, ONE, ONE / 4, ONE];
        let b = [ONE / 8, 0];
        let out = gcn_layer(&g, &h, 2, &w, &b, 2).unwrap();
        // 0.5 - 0.5 + 0.125 = 0.125 ; 1 - 2 + 0 = -1 -> ReLU 0
        assert_eq!(out, vec![ONE / 8, 0]);
    }

    #[test]
    fn zero_dims_are_errors_not_panics() {
        let g = Graph::from_edges(2, &[(0, 1)]).unwrap();
        assert_eq!(gcn_layer(&g, &[], 0, &[], &[0; 4], 4), Err(Error::ZeroDimension));
        assert_eq!(gcn_layer(&g, &[ONE; 8], 4, &[], &[], 0), Err(Error::ZeroDimension));
        let empty = Graph::from_edges(0, &[]).unwrap();
        assert_eq!(gcn_layer(&empty, &[], 0, &[], &[], 0), Err(Error::ZeroDimension));
        assert_eq!(gcn_layer(&empty, &[], 0, &[], &[0; 2], 2), Err(Error::ZeroDimension));
        assert_eq!(gcn_layer(&empty, &[], 2, &[], &[], 0), Err(Error::ZeroDimension));
    }
}
