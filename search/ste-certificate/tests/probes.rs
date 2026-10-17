//! `distance-probe.mjs` and `sidon-probe.mjs` against the referee's fixtures and the records.

mod common;

use common::{expected_stdout, fields, get, num, rows};
use ste_certificate::{distance_probe, sidon_probe};

#[test]
fn distance_probe_stdout_equals_the_referee() {
    assert_eq!(
        distance_probe::stdout_lines(),
        expected_stdout("distance-probe")
    );
}

#[test]
fn linear_counts_equal_the_records() {
    // F02-builder.md:123-125: 2 / 75 / 1841 collisions at N = 64 / 128 / 256.
    let ours: Vec<String> = distance_probe::stdout_lines()
        .into_iter()
        .filter(|l| l.starts_with("LINEAR"))
        .collect();
    let recorded = include_str!("../vendor/records/F02-builder-123-125.txt");
    assert_eq!(recorded.lines().count(), ours.len());
    for (r, c) in recorded.lines().zip(&ours) {
        assert_eq!(fields(r), fields(c));
    }
    let collisions: Vec<u64> = distance_probe::probes()
        .iter()
        .filter(|p| p.label == "LINEAR ")
        .map(|p| p.collide)
        .collect();
    assert_eq!(collisions, [2, 75, 1841]);
}

#[test]
fn prime_cube_weighted_count_equals_the_record() {
    // F02-builder.md:131: "(896 at N=256)".
    let note = include_str!("../vendor/records/F02-builder-131.txt");
    assert!(note.contains("(896 at N=256)"));
    let p = distance_probe::probe(distance_probe::bh_index_sidon, "SIDON  ", 256);
    assert_eq!(p.collide, 896);
}

#[test]
fn registrations_equal_the_referee() {
    let text = include_str!("fixtures/expected-probe-nodes.hbp");
    let nodes = rows(text, "NODE");
    assert_eq!(nodes.len(), 256);
    for row in &nodes {
        let r = distance_probe::reg(get(row, "name"));
        let s = num(row, "u32");
        assert_eq!(
            (
                u128::from(r.sector),
                u128::from(r.lane),
                u128::from(r.glyph)
            ),
            (
                s % u128::from(distance_probe::SECTORS),
                s % 3,
                s % u128::from(distance_probe::WIDTH)
            )
        );
        assert_eq!(u128::from(r.sector), num(row, "sector"));
        assert_eq!(u128::from(r.lane), num(row, "lane"));
        assert_eq!(u128::from(r.glyph), num(row, "glyph"));
        assert_eq!(
            u128::from(distance_probe::bh_index_linear(&r)),
            num(row, "linear")
        );
        assert_eq!(
            u128::from(distance_probe::bh_index_sidon(&r)),
            num(row, "sidon")
        );
    }
}

#[test]
fn upper_casing_follows_unicode_15_1() {
    // Rust 1.81 str::to_uppercase leaves U+0264 unchanged; Unicode 16.0 maps it to U+A7CB, and
    // Node v22.22.0 running distance-probe.mjs:8-9 gives reg("\u{264}") the values of U+A7CB here.
    assert_eq!(char::UNICODE_VERSION, (15, 1, 0));
    let r = distance_probe::reg("\u{264}");
    assert_eq!((r.sector, r.lane, r.glyph), (32, 0, 500));
    let r = distance_probe::reg("\u{A7CB}");
    assert_eq!((r.sector, r.lane, r.glyph), (23, 2, 622));
}

#[test]
fn sidon_probe_stdout_equals_the_referee() {
    assert_eq!(sidon_probe::stdout_lines(), expected_stdout("sidon-probe"));
}

#[test]
fn sidon_probe_layout_equals_the_referee() {
    let text = include_str!("fixtures/expected-sidon-probe-points.hbp");
    let (towers, all) = sidon_probe::layout();
    let want_towers = rows(text, "TOWER");
    assert_eq!(towers.len(), want_towers.len());
    for (t, row) in towers.iter().zip(&want_towers) {
        assert_eq!(u128::from(t.p), num(row, "p"));
        assert_eq!(u128::from(t.span), num(row, "span"));
        assert_eq!(u128::from(t.anchor), num(row, "anchor"));
    }
    let want_points = rows(text, "POINT");
    assert_eq!(all.len(), want_points.len());
    for (i, row) in want_points.iter().enumerate() {
        assert_eq!(u128::from(all[i]), num(row, "point"));
    }
}
