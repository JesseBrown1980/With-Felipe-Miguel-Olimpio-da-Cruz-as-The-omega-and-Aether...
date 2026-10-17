//! Runs the Rust port against every row tools/g_planes_referee.py writes, so the CI referee step binds
//! the Rust functions and not only the Python mirror.

use std::collections::BTreeMap;

use g_planes::{
    hex_hamming, path_pid, popcount_bits, score_envelope, transition, HexHamming, JsNumber, Latent,
};
use l0_edge::jsnum::Dbl;

const FIXTURE: &str = include_str!("fixtures/g-planes-referee.hbp");
const SIGN_BIT: u64 = 1 << 63;

fn fields(line: &str) -> (&str, BTreeMap<&str, &str>) {
    let mut parts = line.split('|');
    let kind = parts.next().expect("row kind");
    let map = parts.filter_map(|part| part.split_once('=')).collect();
    (kind, map)
}

fn hex_u64(text: &str) -> u64 {
    u64::from_str_radix(text, 16).expect("hex u64")
}

fn utf8_from_hex(text: &str) -> String {
    let bytes = (0..text.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&text[i..i + 2], 16).expect("hex byte"))
        .collect();
    String::from_utf8(bytes).expect("utf-8")
}

fn latent(name: &str) -> Latent {
    Latent::from_g4_state(name).expect("latent state")
}

#[test]
fn every_referee_row_matches_the_port() {
    let mut lines = FIXTURE.lines();
    let (_, header) = fields(lines.next().expect("header"));
    let mut values: BTreeMap<&str, Option<JsNumber>> = BTreeMap::new();
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for (n, line) in lines.enumerate() {
        let (kind, f) = fields(line);
        *counts.entry(kind.to_ascii_lowercase()).or_default() += 1;
        match kind {
            "JSNUM" => {
                let value = match f["bits"] {
                    "none" => None,
                    bits => Some(JsNumber::from_bits(hex_u64(bits))),
                };
                if let Some(units) = f.get("units") {
                    let parsed = Dbl::decimal(units.parse().unwrap(), f["digits"].parse().unwrap());
                    let sign = if f["sign"] == "-" { SIGN_BIT } else { 0 };
                    assert_eq!(
                        Some(parsed.to_bits() | sign),
                        value.map(JsNumber::to_bits),
                        "row {n}: {line}"
                    );
                }
                values.insert(f["label"], value);
            }
            "GLSM-T" | "GLSM-WALK" => {
                let got = transition(
                    latent(f["prev"]),
                    values[f["ew"]],
                    values[f["pc"]],
                    values[f["rg"]],
                );
                assert_eq!(got.as_str(), f["next"], "row {n}: {line}");
            }
            "HEXH" => {
                let got = hex_hamming(&utf8_from_hex(f["a"]), &utf8_from_hex(f["b"]));
                let want = HexHamming {
                    matching: f["match"].parse().unwrap(),
                    bits: f["bits"].parse().unwrap(),
                };
                assert_eq!(got, want, "row {n}: {line}");
                assert_eq!(
                    got.value().to_bits(),
                    hex_u64(f["value"]),
                    "row {n}: {line}"
                );
            }
            "POPC" => {
                let got = popcount_bits(&utf8_from_hex(f["s"]));
                assert_eq!(got.to_string(), f["n"], "row {n}: {line}");
            }
            "SCORE" => {
                let got = score_envelope(
                    &utf8_from_hex(f["js"]),
                    &utf8_from_hex(f["auth"]),
                    &utf8_from_hex(f["seed"]),
                );
                assert_eq!(got.to_bits(), hex_u64(f["value"]), "row {n}: {line}");
            }
            "PATHPID" => {
                let rooms: Vec<i64> = f["rooms"]
                    .split(',')
                    .filter(|r| !r.is_empty())
                    .map(|r| r.parse().unwrap())
                    .collect();
                let got = path_pid(&rooms).unwrap_or_else(|| "none".to_string());
                assert_eq!(got, f["pid"], "row {n}: {line}");
            }
            other => panic!("row {n}: unknown kind {other}"),
        }
    }
    let total: usize = counts.values().sum();
    assert_eq!(total.to_string(), header["rows"]);
    for (kind, count) in &counts {
        assert_eq!(count.to_string(), header[kind.as_str()], "count of {kind}");
    }
}
