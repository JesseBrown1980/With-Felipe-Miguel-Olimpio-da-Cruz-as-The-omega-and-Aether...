//! The four compact writer serializations (Claude's addition; not upstream).
//!
//! Each is what Python's `json` module writes for the row without `row_hash`:
//! `json.dumps(row, separators=(",", ":"), sort_keys=S, ensure_ascii=A)`, with one rule taken
//! from py_parity instead of from Python: every number, `true`, `false` and `null` token is
//! written exactly as the chain stores it (`RawJson::Scalar` keeps the token), so no number is
//! re-formatted. String values and keys are decoded as CPython's json scanner decodes them and
//! written as `json.encoder.encode_basestring` (`ensure_ascii=False`, "kept") or
//! `json.encoder.encode_basestring_ascii` (`ensure_ascii=True`, "escaped") writes them.
//!
//! The row is the `PyRow` py_parity `parse_line` read, and nothing else reads the line. Number
//! tokens are written as stored even where Python's json grammar has no such token (`01`;
//! json_tok.rs:202-220). A value string with an escape CPython's scanner refuses (`\q`, kept in
//! the raw token by json_tok.rs:233-251) has no decoded form, so `serialize` is `None` for it.

use asolaria_server_cosign_ledger::py_parity::{py_escape_string, PyRow, RawJson};

/// One writer serialization. `ORDER` is the order in which they are tried.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Formula {
    SortedCompactKept,
    OriginalCompactKept,
    SortedCompactEscaped,
    OriginalCompactEscaped,
}

impl Formula {
    pub const ORDER: [Formula; 4] = [
        Formula::SortedCompactKept,
        Formula::OriginalCompactKept,
        Formula::SortedCompactEscaped,
        Formula::OriginalCompactEscaped,
    ];

    pub fn name(self) -> &'static str {
        match self {
            Formula::SortedCompactKept => "sorted_compact_kept",
            Formula::OriginalCompactKept => "original_compact_kept",
            Formula::SortedCompactEscaped => "sorted_compact_escaped",
            Formula::OriginalCompactEscaped => "original_compact_escaped",
        }
    }

    /// `sort_keys=True`: keys in code point order at every object level.
    pub fn sort_keys(self) -> bool {
        matches!(
            self,
            Formula::SortedCompactKept | Formula::SortedCompactEscaped
        )
    }

    /// `ensure_ascii=True`: everything outside U+0020..U+007E written as `\uXXXX`.
    pub fn ensure_ascii(self) -> bool {
        matches!(
            self,
            Formula::SortedCompactEscaped | Formula::OriginalCompactEscaped
        )
    }
}

/// The bytes `formula` writes for `row` without its top-level `row_hash`, or `None` when a value
/// string does not decode as CPython's scanner decodes it, or (kept) a string holds an unpaired
/// surrogate, which `str.encode("utf-8")` refuses.
pub fn serialize(row: &PyRow, formula: Formula) -> Option<String> {
    let fields: Vec<(&str, &RawJson)> = row
        .fields
        .iter()
        .filter(|(k, _)| k != "row_hash")
        .map(|(k, v)| (k.as_str(), v))
        .collect();
    let mut out = String::new();
    write_object(fields, formula, &mut out)?;
    Some(out)
}

fn write_object(
    mut fields: Vec<(&str, &RawJson)>,
    formula: Formula,
    out: &mut String,
) -> Option<()> {
    if formula.sort_keys() {
        // UTF-8 byte order of a valid key is its code point order, the order Python sorts str in.
        fields.sort_by(|a, b| a.0.cmp(b.0));
    }
    out.push('{');
    for (idx, (key, value)) in fields.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        let units: Vec<u32> = key.chars().map(u32::from).collect();
        write_string(&units, formula, out)?;
        out.push(':');
        write_value(value, formula, out)?;
    }
    out.push('}');
    Some(())
}

fn write_value(value: &RawJson, formula: Formula, out: &mut String) -> Option<()> {
    match value {
        RawJson::Scalar(raw) if raw.starts_with('"') => {
            let units = decode_py_string(raw)?;
            write_string(&units, formula, out)
        }
        RawJson::Scalar(raw) => {
            out.push_str(raw);
            Some(())
        }
        RawJson::Array(values) => {
            out.push('[');
            for (idx, v) in values.iter().enumerate() {
                if idx > 0 {
                    out.push(',');
                }
                write_value(v, formula, out)?;
            }
            out.push(']');
            Some(())
        }
        RawJson::Object(fields) => write_object(
            fields.iter().map(|(k, v)| (k.as_str(), v)).collect(),
            formula,
            out,
        ),
    }
}

fn write_string(units: &[u32], formula: Formula, out: &mut String) -> Option<()> {
    if formula.ensure_ascii() {
        write_escaped(units, out);
        Some(())
    } else {
        write_kept(units, out)
    }
}

/// `json.encoder.encode_basestring`: `"` `\` and U+0000..U+001F escaped (short forms for
/// `\b \f \n \r \t`), everything else as it is.
fn write_kept(units: &[u32], out: &mut String) -> Option<()> {
    out.push('"');
    for &u in units {
        match u {
            0x22 => out.push_str("\\\""),
            0x5c => out.push_str("\\\\"),
            0x08 => out.push_str("\\b"),
            0x0c => out.push_str("\\f"),
            0x0a => out.push_str("\\n"),
            0x0d => out.push_str("\\r"),
            0x09 => out.push_str("\\t"),
            0x00..=0x1f => push_u_escape(u, out),
            _ => out.push(char::from_u32(u)?),
        }
    }
    out.push('"');
    Some(())
}

/// `json.encoder.encode_basestring_ascii`. Runs of scalar values go through py_parity's
/// `py_escape_string` (canon.rs:77-105), which writes U+007F as it is (canon.rs:90-94);
/// Python writes U+007F as `\u007f`, so that one character is rewritten. An unpaired surrogate
/// is written as `\uXXXX`, as Python writes it.
fn write_escaped(units: &[u32], out: &mut String) {
    out.push('"');
    let mut run = String::new();
    for &u in units {
        match char::from_u32(u) {
            Some(c) => run.push(c),
            None => {
                flush_escaped(&mut run, out);
                push_u_escape(u, out);
            }
        }
    }
    flush_escaped(&mut run, out);
    out.push('"');
}

fn flush_escaped(run: &mut String, out: &mut String) {
    if run.is_empty() {
        return;
    }
    let quoted = py_escape_string(run);
    let inner = &quoted[1..quoted.len() - 1];
    out.push_str(&inner.replace('\u{7f}', "\\u007f"));
    run.clear();
}

fn push_u_escape(u: u32, out: &mut String) {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    out.push_str("\\u");
    for shift in [12u32, 8, 4, 0] {
        out.push(char::from(HEX[((u >> shift) & 0xf) as usize]));
    }
}

/// A JSON string token (with its quotes) decoded as CPython's json scanner decodes it, as code
/// points: a `\uD800`-`\uDBFF` escape followed by a `\uDC00`-`\uDFFF` escape is one code point;
/// any other surrogate escape stays one unpaired surrogate unit. `None` where CPython raises.
pub fn decode_py_string(raw: &str) -> Option<Vec<u32>> {
    let body = raw.strip_prefix('"')?.strip_suffix('"')?;
    let chars: Vec<char> = body.chars().collect();
    let mut out = Vec::with_capacity(chars.len());
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c != '\\' {
            if u32::from(c) < 0x20 {
                return None;
            }
            out.push(u32::from(c));
            i += 1;
            continue;
        }
        let escape = *chars.get(i + 1)?;
        i += 2;
        let unit = match escape {
            '"' => 0x22,
            '\\' => 0x5c,
            '/' => 0x2f,
            'b' => 0x08,
            'f' => 0x0c,
            'n' => 0x0a,
            'r' => 0x0d,
            't' => 0x09,
            'u' => {
                let hi = hex4(&chars, i)?;
                i += 4;
                if (0xd800..=0xdbff).contains(&hi)
                    && chars.get(i) == Some(&'\\')
                    && chars.get(i + 1) == Some(&'u')
                {
                    let lo = hex4(&chars, i + 2)?;
                    if (0xdc00..=0xdfff).contains(&lo) {
                        i += 6;
                        0x1_0000 + (((hi - 0xd800) << 10) | (lo - 0xdc00))
                    } else {
                        hi
                    }
                } else {
                    hi
                }
            }
            _ => return None,
        };
        out.push(unit);
    }
    Some(out)
}

fn hex4(chars: &[char], at: usize) -> Option<u32> {
    let mut v = 0u32;
    for k in 0..4 {
        v = (v << 4) | chars.get(at + k)?.to_digit(16)?;
    }
    Some(v)
}

#[cfg(test)]
mod tests {
    use super::*;
    use asolaria_server_cosign_ledger::py_parity::parse_line;

    fn ser(line: &str, f: Formula) -> Option<String> {
        serialize(&parse_line(line.as_bytes()).expect("parse"), f)
    }

    #[test]
    fn decode_follows_the_cpython_scanner() {
        assert_eq!(decode_py_string(r#""\ud83d\ude00""#), Some(vec![0x1f600]));
        assert_eq!(decode_py_string(r#""\ud800x""#), Some(vec![0xd800, 0x78]));
        assert_eq!(
            decode_py_string(r#""\ud800\u0041""#),
            Some(vec![0xd800, 0x41])
        );
        assert_eq!(decode_py_string(r#""\ude00""#), Some(vec![0xde00]));
        assert_eq!(decode_py_string(r#""\u00E9\/""#), Some(vec![0xe9, 0x2f]));
        assert_eq!(decode_py_string(r#""\q""#), None);
        assert_eq!(decode_py_string(r#""\u12""#), None);
        assert_eq!(decode_py_string(r#""\ud800\uZZZZ""#), None);
    }

    #[test]
    fn kept_and_escaped_strings() {
        let line = "{\"k\u{e9}y\": \"a\\/b\\u0001\u{7f}\u{1f600}\\n\", \"row_hash\": \"x\"}";
        assert_eq!(
            ser(line, Formula::SortedCompactKept).as_deref(),
            Some("{\"k\u{e9}y\":\"a/b\\u0001\u{7f}\u{1f600}\\n\"}")
        );
        assert_eq!(
            ser(line, Formula::SortedCompactEscaped).as_deref(),
            Some("{\"k\\u00e9y\":\"a/b\\u0001\\u007f\\ud83d\\ude00\\n\"}")
        );
    }

    #[test]
    fn unpaired_surrogate_only_in_the_escaped_form() {
        let line = r#"{"s": "\ud800x"}"#;
        assert_eq!(ser(line, Formula::SortedCompactKept), None);
        assert_eq!(
            ser(line, Formula::SortedCompactEscaped).as_deref(),
            Some(r#"{"s":"\ud800x"}"#)
        );
    }

    #[test]
    fn raw_tokens_order_and_nesting() {
        let line = r#"{"z": [1.50, {"d": 2.0e-3, "c": -0}], "a": 1E+2, "row_hash": "h", "m": {"b": [], "a": {}}}"#;
        assert_eq!(
            ser(line, Formula::SortedCompactKept).as_deref(),
            Some(r#"{"a":1E+2,"m":{"a":{},"b":[]},"z":[1.50,{"c":-0,"d":2.0e-3}]}"#)
        );
        assert_eq!(
            ser(line, Formula::OriginalCompactKept).as_deref(),
            Some(r#"{"z":[1.50,{"d":2.0e-3,"c":-0}],"a":1E+2,"m":{"b":[],"a":{}}}"#)
        );
    }

    #[test]
    fn tokens_as_stored_and_strings_without_a_decoded_form() {
        let lead = r#"{"n": 01, "m": [-01, 00.5]}"#;
        assert_eq!(
            ser(lead, Formula::OriginalCompactKept).as_deref(),
            Some(r#"{"n":01,"m":[-01,00.5]}"#)
        );
        assert_eq!(ser(r#"{"v": "\q"}"#, Formula::OriginalCompactEscaped), None);
        // A replaced duplicate value is not in the PyRow (json_tok.rs:151-155).
        assert_eq!(
            ser(r#"{"a": 01, "a": 2}"#, Formula::SortedCompactKept).as_deref(),
            Some(r#"{"a":2}"#)
        );
        assert_eq!(
            ser(r#"{"a": {"b": "\x"}, "a": 2}"#, Formula::SortedCompactKept).as_deref(),
            Some(r#"{"a":2}"#)
        );
    }
}
