//! Slot 21: the vendored Q-PRISM Host-8 cube contract against the receipts STAGE2-CUBE-ABSORPTION.md
//! records and against the owner's Python (`tools/qprism_receipts.py` wrote the fixture from
//! `qprism/cube_absorb.py` @ b4a21a2, unchanged).

mod common;

use common::{fixture, get, unhex};
use quant_cubes::qprism::{
    active_glyph_law, bh_inject_between, bh_prefix, bh_render, cube_row, transcode_1024_to_256,
    transcode_256_to_1024, CubeHandles, Host8,
};
use quant_cubes::sha256_hex;

fn row(prefix: &str) -> String {
    fixture("qprism-receipts.hbp")
        .into_iter()
        .find(|r| r.starts_with(prefix))
        .unwrap_or_else(|| panic!("{prefix}"))
}

/// STAGE2-CUBE-ABSORPTION.md:11-12: "node PK `handle8` = FNV-1a-64(node_id) = `5bd9437e2a3fe005`
/// (Rust == Python == `tools/graphify/graphify.py`)", and the row of lines 43-45.
#[test]
fn recorded_node_handle_from_the_rust_contract() {
    let doc = row("DOCROW|");
    let node = get(&doc, "node");
    assert_eq!(
        node,
        "qprism/cube/bcbl190626/SpanishBCBL/S5/1/12.5/5d8b102753b7fcfb"
    );
    assert_eq!(Host8::fnv1a64(node).to_hex(), "5bd9437e2a3fe005");
    assert_eq!(get(&doc, "handle8"), "5bd9437e2a3fe005");
    // glyph=gly-stcI is computed by the Python `glyphword` (cube_absorb.py:41-46); the Rust contract
    // takes the glyph as an input.
    assert_eq!(get(&doc, "glyph"), "gly-stcI");
    let fx = row("FIXTURE|");
    assert_eq!(get(&fx, "feat_sha16"), "5d8b102753b7fcfb");
    assert_eq!(get(&fx, "tuple_sha16"), "969d2b5e47e97e3e");
}

#[test]
fn fnv_handles_equal_python() {
    for r in fixture("qprism-receipts.hbp")
        .iter()
        .filter(|r| r.starts_with("FNV|"))
    {
        let text = String::from_utf8(unhex(get(r, "text_hex"))).unwrap();
        assert_eq!(Host8::fnv1a64(&text).to_hex(), get(r, "handle8"), "{text}");
    }
    let x = row("XCOLONY|");
    assert_eq!(Host8::fnv1a64(get(&x, "node")).to_hex(), "5edd3a45544437d4");
}

#[test]
fn current_cube_handles_equal_python() {
    let fx = row("FIXTURE|");
    let cur = row("CURRENT|");
    let tuple_sha256 = get(&fx, "tuple_sha256");
    // Python `host8_from_sha256` (cube_absorb.py:57-63) hashes a non-hex source first; the Rust
    // `from_sha256_prefix` (upstream lines 39-48) takes a hex prefix only.
    assert_eq!(get(&cur, "source_sha256"), "referenced-on-D");
    assert_eq!(
        Host8::from_sha256_prefix("referenced-on-D").err(),
        Some("sha256 hex prefix must have at least 16 chars")
    );
    let source_sha = sha256_hex(b"referenced-on-D");
    let h = CubeHandles::new(&source_sha, tuple_sha256, get(&cur, "glyph")).unwrap();
    assert_eq!(h.node8, get(&cur, "handle8"));
    assert_eq!(h.tuple8, get(&cur, "tuple8"));
    assert_eq!(h.source8, get(&cur, "source8"));
    assert_eq!(CubeHandles::graphify_node_id(&h.tuple8), get(&cur, "node"));
    assert_eq!(bh_render(&bh_prefix(&h.node8)), get(&cur, "bh_prefix"));
    assert_eq!(active_glyph_law(&h.node8), row("QPRISMACTIVEGLYPH|"));
}

#[test]
fn brown_hilbert_prefix_and_injection_equal_python() {
    let mut n = 0;
    for r in fixture("qprism-receipts.hbp")
        .iter()
        .filter(|r| r.starts_with("BH|"))
    {
        let (pa, pb) = (bh_prefix(get(r, "a")), bh_prefix(get(r, "b")));
        assert_eq!(bh_render(&pa), get(r, "prefix_a"));
        assert_eq!(bh_render(&pb), get(r, "prefix_b"));
        assert_eq!(bh_render(&bh_inject_between(&pa, &pb)), get(r, "inject"));
        n += 1;
    }
    assert_eq!(n, 81);
}

/// STAGE2-CUBE-ABSORPTION.md:93-96: 2,560 base-1024 symbols, "byte-identical, sha256-identical,
/// 0 loss ... and Rust==Python symbol-identical", here on the owner's own cube tuple.
#[test]
fn transcode_of_the_cube_tuple_equals_python() {
    let tuple = unhex(get(&row("TUPLE|"), "hex"));
    assert_eq!(tuple.len(), 3200);
    let rt = row("ROUNDTRIP|");
    let down = transcode_256_to_1024(&tuple);
    assert_eq!(down.len().to_string(), get(&rt, "symbols_1024"));
    let be16: Vec<u8> = down.iter().flat_map(|s| s.to_be_bytes()).collect();
    assert_eq!(sha256_hex(&be16), get(&rt, "symbols_be16_sha256"));
    let first4: Vec<String> = down[..4].iter().map(u16::to_string).collect();
    assert_eq!(first4.join(","), get(&rt, "first4"));
    let up = transcode_1024_to_256(&down, tuple.len());
    assert_eq!(up, tuple);
    assert_eq!(sha256_hex(&up), get(&rt, "recovered_sha256"));
    assert_eq!(get(&rt, "byte_identical"), "True");
}

/// The Rust `cube_row` (upstream lines 193-213) and the Python `hbp_row` (cube_absorb.py:226-247)
/// for the same cube: every Rust field is in the Python row except `glyph-family`, and the Python
/// row carries these extra fields.
#[test]
fn rust_cube_row_against_python_hbp_row() {
    let cur = row("CURRENT|");
    let py = row("QPRISMCUBE|");
    let fx = row("FIXTURE|");
    let h = CubeHandles::new(
        &sha256_hex(b"referenced-on-D"),
        get(&fx, "tuple_sha256"),
        get(&cur, "glyph"),
    )
    .unwrap();
    let rs = cube_row(
        &h,
        "qprism/SpanishBCBL/stage2/cube-absorption/acer",
        "2026_07_01_STAGE2",
        0,
        3200,
    );
    let py_parts: Vec<&str> = py.split('|').collect();
    let rs_parts: Vec<&str> = rs.split('|').collect();
    let rust_only: Vec<&str> = rs_parts
        .iter()
        .copied()
        .filter(|p| !py_parts.contains(p))
        .collect();
    assert_eq!(
        rust_only,
        ["selector_axis:glyph-family=BEHCS_1024+HG1024_QPRISM_gly-iG0O+HBP_HBI_TUPLE_TEXT"]
    );
    assert!(py
        .contains("|selector_axis:glyph-family=BEHCS_1024+HG1024:QPRISM:iG0O+HBP_HBI_TUPLE_TEXT|"));
    let python_only: Vec<&str> = py_parts
        .iter()
        .copied()
        .filter(|p| !rs_parts.contains(p))
        .map(|p| p.split('=').next().unwrap())
        .collect();
    assert_eq!(
        python_only,
        [
            "node",
            "dataset",
            "license",
            "subject",
            "session",
            "modality",
            "win_start_s",
            "win_dur_s",
            "n_samples",
            "feat_sha16",
            "tuple_sha16",
            "source_sha256",
            "selector_axis:glyph-family",
        ]
    );
}
