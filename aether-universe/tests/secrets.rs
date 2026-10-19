//! Each of the nine secrets, recomputed by the game's integer kernel, against the MEASURED receipt
//! on disk that measured it first. The kernel's number is the one under test; the receipt is the
//! witness. Where the receipt is not reachable (the game folder was copied out of the repository)
//! a test prints `NOT_MEASURED|reason=NOT_REACHABLE_FROM_HERE` and stops: a path that cannot be
//! reached from here is not a path that does not exist.

mod common;

use aether_universe::game;
use aether_universe::hbp::Row;
use aether_universe::secrets::{self, Outcome, SecretOut};
use common::*;
use std::fs;

const SEED: u64 = 20_260_801;

fn out(id: u8) -> SecretOut {
    let dir = tmpdir("secrets");
    let inputs = game::load_inputs(&cfg(&dir));
    match secrets::compute_memo(id, SEED, &inputs) {
        Outcome::Ready(o) => o,
        other => panic!("secret {id}: {other:?}"),
    }
}

fn rows_tagged<'a>(o: &'a SecretOut, tag: &str) -> Vec<&'a Row> {
    o.rows.iter().filter(|r| r.tag == tag).collect()
}

/// A receipt row: the tag and its `k=v` fields (a bare token such as the second word of
/// `CLOUD|TRITRANGE|...` carries no `=` and is skipped).
struct Rec {
    tag: String,
    kv: Vec<(String, String)>,
}

impl Rec {
    fn get(&self, k: &str) -> Option<&str> {
        self.kv
            .iter()
            .find(|(key, _)| key == k)
            .map(|(_, v)| v.as_str())
    }
}

fn receipt(rel: &str) -> Option<Vec<Rec>> {
    let text = fs::read_to_string(root().join("..").join(rel)).ok()?;
    Some(
        text.lines()
            .filter(|l| l.ends_with("|json=0"))
            .map(|l| {
                let mut parts = l.split('|');
                let tag = parts.next().unwrap().to_string();
                let kv = parts
                    .filter_map(|p| {
                        p.split_once('=')
                            .map(|(k, v)| (k.to_string(), v.to_string()))
                    })
                    .collect();
                Rec { tag, kv }
            })
            .collect(),
    )
}

macro_rules! need_repo {
    ($rel:expr) => {
        match receipt($rel) {
            Some(r) => r,
            None => {
                println!(
                    "NOT_MEASURED|subject={}|reason=NOT_REACHABLE_FROM_HERE|json=0",
                    $rel
                );
                return;
            }
        }
    };
}

/// Every key the receipt row carries and the game's row also carries must agree.
fn agree(rec: &Rec, mine: &Row, keys: &[&str]) {
    for k in keys {
        let theirs = rec
            .get(k)
            .unwrap_or_else(|| panic!("receipt {} has no {k}", rec.tag));
        assert_eq!(
            mine.get(k),
            Some(theirs),
            "{} {k}: mine vs the receipt",
            mine.tag
        );
    }
}

const PTP: &str = "kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp";

#[test]
fn secret_1_d1_equals_the_ncm_run_receipt() {
    let rec = need_repo!(
        "docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/FABLE5-NCM-D1-RUN-2026-10-18.hbp"
    );
    let o = out(1);
    assert_eq!(o.token, "27:13");
    let d1 = rec
        .iter()
        .find(|r| r.tag == "D1LEVEL" && r.get("K") == Some("13"))
        .expect("D1LEVEL K=13");
    let mine = rows_tagged(&o, "D1")[0];
    assert_eq!(mine.get("states"), d1.get("states"));
    assert_eq!(mine.get("ties"), d1.get("ties"));
    assert_eq!(mine.get("in_range_exact"), d1.get("in_range_exact"));
    assert_eq!(d1.get("in_range_exact"), Some("1594323/1594323"));
}

#[test]
fn secret_2_equals_the_cloud_tritrange_row() {
    let rec = need_repo!("docs/handoffs/proof-nanoseconds-ternary-2026-10-18/cloud/CLOUD-ROWS.hbp");
    let o = out(2);
    assert_eq!(o.token, "41");
    let r = rec
        .iter()
        .find(|r| r.get("pid_bits").is_some() && r.get("trits").is_some())
        .expect("TRITRANGE");
    agree(
        r,
        rows_tagged(&o, "TRITRANGE")[0],
        &[
            "pid_bits",
            "trits",
            "3^40",
            "2^64",
            "3^41",
            "40_trits_enough",
            "41_trits_enough",
        ],
    );
}

#[test]
fn secret_3_equals_the_ptp_receipt() {
    let rec = need_repo!(PTP);
    let o = out(3);
    assert_eq!(o.token, "-1:189");
    let sp = rec.iter().find(|r| r.tag == "SPOKES").unwrap();
    agree(
        sp,
        rows_tagged(&o, "SPOKES")[0],
        &[
            "plus1_6k+1",
            "minus1_6k-1",
            "primes_above_3",
            "all_on_spokes",
            "minus1_lead",
        ],
    );
    let p2p = rec.iter().find(|r| r.tag == "P2P").unwrap();
    agree(
        p2p,
        rows_tagged(&o, "P2P")[0],
        &[
            "pairs",
            "switch",
            "stay",
            "switch_permille",
            "independence_baseline_permille",
            "minus_to_plus",
            "plus_to_minus",
            "first_spoke",
            "last_spoke",
            "direction_balance_is_forced",
        ],
    );
    let theirs: Vec<&Rec> = rec.iter().filter(|r| r.tag == "PHASE").collect();
    let mine = rows_tagged(&o, "PHASE");
    assert_eq!(theirs.len(), 6);
    for (t, m) in theirs.iter().zip(mine) {
        agree(t, m, &["residue_mod6", "primes"]);
    }
    for pi in rec.iter().filter(|r| r.tag == "PI") {
        let x: u64 = pi.get("x").unwrap().parse().unwrap();
        let want: u64 = pi.get("pi").unwrap().parse().unwrap();
        assert_eq!(aether_universe::sieve::global().pi(x), want, "pi({x})");
    }
}

#[test]
fn secret_4_equals_the_27_cell_rows() {
    let rec = need_repo!(PTP);
    let o = out(4);
    assert_eq!(o.token, "18:3");
    let theirs: Vec<&Rec> = rec.iter().filter(|r| r.tag == "CELL").collect();
    let mine = rows_tagged(&o, "CELL");
    assert_eq!((theirs.len(), mine.len()), (27, 27));
    for (t, m) in theirs.iter().zip(mine) {
        agree(t, m, &["r", "trits", "coprime_to_3", "primes"]);
        assert_eq!(
            m.get("order"),
            Some("msf"),
            "the receipt's CELL rows are most significant first"
        );
    }
    let c = rec.iter().find(|r| r.tag == "CUBE27").unwrap();
    agree(
        c,
        rows_tagged(&o, "CUBE27")[0],
        &[
            "coprime_cells",
            "populated",
            "min",
            "max",
            "spread_per10000_of_mean",
            "centre_plane_nonempty",
        ],
    );
    let m3 = rec.iter().find(|r| r.tag == "MOD3").unwrap();
    agree(m3, rows_tagged(&o, "MOD3")[0], &["centre_primes", "only_3"]);
}

#[test]
fn secret_5_equals_the_level_rows_and_address60() {
    let rec = need_repo!(PTP);
    let o = out(5);
    assert_eq!(o.token, "5");
    let theirs: Vec<&Rec> = rec.iter().filter(|r| r.tag == "LEVEL").collect();
    let mine = rows_tagged(&o, "LEVEL");
    assert_eq!((theirs.len(), mine.len()), (7, 7), "levels 1 to 6 and 60");
    for (t, m) in theirs.iter().zip(mine) {
        agree(
            t,
            m,
            &[
                "level",
                "voxels",
                "primes_sharing_a_voxel",
                "inner_address_kept",
            ],
        );
    }
    let a = rec.iter().find(|r| r.tag == "ADDRESS60").unwrap();
    let mine = rows_tagged(&o, "ADDRESS60")[0];
    agree(
        a,
        mine,
        &[
            "sharing_reaches_zero_at_level",
            "stays_zero_through_60",
            "room_of_2",
            "room_of_3",
            "trit_order",
        ],
    );
}

#[test]
fn secret_6_equals_the_ladder_rung_receipt() {
    let rec = need_repo!("codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp");
    let o = out(6);
    assert_eq!(o.token, "40");
    let r = rec
        .iter()
        .find(|r| r.tag == "RUNG" && r.get("width") == Some("10"))
        .expect("RUNG width 10");
    agree(
        r,
        rows_tagged(&o, "RUNG")[0],
        &[
            "width",
            "alphabet",
            "tested",
            "roundtrip_failures",
            "lossless",
        ],
    );
    assert_eq!(
        rows_tagged(&o, "PRISM27")[0].get("roundtrip"),
        Some("EXACT")
    );
    assert_eq!(rows_tagged(&o, "LCM")[0].get("lcm"), Some("40"));
}

#[test]
fn secret_7_equals_every_integer_line_of_compose_stdout() {
    if !in_repo() {
        println!("NOT_MEASURED|subject=compose.stdout|reason=NOT_REACHABLE_FROM_HERE|json=0");
        return;
    }
    // the aether repository's own file, or its byte-exact mirror in the standalone repository
    let rel = "kernel/tribit-referees/receipts/compose.stdout";
    let mirrored = root().join("../aether-sources").join(rel);
    let path = if mirrored.is_file() {
        mirrored
    } else {
        root().join("..").join(rel)
    };
    let text = fs::read_to_string(path).unwrap();
    let o = out(7);
    assert_eq!(o.token, "0");
    let mut section = 0;
    let (mut nest, mut free, mut exact, mut cited) = (0, 0, 0, 0);
    for line in text.lines() {
        if line.starts_with("=== 1.") {
            section = 1;
        } else if line.starts_with("=== 2.") {
            section = 2;
        } else if line.starts_with("=== 3.") {
            section = 3;
        }
        let w: Vec<&str> = line.split_whitespace().collect();
        match (section, w.as_slice()) {
            // depth leaves levels_checked sum_ne_zero
            (1, [d, leaves, _, bad]) if d.parse::<u32>().is_ok() => {
                let row = o
                    .rows
                    .iter()
                    .find(|r| r.tag == "NEST" && r.get("depth") == Some(d))
                    .expect("NEST row");
                assert_eq!(row.get("leaves"), Some(*leaves));
                assert_eq!(row.get("sum_ne_zero"), Some(*bad));
                nest += 1;
            }
            // depth arithmetic arm_changes worst
            (2, [d, "int", changes, ..]) => {
                let row = o
                    .rows
                    .iter()
                    .find(|r| r.tag == "FREECENTRE" && r.get("depth") == Some(d))
                    .expect("FREECENTRE row");
                assert_eq!(row.get("arm_changes"), Some(*changes));
                free += 1;
            }
            (3, [d, "exact", resid]) => {
                let row = o
                    .rows
                    .iter()
                    .find(|r| r.tag == "CLOSURE" && r.get("depth") == Some(d))
                    .expect("CLOSURE row");
                assert_eq!(row.get("residual_at_root"), Some(*resid));
                exact += 1;
            }
            // the float lane is cited, character for character, and was not run
            (3, [d, "float64", v]) if *v != "0.000000e+00" => {
                let row = o
                    .rows
                    .iter()
                    .find(|r| r.tag == "CITED" && r.get("depth") == Some(d))
                    .expect("CITED row");
                assert_eq!(row.get("residual_at_root"), Some(*v));
                assert_eq!(row.get("run_here"), Some("0"));
                cited += 1;
            }
            _ => {}
        }
    }
    assert_eq!((nest, free, exact, cited), (13, 5, 5, 3));
}

#[test]
fn secret_9_matches_the_sidecar_and_the_readme() {
    if !in_repo() {
        println!("NOT_MEASURED|subject=mythos|reason=NOT_REACHABLE_FROM_HERE|json=0");
        return;
    }
    let o = out(9);
    assert_eq!(o.token, "3dd92a42:32,32,33");
    let star = rows_tagged(&o, "STAR")[0];
    assert_eq!(star.get("bytes"), Some("50752"));
    assert_eq!(star.get("sidecar"), Some("OK"));
    let side = fs::read_to_string(root().join("../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf.sha256"))
        .unwrap();
    assert!(
        side.starts_with(star.get("sha256").unwrap()),
        "the computed hash is the sidecar's"
    );
    let g = rows_tagged(&o, "GGUF")[0];
    assert_eq!(g.line(), "GGUF|version=3|arch=asolaria-three-beings-rgb|being=MYTHOS|channel=BLUE|seat=ACER|centre=32,32,33|tensors=6|json=0");
    let t = rows_tagged(&o, "TENSORS")[0];
    assert_eq!(
        t.get("names"),
        Some("slice_A,slice_B,slice_C,radial_A,radial_B,radial_C")
    );
    assert_eq!(
        t.get("decoded"),
        Some("0"),
        "tensor data is hashed as bytes and never interpreted"
    );
}

#[test]
fn a_changed_star_stays_closed_and_the_readmes_hash_is_never_substituted() {
    if !in_repo() {
        println!("NOT_MEASURED|subject=mythos|reason=NOT_REACHABLE_FROM_HERE|json=0");
        return;
    }
    let dir = tmpdir("star");
    let mut inputs = game::load_inputs(&cfg(&dir));
    let m = inputs
        .mythos
        .as_mut()
        .expect("the star is in the repository");
    m.bytes[200] ^= 1; // one byte of the file, the sidecar left as it was
    match secrets::compute(9, SEED, &inputs) {
        Outcome::Failed { rows } => {
            assert_eq!(rows[0].tag, "MEASURED_FAIL");
            assert_eq!(rows[0].get("sidecar"), Some("MISMATCH"));
            let computed = rows[0].get("computed").unwrap();
            assert_ne!(
                computed,
                aether_universe::sources::CITED_MYTHOS_SHA256,
                "the computed hash, not the cited one"
            );
        }
        other => panic!("a changed star must not open: {other:?}"),
    }
    // and with no file at all it is not measured, not failed and not a zero
    inputs.mythos = None;
    match secrets::compute(9, SEED, &inputs) {
        Outcome::NotMeasured { reason, .. } => assert_eq!(reason, "NO_INPUT"),
        other => panic!("{other:?}"),
    }
}

#[test]
fn the_nine_canonical_tokens() {
    // the answers the play-through gives, each one the kernel's own output for its secret
    let want = [
        (1u8, "27:13"),
        (2, "41"),
        (3, "-1:189"),
        (4, "18:3"),
        (5, "5"),
        (6, "40"),
        (7, "0"),
        (8, "page:1893"),
    ];
    for (id, tok) in want {
        assert_eq!(out(id).token, tok, "secret {id}");
    }
    if in_repo() {
        assert_eq!(out(9).token, "3dd92a42:32,32,33");
    }
}
