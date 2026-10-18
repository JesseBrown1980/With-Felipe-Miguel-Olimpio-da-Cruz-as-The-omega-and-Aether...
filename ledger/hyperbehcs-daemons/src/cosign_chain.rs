//! `asolaria-cosign-chain-daemon.py` (:4953) append semantics, integer only.
//!
//! Upstream holds a `threading.Lock` around `chain_head` + `append_row` (lines 29, 57) so one
//! writer assigns every seq. These functions are pure: the caller keeps that single-writer order
//! and stores the rows.

use alloc::string::String;
use alloc::vec;
use alloc::vec::Vec;
use sha2::{Digest, Sha256};

use crate::pyjson::{row_preimage, Obj, Value};

/// Line 26: the default `appended_by_daemon`.
pub const ANCHOR: &str = "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23";
/// Line 27: reported by `/health` (line 95).
pub const LAW: &str = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23";
/// Lines 41, 43, 51: the head hash of an empty chain, and of a max-seq row without `row_hash`.
pub const GENESIS_HASH: &str = "0000000000000000";

/// Line 32: the first 16 hex digits of sha256 over the UTF-8 bytes.
pub fn sha16(s: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let digest = Sha256::digest(s.as_bytes());
    let mut out = String::with_capacity(16);
    for b in digest.iter().take(8) {
        out.push(char::from(HEX[usize::from(b >> 4)]));
        out.push(char::from(HEX[usize::from(b & 0x0f)]));
    }
    out
}

/// `chain_head()`: `(max_seq, max_hash)`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Head {
    pub seq: i128,
    /// The `row_hash` value of the row holding `seq`, as stored (upstream line 51 takes it as is).
    pub hash: Value,
}

impl Head {
    /// Lines 40-43: no rows.
    pub fn genesis() -> Head {
        Head {
            seq: 0,
            hash: Value::str(GENESIS_HASH),
        }
    }

    /// Lines 48-51 for one parsed row. `seq` is the row's `seq` when `isinstance(seq, int)` holds;
    /// `row_hash` is the row's `row_hash` field when present. Only a strictly greater seq moves the
    /// head, so the first row holding the maximum keeps it.
    pub fn fold(&mut self, seq: Option<i128>, row_hash: Option<&Value>) {
        if let Some(s) = seq {
            if s > self.seq {
                self.seq = s;
                self.hash = row_hash
                    .cloned()
                    .unwrap_or_else(|| Value::str(GENESIS_HASH));
            }
        }
    }
}

/// Lines 34-53 (MAX-scan, not tail-scan) over rows in file order.
pub fn chain_head<'a, I: IntoIterator<Item = &'a Obj>>(rows: I) -> Head {
    let mut head = Head::genesis();
    for row in rows {
        let seq = match row.get("seq") {
            Some(Value::Int(n)) => Some(*n),
            _ => None,
        };
        head.fold(seq, row.get("row_hash"));
    }
    head
}

/// What `append_row` writes and returns (`next_seq, row["row_hash"], prev_hash`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Appended {
    /// The row in the key order of the Python dict that line 73 writes.
    pub row: Obj,
    pub seq: i128,
    pub row_hash: String,
    pub prev_hash: Value,
}

/// Lines 58-74 for `head = chain_head()` and `now = now_iso()`. `None` when `head.seq` is
/// `i128::MAX` (2^127 - 1): upstream line 59 then gives seq 2^127, and that row stays in the cold lane.
pub fn append_row(head: &Head, payload: &Obj, now: &str) -> Option<Appended> {
    let prev_hash = head.hash.clone();
    let next_seq = head.seq.checked_add(1)?;
    let mut row = payload.clone();
    row.set("seq", Value::Int(next_seq));
    let antecedents = match row.get("antecedents") {
        None => Some(vec![prev_hash.clone()]),
        Some(Value::List(items)) if !items.contains(&prev_hash) => {
            let mut chained: Vec<Value> = Vec::with_capacity(items.len() + 1);
            chained.push(prev_hash.clone());
            chained.extend(items.iter().cloned());
            Some(chained)
        }
        Some(_) => None,
    };
    if let Some(list) = antecedents {
        row.set("antecedents", Value::List(list));
    }
    if !row.contains_key("ts") {
        row.set("ts", Value::str(now));
    }
    if !row.contains_key("appended_by_daemon") {
        row.set("appended_by_daemon", Value::str(ANCHOR));
    }
    let row_hash = sha16(&row_preimage(&row));
    row.set("row_hash", Value::Str(row_hash.clone()));
    Some(Appended {
        row,
        seq: next_seq,
        row_hash,
        prev_hash,
    })
}
