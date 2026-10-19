//! No JSON, no JavaScript, no Node: not in the game, its saves, its tests or its build.
//!
//! Every row ends in the literal tail `json=0`; that is the only place the word appears in the
//! output. Nothing the game prints starts with `{` or `[`, and nothing it writes ends in `.json`.

mod common;

use common::*;
use std::fs;

/// File extensions that would mean a JSON or JavaScript lane crept in.
const BANNED_EXT: [&str; 7] = ["json", "js", "mjs", "cjs", "ts", "jsonl", "ndjson"];

#[test]
fn no_json_or_javascript_file_exists_in_the_game_folder() {
    let root = root();
    let mut hits = Vec::new();
    for p in walk(&root) {
        // the build directory is cargo's: it keeps fingerprint files of its own, not the game's
        let rel = p
            .strip_prefix(&root)
            .unwrap()
            .to_string_lossy()
            .replace('\\', "/");
        if rel.starts_with("target/") || rel.starts_with("saves/") || rel.starts_with("data/") {
            continue;
        }
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
        if BANNED_EXT.contains(&ext) || rel == "package.json" || rel.contains("node_modules") {
            hits.push(rel);
        }
    }
    assert!(hits.is_empty(), "json=1: {hits:?}");
}

#[test]
fn the_manifest_and_the_build_need_no_node() {
    let root = root();
    let manifest = fs::read_to_string(root.join("Cargo.toml")).unwrap();
    for banned in ["build =", "node", "npm", "wasm-bindgen", "serde"] {
        assert!(!manifest.contains(banned), "Cargo.toml mentions {banned}");
    }
    assert!(
        !root.join("build.rs").exists(),
        "no build script: the build is cargo and nothing else"
    );
    let lock = fs::read_to_string(root.join("Cargo.lock")).unwrap_or_default();
    assert!(
        lock.matches("[[package]]").count() <= 2,
        "the lock file holds more than this crate and asolaria-tribit"
    );
}

#[test]
fn no_output_line_starts_with_a_brace_or_bracket_and_every_file_row_ends_in_json_zero() {
    let saves = tmpdir("nojson");
    let (code, out) = run_script_file(cfg(&saves), &playthrough());
    assert_eq!(code, 0);
    for l in out.lines() {
        assert!(
            !l.starts_with('{') && !l.starts_with('['),
            "a json-shaped line: {l}"
        );
    }
    // every row of the output is a row: TAG|...|json=0, or prose; a row never carries another json value
    for l in out.lines().filter(|l| l.contains("|json=")) {
        assert!(l.ends_with("|json=0"), "{l}");
        assert_eq!(l.matches("json=").count(), 1, "{l}");
    }
    // nothing written is JSON, and every written .hbp / .hbi row ends in json=0
    let mut written = 0;
    for p in walk(&saves) {
        let name = p.to_string_lossy().to_string();
        assert!(!name.ends_with(".json"), "{name}");
        if name.ends_with(".hbp") || name.ends_with(".hbi") {
            let text = fs::read_to_string(&p).unwrap();
            for l in text.lines() {
                assert!(l.ends_with("|json=0"), "{name}: {l}");
                assert!(!l.starts_with('{') && !l.starts_with('['));
            }
            written += 1;
        }
    }
    assert!(written > 100, "only {written} files written");
}
