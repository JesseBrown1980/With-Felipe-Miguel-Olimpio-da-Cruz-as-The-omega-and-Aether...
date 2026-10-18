//! The Rust emitter against node's rows: the P4 golden file from the P5 predictions ledger (held
//! outside this repository; the test fails if it is not there) and a synthetic edge-case fixture.

use std::fmt::Write;
use std::path::{Path, PathBuf};

use asolaria_host8::bridge::{golden_rows, GOLDEN_BRIDGE_LABEL, GOLDEN_PREDICTIONS_LABEL};
use sha2::{Digest, Sha256};

const BRIDGE: &str = "../acer/Asolaria/tools/behcs/gnn-dispatch-bridge.mjs";
const GOLDEN_DIR: &str = "../docs/handoffs/p4-sidecar-lanes-2026-10-18";
const BRIDGE_SHA256: &str = "21e063994b6f812ea0e43d158261fd76e6cdc446fa4db2da0d52a9bf12b13c65";
const LEDGER_SHA256: &str = "7054124272083e229725c825e18305b7eb62999d8a6662453c10b8fa935435b2";
const GOLDEN_SHA256: &str = "9b8647ff15b2bdc71cba7091ad72f8ae09b4d8e54fccaee286d78fded021178f";
/// The vendored P5 ledger; `AETHER_P5_PREDICTIONS` overrides it.
const DEFAULT_LEDGER: &str = "../acer/Asolaria/data/behcs/gnn-predictions.ndjson";
const FOOTER_TAIL: &str = "|parity_rule=host8_port_must_emit_identical_pred_id+tier+prediction_pid_per_row_before_node_retire|json=0";

fn crate_path(rel: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join(rel)
}

fn read(rel: &str) -> Vec<u8> {
    std::fs::read(crate_path(rel)).unwrap_or_else(|e| panic!("read {rel}: {e}"))
}

fn sha256(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(64);
    for b in Sha256::digest(bytes) {
        write!(out, "{b:02x}").expect("write to String");
    }
    out
}

/// The golden rows file of the P4 handoff, found by its name's tail and pinned by sha256.
fn golden() -> String {
    let dir = crate_path(GOLDEN_DIR);
    let path = std::fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("read {}: {e}", dir.display()))
        .map(|entry| entry.expect("dir entry").path())
        .find(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.ends_with("-BRIDGE-GOLDEN-2026-10-18.hbp"))
        })
        .expect("golden rows file in the P4 handoff");
    let bytes = std::fs::read(&path).expect("read golden");
    assert_eq!(sha256(&bytes), GOLDEN_SHA256, "{}", path.display());
    String::from_utf8(bytes).expect("golden is UTF-8")
}

#[test]
fn vendored_bridge_is_the_one_the_golden_header_names() {
    assert_eq!(sha256(&read(BRIDGE)), BRIDGE_SHA256);
    let golden = golden();
    let header = golden.lines().next().expect("header");
    assert!(header.contains(&format!("|bridge_sha256={BRIDGE_SHA256}|")));
    assert!(header.contains(&format!("|pred_sha256={LEDGER_SHA256}|")));
}

#[test]
fn golden_footer_recomputes_from_its_header_and_rows() {
    let golden = golden();
    let (rows, footer) = golden
        .strip_suffix('\n')
        .and_then(|body| body.rsplit_once('\n'))
        .expect("rows then footer");
    assert_eq!(
        footer,
        format!(
            "BRIDGEGOLDFTR|rows_sha256={}{FOOTER_TAIL}",
            sha256(rows.as_bytes())
        )
    );
}

#[test]
fn edge_fixture_rows_equal_node_byte_for_byte() {
    // tests/fixtures/bridge-edge.golden.hbp is node's output (tests/fixtures/bridge_golden_args.mjs).
    let out = golden_rows(
        &read(BRIDGE),
        &read("tests/fixtures/bridge-edge.ndjson"),
        GOLDEN_BRIDGE_LABEL,
        "fixtures/bridge-edge.ndjson",
    )
    .expect("node throws on none of these rows");
    assert_eq!(
        (out.rows, out.unparseable, out.tiers),
        (106, 18, [5, 77, 6])
    );
    assert_eq!(
        out.text.as_bytes(),
        read("tests/fixtures/bridge-edge.golden.hbp").as_slice()
    );
}

#[test]
fn p5_ledger_rows_equal_the_p4_golden_byte_for_byte() {
    let path = std::env::var("AETHER_P5_PREDICTIONS")
        .unwrap_or_else(|_| crate_path(DEFAULT_LEDGER).display().to_string());
    let ledger = std::fs::read(&path).unwrap_or_else(|e| {
        panic!(
            "P5 predictions ledger not readable at {path}: {e}. Set AETHER_P5_PREDICTIONS to a copy \
             with sha256 {LEDGER_SHA256}. The other tests run without it (cargo test -- --skip p5_ledger)."
        )
    });
    assert_eq!(
        sha256(&ledger),
        LEDGER_SHA256,
        "{path} is not the P5 ledger"
    );
    let golden = golden();
    let out = golden_rows(
        &read(BRIDGE),
        &ledger,
        GOLDEN_BRIDGE_LABEL,
        GOLDEN_PREDICTIONS_LABEL,
    )
    .expect("node wrote every row");
    let ours: Vec<&str> = out.text.lines().collect();
    let theirs: Vec<&str> = golden.lines().collect();
    let identical = ours.iter().zip(&theirs).filter(|(a, b)| a == b).count();
    println!(
        "BRIDGEPARITY|lines_compared={}|identical={identical}|rows={}|unparseable={}|T1={}|T2={}|T3={}|out_sha256={}|golden_sha256={GOLDEN_SHA256}|footer_rows_sha256={}|json=0",
        ours.len().min(theirs.len()),
        out.rows,
        out.unparseable,
        out.tiers[0],
        out.tiers[1],
        out.tiers[2],
        sha256(out.text.as_bytes()),
        ours.last()
            .and_then(|f| f.strip_prefix("BRIDGEGOLDFTR|rows_sha256="))
            .and_then(|f| f.split('|').next())
            .unwrap_or_default()
    );
    if let Some(i) = ours.iter().zip(&theirs).position(|(a, b)| a != b) {
        panic!(
            "line {i} differs:\n  rust: {}\n  node: {}",
            ours[i], theirs[i]
        );
    }
    assert_eq!(ours.len(), theirs.len());
    assert_eq!(out.text, golden);
    assert_eq!(
        (out.rows, out.unparseable, out.tiers),
        (4739, 0, [4739, 0, 0])
    );
}
