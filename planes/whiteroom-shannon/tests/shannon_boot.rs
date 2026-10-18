//! tests/fixtures/shannon-boot.hbp: the Shannon-gate boot fixture (pipeline/shannon-boot.mjs:30-170)
//! on one gate's state: checks before and after boots, failed boots, bus emits, selfTest and the
//! emitFixtureRestored row. approvedBy (:118) and cosign (:155) are operator-supplied stand-ins.

mod common;

use common::{escape, rows, unescape, Row};
use whiteroom_shannon::shannon_boot::{
    emit_fixture_restored, fixture_restored_row, Boot, GateVerdict, ProfileDoc, ProfileSource,
    ShannonGate, DEFAULT_ANCHOR, DEFAULT_PREV_HASH,
};

const LOADED_AT: &str = "2026-10-17T00:00:00.000Z";

fn source(token: &str) -> ProfileSource {
    let (kind, rest) = token.split_once(':').expect("source token");
    match kind {
        "not_found" => ProfileSource::NotFound {
            resolved_path: unescape(rest),
        },
        "parse_error" => ProfileSource::ParseError {
            message: unescape(rest),
        },
        _ => {
            let mut doc = ProfileDoc::default();
            for field in rest.split(',').filter(|f| !f.is_empty()) {
                let (key, value) = field.split_once('~').expect("key~value");
                let value = Some(unescape(value));
                match key {
                    "agent_pid_current" => doc.agent_pid_current = value,
                    "role" => doc.role = value,
                    "supervisor_pid" => doc.supervisor_pid = value,
                    "prof_pid" => doc.prof_pid = value,
                    "bhh" => doc.last_rotation_brown_hilbert_hash = value,
                    other => panic!("unknown profile field {other}"),
                }
            }
            ProfileSource::Doc(doc)
        }
    }
}

fn assert_verdict(v: &GateVerdict, row: &Row) {
    assert_eq!(v.granted, row.raw("granted") == "1", "{}", row.line);
    assert_eq!(v.status.unwrap_or("-"), row.raw("status"), "{}", row.line);
    assert_eq!(
        v.approval_state.unwrap_or("-"),
        row.raw("approval_state"),
        "{}",
        row.line
    );
    let reason = if v.reason.is_empty() { "-" } else { v.reason };
    assert_eq!(reason, row.raw("reason"), "{}", row.line);
    let anchors = if v.rule_anchors.is_empty() {
        "-".to_string()
    } else {
        v.rule_anchors.join(",")
    };
    assert_eq!(anchors, row.raw("anchors"), "{}", row.line);
}

#[test]
fn the_gate_state_machine_matches_the_referee() {
    let mut gate = ShannonGate::new();
    let mut counts = [0; 3];
    for row in rows("shannon-boot.hbp") {
        match row.kind.as_str() {
            "CHECK" => {
                let got = gate.check(
                    &row.value("action"),
                    &row.value("tier"),
                    &row.value("approval"),
                );
                match row.opt("error") {
                    Some(_) => assert!(got.is_err(), "{}", row.line),
                    None => assert_verdict(&got.expect("verdict"), &row),
                }
                counts[0] += 1;
            }
            "BOOT" => {
                let boot = gate.boot(&source(row.raw("source")), LOADED_AT);
                match &boot {
                    Boot::Ok(profile) => {
                        assert_eq!(row.raw("ok"), "1", "{}", row.line);
                        assert_eq!(profile.brown_hilbert_hash, row.raw("bhh"));
                        assert_eq!(profile.loaded_at, LOADED_AT);
                    }
                    Boot::Failed(reason) => {
                        assert_eq!(row.raw("ok"), "0", "{}", row.line);
                        assert_eq!(escape(reason), row.raw("reason"), "{}", row.line);
                    }
                }
                assert_eq!(
                    gate.listeners().to_string(),
                    row.raw("listeners"),
                    "{}",
                    row.line
                );
                counts[1] += 1;
            }
            "BUS" => {
                let got = gate.bus_check(&row.value("req"));
                match row.opt("error") {
                    Some(_) => assert!(got.is_err(), "{}", row.line),
                    None => {
                        let verdicts = got.expect("verdicts");
                        assert_eq!(verdicts.len().to_string(), row.raw("count"), "{}", row.line);
                        if let Some(first) = verdicts.first() {
                            assert_verdict(first, &row);
                            assert!(verdicts.iter().all(|v| v == first));
                        }
                    }
                }
                counts[2] += 1;
            }
            _ => {}
        }
    }
    assert_eq!(counts, [300, 7, 60]);
}

#[test]
fn self_tests_match_the_referee() {
    let mut n = 0;
    for row in rows("shannon-boot.hbp")
        .iter()
        .filter(|r| r.kind == "SELFTEST")
    {
        let mut gate = ShannonGate::new();
        let t = gate.self_test(
            &source(row.raw("source")),
            LOADED_AT,
            &row.string("approved_by"),
        );
        assert_eq!(t.all_green, row.raw("all_green") == "1", "{}", row.line);
        let results: Vec<String> = t
            .results
            .iter()
            .map(|r| format!("{}:{}:{}", r.name, u8::from(r.ok), escape(&r.detail)))
            .collect();
        assert_eq!(results.join(";"), row.raw("results"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 14);
}

#[test]
fn fixture_rows_match_the_referee() {
    let mut n = 0;
    for row in rows("shannon-boot.hbp")
        .iter()
        .filter(|r| r.kind == "FIXTURE")
    {
        let (body, row_hash) = fixture_restored_row(
            &row.text("anchor"),
            &row.text("prev_hash"),
            row.raw("cosign"),
        );
        assert_eq!(escape(&body), row.raw("body"), "{}", row.line);
        assert_eq!(row_hash, row.raw("row_hash"), "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 3);
}

#[test]
fn emit_appends_one_line_and_creates_the_directory() {
    let dir = std::env::temp_dir().join(format!("ws-shannon-{}", std::process::id()));
    let path = dir.join("fixtures").join("shannon-r1-boot.hbp");
    let _ = std::fs::remove_dir_all(&dir);
    let cosign = "OPERATOR-SUPPLIED-COSIGN";
    let a = emit_fixture_restored(&path, DEFAULT_ANCHOR, DEFAULT_PREV_HASH, cosign).expect("emit");
    let b = emit_fixture_restored(&path, DEFAULT_ANCHOR, DEFAULT_PREV_HASH, cosign).expect("emit");
    assert_eq!(a, b);
    let text = std::fs::read_to_string(&path).expect("read");
    assert_eq!(text, format!("{}{}", a.line, b.line));
    assert!(a.line.ends_with(&format!("|row_hash={}\n", a.row_hash)));
    std::fs::remove_dir_all(&dir).expect("cleanup");
}
