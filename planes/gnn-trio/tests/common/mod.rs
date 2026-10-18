//! Reader for the `KIND|key=value` HBP fixture tools/referee.py writes, with `%XX` unescaping.

#![allow(dead_code)]

/// One fixture row: its kind tag, its raw line, and the parsed fields.
pub struct Row {
    pub kind: String,
    pub raw: String,
    fields: Vec<(String, String)>,
}

impl Row {
    /// The raw field value (panics if absent).
    pub fn get(&self, key: &str) -> &str {
        self.fields
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
            .unwrap_or_else(|| panic!("field {key} missing in: {}", self.raw))
    }

    /// The `%XX`-unescaped field value.
    pub fn text(&self, key: &str) -> String {
        unescape(self.get(key))
    }

    /// The field parsed as `u64`.
    pub fn u64(&self, key: &str) -> u64 {
        self.get(key).parse().expect("u64 field")
    }

    /// The field parsed as `u32`.
    pub fn u32(&self, key: &str) -> u32 {
        self.get(key).parse().expect("u32 field")
    }

    /// The field parsed as `i64`.
    pub fn i64(&self, key: &str) -> i64 {
        self.get(key).parse().expect("i64 field")
    }

    /// The field parsed as `i8`.
    pub fn i8(&self, key: &str) -> i8 {
        self.get(key).parse().expect("i8 field")
    }

    /// A 16-hex-char field as its `u64` bit pattern.
    pub fn bits(&self, key: &str) -> u64 {
        u64::from_str_radix(self.get(key), 16).expect("hex u64 field")
    }
}

/// The non-comment rows of `tests/fixtures/<name>`.
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
                raw: line.to_string(),
                fields,
            }
        })
        .collect()
}

/// Decode `%XX` escapes (uppercase hex, ASCII bytes); raw multi-byte UTF-8 passes through unchanged.
pub fn unescape(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 3 <= bytes.len() {
            let hex = &s[i + 1..i + 3];
            out.push(u8::from_str_radix(hex, 16).expect("escape"));
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).expect("utf-8")
}
