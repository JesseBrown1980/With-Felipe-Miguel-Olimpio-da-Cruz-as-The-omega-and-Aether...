//! The MYTHOS GGUF head (KVs and tensor infos) and glyph_features bytes against the owner's
//! pump_glyphs_mythos.py (run unchanged by the referee) on five seeds, one per path through
//! lines 220-269:
//!   pinned        every cv NaN: F keeps all rows, argmin = 0 (first NaN)
//!   tri2-6-19500  4 finite rows (< 8): F keeps all rows, argmin = first NaN at index 1
//!   tri2-3-22290  exactly 8 finite rows: F = F_m, kept = kept_m
//!   tri4-1-60000  22 finite rows, roundest glyph outside kept[:2]: 9 slices
//!   tri2-3-30000  32 finite rows, roundest glyph = kept[0]: the repeated slice word keeps one entry
mod common;

use common::{crate_path, hbp_rows, scratch, sha256, tri2, tri4};
use pump_glyphs_herself::mythos;

fn check(name: &str) {
    let row = hbp_rows("mythos_cases.hbp", "MYTHOSCASE")
        .into_iter()
        .find(|r| r["k"] == name)
        .unwrap();
    let seed = row["seed"].parse::<u64>().unwrap();
    let len = row["len"].parse::<usize>().unwrap();
    let path = match row["family"].as_str() {
        "seed" => crate_path("vendor/MYTHOS-SELF-EMISSION.txt"),
        fam => {
            let bytes = if fam == "tri2" {
                tri2(seed, len)
            } else {
                tri4(seed, len)
            };
            let p = scratch(&format!("mythos-{name}")).join("seed.bin");
            std::fs::write(&p, bytes).unwrap();
            p
        }
    };
    let (head, features) = mythos::head_and_features(&path).unwrap();
    assert_eq!(sha256(&head), row["head_sha256"], "{name}: head");
    assert_eq!(
        features.len() / 24,
        row["feature_rows"].parse::<usize>().unwrap(),
        "{name}: glyph_features rows"
    );
    assert_eq!(
        sha256(&features),
        row["features_sha256"],
        "{name}: glyph_features"
    );
}

#[test]
fn pinned_seed_all_nan() {
    check("pinned");
}

#[test]
fn few_finite_rows_first_nan() {
    check("tri2-6-19500");
}

#[test]
fn exactly_eight_finite_rows() {
    check("tri2-3-22290");
}

#[test]
fn roundest_outside_first_two() {
    check("tri4-1-60000");
}

#[test]
fn roundest_is_first_kept() {
    check("tri2-3-30000");
}
