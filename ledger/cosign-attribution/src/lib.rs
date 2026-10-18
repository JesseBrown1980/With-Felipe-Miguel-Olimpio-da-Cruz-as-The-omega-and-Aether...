//! cosign-attribution: Claude's addition, written for aether. Not upstream code, and never the
//! default verifier.
//!
//! The default verifier is Federation-1024's cosign-serve verify (federation-1024 @ dc1da1a9
//! `servers/cosign-serve/src/routes.rs:99-152`, in aether at `ledger/cosign-council`, unchanged).
//! `verify_and_attribute` first computes its four counts the way `routes.rs:120-142` does, with the
//! same py_parity `parse_line`, `canonical_bytes` and `sha16`. Then, as a separate report, it takes
//! each row that count adds to `mismatches` (routes.rs:140) and names which compact writer
//! serialization (`writer::Formula`) its stored `row_hash` equals.

#![forbid(unsafe_code)]

pub mod writer;

use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use asolaria_server_cosign_ledger::py_parity::{
    canonical_bytes, parse_line, sha16, PyRow, RawJson, APPENDED_BY_DAEMON,
};
use sha2::{Digest, Sha256};

pub use writer::Formula;

/// The default verifier these counts reproduce.
pub const DEFAULT_VERIFIER: &str =
    "federation-1024@dc1da1a9 servers/cosign-serve/src/routes.rs:99-152";

/// The label the two `ATTRIBUTION` rows carry.
pub const LABEL: &str = "Claude's addition, not upstream, not the default verifier";

/// routes.rs:120-123 and the counts its body reports (routes.rs:143-151).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DefaultCounts {
    pub checked: u64,
    pub matched: u64,
    pub mismatches: u64,
    pub legacy: u64,
}

/// The same pass, split finer (these are not in the default body).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct LineCounts {
    /// routes.rs:114: `File::open` succeeded.
    pub file_opened: bool,
    /// Lines `BufRead::lines` yielded before it ended.
    pub read: u64,
    /// routes.rs:125-127.
    pub blank: u64,
    /// routes.rs:128-131.
    pub legacy_parse: u64,
    /// routes.rs:132-135.
    pub legacy_no_hash: u64,
    /// `lines()` ended on an error (invalid UTF-8 or I/O); routes.rs:124 `map_while(Result::ok)`
    /// stops there too.
    pub read_stopped: bool,
}

/// What the `row_hash` of a row the default counts under `mismatches` was attributed to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Attribution {
    Formula(Formula),
    Unidentified,
    DaemonRowMismatch,
}

impl Attribution {
    pub fn name(self) -> &'static str {
        match self {
            Attribution::Formula(f) => f.name(),
            Attribution::Unidentified => "unidentified",
            Attribution::DaemonRowMismatch => "daemon_row_mismatch",
        }
    }
}

/// Measured facts printed beside an `unidentified` or `daemon_row_mismatch` row. They do not
/// change the attribution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Evidence {
    None,
    Unidentified {
        /// `len()` of the decoded `row_hash` string, in code points.
        row_hash_len: u64,
        row_hash_lower_hex: bool,
        /// Only for a `row_hash` of 64 lowercase hex: the first formula whose full sha256 hex
        /// equals it (`Some(None)`: none does). `None` for any other `row_hash`.
        full_sha256: Option<Option<Formula>>,
    },
    DaemonRow {
        /// The `appended_by_daemon` value is the daemon's constant (py_parity mod.rs:16).
        value_is_daemon_anchor: bool,
        /// The first formula whose sha16 equals `row_hash` (not used for the attribution).
        sha16_formula: Option<Formula>,
    },
}

/// One row the default counts under `mismatches` (routes.rs:140).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttributedRow {
    /// 1-based line number in the file.
    pub line: u64,
    /// `seq` when it is an unsigned integer token (`PyRow::seq_if_integer`).
    pub seq: Option<u64>,
    pub attribution: Attribution,
    pub evidence: Evidence,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Report {
    pub default: DefaultCounts,
    pub lines: LineCounts,
    pub rows: Vec<AttributedRow>,
}

/// routes.rs:114-119: an unreadable file gives all-zero counts.
pub fn verify_and_attribute_path(path: &Path) -> Report {
    let Ok(file) = File::open(path) else {
        return Report::default();
    };
    let mut report = verify_and_attribute(BufReader::new(file));
    report.lines.file_opened = true;
    report
}

/// The loop of routes.rs:124-142, plus the attribution of each row counted under `mismatches`.
pub fn verify_and_attribute<R: BufRead>(reader: R) -> Report {
    let mut report = Report::default();
    for (idx, line) in reader.lines().enumerate() {
        // Equivalent to routes.rs:124 `.map_while(Result::ok)`: the first error ends the pass.
        let Ok(line) = line else {
            report.lines.read_stopped = true;
            break;
        };
        report.lines.read += 1;
        if line.trim().is_empty() {
            report.lines.blank += 1;
            continue;
        }
        let Ok(row) = parse_line(line.as_bytes()) else {
            report.default.legacy += 1;
            report.lines.legacy_parse += 1;
            continue;
        };
        let Some(disk) = row.row_hash() else {
            report.default.legacy += 1;
            report.lines.legacy_no_hash += 1;
            continue;
        };
        report.default.checked += 1;
        if sha16(&canonical_bytes(&row)) == disk {
            report.default.matched += 1;
        } else {
            report.default.mismatches += 1;
            let (attribution, evidence) = attribute(&row, &disk);
            report.rows.push(AttributedRow {
                line: idx as u64 + 1,
                seq: row.seq_if_integer(),
                attribution,
                evidence,
            });
        }
    }
    report
}

/// Attribution of one row the default counts under `mismatches`, as py_parity `parse_line`
/// read it (`row`), whose stored `row_hash` is `disk`.
pub fn attribute(row: &PyRow, disk: &str) -> (Attribution, Evidence) {
    if row.contains("appended_by_daemon") {
        let value_is_daemon_anchor = matches!(
            row.get("appended_by_daemon"),
            Some(RawJson::Scalar(raw)) if writer::decode_py_string(raw)
                == Some(APPENDED_BY_DAEMON.chars().map(u32::from).collect())
        );
        let sha16_formula = if is_lower_hex(disk, 16) {
            first_formula(row, |bytes| sha16(bytes) == disk)
        } else {
            None
        };
        return (
            Attribution::DaemonRowMismatch,
            Evidence::DaemonRow {
                value_is_daemon_anchor,
                sha16_formula,
            },
        );
    }
    if is_lower_hex(disk, 16) {
        if let Some(f) = first_formula(row, |bytes| sha16(bytes) == disk) {
            return (Attribution::Formula(f), Evidence::None);
        }
    }
    let full_sha256 = if is_lower_hex(disk, 64) {
        Some(first_formula(row, |bytes| sha256_hex(bytes) == disk))
    } else {
        None
    };
    (
        Attribution::Unidentified,
        Evidence::Unidentified {
            row_hash_len: disk.chars().count() as u64,
            row_hash_lower_hex: disk.bytes().all(is_lower_hex_byte),
            full_sha256,
        },
    )
}

fn first_formula(row: &PyRow, mut equal: impl FnMut(&str) -> bool) -> Option<Formula> {
    Formula::ORDER.into_iter().find(|&f| {
        writer::serialize(row, f)
            .map(|bytes| equal(&bytes))
            .unwrap_or(false)
    })
}

fn is_lower_hex_byte(b: u8) -> bool {
    b.is_ascii_digit() || (b'a'..=b'f').contains(&b)
}

fn is_lower_hex(s: &str, len: usize) -> bool {
    s.len() == len && s.bytes().all(is_lower_hex_byte)
}

fn sha256_hex(s: &str) -> String {
    let digest = Sha256::digest(s.as_bytes());
    let mut out = String::with_capacity(64);
    for b in digest.iter() {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Attribution totals, one per attribution name.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Totals {
    pub by_formula: [u64; 4],
    pub unidentified: u64,
    pub daemon_row_mismatch: u64,
}

impl Report {
    pub fn totals(&self) -> Totals {
        let mut t = Totals::default();
        for row in &self.rows {
            match row.attribution {
                Attribution::Formula(f) => {
                    let i = Formula::ORDER.iter().position(|&g| g == f).unwrap_or(0);
                    t.by_formula[i] += 1;
                }
                Attribution::Unidentified => t.unidentified += 1,
                Attribution::DaemonRowMismatch => t.daemon_row_mismatch += 1,
            }
        }
        t
    }
}

fn flag(b: bool) -> u8 {
    u8::from(b)
}

fn formula_or(f: Option<Formula>, none: &'static str) -> &'static str {
    f.map(Formula::name).unwrap_or(none)
}

/// The HBP text rows: the default counts first, then the labelled attribution section.
pub fn render(report: &Report) -> String {
    let d = report.default;
    let l = report.lines;
    let mut out = format!(
        "DEFAULT|verifier={DEFAULT_VERIFIER}|checked={}|matched={}|mismatches={}|legacy={}|json=0\n",
        d.checked, d.matched, d.mismatches, d.legacy
    );
    out.push_str(&format!(
        "ATTRIBUTION|label={LABEL}|file_opened={}|lines_read={}|read_stopped={}|blank={}|legacy_parse={}|legacy_no_hash={}|json=0\n",
        flag(l.file_opened),
        l.read,
        flag(l.read_stopped),
        l.blank,
        l.legacy_parse,
        l.legacy_no_hash
    ));
    for row in &report.rows {
        let seq = row
            .seq
            .map(|s| s.to_string())
            .unwrap_or_else(|| String::from("none"));
        out.push_str(&format!(
            "ATTRIB|line={}|seq={seq}|formula={}|json=0\n",
            row.line,
            row.attribution.name()
        ));
        match row.evidence {
            Evidence::None => {}
            Evidence::Unidentified {
                row_hash_len,
                row_hash_lower_hex,
                full_sha256,
            } => out.push_str(&format!(
                "ATTRIB_UNIDENTIFIED|line={}|row_hash_len={row_hash_len}|row_hash_lower_hex={}|full_sha256_formula={}|json=0\n",
                row.line,
                flag(row_hash_lower_hex),
                full_sha256.map(|f| formula_or(f, "none")).unwrap_or("-")
            )),
            Evidence::DaemonRow {
                value_is_daemon_anchor,
                sha16_formula,
            } => out.push_str(&format!(
                "ATTRIB_DAEMON_ROW|line={}|value_is_daemon_anchor={}|sha16_formula={}|json=0\n",
                row.line,
                flag(value_is_daemon_anchor),
                formula_or(sha16_formula, "none")
            )),
        }
    }
    let t = report.totals();
    out.push_str(&format!(
        "ATTRIBUTION|label={LABEL}|mismatches={}|sorted_compact_kept={}|original_compact_kept={}|sorted_compact_escaped={}|original_compact_escaped={}|unidentified={}|daemon_row_mismatch={}|json=0\n",
        report.rows.len(),
        t.by_formula[0],
        t.by_formula[1],
        t.by_formula[2],
        t.by_formula[3],
        t.unidentified,
        t.daemon_row_mismatch
    ));
    out
}
