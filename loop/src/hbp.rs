//! HBP pipe-row parser (bigpickle hbp-reader.mjs:30-39 `parsePipeRow`).

use std::collections::BTreeMap;

use crate::js::js_trim;

/// A parsed pipe row: the leading tag plus `key=value` fields.
pub struct PipeRow {
    pub tag: String,
    pub fields: BTreeMap<String, String>,
}

/// Trim with the ECMAScript `trim` set, split on `|`; the first token is the tag, later `key=value`
/// tokens populate `fields` (first `=` splits, a token without a key is kept positionally as `_<i>`).
pub fn parse_pipe_row(line: &str) -> PipeRow {
    let trimmed = js_trim(line);
    let mut parts = trimmed.split('|');
    let tag = parts.next().unwrap_or("").to_string();
    let mut fields = BTreeMap::new();
    for (i, part) in parts.enumerate() {
        match part.find('=') {
            Some(eq) if eq > 0 => {
                fields.insert(part[..eq].to_string(), part[eq + 1..].to_string());
            }
            _ => {
                if !part.is_empty() {
                    fields.insert(format!("_{}", i + 1), part.to_string());
                }
            }
        }
    }
    PipeRow { tag, fields }
}

/// The value of `key`, or `None` when the row has no such field (upstream reads `undefined`, which a
/// template literal renders as `undefined`).
pub fn field<'a>(row: &'a PipeRow, key: &str) -> Option<&'a str> {
    row.fields.get(key).map(String::as_str)
}
