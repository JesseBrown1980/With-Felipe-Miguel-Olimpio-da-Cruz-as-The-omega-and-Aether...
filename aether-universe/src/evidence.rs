//! Evidence: `verify`, the promotion states, independent comparison and the final seal.
//!
//! The Omega 6.0 loop in one process: core (Kernel::tick) -> snapshot bus (written and chained) ->
//! evidence engine (this file) -> promotion engine (the states below) -> cockpit (Atlas) -> operator
//! (the player) -> mission queue -> core. It is an instance of that loop, not the planet: one node,
//! no transport, no federation. The distributed Omega NET stays BLOCKED from canon by the council
//! review, and `PROMOTED` is never set by this game: the promotion gate is the operator's.
//!
//! Verdicts are three-valued (discipline section 12): `MEASURED_PASS`, `MEASURED_FAIL`, or
//! `NOT_MEASURED` with a reason. A check that obtained no measurement is not a pass and not a fail.

use crate::hbp::{self, Row, Verdict};
use crate::kernel::{Evidence, Kernel};
use crate::secrets::{self, Outcome, SECRET_COUNT};
use crate::sha256;
use crate::snapshot;
use crate::world;
use std::fs;
use std::path::Path;

/// One `VERIFY` row.
pub fn vrow(subject: &str, verdict: &Verdict) -> Row {
    let mut r = Row::new("VERIFY").kv("subject", subject);
    match verdict {
        Verdict::Pass => {}
        Verdict::Fail(why) => r = r.kv("detail", why),
        Verdict::NotMeasured(reason) => r = r.kv("reason", reason),
    }
    r.kv("verdict", verdict.word())
}

/// Insert extra fields before the verdict.
fn with(mut r: Row, kvs: &[(&str, String)]) -> Row {
    let verdict = r.kv.pop();
    for (k, v) in kvs {
        r.kv.push(((*k).to_string(), v.clone()));
    }
    if let Some(v) = verdict {
        r.kv.push(v);
    }
    r
}

/// What `verify` found.
pub struct VerifyReport {
    pub rows: Vec<Row>,
    pub pass: usize,
    pub fail: usize,
    pub not_measured: usize,
    /// Solved secrets whose recomputed answer matched the stored hash.
    pub matched: Vec<u8>,
    /// Matched secrets that were `BRIDGE_PUBLISHED` and may now be `VERIFIER_RECEIVED`.
    pub promote: Vec<u8>,
}

impl VerifyReport {
    fn push(&mut self, row: Row, verdict: &Verdict) {
        match verdict {
            Verdict::Pass => self.pass += 1,
            Verdict::Fail(_) => self.fail += 1,
            Verdict::NotMeasured(_) => self.not_measured += 1,
        }
        self.rows.push(row);
    }

    /// `MEASURED_FAIL` if anything failed, `NOT_MEASURED` if nothing failed but something could not
    /// be measured, else `MEASURED_PASS`.
    pub fn verdict_word(&self) -> &'static str {
        if self.fail > 0 {
            "MEASURED_FAIL"
        } else if self.not_measured > 0 {
            "NOT_MEASURED"
        } else {
            "MEASURED_PASS"
        }
    }
}

fn read_text(p: &Path) -> Result<String, String> {
    fs::read(p)
        .map(|b| String::from_utf8_lossy(&b).to_string())
        .map_err(|e| format!("MISSING {}: {e}", p.display()))
}

/// The three on-disk checks of one tick, each its own row: sidecar, HBI, and the chain row.
fn check_tick(dir: &Path, tick: u64, rep: &mut VerifyReport) {
    let stem = snapshot::stem(tick);
    let hbp_path = dir.join(format!("{stem}.hbp"));
    let bytes = match fs::read(&hbp_path) {
        Ok(b) => b,
        Err(e) => {
            let v = Verdict::Fail(format!("MISSING_TICK {e}"));
            rep.push(
                with(vrow("snapshot_sidecar", &v), &[("tick", tick.to_string())]),
                &v,
            );
            return;
        }
    };
    let side = read_text(&dir.join(format!("{stem}.hbp.sha256")));
    let v = match &side {
        Ok(s) => match hbp::sidecar_verify(&bytes, s) {
            Ok(_) => Verdict::Pass,
            Err(e) => Verdict::Fail(e),
        },
        Err(e) => Verdict::Fail(e.clone()),
    };
    rep.push(
        with(vrow("snapshot_sidecar", &v), &[("tick", tick.to_string())]),
        &v,
    );
    let hbi = read_text(&dir.join(format!("{stem}.hbi")));
    let (v, rows) = match &hbi {
        Ok(h) => match hbp::hbi_verify(&bytes, h.as_bytes()) {
            Ok(n) => (Verdict::Pass, n),
            Err(e) => (Verdict::Fail(e), 0),
        },
        Err(e) => (Verdict::Fail(e.clone()), 0),
    };
    rep.push(
        with(
            vrow("snapshot_hbi", &v),
            &[("tick", tick.to_string()), ("rows", rows.to_string())],
        ),
        &v,
    );
}

/// Check the mythos sidecar from the inputs the console handed in.
fn check_mythos(kernel: &Kernel, rep: &mut VerifyReport) {
    match &kernel.inputs().mythos {
        None => {
            let v = Verdict::NotMeasured("NO_INPUT");
            rep.push(vrow("mythos_sidecar", &v), &v);
        }
        Some(m) => {
            let sha = sha256::sha256_hex(&m.bytes);
            let side = m.sidecar.as_deref().and_then(secrets::sidecar_hash);
            let v = match side {
                Some(h) if h == sha => Verdict::Pass,
                Some(h) => Verdict::Fail(format!("sidecar {h} but the bytes hash to {sha}")),
                None => Verdict::Fail("sidecar missing or not 64 hex".to_string()),
            };
            rep.push(vrow("mythos_sidecar", &v), &v);
        }
    }
}

/// Run every check against the session on disk. Reads files; changes nothing.
///
/// In order: the SHA-256 known answers; the latest snapshot's sidecar and HBI; the whole chain from
/// tick 0; every solved secret recomputed by the kernel and compared with its stored hash; the
/// secrets that cannot be measured here (a missing input); the Mythos sidecar.
pub fn verify_session(kernel: &mut Kernel, ticks_dir: &Path) -> VerifyReport {
    let mut rep = VerifyReport {
        rows: Vec::new(),
        pass: 0,
        fail: 0,
        not_measured: 0,
        matched: Vec::new(),
        promote: Vec::new(),
    };
    let v = if sha256::selftest() {
        Verdict::Pass
    } else {
        Verdict::Fail("known answers differ".to_string())
    };
    rep.push(vrow("sha256_selftest", &v), &v);

    let t = kernel.tick;
    check_tick(ticks_dir, t, &mut rep);

    let v = match snapshot::verify_chain(ticks_dir, t) {
        Ok(r) if r.head == kernel.head => Verdict::Pass,
        Ok(r) => Verdict::Fail(format!(
            "disk head {} but the kernel holds {}",
            r.head, kernel.head
        )),
        Err(e) => Verdict::Fail(e),
    };
    rep.push(
        with(
            vrow("chain", &v),
            &[("from", "0".to_string()), ("to", t.to_string())],
        ),
        &v,
    );

    for id in 1..=SECRET_COUNT as u8 {
        let st = kernel.secret_state(id).clone();
        if st.evidence.is_solved() {
            let (v, recomputed) = match kernel.answer(id) {
                Outcome::Ready(out) => {
                    if st.answer_sha16.as_deref() == Some(out.answer_sha16().as_str()) {
                        (Verdict::Pass, true)
                    } else {
                        (
                            Verdict::Fail(
                                "recomputed answer differs from the stored hash".to_string(),
                            ),
                            true,
                        )
                    }
                }
                Outcome::NotMeasured { .. } => (Verdict::NotMeasured("NO_INPUT"), false),
                Outcome::Failed { .. } => (
                    Verdict::Fail("the kernel's computation failed".to_string()),
                    true,
                ),
            };
            let mut extra = vec![
                ("id", id.to_string()),
                ("recomputed", u8::from(recomputed).to_string()),
                ("match", u8::from(v == Verdict::Pass).to_string()),
            ];
            if v == Verdict::Pass {
                rep.matched.push(id);
                let next = if st.evidence == Evidence::BridgePublished {
                    rep.promote.push(id);
                    Evidence::VerifierReceived
                } else {
                    st.evidence
                };
                extra.push(("evidence", next.word().to_string()));
                if st.evidence == Evidence::LocalMeasured {
                    extra.push(("promotion_needs", "save".to_string()));
                }
            }
            rep.push(with(vrow("secret", &v), &extra), &v);
        } else if id >= 8 {
            // the two secrets that depend on a file: say so when the file is missing
            if let Outcome::NotMeasured { reason, .. } = kernel.answer(id) {
                let v = Verdict::NotMeasured(reason);
                rep.push(with(vrow("secret", &v), &[("id", id.to_string())]), &v);
            }
        }
    }
    check_mythos(kernel, &mut rep);
    let summary = Row::new("VERIFY")
        .kv("subject", "summary")
        .kv("pass", rep.pass)
        .kv("fail", rep.fail)
        .kv("not_measured", rep.not_measured)
        .kv("verdict", rep.verdict_word());
    rep.rows.push(summary);
    rep
}

/// May the game end? All nine secrets solved, the player at the Blue Star, nothing failed, and
/// every solved secret actually recomputed (a `NOT_MEASURED` secret cannot be sealed).
pub fn may_seal(kernel: &Kernel, rep: &VerifyReport) -> Result<(), &'static str> {
    if !kernel.all_solved() {
        return Err("not_all_nine_secrets_solved");
    }
    if kernel.player.at != 8 {
        return Err("not_standing_at_the_blue_star");
    }
    if rep.fail > 0 {
        return Err("a_check_failed");
    }
    if rep.matched.len() != SECRET_COUNT {
        return Err("a_secret_could_not_be_recomputed");
    }
    Ok(())
}

/// The final seal's rows, `CHAIN` last. Chained onto the kernel's head.
pub fn build_seal(kernel: &mut Kernel, session: &str, seat: &str, script_sha256: &str) -> Vec<Row> {
    let mut rows = vec![snapshot::header("seal")];
    rows.push(
        Row::new("SEAL")
            .kv("session", session)
            .kv("seed", kernel.seed)
            .kv("tick", kernel.tick)
            .kv("chain", &kernel.head)
            .kv("genesis", &kernel.genesis)
            .kv("script_sha256", script_sha256)
            .kv("seat", seat),
    );
    for id in 1..=SECRET_COUNT as u8 {
        let s = kernel.secret_state(id).clone();
        let scope = match kernel.answer(id) {
            Outcome::Ready(o) => o.scope,
            _ => "none",
        };
        rows.push(
            Row::new("SECRET")
                .kv("id", id)
                .kv("region", world::region_of_secret(id).unwrap_or(0))
                .kv("answer_sha16", s.answer_sha16.as_deref().unwrap_or("none"))
                .kv(
                    "solved_tick",
                    s.solved_tick
                        .map_or_else(|| "none".to_string(), |t| t.to_string()),
                )
                .kv("evidence", s.evidence.word())
                .kv("scope", scope),
        );
    }
    if let Outcome::Ready(o) = kernel.answer(9) {
        if let Some(star) = o.rows.iter().find(|r| r.tag == "STAR") {
            rows.push(star.clone());
        }
    }
    rows.push(
        Row::new("OMEGA")
            .kv("level", "6.0")
            .kv("name", "Digital_Planet")
            .kv("implemented_here", "one_process_instance_of_the_loop")
            .kv("omega_net", 0)
            .kv("promotion", "BLOCKED")
            .kv("reason", "promotion_gate_is_outside_this_game")
            .kv("tag", "NAMED"),
    );
    rows.push(
        Row::new("FELIPE")
            .kv("honoured", 1)
            .kv("as", "author_of_the_Aether_vision")
            .kv("named_in", "repo_title")
            .kv("world", "Xylos"),
    );
    let (sealed, _) = snapshot::seal_rows(&kernel.head, rows);
    sealed
}

/// The outcome of comparing another machine's seal with this run.
pub struct Comparison {
    pub rows: Vec<Row>,
    /// Secrets whose `answer_sha16` agrees.
    pub matched: Vec<u8>,
    /// Same seed, same script, same chain at the other seal's tick, every shared answer equal and at
    /// least one answer matched. That is a reproduction. It is not yet an independent verification:
    /// two runs on one seat are distinct, not independent (Omega 5.2 keeps Producer, Verifier and
    /// Independent Verifier as separate roles).
    pub reproduced: bool,
    /// `reproduced` AND the other seal names a seat that is not this seat. Only this promotes.
    pub independent: bool,
}

/// Why a reproduction is not an independent verification, or `None` when it is one. The seat is the
/// identity the seal carries; the seal records no host or binary hash, so a distinct *declared* seat
/// is the strongest basis this game can state (`host_binary=NOT_MEASURED`). A seat that is missing,
/// `unknown` or equal to this seat (ASCII case aside) cannot be told apart from the producer.
fn not_independent_because(other_seat: &str, my_seat: &str) -> Option<&'static str> {
    let named = |s: &str| !s.is_empty() && s != "unknown" && s != "none";
    if !named(other_seat) || !named(my_seat) {
        Some("SEAT_UNKNOWN")
    } else if other_seat.eq_ignore_ascii_case(my_seat) {
        Some("SAME_SEAT")
    } else {
        None
    }
}

fn field<'a>(rows: &'a [Row], tag: &str, key: &str) -> Option<&'a str> {
    rows.iter().find(|r| r.tag == tag).and_then(|r| r.get(key))
}

fn side_by_side(field: &str, mine: &str, theirs: &str) -> Row {
    Row::new("MISMATCH")
        .kv("field", field)
        .kv("mine", mine)
        .kv("theirs", theirs)
}

/// Compare another machine's `FINAL-SEAL` rows with this run. A mismatch prints both values beside
/// each other; nothing is overwritten.
pub fn compare_seal(
    kernel: &Kernel,
    ticks_dir: &Path,
    other: &[Row],
    script_sha256: &str,
    my_seat: &str,
) -> Comparison {
    let mut rows = Vec::new();
    let mut ok = true;
    let theirs_seed = field(other, "SEAL", "seed").unwrap_or("none");
    let mine_seed = kernel.seed.to_string();
    if theirs_seed != mine_seed {
        ok = false;
        rows.push(side_by_side("seed", &mine_seed, theirs_seed));
    }
    let theirs_script = field(other, "SEAL", "script_sha256").unwrap_or("none");
    if theirs_script != script_sha256 {
        ok = false;
        rows.push(side_by_side("script_sha256", script_sha256, theirs_script));
    }
    // the other seal's chain head must equal this run's chain at that tick, read from disk
    let theirs_tick = field(other, "SEAL", "tick").and_then(|t| t.parse::<u64>().ok());
    let theirs_chain = field(other, "SEAL", "chain").unwrap_or("none");
    match theirs_tick {
        Some(t) => match snapshot::read(ticks_dir, t) {
            Ok(s) if s.this == theirs_chain => {}
            Ok(s) => {
                ok = false;
                rows.push(side_by_side("chain", &s.this, theirs_chain));
            }
            Err(e) => {
                ok = false;
                rows.push(side_by_side(
                    "chain",
                    &format!("unreadable tick {t}: {e}"),
                    theirs_chain,
                ));
            }
        },
        None => {
            ok = false;
            rows.push(side_by_side("tick", "needed", "none"));
        }
    }
    let mut matched = Vec::new();
    let mut unverified = 0usize;
    for r in other.iter().filter(|r| r.tag == "SECRET") {
        let Some(id) = r.get_u64("id").map(|v| v as u8) else {
            continue;
        };
        if id == 0 || id as usize > SECRET_COUNT {
            continue;
        }
        let theirs = r.get("answer_sha16").unwrap_or("none");
        let mine = kernel
            .secret_state(id)
            .answer_sha16
            .as_deref()
            .unwrap_or("none");
        if mine == "none" || theirs == "none" {
            // one side has not solved it: there is nothing to compare, and nothing disagrees
            unverified += 1;
        } else if theirs == mine {
            matched.push(id);
        } else {
            ok = false;
            rows.push(side_by_side(
                &format!("secret{id}.answer_sha16"),
                mine,
                theirs,
            ));
        }
    }
    let seat = field(other, "SEAL", "seat").unwrap_or("unknown");
    // a comparison that matched no answer at all verifies nothing
    let reproduced = ok && !matched.is_empty();
    let why_not = not_independent_because(seat, my_seat);
    let independent = reproduced && why_not.is_none();
    // three-valued: a reproduction by the same seat is neither a failure nor an independent pass,
    // it is an independent verification that was not obtained (NOT_MEASURED, with the reason)
    let verdict = match (reproduced, why_not) {
        (false, _) => Verdict::Fail("MISMATCH".to_string()),
        (true, None) => Verdict::Pass,
        (true, Some(reason)) => Verdict::NotMeasured(reason),
    };
    if reproduced {
        rows.push(with(
            vrow("reproduction", &Verdict::Pass),
            &[
                ("matched", matched.len().to_string()),
                ("unverified", unverified.to_string()),
            ],
        ));
    }
    let mut extra = vec![
        ("independent", u8::from(independent).to_string()),
        ("reproduced", u8::from(reproduced).to_string()),
        ("other_seat", seat.to_string()),
        ("this_seat", my_seat.to_string()),
        ("matched", matched.len().to_string()),
        ("unverified", unverified.to_string()),
    ];
    if independent {
        extra.push(("basis", "distinct_declared_seat".to_string()));
        extra.push(("host_binary", "NOT_MEASURED".to_string()));
    }
    rows.push(with(vrow("independent", &verdict), &extra));
    Comparison {
        rows,
        matched,
        reproduced,
        independent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kernel::Mission;
    use crate::secrets::Inputs;

    fn tmp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!(
            "aether-universe-evidence-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&d);
        d
    }

    /// A kernel with a written chain, so verify has a disk to read.
    fn session(dir: &Path, missions: &[Vec<Mission>]) -> Kernel {
        let mut k = Kernel::new(20_260_801, None, Inputs::empty("a b c d"));
        snapshot::write(dir, &k.snapshot()).unwrap();
        for m in missions {
            let s = k.tick(m);
            snapshot::write(dir, &s).unwrap();
        }
        k
    }

    #[test]
    fn verify_passes_on_an_honest_session_and_names_each_check() {
        let dir = tmp("honest");
        let mut k = session(
            &dir,
            &[
                vec![],
                vec![Mission::Solve("27:13".into())],
                vec![Mission::Bridge],
                vec![],
            ],
        );
        let rep = verify_session(&mut k, &dir);
        assert_eq!(
            rep.fail,
            0,
            "{:?}",
            rep.rows.iter().map(Row::line).collect::<Vec<_>>()
        );
        let subjects: Vec<&str> = rep.rows.iter().map(|r| r.get("subject").unwrap()).collect();
        for want in [
            "sha256_selftest",
            "snapshot_sidecar",
            "snapshot_hbi",
            "chain",
            "secret",
            "mythos_sidecar",
            "summary",
        ] {
            assert!(subjects.contains(&want), "no {want} row");
        }
        let secret = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("secret") && r.get("id") == Some("1"))
            .unwrap();
        assert_eq!(secret.get("match"), Some("1"));
        assert_eq!(secret.get("evidence"), Some("VERIFIER_RECEIVED"));
        assert_eq!(rep.promote, vec![1]);
        // the mythos file was not handed in: not measured, not a failure, and the run is not red
        let m = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("mythos_sidecar"))
            .unwrap();
        assert_eq!(m.get("verdict"), Some("NOT_MEASURED"));
        assert_eq!(m.get("reason"), Some("NO_INPUT"));
        assert_eq!(rep.verdict_word(), "NOT_MEASURED");
        for r in &rep.rows {
            assert!(r.line().is_ascii() && r.line().ends_with("|json=0"));
        }
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn an_unsaved_local_secret_is_matched_but_not_promoted() {
        let dir = tmp("unsaved");
        let mut k = session(&dir, &[vec![Mission::Solve("27:13".into())]]);
        let rep = verify_session(&mut k, &dir);
        assert_eq!(rep.matched, vec![1]);
        assert!(rep.promote.is_empty(), "promotion needs a save first");
        let secret = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("secret"))
            .unwrap();
        assert_eq!(secret.get("promotion_needs"), Some("save"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_tampered_byte_turns_verify_red_with_a_named_failure() {
        let dir = tmp("tamper");
        let mut k = session(&dir, &[vec![], vec![], vec![]]);
        let f = dir.join(format!("{}.hbp", snapshot::stem(1)));
        let mut b = fs::read(&f).unwrap();
        let at = b.iter().position(|c| *c == b'=').unwrap();
        b[at + 1] ^= 1;
        fs::write(&f, &b).unwrap();
        let rep = verify_session(&mut k, &dir);
        assert!(rep.fail > 0, "a tampered tick must fail verify");
        assert_eq!(rep.verdict_word(), "MEASURED_FAIL");
        let chain = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("chain"))
            .unwrap();
        assert_eq!(chain.get("verdict"), Some("MEASURED_FAIL"));
        assert!(chain.get("detail").unwrap().contains("tick 1"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_missing_latest_tick_is_a_failure_not_a_clean_zero() {
        let dir = tmp("missing");
        let mut k = session(&dir, &[vec![], vec![]]);
        fs::remove_file(dir.join(format!("{}.hbp", snapshot::stem(2)))).unwrap();
        let rep = verify_session(&mut k, &dir);
        let side = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("snapshot_sidecar"))
            .unwrap();
        assert_eq!(side.get("verdict"), Some("MEASURED_FAIL"));
        assert!(side.get("detail").unwrap().contains("MISSING_TICK"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_wrong_stored_answer_hash_fails_the_recomputation() {
        let dir = tmp("wronghash");
        let mut k = session(&dir, &[vec![Mission::Solve("27:13".into())]]);
        k.secrets[0].answer_sha16 = Some("0000000000000000".to_string());
        let rep = verify_session(&mut k, &dir);
        let secret = rep
            .rows
            .iter()
            .find(|r| r.get("subject") == Some("secret"))
            .unwrap();
        assert_eq!(secret.get("verdict"), Some("MEASURED_FAIL"));
        assert!(rep.matched.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn may_seal_demands_all_nine_the_star_and_a_clean_verify() {
        let dir = tmp("maysea");
        let mut k = session(&dir, &[vec![]]);
        let rep = verify_session(&mut k, &dir);
        assert_eq!(may_seal(&k, &rep), Err("not_all_nine_secrets_solved"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn the_seal_is_chained_says_what_it_is_and_never_says_promoted() {
        let dir = tmp("seal");
        let mut k = session(&dir, &[vec![Mission::Solve("27:13".into())], vec![]]);
        let rows = build_seal(&mut k, "test", "TEST-SEAT", "none");
        assert_eq!(rows[0].tag, "AETHER-UNIVERSE");
        assert_eq!(rows[0].get("kind"), Some("seal"));
        assert_eq!(rows.last().unwrap().tag, "CHAIN");
        assert_eq!(rows.last().unwrap().get("prev"), Some(k.head.as_str()));
        assert!(snapshot::check_sealed_rows(&rows).is_ok());
        let omega = rows.iter().find(|r| r.tag == "OMEGA").unwrap();
        assert_eq!(omega.get("promotion"), Some("BLOCKED"));
        assert_eq!(omega.get("omega_net"), Some("0"));
        assert_eq!(omega.get("tag"), Some("NAMED"));
        assert_eq!(rows.iter().filter(|r| r.tag == "SECRET").count(), 9);
        assert!(!rows.iter().any(|r| r.line().contains("PROMOTED")));
        let felipe = rows.iter().find(|r| r.tag == "FELIPE").unwrap();
        assert_eq!(felipe.get("world"), Some("Xylos"));
        // tamper with one secret row: the chain no longer verifies
        let mut bad = rows.clone();
        bad[2] = Row::new("SECRET")
            .kv("id", 1)
            .kv("answer_sha16", "ffffffffffffffff");
        assert!(snapshot::check_sealed_rows(&bad).is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn independent_comparison_accepts_an_identical_run_and_prints_both_values_on_a_mismatch() {
        let dir = tmp("indep");
        let mut k = session(&dir, &[vec![Mission::Solve("27:13".into())], vec![]]);
        // the "other machine" is an identical run, sealed at the same tick
        let other = build_seal(&mut k, "other", "OTHER-SEAT", "none");
        let cmp = compare_seal(&k, &dir, &other, "none", "THIS-SEAT");
        assert!(
            cmp.independent && cmp.reproduced,
            "{:?}",
            cmp.rows.iter().map(Row::line).collect::<Vec<_>>()
        );
        assert_eq!(cmp.matched, vec![1]);
        let last = cmp.rows.last().unwrap();
        assert_eq!(last.get("independent"), Some("1"));
        assert_eq!(last.get("other_seat"), Some("OTHER-SEAT"));
        // a different seed, script and answer: three mismatches, each with both values
        let mut forged = other.clone();
        for r in forged.iter_mut() {
            if r.tag == "SEAL" {
                for (key, v) in r.kv.iter_mut() {
                    if key == "seed" {
                        *v = "7".to_string();
                    }
                    if key == "script_sha256" {
                        *v = "abc".to_string();
                    }
                }
            }
            if r.tag == "SECRET" && r.get("id") == Some("1") {
                for (key, v) in r.kv.iter_mut() {
                    if key == "answer_sha16" {
                        *v = "0000000000000000".to_string();
                    }
                }
            }
        }
        let cmp = compare_seal(&k, &dir, &forged, "none", "THIS-SEAT");
        assert!(!cmp.independent && !cmp.reproduced);
        let fields: Vec<&str> = cmp
            .rows
            .iter()
            .filter(|r| r.tag == "MISMATCH")
            .map(|r| r.get("field").unwrap())
            .collect();
        assert!(
            fields.contains(&"seed")
                && fields.contains(&"script_sha256")
                && fields.contains(&"secret1.answer_sha16")
        );
        for r in cmp.rows.iter().filter(|r| r.tag == "MISMATCH") {
            assert!(
                r.get("mine").is_some() && r.get("theirs").is_some(),
                "both values travel together"
            );
        }
        assert_eq!(
            cmp.rows.last().unwrap().get("verdict"),
            Some("MEASURED_FAIL")
        );
        let _ = fs::remove_dir_all(&dir);
    }

    /// The reproduction the verifier ran (2026-10-18): the same seat's own earlier seal. It matches,
    /// so it is a reproduction, and it must not be promoted to INDEPENDENTLY_VERIFIED.
    #[test]
    fn the_same_seat_reproduces_but_is_never_independent() {
        let dir = tmp("same-seat");
        let mut k = session(&dir, &[vec![Mission::Solve("27:13".into())], vec![]]);
        let other = build_seal(&mut k, "other", "ACER-CLAUDE-FABLE5", "none");
        for mine in ["ACER-CLAUDE-FABLE5", "acer-claude-fable5"] {
            let cmp = compare_seal(&k, &dir, &other, "none", mine);
            assert!(cmp.reproduced, "it does match");
            assert!(!cmp.independent, "but it is the same seat ({mine})");
            assert_eq!(cmp.matched, vec![1]);
            let last = cmp.rows.last().unwrap();
            assert_eq!(last.get("independent"), Some("0"));
            assert_eq!(last.get("reproduced"), Some("1"));
            assert_eq!(last.get("verdict"), Some("NOT_MEASURED"));
            assert_eq!(last.get("reason"), Some("SAME_SEAT"));
            assert!(cmp
                .rows
                .iter()
                .any(|r| r.get("subject") == Some("reproduction")
                    && r.get("verdict") == Some("MEASURED_PASS")));
        }
        // a seal with no seat, or a seat that never said who it was, cannot be told from the producer
        for (theirs, mine) in [
            ("unknown", "OTHER"),
            ("OTHER", "unknown"),
            ("unknown", "unknown"),
        ] {
            let seal = build_seal(&mut k, "o2", theirs, "none");
            let cmp = compare_seal(&k, &dir, &seal, "none", mine);
            assert!(cmp.reproduced && !cmp.independent, "{theirs} vs {mine}");
            assert_eq!(cmp.rows.last().unwrap().get("reason"), Some("SEAT_UNKNOWN"));
        }
        let _ = fs::remove_dir_all(&dir);
    }
}
