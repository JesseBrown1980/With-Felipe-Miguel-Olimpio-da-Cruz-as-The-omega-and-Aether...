//! The in-process library: the loop-ledger producer feeding `confidence_schedule`, the vote-ledger
//! parity route, and the vote-quorum canon over the cosign fixture upstream ships.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use asolaria_server_council_serve::schedule::Proposal;
use asolaria_server_council_serve::{producer, route, Shared};
use asolaria_server_vote_quorum::canon;

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "asolaria-council-inprocess-{}-{name}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn producer_reproduces_the_upstream_schedule_rows() {
    // The ledger of routes.rs:1221, budget 1, threshold 500.
    let ledger = "{\"id\":\"hi\",\"score\":0.9,\"genius\":0.9}\n{\"id\":\"lo\",\"score\":0.1,\"genius\":0.1}\n";
    let (code, rows) = producer::schedule_rows(ledger, 1, 500);
    assert_eq!(code, 200);
    assert_eq!(
        rows,
        "COUNCILSCHEDULE|ok=1|status=staged|read_only=true|scheduler=confidence_scheduled_verify|total=2|verify=1|defer=1|legacy=0|budget=1|threshold_q=500|fire=false|cutover=false|json=0\n\
         COUNCILSCHED|rank=0|id=hi|confidence_q=900|action=VERIFY|fire=false|json=0\n\
         COUNCILSCHED|rank=1|id=lo|confidence_q=100|action=DEFER|fire=false|json=0\n"
    );
}

#[test]
fn producer_fills_proposal_as_routes_rs_207_217() {
    let p: Proposal = producer::proposal(r#"{"id":"x1","score":0.8,"risk":0.1}"#).unwrap();
    assert_eq!(
        (p.id.as_str(), p.score_q, p.genius_q, p.risk_q),
        ("x1", 800, 800, 100)
    );
    let p = producer::proposal(r#"{"id":"r","score":0.12345,"genius":1.5,"risk":-0.2}"#).unwrap();
    assert_eq!((p.score_q, p.genius_q, p.risk_q), (123, 1000, 0));
    let p = producer::proposal(r#"{"id":"h","score":0.9995}"#).unwrap();
    assert_eq!(p.score_q, 1000);
    assert!(producer::proposal(r#"{"id":"e","score":8e-1}"#).is_none());
    assert!(producer::proposal(r#"{"score":0.5}"#).is_none());
}

#[test]
fn vote_ledger_parity_route_counts_match_mismatch_legacy() {
    let dir = scratch("parity");
    let base = r#"{"vote_id": "v1", "antecedents": "0000000000000000", "decision_class": "HEARTBEAT_ACK"}"#;
    let h = canon::recompute(base).unwrap();
    let good = format!(
        r#"{{"vote_id": "v1", "antecedents": "0000000000000000", "decision_class": "HEARTBEAT_ACK", "row_hash": "{h}"}}"#
    );
    let tampered = good.replace("HEARTBEAT_ACK", "LAW_CHANGE");
    fs::write(dir.join("queue.ndjson"), format!("{good}\n")).unwrap();
    fs::write(
        dir.join("votes.ndjson"),
        format!("{good}\n{tampered}\n{base}\n"),
    )
    .unwrap();
    fs::write(dir.join("outcomes.ndjson"), "").unwrap();
    let shared = Arc::new(Shared {
        vote_dir: dir.clone(),
    });
    let (code, rows) = route(&shared, "GET", "/api/vote-quorum/parity", "");
    assert_eq!(code, 200);
    assert_eq!(
        rows,
        "COUNCILPARITY|ledger=queue|ok=1|missing=0|rows_with_hash=1|match=1|mismatch=0|legacy=0|json=0\n\
         COUNCILPARITY|ledger=votes|ok=1|missing=0|rows_with_hash=2|match=1|mismatch=1|legacy=1|json=0\n\
         COUNCILPARITY|ledger=outcomes|ok=1|missing=0|rows_with_hash=0|match=0|mismatch=0|legacy=0|json=0\n"
    );
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn vote_quorum_canon_reproduces_the_cosign_fixture_row_hashes() {
    // vote-quorum canon.rs:5-6 states the recipe is shared with the cosign ledger.
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../cosign-serve/fixtures/daemon-row-hash.ndjson");
    let body = fs::read_to_string(fixture).unwrap();
    let got: Vec<(String, String)> = body
        .lines()
        .map(|l| {
            (
                canon::recompute(l).unwrap(),
                canon::stored_row_hash(l).unwrap(),
            )
        })
        .collect();
    assert_eq!(
        got,
        vec![
            (
                String::from("101b6e1b41a4038f"),
                String::from("101b6e1b41a4038f")
            ),
            (
                String::from("ff433399335fe8ad"),
                String::from("ff433399335fe8ad")
            ),
        ]
    );
}

#[test]
fn health_row_is_upstream_text() {
    let shared = Arc::new(Shared {
        vote_dir: PathBuf::from("."),
    });
    assert_eq!(
        route(&shared, "GET", "/health", ""),
        (200, String::from("COUNCILSERVE|ok=1|service=asolaria-council-serve|port=5090|engine=gated_own_thread|process_launch=0|auto_fire=false|read_only=true|json=0\n"))
    );
}
