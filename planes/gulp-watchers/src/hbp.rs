//! HBP row text: `KIND|key=value|...` lines with `%XX` escapes, the on-disk form the watcher planes
//! emit where upstream wrote NDJSON rows. The same escaping tools/referee.py uses, so rows compare byte for byte.

use core::fmt::Display;

/// One HBP row: a kind tag and ordered `key=value` fields.
pub struct Row {
    kind: String,
    fields: Vec<(String, String)>,
}

impl Row {
    /// A row with the given kind tag.
    pub fn new(kind: &str) -> Self {
        Row {
            kind: kind.to_string(),
            fields: Vec::new(),
        }
    }

    /// Append a field whose value is written verbatim (integers, pre-escaped tokens).
    pub fn field(mut self, key: &str, value: impl Display) -> Self {
        self.fields.push((key.to_string(), value.to_string()));
        self
    }

    /// Append a field whose value is `%XX`-escaped text.
    pub fn text(mut self, key: &str, value: &str) -> Self {
        self.fields.push((key.to_string(), escape(value)));
        self
    }

    /// The rendered `KIND|key=value|...` line.
    pub fn render(&self) -> String {
        let mut out = self.kind.clone();
        for (k, v) in &self.fields {
            out.push('|');
            out.push_str(k);
            out.push('=');
            out.push_str(v);
        }
        out
    }
}

/// `%XX` for `%`, space, `|`, `=` and code points below 0x20 or equal to 0x7F.
pub fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        let u = u32::from(c);
        if u < 0x20 || u == 0x7f || matches!(c, '%' | ' ' | '|' | '=') {
            out.push_str(&format!("%{u:02X}"));
        } else {
            out.push(c);
        }
    }
    out
}
