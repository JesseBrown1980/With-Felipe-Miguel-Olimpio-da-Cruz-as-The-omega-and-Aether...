//! Port of relay-envelope.mjs:1-77 — the RELAY row: one pipe-delimited HBP row,
//! content-addressed out-of-line payload, row_hash = sha16(prefix). PHASE 1 (seals only).

use std::collections::BTreeMap;

use crate::sha256_hex;

pub const SPEC_VERSION: &str = "1";
pub const GENESIS: &str = "0000000000000000";

/// relay-envelope.mjs:10-17 verb taxonomy. Unknown verb -> ACTION (fail-closed).
pub const READ_VERBS: [&str; 6] = ["NOTE", "STATUS", "ANSWER", "OBSERVE", "RECALL-REQ", "ACK"];
pub const ACTION_VERBS: [&str; 6] = ["EXEC", "WRITE", "MINT", "FIRE", "RETIRE", "COSIGN"];
pub const CONTROL_VERBS: [&str; 1] = ["HOLD"];

/// relay-envelope.mjs:13-17 `classOf`.
pub fn class_of(verb: &str) -> &'static str {
    if READ_VERBS.contains(&verb) {
        return "READ";
    }
    if CONTROL_VERBS.contains(&verb) {
        return "CONTROL";
    }
    "ACTION"
}

/// relay-envelope.mjs:32 FIELD_ORDER — the canonical preimage and the parser both depend on it.
pub const FIELD_ORDER: [&str; 13] = [
    "v",
    "from",
    "to",
    "verb",
    "seq",
    "ts",
    "pid",
    "payload_sha256",
    "hbi_off",
    "len",
    "token",
    "antecedent",
    "sig",
];

/// relay-envelope.mjs:19 `sha256hex`.
pub fn sha256hex(buf: &[u8]) -> String {
    sha256_hex(buf)
}

/// relay-envelope.mjs:20 `sha16` — first 16 hex chars of sha256(s).
pub fn sha16(s: &str) -> String {
    sha256_hex(s.as_bytes()).chars().take(16).collect()
}

/// A rejected row/field (carries the JS error message verbatim for parity).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RelayError(pub String);

impl std::fmt::Display for RelayError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for RelayError {}

/// relay-envelope.mjs:24 the HBP-row-injection guard char class:
/// `|` `{` `}`, C0 controls (incl CR/LF/TAB/NUL), DEL, U+2028, U+2029.
fn is_bad(c: char) -> bool {
    c == '|'
        || c == '{'
        || c == '}'
        || (c as u32) <= 0x1f
        || c == '\u{7f}'
        || c == '\u{2028}'
        || c == '\u{2029}'
}

/// relay-envelope.mjs:25-29 `clean`.
pub fn clean(name: &str, v: &str) -> Result<String, RelayError> {
    if v.chars().any(is_bad) {
        return Err(RelayError(format!(
            "FIELD_INJECTION_REJECT: field {name} contains a forbidden char ( | {{ }} or a control/separator )"
        )));
    }
    Ok(v.to_string())
}

/// A field map, keyed as the JS envelope object is.
pub type Fields = BTreeMap<String, String>;

/// relay-envelope.mjs:35-37 `sigPreimage`. `Array.prototype.join` renders an absent field as the empty string.
pub fn sig_preimage(f: &Fields) -> String {
    [
        "from",
        "to",
        "verb",
        "seq",
        "ts",
        "pid",
        "payload_sha256",
        "antecedent",
    ]
    .iter()
    .map(|k| f.get(*k).cloned().unwrap_or_default())
    .collect::<Vec<_>>()
    .join("|")
}

/// relay-envelope.mjs:40-42 `rowPrefix`. An absent field renders as `undefined`, the
/// `String(undefined)` that `clean` (relay-envelope.mjs:26) produces.
pub fn row_prefix(f: &Fields) -> Result<String, RelayError> {
    let mut parts: Vec<String> = Vec::with_capacity(FIELD_ORDER.len());
    for k in FIELD_ORDER {
        let v = f.get(k).map(String::as_str).unwrap_or("undefined");
        parts.push(format!("{k}={}", clean(k, v)?));
    }
    Ok(format!("RELAY|{}", parts.join("|")))
}

/// relay-envelope.mjs:44-49 `buildRow`. PHASE 1: `token`/`sig` default to `-`.
pub fn build_row(f: &Fields) -> Result<String, RelayError> {
    let mut filled = f.clone();
    filled
        .entry("token".to_string())
        .or_insert_with(|| "-".to_string());
    filled
        .entry("sig".to_string())
        .or_insert_with(|| "-".to_string());
    for k in FIELD_ORDER {
        if !filled.contains_key(k) {
            return Err(RelayError(format!("MISSING_FIELD: {k}")));
        }
    }
    let prefix = row_prefix(&filled)?;
    let rh = sha16(&prefix);
    Ok(format!("{prefix}|row_hash={rh}"))
}

/// A parsed RELAY row: all 13 fields, the recomputed-against `row_hash`, and the `_prefix`.
#[derive(Clone, Debug)]
pub struct ParsedRow {
    pub fields: Fields,
    pub row_hash: String,
    pub prefix: String,
}

fn has_control_or_sep(s: &str) -> bool {
    s.chars()
        .any(|c| (c as u32) <= 0x1f || c == '\u{7f}' || c == '\u{2028}' || c == '\u{2029}')
}

/// relay-envelope.mjs:51-74 `parseRow`.
pub fn parse_row(line: &str) -> Result<ParsedRow, RelayError> {
    let s = line.strip_suffix('\n').unwrap_or(line);
    if has_control_or_sep(s) {
        return Err(RelayError(
            "PARSE_REJECT: control/separator char in row (injection guard)".to_string(),
        ));
    }
    if !s.starts_with("RELAY|") {
        return Err(RelayError("PARSE_REJECT: not a RELAY row".to_string()));
    }
    let marker = "|row_hash=";
    let at = s
        .find(marker)
        .ok_or_else(|| RelayError("PARSE_REJECT: no row_hash".to_string()))?;
    let prefix = &s[..at];
    let row_hash = &s[at + marker.len()..];
    let toks: Vec<&str> = prefix.split('|').collect();
    if toks[0] != "RELAY" {
        return Err(RelayError("PARSE_REJECT: bad header".to_string()));
    }
    let mut fields: Fields = BTreeMap::new();
    let mut keys: Vec<String> = Vec::new();
    for t in toks.iter().skip(1) {
        let eq = t
            .find('=')
            .ok_or_else(|| RelayError(format!("PARSE_REJECT: bad token {t}")))?;
        let k = t[..eq].to_string();
        fields.insert(k.clone(), t[eq + 1..].to_string());
        keys.push(k);
    }
    if keys.len() != FIELD_ORDER.len() {
        return Err(RelayError(format!(
            "PARSE_REJECT: field count {} != {}",
            keys.len(),
            FIELD_ORDER.len()
        )));
    }
    for (i, want) in FIELD_ORDER.iter().enumerate() {
        if &keys[i] != want {
            return Err(RelayError(format!(
                "PARSE_REJECT: field-order at {i} got {} want {want}",
                keys[i]
            )));
        }
    }
    Ok(ParsedRow {
        fields,
        row_hash: row_hash.to_string(),
        prefix: prefix.to_string(),
    })
}

/// relay-envelope.mjs:77 `rowHashOk`.
pub fn row_hash_ok(p: &ParsedRow) -> bool {
    sha16(&p.prefix) == p.row_hash
}
