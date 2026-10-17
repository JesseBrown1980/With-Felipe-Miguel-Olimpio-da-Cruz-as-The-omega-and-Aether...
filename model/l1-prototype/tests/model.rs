//! `model` against tools/int_referee.py (Python integers, exact) and against the vendored PrototypeGNN with its
//! fallback GCNConv and the pinned checkpoint (tools/model_parity.py, torch 2.14.1+cpu, float32).

use l1_prototype::model::{
    edge_outputs, encode_nodes, forward, pair_output, EdgeOutput, Embedding, ModelError, FRAC_BITS,
    NODE_FEATURES,
};
use std::collections::HashMap;

const INT: &str = include_str!("fixtures/expected-int.hbp");
const TORCH: &str = include_str!("fixtures/expected-model.hbp");
const ONE_Q24: i64 = 1 << FRAC_BITS;
/// Largest |rust - torch| allowed in Q24 units; measured maxima over the fixtures: e 1, logits 32, p 1.
const TOL_EMBEDDING: i128 = 2;
const TOL_LOGIT_Q24: i128 = 64;
const TOL_PROBABILITY: i64 = 2;
/// Node encodings: 2 plus max|x| / 2^31, as the Q24 weight rounding (<= 2^-25 per weight) grows with |x|;
/// measured maxima 1 for |x| < 2^31 and 46 for |x| <= 2^40, where this allows 514.
const TOL_ENCODING_BASE: i128 = 2;
const TOL_ENCODING_SHIFT: u32 = 31;
/// forward() of every fixture edge: the exact sigmoid of the integer logits, and torch's float32 value 0x3f7ffe5c.
const FIXTURE_PROBABILITY_Q24: i64 = 16_776_797;
const FIXTURE_TORCH_BITS: u32 = 0x3f7f_fe5c;

type Fields<'a> = HashMap<&'a str, &'a str>;

fn fields(line: &str) -> Fields<'_> {
    line.split('|')
        .skip(1)
        .map(|field| field.split_once('=').expect("key=value"))
        .collect()
}

fn rows_of(value: &str) -> Vec<Vec<i128>> {
    value
        .split(';')
        .map(|row| {
            row.split(',')
                .map(|v| v.parse().expect("integer"))
                .collect()
        })
        .collect()
}

fn flat(value: &str) -> Vec<i128> {
    rows_of(value).into_iter().flatten().collect()
}

fn edges_of(value: &str) -> Vec<(usize, usize)> {
    value
        .split(',')
        .map(|edge| {
            let (s, t) = edge.split_once('>').expect("s>t");
            (s.parse().expect("source"), t.parse().expect("target"))
        })
        .collect()
}

fn inputs_of(value: &str) -> Vec<[i64; NODE_FEATURES]> {
    rows_of(value)
        .into_iter()
        .map(|row| {
            let row: Vec<i64> = row
                .into_iter()
                .map(|v| i64::try_from(v).expect("i64"))
                .collect();
            row.try_into().expect("six features")
        })
        .collect()
}

struct Case<'a> {
    id: &'a str,
    x: Vec<[i64; NODE_FEATURES]>,
    edges: Vec<(usize, usize)>,
    referee: Fields<'a>,
    torch: Fields<'a>,
}

fn case_id(line: &str) -> &str {
    let mut parts = line.splitn(3, '|');
    let kind = parts.next().expect("kind");
    let case = parts.next().expect("case");
    &line[..kind.len() + 1 + case.len()]
}

fn cases() -> Vec<Case<'static>> {
    let is_case = |l: &&str| l.starts_with("PAIR|") || l.starts_with("GRAPH|");
    let torch: HashMap<&str, Fields> = TORCH
        .lines()
        .filter(is_case)
        .map(|l| (case_id(l), fields(l)))
        .collect();
    let cases: Vec<Case> = INT
        .lines()
        .filter(is_case)
        .map(|l| {
            let referee = fields(l);
            Case {
                id: case_id(l),
                x: inputs_of(referee["x"]),
                edges: edges_of(referee["edges"]),
                torch: torch[case_id(l)].clone(),
                referee,
            }
        })
        .collect();
    assert_eq!(cases.len(), torch.len());
    assert!(cases.len() >= 144, "{} cases", cases.len());
    cases
}

fn round_q48_to_q24(v: i128) -> i128 {
    (v + (1 << (FRAC_BITS - 1))) >> FRAC_BITS
}

fn embeddings(outputs: &[Embedding]) -> Vec<i128> {
    outputs.iter().flatten().copied().collect()
}

#[test]
fn outputs_equal_the_integer_referee_exactly() {
    let mut edges = 0;
    for case in cases() {
        let outputs = edge_outputs(&case.x, &case.edges).expect("valid graph");
        let logits: Vec<i128> = outputs.iter().flat_map(|o| o.logits_q48).collect();
        assert_eq!(logits, flat(case.referee["logits_q48"]), "{}", case.id);
        let p: Vec<i128> = outputs
            .iter()
            .map(|o| i128::from(o.probability_q24))
            .collect();
        assert_eq!(p, flat(case.referee["p_q24"]), "{}", case.id);
        if let Some(h) = case.referee.get("h") {
            assert_eq!(embeddings(&encode_nodes(&case.x)), flat(h), "{}", case.id);
            let e: Vec<Embedding> = outputs.iter().map(|o| o.embedding).collect();
            assert_eq!(embeddings(&e), flat(case.referee["e"]), "{}", case.id);
        }
        edges += outputs.len();
    }
    assert!(edges >= 800, "{edges} edges");
}

#[test]
fn outputs_match_the_torch_model_within_tolerance() {
    let (mut max_h, mut max_e, mut max_logit, mut max_p) = (0i128, 0i128, 0i128, 0i64);
    let mut probabilities = 0;
    for case in cases() {
        assert_eq!(edges_of(case.torch["edges"]), case.edges, "{}", case.id);
        let outputs = edge_outputs(&case.x, &case.edges).expect("valid graph");
        let logits: Vec<i128> = outputs
            .iter()
            .flat_map(|o| o.logits_q48.map(round_q48_to_q24))
            .collect();
        for (&got, &torch) in logits.iter().zip(&flat(case.torch["logits_q24"])) {
            let diff = (got - torch).abs();
            assert!(
                diff <= TOL_LOGIT_Q24,
                "logit |{got} - {torch}|: {}",
                case.id
            );
            max_logit = max_logit.max(diff);
        }
        let bits: Vec<u32> = case.torch["p_bits"]
            .split(',')
            .map(|b| u32::from_str_radix(b, 16).expect("hex"))
            .collect();
        let torch_p = flat(case.torch["p_q24"]);
        assert_eq!(bits.len(), outputs.len(), "{}", case.id);
        for ((output, &torch), &bits) in outputs.iter().zip(&torch_p).zip(&bits) {
            assert_eq!(float32_bits_to_q24(bits), torch, "{}", case.id);
            let torch = i64::try_from(torch).expect("q24");
            let diff = (output.probability_q24 - torch).abs();
            assert!(diff <= TOL_PROBABILITY, "p |{output:?} - {torch}|");
            max_p = max_p.max(diff);
            probabilities += 1;
        }
        if let Some(h) = case.torch.get("h_q24") {
            let max_x = case
                .x
                .iter()
                .flatten()
                .map(|v| i128::from(v.unsigned_abs()))
                .max()
                .unwrap_or(0);
            let tol = TOL_ENCODING_BASE + (max_x >> TOL_ENCODING_SHIFT);
            for (got, torch) in embeddings(&encode_nodes(&case.x)).iter().zip(flat(h)) {
                let diff = (got - torch).abs();
                assert!(diff <= tol, "h |{got} - {torch}| > {tol}: {}", case.id);
                max_h = max_h.max(diff);
            }
            let e: Vec<Embedding> = outputs.iter().map(|o| o.embedding).collect();
            for (got, torch) in embeddings(&e).iter().zip(flat(case.torch["e_q24"])) {
                let diff = (got - torch).abs();
                assert!(diff <= TOL_EMBEDDING, "e |{got} - {torch}|: {}", case.id);
                max_e = max_e.max(diff);
            }
        }
    }
    assert!(probabilities >= 800, "{probabilities} probabilities");
    eprintln!(
        "max |rust - torch| in Q24 units: h {max_h}, e {max_e}, logits {max_logit}, p {max_p}; {probabilities} edges"
    );
}

/// floor(v * 2^24 + 1/2) of the non-negative float32 with these bits, in integers.
fn float32_bits_to_q24(bits: u32) -> i128 {
    assert_eq!(bits >> 31, 0, "probabilities are non-negative");
    let exponent = i32::try_from((bits >> 23) & 0xFF).expect("exponent");
    let fraction = i128::from(bits & 0x7F_FFFF);
    let (mantissa, scale) = if exponent == 0 {
        (fraction, -149 + 24)
    } else {
        (fraction | 1 << 23, exponent - 150 + 24)
    };
    if scale >= 0 {
        mantissa << scale
    } else if scale > -100 {
        (mantissa + (1 << (-scale - 1))) >> -scale
    } else {
        0
    }
}

#[test]
fn every_fixture_edge_gives_the_measured_probability() {
    for case in cases() {
        let p = forward(&case.x, &case.edges).expect("valid graph");
        assert!(
            p.iter().all(|&p| p == FIXTURE_PROBABILITY_Q24),
            "{}",
            case.id
        );
        assert!(case.torch["p_bits"]
            .split(',')
            .all(|b| u32::from_str_radix(b, 16) == Ok(FIXTURE_TORCH_BITS)));
    }
}

#[test]
fn each_edge_depends_only_on_its_two_nodes() {
    // The fallback GCNConv ignores edge_index (prototype_gnn.py:23-24).
    for case in cases() {
        let outputs = edge_outputs(&case.x, &case.edges).expect("valid graph");
        for (&(s, t), output) in case.edges.iter().zip(&outputs) {
            assert_eq!(pair_output(&case.x[s], &case.x[t]), *output, "{}", case.id);
        }
        let pairs = edge_outputs(&case.x, &[(0, 1)]).expect("pair");
        assert_eq!(pairs, vec![pair_output(&case.x[0], &case.x[1])]);
    }
}

#[test]
fn layout_rows_record_the_fallback_load() {
    let layout: Vec<&str> = TORCH.lines().filter(|l| l.starts_with("LAYOUT|")).collect();
    assert_eq!(layout.len(), 2);
    assert!(layout[0].contains("|conv=fallback_linear|") && layout[0].contains("|strict_load=ok|"));
    assert!(layout[1].contains("|strict_load=refused|missing=conv1.bias,conv2.bias|"));
    assert!(layout[1].contains("|unexpected=conv1.lin.bias,conv2.lin.bias|"));
    let variant: Vec<&str> = TORCH
        .lines()
        .filter(|l| l.starts_with("VARIANT|"))
        .collect();
    assert_eq!(variant.len(), 1);
    let variant = fields(variant[0]);
    assert_eq!(variant["source"], "inference_server.py:11");
    assert_eq!(
        (
            variant["strict_load"],
            variant["missing"],
            variant["unexpected"]
        ),
        ("ok", "", "")
    );
    assert_eq!(variant["edges"], "816");
    assert_eq!(variant["p_bits_equal"], variant["edges"]);
}

/// The generator of tools/int_referee.py (`Lcg`).
struct Lcg(u64);

impl Lcg {
    fn below(&mut self, bound: u64) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.0 >> 11) % bound
    }

    /// Uniform in `[-2^bits, 2^bits)`: 64 bits from two 32-bit draws, shifted right arithmetically.
    fn signed(&mut self, bits: u32) -> i64 {
        let draw = (self.below(1 << 32) << 32) | self.below(1 << 32);
        i64::from_ne_bytes(draw.to_ne_bytes()) >> (63 - bits)
    }
}

/// `(bits, distinct, min, max)` of `pair_output(..).probability_q24` over 300 two-node graphs whose 12 Q24 features
/// are uniform in `[-2^bits, 2^bits)`, drawn in this order from `Lcg(0x4D41_474E)`.
const MAGNITUDE_SWEEP: [(u32, usize, i64, i64); 18] = [
    (24, 1, 16_776_797, 16_776_797),
    (28, 1, 16_776_797, 16_776_797),
    (32, 1, 16_776_797, 16_776_797),
    (36, 1, 16_776_797, 16_776_797),
    (40, 1, 16_776_797, 16_776_797),
    (44, 1, 16_776_797, 16_776_797),
    (48, 1, 16_776_797, 16_776_797),
    (50, 1, 16_776_797, 16_776_797),
    (51, 1, 16_776_797, 16_776_797),
    (52, 1, 16_776_797, 16_776_797),
    (53, 1, 16_776_797, 16_776_797),
    (54, 1, 16_776_797, 16_776_797),
    (55, 2, 16_776_797, 16_776_798),
    (56, 3, 16_776_797, 16_776_799),
    (58, 11, 16_776_797, 16_776_807),
    (60, 37, 16_776_797, 16_776_838),
    (62, 112, 16_776_797, 16_776_947),
    (63, 159, 16_776_797, 16_777_028),
];

#[test]
fn forward_by_input_magnitude_on_two_node_graphs() {
    let mut rng = Lcg(0x4D41_474E);
    for (bits, distinct, min, max) in MAGNITUDE_SWEEP {
        let mut seen = std::collections::BTreeSet::new();
        for _ in 0..300 {
            let source: [i64; NODE_FEATURES] = std::array::from_fn(|_| rng.signed(bits));
            let target: [i64; NODE_FEATURES] = std::array::from_fn(|_| rng.signed(bits));
            seen.insert(pair_output(&source, &target).probability_q24);
        }
        let got = (seen.len(), seen.first().copied(), seen.last().copied());
        assert_eq!(got, (distinct, Some(min), Some(max)), "bits {bits}");
    }
}

#[test]
fn out_of_range_indices_are_errors_and_no_edges_give_no_outputs() {
    let node = [0, 0, 0, 0, ONE_Q24, ONE_Q24];
    assert_eq!(
        edge_outputs(&[node, node], &[(0, 1), (1, 1), (1, 2)]),
        Err(ModelError::NodeIndexOutOfRange { edge: 2 })
    );
    assert_eq!(
        forward(&[node], &[(1, 0)]),
        Err(ModelError::NodeIndexOutOfRange { edge: 0 })
    );
    assert_eq!(
        edge_outputs(&[], &[(0, 0)]),
        Err(ModelError::NodeIndexOutOfRange { edge: 0 })
    );
    assert_eq!(edge_outputs(&[node], &[]), Ok(Vec::<EdgeOutput>::new()));
    assert_eq!(forward(&[], &[]), Ok(Vec::new()));
}

#[test]
fn any_i64_input_stays_in_range() {
    let extremes = [
        [i64::MAX; NODE_FEATURES],
        [i64::MIN; NODE_FEATURES],
        [i64::MAX, i64::MIN, i64::MAX, i64::MIN, i64::MAX, i64::MIN],
        [i64::MIN, i64::MAX, i64::MIN, i64::MAX, i64::MIN, i64::MAX],
        [0; NODE_FEATURES],
    ];
    for source in &extremes {
        for target in &extremes {
            let output = pair_output(source, target);
            assert!((0..=ONE_Q24).contains(&output.probability_q24));
            assert!(output.logits_q48.iter().all(|&l| l <= 0));
        }
    }
}
