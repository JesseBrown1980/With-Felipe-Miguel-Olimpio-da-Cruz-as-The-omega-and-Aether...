//! Reader for the `KIND|key=value` HBP fixtures tools/referee.py writes, with `%XX` unescaping.

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

    /// The field value, or `None` for the `-` sentinel.
    pub fn opt(&self, key: &str) -> Option<&str> {
        match self.get(key) {
            "-" => None,
            v => Some(v),
        }
    }

    /// The `%XX`-unescaped field value.
    pub fn text(&self, key: &str) -> String {
        unescape(self.get(key))
    }

    /// The unescaped field value, or `None` for the `-` sentinel.
    pub fn opt_text(&self, key: &str) -> Option<String> {
        self.opt(key).map(unescape)
    }

    /// The field parsed as `i128`.
    pub fn i128(&self, key: &str) -> i128 {
        self.get(key).parse().expect("i128 field")
    }

    /// The field parsed as `u64`.
    pub fn u64(&self, key: &str) -> u64 {
        self.get(key).parse().expect("u64 field")
    }

    /// The field parsed as `usize`, or `None` for the `-` sentinel.
    pub fn opt_usize(&self, key: &str) -> Option<usize> {
        self.opt(key).map(|v| v.parse().expect("usize field"))
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
