//! Readers for the HBP fixtures tools/referee.py writes: `KIND|key=value|...` rows, `%XX` escapes and
//! value tokens (`u n t f #<String(x)> '<escaped> [ ... ] { '<key> <value> ... }`).

#![allow(dead_code)]

use l0_edge::jsnum::Dbl;
use whiteroom_shannon::jsvalue::{JsNumber, JsObject, JsValue};

/// One fixture row.
pub struct Row {
    pub kind: String,
    pub line: String,
    fields: Vec<(String, String)>,
}

impl Row {
    /// The raw field `key`.
    pub fn raw(&self, key: &str) -> &str {
        self.opt(key)
            .unwrap_or_else(|| panic!("field {key} missing: {}", self.line))
    }

    /// The raw field `key`, if present.
    pub fn opt(&self, key: &str) -> Option<&str> {
        self.fields
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }

    /// The `%XX`-unescaped field `key`.
    pub fn text(&self, key: &str) -> String {
        unescape(self.raw(key))
    }

    /// The field `key` as a value token.
    pub fn value(&self, key: &str) -> JsValue {
        parse_value(self.raw(key))
    }

    /// The field `key` as a string value token.
    pub fn string(&self, key: &str) -> String {
        match self.value(key) {
            JsValue::String(s) => s,
            other => panic!("{key} is not a string: {other:?}"),
        }
    }

    /// The field `key` parsed as an integer.
    pub fn int<T: std::str::FromStr>(&self, key: &str) -> T
    where
        T::Err: std::fmt::Debug,
    {
        self.raw(key).parse().expect("integer field")
    }

    /// The field `key` as IEEE-754 bits in hex.
    pub fn dbl(&self, key: &str) -> Dbl {
        dbl_hex(self.raw(key))
    }
}

/// The `Dbl` with IEEE-754 bit pattern `bits`: `+0` or a positive normal finite value; `None` for a
/// set sign bit, subnormals, infinities and NaN, which lie outside `Dbl`'s domain. Scaling by powers
/// of two is exact in binary64, so each step keeps the value exact.
pub fn from_bits(bits: u64) -> Option<Dbl> {
    if bits == 0 {
        return Some(Dbl::ZERO);
    }
    let biased = bits >> 52;
    if biased == 0 || biased >= 0x7ff {
        return None;
    }
    let mut exp = biased as i32 - 1075;
    let mut value = Dbl::from_u64((bits & ((1 << 52) - 1)) | (1 << 52));
    while exp > 0 {
        let step = exp.min(62);
        value = value * Dbl::from_u64(1 << step);
        exp -= step;
    }
    while exp < 0 {
        let step = (-exp).min(62);
        value = value / Dbl::from_u64(1 << step);
        exp += step;
    }
    Some(value)
}

/// A binary64 value from 16 hex digits.
pub fn dbl_hex(hex: &str) -> Dbl {
    from_bits(u64::from_str_radix(hex, 16).expect("hex bits")).expect("non-negative normal")
}

/// 16 hex digits of a binary64 value.
pub fn hex_bits(x: Dbl) -> String {
    format!("{:016x}", x.to_bits())
}

/// The rows of `tests/fixtures/<name>`, comments skipped.
pub fn rows(name: &str) -> Vec<Row> {
    let path = format!("{}/tests/fixtures/{name}", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"));
    text.lines()
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .map(|line| {
            let mut parts = line.split('|');
            let kind = parts.next().expect("kind").to_string();
            let fields = parts
                .map(|p| {
                    let (k, v) = p.split_once('=').expect("key=value");
                    (k.to_string(), v.to_string())
                })
                .collect();
            Row {
                kind,
                line: line.to_string(),
                fields,
            }
        })
        .collect()
}

/// Decodes `%XX` escapes (uppercase hex, ASCII code points).
pub fn unescape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            let code = u8::from_str_radix(&hex, 16).expect("escape");
            out.push(char::from(code));
        } else {
            out.push(c);
        }
    }
    out
}

/// Parses a value token string.
pub fn parse_value(text: &str) -> JsValue {
    let tokens: Vec<&str> = text.split(' ').collect();
    let mut i = 0;
    let value = parse_at(&tokens, &mut i);
    assert_eq!(i, tokens.len(), "trailing tokens in {text}");
    value
}

fn parse_at(tokens: &[&str], i: &mut usize) -> JsValue {
    let t = tokens[*i];
    *i += 1;
    match t {
        "u" => JsValue::Undefined,
        "n" => JsValue::Null,
        "t" => JsValue::Bool(true),
        "f" => JsValue::Bool(false),
        "[" => {
            let mut items = Vec::new();
            while tokens[*i] != "]" {
                items.push(parse_at(tokens, i));
            }
            *i += 1;
            JsValue::Array(items)
        }
        "{" => {
            let mut entries = Vec::new();
            while tokens[*i] != "}" {
                let key = unescape(tokens[*i].strip_prefix('\'').expect("string key"));
                *i += 1;
                entries.push((key, parse_at(tokens, i)));
            }
            *i += 1;
            JsValue::Object(JsObject::new(entries).expect("unique keys"))
        }
        _ if t.starts_with('#') => {
            JsValue::Number(JsNumber::from_text(&t[1..]).expect("String(x) text"))
        }
        _ if t.starts_with('\'') => JsValue::String(unescape(&t[1..])),
        _ => panic!("bad token {t}"),
    }
}

/// Encodes a value as a token string (the inverse of [`parse_value`]).
pub fn token(v: &JsValue) -> String {
    match v {
        JsValue::Undefined => "u".to_string(),
        JsValue::Null => "n".to_string(),
        JsValue::Bool(true) => "t".to_string(),
        JsValue::Bool(false) => "f".to_string(),
        JsValue::Number(n) => format!("#{}", n.text()),
        JsValue::String(s) => format!("'{}", escape(s)),
        JsValue::Array(items) => {
            let mut parts = vec!["[".to_string()];
            parts.extend(items.iter().map(token));
            parts.push("]".to_string());
            parts.join(" ")
        }
        JsValue::Object(o) => {
            let mut parts = vec!["{".to_string()];
            for (k, x) in o.entries() {
                parts.push(format!("'{}", escape(k)));
                parts.push(token(x));
            }
            parts.push("}".to_string());
            parts.join(" ")
        }
    }
}

/// `%XX` for `%`, space, `|`, `=` and code points below 0x20 and 0x7F.
pub fn escape(s: &str) -> String {
    s.chars()
        .map(|c| {
            let u = u32::from(c);
            if u < 0x20 || u == 0x7f || "% |=".contains(c) {
                format!("%{u:02X}")
            } else {
                c.to_string()
            }
        })
        .collect()
}
