//! Golden pins. The values below were produced by the first correct run (seed 20260801, Rust
//! 1.81.0, x86_64 GNU on ACER, 2026-10-18), checked by eye once against the design, and pinned.
//! A change that moves any of them changes the world: re-pin deliberately, in the open, and say
//! why; never to make a red test green.
//!
//! The maps are compared with golden FILES (`tests/golden/`). To re-bless them after a deliberate
//! change, run with `AETHER_UNIVERSE_BLESS=1` and read the diff before committing.
//!
//! RE-PIN 2026-10-18, in the open, and why: the verifier forged tick 0 (edited a region, recomputed
//! CHAIN.state, the HBI and the sidecars, kept `this`) and the old game loaded it clean, because
//! tick 0's `this` was the bare genesis hash and ignored tick 0's state. The chain rule is now one
//! rule for every tick: `tick[k] = sha16(tick[k-1] | state)` with `tick[-1] = genesis`. No world
//! rule moved, which is measured: the three map golden files differ from the old ones only in the
//! `snapshot=` field of the HUD and DECIDE rows (09cf13896cf847dc -> e9c2037e6c755330); every
//! drawing is byte-identical. Every chain hash and every stdout hash that contains one is new. The
//! old values travel beside the new ones in the comments, never deleted.

mod common;

use aether_universe::atlas::{self, Ctx, Quality, View};
use aether_universe::kernel::Kernel;
use aether_universe::secrets::Inputs;
use aether_universe::sha256::sha256_hex;
use common::*;
use std::fs;

const SEED: u64 = 20_260_801;

fn check(name: &str, got: &str, want: &str) {
    assert_eq!(got, want, "GOLDEN {name}: the world moved. got {got}");
}

fn last_row<'a>(out: &'a str, tag: &str) -> &'a str {
    rows_of(out, tag)
        .last()
        .copied()
        .unwrap_or_else(|| panic!("no {tag} row"))
}

fn map_text(q: Quality, cols: u32) -> String {
    let k = Kernel::new(SEED, None, Inputs::empty("x"));
    let v = View::from_snapshot(&k.snapshot()).unwrap();
    let ctx = Ctx {
        cols,
        live: true,
        live_tick: 0,
        last_verify: "none".into(),
    };
    let mut s = atlas::render_map(&v, q, &ctx).join("\n");
    s.push('\n');
    s
}

fn golden_file(name: &str, got: &str) {
    let p = root().join("tests/golden").join(name);
    if std::env::var("AETHER_UNIVERSE_BLESS").is_ok() {
        fs::write(&p, got).unwrap();
        return;
    }
    let want = fs::read_to_string(&p).unwrap_or_else(|e| panic!("golden file {name} missing: {e}"));
    assert_eq!(got, want, "GOLDEN {name}: the drawing moved");
}

#[test]
fn the_map_at_each_quality_level_matches_its_golden_file() {
    golden_file("map-rich.txt", &map_text(Quality::Rich, 80));
    golden_file("map-balanced.txt", &map_text(Quality::Balanced, 60));
    golden_file("map-low.txt", &map_text(Quality::Low, 30));
}

#[test]
fn the_twelve_step_tick_order_is_pinned_by_the_chain_head_after_27_ticks() {
    let mut k = Kernel::new(SEED, None, Inputs::empty("x"));
    for _ in 0..27 {
        k.tick(&[]);
    }
    // was d45fa233b87ea6cd under `tick[0] = genesis`
    check("kernel_27_ticks", &k.head, "488f79727b33ee75");
}

#[test]
fn the_chain_head_after_3_to_the_9_ticks_is_pinned() {
    let mut k = Kernel::new(SEED, None, Inputs::empty("x"));
    for _ in 0..19_683 {
        k.tick(&[]);
    }
    // was d088ad0d8fd92d20 under `tick[0] = genesis`
    check("kernel_19683_ticks", &k.head, "d56b53d01d170ca2");
}

fn run_pinned(script: &std::path::Path) -> (String, String) {
    let saves = tmpdir("golden");
    let (code, out) = run_script_file(cfg(&saves), script);
    assert_eq!(code, 0, "{out}");
    (sha256_hex(out.as_bytes()), out)
}

#[test]
fn the_smoke_script_is_pinned() {
    if !in_repo() {
        println!("NOT_MEASURED|subject=golden_smoke|reason=NOT_REACHABLE_FROM_HERE|json=0");
        return;
    }
    let (sha, out) = run_pinned(&root().join("scripts/smoke.aether"));
    let chain = field(last_row(&out, "QUIT"), "chain").unwrap().to_string();
    // was c34c220b84c0705c and d51208c6... under `tick[0] = genesis`
    check("smoke_final_chain", &chain, "15e7bd51bcde3bdc");
    check(
        "smoke_stdout_sha256",
        &sha,
        "3eac7fdb7793cb9a07993aa4a014b87ed3a36a1186de919931ffc7c5af819060",
    );
}

#[test]
fn the_full_script_and_the_playthrough_are_pinned_and_are_the_same_run() {
    if !in_repo() {
        println!("NOT_MEASURED|subject=golden_full|reason=NOT_REACHABLE_FROM_HERE|json=0");
        return;
    }
    let (sha_full, out_full) = run_pinned(&root().join("scripts/full.aether"));
    let (sha_play, out_play) = run_pinned(&playthrough());
    assert_eq!(
        sha_full, sha_play,
        "scripts/full.aether is tests/playthrough.txt"
    );
    assert_eq!(out_full, out_play);
    let seal = field(last_row(&out_full, "FINALSEAL"), "this")
        .unwrap()
        .to_string();
    let chain = field(last_row(&out_full, "FINALSEAL"), "chain")
        .unwrap()
        .to_string();
    let tick = field(last_row(&out_full, "FINALSEAL"), "tick")
        .unwrap()
        .to_string();
    // were f48a3694f73d03e6, a9bdebcd3d58a835 and d5dc6a20... under `tick[0] = genesis`
    check("full_final_seal", &seal, "6c6ebcea60c08f9c");
    check("full_seal_chain_head", &chain, "732160b13ff0824a");
    check("full_seal_tick", &tick, "47");
    // RE-PIN 2026-10-18 (second, in the open): the stdout moved by exactly one line, the codex FACT
    // row Y01, whose source changed from `README.md:92` to the section name, because adding the
    // AETHER UNIVERSE section to the aether README moved that line to 116. No world rule, chain hash
    // or seal moved (measured: diff of two play-through stdouts = that one line). Was
    // a44a97c2320c263e416c9e89bbb8578f976533cca7c0d375490f5eb71d722fcb.
    check(
        "full_stdout_sha256",
        &sha_full,
        "e436986ec8d53ec39d3909563ac3bcf4b2c2cb65bb56ec31f3d78f7816a8f551",
    );
}
