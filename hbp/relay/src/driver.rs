//! Port of relay-driver.mjs:1-96 — PHASE 1 (E=0): local lane append (EMIT), forward VERIFY, and the
//! reverse-walk self-test. No transport, no token mint, nothing fires. The RELAY row grammar is the
//! `hbp` crate (`hbp::relay`); the writer/indexer/carve-out are this crate's sibling modules.

use std::collections::BTreeMap;

use hbp::relay::{build_row, class_of, parse_row, sha16, sha256hex, Fields, RelayError, GENESIS};

use crate::carveout::{assert_read_allowed, scan};
use crate::indexer::{append_index, load_index, read_blob};
use crate::writer::{append_blob, append_row, read_file, read_text_if_exists};

/// Largest JS safe integer (`Number.MAX_SAFE_INTEGER`), the ceiling the seq gate enforces.
const MAX_SAFE_INTEGER: i128 = 9_007_199_254_740_991;

/// relay-driver.mjs:12-14 `lanePaths` — the three lane files for a seat.
pub struct LanePaths {
    pub hbp: String,
    pub hbi: String,
    pub payloads: String,
}

pub fn lane_paths(dir: &str, seat: &str) -> LanePaths {
    LanePaths {
        hbp: format!("{dir}/relay-{seat}.hbp"),
        hbi: format!("{dir}/relay-{seat}.hbi"),
        payloads: format!("{dir}/relay-{seat}.payloads"),
    }
}

/// relay-driver.mjs:20 the canonical-integer gate: `^[0-9]+$` and a JS safe integer.
fn canonical_seq(s: &str) -> Option<i128> {
    if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let mut n: i128 = 0;
    for b in s.bytes() {
        n = n.checked_mul(10)?.checked_add((b - b'0') as i128)?;
        if n > MAX_SAFE_INTEGER {
            return None;
        }
    }
    Some(n)
}

/// relay-driver.mjs:16-23 `laneHead` — the head row_hash and seq, or GENESIS/0 for an empty lane.
/// `row_hash` is `None` when the last sidecar line carries no `row_hash` key (JS `undefined`).
pub struct LaneHead {
    pub row_hash: Option<String>,
    pub seq: i128,
}

pub fn lane_head(hbi_path: &str) -> Result<LaneHead, RelayError> {
    let idx = load_index(hbi_path)?;
    let Some(last) = idx.last() else {
        return Ok(LaneHead {
            row_hash: Some(GENESIS.to_string()),
            seq: 0,
        });
    };
    // An absent key reads as JS `undefined`: it fails the gate and prints as "undefined" (:20-21).
    let seq_str = last.get("seq").map(String::as_str).unwrap_or("undefined");
    let Some(seq) = canonical_seq(seq_str) else {
        return Err(RelayError(format!(
            "LANE_HEAD_CORRUPT: non-canonical seq at lane head: {seq_str}"
        )));
    };
    Ok(LaneHead {
        row_hash: last.get("row_hash").cloned(),
        seq,
    })
}

/// Arguments to `emit`, matching the JS option object (relay-driver.mjs:26). `payload_file`, when
/// set, is the source and runs through the structural guard first; otherwise `payload` is, and an
/// absent `payload` is `String(undefined)` = the 9 bytes `undefined` (relay-driver.mjs:32).
pub struct EmitArgs<'a> {
    pub from: &'a str,
    pub to: &'a str,
    pub verb: &'a str,
    pub n: u64,
    pub payload: Option<&'a [u8]>,
    pub payload_file: Option<&'a str>,
    pub ts: &'a str,
    pub token: &'a str,
    pub allow_root: Option<&'a str>,
}

impl<'a> EmitArgs<'a> {
    /// A payload-bytes emit with the PHASE-1 defaults (`token` = `-`, no file, no allow-root).
    pub fn note(
        from: &'a str,
        to: &'a str,
        verb: &'a str,
        n: u64,
        payload: &'a [u8],
        ts: &'a str,
    ) -> Self {
        EmitArgs {
            from,
            to,
            verb,
            n,
            payload: Some(payload),
            payload_file: None,
            ts,
            token: "-",
            allow_root: None,
        }
    }
}

/// relay-driver.mjs:26-54 `emit` — PHASE 1: append to this seat's own lane. `sig` stays `-`.
pub fn emit(paths: &LanePaths, args: &EmitArgs) -> Result<String, RelayError> {
    let buf: Vec<u8> = if let Some(pf) = args.payload_file {
        assert_read_allowed(pf, args.allow_root)?;
        read_file(pf)?
    } else {
        args.payload.unwrap_or(b"undefined").to_vec()
    };

    let sc = scan(&buf);
    if sc.hit {
        return Err(RelayError(format!(
            "CARVEOUT_CONTENT_REJECT: payload matched {}",
            sc.reasons.join(",")
        )));
    }

    let head = lane_head(&paths.hbi)?;
    let seq = head.seq + 1;
    let (off, len) = append_blob(&paths.payloads, &buf)?;

    let mut f: Fields = BTreeMap::new();
    f.insert("v".into(), "1".into());
    f.insert("from".into(), args.from.into());
    f.insert("to".into(), args.to.into());
    f.insert("verb".into(), args.verb.into());
    f.insert("seq".into(), seq.to_string());
    f.insert("ts".into(), args.ts.into());
    f.insert("pid".into(), format!("BH.RELAY.{}.{}", args.from, args.n));
    f.insert("payload_sha256".into(), sha256hex(&buf));
    f.insert("hbi_off".into(), off.to_string());
    f.insert("len".into(), len.to_string());
    f.insert("token".into(), args.token.into());
    // An `undefined` head row_hash leaves `antecedent` unset, so build_row returns
    // MISSING_FIELD: antecedent as relay-envelope.mjs:46 throws it.
    if let Some(rh) = head.row_hash {
        f.insert("antecedent".into(), rh);
    }
    f.insert("sig".into(), "-".into());

    let row = build_row(&f)?;
    let row_off = append_row(&paths.hbp, &row)?;
    let p = parse_row(&row)?;

    let mut rec: BTreeMap<String, String> = BTreeMap::new();
    rec.insert("row_hash".into(), p.row_hash.clone());
    rec.insert("row_off".into(), row_off.to_string());
    rec.insert("row_len".into(), (row.len() + 1).to_string());
    rec.insert("pid".into(), format!("BH.RELAY.{}.{}", args.from, args.n));
    rec.insert("verb".into(), args.verb.into());
    rec.insert("cls".into(), class_of(args.verb).to_string());
    rec.insert("from".into(), args.from.into());
    rec.insert("to".into(), args.to.into());
    rec.insert("ts".into(), args.ts.into());
    rec.insert("seq".into(), seq.to_string());
    rec.insert("payload_off".into(), off.to_string());
    rec.insert("payload_len".into(), len.to_string());
    append_index(&paths.hbi, &rec)?;

    Ok(row)
}

/// One forward-verify finding: the row index and the reason, mirroring the JS `{row, why}`.
#[derive(Clone, Debug)]
pub struct VerifyFailure {
    pub row: usize,
    pub why: String,
}

pub struct VerifyResult {
    pub pass: bool,
    pub checked: usize,
    pub failures: Vec<VerifyFailure>,
}

/// relay-driver.mjs:59/81 — the ledger's non-empty lines (absent = none; U+FFFD-substituted
/// UTF-8 decode); a ledger that exists but cannot be read returns the read error.
fn read_lines_nonempty(path: &str) -> Result<Vec<String>, RelayError> {
    Ok(read_text_if_exists(path)?
        .split('\n')
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect())
}

/// relay-driver.mjs:57-77 `verifyLane` — forward integrity: payload_sha256, row_hash, antecedent
/// linkage, and a strictly-monotonic canonical-integer seq (the replay/reorder gate). A ledger
/// read failure is returned as `Err`, where the JS throws.
pub fn verify_lane(paths: &LanePaths) -> Result<VerifyResult, RelayError> {
    let mut failures: Vec<VerifyFailure> = Vec::new();
    let lines = read_lines_nonempty(&paths.hbp)?;
    let mut prev = GENESIS.to_string();
    let mut prev_seq: i128 = 0;
    let mut checked = 0usize;

    for ln in &lines {
        let f = match parse_row(ln) {
            Ok(f) => f,
            Err(e) => {
                failures.push(VerifyFailure {
                    row: checked,
                    why: format!("PARSE: {e}"),
                });
                checked += 1;
                continue;
            }
        };
        if sha16(&f.prefix) != f.row_hash {
            failures.push(VerifyFailure {
                row: checked,
                why: "ROW_HASH mismatch".to_string(),
            });
        }
        let hbi_off = f.fields.get("hbi_off").map(String::as_str).unwrap_or("");
        let len = f.fields.get("len").map(String::as_str).unwrap_or("");
        match read_blob(&paths.payloads, hbi_off, len) {
            Ok(blob) => {
                let want = f
                    .fields
                    .get("payload_sha256")
                    .map(String::as_str)
                    .unwrap_or("");
                if sha256hex(&blob) != want {
                    failures.push(VerifyFailure {
                        row: checked,
                        why: "PAYLOAD_SHA256 mismatch".to_string(),
                    });
                }
            }
            Err(e) => failures.push(VerifyFailure {
                row: checked,
                why: format!("PAYLOAD: {e}"),
            }),
        }
        let ant = f.fields.get("antecedent").map(String::as_str).unwrap_or("");
        if ant != prev {
            failures.push(VerifyFailure {
                row: checked,
                why: format!("ANTECEDENT break: got {ant} want {prev}"),
            });
        }
        let seq_str = f.fields.get("seq").map(String::as_str).unwrap_or("");
        match canonical_seq(seq_str) {
            None => failures.push(VerifyFailure {
                row: checked,
                why: format!("SEQ not a canonical non-negative integer: {seq_str}"),
            }),
            Some(sq) if sq <= prev_seq => failures.push(VerifyFailure {
                row: checked,
                why: format!("SEQ not strictly increasing: {seq_str} <= {prev_seq}"),
            }),
            Some(sq) => prev_seq = sq,
        }
        prev = f.row_hash.clone();
        checked += 1;
    }

    Ok(VerifyResult {
        pass: failures.is_empty(),
        checked,
        failures,
    })
}

/// One reverse-walk finding: the row index and the reason, mirroring the JS `{i, why}`.
#[derive(Clone, Debug)]
pub struct WalkIssue {
    pub i: usize,
    pub why: String,
}

pub struct WalkResult {
    pub pass: bool,
    pub walked: usize,
    pub issues: Vec<WalkIssue>,
}

/// relay-driver.mjs:80-96 `reverseWalk` — walk backward, recompute row_hash, assert antecedent
/// linkage. A malformed line is recorded, never a panic; a ledger read failure is returned as `Err`.
pub fn reverse_walk(paths: &LanePaths) -> Result<WalkResult, RelayError> {
    let lines = read_lines_nonempty(&paths.hbp)?;
    let mut parsed: Vec<Option<hbp::relay::ParsedRow>> = Vec::with_capacity(lines.len());
    let mut issues: Vec<WalkIssue> = Vec::new();

    for (j, ln) in lines.iter().enumerate() {
        match parse_row(ln) {
            Ok(p) => parsed.push(Some(p)),
            Err(e) => {
                issues.push(WalkIssue {
                    i: j,
                    why: format!("PARSE: {e}"),
                });
                parsed.push(None);
            }
        }
    }

    for i in (0..parsed.len()).rev() {
        let Some(f) = &parsed[i] else { continue };
        if sha16(&f.prefix) != f.row_hash {
            issues.push(WalkIssue {
                i,
                why: "row_hash".to_string(),
            });
        }
        let want = if i == 0 {
            GENESIS.to_string()
        } else {
            match &parsed[i - 1] {
                Some(prev) => prev.row_hash.clone(),
                None => "<unparseable-prev>".to_string(),
            }
        };
        let ant = f.fields.get("antecedent").map(String::as_str).unwrap_or("");
        if ant != want {
            issues.push(WalkIssue {
                i,
                why: "antecedent".to_string(),
            });
        }
    }

    Ok(WalkResult {
        pass: issues.is_empty(),
        walked: parsed.iter().filter(|p| p.is_some()).count(),
        issues,
    })
}
