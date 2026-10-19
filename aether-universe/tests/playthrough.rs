//! The full scripted play-through: nine secrets, in timeline order, to the ending and the seal.

mod common;

use aether_universe::hbp;
use aether_universe::snapshot;
use common::*;

const REGION_ORDER: [&str; 9] = [
    "hollow_strata",
    "flow_channel",
    "prime_cylinders",
    "hotel_of_infinite_rooms",
    "rupture_zone",
    "crystalline_reach",
    "cube_27",
    "white_field",
    "blue_star",
];

fn session_of(out: &str) -> String {
    let g = rows_of(out, "GAME");
    assert_eq!(g.len(), 1, "one GAME row");
    field(g[0], "session").expect("session").to_string()
}

#[test]
fn the_playthrough_reaches_the_ending_and_seals_the_run() {
    let saves = tmpdir("play");
    let (code, out) = run_script_file(cfg(&saves), &playthrough());
    assert_eq!(code, 0, "{out}");
    assert!(
        out.starts_with("SELFTEST|sha256=OK|vectors=3|json=0\n"),
        "the self-test runs before anything"
    );

    // nine solved, in chapter order, exactly one wrong attempt along the way
    let solves = rows_of(&out, "SOLVE");
    let ok: Vec<&&str> = solves
        .iter()
        .filter(|l| field(l, "match") == Some("1"))
        .collect();
    assert_eq!(ok.len(), 9, "{solves:?}");
    for (l, want) in ok.iter().zip(REGION_ORDER) {
        assert_eq!(field(l, "region"), Some(want));
        assert_eq!(field(l, "evidence"), Some("LOCAL_MEASURED"));
    }
    let wrong: Vec<&&str> = solves
        .iter()
        .filter(|l| field(l, "match") == Some("0"))
        .collect();
    assert_eq!(wrong.len(), 1);
    assert_eq!(field(wrong[0], "attempts"), Some("1"));
    assert_eq!(
        rows_of(&out, "UNLOCKED").len(),
        8,
        "chapters 2 to 9 open one by one"
    );

    // the measured rows the kernel computed, verbatim
    for want in [
        "D1|K=13|states=1594323|in_range_exact=1594323/1594323|ties=0|json=0",
        "TRITRANGE|pid_bits=64|trits=41|3^40=12157665459056928801|2^64=18446744073709551616|3^41=36472996377170786403|40_trits_enough=0|41_trits_enough=1|json=0",
        "SPOKES|plus1_6k+1=332194|minus1_6k-1=332383|primes_above_3=664577|all_on_spokes=1|minus1_lead=189|json=0",
        "CUBE27|coprime_cells=18|populated=18|min=36826|max=37023|spread_per10000_of_mean=53|centre_plane_nonempty=3:1|json=0",
        "MOD3|centre_primes=1|only_3=1|json=0",
        "ADDRESS60|sharing_reaches_zero_at_level=5|stays_zero_through_60=1|room_of_2=-1,1,0|same_at_60=1|room_of_3=0,1,0|same_at_60=1|trit_order=least_significant_first|json=0",
        "RUNG|width=10|alphabet=1024|tested=85793|roundtrip_failures=0|lossless=1|json=0",
        "NEST|depth=13|leaves=1594323|sum_ne_zero=0|json=0",
        "FREECENTRE|depth=12|arithmetic=int|arm_changes=0|json=0",
        "CLOSURE|depth=81|arithmetic=exact|residual_at_root=0|json=0",
    ] {
        assert!(out.lines().any(|l| l == want), "missing row: {want}");
    }
    assert!(out.contains("STAR|file=ACER-MYTHOS-BLUE.gguf|bytes=50752|sha256=3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae|sidecar=OK|json=0"));
    assert!(out.contains("residual_at_root=-1.324979e+24|source=kernel/tribit-referees/receipts/compose.stdout:48|run_here=0"), "the float lane is cited, never run");

    // the kernel never disagreed with a cited receipt
    assert!(
        rows_of(&out, "DISAGREE").is_empty(),
        "{:?}",
        rows_of(&out, "DISAGREE")
    );
    assert!(rows_of(&out, "MEASURED_FAIL").is_empty());

    // chapter 8 is honest about its scope
    assert!(out.contains("SCOPE|secret=8|scope=bundled_page|enwik8=NOT_MEASURED"));
    assert!(out.contains("NOT_MEASURED|subject=enwik8_white_space|reason=NO_INPUT"));

    // the ending
    let fin = rows_of(&out, "FINALSEAL");
    assert_eq!(fin.len(), 1);
    let this = field(fin[0], "this").expect("this").to_string();
    assert_eq!(this.len(), 16);
    let lines: Vec<&str> = out.lines().collect();
    let at = lines
        .iter()
        .position(|l| *l == this)
        .expect("the hash stands on its own line");
    assert!(lines[at - 1].starts_with("FINALSEAL|"));
    assert!(out.contains("THE SEAL."));
    assert!(out.contains("Felipe Miguel Olimpio da Cruz"));
    assert_eq!(rows_of(&out, "QUIT").len(), 1);

    // the seal on disk: verifies, is chained, says what it is, and never says PROMOTED
    let dir = saves.join(session_of(&out));
    let rows = hbp::read_set(&dir, "FINAL-SEAL").expect("the seal's sidecars and HBI verify");
    assert_eq!(snapshot::check_sealed_rows(&rows).unwrap(), this);
    assert_eq!(rows.iter().filter(|r| r.tag == "SECRET").count(), 9);
    for r in rows.iter().filter(|r| r.tag == "SECRET") {
        assert_eq!(r.get("evidence"), Some("VERIFIER_RECEIVED"), "{}", r.line());
        assert_ne!(r.get("answer_sha16"), Some("none"));
    }
    let eight = rows
        .iter()
        .find(|r| r.tag == "SECRET" && r.get("id") == Some("8"))
        .unwrap();
    assert_eq!(eight.get("scope"), Some("bundled_page"));
    let omega = rows.iter().find(|r| r.tag == "OMEGA").unwrap();
    assert_eq!(omega.get("promotion"), Some("BLOCKED"));
    assert_eq!(omega.get("omega_net"), Some("0"));
    assert!(rows
        .iter()
        .any(|r| r.tag == "FELIPE" && r.get("world") == Some("Xylos")));
    assert!(!rows.iter().any(|r| r.line().contains("PROMOTED")));
    let seal = rows.iter().find(|r| r.tag == "SEAL").unwrap();
    assert_eq!(seal.get("seed"), Some("20260801"));
    assert_eq!(seal.get("seat"), Some("TEST-SEAT"));
    assert_eq!(seal.get("script_sha256").map(str::len), Some(64));

    // and the whole session verifies from tick 0
    let tick: u64 = seal.get_u64("tick").unwrap();
    let report = snapshot::verify_chain(&dir.join("ticks"), tick).unwrap();
    assert_eq!(report.head, seal.get("chain").unwrap());
}

#[test]
fn two_runs_of_the_playthrough_are_identical_down_to_the_seal() {
    let a = tmpdir("play-a");
    let b = tmpdir("play-b");
    let (ca, oa) = run_script_file(cfg(&a), &playthrough());
    let (cb, ob) = run_script_file(cfg(&b), &playthrough());
    assert_eq!((ca, cb), (0, 0));
    assert_eq!(
        oa, ob,
        "same seed, same script, same seat: same bytes on stdout"
    );
    let sa = hbp::file_bytes(&hbp::read_set(&a.join(session_of(&oa)), "FINAL-SEAL").unwrap());
    let sb = hbp::file_bytes(&hbp::read_set(&b.join(session_of(&ob)), "FINAL-SEAL").unwrap());
    assert_eq!(sa, sb);
}

#[test]
fn another_machines_seal_is_independently_verified_and_a_different_seed_is_not() {
    let a = tmpdir("indep-a");
    let b = tmpdir("indep-b");
    let (_, oa) = run_script_file(cfg(&a), &playthrough());
    let seal_a = a.join(session_of(&oa)).join("FINAL-SEAL.hbp");
    assert!(seal_a.is_file());

    // run B on "another machine" (another seat and folder) and have it check A's seal at the end
    let mut cb = cfg(&b);
    cb.seat = "OTHER-SEAT".to_string();
    cb.also_verify = Some(seal_a.clone());
    let (code, ob) = run_script_file(cb, &playthrough());
    assert_eq!(code, 0, "{ob}");
    let ind: Vec<&str> = rows_of(&ob, "VERIFY")
        .into_iter()
        .filter(|l| field(l, "subject") == Some("independent"))
        .collect();
    assert_eq!(ind.len(), 1, "{ob}");
    assert_eq!(field(ind[0], "independent"), Some("1"));
    assert_eq!(field(ind[0], "other_seat"), Some("TEST-SEAT"));
    assert_eq!(field(ind[0], "verdict"), Some("MEASURED_PASS"));
    assert!(ob.contains("PROMOTE|evidence=INDEPENDENTLY_VERIFIED|promotion=BLOCKED|json=0"));
    assert!(rows_of(&ob, "MISMATCH").is_empty());

    // a different seed reproduces a different chain: both values are printed side by side
    let c = tmpdir("indep-c");
    let mut cc = cfg(&c);
    cc.seed = 7;
    cc.also_verify = Some(seal_a);
    let (code, oc) = run_script_file(cc, &playthrough());
    assert_eq!(
        code, 4,
        "a failed verify in a script turns the exit code red"
    );
    let mism = rows_of(&oc, "MISMATCH");
    assert!(mism.iter().any(|l| field(l, "field") == Some("seed")
        && field(l, "mine") == Some("7")
        && field(l, "theirs") == Some("20260801")));
    assert!(oc.contains("independent=0"));
    assert!(!oc.contains("PROMOTE|evidence=INDEPENDENTLY_VERIFIED"));
}

#[test]
fn the_same_seat_reproducing_a_seal_is_a_reproduction_and_never_independent() {
    // the verifier's run (2026-10-18): the same seat, the same binary, its own earlier seal
    let a = tmpdir("same-a");
    let (_, oa) = run_script_file(cfg(&a), &playthrough());
    let seal_a = a.join(session_of(&oa)).join("FINAL-SEAL.hbp");
    let tick_a = field(rows_of(&oa, "QUIT")[0], "tick").unwrap().to_string();

    let b = tmpdir("same-b");
    let mut cb = cfg(&b); // the same seat as run A: TEST-SEAT
    cb.also_verify = Some(seal_a.clone());
    let (code, ob) = run_script_file(cb, &playthrough());
    assert_eq!(code, 0, "a reproduction is not a failure: {ob}");
    let ind: Vec<&str> = rows_of(&ob, "VERIFY")
        .into_iter()
        .filter(|l| field(l, "subject") == Some("independent"))
        .collect();
    assert_eq!(ind.len(), 1, "{ob}");
    assert_eq!(field(ind[0], "independent"), Some("0"));
    assert_eq!(field(ind[0], "reproduced"), Some("1"));
    assert_eq!(field(ind[0], "verdict"), Some("NOT_MEASURED"));
    assert_eq!(field(ind[0], "reason"), Some("SAME_SEAT"));
    assert_eq!(field(ind[0], "other_seat"), Some("TEST-SEAT"));
    assert_eq!(field(ind[0], "this_seat"), Some("TEST-SEAT"));
    assert!(rows_of(&ob, "VERIFY")
        .iter()
        .any(|l| field(l, "subject") == Some("reproduction")
            && field(l, "verdict") == Some("MEASURED_PASS")));
    assert_eq!(rows_of(&ob, "REPRODUCED").len(), 1, "{ob}");
    assert!(
        !ob.contains("PROMOTE|evidence=INDEPENDENTLY_VERIFIED"),
        "the same seat is never promoted to independent: {ob}"
    );
    assert!(
        ob.contains("INDEPENDENTLY_VERIFIED:0"),
        "the HUD counts no secret as independently verified: {ob}"
    );
    assert_eq!(
        field(rows_of(&ob, "QUIT")[0], "tick"),
        Some(tick_a.as_str()),
        "nothing was committed: the evidence did not move"
    );

    // two seats that never said who they were cannot be told apart either
    let c = tmpdir("same-c");
    let d = tmpdir("same-d");
    let mut cc = cfg(&c);
    cc.seat = "unknown".to_string();
    let (_, oc) = run_script_file(cc, &playthrough());
    let seal_c = c.join(session_of(&oc)).join("FINAL-SEAL.hbp");
    let mut cd = cfg(&d);
    cd.seat = "unknown".to_string();
    cd.also_verify = Some(seal_c);
    let (code_d, od) = run_script_file(cd, &playthrough());
    assert_eq!(code_d, 0, "{od}");
    assert!(od.contains("reason=SEAT_UNKNOWN"), "{od}");
    assert!(
        !od.contains("PROMOTE|evidence=INDEPENDENTLY_VERIFIED"),
        "{od}"
    );
}

#[test]
fn the_sealed_row_counts_what_was_recomputed_instead_of_writing_nine() {
    let saves = tmpdir("sealed-row");
    let (code, out) = run_script_file(cfg(&saves), &playthrough());
    assert_eq!(code, 0, "{out}");
    let sealed = rows_of(&out, "SEALED");
    assert_eq!(sealed.len(), 1, "{out}");
    assert_eq!(field(sealed[0], "secrets_solved"), Some("9"));
    // eight secrets were recomputed over their full scope; the ninth, on the bundled page
    assert_eq!(field(sealed[0], "recomputed_full_scope"), Some("8"));
    assert_eq!(field(sealed[0], "secret8_scope"), Some("bundled_page"));
    assert_eq!(field(sealed[0], "enwik8"), Some("NOT_MEASURED"));
    assert_eq!(
        field(sealed[0], "xz_share"),
        Some("CITED_NAMED_not_recomputed")
    );
    assert!(
        !sealed[0].contains("|secrets=9|"),
        "the hard-coded nine is gone"
    );
}

/// The playthrough up to (not including) the line that starts with `stop`.
fn script_until(stop: &str) -> String {
    let text = std::fs::read_to_string(playthrough()).unwrap();
    let mut out = String::new();
    for l in text.lines() {
        if l.starts_with(stop) {
            break;
        }
        out.push_str(l);
        out.push('\n');
    }
    out
}

#[test]
fn without_enwik8_in_strict_mode_chapter_8_stays_sealed_and_there_is_no_ending() {
    let saves = tmpdir("strict");
    let mut c = cfg(&saves);
    c.strict_enwik8 = true;
    let mut script = script_until("# ---- chapter 9");
    script.push_str("solve 1893\nverify\nquit\n");
    let (code, out) = run_script_text(c, &saves, &script);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("NOT_MEASURED|subject=enwik8_white_space|reason=NO_INPUT"));
    assert!(out.contains("SOLVE|region=white_field|match=0|not_measured=1|reason=NO_INPUT|json=0"));
    assert!(
        rows_of(&out, "FINALSEAL").is_empty(),
        "a missing file is not a zero, and it is not an ending"
    );
    assert!(
        rows_of(&out, "UNLOCKED").len() == 7,
        "chapters 2 to 8 open, chapter 9 does not"
    );
    // go star is refused while chapter 8 is sealed
    let saves2 = tmpdir("strict2");
    let mut c2 = cfg(&saves2);
    c2.strict_enwik8 = true;
    let (_, out2) = run_script_text(
        c2,
        &saves2,
        &format!("{}go star\nquit\n", script_until("# ---- chapter 9")),
    );
    assert!(
        out2.contains("LOCKED|region=blue_star|needs=secret 8|json=0"),
        "{out2}"
    );
}

#[test]
fn nine_solved_secrets_without_a_verify_do_not_seal_and_verify_before_the_end_does_not_either() {
    let saves = tmpdir("noseal");
    let script = script_until("# ---- bridge, verify, and seal");
    let (code, out) = run_script_text(cfg(&saves), &saves, &format!("{script}quit\n"));
    assert_eq!(code, 0);
    assert!(rows_of(&out, "FINALSEAL").is_empty());
    assert!(rows_of(&out, "SEALED").is_empty());

    // verify with only chapter 1 solved: passes what it can measure, seals nothing
    let saves2 = tmpdir("noseal2");
    let (code, out) = run_script_text(cfg(&saves2), &saves2, "solve 27:13\nsave a\nverify\nquit\n");
    assert_eq!(code, 0);
    assert!(rows_of(&out, "FINALSEAL").is_empty());
    assert!(out.contains("VERIFY|subject=secret|id=1|recomputed=1|match=1|evidence=VERIFIER_RECEIVED|verdict=MEASURED_PASS|json=0"));
}
