//! Model weights: a hand-set default table and dimension-checked loading of caller weights.

use crate::Error;

/// Raw Q16 weights as supplied by a caller. Matrices are row-major `[input][output]`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RawWeights {
    /// Node feature width.
    pub in_dim: usize,
    /// Embedding width of both GCN layers and of the head's hidden layer.
    pub hidden: usize,
    /// GCN layer 1 weight, `in_dim x hidden`.
    pub gcn1_w: Vec<i32>,
    /// GCN layer 1 bias, `hidden`.
    pub gcn1_b: Vec<i32>,
    /// GCN layer 2 weight, `hidden x hidden`.
    pub gcn2_w: Vec<i32>,
    /// GCN layer 2 bias, `hidden`.
    pub gcn2_b: Vec<i32>,
    /// Head layer 1 weight over `[h_u || h_v]`, `2*hidden x hidden`.
    pub head1_w: Vec<i32>,
    /// Head layer 1 bias, `hidden`.
    pub head1_b: Vec<i32>,
    /// Head output weight, `hidden`.
    pub head2_w: Vec<i32>,
    /// Head output bias.
    pub head2_b: i32,
}

/// Weights whose dimensions have been checked.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Weights(RawWeights);

impl Weights {
    /// Validates every array length against `in_dim` and `hidden`.
    pub fn new(raw: RawWeights) -> Result<Self, Error> {
        if raw.in_dim == 0 || raw.hidden == 0 {
            return Err(Error::ZeroDimension);
        }
        let (i, h) = (raw.in_dim, raw.hidden);
        let checks: [(&'static str, Option<usize>, usize); 7] = [
            ("gcn1_w", i.checked_mul(h), raw.gcn1_w.len()),
            ("gcn1_b", Some(h), raw.gcn1_b.len()),
            ("gcn2_w", h.checked_mul(h), raw.gcn2_w.len()),
            ("gcn2_b", Some(h), raw.gcn2_b.len()),
            ("head1_w", h.checked_mul(h).and_then(|x| x.checked_mul(2)), raw.head1_w.len()),
            ("head1_b", Some(h), raw.head1_b.len()),
            ("head2_w", Some(h), raw.head2_w.len()),
        ];
        for (what, expected, got) in checks {
            let expected = expected.ok_or(Error::DimensionOverflow)?;
            if expected != got {
                return Err(Error::DimensionMismatch { what, expected, got });
            }
        }
        Ok(Self(raw))
    }

    /// The built-in table. **UNTRAINED and HAND-SET**: chosen by hand so signals propagate,
    /// not fitted to any data. Output scores carry no predictive meaning.
    pub fn hand_set() -> Self {
        Self(RawWeights {
            in_dim: HAND_SET_IN_DIM,
            hidden: HAND_SET_HIDDEN,
            gcn1_w: sixteenths(&HAND_SET_GCN1_W),
            gcn1_b: sixteenths(&HAND_SET_GCN1_B),
            gcn2_w: sixteenths(&HAND_SET_GCN2_W),
            gcn2_b: sixteenths(&HAND_SET_GCN2_B),
            head1_w: sixteenths(&HAND_SET_HEAD1_W),
            head1_b: sixteenths(&HAND_SET_HEAD1_B),
            head2_w: sixteenths(&HAND_SET_HEAD2_W),
            head2_b: HAND_SET_HEAD2_B * SIXTEENTH,
        })
    }

    /// The validated weights.
    pub fn raw(&self) -> &RawWeights {
        &self.0
    }
}

/// Feature width of the hand-set table.
pub const HAND_SET_IN_DIM: usize = 4;
/// Hidden width of the hand-set table.
pub const HAND_SET_HIDDEN: usize = 4;

// UNTRAINED / HAND-SET. Entries are in sixteenths (8 = 0.5); scaled to Q16 by `SIXTEENTH`.
const SIXTEENTH: i32 = crate::q16::ONE / 16;

#[rustfmt::skip]
const HAND_SET_GCN1_W: [i32; 16] = [
     8,  4,  0,  2,
     4,  8,  2,  0,
     0,  2,  8, -4,
    -2,  0,  4,  8,
];
const HAND_SET_GCN1_B: [i32; 4] = [1, 0, 1, -1];

#[rustfmt::skip]
const HAND_SET_GCN2_W: [i32; 16] = [
     6,  2, -2,  4,
     2,  6,  4, -2,
     4, -2,  6,  2,
    -2,  4,  2,  6,
];
const HAND_SET_GCN2_B: [i32; 4] = [0, 1, -1, 0];

#[rustfmt::skip]
const HAND_SET_HEAD1_W: [i32; 32] = [
     4,  2,  0, -2,
     2,  4, -2,  0,
     0, -2,  4,  2,
    -2,  0,  2,  4,
     4, -2,  2,  0,
    -2,  4,  0,  2,
     2,  0,  4, -2,
     0,  2, -2,  4,
];
const HAND_SET_HEAD1_B: [i32; 4] = [0, 1, 0, -1];
const HAND_SET_HEAD2_W: [i32; 4] = [8, -4, 6, -2];
const HAND_SET_HEAD2_B: i32 = -4;

fn sixteenths(table: &[i32]) -> Vec<i32> {
    table.iter().map(|&x| x * SIXTEENTH).collect()
}
