//! Every row of tests/fixtures/triad.hbp (written by tools/triad_referee.py, the stdlib integer
//! Python mirror of the vendored JavaScript) recomputed by the port.

use hrm_mtp::hilbert::{hilbert_decode, hilbert_encode};
use hrm_mtp::hrm::{
    fast_loop_refine_position, fast_loop_tie_margin, hrm_shaped_prediction,
    slow_loop_predict_shape, HrmArgs, SHAPES,
};
use hrm_mtp::mtp::{head_seed, measure_hit_rate, mtp_heads, MtpOptions};
use hrm_mtp::primes::{primes, sieve_limit};
use hrm_mtp::revolver::{mint_pid_tuple, PidChainRevolver, PreWarmOptions};
use hrm_mtp::sf64::Sf64;
use hrm_mtp::zeta::{
    band_weight, chain_antichain_bound, deterministic_unit, nu_lambda, predict_k_positions,
    von_mangoldt, von_mangoldt_next,
};
use hrm_mtp::{fdlibm, hrm, JsError};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fmt::Write;

const FIXTURE: &str = include_str!("fixtures/triad.hbp");

fn hex(bits: u64) -> String {
    format!("{bits:016x}")
}

fn coords(c: &[i64]) -> String {
    c.iter().map(i64::to_string).collect::<Vec<_>>().join(",")
}

fn sha256_hex(text: &str) -> String {
    Sha256::digest(text.as_bytes())
        .iter()
        .fold(String::new(), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

fn sweep(name: &str, domain: &str, lines: &[String]) -> String {
    let body = lines.iter().fold(String::new(), |mut out, l| {
        out.push_str(l);
        out.push('\n');
        out
    });
    format!(
        "SWEEP|name={name}|domain={domain}|rows={}|sha256={}",
        lines.len(),
        sha256_hex(&body)
    )
}

fn fields(row: &str) -> (String, BTreeMap<String, String>) {
    let mut parts = row.split('|');
    let kind = parts.next().expect("row kind").to_string();
    let map = parts
        .map(|p| {
            let (k, v) = p.split_once('=').expect("key=value");
            (k.to_string(), v.to_string())
        })
        .collect();
    (kind, map)
}

fn rows(kind: &str) -> Vec<(String, BTreeMap<String, String>)> {
    FIXTURE
        .lines()
        .filter(|l| l.starts_with(&format!("{kind}|")))
        .map(|l| (l.to_string(), fields(l).1))
        .collect()
}

fn num(map: &BTreeMap<String, String>, key: &str) -> i64 {
    map[key].parse().expect("integer field")
}

fn sweep_row(name: &str) -> String {
    FIXTURE
        .lines()
        .find(|l| l.starts_with(&format!("SWEEP|name={name}|")))
        .expect("sweep row")
        .to_string()
}

fn sweep_domain(name: &str) -> String {
    fields(&sweep_row(name)).1["domain"].clone()
}

const NEXT_SEEDS: [u32; 10] = [
    0, 1, 7, 42, 99, 0x12345, 0x98765, 2654435761, 1013904226, 3668339987,
];
const UNIT_SEEDS: [u32; 6] = [0, 1, 500, 0xffff_ffff, 0x12345, 2654435761];

#[test]
fn constants_match_the_javascript_literals() {
    for (row, f) in rows("CONST") {
        match f["name"].as_str() {
            "0.7" => assert_eq!(hex(hrm::SEVEN_TENTHS.to_bits()), f["bits"], "{row}"),
            "0.4" => assert_eq!(hex(hrm::FOUR_TENTHS.to_bits()), f["bits"], "{row}"),
            "0.1" => assert_eq!(hex(hrm::ONE_TENTH.to_bits()), f["bits"], "{row}"),
            "Math.PI" => assert_eq!(hex(hrm::PI.to_bits()), f["bits"], "{row}"),
            "HALF_PI_Q112" => assert_eq!(
                format!("{:x}", hrm_mtp::trig::HALF_PI_Q112),
                f["hex"],
                "{row}"
            ),
            other => panic!("unknown constant {other}"),
        }
    }
}

#[test]
fn primes_and_sieve_limit() {
    let (_, f) = rows("PRIMES").remove(0);
    let list = primes();
    assert_eq!(sieve_limit(1000).to_string(), f["limit"]);
    assert_eq!(list.len().to_string(), f["count"]);
    assert_eq!(list[0].to_string(), f["first"]);
    assert_eq!(list[list.len() - 1].to_string(), f["last"]);
    let joined = list
        .iter()
        .map(u64::to_string)
        .collect::<Vec<_>>()
        .join(",");
    assert_eq!(sha256_hex(&joined), f["sha256"]);
}

#[test]
fn math_log_rows_and_sweep() {
    for (row, f) in rows("LOG") {
        let n: u64 = f["n"].parse().expect("n");
        assert_eq!(hex(fdlibm::log_int(n).to_bits()), f["bits"], "{row}");
    }
    let lines: Vec<String> = (1..=65536u64)
        .map(|n| format!("{n}:{}", hex(fdlibm::log_int(n).to_bits())))
        .collect();
    assert_eq!(
        sweep("math_log", &sweep_domain("math_log"), &lines),
        sweep_row("math_log")
    );
}

#[test]
fn von_mangoldt_and_nu_lambda_sweeps() {
    let lines: Vec<String> = (0..=8192i64)
        .map(|n| format!("{n}:{}", hex(von_mangoldt(n).to_bits())))
        .collect();
    assert_eq!(
        sweep("von_mangoldt", &sweep_domain("von_mangoldt"), &lines),
        sweep_row("von_mangoldt")
    );
    let lines: Vec<String> = (0..=2048i64)
        .map(|cp| format!("{cp}:{}", hex(nu_lambda(cp).to_bits())))
        .collect();
    assert_eq!(
        sweep("nu_lambda", &sweep_domain("nu_lambda"), &lines),
        sweep_row("nu_lambda")
    );
    for (row, f) in rows("BAND") {
        let w = band_weight(num(&f, "start"), num(&f, "end"));
        assert_eq!(hex(w.to_bits()), f["bits"], "{row}");
    }
    for (row, f) in rows("BOUND") {
        let b = chain_antichain_bound(num(&f, "n")).expect("n >= 1");
        assert_eq!(hex(b.required_mass_per_pid.to_bits()), f["bits"], "{row}");
    }
}

#[test]
fn deterministic_unit_sweep() {
    let mut lines = Vec::new();
    for s in UNIT_SEEDS {
        for st in 0..256u32 {
            let unit = Sf64::from_ratio(u64::from(deterministic_unit(s, st)), 1 << 32);
            lines.push(format!("{s}:{st}:{}", hex(unit.to_bits())));
        }
    }
    assert_eq!(
        sweep(
            "deterministic_unit",
            &sweep_domain("deterministic_unit"),
            &lines
        ),
        sweep_row("deterministic_unit")
    );
}

fn next_line(cp: i64, seed: u32, step: u32) -> String {
    let r = von_mangoldt_next(cp, seed, step);
    format!(
        "{cp}:{seed}:{step}:{}:{}:{}:{}",
        r.next,
        r.divisor,
        hex(r.weight.to_bits()),
        r.reason
    )
}

#[test]
fn von_mangoldt_next_rows_and_sweep() {
    for (row, f) in rows("NEXT") {
        let r = von_mangoldt_next(
            num(&f, "cp"),
            num(&f, "seed") as u32,
            num(&f, "step") as u32,
        );
        assert_eq!(r.next, num(&f, "next"), "{row}");
        assert_eq!(r.divisor, num(&f, "divisor"), "{row}");
        assert_eq!(hex(r.weight.to_bits()), f["weight"], "{row}");
        assert_eq!(r.reason, f["reason"], "{row}");
    }
    let mut lines = Vec::new();
    for cp in 0..=1100 {
        for seed in NEXT_SEEDS {
            for step in 0..15 {
                lines.push(next_line(cp, seed, step));
            }
        }
    }
    assert_eq!(
        sweep(
            "von_mangoldt_next",
            &sweep_domain("von_mangoldt_next"),
            &lines
        ),
        sweep_row("von_mangoldt_next")
    );
}

#[test]
fn predict_k_positions_sweep() {
    let mut lines = Vec::new();
    for cp0 in 0..=1100 {
        for k in 1..=6 {
            for seed in [0u32, 7, 13] {
                let r = predict_k_positions(cp0, k, seed).expect("k >= 1");
                let nexts: Vec<String> = r
                    .trajectory
                    .iter()
                    .map(|s| s.sample.next.to_string())
                    .collect();
                lines.push(format!("{cp0}:{k}:{seed}:{}", nexts.join(",")));
            }
        }
    }
    assert_eq!(
        sweep(
            "predict_k_positions",
            &sweep_domain("predict_k_positions"),
            &lines
        ),
        sweep_row("predict_k_positions")
    );
}

#[test]
fn hilbert_sweep() {
    let mut lines: Vec<String> = (0..4096)
        .map(|i| format!("3:4:{i}:{}", coords(&hilbert_decode(i, 3, 4).expect("3x4"))))
        .collect();
    for (d, b) in [
        (2i64, 1i64),
        (2, 4),
        (2, 8),
        (3, 1),
        (3, 3),
        (4, 3),
        (5, 2),
        (6, 5),
        (2, 15),
        (3, 10),
    ] {
        let top = (1i64 << (d * b)).min(4096);
        for i in 0..top {
            let c = hilbert_decode(i, d, b).expect("domain");
            let back = hilbert_encode(&c, d, b).expect("domain");
            lines.push(format!("{d}:{b}:{i}:{}:{back}", coords(&c)));
        }
    }
    assert_eq!(
        sweep("hilbert", &sweep_domain("hilbert"), &lines),
        sweep_row("hilbert")
    );
}

/// `lcg_stream(seed)` of tools/triad_referee.py: the high 32 bits of a 64-bit LCG.
fn lcg_stream(seed: u64) -> impl FnMut() -> u64 {
    let mut x = seed;
    move || {
        x = x
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        x >> 32
    }
}

#[test]
fn hilbert_encode_of_signed_int32_coordinates() {
    for (row, f) in rows("HENC") {
        let c: Vec<i64> = f["coord"]
            .split(',')
            .map(|x| x.parse().expect("coordinate"))
            .collect();
        let index = hilbert_encode(&c, num(&f, "dims"), num(&f, "bits")).expect("int32 range");
        assert_eq!(index, num(&f, "index"), "{row}");
    }
    let mut next = lcg_stream(0x5EED);
    let mut lines = Vec::new();
    for (d, b) in [
        (2i64, 4i64),
        (2, 15),
        (3, 1),
        (3, 4),
        (3, 10),
        (4, 4),
        (5, 6),
        (6, 5),
        (31, 1),
    ] {
        for _ in 0..256 {
            let c: Vec<i64> = (0..d)
                .map(|_| {
                    let v = next() as u32 as i32;
                    i64::from(v >> (next() % 32))
                })
                .collect();
            let index = hilbert_encode(&c, d, b).expect("int32 range");
            lines.push(format!("{d}:{b}:{}:{index}", coords(&c)));
        }
    }
    assert_eq!(
        sweep("hilbert_signed", &sweep_domain("hilbert_signed"), &lines),
        sweep_row("hilbert_signed")
    );
}

#[test]
fn mtp_heads_rows_and_sweep() {
    for (row, f) in rows("MTP") {
        let r = mtp_heads(
            num(&f, "cp0"),
            MtpOptions {
                k: Some(num(&f, "k")),
                depth: Some(num(&f, "depth")),
                seed: Some(num(&f, "seed") as u32),
                ..MtpOptions::default()
            },
        )
        .expect("valid");
        let h = &r.heads[num(&f, "head") as usize];
        assert_eq!(i64::from(h.head_seed), num(&f, "head_seed"), "{row}");
        assert_eq!(h.cp_predicted, num(&f, "cp"), "{row}");
        assert_eq!(coords(&h.bh_coord_predicted), f["bh"], "{row}");
        assert_eq!(h.trajectory[0].sample.divisor, num(&f, "divisor"), "{row}");
    }
    let mut lines = Vec::new();
    for cp0 in 0..=1100 {
        for depth in 1..=4 {
            for seed in [0u32, 99] {
                let r = mtp_heads(
                    cp0,
                    MtpOptions {
                        k: Some(4),
                        depth: Some(depth),
                        seed: Some(seed),
                        ..MtpOptions::default()
                    },
                )
                .expect("valid");
                let heads: Vec<String> = r
                    .heads
                    .iter()
                    .map(|h| {
                        format!(
                            "{}/{}/{}",
                            h.head_seed,
                            h.cp_predicted,
                            coords(&h.bh_coord_predicted)
                        )
                    })
                    .collect();
                lines.push(format!("{cp0}:{depth}:{seed}:{}", heads.join(";")));
            }
        }
    }
    assert_eq!(
        sweep("mtp_heads", &sweep_domain("mtp_heads"), &lines),
        sweep_row("mtp_heads")
    );
}

fn parse_coords(s: &str) -> Vec<Vec<i64>> {
    if s.is_empty() {
        return Vec::new();
    }
    s.split(';')
        .map(|c| c.split(',').map(|x| x.parse().expect("coord")).collect())
        .collect()
}

#[test]
fn measure_hit_rate_rows() {
    for (row, f) in rows("HIT") {
        let h = measure_hit_rate(&parse_coords(&f["predicted"]), &parse_coords(&f["actual"]));
        assert_eq!(h.hits as i64, num(&f, "hits"), "{row}");
        assert_eq!(h.total as i64, num(&f, "total"), "{row}");
        assert_eq!(h.predicted_set_size as i64, num(&f, "set"), "{row}");
        assert_eq!(hex(h.hit_rate.to_bits()), f["rate"], "{row}");
    }
}

#[test]
fn slow_loop_rows() {
    for (row, f) in rows("SLOW") {
        let s = slow_loop_predict_shape(Some(&f["envelope"]), num(&f, "cp"), &[]);
        assert_eq!(s.shape.name(), f["shape"], "{row}");
        assert_eq!(i64::from(s.branching_factor), num(&f, "branching"), "{row}");
        assert_eq!(s.axis_bias, f["axis"], "{row}");
    }
}

fn fast_line(shape: &str, cp: i64, iters: u32, seed: u32) -> (String, Option<u128>) {
    let r = fast_loop_refine_position(shape, cp, iters, seed).expect("ported domain");
    let margin = fast_loop_tie_margin(shape, cp, iters, seed).expect("ported domain");
    let path: Vec<String> = r
        .path
        .iter()
        .map(|p| format!("{}/{}", p.cp, p.divisor))
        .collect();
    (
        format!(
            "{shape}:{cp}:{iters}:{seed}:{}:{}",
            r.final_cp,
            path.join(",")
        ),
        margin,
    )
}

/// The referee's `TIES` row for `sweep`: trig `Math.round` calls and the smallest exact distance
/// from a tie in units of 2^-112. The port's Q112 sine is within 2^-96 of the exact value
/// (src/trig.rs), times `|scale| <= 48 < 2^6`, so the two smallest distances differ by less than
/// 2^22 units.
fn check_ties(sweep_name: &str, calls: u64, port_min: u128) {
    let (row, f) = rows("TIES")
        .into_iter()
        .find(|(_, f)| f["sweep"] == sweep_name)
        .expect("TIES row");
    assert_eq!(calls.to_string(), f["checked"], "{row}");
    let referee: u128 = f["min_margin_q112"].parse().expect("integer");
    assert!(
        port_min.abs_diff(referee) < 1 << 22,
        "{row} port {port_min}"
    );
    // Every trig Math.round argument in these sweeps lies at least 2^-17 from a tie.
    assert!(port_min >= 1 << (112 - 17), "{row} port {port_min}");
}

fn is_trig(shape: &str) -> bool {
    matches!(shape, "spiral" | "fold" | "ring")
}

#[test]
fn fast_loop_sweeps() {
    let mut lines = Vec::new();
    let (mut min_margin, mut calls) = (u128::MAX, 0u64);
    for shape in SHAPES {
        for cp in 2..1024 {
            for h in 0..4 {
                for iters in [1u32, 3, 5, 15] {
                    let (line, margin) = fast_line(shape, cp, iters, head_seed(0, h));
                    lines.push(line);
                    if let Some(m) = margin {
                        min_margin = min_margin.min(m);
                        calls += u64::from(iters);
                    }
                }
            }
        }
    }
    assert_eq!(
        sweep("fast_loop", &sweep_domain("fast_loop"), &lines),
        sweep_row("fast_loop")
    );
    println!("fast_loop: smallest trig tie distance {min_margin} / 2^112");
    check_ties("fast_loop", calls, min_margin);
    let mut lines = Vec::new();
    let (mut min_long, mut calls) = (u128::MAX, 0u64);
    for shape in ["spiral", "fold", "ring"] {
        for cp in [2, 50, 500, 1023, 6000] {
            for seed in [0u32, 5] {
                let (line, margin) = fast_line(shape, cp, 400, seed);
                lines.push(line);
                min_long = min_long.min(margin.expect("trig shape"));
                calls += 400;
            }
        }
    }
    println!("fast_loop_long: smallest trig tie distance {min_long} / 2^112");
    check_ties("fast_loop_long", calls, min_long);
    assert_eq!(
        sweep("fast_loop_long", &sweep_domain("fast_loop_long"), &lines),
        sweep_row("fast_loop_long")
    );
}

#[test]
fn fast_loop_from_code_points_above_1023() {
    // The ring pull at iteration 0 adds a zero sine to the vonMangoldtNext candidate, which is
    // not bounded by 1023 there (hrm-slow-fast.mjs:88-89,112).
    let mut lines = Vec::new();
    let (mut min_margin, mut calls) = (u128::MAX, 0u64);
    for shape in SHAPES {
        for cp in [
            32767i64, 32768, 32771, 65537, 100003, 131071, 999983, 1048576, 4294967311,
        ] {
            for h in 0..4 {
                for iters in [1u32, 2, 15] {
                    let (line, margin) = fast_line(shape, cp, iters, head_seed(0, h));
                    lines.push(line);
                    if is_trig(shape) {
                        min_margin = min_margin.min(margin.expect("trig shape"));
                        calls += u64::from(iters);
                    }
                }
            }
        }
    }
    assert_eq!(
        sweep(
            "fast_loop_large_cp",
            &sweep_domain("fast_loop_large_cp"),
            &lines
        ),
        sweep_row("fast_loop_large_cp")
    );
    check_ties("fast_loop_large_cp", calls, min_margin);
}

#[test]
fn hrm_shaped_prediction_rows() {
    let (mut min_margin, mut calls) = (u128::MAX, 0u64);
    for (row, f) in rows("HRM") {
        let r = hrm_shaped_prediction(&HrmArgs {
            envelope_type: Some(f["envelope"].clone()),
            current_cp: num(&f, "cp"),
            history: Vec::new(),
            k: Some(num(&f, "k") as u32),
            fast_iters: Some(num(&f, "fast_iters") as u32),
            seed: Some(num(&f, "seed") as u32),
        })
        .expect("ported domain");
        assert_eq!(r.shape.name(), f["shape"], "{row}");
        assert_eq!(r.shape_params.axis_bias, f["axis"], "{row}");
        let heads: Vec<String> = r
            .heads
            .iter()
            .map(|h| {
                format!(
                    "{}/{}/{}",
                    h.head_seed,
                    h.cp_predicted,
                    coords(&h.bh_coord_predicted)
                )
            })
            .collect();
        assert_eq!(heads.join(";"), f["heads"], "{row}");
        if is_trig(r.shape.name()) {
            for h in &r.heads {
                let m = fast_loop_tie_margin(
                    r.shape.name(),
                    num(&f, "cp"),
                    num(&f, "fast_iters") as u32,
                    h.head_seed,
                )
                .expect("ported domain")
                .expect("trig shape");
                min_margin = min_margin.min(m);
                calls += num(&f, "fast_iters") as u64;
            }
        }
    }
    check_ties("hrm_rows", calls, min_margin);
}

#[test]
fn revolver_rows() {
    let mut rev = PidChainRevolver::new("TEST-ACER", None).expect("anchor");
    for (row, f) in rows("NEXTPID") {
        assert_eq!(rev.counter as i64, num(&f, "counter"), "{row}");
        assert_eq!(rev.next_pid().expect("mint"), f["pid"], "{row}");
    }
    for (row, f) in rows("PREWARM") {
        let mut rv = PidChainRevolver::new(&f["anchor"], None).expect("anchor");
        rv.counter = num(&f, "counter") as u64;
        let cp0 = if f["cp0_opt"].is_empty() {
            None
        } else {
            Some(num(&f, "cp0_opt"))
        };
        let w = rv
            .pre_warm(PreWarmOptions {
                k: Some(num(&f, "k")),
                depth: Some(num(&f, "depth")),
                seed: Some(num(&f, "seed") as u32),
                cp0,
            })
            .expect("prewarm");
        assert_eq!(w.cp0, num(&f, "cp0"), "{row}");
        let cands: Vec<String> = w
            .candidates
            .iter()
            .map(|c| {
                format!(
                    "{}/{}/{}/{}/{}/{}",
                    c.cp_predicted,
                    coords(&c.bh_coord_predicted),
                    c.speculative_pid,
                    c.actor,
                    c.lane,
                    c.prime
                )
            })
            .collect();
        assert_eq!(cands.join(";"), f["candidates"], "{row}");
    }
}

fn unhex(s: &str) -> String {
    let bytes: Vec<u8> = (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("hex"))
        .collect();
    String::from_utf8(bytes).expect("utf-8")
}

#[test]
fn upstream_errors_and_messages() {
    let errs = rows("ERR");
    assert!(!errs.is_empty());
    for (row, f) in errs {
        assert_eq!(f["error"], "RangeError", "{row}");
        let (got, counter) = match f["call"].as_str() {
            "mintPID" => (
                mint_pid_tuple(1, "d", &unhex(&f["lane_utf8_hex"]), 2, 256),
                None,
            ),
            call => {
                let mut rv = PidChainRevolver::new("A", Some(num(&f, "alphabet"))).expect("anchor");
                let k = if call == "preWarm_k0" { 0 } else { 4 };
                let got = match call {
                    "next" => rv.next_pid(),
                    _ => rv
                        .pre_warm(PreWarmOptions {
                            k: Some(k),
                            depth: Some(1),
                            seed: Some(0),
                            cp0: Some(500),
                        })
                        .map(|w| w.anchor),
                };
                (got, Some(rv.counter))
            }
        };
        assert_eq!(got, Err(JsError::Range(f["message"].clone())), "{row}");
        if let Some(c) = counter {
            assert_eq!(c as i64, num(&f, "counter"), "{row}");
        }
    }
}

#[test]
fn every_fixture_row_kind_is_checked() {
    let known = [
        "CONST", "PRIMES", "LOG", "SWEEP", "BAND", "BOUND", "NEXT", "MTP", "HIT", "SLOW", "HRM",
        "NEXTPID", "PREWARM", "TIES", "HENC", "ERR",
    ];
    for line in FIXTURE.lines().filter(|l| !l.starts_with('#')) {
        let kind = line.split('|').next().expect("kind");
        assert!(known.contains(&kind), "unchecked row kind {kind}");
    }
    let sweeps: Vec<String> = rows("SWEEP")
        .into_iter()
        .map(|(_, f)| f["name"].clone())
        .collect();
    assert_eq!(
        sweeps,
        [
            "math_log",
            "von_mangoldt",
            "nu_lambda",
            "deterministic_unit",
            "von_mangoldt_next",
            "predict_k_positions",
            "hilbert",
            "hilbert_signed",
            "mtp_heads",
            "fast_loop",
            "fast_loop_long",
            "fast_loop_large_cp"
        ]
    );
}
