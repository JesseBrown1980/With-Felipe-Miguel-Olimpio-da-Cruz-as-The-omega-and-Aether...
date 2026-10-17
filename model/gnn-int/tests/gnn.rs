#![forbid(unsafe_code)]

use asolaria_gnn_int::q16::ONE;
use asolaria_gnn_int::{gcn_coefficient, gcn_layer, EdgeGnn, Error, Graph, RawWeights, Weights};

const H: usize = 4;

/// Expected `round(65536 / sqrt(i*j))` for degrees 1..=8, computed independently with
/// 60-digit decimal arithmetic and ROUND_HALF_UP.
#[rustfmt::skip]
const NORM_TABLE: [[i32; 8]; 8] = [
    [65536, 46341, 37837, 32768, 29309, 26755, 24770, 23170],
    [46341, 32768, 26755, 23170, 20724, 18919, 17515, 16384],
    [37837, 26755, 21845, 18919, 16921, 15447, 14301, 13377],
    [32768, 23170, 18919, 16384, 14654, 13377, 12385, 11585],
    [29309, 20724, 16921, 14654, 13107, 11965, 11078, 10362],
    [26755, 18919, 15447, 13377, 11965, 10923, 10112,  9459],
    [24770, 17515, 14301, 12385, 11078, 10112,  9362,  8758],
    [23170, 16384, 13377, 11585, 10362,  9459,  8758,  8192],
];

fn features(n: usize, seed: i32) -> Vec<i32> {
    (0..n * 4)
        .map(|k| ((k as i32 * 7 + seed) % 11) * (ONE / 8))
        .collect()
}

#[test]
fn normalization_exact_values() {
    for (i, row) in NORM_TABLE.iter().enumerate() {
        for (j, &expected) in row.iter().enumerate() {
            assert_eq!(gcn_coefficient(i as u64 + 1, j as u64 + 1), expected, "d=({},{})", i + 1, j + 1);
        }
    }
}

#[test]
fn graph_coefficients_use_self_loop_degrees() {
    // path 0-1-2: degrees with self-loops are 2, 3, 2
    let g = Graph::from_edges(3, &[(0, 1), (1, 2)]).unwrap();
    assert_eq!(g.neighbors(1), &[0, 1, 2]);
    assert_eq!(g.coefficients(0), &[32768, 26755]);
    assert_eq!(g.coefficients(1), &[26755, 21845, 26755]);
    assert_eq!(g.degree(1), 3);
    assert_eq!(g.degree(99), 0);
    assert!(g.neighbors(99).is_empty());
}

#[test]
fn permutation_invariance() {
    let n = 7;
    let edges = [(0, 1), (1, 2), (2, 3), (3, 0), (2, 4), (4, 5), (1, 5)];
    let perm: [u32; 7] = [3, 6, 0, 5, 1, 4, 2];
    let x = features(n, 3);

    let pe: Vec<(u32, u32)> = edges.iter().map(|&(u, v)| (perm[u as usize], perm[v as usize])).collect();
    let mut px = vec![0; n * 4];
    for i in 0..n {
        let p = perm[i] as usize;
        px[p * 4..p * 4 + 4].copy_from_slice(&x[i * 4..i * 4 + 4]);
    }

    let m = EdgeGnn::hand_set();
    let g = Graph::from_edges(n, &edges).unwrap();
    let pg = Graph::from_edges(n, &pe).unwrap();
    let e = m.embed(&g, &x).unwrap();
    let pe_emb = m.embed(&pg, &px).unwrap();
    for i in 0..n {
        let p = perm[i] as usize;
        assert_eq!(&pe_emb[p * H..p * H + H], &e[i * H..i * H + H], "node {i}");
    }
    for (&(u, v), &(pu, pv)) in edges.iter().zip(&pe) {
        assert_eq!(m.score(&e, u, v).unwrap(), m.score(&pe_emb, pu, pv).unwrap());
        assert_eq!(m.score(&e, v, u).unwrap(), m.score(&pe_emb, pv, pu).unwrap());
    }
}

#[test]
fn two_hop_receptive_field() {
    // path 0-1-2-3, target node 0
    let g = Graph::from_edges(4, &[(0, 1), (1, 2), (2, 3)]).unwrap();
    let m = EdgeGnn::hand_set();
    let base = vec![ONE / 2; 16];
    let e0 = m.embed(&g, &base).unwrap();

    let mut at2 = base.clone();
    at2[2 * 4] += ONE;
    let e2 = m.embed(&g, &at2).unwrap();
    assert_ne!(&e2[..H], &e0[..H], "distance-2 change must reach node 0");

    let mut at3 = base.clone();
    at3[3 * 4] += 4 * ONE;
    at3[3 * 4 + 2] -= 3 * ONE;
    let e3 = m.embed(&g, &at3).unwrap();
    assert_eq!(&e3[..H], &e0[..H], "distance-3 change must not reach node 0");
    assert_ne!(&e3[2 * H..3 * H], &e0[2 * H..3 * H], "but it does reach node 2");
}

#[test]
fn isolated_node_gets_only_self_loop() {
    let m = EdgeGnn::hand_set();
    let x = features(3, 5);
    let g = Graph::from_edges(3, &[(0, 1)]).unwrap();
    assert_eq!(g.neighbors(2), &[2]);
    assert_eq!(g.coefficients(2), &[ONE]);
    let full = m.embed(&g, &x).unwrap();

    let alone = Graph::from_edges(1, &[]).unwrap();
    let solo = m.embed(&alone, &x[8..12]).unwrap();
    assert_eq!(&full[2 * H..3 * H], &solo[..]);

    // Hand check of layer 1 on an isolated node with a one-hot feature: row 0 of W1 + b1.
    let w = Weights::hand_set();
    let r = w.raw();
    let l1 = gcn_layer(&alone, &[ONE, 0, 0, 0], 4, &r.gcn1_w, &r.gcn1_b, H).unwrap();
    assert_eq!(l1, vec![ONE / 2 + ONE / 16, ONE / 4, ONE / 16, ONE / 8 - ONE / 16]);
}

#[test]
fn duplicate_edges_and_given_self_loops_are_absorbed() {
    let clean = Graph::from_edges(4, &[(0, 1), (1, 2), (2, 3)]).unwrap();
    let messy =
        Graph::from_edges(4, &[(1, 0), (0, 1), (0, 1), (2, 2), (1, 2), (3, 2), (2, 1), (0, 0)]).unwrap();
    assert_eq!(clean, messy);
    let m = EdgeGnn::hand_set();
    let x = features(4, 1);
    assert_eq!(m.embed(&clean, &x).unwrap(), m.embed(&messy, &x).unwrap());
}

#[test]
fn out_of_range_node_is_error() {
    assert_eq!(Graph::from_edges(3, &[(0, 3)]), Err(Error::NodeOutOfRange { node: 3, n: 3 }));
    assert_eq!(Graph::from_edges(0, &[(0, 0)]), Err(Error::NodeOutOfRange { node: 0, n: 0 }));
    assert!(matches!(Graph::from_edges(u32::MAX as usize + 2, &[]), Err(Error::TooManyNodes { .. })));
    let m = EdgeGnn::hand_set();
    let g = Graph::from_edges(2, &[(0, 1)]).unwrap();
    let e = m.embed(&g, &features(2, 0)).unwrap();
    assert_eq!(m.score(&e, 0, 2), Err(Error::NodeOutOfRange { node: 2, n: 2 }));
    assert_eq!(m.score_pairs(&g, &features(2, 0), &[(5, 0)]), Err(Error::NodeOutOfRange { node: 5, n: 2 }));
}

#[test]
fn empty_graph_works() {
    let g = Graph::from_edges(0, &[]).unwrap();
    assert_eq!(g.node_count(), 0);
    let m = EdgeGnn::hand_set();
    assert_eq!(m.embed(&g, &[]).unwrap(), Vec::<i32>::new());
    assert_eq!(m.score_pairs(&g, &[], &[]).unwrap(), Vec::<u16>::new());
}

#[test]
fn dimension_checks() {
    let m = EdgeGnn::hand_set();
    let g = Graph::from_edges(2, &[(0, 1)]).unwrap();
    assert_eq!(
        m.embed(&g, &[0; 7]),
        Err(Error::DimensionMismatch { what: "features", expected: 8, got: 7 })
    );
    assert_eq!(
        m.score(&[0; 6], 0, 0),
        Err(Error::RaggedEmbeddings { len: 6, hidden: 4 })
    );

    let good = Weights::hand_set().raw().clone();
    assert_eq!(Weights::new(good.clone()).unwrap(), Weights::hand_set());
    let mut bad = good.clone();
    bad.head1_w.pop();
    assert_eq!(
        Weights::new(bad),
        Err(Error::DimensionMismatch { what: "head1_w", expected: 32, got: 31 })
    );
    let mut zero = good.clone();
    zero.hidden = 0;
    assert_eq!(Weights::new(zero), Err(Error::ZeroDimension));
    assert_eq!(gcn_layer(&g, &[], 0, &[], &[0; 4], 4), Err(Error::ZeroDimension));
    assert_eq!(gcn_layer(&g, &[ONE; 8], 4, &[], &[], 0), Err(Error::ZeroDimension));
    let mut huge = good;
    huge.in_dim = usize::MAX;
    assert_eq!(Weights::new(huge), Err(Error::DimensionOverflow));
}

fn custom_weights(in_dim: usize, hidden: usize, v: i32) -> Weights {
    Weights::new(RawWeights {
        in_dim,
        hidden,
        gcn1_w: vec![v; in_dim * hidden],
        gcn1_b: vec![v; hidden],
        gcn2_w: vec![v; hidden * hidden],
        gcn2_b: vec![v; hidden],
        head1_w: vec![v; 2 * hidden * hidden],
        head1_b: vec![v; hidden],
        head2_w: vec![v; hidden],
        head2_b: v,
    })
    .unwrap()
}

#[test]
fn saturation_does_not_panic() {
    let g = Graph::from_edges(3, &[(0, 1), (1, 2), (0, 2)]).unwrap();
    for x_val in [i32::MAX, i32::MIN] {
        for w_val in [i32::MAX, i32::MIN, ONE] {
            let m = EdgeGnn::new(custom_weights(4, 4, w_val));
            let x = vec![x_val; 12];
            let e = m.embed(&g, &x).unwrap();
            assert!(e.iter().all(|&v| (0..=i32::MAX).contains(&v)));
            for (u, v) in [(0, 1), (1, 2), (2, 0)] {
                assert!(m.score(&e, u, v).unwrap() <= 1000);
            }
        }
    }
    let m = EdgeGnn::new(custom_weights(4, 4, i32::MAX));
    let e = m.embed(&g, &[i32::MAX; 12]).unwrap();
    assert!(e.iter().all(|&v| v == i32::MAX));
    assert_eq!(m.score(&e, 0, 1).unwrap(), 1000);
    let m = EdgeGnn::new(custom_weights(4, 4, i32::MIN));
    let e = m.embed(&g, &[i32::MAX; 12]).unwrap();
    assert!(e.iter().all(|&v| v == 0));
}

#[test]
fn edge_score_always_in_range() {
    // xorshift32: deterministic test inputs only.
    let mut s: u32 = 0x9E37_79B9;
    let mut next = move || {
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        s as i32
    };
    let g = Graph::from_edges(6, &[(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (0, 3)]).unwrap();
    for round in 0..200 {
        let shift = (round % 4) * 6; // span small to full-range values
        let mut r = || next() >> shift;
        let raw = RawWeights {
            in_dim: 4,
            hidden: 3,
            gcn1_w: (0..12).map(|_| r()).collect(),
            gcn1_b: (0..3).map(|_| r()).collect(),
            gcn2_w: (0..9).map(|_| r()).collect(),
            gcn2_b: (0..3).map(|_| r()).collect(),
            head1_w: (0..18).map(|_| r()).collect(),
            head1_b: (0..3).map(|_| r()).collect(),
            head2_w: (0..3).map(|_| r()).collect(),
            head2_b: r(),
        };
        let x: Vec<i32> = (0..24).map(|_| r()).collect();
        let m = EdgeGnn::new(Weights::new(raw).unwrap());
        let pairs: Vec<(u32, u32)> = (0..6).flat_map(|u| (0..6).map(move |v| (u, v))).collect();
        for s in m.score_pairs(&g, &x, &pairs).unwrap() {
            assert!(s <= 1000);
        }
    }
}

#[test]
fn golden_five_node_graph() {
    // 4-cycle 0-1-2-3 with pendant 4 on node 0
    let g = Graph::from_edges(5, &[(0, 1), (1, 2), (2, 3), (3, 0), (0, 4)]).unwrap();
    #[rustfmt::skip]
    let x: Vec<i32> = [
        16, 0, 8, 4,
        0, 16, 4, 8,
        8, 8, 0, 0,
        4, 0, 16, -8,
        -4, 12, 0, 16,
    ]
    .iter()
    .map(|&s| s * (ONE / 16))
    .collect();
    let m = EdgeGnn::hand_set();
    let e = m.embed(&g, &x).unwrap();
    assert_eq!(e, GOLDEN_EMB.to_vec());
    let pairs = [(0, 1), (1, 0), (0, 2), (1, 2), (2, 3), (3, 0), (0, 4), (4, 4)];
    assert_eq!(m.score_pairs(&g, &x, &pairs).unwrap(), GOLDEN_SCORES.to_vec());
}

// Pinned outputs of the hand-set model; cross-checked against an independent integer
// reimplementation. Any change here is a behaviour change.
#[rustfmt::skip]
const GOLDEN_EMB: [i32; 20] = [
    17893, 14886, 10346, 8706,
    16039, 13346, 8230, 5767,
    16624, 13299, 6374, 6097,
    15882, 12097, 7449, 5613,
    11529, 11672, 8243, 6831,
];
const GOLDEN_SCORES: [u16; 8] = [451, 451, 450, 449, 449, 451, 448, 445];
