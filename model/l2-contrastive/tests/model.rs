//! `model` against the vendored ContrastiveGNN with its run-1 checkpoint (tools/model_parity.py,
//! torch 2.14.1+cpu): probs[:, 1] and the return_projections=True projections of every fixture edge.
//! The `mag<K>-<i>` graphs, with features up to 2^K, are checked against a tolerance scaled by 2^K.

use l2_contrastive::{
    anomaly_probabilities, edge_output, edge_outputs, ModelError, NODE_FEATURES, PROJECTION,
};
use std::collections::HashMap;

const EXPECTED: &str = include_str!("fixtures/expected-model.hbp");
const ONE_Q24: i64 = 1 << 24;
/// Largest |rust - torch| allowed for probs[:, 1], in Q24 units (2^-24).
const TOL_ANOMALY: i64 = 16;
/// Largest |rust - torch| allowed per projection component, in Q24 units.
const TOL_PROJECTION: i64 = 16;
/// Feature magnitudes 2^K of the `mag<K>-<i>` graphs, and graphs per magnitude
/// (tools/model_parity.py `MAGNITUDE_BITS`, `MAGNITUDE_GRAPHS`).
const MAGNITUDE_BITS: [u32; 5] = [4, 8, 12, 16, 20];
const MAGNITUDE_GRAPHS: usize = 40;
/// Up to features of 2^8 the `mag` graphs are held to the tolerances above; beyond, to those times
/// 2^(K - 8), since each weight's Q24 rounding is multiplied by the input.
const MAGNITUDE_TOL_FREE_BITS: u32 = 8;

struct Case {
    line: &'static str,
    /// K of a `mag<K>-<i>` graph; `None` for the other graphs.
    magnitude_bits: Option<u32>,
    x: Vec<[i64; NODE_FEATURES]>,
    edges: Vec<(usize, usize)>,
    anomaly_bits: Vec<u32>,
    anomaly_q24: Vec<i64>,
    projections: Vec<[i64; PROJECTION]>,
}

fn fields(line: &str) -> HashMap<&str, &str> {
    line.split('|')
        .skip(1)
        .map(|field| field.split_once('=').expect("key=value"))
        .collect()
}

fn list<T>(field: &str, parse: impl Fn(&str) -> T) -> Vec<T> {
    field.split(',').map(parse).collect()
}

fn cases() -> Vec<Case> {
    let mut cases: Vec<Case> = Vec::new();
    let mut names: Vec<&str> = Vec::new();
    for line in EXPECTED.lines() {
        if line.starts_with("GRAPH|") {
            let f = fields(line);
            names.push(f["case"]);
            cases.push(Case {
                line,
                magnitude_bits: f["case"].strip_prefix("mag").map(|rest| {
                    let (bits, _) = rest.split_once('-').expect("mag<K>-<i>");
                    bits.parse().expect("K")
                }),
                x: f["x"]
                    .split(';')
                    .map(|row| {
                        let row = list(row, |q| q.parse::<i64>().expect("q24"));
                        row.try_into().expect("six features")
                    })
                    .collect(),
                edges: list(f["edges"], |edge| {
                    let (s, t) = edge.split_once('>').expect("s>t");
                    (s.parse().expect("source"), t.parse().expect("target"))
                }),
                anomaly_bits: list(f["p_bits"], |b| u32::from_str_radix(b, 16).expect("hex")),
                anomaly_q24: list(f["p_q24"], |q| q.parse().expect("q24")),
                projections: Vec::new(),
            });
        } else if line.starts_with("PROJ|") {
            let f = fields(line);
            let case = cases.last_mut().expect("PROJ after GRAPH");
            assert_eq!(names.last(), Some(&f["case"]), "{line}");
            assert_eq!(
                f["edge"].parse::<usize>().ok(),
                Some(case.projections.len())
            );
            let q24 = list(f["q24"], |q| q.parse::<i64>().expect("q24"));
            case.projections
                .push(q24.try_into().expect("64 projection components"));
        }
    }
    cases
}

/// The layout graphs: the training layout, raw Q24 values in [-2^26, 2^26), and the fixed graphs.
fn layout_cases() -> Vec<Case> {
    cases()
        .into_iter()
        .filter(|c| c.magnitude_bits.is_none())
        .collect()
}

/// floor(value * 2^24 + 1/2) of a non-negative float32 given by its bits, in integers.
fn float32_bits_to_q24(bits: u32) -> i64 {
    assert_eq!(bits >> 31, 0, "negative probability bits {bits:08x}");
    let exponent = i64::from((bits >> 23) & 0xff);
    let significand = i64::from(bits & 0x7f_ffff) | if exponent == 0 { 0 } else { 1 << 23 };
    // value = significand * 2^(max(exponent, 1) - 150), so value * 2^24 = significand * 2^(e - 126).
    let shift = exponent.max(1) - 126;
    if shift >= 0 {
        significand << shift
    } else if shift > -40 {
        (significand + (1 << (-shift - 1))) >> -shift
    } else {
        0
    }
}

#[test]
fn fixture_has_every_case_and_layout_row() {
    let cases = cases();
    let layout = layout_cases();
    assert_eq!(layout.len(), 104);
    let edges: usize = layout.iter().map(|c| c.edges.len()).sum();
    assert_eq!(edges, 262);
    for bits in MAGNITUDE_BITS {
        let count = cases
            .iter()
            .filter(|c| c.magnitude_bits == Some(bits))
            .count();
        assert_eq!(count, MAGNITUDE_GRAPHS, "mag{bits}");
    }
    assert_eq!(cases.len(), 104 + MAGNITUDE_GRAPHS * MAGNITUDE_BITS.len());
    for case in &cases {
        assert_eq!(case.anomaly_q24.len(), case.edges.len(), "{}", case.line);
        assert_eq!(case.projections.len(), case.edges.len(), "{}", case.line);
        let decoded: Vec<i64> = case
            .anomaly_bits
            .iter()
            .map(|&b| float32_bits_to_q24(b))
            .collect();
        assert_eq!(decoded, case.anomaly_q24, "{}", case.line);
    }
    let layout = EXPECTED
        .lines()
        .find(|l| l.starts_with("LAYOUT|"))
        .expect("LAYOUT row");
    let f = fields(layout);
    assert_eq!(f["fallback_conv"], "contrastive_gnn.GCNConv");
    assert_eq!(f["fallback_modules_equal"], "1");
    assert_eq!(f["torch_geometric_missing"], "conv1.bias,conv2.bias");
    assert_eq!(
        f["torch_geometric_unexpected"],
        "conv1.lin.bias,conv2.lin.bias"
    );
}

#[test]
fn anomaly_probability_matches_torch() {
    let (mut max_diff, mut equal, mut total) = (0i64, 0usize, 0usize);
    for case in layout_cases() {
        let rust = anomaly_probabilities(&case.x, &case.edges).expect("valid graph");
        for (&got, &want) in rust.iter().zip(&case.anomaly_q24) {
            assert!((0..=ONE_Q24).contains(&got), "{}", case.line);
            let diff = (got - want).abs();
            assert!(diff <= TOL_ANOMALY, "{got} vs {want}: {}", case.line);
            max_diff = max_diff.max(diff);
            equal += usize::from(diff == 0);
            total += 1;
        }
    }
    eprintln!("ANOMALY|edges={total}|equal={equal}|max_abs_diff_q24={max_diff}");
    assert_eq!(total, 262);
}

#[test]
fn projections_match_torch() {
    let (mut max_diff, mut equal, mut total) = (0i64, 0usize, 0usize);
    for case in layout_cases() {
        let rust = edge_outputs(&case.x, &case.edges).expect("valid graph");
        let anomaly = anomaly_probabilities(&case.x, &case.edges).expect("valid graph");
        for ((output, want), &p) in rust.iter().zip(&case.projections).zip(&anomaly) {
            assert_eq!(output.anomaly_q24, p, "{}", case.line);
            for (&got, &want) in output.projection_q24.iter().zip(want) {
                let diff = (got - want).abs();
                assert!(diff <= TOL_PROJECTION, "{got} vs {want}: {}", case.line);
                max_diff = max_diff.max(diff);
                equal += usize::from(diff == 0);
                total += 1;
            }
        }
    }
    eprintln!("PROJECTION|components={total}|equal={equal}|max_abs_diff_q24={max_diff}");
    assert_eq!(total, 262 * PROJECTION);
}

#[test]
fn magnitude_graphs_match_torch_within_the_scaled_tolerance() {
    let cases = cases();
    for bits in MAGNITUDE_BITS {
        let scale = 1i64 << bits.saturating_sub(MAGNITUDE_TOL_FREE_BITS);
        let (mut anomaly_max, mut projection_max, mut edges) = (0i64, 0i64, 0usize);
        for case in cases.iter().filter(|c| c.magnitude_bits == Some(bits)) {
            let rust = edge_outputs(&case.x, &case.edges).expect("valid graph");
            for ((output, &want), projection) in
                rust.iter().zip(&case.anomaly_q24).zip(&case.projections)
            {
                let diff = (output.anomaly_q24 - want).abs();
                assert!(diff <= TOL_ANOMALY * scale, "{diff}: {}", case.line);
                anomaly_max = anomaly_max.max(diff);
                for (&got, &want) in output.projection_q24.iter().zip(projection) {
                    let diff = (got - want).abs();
                    assert!(diff <= TOL_PROJECTION * scale, "{diff}: {}", case.line);
                    projection_max = projection_max.max(diff);
                }
                edges += 1;
            }
        }
        eprintln!(
            "MAGNITUDE|bits={bits}|edges={edges}|anomaly_max_abs_diff_q24={anomaly_max}|projection_max_abs_diff_q24={projection_max}"
        );
    }
}

#[test]
fn each_edge_depends_on_its_two_end_nodes_only() {
    for case in cases() {
        let outputs = edge_outputs(&case.x, &case.edges).expect("valid graph");
        for (output, &(source, target)) in outputs.iter().zip(&case.edges) {
            assert_eq!(
                *output,
                edge_output(&case.x[source], &case.x[target]),
                "{}",
                case.line
            );
        }
    }
}

#[test]
fn out_of_range_indices_and_empty_edge_lists() {
    let x = [[0i64; NODE_FEATURES]; 2];
    assert_eq!(
        edge_outputs(&x, &[(0, 1), (1, 2)]),
        Err(ModelError::NodeIndexOutOfRange { edge: 1 })
    );
    assert_eq!(
        anomaly_probabilities(&x, &[(2, 0)]),
        Err(ModelError::NodeIndexOutOfRange { edge: 0 })
    );
    assert_eq!(anomaly_probabilities(&x, &[]), Ok(Vec::new()));
    assert_eq!(edge_outputs(&[], &[]), Ok(Vec::new()));
}

#[test]
fn extreme_inputs_stay_in_range() {
    for value in [i64::MIN, -(1 << 40), -1, 0, 1, 1 << 40, i64::MAX] {
        let x = [value; NODE_FEATURES];
        let output = edge_output(&x, &[0; NODE_FEATURES]);
        assert!((0..=ONE_Q24).contains(&output.anomaly_q24), "{value}");
        assert!(
            output
                .projection_q24
                .iter()
                .all(|q| (-ONE_Q24..=ONE_Q24).contains(q)),
            "{value}"
        );
    }
}
