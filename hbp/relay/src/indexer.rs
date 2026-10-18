//! Port of relay-hbi-indexer.mjs:1-35 — the byte-offset HBI sidecar and the bounds-checked
//! payload read. The sidecar line is `IDX|k=v|...` in a fixed field order; a read rejects an
//! out-of-range or over-cap offset/length rather than returning out-of-store bytes.

use std::collections::BTreeMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use hbp::relay::RelayError;

use crate::jsnum::{blob_bounds, BlobBounds};
use crate::writer::{file_size, node_fs_error, read_text_if_exists};

/// relay-hbi-indexer.mjs:5 — 8 MiB hard cap on a single payload read.
pub const MAX_PAYLOAD: i128 = 8 * 1024 * 1024;

/// relay-hbi-indexer.mjs:6 IDX_FIELDS — the fixed sidecar field order.
pub const IDX_FIELDS: [&str; 12] = [
    "row_hash",
    "row_off",
    "row_len",
    "pid",
    "verb",
    "cls",
    "from",
    "to",
    "ts",
    "seq",
    "payload_off",
    "payload_len",
];

/// relay-hbi-indexer.mjs:8-11 `appendIndex` — write one `IDX|...` line for a record whose keys
/// cover IDX_FIELDS. Values are already stringified by the caller, as the JS template coercion does.
pub fn append_index(hbi_path: &str, rec: &BTreeMap<String, String>) -> Result<(), RelayError> {
    let body = IDX_FIELDS
        .iter()
        .map(|k| {
            format!(
                "{k}={}",
                rec.get(*k).map(String::as_str).unwrap_or("undefined")
            )
        })
        .collect::<Vec<_>>()
        .join("|");
    let line = format!("IDX|{body}\n");
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(Path::new(hbi_path))
        .map_err(|e| RelayError(format!("WRITE_INDEX: {e}")))?;
    f.write_all(line.as_bytes())
        .map_err(|e| RelayError(format!("WRITE_INDEX: {e}")))
}

/// relay-hbi-indexer.mjs:19 — one `k=v` token. A token without `=` gives `indexOf` -1, so the JS
/// stores key `t.slice(0, -1)` (the token minus its last UTF-16 unit) with value `t`. When that
/// last unit is the low half of a surrogate pair the JS key ends in a lone high surrogate; it is
/// kept here as U+FFFD, which (like the JS key) can never equal `seq` or `row_hash`.
fn idx_token(t: &str) -> (String, String) {
    match t.find('=') {
        Some(e) => (t[..e].to_string(), t[e + 1..].to_string()),
        None => {
            let mut key = t.to_string();
            if let Some(last) = key.pop() {
                if last.len_utf16() == 2 {
                    key.push('\u{FFFD}');
                }
            }
            (key, t.to_string())
        }
    }
}

/// relay-hbi-indexer.mjs:13-23 `loadIndex` — parse every `IDX|` line into a key/value map. The
/// sidecar is read as relay-hbi-indexer.mjs:15-16 reads it (absent = empty; UTF-8 decoded with
/// U+FFFD substitution); any other read failure is returned, as the JS throws it.
pub fn load_index(hbi_path: &str) -> Result<Vec<BTreeMap<String, String>>, RelayError> {
    let mut out = Vec::new();
    let text = read_text_if_exists(hbi_path)?;
    for ln in text.split('\n') {
        if !ln.starts_with("IDX|") {
            continue;
        }
        let mut f = BTreeMap::new();
        for t in ln[4..].split('|') {
            let (k, v) = idx_token(t);
            f.insert(k, v);
        }
        out.push(f);
    }
    Ok(out)
}

/// relay-hbi-indexer.mjs:26-35 `readBlob` — bounds-checked payload read. `off`/`len` go through
/// JS `Number()` (crate::jsnum); a non-integer or negative value, an over-cap length, or an
/// offset+length past the store size returns the JS `BOUNDS_REJECT` message instead of a read.
pub fn read_blob(payloads_path: &str, off: &str, len: &str) -> Result<Vec<u8>, RelayError> {
    let size = file_size(payloads_path);
    let (off, len) = match blob_bounds(off, len, MAX_PAYLOAD as u64, size) {
        BlobBounds::Read { off, len } => (off, len),
        BlobBounds::Reject(m) => return Err(RelayError(m)),
    };
    let mut f =
        File::open(payloads_path).map_err(|e| node_fs_error(&e, "open", Some(payloads_path)))?;
    let mut b = vec![0u8; len as usize];
    if len > 0 {
        f.seek(SeekFrom::Start(off))
            .map_err(|e| node_fs_error(&e, "read", None))?;
        f.read_exact(&mut b)
            .map_err(|e| node_fs_error(&e, "read", None))?;
    }
    Ok(b)
}
