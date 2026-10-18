//! Fixed vectors for the vote-quorum port. Expected outcomes were printed by running the vendored
//! upstream lines 148-163 (referee/referee.py `pair_function`); the seeded and exhaustive
//! comparisons are in referee/VOTE-QUORUM.hbp. Built with `--features vote-quorum` once the held
//! `src/vote_quorum.rs` is restored (PROVENANCE.md, "Held").
#![cfg(feature = "vote-quorum")]

use asolaria_hyperbehcs_daemons::vote_quorum::{
    already_cast, evaluate_quorum, is_authorized, is_resolving, majority_outcome, outcome_row_due,
    rule_for, supermajority_outcome, CastVote, Outcome, Pool, Rule, AUTHORIZED_CLASSES,
    LAW_WINDOW_END, OP_WINDOW_END, QUINTUPLE, QUORUM_RULES,
};

fn cast<'a>(rows: &[(&'a str, &'a str)]) -> Vec<CastVote<'a>> {
    rows.iter()
        .map(|(voter_pid, vote)| CastVote { voter_pid, vote })
        .collect()
}

#[test]
fn quorum_rules_table_is_lines_51_61() {
    let got: Vec<(&str, &str, &str, Option<&str>)> = QUORUM_RULES
        .iter()
        .map(|(c, r)| (*c, r.rule.name(), r.pool.name(), r.extra))
        .collect();
    assert_eq!(
        got,
        vec![
            ("LAW_CHANGE", "unanimous-5", "quintuple", None),
            ("CP_MINT", "unanimous-5", "quintuple", None),
            (
                "USB_WRITE",
                "supermajority-2-3",
                "authorized",
                Some("operator-witness-required")
            ),
            ("DAEMON_OP", "simple-majority", "authorized", None),
            ("MEMORY_WRITE", "simple-majority", "authorized", None),
            ("COSIGN_APPEND", "simple-majority", "authorized", None),
            ("GHOST_GC", "simple-majority", "authorized", None),
            ("HEARTBEAT_ACK", "auto-pass", "any", None),
            ("DEFAULT", "simple-majority", "authorized", None),
        ]
    );
    assert_eq!(rule_for("NOT_A_CLASS"), rule_for("DEFAULT"));
    assert_eq!(rule_for("law_change").rule, Rule::SimpleMajority);
    assert_eq!(QUINTUPLE.len(), 5);
    assert_eq!(AUTHORIZED_CLASSES.len(), 4);
    assert_eq!(
        (LAW_WINDOW_END, OP_WINDOW_END),
        ("2026-09-23", "2026-07-23")
    );
}

#[test]
fn is_authorized_prefix_rule_of_line_122() {
    for (voter, want) in [
        ("OP", true),
        ("OPERATOR", true),
        ("OP-anyone", true),
        ("AGT-OP-7", true),
        ("AGT-Special-OP", true),
        ("Special-OP-1", true),
        ("Asolaria-PID-9", true),
        ("AGT-Asolaria-PID", true),
        ("Profile", true),
        ("AGT-Profile-x", true),
        ("op-lower", false),
        ("AGT-", false),
        ("AGT-op", false),
        ("Profil", false),
        ("Asolaria", false),
        (" OP", false),
        ("", false),
    ] {
        assert_eq!(is_authorized(voter, Pool::Authorized), want, "{voter:?}");
        assert!(is_authorized(voter, Pool::Any));
    }
    for member in QUINTUPLE {
        assert!(is_authorized(member, Pool::Quintuple));
        assert!(is_authorized(member, Pool::Authorized));
        let suffixed = format!("{member}-2");
        assert!(!is_authorized(&suffixed, Pool::Quintuple));
    }
    assert!(!is_authorized("AGT-OP-7", Pool::Quintuple));
}

#[test]
fn ratio_branches_match_upstream_for_totals_up_to_9() {
    // One string per decisive total t: the outcome for yes = 0..=t (S pass, R reject, P pending).
    let supermajority = [
        "P",
        "PP",
        "PPP",
        "RRSS",
        "RRRSS",
        "RRRRSS",
        "RRRRSSS",
        "RRRRRSSS",
        "RRRRRRSSS",
        "RRRRRRSSSS",
    ];
    let majority = [
        "P",
        "PP",
        "PPP",
        "RRSS",
        "RRRSS",
        "RRRSSS",
        "RRRRSSS",
        "RRRRSSSS",
        "RRRRRSSSS",
        "RRRRRSSSSS",
    ];
    let letter = |o: Outcome| match o {
        Outcome::Pending => 'P',
        Outcome::Reject => 'R',
        _ => 'S',
    };
    for t in 0..10u64 {
        let s: String = (0..=t)
            .map(|y| letter(supermajority_outcome(y, t - y)))
            .collect();
        let m: String = (0..=t)
            .map(|y| letter(majority_outcome(y, t - y)))
            .collect();
        assert_eq!(s, supermajority[t as usize], "supermajority t={t}");
        assert_eq!(m, majority[t as usize], "majority t={t}");
    }
}

#[test]
fn decisive_counts_whose_sum_exceeds_u64() {
    // yes + no = 2^64: upstream lines 148-163 also give PASS for both branches.
    assert_eq!(
        supermajority_outcome(u64::MAX, 1),
        Outcome::PassSupermajority
    );
    assert_eq!(majority_outcome(u64::MAX, 1), Outcome::PassMajority);
    // yes = no = 2^64 - 1: `2 * no >= total` holds exactly; upstream's double `total / 2` is 2^64,
    // so its line 159 is false there and it answers PENDING (README, ratio forms above 2^52).
    assert_eq!(supermajority_outcome(u64::MAX, u64::MAX), Outcome::Reject);
    assert_eq!(majority_outcome(u64::MAX, u64::MAX), Outcome::Reject);
}

#[test]
fn unanimous_five_and_filters() {
    let mut rows: Vec<(&str, &str)> = QUINTUPLE.iter().take(4).map(|q| (*q, "YES")).collect();
    let s = evaluate_quorum("LAW_CHANGE", &cast(&rows));
    assert_eq!((s.yes, s.outcome), (4, Outcome::Pending));
    rows.push(("AGT-OP-1", "NO"));
    rows.push(("OPERATOR", "YES"));
    let s = evaluate_quorum("LAW_CHANGE", &cast(&rows));
    assert_eq!((s.yes, s.no, s.outcome), (4, 0, Outcome::Pending));
    rows.push((QUINTUPLE[4], "YES"));
    let s = evaluate_quorum("CP_MINT", &cast(&rows));
    assert_eq!((s.yes, s.outcome), (5, Outcome::PassUnanimous));
    rows.push((QUINTUPLE[0], "NO"));
    let s = evaluate_quorum("CP_MINT", &cast(&rows));
    assert_eq!((s.yes, s.no, s.outcome), (5, 1, Outcome::Reject));
}

#[test]
fn counts_only_exact_vote_strings_and_authorized_voters() {
    let rows = [
        ("OP-a", "YES"),
        ("OP-b", "yes"),
        ("OP-c", "MAYBE"),
        ("guest", "YES"),
        ("OP-d", "ABSTAIN"),
        ("OP-e", "YES"),
        ("OP-f", "NO"),
    ];
    let s = evaluate_quorum("DAEMON_OP", &cast(&rows));
    assert_eq!(
        (s.yes, s.no, s.abstain, s.total_decisive, s.outcome),
        (2, 1, 1, 3, Outcome::PassMajority)
    );
    let s = evaluate_quorum("HEARTBEAT_ACK", &[]);
    assert_eq!((s.pool, s.outcome), (Pool::Any, Outcome::PassAuto));
}

#[test]
fn outcome_row_rule_of_lines_108_116_and_247() {
    let existing = ["VOTE-aa", "VOTE-bb"];
    for o in [
        Outcome::PassUnanimous,
        Outcome::PassMajority,
        Outcome::PassSupermajority,
        Outcome::PassAuto,
        Outcome::Reject,
    ] {
        assert!(is_resolving(o));
        assert!(outcome_row_due(o, "VOTE-cc", existing));
        assert!(!outcome_row_due(o, "VOTE-bb", existing));
    }
    assert!(!outcome_row_due(Outcome::Pending, "VOTE-cc", existing));
    assert!(already_cast("guest", &cast(&[("guest", "NO")])));
    assert!(!already_cast("OP-x", &cast(&[("guest", "NO")])));
}
