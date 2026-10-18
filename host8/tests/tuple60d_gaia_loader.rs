//! `tuple60d`, `resolve_instance_pid` and `verb_catalog_from_hbp` against node's own rows from
//! gaia-loader.mjs (blob 703cb8e2): `tests/fixtures/tuple60d-gaia-loader.hbp`, written by
//! `tests/fixtures/tuple60d_gaia_loader.mjs`. Every row is recomputed here and compared as text.

use std::collections::HashMap;
use std::fmt::Write;
use std::path::{Path, PathBuf};

use asolaria_host8::identity::{resolve_instance_pid, tuple60d, verb_catalog_from_hbp};
use sha2::{Digest, Sha256};

const FIXTURE: &str = "tests/fixtures/tuple60d-gaia-loader.hbp";
const FIXTURE_SHA256: &str = "1469f27854f527bbaf59309f844a0c3feb66c17a07dd21a36f0ef311f21cabf0";
const GENERATOR: &str = "tests/fixtures/tuple60d_gaia_loader.mjs";
const GAIA_LOADER: &str =
    "../docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM7-60D-CHAIN-2026-10-18/kernel/gaia-loader.mjs";
const GAIA_SHA256: &str = "8b45c7245b03c9c8d3342f82b233e3e149a4ecb25100761a16d2c8fa2e991043";
const VERBS: &str = "../acer/HyperBEHCS/data/catalogs/verbs.hbp";
const VERBS_SHA256: &str = "eb729cc8d563b6636cec10951b5a5c15e4fcd9245dd9e29d6bb88f03fd0e90af";

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

fn is_kept(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b"-._~:+@/".contains(&b)
}

/// The fixture's value encoding: UTF-8 bytes, `[A-Za-z0-9-._~:+@/]` kept, every other byte `%XX`.
fn pct(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if is_kept(b) {
            out.push(char::from(b));
        } else {
            write!(out, "%{b:02X}").expect("write to String");
        }
    }
    out
}

fn unpct(s: &str) -> String {
    fn nibble(c: u8) -> u8 {
        match c {
            b'0'..=b'9' => c - b'0',
            b'A'..=b'F' => c - b'A' + 10,
            _ => panic!("not an upper-case hex digit: {c}"),
        }
    }
    let src = s.as_bytes();
    let mut bytes = Vec::with_capacity(src.len());
    let mut i = 0;
    while i < src.len() {
        if src[i] == b'%' {
            bytes.push(nibble(src[i + 1]) << 4 | nibble(src[i + 2]));
            i += 3;
        } else {
            assert!(is_kept(src[i]), "unencoded byte {} in {s}", src[i]);
            bytes.push(src[i]);
            i += 1;
        }
    }
    String::from_utf8(bytes).expect("node wrote UTF-8")
}

fn opt_field<'a>(row: &'a str, key: &str) -> Option<&'a str> {
    row.split('|')
        .skip(1)
        .find_map(|f| f.strip_prefix(key).and_then(|v| v.strip_prefix('=')))
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    opt_field(row, key).unwrap_or_else(|| panic!("no {key} in {row}"))
}

fn list(encoded: &str, n: usize) -> Vec<String> {
    let items: Vec<String> = if n == 0 {
        assert!(encoded.is_empty());
        Vec::new()
    } else {
        encoded.split(',').map(unpct).collect()
    };
    assert_eq!(items.len(), n);
    items
}

fn join_pct(items: &[String]) -> String {
    items.iter().map(|v| pct(v)).collect::<Vec<_>>().join(",")
}

/// gaia-loader.mjs:94-96 restated: the leftmost match of `/\|entry=([^|]+)\|/` in a line.
fn js_entry(line: &str) -> Option<&str> {
    let mut from = 0;
    while let Some(at) = line[from..].find("|entry=") {
        let start = from + at + "|entry=".len();
        let end = line[start..].find('|')?;
        if end > 0 {
            return Some(&line[start..start + end]);
        }
        from += at + 1;
    }
    None
}

/// host8-serve main.rs:670-681 (`hbp_escape`) restated: `/seats.hbp` writes each value through it.
fn hbp_escape(value: &str) -> String {
    value
        .chars()
        .map(|ch| match ch {
            '|' | '\r' | '\n' | '\t' => '_',
            ch if ch.is_ascii_graphic() || ch == ' ' => ch,
            _ => '_',
        })
        .take(240)
        .collect()
}

#[derive(Debug, Default)]
pub struct Summary {
    pub header: String,
    pub cat_rows: usize,
    pub skip_rows: usize,
    pub t60_rows: usize,
    pub t60_identical: usize,
    pub throw_rows: usize,
    pub served_rows: usize,
    pub vp_rows: usize,
    pub vp_identical: usize,
    pub vp_gap_rows: usize,
    pub gap_lines: usize,
    pub first_mismatch: Option<(String, String)>,
}

/// Recomputes every row of a fixture-format file; a T60 or CAT row counts as identical only when the
/// row Rust writes equals node's row byte for byte. `files` maps sha256 to the bodies VP rows name.
pub fn check(text: &str, files: &HashMap<String, String>) -> Summary {
    let body = text.strip_suffix('\n').expect("ends with a newline");
    let (rows, footer) = body.rsplit_once('\n').expect("rows then footer");
    assert_eq!(
        footer,
        format!("T60GAIAFTR|rows_sha256={}|json=0", sha256(rows.as_bytes()))
    );
    let mut lines = rows.split('\n');
    let mut s = Summary {
        header: lines.next().expect("header").to_string(),
        ..Summary::default()
    };
    assert!(s.header.starts_with("T60GAIAHDR|"));
    let mut catalogs: HashMap<String, Vec<String>> = HashMap::new();
    let mut book: HashMap<(String, String, String), (String, String, String)> = HashMap::new();
    for row in lines {
        let ours = match row.split('|').next().unwrap_or_default() {
            "CAT" => {
                s.cat_rows += 1;
                let id = field(row, "id");
                let n: usize = field(row, "n").parse().expect("n");
                let gen = row.split('|').find_map(|f| f.strip_prefix("gen="));
                let (verbs, ours) = match gen {
                    Some(gen) => {
                        assert_eq!(gen, format!("{id}.<k>"));
                        let verbs: Vec<String> = (0..n).map(|k| format!("{id}.{k}")).collect();
                        (verbs, format!("CAT|id={id}|n={n}|gen={id}.<k>"))
                    }
                    None => {
                        let verbs = list(field(row, "verbs"), n);
                        let ours = format!("CAT|id={id}|n={n}|verbs={}", join_pct(&verbs));
                        (verbs, ours)
                    }
                };
                catalogs.insert(id.to_string(), verbs);
                ours
            }
            "SKIP" => {
                // A seat left out of this file (its name carries a product name); ids only.
                s.skip_rows += 1;
                let h = field(row, "handle8");
                assert!(
                    h.len() == 16
                        && h.bytes()
                            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
                );
                format!("SKIP|handle8={h}")
            }
            "T60" => {
                s.t60_rows += 1;
                let (src, cat) = (field(row, "src"), field(row, "cat"));
                let name = unpct(field(row, "name"));
                let handle8 = unpct(field(row, "handle8"));
                let cube_bh = unpct(field(row, "cube_bh"));
                let (device_in, ts_in) = (field(row, "device_in"), field(row, "ts_in"));
                let (verb, noun, glyph, sha) = tuple60d(&name, &handle8, &cube_bh, &catalogs[cat]);
                let (device, ts, pid) = if handle8.is_empty() {
                    // gaia-loader.mjs:197: resolveAgent throws on a falsy handle8.
                    s.throw_rows += 1;
                    ("!".to_string(), "!".to_string(), "!throw".to_string())
                } else {
                    // resolveAgent's own device and ts strings (gaia-loader.mjs:198-199) are the inputs;
                    // for a string or missing value they follow `String(device || 'acer')`.
                    let device = unpct(field(row, "device"));
                    let ts = unpct(field(row, "ts"));
                    match device_in {
                        "u" | "z" => assert_eq!(device, "acer", "{row}"),
                        d if d.starts_with("s:") => {
                            let given = unpct(&d[2..]);
                            let want = if given.is_empty() { "acer" } else { &given };
                            assert_eq!(device, want, "{row}");
                        }
                        _ => {}
                    }
                    if let Some(given) = ts_in.strip_prefix("s:") {
                        assert_eq!(ts, unpct(given), "{row}");
                    }
                    let pid =
                        resolve_instance_pid(&handle8, &device, &ts, &verb, &noun, &glyph, &sha);
                    (pct(&device), pct(&ts), pid)
                };
                let key = (handle8.clone(), device.clone(), ts.clone());
                match src {
                    "book" => {
                        book.insert(key, (name.clone(), glyph.clone(), pid.clone()));
                    }
                    "served" => {
                        // The seat as gaia-loader reads it from /seats.hbp: the same handle8 and
                        // cube_bh, its name escaped, so another glyph and another instance pid.
                        s.served_rows += 1;
                        let (book_name, book_glyph, book_pid) = &book[&key];
                        assert_eq!(name, hbp_escape(book_name));
                        assert!(name != *book_name && glyph != *book_glyph && pid != *book_pid);
                    }
                    _ => {}
                }
                format!(
                    "T60|i={}|src={src}|cat={cat}|name={}|handle8={}|cube_bh={}|device_in={device_in}\
                     |ts_in={ts_in}|verb={}|noun={}|glyph={}|sha={}|device={device}|ts={ts}|instance_pid={pid}",
                    field(row, "i"),
                    pct(&name),
                    pct(&handle8),
                    pct(&cube_bh),
                    pct(&verb),
                    pct(&noun),
                    pct(&glyph),
                    pct(&sha),
                )
            }
            "VP" => {
                s.vp_rows += 1;
                let text = match opt_field(row, "body") {
                    Some(body) => unpct(body),
                    None => files[field(row, "body_sha256")].clone(),
                };
                let node = list(field(row, "verbs"), field(row, "n").parse().expect("n"));
                let ours = verb_catalog_from_hbp(&text);
                let js: Vec<String> = text
                    .split('\n')
                    .filter_map(js_entry)
                    .map(String::from)
                    .collect();
                assert_eq!(js, node, "restated regex against node: {row}");
                // The one known difference (identity.rs:95-98, main.rs:605-610): a line whose first
                // `|entry=` is followed by `|` gives no verb in Rust; the regex moves on to a later match.
                let mut gap = 0;
                let mut per_line = Vec::new();
                for line in text.split('\n') {
                    let rust_line = verb_catalog_from_hbp(line);
                    let js_line: Vec<String> =
                        js_entry(line).map(String::from).into_iter().collect();
                    if rust_line != js_line {
                        let at = line.find("|entry=").expect("an entry");
                        assert!(rust_line.is_empty() && js_line.len() == 1, "{row}");
                        assert_eq!(
                            line.as_bytes().get(at + "|entry=".len()),
                            Some(&b'|'),
                            "{row}"
                        );
                        gap += 1;
                    }
                    per_line.extend(rust_line);
                }
                assert_eq!(per_line, ours);
                assert_eq!(
                    gap.to_string(),
                    field(row, "empty_first_entry_lines"),
                    "{row}"
                );
                s.gap_lines += gap;
                if ours == node {
                    s.vp_identical += 1;
                } else {
                    assert!(gap > 0, "{row}");
                    s.vp_gap_rows += 1;
                }
                continue;
            }
            other => panic!("unknown row tag {other}"),
        };
        if ours == row {
            if row.starts_with("T60|") {
                s.t60_identical += 1;
            }
        } else if s.first_mismatch.is_none() {
            s.first_mismatch = Some((ours, row.to_string()));
        }
    }
    s
}

fn fixture() -> String {
    let bytes = read(FIXTURE);
    assert_eq!(sha256(&bytes), FIXTURE_SHA256);
    String::from_utf8(bytes).expect("fixture is UTF-8")
}

fn verbs_hbp() -> String {
    let bytes = read(VERBS);
    assert_eq!(sha256(&bytes), VERBS_SHA256);
    String::from_utf8(bytes).expect("verbs.hbp is UTF-8")
}

fn files() -> HashMap<String, String> {
    HashMap::from([(VERBS_SHA256.to_string(), verbs_hbp())])
}

#[test]
fn every_node_row_recomputes_in_rust() {
    let s = check(&fixture(), &files());
    println!(
        "T60PARITY|cat_rows={}|skip_rows={}|t60_rows={}|t60_identical={}|throw_rows={}|served_rows={}|vp_rows={}|vp_identical={}|vp_gap_rows={}|gap_lines={}|json=0",
        s.cat_rows,
        s.skip_rows,
        s.t60_rows,
        s.t60_identical,
        s.throw_rows,
        s.served_rows,
        s.vp_rows,
        s.vp_identical,
        s.vp_gap_rows,
        s.gap_lines
    );
    if let Some((ours, theirs)) = &s.first_mismatch {
        panic!("first differing row:\n  rust: {ours}\n  node: {theirs}");
    }
    assert_eq!(s.t60_identical, s.t60_rows);
    assert_eq!(
        (
            s.cat_rows,
            s.skip_rows,
            s.t60_rows,
            s.throw_rows,
            s.served_rows,
            s.vp_rows,
            s.vp_identical,
            s.vp_gap_rows,
            s.gap_lines
        ),
        (22, 59, 2745, 71, 31, 780, 758, 22, 22)
    );
}

#[test]
fn header_names_the_delivered_gaia_loader_node_and_generator() {
    let s = check(&fixture(), &files());
    let h = &s.header;
    assert_eq!(sha256(&read(GAIA_LOADER)), GAIA_SHA256);
    assert_eq!(sha256(&read(VERBS)), VERBS_SHA256);
    for want in [
        format!("|source_sha256={GAIA_SHA256}|"),
        "|source_bytes=16547|".to_string(),
        "|source_git_blob=703cb8e24773821d75a2ce32a24ccc42b21339b8|".to_string(),
        "|node=v22.22.0|".to_string(),
        format!("|generator_sha256={}|", sha256(&read(GENERATOR))),
        format!("|verbs_sha256={VERBS_SHA256}|"),
    ] {
        assert!(h.contains(&want), "{want} not in {h}");
    }
}

#[test]
fn vendored_verbs_hbp_gives_nodes_73_entry_catalog() {
    let text = fixture();
    let cat = text
        .lines()
        .find(|r| r.starts_with("CAT|id=v73|"))
        .expect("v73");
    let node = list(field(cat, "verbs"), 73);
    assert_eq!(verb_catalog_from_hbp(&verbs_hbp()), node);
    assert_eq!(node[15], "format");
    let vp = text
        .lines()
        .find(|r| r.starts_with("VP|") && field(r, "src") == "verbs.hbp")
        .expect("verbs.hbp row");
    assert_eq!(field(vp, "body_sha256"), VERBS_SHA256);
    assert_eq!(list(field(vp, "verbs"), 73), node);
}

#[test]
fn upstream_formula_chief_vector_is_a_node_row() {
    // host8-serve main.rs:1665-1676: glyph c844dff6b59b40cf, instance pid d125579d9644c37a.
    let text = fixture();
    let rows: Vec<&str> = text
        .lines()
        .filter(|r| r.starts_with("T60|") && field(r, "src") == "vector")
        .collect();
    assert_eq!(rows.len(), 3);
    for row in &rows[..2] {
        assert_eq!(field(row, "verb"), "format");
        assert_eq!(field(row, "glyph"), "c844dff6b59b40cf");
        assert_eq!(field(row, "instance_pid"), "d125579d9644c37a");
    }
    assert_eq!(field(rows[2], "verb"), "report");
}
