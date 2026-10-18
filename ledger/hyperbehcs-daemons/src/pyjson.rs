//! Row values of the shapes the cosign daemon writes, with Python `dict` and `==` semantics, and
//! the text `json.dumps(value, sort_keys=True, ensure_ascii=False)` gives for them (CPython `json`,
//! default separators `", "` and `": "`): the row_hash pre-image of
//! `asolaria-cosign-chain-daemon.py` line 70. This module only builds text; it never reads JSON.

use alloc::string::String;
use alloc::vec::Vec;
use core::fmt::Write;

/// A string, an integer, a list, or an object of those.
#[derive(Clone, Debug)]
pub enum Value {
    Str(String),
    Int(i128),
    List(Vec<Value>),
    Obj(Obj),
}

/// Python `==` between two values of these shapes: equal variants with equal contents; objects
/// compare as dicts (same keys, equal values, any order).
impl PartialEq for Value {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Value::Str(a), Value::Str(b)) => a == b,
            (Value::Int(a), Value::Int(b)) => a == b,
            (Value::List(a), Value::List(b)) => a == b,
            (Value::Obj(a), Value::Obj(b)) => a == b,
            _ => false,
        }
    }
}

impl Eq for Value {}

impl Value {
    pub fn str(s: &str) -> Value {
        Value::Str(String::from(s))
    }
}

/// A Python `dict` with string keys: insertion order kept, one entry per key.
#[derive(Clone, Debug, Default)]
pub struct Obj {
    fields: Vec<(String, Value)>,
}

impl PartialEq for Obj {
    fn eq(&self, other: &Self) -> bool {
        self.fields.len() == other.fields.len()
            && self
                .fields
                .iter()
                .all(|(k, v)| other.get(k).is_some_and(|w| w == v))
    }
}

impl Eq for Obj {}

impl Obj {
    pub fn new() -> Obj {
        Obj::default()
    }

    /// `dict(pairs)`: a repeated key keeps its first position and takes the last value.
    pub fn from_pairs<I: IntoIterator<Item = (String, Value)>>(pairs: I) -> Obj {
        let mut obj = Obj::new();
        for (k, v) in pairs {
            obj.set(&k, v);
        }
        obj
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        self.fields.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn contains_key(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    /// `d[key] = value`: replaces in place when the key exists, else appends.
    pub fn set(&mut self, key: &str, value: Value) {
        match self.fields.iter_mut().find(|(k, _)| k == key) {
            Some((_, slot)) => *slot = value,
            None => self.fields.push((String::from(key), value)),
        }
    }

    /// Entries in insertion order.
    pub fn fields(&self) -> &[(String, Value)] {
        &self.fields
    }

    pub fn len(&self) -> usize {
        self.fields.len()
    }

    pub fn is_empty(&self) -> bool {
        self.fields.is_empty()
    }
}

/// `json.dumps(value, sort_keys=True, ensure_ascii=False)`.
pub fn dumps_sorted(value: &Value) -> String {
    let mut out = String::new();
    write_value(value, &mut out);
    out
}

/// Line 70: `json.dumps({k:v for k,v in row.items() if k != "row_hash"}, sort_keys=True,
/// ensure_ascii=False)`. Only the top-level `row_hash` is left out.
pub fn row_preimage(row: &Obj) -> String {
    let mut out = String::new();
    write_object(row.fields.iter().filter(|(k, _)| k != "row_hash"), &mut out);
    out
}

fn write_value(value: &Value, out: &mut String) {
    match value {
        Value::Str(s) => write_str(s, out),
        Value::Int(n) => {
            let _ = write!(out, "{n}");
        }
        Value::List(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push_str(", ");
                }
                write_value(item, out);
            }
            out.push(']');
        }
        Value::Obj(obj) => write_object(obj.fields.iter(), out),
    }
}

/// `sort_keys=True` orders `str` keys by code point; UTF-8 byte order is the same order.
fn write_object<'a, I: Iterator<Item = &'a (String, Value)>>(fields: I, out: &mut String) {
    let mut sorted: Vec<&(String, Value)> = fields.collect();
    sorted.sort_by(|a, b| a.0.as_bytes().cmp(b.0.as_bytes()));
    out.push('{');
    for (i, (k, v)) in sorted.into_iter().enumerate() {
        if i > 0 {
            out.push_str(", ");
        }
        write_str(k, out);
        out.push_str(": ");
        write_value(v, out);
    }
    out.push('}');
}

/// CPython `json.encoder.py_encode_basestring` (`ensure_ascii=False`): `"` and `\` escaped,
/// `\b \f \n \r \t` short forms, other code points below U+0020 as `\u00xx` (lowercase hex),
/// everything else written as is.
pub fn write_str(s: &str, out: &mut String) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            c if u32::from(c) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", u32::from(c));
            }
            c => out.push(c),
        }
    }
    out.push('"');
}
