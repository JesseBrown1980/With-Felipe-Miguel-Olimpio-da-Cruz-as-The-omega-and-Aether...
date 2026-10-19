//! L1, L2 and L4 are read on the real request, reported and never weighted; the observation chain
//! and the watcher that recomputes it, with every tamper the watcher must catch.

use asolaria_hookwall::hookwall::HookTier;
use asolaria_hookwall::syscall::AccessTier;
use asolaria_observed::bench::{
    observation_rows, read_benched, watch, Level, Provenance, RowInputs, Watch, GENESIS,
};
use asolaria_observed::score::{composite_e4, Signals};
use asolaria_observed::{observe, observe_and_compose, Observed, PolicyInputs};
use asolaria_server_fischer_eval::FischerEnvelope;
use l0_edge::event::{parse_events, Event};
use l0_edge::features::{extract_node_features, model_input_q24};

const EVENTS: &str = include_str!("../../../model/l0-edge/tests/fixtures/events.hbp");

const BENIGN: (&str, &str) = ("agent:benign", "svc:ledger");
const SUSPICIOUS: (&str, &str) = ("agent:rogue", "svc:vault");
const UNOBSERVED: (&str, &str) = ("agent:ghost", "svc:ledger");
const PID: &str = "BH.VERDICT.TEST000000000001";
const GATE_ROW: &str = "GATE|verdict=PROCEED|fixture=1|json=0";

fn events() -> Vec<Event> {
    parse_events(EVENTS).expect("fixture events parse")
}

fn request((actor, target): (&str, &str)) -> PolicyInputs {
    PolicyInputs {
        slot: 0,
        syscall_no: 1,
        caller_pid: 0xABCD,
        hook_tier: HookTier::Micro,
        caller_tier: AccessTier::Public,
        target_tier: AccessTier::Public,
        event_tags: vec!["safe-tag".to_string()],
        fischer_envelope: FischerEnvelope {
            pid: Some(PID.to_string()),
            actor: actor.to_string(),
            verb: "tick".to_string(),
            target: target.to_string(),
            payload: "heartbeat".to_string(),
            hbp_path: Some("ledger/test.hbp".to_string()),
            halt_path: Some("/halt".to_string()),
            ..FischerEnvelope::default()
        },
        fischer_strict: false,
    }
}

fn inputs() -> RowInputs {
    RowInputs::of(EVENTS.as_bytes(), b"fixture envelope")
}

fn rows(observed: &Observed) -> String {
    observation_rows(observed, &inputs(), GATE_ROW, GENESIS).join("\n") + "\n"
}

fn field(row: &str, key: &str) -> String {
    row.split('|')
        .find_map(|part| part.strip_prefix(key)?.strip_prefix('='))
        .unwrap_or_else(|| panic!("{key} in {row}"))
        .to_string()
}

fn sha256_hex(bytes: &[u8]) -> String {
    shadowcat::hex(&shadowcat::digest(bytes))
}

/// Re-signs a row's own hash after an edit, as a forger with no key would.
fn rehash(row: &str) -> String {
    let body = row.split_once("|row_sha256=").expect("row hash").0;
    format!("{body}|row_sha256={}|json=0", sha256_hex(body.as_bytes()))
}

#[test]
fn benched_levels_read_the_real_request_and_are_absent_only_without_the_edge() {
    let events = events();
    let nodes = extract_node_features(&events);
    let node = |id: &str| nodes.iter().find(|n| n.id == id).map(model_input_q24);
    let l4 = l4_gslgnn::score_request(PID, "heartbeat").score_q24;
    for pair in [BENIGN, SUSPICIOUS] {
        let (source, target) = (node(pair.0).unwrap(), node(pair.1).unwrap());
        let read = read_benched(&events, pair.0, pair.1, PID, "heartbeat");
        assert_eq!(read.map(|r| r.level), Level::BENCHED);
        assert_eq!(read.map(|r| r.provenance), [Provenance::Real; 3]);
        assert_eq!(
            read.map(|r| r.score_q24),
            [
                Some(l1_prototype::model::pair_output(&source, &target).probability_q24),
                Some(l2_contrastive::edge_output(&source, &target).anomaly_q24),
                Some(l4),
            ]
        );
    }
    let read = read_benched(&events, UNOBSERVED.0, UNOBSERVED.1, PID, "heartbeat");
    assert_eq!(
        read.map(|r| (r.provenance, r.score_q24)),
        [
            (Provenance::Absent, None),
            (Provenance::Absent, None),
            (Provenance::Real, Some(l4)),
        ]
    );
}

#[test]
fn benched_levels_never_vote() {
    assert!(Level::BENCHED.iter().all(|level| !level.voting()));
    assert!(Level::L0.voting());
    let events = events();
    for pair in [BENIGN, SUSPICIOUS, UNOBSERVED] {
        let (observed, composed) = observe_and_compose(&events, request(pair));
        assert!(observed.signals.l4.is_some());
        let without = Signals {
            l4: None,
            ..observed.signals
        };
        assert_eq!(composite_e4(&without), observed.composite_e4);
        // The envelope the gates see carries no benched field: the verdict is the L0 one.
        let again = observe_and_compose(&events, request(pair)).1;
        assert_eq!(composed, again);
    }
}

#[test]
fn rows_chain_from_genesis_name_inputs_by_digest_and_hash_themselves() {
    let observed = observe(&events(), request(BENIGN));
    let rows = observation_rows(&observed, &inputs(), GATE_ROW, GENESIS);
    assert_eq!(rows.len(), 5);
    let mut prev = GENESIS.to_string();
    for (row, level) in rows.iter().zip(["L0", "L1", "L2", "L4"]) {
        assert!(row.starts_with(&format!("OBSERVE|level={level}|")), "{row}");
        assert_eq!(field(row, "prev"), prev);
        assert_eq!(field(row, "provenance"), "real");
        assert_eq!(field(row, "voting"), if level == "L0" { "1" } else { "0" });
        assert_eq!(field(row, "events_sha256"), sha256_hex(EVENTS.as_bytes()));
        prev = field(row, "row_sha256");
        assert_eq!(rehash(row), *row);
    }
    let gate = &rows[4];
    assert!(gate.starts_with("OBSERVEGATE|gate_sha256="));
    assert_eq!(field(gate, "gate_sha256"), sha256_hex(GATE_ROW.as_bytes()));
    assert_eq!(field(gate, "prev"), prev);
    assert_eq!(rehash(gate), *gate);
    // Request text reaches the rows only as digests.
    for text in ["agent:benign", "svc:ledger", "heartbeat", PID] {
        assert!(rows.iter().all(|row| !row.contains(text)), "{text}");
    }
    assert_eq!(
        observation_rows(&observed, &inputs(), GATE_ROW, GENESIS),
        rows
    );
}

#[test]
fn an_unobserved_edge_writes_absent_rows() {
    let observed = observe(&events(), request(UNOBSERVED));
    let rows = observation_rows(&observed, &inputs(), GATE_ROW, GENESIS);
    for row in &rows[..3] {
        assert_eq!(field(row, "provenance"), "absent");
        assert_eq!(
            (field(row, "score_q24"), field(row, "score_e4")),
            ("-".into(), "-".into())
        );
    }
    assert_eq!(field(&rows[3], "provenance"), "real");
}

#[test]
fn the_watcher_agrees_with_untampered_rows_and_reports_the_head() {
    let observed = observe(&events(), request(SUSPICIOUS));
    let text = rows(&observed);
    let head = field(text.lines().last().unwrap(), "row_sha256");
    assert_eq!(
        watch(&observed, &inputs(), GATE_ROW, &text),
        Watch::Agree { rows: 5, head }
    );
    // A chain continued from an earlier head is recomputed from its own first prev.
    let later = observation_rows(&observed, &inputs(), GATE_ROW, &"ab".repeat(32)).join("\n");
    assert!(matches!(
        watch(&observed, &inputs(), GATE_ROW, &later),
        Watch::Agree { rows: 5, .. }
    ));
}

#[test]
fn the_watcher_holds_on_every_tamper() {
    let events = events();
    let observed = observe(&events, request(SUSPICIOUS));
    let text = rows(&observed);
    let lines: Vec<String> = text.lines().map(str::to_string).collect();
    let joined = |rows: &[String]| rows.join("\n");
    let disagree = |text: &str| watch(&observed, &inputs(), GATE_ROW, text);
    let edit = |index: usize, key: &str, value: &str| {
        let mut rows = lines.clone();
        let old = format!("|{key}={}|", field(&rows[index], key));
        rows[index] = rows[index].replacen(&old, &format!("|{key}={value}|"), 1);
        rows
    };

    // A score edited without its row hash, then with it re-signed.
    let edited = edit(1, "score_e4", "1");
    assert_eq!(
        disagree(&joined(&edited)),
        Watch::Disagree {
            row: 2,
            reason: "row_sha256_differs"
        }
    );
    let mut resigned = edited.clone();
    resigned[1] = rehash(&resigned[1]);
    assert_eq!(
        disagree(&joined(&resigned)),
        Watch::Disagree {
            row: 2,
            reason: "reading_differs"
        }
    );
    // A benched level marked voting.
    let mut voting = edit(2, "voting", "1");
    voting[2] = rehash(&voting[2]);
    assert_eq!(
        disagree(&joined(&voting)),
        Watch::Disagree {
            row: 3,
            reason: "reading_differs"
        }
    );
    // A re-signed row whose prev no longer links.
    let mut relinked = edit(3, "prev", &"cd".repeat(32));
    relinked[3] = rehash(&relinked[3]);
    assert_eq!(
        disagree(&joined(&relinked)),
        Watch::Disagree {
            row: 4,
            reason: "chain_broken"
        }
    );
    // A row deleted, rows reordered, a row appended, nothing at all.
    let mut deleted = lines.clone();
    deleted.remove(2);
    assert!(matches!(
        disagree(&joined(&deleted)),
        Watch::Disagree { row: 3, .. }
    ));
    let mut swapped = lines.clone();
    swapped.swap(1, 2);
    assert!(matches!(
        disagree(&joined(&swapped)),
        Watch::Disagree { row: 2, .. }
    ));
    let mut appended = lines.clone();
    appended.push(lines[4].clone());
    assert_eq!(
        disagree(&joined(&appended)),
        Watch::Disagree {
            row: 0,
            reason: "row_count_differs"
        }
    );
    assert_eq!(
        disagree(""),
        Watch::Disagree {
            row: 1,
            reason: "no_prev"
        }
    );

    // The rows stand, but the events file was swapped under them (here only a comment line differs).
    let other = format!("{EVENTS}# swapped\n");
    let swapped_inputs = RowInputs::of(other.as_bytes(), b"fixture envelope");
    let reobserved = observe(
        &parse_events(&other).expect("swapped events parse"),
        request(SUSPICIOUS),
    );
    assert_eq!(
        watch(&reobserved, &swapped_inputs, GATE_ROW, &text),
        Watch::Disagree {
            row: 1,
            reason: "events_differ"
        }
    );
    // A different envelope, and a GATE row edited after it was printed.
    let other_envelope = RowInputs::of(EVENTS.as_bytes(), b"another envelope");
    assert_eq!(
        watch(&observed, &other_envelope, GATE_ROW, &text),
        Watch::Disagree {
            row: 1,
            reason: "envelope_differs"
        }
    );
    assert_eq!(
        watch(
            &observed,
            &inputs(),
            "GATE|verdict=HOLD|fixture=1|json=0",
            &text
        ),
        Watch::Disagree {
            row: 5,
            reason: "gate_row_differs"
        }
    );
}
