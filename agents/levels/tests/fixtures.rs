//! The ports against the stdout of the vendored upstream scripts, recorded by
//! `tools/levels_referee.py fixtures` (and re-checked there with `--check`).

use levels_agents::rime_agents::{rime_agents_run, BPC_BINARY64_BOUND_1E12};
use sha2::{Digest, Sha256};

/// The stdout a fixture records, after checking its END row.
fn fixture_stdout(fixture: &str) -> String {
    let mut out = String::new();
    let mut end = None;
    for row in fixture.lines() {
        if let Some(rest) = row.strip_prefix("LINE|") {
            let (_, text) = rest.split_once("|text=").expect("LINE row");
            out.push_str(text);
            out.push('\n');
        } else if row.starts_with("END|") {
            end = Some(row);
        }
    }
    let end = end.expect("END row");
    let sha = hex(&Sha256::digest(out.as_bytes()));
    assert!(end.contains(&format!("|stdout_sha256={sha}|")), "{end}");
    assert!(
        end.contains(&format!("|stdout_bytes={}|", out.len())),
        "{end}"
    );
    out
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(char::from(DIGITS[usize::from(b >> 4)]));
        s.push(char::from(DIGITS[usize::from(b & 15)]));
    }
    s
}

/// `synthetic_bytes()` of tools/levels_referee.py (= model/hrm-mtp/tools/rime_referee.py:126-134).
fn synthetic_bytes() -> Vec<u8> {
    let mut x: u64 = 0x2545_f491_4f6c_dd1d;
    let alpha = b"etaoin shrdlucmfwyp";
    (0..600_000usize)
        .map(|i| {
            x = x
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            if i >= 500_000 && i % 997 == 0 {
                (x >> 40) as u8
            } else {
                alpha[((x >> 33) % alpha.len() as u64) as usize]
            }
        })
        .collect()
}

#[test]
fn rime_fischer_matches_upstream_stdout() {
    let want = fixture_stdout(include_str!("fixtures/rime-fischer.hbp"));
    assert_eq!(levels_agents::rime_fischer::main_stdout(), want);
}

#[test]
fn four_agents_match_upstream_stdout_on_synthetic_bytes() {
    let fixture = include_str!("fixtures/rime-agents-synthetic.hbp");
    let data = synthetic_bytes();
    let sha = hex(&Sha256::digest(&data));
    assert!(fixture.contains(&format!("|sha256={sha}|")));
    let (stdout, margin) = rime_agents_run(&data);
    assert_eq!(stdout, fixture_stdout(fixture));
    assert!(margin > BPC_BINARY64_BOUND_1E12, "tie margin {margin}");
}
