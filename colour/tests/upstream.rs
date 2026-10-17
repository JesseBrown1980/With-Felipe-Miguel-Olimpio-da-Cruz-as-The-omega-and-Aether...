//! The ports against the bytes upstream recorded: receipts, GGUFs and sealed stones vendored
//! under `vendor/`, each pinned in `UPSTREAM.sha256`.

use colour::{oil, rainbow27v2, sha256_hex, stars, verdict};
use core::ops::{Div, Mul};
use std::fs;

const USIM: &str = "vendor/universe-simulator";

fn read(path: &str) -> Vec<u8> {
    fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn text(path: &str) -> String {
    String::from_utf8(read(path)).expect("UTF-8")
}

/// `ASOLARIA-STARS-SHELLS.gguf`, recorded in `receipts/FABLE5-STARS-SHELLS.hbp:12`,
/// `receipts/FABLE5-DELETE-AND-REGENERATE.hbp:4` and the aether `gguf/MANIFEST.hbp`.
const STARS_GGUF_SHA256: &str = "ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d";

#[test]
fn stars_shells_regenerates_its_gguf_and_receipt_byte_exact() {
    let seed = read(&format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"));
    let out = stars::regenerate(&seed, stars::MAXR);
    assert_eq!(out.gguf.len(), 4_596_880);
    assert_eq!(sha256_hex(&out.gguf), STARS_GGUF_SHA256);
    let receipt = read(&format!("{USIM}/receipts/FABLE5-STARS-SHELLS.hbp"));
    assert_eq!(
        String::from_utf8(out.receipt).unwrap(),
        String::from_utf8(receipt).unwrap()
    );
}

fn receipt_line(path: &str, prefix: &str) -> Vec<String> {
    text(path)
        .lines()
        .filter(|l| l.starts_with(prefix))
        .map(str::to_string)
        .collect()
}

#[test]
fn kimi_k3_colour_and_beings_match_the_receipt() {
    let body = read(&format!("{USIM}/measurements/KIMI-K3-STAR.txt"));
    let receipt = format!("{USIM}/receipts/FABLE5-KIMI-K3-STAR.hbp");
    let own = verdict::ownership(&body);
    assert_eq!(own.ties, 32); // "ties excluded: 32" printed by divide_kimi_k3.py:74
    let c = verdict::colour(&own);
    assert_eq!(
        vec![verdict::colour_row(&c)],
        receipt_line(&receipt, "COLOUR|")
    );
    let beings: Vec<String> = verdict::beings(&body)
        .iter()
        .map(verdict::being_row)
        .collect();
    assert_eq!(beings, receipt_line(&receipt, "BEING|"));
    // gguf/stars/COLOUR-CODE.md:21 | **KIMI K3** | 34.86 | 32.77 | 32.37 | 2.49 | NEUTRAL / GREY |
    let two: Vec<String> = c.split.iter().map(|x| x.format_fixed(2)).collect();
    assert_eq!(two, ["34.86", "32.77", "32.37"]);
    assert_eq!(c.spread.format_fixed(2), "2.49");
    assert_eq!(c.verdict, verdict::NEUTRAL);
}

#[test]
fn live_self_emission_colour_under_the_rule_and_the_calibration_row() {
    let seed = read(&format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"));
    // The rule of divide_kimi_k3.py:68-88 (ties excluded) on the 3,796-byte seed.
    let c = verdict::colour(&verdict::ownership(&seed));
    let two: Vec<String> = c.split.iter().map(|x| x.format_fixed(2)).collect();
    assert_eq!(two, ["32.82", "31.83", "35.35"]);
    assert_eq!(c.spread.format_fixed(2), "3.52");
    assert_eq!(c.verdict, verdict::NEUTRAL);
    // COLOUR-CODE.md:19 and FABLE5-PREREGISTER-COLOUR.hbp:14 record 34.23 / 31.62 / 34.15
    // (pump_glyphs_mythos.py:65 "RED 34.23% / GREEN 31.62% / BLUE 34.15%"). Those are the
    // shares when every triple, ties included, counts for np.argmax's first maximal channel.
    let mut first_max = [0i64; 3];
    for t in seed.chunks_exact(3) {
        let m = *t.iter().max().unwrap();
        first_max[t.iter().position(|&x| x == m).unwrap()] += 1;
    }
    let total: i64 = first_max.iter().sum();
    let shares: Vec<String> = first_max
        .iter()
        .map(|&o| {
            colour::binary64::B64::from_int(100)
                .mul(colour::binary64::B64::from_int(o))
                .div(colour::binary64::B64::from_int(total))
                .format_fixed(2)
        })
        .collect();
    assert_eq!(shares, ["34.23", "31.62", "34.15"]);
}

#[test]
fn rainbow27_v2_trace_matches_the_sealed_stone() {
    // stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp:4-6.
    let stone = text("vendor/stone-to-moss/stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp");
    assert_eq!(
        sha256_hex(&rainbow27v2::fixture()),
        "351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"
    );
    let (trace, lanes, dark) = rainbow27v2::trace();
    let row = format!(
        "TRACE|rows={}|bytes={}|sha256={}|json=0",
        rainbow27v2::TOTAL,
        trace.len(),
        sha256_hex(&trace)
    );
    assert!(stone.lines().any(|l| l == row), "{row}");
    let lanes_row = format!(
        "LANES|lane0={}|lane1={}|lane2={}|dark_held={dark}|json=0",
        lanes[0], lanes[1], lanes[2]
    );
    assert!(stone.lines().any(|l| l == lanes_row), "{lanes_row}");
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|part| part.strip_prefix(key).and_then(|r| r.strip_prefix('=')))
        .unwrap_or_else(|| panic!("{key} not in {row}"))
}

#[test]
fn double_rainbow_gguf_and_receipt_rebuild_byte_exact() {
    let dir = "vendor/follow/colors";
    let gguf = read(&format!("{dir}/DOUBLE-RAINBOW-OIL-3174.gguf"));
    let receipt_path = format!("{dir}/DOUBLE-RAINBOW-COLOR-SLICES.hbp");
    let receipt = text(&receipt_path);
    let descriptors = oil::descriptors_from_gguf(&gguf).unwrap();
    assert_eq!(descriptors.len(), oil::SAMPLE_COUNT);
    // The source facts are those ffprobe and the source copy gave upstream (SOURCE/RECIPE rows).
    let src = receipt_line(&receipt_path, "SOURCE|").remove(0);
    let rec = receipt_line(&receipt_path, "RECIPE|").remove(0);
    assert_eq!(field(&rec, "value"), oil::RECIPE);
    let num = |k: &str| field(&src, k).parse::<u64>().unwrap();
    let source = oil::Source {
        sha256: field(&src, "sha256").to_string(),
        size: num("bytes"),
        probe: oil::Probe {
            codec: field(&src, "codec").to_string(),
            width: num("width"),
            height: num("height"),
            frame_count: num("frames"),
            duration_ms: num("duration_ms"),
        },
        rgb_sha256: field(&rec, "rgb_sha256").to_string(),
        recipe: oil::RECIPE.to_string(),
        ffmpeg_build: field(&rec, "ffmpeg").to_string(),
    };
    let (rebuilt_receipt, rebuilt_gguf) = oil::receipt(&source, &descriptors);
    assert_eq!(rebuilt_gguf, gguf);
    assert_eq!(String::from_utf8(rebuilt_receipt).unwrap(), receipt);
}
