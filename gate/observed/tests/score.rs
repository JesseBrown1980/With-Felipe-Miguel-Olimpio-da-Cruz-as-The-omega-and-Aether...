//! `score` against tests/fixtures/expected-score.hbp, which tools/score_referee.py writes from
//! Python binary64 mirrors of asolaria-score.mjs.

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::spawn_gate::{spawn_gate_verdict, SpawnGateInput};
use asolaria_hookwall::syscall::{AccessTier, HookwallVerdict};
use asolaria_observed::score::{
    composite_e4, forward_score_q, reverse_gain, reverse_risk_q, sha_baseline_e4, shannon_e4,
    ReverseGain, Signals,
};
use std::collections::{BTreeMap, BTreeSet};

const EXPECTED: &str = include_str!("fixtures/expected-score.hbp");

fn rows(kind: &str) -> Vec<BTreeMap<&'static str, &'static str>> {
    EXPECTED
        .lines()
        .filter(|line| !line.starts_with('#'))
        .filter_map(|line| {
            let mut fields = line.split('|');
            (fields.next() == Some(kind)).then(|| {
                fields
                    .map(|field| field.split_once('=').expect("key=value"))
                    .collect()
            })
        })
        .collect()
}

fn number(row: &BTreeMap<&str, &str>, key: &str) -> u32 {
    row[key].parse().expect("decimal")
}

fn optional(row: &BTreeMap<&str, &str>, key: &str) -> Option<u32> {
    row.get(key).map(|value| value.parse().expect("decimal"))
}

fn utf8_from_hex(hex: &str) -> String {
    let bytes = (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("hex"))
        .collect();
    String::from_utf8(bytes).expect("UTF-8")
}

fn ascii_content_from_bins(bins: &str) -> String {
    let counts: Vec<usize> = bins.split(',').map(|c| c.parse().expect("count")).collect();
    assert_eq!((counts.len(), b'0' % 12), (12, 0));
    let mut content = String::new();
    for (residue, &count) in counts.iter().enumerate() {
        let byte = char::from(b'0' + u8::try_from(residue).expect("residue"));
        content.extend(std::iter::repeat(byte).take(count));
    }
    content
}

#[test]
fn shannon_equals_the_javascript_value_on_every_referee_row() {
    let (mut cases, mut equal_to_exact) = (0u32, 0u32);
    for row in rows("SHANNON") {
        let content = match (row.get("bins"), row.get("utf8_hex")) {
            (Some(bins), None) => ascii_content_from_bins(bins),
            (None, Some(hex)) => utf8_from_hex(hex),
            _ => panic!("SHANNON row needs bins or utf8_hex: {row:?}"),
        };
        let got = shannon_e4(&content);
        assert_eq!(got, number(&row, "want"), "{row:?}");
        equal_to_exact += u32::from(got == number(&row, "exact"));
        cases += 1;
    }
    println!("SHANNON|cases={cases}|equal_to_javascript={cases}|equal_to_exact={equal_to_exact}");
    assert_eq!((cases, equal_to_exact), (20_247, 20_242));
}

#[test]
fn shannon_is_zero_for_one_bin_and_one_for_twelve_equal_bins_at_any_length() {
    assert_eq!(shannon_e4(""), 0);
    assert_eq!(shannon_e4(&"x".repeat(1 << 20)), 0);
    assert_eq!(shannon_e4(&"0123456789:;".repeat(1 << 17)), 10_000);
}

#[test]
fn sha_baseline_matches_the_referee() {
    let rows = rows("BASELINE");
    assert!(rows.len() > 1_000);
    for row in rows {
        let (pid, content) = (
            utf8_from_hex(row["pid_hex"]),
            utf8_from_hex(row["content_hex"]),
        );
        assert_eq!(
            sha_baseline_e4(&pid, &content),
            number(&row, "want"),
            "{row:?}"
        );
    }
}

#[test]
fn composite_matches_the_referee_for_every_signal_pattern() {
    let mut patterns = BTreeSet::new();
    let rows = rows("COMPOSITE");
    assert!(rows.len() >= 50_000);
    for row in rows {
        let signals = Signals {
            l0: optional(&row, "l0"),
            l4: optional(&row, "l4"),
            g1: optional(&row, "g1"),
            g2: optional(&row, "g2"),
            g3: optional(&row, "g3"),
            shannon: number(&row, "shannon"),
            baseline: number(&row, "baseline"),
        };
        assert_eq!(composite_e4(&signals), number(&row, "want"), "{row:?}");
        patterns.insert(
            [signals.l0, signals.l4, signals.g1, signals.g2, signals.g3].map(|s| s.is_some()),
        );
    }
    assert_eq!(patterns.len(), 32);
}

#[test]
fn reverse_gain_matches_the_referee_on_every_composite() {
    let rows = rows("REVERSE");
    assert_eq!(rows.len(), 10_001);
    for (composite, row) in (0u32..).zip(rows) {
        assert_eq!(number(&row, "composite"), composite);
        let want = ReverseGain {
            reverse_risk_e4: number(&row, "reverse_risk"),
            promoted: row["promoted"] == "1",
        };
        assert_eq!(reverse_gain(composite), want, "{row:?}");
    }
}

#[test]
fn spawn_gate_score_rule_equals_reverse_gain_promotion() {
    let tags = ["safe-tag"];
    for composite in 0..=10_000u32 {
        let gain = reverse_gain(composite);
        let input = SpawnGateInput {
            slot: 0,
            syscall_no: 1,
            caller_pid: 0xABCD,
            tier: HookTier::Micro,
            target_tier: AccessTier::Public,
            event_tags: &tags,
            forward_score_q: forward_score_q(composite),
            reverse_risk_q: reverse_risk_q(gain.reverse_risk_e4),
        };
        let proceeds = spawn_gate_verdict(&input) == HookwallVerdict::Proceed;
        assert_eq!(proceeds, gain.promoted, "composite_e4 {composite}");
    }
}

#[test]
fn extreme_signal_values_do_not_overflow() {
    let all_max = Signals {
        l0: Some(u32::MAX),
        l4: Some(u32::MAX),
        g1: Some(u32::MAX),
        g2: Some(u32::MAX),
        g3: Some(u32::MAX),
        shannon: u32::MAX,
        baseline: u32::MAX,
    };
    assert_eq!(composite_e4(&all_max), u32::MAX);
    assert_eq!(forward_score_q(u32::MAX), 429_496_729);
    assert_eq!(reverse_risk_q(u32::MAX), 429_496_730);
    assert_eq!(reverse_gain(u32::MAX).reverse_risk_e4, 0);
}
