//! Time travel and timelines: rewind reads and never recalculates, a past view refuses to change
//! anything, a branch travels beside the chain and never over it, and a save is verified from
//! tick 0 before it is believed.

mod common;

use aether_universe::hbp;
use aether_universe::snapshot;
use common::*;
use std::fs;
use std::path::{Path, PathBuf};

fn session_dir(saves: &Path, out: &str) -> PathBuf {
    saves.join(field(rows_of(out, "GAME")[0], "session").unwrap())
}

fn file_count(dir: &Path) -> usize {
    walk(dir).len()
}

#[test]
fn rewind_is_a_read_and_a_past_view_refuses_every_change() {
    let saves = tmpdir("rewind");
    let script = "wait 6\nrewind 3\nlook\nmap\nwait 1\ngo flow\nsolve 27:13\nsave nope\nwait 27\nrewind 99\nrewind live\nquit\n";
    let (code, out) = run_script_text(cfg(&saves), &saves, script);
    assert_eq!(code, 0, "{out}");
    let dir = session_dir(&saves, &out);

    let rw = rows_of(&out, "REWIND");
    assert_eq!(rw.len(), 2, "rewind 3 and rewind live: {rw:?}");
    assert_eq!(field(rw[0], "view"), Some("3"));
    assert_eq!(field(rw[0], "verified"), Some("1"));
    assert_eq!(field(rw[0], "live_tick"), Some("6"));
    assert_eq!(field(rw[0], "note"), Some("read_not_replayed"));
    let on_disk = snapshot::read(&dir.join("ticks"), 3).unwrap();
    assert_eq!(
        field(rw[0], "chain"),
        Some(on_disk.this.as_str()),
        "the chain shown is the one on disk"
    );
    assert_eq!(field(rw[1], "view"), Some("live"));

    // while looking at tick 3: the HUD says past, and wait, go, solve, save are refused
    assert!(
        out.contains("HUD|world=aether-universe|tick=3|sim=past|"),
        "the map was drawn from the past snapshot"
    );
    let refused: Vec<&str> = rows_of(&out, "REFUSED")
        .into_iter()
        .filter(|l| field(l, "reason") == Some("viewing_past"))
        .collect();
    assert_eq!(refused.len(), 5, "wait, go, solve, save, wait: {refused:?}");
    for l in &refused {
        assert_eq!(field(l, "view_tick"), Some("3"));
        assert_eq!(field(l, "live_tick"), Some("6"));
    }
    assert!(out.contains("REFUSED|reason=that_tick_has_not_happened|live_tick=6|json=0"));

    // nothing recalculated and nothing was written: exactly ticks 0..=6, four files each, the
    // head still at tick 6, and no save directory appeared
    assert_eq!(file_count(&dir.join("ticks")), 4 * 7);
    assert!(!saves.join("nope").exists());
    let q = rows_of(&out, "QUIT");
    assert_eq!(field(q[0], "tick"), Some("6"));
}

#[test]
fn a_branch_travels_beside_the_chain_never_over_it() {
    let saves = tmpdir("branch");
    let script = "wait 6\nrewind 3\nbranch\nsolve 27:13\nwait 2\nsave b\nquit\n";
    let (code, out) = run_script_text(cfg(&saves), &saves, script);
    assert_eq!(code, 0, "{out}");
    let orig = session_dir(&saves, &out);
    let br = rows_of(&out, "BRANCH");
    assert_eq!(br.len(), 1);
    assert_eq!(field(br[0], "from_tick"), Some("3"));
    let name = field(br[0], "session").unwrap();
    assert!(name.ends_with("-b3"), "{name}");
    let bdir = saves.join(name);

    // the branch is self-contained: ticks 0..=3 copied byte for byte, a BRANCH record, then its own ticks
    let from_chain = field(br[0], "from_chain").unwrap().to_string();
    let rec = hbp::read_set(&bdir, "BRANCH").unwrap();
    let r = rec.iter().find(|r| r.tag == "BRANCH").unwrap();
    assert_eq!(r.get("from_chain"), Some(from_chain.as_str()));
    assert_eq!(r.get("from_tick"), Some("3"));
    for k in 0..=3u64 {
        let stem = snapshot::stem(k);
        for ext in ["hbp", "hbi", "hbp.sha256", "hbi.sha256"] {
            let n = format!("{stem}.{ext}");
            assert_eq!(
                fs::read(orig.join("ticks").join(&n)).unwrap(),
                fs::read(bdir.join("ticks").join(&n)).unwrap(),
                "{n}"
            );
        }
    }
    // the branch's next tick chains onto tick[3]
    let b4 = snapshot::read(&bdir.join("ticks"), 4).unwrap();
    assert_eq!(b4.prev, from_chain);
    // it diverged: the player solved in the branch, nobody did in the original
    let o4 = snapshot::read(&orig.join("ticks"), 4).unwrap();
    assert_eq!(o4.prev, from_chain);
    assert_ne!(b4.this, o4.this, "two timelines, two chains");
    // both chains verify from tick 0, and the original still ends at tick 6
    snapshot::verify_chain(&bdir.join("ticks"), 6).unwrap();
    let report = snapshot::verify_chain(&orig.join("ticks"), 6).unwrap();
    assert_eq!(report.to, 6);
    assert!(!orig.join("ticks").join("snap-000007.hbp").exists());
    // the save was made on the branch
    let save = hbp::read_set(&saves.join("b"), "SAVE").unwrap();
    assert_eq!(
        save.iter()
            .find(|r| r.tag == "SAVE")
            .unwrap()
            .get("session"),
        Some(name)
    );
}

#[test]
fn branch_needs_a_past_view() {
    let saves = tmpdir("branch-refused");
    let (_, out) = run_script_text(cfg(&saves), &saves, "wait 2\nbranch\nquit\n");
    assert!(out.contains("REFUSED|reason=branch_needs_a_past_view|try=rewind <tick>|json=0"));
}

#[test]
fn load_verifies_from_tick_zero_and_continues_on_a_new_timeline() {
    let saves = tmpdir("load");
    let script = "wait 4\nsolve 27:13\nsave a\nwait 3\nload a\nwait 2\nverify\nquit\n";
    let (code, out) = run_script_text(cfg(&saves), &saves, script);
    assert_eq!(code, 0, "{out}");
    let orig = session_dir(&saves, &out);
    let l = rows_of(&out, "LOAD");
    assert_eq!(l.len(), 1, "{out}");
    assert_eq!(field(l[0], "name"), Some("a"));
    assert_eq!(field(l[0], "tick"), Some("6"));
    assert_eq!(field(l[0], "chain_verified_depth"), Some("6"));
    // the loaded kernel is at tick 6 (the save), not 9 (where the first session had got to)
    let waits: Vec<&str> = rows_of(&out, "TICK");
    assert!(
        waits.iter().any(|t| field(t, "t") == Some("9")),
        "the first session reached tick 9"
    );
    let after: Vec<&&str> = waits.iter().rev().take(2).collect();
    assert_eq!(
        field(after[0], "t"),
        Some("8"),
        "two waits after the load: ticks 7 and 8"
    );
    // a new timeline directory: a copy of ticks 0..=6 plus its own 7, 8 and 9; the old one still ends at 9
    let new_dir = saves
        .read_dir()
        .unwrap()
        .flatten()
        .map(|e| e.path())
        .find(|p| p.file_name().unwrap().to_string_lossy().contains("-l6"))
        .expect("a -l6 session");
    snapshot::verify_chain(&new_dir.join("ticks"), 9).unwrap();
    snapshot::verify_chain(&orig.join("ticks"), 9).unwrap();
    // the loaded kernel continues exactly where the original went: same world, same missions (none),
    // so tick 7 of the new timeline has the same chain head as tick 7 of the old one
    let o7 = snapshot::read(&orig.join("ticks"), 7).unwrap();
    let n7 = snapshot::read(&new_dir.join("ticks"), 7).unwrap();
    assert_eq!(o7.prev, n7.prev, "both come from tick 6");
    assert_eq!(
        o7.this, n7.this,
        "a rebuilt kernel continues the very same chain"
    );
    assert!(
        out.contains("VERIFY|subject=summary|"),
        "verify ran on the loaded timeline"
    );
    assert!(
        rows_of(&out, "VERIFY")
            .iter()
            .all(|l| field(l, "verdict") != Some("MEASURED_FAIL")),
        "{out}"
    );
}

#[test]
fn a_tampered_save_is_refused_and_nothing_is_loaded() {
    let saves = tmpdir("tamper");
    let (code, out) = run_script_text(cfg(&saves), &saves, "wait 3\nsolve 27:13\nsave x\nquit\n");
    assert_eq!(code, 0, "{out}");

    // 1. flip a byte inside a stored tick of the save
    let f = saves.join("x").join("ticks").join("snap-000002.hbp");
    let good = fs::read(&f).unwrap();
    let mut bad = good.clone();
    let at = bad.iter().position(|b| *b == b'=').unwrap();
    bad[at + 1] ^= 1;
    fs::write(&f, &bad).unwrap();
    let (code, out) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert_eq!(code, 0);
    assert!(
        out.contains("MEASURED_FAIL|subject=load|name=x|detail="),
        "{out}"
    );
    assert!(out.contains("tick 2"), "the failing tick is named: {out}");
    assert!(rows_of(&out, "LOAD").is_empty());
    assert_eq!(
        field(rows_of(&out, "QUIT")[0], "tick"),
        Some("0"),
        "the load did not happen"
    );

    // 2. restore it, then remove a tick: a missing tick is a failure, not a clean zero
    fs::write(&f, &good).unwrap();
    let (_, ok) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(
        !rows_of(&ok, "LOAD").is_empty(),
        "the restored save loads: {ok}"
    );
    fs::remove_file(&f).unwrap();
    let (_, gone) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(gone.contains("MEASURED_FAIL|subject=load|name=x|detail="));
    assert!(gone.contains("MISSING"), "{gone}");
    fs::write(&f, &good).unwrap();

    // 3. forge a middle snapshot AND its sidecars and HBI: the lie cannot reproduce its own hash
    let hbp_path = saves.join("x").join("ticks").join("snap-000004.hbp");
    let rows = hbp::parse_bytes(&fs::read(&hbp_path).unwrap()).unwrap();
    let mut forged = rows.clone();
    for r in forged
        .iter_mut()
        .filter(|r| r.tag == "REGION" && r.get("id") == Some("0"))
    {
        for (k, v) in r.kv.iter_mut() {
            if k == "coherence" {
                *v = "99".to_string();
            }
        }
    }
    hbp::write_set(&saves.join("x").join("ticks"), "snap-000004", &forged).unwrap();
    let (_, out3) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(
        out3.contains("MEASURED_FAIL|subject=load|name=x|detail="),
        "{out3}"
    );
    assert!(rows_of(&out3, "LOAD").is_empty());
}

/// The forgery the verifier found (2026-10-18): edit tick 0, recompute CHAIN.state, the HBI and both
/// sidecars, and keep `this`. It used to load clean (`chain_verified_depth` printed, rewind said
/// verified); tick 0's own state is now an input to the chain.
#[test]
fn a_forged_tick_zero_with_consistent_sidecars_is_refused_on_load() {
    let saves = tmpdir("forge0");
    let (code, out) = run_script_text(cfg(&saves), &saves, "wait 4\nsave x\nquit\n");
    assert_eq!(code, 0, "{out}");
    let ticks = saves.join("x").join("ticks");
    let (_, ok) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(
        !rows_of(&ok, "LOAD").is_empty(),
        "the honest save loads: {ok}"
    );

    let original = hbp::parse_bytes(&fs::read(ticks.join("snap-000000.hbp")).unwrap()).unwrap();
    let edit = |rows: &mut [hbp::Row]| {
        for r in rows
            .iter_mut()
            .filter(|r| r.tag == "REGION" && r.get("id") == Some("0"))
        {
            for (k, v) in r.kv.iter_mut() {
                if k == "coherence" {
                    *v = "99".to_string();
                }
            }
        }
    };
    let n = original.len() - 1;

    // (a) state edited, CHAIN.state recomputed, HBI and sidecars recomputed, `this` kept
    let mut a = original.clone();
    edit(&mut a);
    let state = aether_universe::sha256::sha256_hex(&hbp::file_bytes(&a[..n]));
    a[n] = hbp::Row::new("CHAIN")
        .kv("prev", original[n].get("prev").unwrap())
        .kv("state", &state)
        .kv("this", original[n].get("this").unwrap());
    hbp::write_set(&ticks, "snap-000000", &a).unwrap();
    let (_, out_a) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(
        out_a.contains("MEASURED_FAIL|subject=load|name=x|detail="),
        "{out_a}"
    );
    assert!(
        out_a.contains("tick 0"),
        "the failing tick is named: {out_a}"
    );
    assert!(rows_of(&out_a, "LOAD").is_empty(), "{out_a}");

    // (b) the same, with `this` recomputed too: tick 0 is self-consistent, but the save's INDEX row
    // for tick 0 still holds the old hash (and tick 1 still points at the old tick 0, which the unit
    // test `forged_tick_zero_is_caught` in snapshot.rs checks on its own)
    let mut b = original.clone();
    edit(&mut b);
    let state_b = aether_universe::sha256::sha256_hex(&hbp::file_bytes(&b[..n]));
    b[n] = hbp::Row::new("CHAIN")
        .kv("prev", original[n].get("prev").unwrap())
        .kv("state", &state_b)
        .kv(
            "this",
            snapshot::chain_link(original[n].get("prev").unwrap(), &state_b),
        );
    snapshot::Snapshot::from_rows(b.clone()).expect("tick 0 alone is consistent");
    hbp::write_set(&ticks, "snap-000000", &b).unwrap();
    let (_, out_b) = run_script_text(cfg(&saves), &saves, "load x\nquit\n");
    assert!(
        out_b.contains("MEASURED_FAIL|subject=load|name=x|detail="),
        "{out_b}"
    );
    assert!(
        out_b.contains("INDEX row 0 does not match the stored snapshot"),
        "{out_b}"
    );
    assert!(rows_of(&out_b, "LOAD").is_empty(), "{out_b}");
}

#[test]
fn a_save_name_that_belongs_to_another_session_is_never_overwritten() {
    let saves = tmpdir("noclobber");
    let (_, a) = run_script_text(cfg(&saves), &saves, "wait 2\nsave keep\nquit\n");
    assert!(a.contains("SAVE|name=keep|tick=3|"));
    let before = fs::read(saves.join("keep").join("SAVE.hbp")).unwrap();
    let (_, b) = run_script_text(cfg(&saves), &saves, "wait 4\nsave keep\nquit\n");
    assert!(
        b.contains(
            "REFUSED|reason=a_save_of_that_name_belongs_to_another_session|name=keep|json=0"
        ),
        "{b}"
    );
    assert_eq!(
        fs::read(saves.join("keep").join("SAVE.hbp")).unwrap(),
        before,
        "a record is never overwritten by another seat"
    );
    // the same session may save again under its own name
    let (_, c) = run_script_text(
        cfg(&saves),
        &saves,
        "wait 2\nsave mine\nwait 1\nsave mine\nquit\n",
    );
    assert_eq!(
        rows_of(&c, "SAVE")
            .iter()
            .filter(|l| field(l, "name") == Some("mine"))
            .count(),
        2
    );
    assert!(hbp::read_set(&saves.join("mine"), "SAVE").is_ok());
}

#[test]
fn the_run_halts_at_max_ticks_and_says_so() {
    let saves = tmpdir("halt");
    let mut c = cfg(&saves);
    c.max_ticks = 5;
    let (code, out) = run_script_text(c, &saves, "wait 27\nsolve 27:13\nquit\n");
    assert_eq!(code, 0);
    assert!(out.contains("HALT|reason=max_ticks|max=5|json=0"), "{out}");
    assert_eq!(field(rows_of(&out, "QUIT")[0], "tick"), Some("5"));
    assert_eq!(rows_of(&out, "TICK").len(), 5);
}
