//! Synthetic chains built here (no ledger data). Each stored `row_hash` is py_parity `sha16`
//! (or the full sha256) of hand-written expected bytes, never of this crate's own serializer.
//! The default counts are compared with the default verifier itself: cosign-serve's
//! `GET /api/cosign/verify` (routes.rs:99-152) on the same file.

use std::fs;
use std::path::{Path, PathBuf};

use asolaria_cosign_attribution::{
    render, verify_and_attribute_path, Attribution, DefaultCounts, Evidence, Formula, Report,
};
use asolaria_server_cosign_ledger::py_parity::{parse_line, sha16, RawJson};
use asolaria_server_cosign_serve::CosignServe;
use sha2::{Digest, Sha256};

const ANCHOR: &str = "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23";

/// A directory under the system temp dir, removed when the test ends (on drop).
struct Scratch(PathBuf);

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

impl std::ops::Deref for Scratch {
    type Target = Path;
    fn deref(&self) -> &Path {
        &self.0
    }
}

fn scratch(name: &str) -> Scratch {
    let dir = std::env::temp_dir().join(format!(
        "asolaria-cosign-attribution-{}-{name}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    Scratch(dir)
}

fn full_sha256(s: &str) -> String {
    let mut out = String::with_capacity(64);
    for b in Sha256::digest(s.as_bytes()).iter() {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// `stored` is the row without its closing brace; the row_hash field is appended.
fn row(stored: &str, row_hash: &str) -> String {
    format!("{stored}, \"row_hash\": \"{row_hash}\"}}")
}

/// The default verifier's own counts for `path` (cosign-serve, append disabled).
fn served_counts(path: &Path, dir: &Path) -> DefaultCounts {
    let serve = CosignServe::open(path.to_path_buf(), dir.join("shadow.ndjson"), false).unwrap();
    let (code, body) = serve.handle("GET", "/api/cosign/verify", "", b"");
    assert_eq!(code, 200);
    let parsed = parse_line(body.as_bytes()).unwrap();
    let num = |key: &str| match parsed.get(key) {
        Some(RawJson::Scalar(s)) => s.parse::<u64>().unwrap(),
        other => panic!("{key}: {other:?}"),
    };
    DefaultCounts {
        checked: num("checked"),
        matched: num("matched"),
        mismatches: num("mismatches"),
        legacy: num("legacy"),
    }
}

struct Case {
    line: String,
    expect: Option<Attribution>,
}

fn case(line: String, expect: Option<Attribution>) -> Case {
    Case { line, expect }
}

use Attribution::{DaemonRowMismatch, Unidentified};
const SK: Option<Attribution> = Some(Attribution::Formula(Formula::SortedCompactKept));
const OK: Option<Attribution> = Some(Attribution::Formula(Formula::OriginalCompactKept));
const SE: Option<Attribution> = Some(Attribution::Formula(Formula::SortedCompactEscaped));
const OE: Option<Attribution> = Some(Attribution::Formula(Formula::OriginalCompactEscaped));

fn cases() -> Vec<Case> {
    let h = sha16;
    vec![
        // 1 each formula, with number tokens kept as stored (1.50, 1E+2, -0)
        case(
            row(
                r#"{"seq": 1, "zeta": "é", "alpha": 1.50"#,
                &h(r#"{"alpha":1.50,"seq":1,"zeta":"é"}"#),
            ),
            SK,
        ),
        case(
            row(
                r#"{"seq": 2, "zeta": "é", "alpha": 2"#,
                &h(r#"{"seq":2,"zeta":"é","alpha":2}"#),
            ),
            OK,
        ),
        case(
            row(
                r#"{"zeta": "\u00e9", "alpha": 1E+2, "seq": 3"#,
                &h(r#"{"alpha":1E+2,"seq":3,"zeta":"\u00e9"}"#),
            ),
            SE,
        ),
        case(
            row(
                r#"{"zeta": "é😀", "alpha": -0"#,
                &h(r#"{"zeta":"\u00e9\ud83d\ude00","alpha":-0}"#),
            ),
            OE,
        ),
        // 5 blank
        case(String::new(), None),
        // 6 non-ASCII key, surrogate pair stored escaped, nested array/object sorted inside
        case(
            row(
                r#"{"k\u00e9y": "\ud83d\ude00", "a": [1, {"d": 2.0e-3, "c": "x"}]"#,
                &h(r#"{"a":[1,{"c":"x","d":2.0e-3}],"kéy":"😀"}"#),
            ),
            SK,
        ),
        // 7 nested order kept, large integer token
        case(
            row(
                r#"{"n": {"b": [], "a": {}}, "m": 12345678901234567890123"#,
                &h(r#"{"n":{"b":[],"a":{}},"m":12345678901234567890123}"#),
            ),
            OK,
        ),
        // 8 a row with appended_by_daemon (the daemon's constant)
        case(
            row(
                &format!(r#"{{"event": "X", "appended_by_daemon": "{ANCHOR}""#),
                &h(&format!(
                    r#"{{"appended_by_daemon":"{ANCHOR}","event":"X"}}"#
                )),
            ),
            Some(DaemonRowMismatch),
        ),
        // 9 row_hash not hex
        case(
            row(r#"{"a": 1"#, "not-a-hash-0000000000000"),
            Some(Unidentified),
        ),
        // 10 row_hash of 64 hex = full sha256 of the original-order compact form
        case(
            row(r#"{"b": 1, "a": 2"#, &full_sha256(r#"{"b":1,"a":2}"#)),
            Some(Unidentified),
        ),
        // 11 16 hex that no formula gives; 12 uppercase hex
        case(row(r#"{"a": 1"#, "0123456789abcdef"), Some(Unidentified)),
        case(row(r#"{"a": 1"#, "0123456789ABCDEF"), Some(Unidentified)),
        // 13 the default's own canonical form (canon.rs:19-28): matched, not attributed
        case(
            row(r#"{"b": 1, "a": "x""#, &h(r#"{"a": "x", "b": 1}"#)),
            None,
        ),
        // 14-17 legacy: parse, parse (array), no hash, non-string row_hash
        case(String::from(r#"{"a": 1,"#), None),
        case(String::from("[1, 2]"), None),
        case(String::from(r#"{"a": 1}"#), None),
        case(String::from(r#"{"row_hash": 5}"#), None),
        // 18-19 blank under str::trim (tab, U+00A0)
        case(String::from("   \t"), None),
        case(String::from("\u{a0}"), None),
        // 20 U+007F escaped as \u007f; 21 U+007F kept
        case(row(r#"{"d": "a\u007fb""#, &h(r#"{"d":"a\u007fb"}"#)), SE),
        case(row("{\"d\": \"a\u{7f}b\"", &h("{\"d\":\"a\u{7f}b\"}")), SK),
        // 22 \/ decodes to '/', control character written \u0001
        case(
            row(r#"{"p": "a\/b\u0001c\n""#, &h(r#"{"p":"a/b\u0001c\n"}"#)),
            SK,
        ),
        // 23 unpaired surrogate: only the escaped form exists
        case(row(r#"{"s": "\ud800x""#, &h(r#"{"s":"\ud800x"}"#)), SE),
        // 24 leading-zero number: written as stored. 25 escape \q: py_parity keeps it in the raw
        // token, CPython's scanner does not decode it, so the row has no form
        case(row(r#"{"n": 01"#, &h(r#"{"n":01}"#)), SK),
        case(
            row(r#"{"v": "\q""#, &h(r#"{"v":"\q"}"#)),
            Some(Unidentified),
        ),
        // 26 duplicate key: first position, last value (json_tok.rs parse_object, Python dict)
        case(
            row(r#"{"b": 1, "a": 2, "b": 3"#, &h(r#"{"b":3,"a":2}"#)),
            OK,
        ),
        // 27 all four forms equal: the first in ORDER is reported
        case(row(r#"{"a": 1, "b": "x""#, &h(r#"{"a":1,"b":"x"}"#)), SK),
        // 28 escaped non-ASCII key, original order; seq is a string token
        case(
            row(
                r#"{"ключ": 1, "seq": "28""#,
                &h(r#"{"\u043a\u043b\u044e\u0447":1,"seq":"28"}"#),
            ),
            OE,
        ),
        // 29 code point order: U+E000 before U+1F600
        case(
            row(
                "{\"😀\": 2, \"\u{e000}\": 1",
                &h("{\"\u{e000}\":1,\"😀\":2}"),
            ),
            SK,
        ),
        // 30 CRLF line ending, literal tokens
        case(
            format!(
                "{}\r",
                row(
                    r#"{"seq": 30, "c": true, "b": null, "a": false"#,
                    &h(r#"{"a":false,"b":null,"c":true,"seq":30}"#),
                )
            ),
            SK,
        ),
        // 31 appended_by_daemon with another value
        case(
            row(
                r#"{"appended_by_daemon": "OTHER", "x": 1"#,
                "0123456789abcdef",
            ),
            Some(DaemonRowMismatch),
        ),
        // 32 the value a duplicate key replaced is 01: the PyRow holds "a": 2 only
        case(row(r#"{"a": 01, "a": 2"#, &h(r#"{"a":2}"#)), SK),
        // 33 last line, no trailing newline
        case(row(r#"{"z": 0"#, &h(r#"{"z":0}"#)), SK),
    ]
}

fn write_chain(dir: &Path, cases: &[Case]) -> PathBuf {
    let text = cases
        .iter()
        .map(|c| c.line.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    let path = dir.join("chain.ndjson");
    fs::write(&path, text).unwrap();
    path
}

#[test]
fn every_case_is_attributed_as_constructed() {
    let dir = scratch("cases");
    let cases = cases();
    let path = write_chain(&dir, &cases);
    let report = verify_and_attribute_path(&path);

    let expected: Vec<(u64, Attribution)> = cases
        .iter()
        .enumerate()
        .filter_map(|(i, c)| c.expect.map(|a| (i as u64 + 1, a)))
        .collect();
    let got: Vec<(u64, Attribution)> = report
        .rows
        .iter()
        .map(|r| (r.line, r.attribution))
        .collect();
    assert_eq!(got, expected);

    assert_eq!(
        report.default,
        DefaultCounts {
            checked: 26,
            matched: 1,
            mismatches: 25,
            legacy: 4
        }
    );
    assert_eq!(report.default, served_counts(&path, &dir));
    let l = report.lines;
    assert!(l.file_opened && !l.read_stopped);
    assert_eq!(
        (l.read, l.blank, l.legacy_parse, l.legacy_no_hash),
        (33, 3, 2, 2)
    );

    let t = report.totals();
    assert_eq!(t.by_formula, [10, 3, 3, 2]);
    assert_eq!((t.unidentified, t.daemon_row_mismatch), (5, 2));

    let seqs: Vec<Option<u64>> = report.rows.iter().map(|r| r.seq).collect();
    assert_eq!(&seqs[..4], &[Some(1), Some(2), Some(3), None]);
    let row28 = report.rows.iter().find(|r| r.line == 28).unwrap();
    assert_eq!(row28.seq, None);
}

#[test]
fn evidence_rows() {
    let dir = scratch("evidence");
    let path = write_chain(&dir, &cases());
    let report = verify_and_attribute_path(&path);
    assert_eq!(report.default, served_counts(&path, &dir));
    let ev = |line: u64| {
        report
            .rows
            .iter()
            .find(|r| r.line == line)
            .unwrap()
            .evidence
    };
    assert_eq!(
        ev(8),
        Evidence::DaemonRow {
            value_is_daemon_anchor: true,
            sha16_formula: Some(Formula::SortedCompactKept)
        }
    );
    assert_eq!(
        ev(31),
        Evidence::DaemonRow {
            value_is_daemon_anchor: false,
            sha16_formula: None
        }
    );
    let unid = |len, hex, full| Evidence::Unidentified {
        row_hash_len: len,
        row_hash_lower_hex: hex,
        full_sha256: full,
    };
    assert_eq!(ev(9), unid(24, false, None));
    assert_eq!(
        ev(10),
        unid(64, true, Some(Some(Formula::OriginalCompactKept)))
    );
    assert_eq!(ev(11), unid(16, true, None));
    assert_eq!(ev(12), unid(16, false, None));
    assert_eq!(ev(25), unid(16, true, None));
    for line in [1, 24, 32] {
        assert_eq!(ev(line), Evidence::None);
    }
}

#[test]
fn invalid_utf8_ends_the_pass_like_the_default() {
    let dir = scratch("utf8");
    let mut bytes = row(r#"{"a": 1, "b": "x""#, &sha16(r#"{"a":1,"b":"x"}"#)).into_bytes();
    bytes.extend_from_slice(b"\n{\"a\": \"\xff\"}\n");
    bytes.extend_from_slice(row(r#"{"z": 0"#, &sha16(r#"{"z":0}"#)).as_bytes());
    let path = dir.join("chain.ndjson");
    fs::write(&path, bytes).unwrap();
    let report = verify_and_attribute_path(&path);
    assert_eq!(report.default, served_counts(&path, &dir));
    assert_eq!(report.lines.read, 1);
    assert!(report.lines.read_stopped);
    assert_eq!(report.rows.len(), 1);
}

#[test]
fn empty_and_missing_files() {
    let dir = scratch("empty");
    let empty = dir.join("empty.ndjson");
    fs::write(&empty, b"").unwrap();
    let report = verify_and_attribute_path(&empty);
    assert_eq!(report.default, DefaultCounts::default());
    assert!(report.lines.file_opened);
    assert_eq!(report.default, served_counts(&empty, &dir));

    let missing = dir.join("missing.ndjson");
    let report = verify_and_attribute_path(&missing);
    assert_eq!(report, Report::default());
    assert_eq!(report.default, served_counts(&missing, &dir));
}

#[test]
fn rendered_rows() {
    let dir = scratch("render");
    let all = cases();
    let picked: Vec<Case> = [0usize, 7, 9, 12]
        .iter()
        .map(|&i| case(all[i].line.clone(), all[i].expect))
        .collect();
    let path = write_chain(&dir, &picked);
    let report = verify_and_attribute_path(&path);
    assert_eq!(report.default, served_counts(&path, &dir));
    let label = "Claude's addition, not upstream, not the default verifier";
    let expected = format!(
        "DEFAULT|verifier=federation-1024@dc1da1a9 servers/cosign-serve/src/routes.rs:99-152|checked=4|matched=1|mismatches=3|legacy=0|json=0\n\
         ATTRIBUTION|label={label}|file_opened=1|lines_read=4|read_stopped=0|blank=0|legacy_parse=0|legacy_no_hash=0|json=0\n\
         ATTRIB|line=1|seq=1|formula=sorted_compact_kept|json=0\n\
         ATTRIB|line=2|seq=none|formula=daemon_row_mismatch|json=0\n\
         ATTRIB_DAEMON_ROW|line=2|value_is_daemon_anchor=1|sha16_formula=sorted_compact_kept|json=0\n\
         ATTRIB|line=3|seq=none|formula=unidentified|json=0\n\
         ATTRIB_UNIDENTIFIED|line=3|row_hash_len=64|row_hash_lower_hex=1|full_sha256_formula=original_compact_kept|json=0\n\
         ATTRIBUTION|label={label}|mismatches=3|sorted_compact_kept=1|original_compact_kept=0|sorted_compact_escaped=0|original_compact_escaped=0|unidentified=1|daemon_row_mismatch=1|json=0\n"
    );
    assert_eq!(render(&report), expected);
    assert!(!render(&report).contains(['{', '}']));
}
