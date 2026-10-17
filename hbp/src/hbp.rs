//! Port of hbp-emitter.mjs:1-111 (serializeEnvelope + writeHBP), json=0 hot lane.
//! The `opts.cold` JSON branch (hbp-emitter.mjs:104-108) is intentionally absent; see HBP.md.

use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::io;

use crate::sha256_hex;

const MAGIC: &str = "!HBP-v0";
const MAGIC_HBI: &str = "!HBI-v0";
/// tuple-tag.mjs:11 (`TUPLE_DIMS = 47`), consumed by serializeEnvelope's `[tuple]` block.
const TUPLE_DIMS: usize = 47;

/// A payload/metadata value, matching the JS value shapes the emitter serializes.
/// Numbers are integers only (operator rule: no float anywhere in the lane). `Int` renders as
/// `JSON.stringify` renders the same JS Number for |n| <= 2^53 - 1; outside that range the JS
/// Number is a rounded double (exponent form from 1e21) and the bytes differ (see HBP.md).
#[derive(Clone, Debug)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i128),
    Str(String),
    Arr(Vec<Value>),
    Obj(BTreeMap<String, Value>),
}

/// An HBP envelope. `metadata` (and any `Value::Obj`) is emitted in `Object.keys(...).sort()`
/// order, which compares UTF-16 code units (see [`js_sorted`]). `payload: Some(Value::Null)`
/// emits no `[payload]` block, as `envelope.payload != null` is false for `null`.
#[derive(Clone, Debug)]
pub struct Envelope {
    pub r#type: String,
    pub tuple_tag: Option<Vec<String>>,
    pub payload: Option<Value>,
    pub metadata: Option<BTreeMap<String, Value>>,
}

impl Envelope {
    /// New envelope defaulting `type` to `message` (the JS `envelope.type ?? 'message'`).
    pub fn new() -> Self {
        Self {
            r#type: "message".to_string(),
            tuple_tag: None,
            payload: None,
            metadata: None,
        }
    }
}

impl Default for Envelope {
    fn default() -> Self {
        Self::new()
    }
}

/// `Object.keys(map).sort()`: the default `Array.prototype.sort` order compares UTF-16 code
/// units, which differs from UTF-8/code-point order when keys mix U+E000..U+FFFF and astral chars.
fn js_sorted<V>(map: &BTreeMap<String, V>) -> Vec<(&String, &V)> {
    let mut entries: Vec<(&String, &V)> = map.iter().collect();
    entries.sort_by(|a, b| utf16_cmp(a.0, b.0));
    entries
}

fn utf16_cmp(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}

/// hbp-emitter.mjs:16-26 `canonicalStringify`: deterministic JS-JSON over sorted keys.
pub fn canonical_stringify(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => {
            if *b {
                "true".to_string()
            } else {
                "false".to_string()
            }
        }
        Value::Int(n) => n.to_string(),
        Value::Str(s) => json_quote(s),
        Value::Arr(items) => {
            let mut out = String::from("[");
            for (i, it) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&canonical_stringify(it));
            }
            out.push(']');
            out
        }
        Value::Obj(map) => {
            let mut out = String::from("{");
            let mut first = true;
            for (k, v) in js_sorted(map) {
                if !first {
                    out.push(',');
                }
                first = false;
                out.push_str(&json_quote(k));
                out.push(':');
                out.push_str(&canonical_stringify(v));
            }
            out.push('}');
            out
        }
    }
}

/// `JSON.stringify(<string>)`: wrap in quotes with V8's escape set (short forms for
/// \b \t \n \f \r, \uXXXX for the other C0 controls, backslash and quote escaped,
/// everything else — including non-ASCII — emitted verbatim).
fn json_quote(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{08}' => out.push_str("\\b"),
            '\u{09}' => out.push_str("\\t"),
            '\u{0a}' => out.push_str("\\n"),
            '\u{0c}' => out.push_str("\\f"),
            '\u{0d}' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn value_to_line(value: &Value) -> String {
    // payload/metadata: a raw string is passed through; anything else is canonicalStringify'd.
    match value {
        Value::Str(s) => s.clone(),
        other => canonical_stringify(other),
    }
}

/// hbp-emitter.mjs:28-63 `serializeEnvelope`.
pub fn serialize_envelope(env: &Envelope) -> String {
    let ty = &env.r#type;
    let mut lines: Vec<String> = vec![format!("{MAGIC} {ty}"), format!("type={ty}")];

    if let Some(tuple) = &env.tuple_tag {
        lines.push("[tuple]".to_string());
        for i in 0..TUPLE_DIMS {
            let v = tuple.get(i).map(String::as_str).unwrap_or("");
            lines.push(format!("D{}={}", i + 1, v));
        }
    }

    // hbp-emitter.mjs:43 `envelope.payload != null`
    if let Some(payload) = env.payload.as_ref().filter(|p| !matches!(p, Value::Null)) {
        lines.push("[payload]".to_string());
        lines.push(value_to_line(payload));
    }

    if let Some(metadata) = &env.metadata {
        lines.push("[metadata]".to_string());
        for (k, v) in js_sorted(metadata) {
            lines.push(format!("{}={}", k, value_to_line(v)));
        }
    }

    lines.push(format!("{MAGIC} end"));
    lines.join("\n")
}

/// Result of [`write_hbp`] — the sidecar paths plus the digest and byte count.
#[derive(Clone, Debug)]
pub struct WriteResult {
    pub hbp: String,
    pub hbi: String,
    pub sha256: String,
    pub hex: String,
    pub sha: String,
    pub bytes: usize,
}

/// POSIX `path.basename`: the final `/`-separated component (node runs POSIX on this lane).
fn basename(p: &str) -> String {
    match p.rfind('/') {
        Some(i) => p[i + 1..].to_string(),
        None => p.to_string(),
    }
}

fn hex_wrap_64(bytes: &[u8]) -> String {
    let mut hex = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        hex.push_str(&format!("{b:02x}"));
    }
    // JS: hex.match(/.{1,64}/g).join('\n') + '\n'
    let chars: Vec<char> = hex.chars().collect();
    let mut lines: Vec<String> = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let end = (i + 64).min(chars.len());
        lines.push(chars[i..end].iter().collect());
        i = end;
    }
    let mut out = lines.join("\n");
    out.push('\n');
    out
}

/// hbp-emitter.mjs:65-111 `writeHBP`, minus the cold JSON branch. Writes the
/// `.hbp/.sha256/.hex/.hbi` trinity (plus index) and returns their paths.
pub fn write_hbp(dest_path: &str, env: &Envelope) -> io::Result<WriteResult> {
    assert!(
        !dest_path.is_empty(),
        "writeHBP: destPath must be non-empty"
    );

    let body = serialize_envelope(env);
    let bytes = body.as_bytes();
    let sha = sha256_hex(bytes);

    let hbp_path = format!("{dest_path}.hbp");
    let hbi_path = format!("{dest_path}.hbi");
    let sha_path = format!("{dest_path}.sha256");
    let hex_path = format!("{dest_path}.hex");

    std::fs::write(&hbp_path, body.as_bytes())?;
    std::fs::write(
        &sha_path,
        format!("{}  {}\n", sha, basename(&hbp_path)).as_bytes(),
    )?;
    std::fs::write(&hex_path, hex_wrap_64(bytes).as_bytes())?;

    let hbi = [
        MAGIC_HBI.to_string(),
        format!("packet={}", basename(&hbp_path)),
        format!("bytes={}", bytes.len()),
        format!("sha256={sha}"),
        format!("type={}", env.r#type),
    ]
    .join("\n");
    std::fs::write(&hbi_path, format!("{hbi}\n").as_bytes())?;

    Ok(WriteResult {
        hbp: hbp_path,
        hbi: hbi_path,
        sha256: sha_path,
        hex: hex_path,
        sha,
        bytes: bytes.len(),
    })
}
