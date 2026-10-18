//! Every stage of `quant8` against tools/referee.py, the stdlib mirror of
//! quant-huge-message-benchmark.mjs: the count-sketch, all eight channels, `scale`, the
//! 3,200-byte tuple and both dot products, bit for bit.

use quant_head8::{
    count_sketch, dot_q, dot_raw, fill, quantize, tuple_buffer, Fill, Number, Quant8, MAX_FLOOR,
    PPOW, QUAD_EDGE, TRIPLE_EDGE, TUPLE_BYTES, ZETA_FLOOR,
};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fmt::Write;

const EXPECTED: &str = include_str!("fixtures/quant8-expected.hbp");

fn fields(line: &str) -> (&str, BTreeMap<&str, &str>) {
    let mut parts = line.split('|');
    let key = parts.next().expect("row key");
    let map = parts
        .map(|f| f.split_once('=').expect("key=value"))
        .collect();
    (key, map)
}

fn rows(key: &str) -> Vec<BTreeMap<&'static str, &'static str>> {
    EXPECTED
        .lines()
        .filter(|l| !l.starts_with('#'))
        .map(fields)
        .filter(|(k, _)| *k == key)
        .map(|(_, m)| m)
        .collect()
}

fn shown(x: Number) -> String {
    if x.is_nan() {
        "nan".to_string()
    } else {
        format!("{:016x}", x.to_bits())
    }
}

fn hex_bytes<T: Copy>(values: &[T], byte: impl Fn(T) -> u8) -> String {
    values.iter().fold(String::new(), |mut out, &v| {
        let _ = write!(out, "{:02x}", byte(v));
        out
    })
}

fn input(row: &BTreeMap<&str, &str>) -> Vec<Number> {
    if let Some(len) = row.get("fill_len") {
        let seed = row["fill_seed"].parse().expect("seed");
        return fill(len.parse().expect("len"), seed);
    }
    let bits = row["bits"];
    if bits.is_empty() {
        return Vec::new();
    }
    bits.split(',')
        .map(|b| Number::from_bits(u64::from_str_radix(b, 16).expect("hex")))
        .collect()
}

fn check_channels(name: &str, q: &Quant8, want: &BTreeMap<&str, &str>) {
    let hist: Vec<u8> = q.hist.iter().flat_map(|h| h.to_le_bytes()).collect();
    let tuple = tuple_buffer(q);
    assert_eq!(tuple.len(), TUPLE_BYTES);
    let got = [
        ("turbo", hex_bytes(&q.turbo, |t| t as u8)),
        ("signs", hex_bytes(&q.signs, |s| s)),
        ("zeta", hex_bytes(&q.zeta, |z| z)),
        ("triple", hex_bytes(&q.triple, |t| t.direction() as u8)),
        ("quad", hex_bytes(&q.quad, |c| c)),
        ("hist", hex_bytes(&hist, |h| h)),
        ("vm_acc", q.vm_acc.to_string()),
        ("scale", shown(q.scale)),
        ("tuple_sha256", hex_bytes(&Sha256::digest(&tuple), |b| b)),
    ];
    for (key, value) in got {
        assert_eq!(value, want[key], "{name} {key}");
    }
}

#[test]
fn constants_equal_the_javascript_literals() {
    let consts: BTreeMap<_, _> = rows("CONST")
        .into_iter()
        .map(|r| (r["name"], r["bits"]))
        .collect();
    for (literal, value) in [
        ("1e-12", MAX_FLOOR),
        ("1e-9", ZETA_FLOOR),
        ("0.33", TRIPLE_EDGE),
        ("0.5", QUAD_EDGE),
        ("127", Number::from_u64(127)),
        ("128", Number::from_u64(128)),
        ("16129", Number::from_u64(16129)),
    ] {
        assert_eq!(
            format!("{:016x}", value.to_bits()),
            consts[literal],
            "{literal}"
        );
    }
}

#[test]
fn ppow_table_matches() {
    let table: String = PPOW.iter().map(|t| t.to_string()).collect();
    assert_eq!(table, rows("PPOW")[0]["table"]);
}

#[test]
fn every_stage_matches_the_referee() {
    let inputs = rows("INPUT");
    let projs = rows("PROJ");
    let quants = rows("QUANT8");
    assert_eq!(inputs.len(), 14);
    assert_eq!((projs.len(), quants.len()), (inputs.len(), inputs.len()));
    for ((input_row, proj_row), q_row) in inputs.iter().zip(&projs).zip(&quants) {
        let name = input_row["name"];
        assert_eq!((proj_row["name"], q_row["name"]), (name, name));
        let proj = count_sketch(input(input_row));
        let want: Vec<&str> = proj_row["bits"].split(',').collect();
        let got: Vec<String> = proj.iter().map(|&p| shown(p)).collect();
        assert_eq!(got, want, "{name} count-sketch");
        check_channels(name, &quantize(&proj), q_row);
    }
}

#[test]
fn dot_products_match_the_referee() {
    let dots = rows("DOT");
    assert_eq!(dots.len(), 3);
    let input_of = |name: &str| {
        let row = rows("INPUT")
            .into_iter()
            .find(|r| r["name"] == name)
            .expect("input row");
        (
            row["fill_len"].parse::<usize>().expect("len"),
            row["fill_seed"].parse::<u32>().expect("seed"),
        )
    };
    for row in dots {
        let ((len_a, seed_a), (len_b, seed_b)) = (input_of(row["a"]), input_of(row["b"]));
        let qa = quantize(&count_sketch(Fill::new(seed_a).take(len_a)));
        let qb = quantize(&count_sketch(Fill::new(seed_b).take(len_b)));
        assert_eq!(shown(dot_q(&qa, &qb)), row["dot_q"], "{} dot_q", row["a"]);
        let raw = dot_raw(Fill::new(seed_a).take(len_a), Fill::new(seed_b).take(len_b));
        assert_eq!(shown(raw), row["dot_raw"], "{} dot_raw", row["a"]);
    }
}
