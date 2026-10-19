//! Every written row ends in `|json=0`; every HBI row recomputes; every sidecar recomputes; the chain
//! recomputes. The files are checked with the game's own verifier and, when the machine has it,
//! with the system's `sha256sum -c`, which knows nothing about this game.

mod common;

use aether_universe::hbp::{self, Row};
use aether_universe::sha256::{from_hex, sha256_hex};
use aether_universe::snapshot;
use common::*;
use std::fs;
use std::path::Path;
use std::process::Command;

fn session_dir(saves: &Path, out: &str) -> std::path::PathBuf {
    let g = rows_of(out, "GAME");
    saves.join(field(g[0], "session").unwrap())
}

fn run_smoke() -> (Tmp, std::path::PathBuf, String) {
    let saves = tmpdir("formats");
    let script = "look\nwait 3\nsolve 27:13\ngo flow\nwait 5\nsave f\nverify\nquit\n";
    let (code, out) = run_script_text(cfg(&saves), &saves, script);
    assert_eq!(code, 0, "{out}");
    let dir = session_dir(&saves, &out);
    (saves, dir, out)
}

#[test]
fn every_row_of_every_file_parses_ends_in_json_zero_and_is_ascii() {
    let (_keep, dir, _) = run_smoke();
    let mut files = 0;
    for p in walk(&dir) {
        let name = p.to_string_lossy().to_string();
        if name.ends_with(".hbp") || name.ends_with(".hbi") {
            let text = fs::read_to_string(&p).unwrap();
            assert!(text.is_ascii(), "{name} must be ascii");
            assert!(text.ends_with('\n'), "{name} must end with a newline");
            let rows = hbp::parse_bytes(text.as_bytes()).unwrap_or_else(|e| panic!("{name}: {e}"));
            assert!(!rows.is_empty());
            assert_eq!(
                rows[0].tag,
                if name.ends_with(".hbi") {
                    "HBI"
                } else {
                    "AETHER-UNIVERSE"
                },
                "{name}: header row first"
            );
            for l in text.lines() {
                assert!(l.ends_with("|json=0"), "{name}: {l}");
            }
            files += 1;
        }
    }
    assert!(files >= 2 * 10, "{files} row files");
}

#[test]
fn hbi_rows_recompute_from_the_hbp_rows() {
    let (_keep, dir, _) = run_smoke();
    let ticks = dir.join("ticks");
    let mut checked = 0usize;
    for k in 0..=9u64 {
        let stem = snapshot::stem(k);
        let hbp_text = fs::read_to_string(ticks.join(format!("{stem}.hbp"))).unwrap();
        let hbi_text = fs::read_to_string(ticks.join(format!("{stem}.hbi"))).unwrap();
        let rows: Vec<&str> = hbp_text.lines().collect();
        let idx: Vec<&str> = hbi_text.lines().collect();
        assert_eq!(rows.len(), idx.len(), "one HBI row per HBP row");
        for (i, (r, x)) in rows.iter().zip(idx.iter()).enumerate() {
            let h = hbp::parse_line(x).unwrap();
            assert_eq!(h.tag, "HBI");
            assert_eq!(
                h.get_u64("row"),
                Some(i as u64 + 1),
                "rows are numbered from 1"
            );
            assert_eq!(
                h.get("sha256"),
                Some(sha256_hex(r.as_bytes()).as_str()),
                "{stem} row {}",
                i + 1
            );
            assert_eq!(
                from_hex(h.get("hex").unwrap()).unwrap(),
                r.as_bytes(),
                "hex is the row, exactly"
            );
            checked += 1;
        }
        // and the library's own check agrees
        assert!(hbp::hbi_verify(hbp_text.as_bytes(), hbi_text.as_bytes()).is_ok());
    }
    assert!(checked > 400, "{checked} rows");
}

#[test]
fn sidecars_are_sha256sum_format_and_recompute() {
    let (_keep, dir, _) = run_smoke();
    let mut sidecars = 0;
    for p in walk(&dir) {
        let name = p.file_name().unwrap().to_string_lossy().to_string();
        if let Some(target) = name.strip_suffix(".sha256") {
            let side = fs::read_to_string(&p).unwrap();
            let bytes = fs::read(p.parent().unwrap().join(target)).unwrap();
            // "<64 hex>  <name>\n": two spaces, so `sha256sum -c` accepts it
            let want = format!("{}  {target}\n", sha256_hex(&bytes));
            assert_eq!(side, want, "{name}");
            sidecars += 1;
        }
    }
    assert!(sidecars >= 2 * 10);
}

#[test]
fn the_systems_own_sha256sum_agrees_when_it_is_there() {
    let (_keep, dir, _) = run_smoke();
    let ticks = dir.join("ticks");
    let probe = Command::new("sha256sum").arg("--version").output();
    if probe.map_or(true, |o| !o.status.success()) {
        println!("NOT_MEASURED|subject=sha256sum_c|reason=NO_TOOLCHAIN|detail=sha256sum_not_on_path|json=0");
        return;
    }
    let mut names: Vec<String> = fs::read_dir(&ticks)
        .unwrap()
        .flatten()
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|n| n.ends_with(".hbp.sha256"))
        .collect();
    names.sort();
    assert!(names.len() >= 10);
    let out = Command::new("sha256sum")
        .arg("-c")
        .args(&names)
        .current_dir(&ticks)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stdout)
    );
    let text = String::from_utf8_lossy(&out.stdout);
    assert_eq!(
        text.lines().filter(|l| l.ends_with(": OK")).count(),
        names.len()
    );
}

#[test]
fn the_chain_recomputes_from_disk_and_every_chain_row_follows_the_rule() {
    let (_keep, dir, out) = run_smoke();
    let ticks = dir.join("ticks");
    let last: u64 = field(rows_of(&out, "QUIT")[0], "tick")
        .unwrap()
        .parse()
        .unwrap();
    let report = snapshot::verify_chain(&ticks, last).unwrap();
    assert_eq!(
        Some(report.head.as_str()),
        field(rows_of(&out, "QUIT")[0], "chain")
    );
    // one rule for every tick including tick 0, recomputed here with sha256 alone (no crate code):
    // tick[k] = sha16(tick[k-1] | state), and tick[-1] is the genesis hash of the seed. Tick 0's own
    // state is therefore an input to the chain; the root is no longer a constant of the seed.
    let mut prev: Option<String> = None;
    let mut genesis_seen = String::new();
    for k in 0..=last {
        let rows: Vec<Row> = hbp::read_set(&ticks, &snapshot::stem(k)).unwrap();
        let (body, chain) = rows.split_at(rows.len() - 1);
        assert_eq!(chain[0].tag, "CHAIN");
        let state = sha256_hex(&hbp::file_bytes(body));
        assert_eq!(chain[0].get("state"), Some(state.as_str()));
        let this = chain[0].get("this").unwrap().to_string();
        let before = match &prev {
            None => {
                let seed = body
                    .iter()
                    .find(|r| r.tag == "TICK")
                    .unwrap()
                    .get("seed")
                    .unwrap()
                    .to_string();
                let root = sha256_hex(format!("AETHER-UNIVERSE|seed={seed}|json=0").as_bytes());
                genesis_seen = root[..16].to_string();
                assert_eq!(
                    chain[0].get("prev"),
                    Some(genesis_seen.as_str()),
                    "tick 0 chains onto the genesis hash"
                );
                genesis_seen.clone()
            }
            Some(p) => {
                assert_eq!(chain[0].get("prev"), Some(p.as_str()));
                p.clone()
            }
        };
        let link = sha256_hex(format!("{before}|{state}").as_bytes());
        assert_eq!(
            this,
            link[..16],
            "tick[k] = sha16(tick[k-1] | state), k={k}"
        );
        if k == 0 {
            assert_ne!(this, genesis_seen, "tick 0 is not the bare genesis hash");
        }
        prev = Some(this);
    }
}

#[test]
fn the_save_carries_the_chain_and_verifies() {
    let (saves, _, out) = run_smoke();
    let save = saves.join("f");
    let rows = hbp::read_set(&save, "SAVE").expect("the save's sidecars and HBI verify");
    assert_eq!(rows[0].tag, "AETHER-UNIVERSE");
    assert_eq!(rows[0].get("kind"), Some("save"));
    let s = rows.iter().find(|r| r.tag == "SAVE").unwrap();
    let t = s.get_u64("tick").unwrap();
    assert_eq!(
        rows.iter().filter(|r| r.tag == "INDEX").count() as u64,
        t + 1,
        "one INDEX row per tick 0..=t"
    );
    assert!(rows.iter().any(|r| r.tag == "SNAPSHOT"));
    // the saved snapshot's evidence reads BRIDGE_PUBLISHED: a save is the bridge
    let head = snapshot::read(&save.join("ticks"), t).unwrap();
    let secret1 = head.rows_of("SECRET").next().unwrap();
    assert_eq!(secret1.get("evidence"), Some("BRIDGE_PUBLISHED"));
    // and the answer is stored only as a hash
    assert!(!hbp::file_bytes(&head.rows)
        .windows(5)
        .any(|w| w == b"27:13"));
    assert!(out.contains("SAVE|name=f|tick="));
}
