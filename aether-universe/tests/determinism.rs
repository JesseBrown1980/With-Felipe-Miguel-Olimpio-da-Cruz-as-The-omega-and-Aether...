//! Determinism: the same seed and the same script give identical chain heads and identical bytes of
//! every snapshot, on any run. A clock may measure; it may never judge: nothing here depends on time.

mod common;

use aether_universe::kernel::{Kernel, Mission};
use aether_universe::secrets::Inputs;
use common::*;
use std::fs;
use std::path::Path;

const SCRIPT: &str = "look\nwait 5\nprobe 13\nsolve 27:13\ngo flow\nwait 9\nsolve nonsense\nsolve 41\nsave d\nverify\nmap\nquit\n";

fn run_in(dir: &Path, seed: u64, script: &str) -> (String, Vec<(String, Vec<u8>)>) {
    let mut c = cfg(dir);
    c.seed = seed;
    c.session = Some("det".to_string());
    let (code, out) = run_script_text(c, dir, script);
    assert_eq!(code, 0, "{out}");
    let ticks = dir.join("det").join("ticks");
    let mut files: Vec<(String, Vec<u8>)> = fs::read_dir(&ticks)
        .unwrap()
        .flatten()
        .map(|e| {
            (
                e.file_name().to_string_lossy().to_string(),
                fs::read(e.path()).unwrap(),
            )
        })
        .collect();
    files.sort();
    (out, files)
}

#[test]
fn same_seed_and_script_give_identical_output_and_identical_snapshot_bytes() {
    let a = tmpdir("det-a");
    let b = tmpdir("det-b");
    let (oa, fa) = run_in(&a, 20_260_801, SCRIPT);
    let (ob, fb) = run_in(&b, 20_260_801, SCRIPT);
    assert_eq!(oa, ob, "stdout differs between two runs");
    assert!(fa.len() >= 4 * 15, "{} files", fa.len());
    assert_eq!(fa.len(), fb.len());
    for ((na, ba), (nb, bb)) in fa.iter().zip(fb.iter()) {
        assert_eq!(na, nb);
        assert_eq!(ba, bb, "{na} differs between two runs");
    }
}

#[test]
fn a_different_seed_changes_the_world_and_the_whole_chain() {
    let a = tmpdir("det-s1");
    let b = tmpdir("det-s2");
    let (_, fa) = run_in(&a, 20_260_801, SCRIPT);
    let (_, fb) = run_in(&b, 7, SCRIPT);
    let head = |f: &[(String, Vec<u8>)]| {
        f.iter()
            .find(|(n, _)| n == "snap-000001.hbp")
            .map(|(_, b)| {
                String::from_utf8_lossy(b)
                    .lines()
                    .last()
                    .unwrap()
                    .to_string()
            })
            .unwrap()
    };
    assert_ne!(head(&fa), head(&fb), "tick 1 must already differ");
    // every snapshot from tick 0 on differs: the seed is in the root of the chain
    for ((na, ba), (_, bb)) in fa.iter().zip(fb.iter()) {
        if na.ends_with(".hbp") {
            assert_ne!(ba, bb, "{na}");
        }
    }
}

#[test]
fn a_different_script_changes_every_tick_because_the_script_hash_is_in_every_snapshot() {
    let a = tmpdir("det-x");
    let b = tmpdir("det-y");
    let (_, fa) = run_in(&a, 20_260_801, SCRIPT);
    let (_, fb) = run_in(
        &b,
        20_260_801,
        &format!("{SCRIPT}# a comment is a different script\n"),
    );
    let tick1 = |f: &[(String, Vec<u8>)]| {
        String::from_utf8_lossy(&f.iter().find(|(n, _)| n == "snap-000001.hbp").unwrap().1)
            .to_string()
    };
    let (ta, tb) = (tick1(&fa), tick1(&fb));
    let script_of = |t: &str| {
        t.lines()
            .find(|l| l.starts_with("TICK|"))
            .unwrap()
            .split('|')
            .find(|f| f.starts_with("script="))
            .unwrap()
            .to_string()
    };
    assert_ne!(script_of(&ta), script_of(&tb));
    assert_ne!(ta, tb);
    // ...but the world itself, the agents and regions, ran the same
    let world = |t: &str| {
        t.lines()
            .filter(|l| l.starts_with("AGENT|") || l.starts_with("REGION|"))
            .collect::<Vec<_>>()
            .join("\n")
    };
    assert_eq!(
        world(&ta),
        world(&tb),
        "the script names a run; it does not steer the world"
    );
}

#[test]
fn the_kernel_alone_is_deterministic_with_missions_and_no_io() {
    let run = || {
        let mut k = Kernel::new(20_260_801, Some("0123456789abcdef"), Inputs::empty("x"));
        let mut heads = vec![k.snapshot().this];
        for t in 0..300u64 {
            let m = match t {
                10 => vec![Mission::Solve("27:13".into())],
                11 => vec![Mission::Go(1)],
                40 => vec![Mission::Bridge],
                _ => vec![],
            };
            heads.push(k.tick(&m).this);
        }
        heads
    };
    let (a, b) = (run(), run());
    assert_eq!(a, b);
    assert_eq!(a.len(), 301);
    let mut distinct = a.clone();
    distinct.sort();
    distinct.dedup();
    assert_eq!(distinct.len(), a.len(), "every tick has its own head");
}
