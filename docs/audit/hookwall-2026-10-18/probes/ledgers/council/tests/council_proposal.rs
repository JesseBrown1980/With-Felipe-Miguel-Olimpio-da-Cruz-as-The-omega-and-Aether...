//! Probe: [FABRIC/output] council loop-ledger proposal row with a score but no risk or genius
//! (council-serve/src/routes.rs:205-218), through the public producer and the full
//! `/api/loop/schedule` route with ASOLARIA_LOOP_LEDGER set. Plus the vote-ledger parity route
//! (routes.rs:70-111) against a re-hashed vote row.

use std::fs;
use std::path::Path;
use std::sync::Arc;

use asolaria_server_council_serve::schedule::{expected_acceptance_q, Proposal};
use asolaria_server_council_serve::{producer, route, Shared};
use asolaria_server_vote_quorum::canon;

fn show(line: &str) -> Option<Proposal> {
    let p = producer::proposal(line);
    match &p {
        Some(p) => println!(
            "proposal({line}) -> score_q={} genius_q={} risk_q={} expected_acceptance_q={}",
            p.score_q,
            p.genius_q,
            p.risk_q,
            expected_acceptance_q(p)
        ),
        None => println!("proposal({line}) -> None (legacy)"),
    }
    p
}

#[test]
fn council_proposal_defaults_and_schedule_route() {
    // Score only: genius := score, risk := 0.
    let p = show(r#"{"id":"s-only","score":0.6}"#).unwrap();
    assert_eq!((p.score_q, p.genius_q, p.risk_q), (600, 600, 0));
    assert_eq!(expected_acceptance_q(&p), 600);

    // The same score with the pessimistic reading supplied explicitly.
    let worst = show(r#"{"id":"s-worst","score":0.6,"genius":0,"risk":1}"#).unwrap();
    assert_eq!(expected_acceptance_q(&worst), 0);
    let mid = show(r#"{"id":"s-risk","score":0.6,"risk":0.5}"#).unwrap();
    assert_eq!(expected_acceptance_q(&mid), 100);

    // Malformed risk values also fall back to risk 0.
    for line in [
        r#"{"id":"r-str","score":0.6,"risk":"high"}"#,
        r#"{"id":"r-null","score":0.6,"risk":null}"#,
        r#"{"id":"r-exp","score":0.6,"risk":9e-1}"#,
        r#"{"id":"r-arr","score":0.6,"risk":[1]}"#,
    ] {
        let p = show(line).unwrap();
        assert_eq!(p.risk_q, 0, "{line}");
        assert_eq!(expected_acceptance_q(&p), 600, "{line}");
    }

    // Through the full route, threshold 500, budget 8 (defaults).
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("work/council");
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let ledger = dir.join("loop.ndjson");
    fs::write(
        &ledger,
        "{\"id\":\"s-only\",\"score\":0.6}\n{\"id\":\"s-risk\",\"score\":0.6,\"risk\":0.5}\n{\"id\":\"s-worst\",\"score\":0.6,\"genius\":0,\"risk\":1}\n{\"id\":\"r-str\",\"score\":0.6,\"risk\":\"high\"}\n",
    )
    .unwrap();
    std::env::set_var("ASOLARIA_LOOP_LEDGER", &ledger);
    std::env::remove_var("ASOLARIA_VERIFY_BUDGET");
    std::env::remove_var("ASOLARIA_ACCEPT_THRESHOLD");
    let shared = Arc::new(Shared {
        vote_dir: dir.clone(),
    });
    let (code, body) = route(&shared, "GET", "/api/loop/schedule", "");
    println!("route /api/loop/schedule -> {code}\n{body}");
    assert_eq!(code, 200);
    assert!(body.contains("|id=s-only|confidence_q=600|action=VERIFY|fire=false|"));
    assert!(body.contains("|id=r-str|confidence_q=600|action=VERIFY|fire=false|"));
    assert!(body.contains("|id=s-risk|confidence_q=100|action=DEFER|fire=false|"));
    assert!(body.contains("|id=s-worst|confidence_q=0|action=DEFER|fire=false|"));
    assert!(!body.contains("fire=true"));

    // Ledger unset -> staged, never a schedule.
    std::env::remove_var("ASOLARIA_LOOP_LEDGER");
    let (code, body) = route(&shared, "GET", "/api/loop/schedule", "");
    println!("route /api/loop/schedule (unset) -> {code}\n{body}");

    // Vote-ledger parity route: a vote row altered (class -> LAW_CHANGE) and re-hashed with the
    // public canon passes as match; a row deleted is invisible; a missing file fails closed.
    let base = r#"{"vote_id": "v1", "antecedents": "0000000000000000", "decision_class": "HEARTBEAT_ACK", "voter": "OP-anything"}"#;
    let h = canon::recompute(base).unwrap();
    let good = format!(
        r#"{{"vote_id": "v1", "antecedents": "0000000000000000", "decision_class": "HEARTBEAT_ACK", "voter": "OP-anything", "row_hash": "{h}"}}"#
    );
    let forged_base = base.replace("HEARTBEAT_ACK", "LAW_CHANGE");
    let h2 = canon::recompute(&forged_base).unwrap();
    let forged = format!(
        r#"{{"vote_id": "v1", "antecedents": "0000000000000000", "decision_class": "LAW_CHANGE", "voter": "OP-anything", "row_hash": "{h2}"}}"#
    );
    fs::write(dir.join("queue.ndjson"), format!("{good}\n")).unwrap();
    fs::write(dir.join("votes.ndjson"), format!("{forged}\n")).unwrap();
    // outcomes.ndjson deliberately absent.
    let (code, body) = route(&shared, "GET", "/api/vote-quorum/parity", "");
    println!("route /api/vote-quorum/parity -> {code}\n{body}");
    assert!(body.contains("ledger=votes|ok=1|missing=0|rows_with_hash=1|match=1|mismatch=0"));
    assert!(body.contains("ledger=outcomes|ok=0|missing=1"));
    assert_eq!(code, 500);
}
