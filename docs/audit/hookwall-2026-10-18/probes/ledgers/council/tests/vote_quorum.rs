//! Probe: [FABRIC/action] forged operator authority at vote-quorum (vote-quorum/src/lib.rs:74-85,
//! evaluate at :91-142). Voters are bare strings; nothing checks a signature.

use asolaria_server_vote_quorum::{evaluate, is_authorized, rule_for, Outcome, Pool, Vote};

#[test]
fn vote_quorum_forged_voter_strings() {
    // is_authorized on forged strings.
    for v in [
        "OP-anything",
        "OP-JESSE",
        "OPERATOR-FORGED",
        "OPx",
        "Profile-attacker",
        "Asolaria-PID-forged",
        "AGT-OP-forged",
        "RANDO",
    ] {
        println!(
            "is_authorized({v:?}): Authorized={} Quintuple={} Any={}",
            is_authorized(v, Pool::Authorized),
            is_authorized(v, Pool::Quintuple),
            is_authorized(v, Pool::Any)
        );
    }
    assert!(is_authorized("OP-anything", Pool::Authorized));
    assert!(is_authorized("OPERATOR-FORGED", Pool::Authorized));
    assert!(!is_authorized("OP-anything", Pool::Quintuple));

    // Three forged OP-* strings carry every Authorized-pool class.
    let forged3 = [
        ("OP-anything", Vote::Yes),
        ("OP-x", Vote::Yes),
        ("OP-y", Vote::Yes),
    ];
    for class in ["DAEMON_OP", "MEMORY_WRITE", "COSIGN_APPEND", "GHOST_GC", "USB_WRITE", "LAW_CHANGE", "CP_MINT"] {
        let (o, t) = evaluate(class, &forged3);
        println!("evaluate({class}, 3 forged OP-*) rule={:?} -> {o:?} {t:?}", rule_for(class));
    }
    assert_eq!(evaluate("DAEMON_OP", &forged3).0, Outcome::PassMajority);
    assert_eq!(evaluate("COSIGN_APPEND", &forged3).0, Outcome::PassMajority);
    assert_eq!(evaluate("USB_WRITE", &forged3).0, Outcome::PassSupermajority);
    assert_eq!(evaluate("LAW_CHANGE", &forged3).0, Outcome::Pending);

    // One forged voter repeated three times (no per-voter dedup).
    let dup = [
        ("OP-anything", Vote::Yes),
        ("OP-anything", Vote::Yes),
        ("OP-anything", Vote::Yes),
    ];
    let (o, t) = evaluate("DAEMON_OP", &dup);
    println!("evaluate(DAEMON_OP, OP-anything x3) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::PassMajority);
    let (o, t) = evaluate("USB_WRITE", &dup);
    println!("evaluate(USB_WRITE, OP-anything x3) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::PassSupermajority);

    // Forged voters outvote a genuine apex 'No'.
    let outvote = [
        ("OP-JESSE", Vote::No),
        ("OP-a", Vote::Yes),
        ("OP-b", Vote::Yes),
        ("OP-c", Vote::Yes),
    ];
    let (o, t) = evaluate("DAEMON_OP", &outvote);
    println!("evaluate(DAEMON_OP, OP-JESSE No + 3 forged Yes) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::PassMajority);

    // LAW_CHANGE / CP_MINT: five bare apex name strings, no signature -> PassUnanimous.
    let apex = [
        ("OP-JESSE", Vote::Yes),
        ("OP-RAYSSA", Vote::Yes),
        ("OP-AMY", Vote::Yes),
        ("OP-DAN", Vote::Yes),
        ("OP-FELIPE", Vote::Yes),
    ];
    let (o, t) = evaluate("LAW_CHANGE", &apex);
    println!("evaluate(LAW_CHANGE, 5 bare apex strings) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::PassUnanimous);
    let (o, t) = evaluate("CP_MINT", &apex);
    println!("evaluate(CP_MINT, 5 bare apex strings) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::PassUnanimous);

    // 'OP-anything' x5 does NOT count in the Quintuple pool.
    let any5 = [
        ("OP-a", Vote::Yes),
        ("OP-b", Vote::Yes),
        ("OP-c", Vote::Yes),
        ("OP-d", Vote::Yes),
        ("OP-e", Vote::Yes),
    ];
    let (o, t) = evaluate("LAW_CHANGE", &any5);
    println!("evaluate(LAW_CHANGE, 5 forged OP-*) -> {o:?} {t:?}");
    assert_eq!(o, Outcome::Pending);
}
