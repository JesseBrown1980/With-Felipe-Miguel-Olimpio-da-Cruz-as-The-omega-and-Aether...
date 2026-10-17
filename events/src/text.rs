//! String helpers shared by the port: `cleanText`/`clipText` and the UTF-16 length
//! and slice JavaScript strings use (edgeRiskEngine.js:1-7, graphRuntimeStore.js:16-24).

/// ECMAScript `WhiteSpace` and `LineTerminator`, the set `String.prototype.trim` removes.
fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\u{0009}'
            | '\u{000A}'
            | '\u{000B}'
            | '\u{000C}'
            | '\u{000D}'
            | '\u{0020}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

/// `str.trim()`: strips ECMAScript whitespace from both ends.
pub fn js_trim(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

/// `String.prototype.toLowerCase`, using Rust 1.81's Unicode 15.1.0 case tables; V8 uses its
/// ICU's tables (Node 22.22.0: Unicode 16.0, where U+A7CB and U+A7CC also lowercase).
pub fn js_lower(value: &str) -> String {
    value.to_lowercase()
}

/// `String(value || "").replace(/\r/g, " ").trim()` (edgeRiskEngine.js:1-3).
pub fn clean_text(value: &str) -> String {
    let replaced: String = value
        .chars()
        .map(|c| if c == '\r' { ' ' } else { c })
        .collect();
    js_trim(&replaced).to_string()
}

/// `cleanText(value).toLowerCase()` (edgeRiskEngine.js:5-7).
pub fn clean_lower(value: &str) -> String {
    js_lower(&clean_text(value))
}

/// `str.length`: UTF-16 code-unit count.
pub fn utf16_len(value: &str) -> usize {
    value.chars().map(char::len_utf16).sum()
}

/// `str.slice(start, end)` over UTF-16 code units; a BMP char is one unit. Where `start` or
/// `end` falls inside a surrogate pair, JavaScript keeps a lone surrogate, which UTF-8 cannot
/// carry; it is written as U+FFFD, the char Node's UTF-8 encoder writes for it.
pub fn utf16_slice(value: &str, start: usize, end: usize) -> String {
    let mut out = String::new();
    if start >= end {
        return out;
    }
    let mut index = 0usize;
    for c in value.chars() {
        if index >= end {
            break;
        }
        let next = index + c.len_utf16();
        if next > start {
            out.push(if index >= start && next <= end {
                c
            } else {
                '\u{FFFD}'
            });
        }
        index = next;
    }
    out
}

/// `clipText(value, maxChars)` (graphRuntimeStore.js:20-24).
pub fn clip_text(value: &str, max_chars: usize) -> String {
    let text = clean_text(value);
    if utf16_len(&text) <= max_chars {
        return text;
    }
    let head = utf16_slice(&text, 0, max_chars.saturating_sub(3));
    format!("{}...", js_trim(&head))
}

/// The class `[a-z0-9_:-]` kept by the lowercased `component`, `category`, `action` and node
/// `type` slugs (graphRuntimeStore.js:40,102-104,148-149).
pub fn is_slug_char(c: char) -> bool {
    matches!(c, 'a'..='z' | '0'..='9' | '_' | ':' | '-')
}

/// `value.replace(/[^…]/g, "_")` for a class of BMP chars. Without the `u` flag the regex
/// matches each UTF-16 code unit, so a char outside the class becomes one `_` per unit.
pub fn replace_units(value: &str, keep: fn(char) -> bool) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        if keep(c) {
            out.push(c);
        } else {
            for _ in 0..c.len_utf16() {
                out.push('_');
            }
        }
    }
    out
}

/// `clipText(value || fallback, maxChars).toLowerCase().replace(/[^a-z0-9_:-]/g, "_")`.
pub fn slug(value: &str, max_chars: usize, fallback: &str) -> String {
    let base = if value.is_empty() { fallback } else { value };
    let clipped = clip_text(base, max_chars);
    replace_units(&js_lower(&clipped), is_slug_char)
}

/// Percent-escapes the bytes an HBP value may not carry raw, matching the field
/// decoder in `l0_edge::event` (model/l0-edge/src/event.rs:115-138).
pub fn escape_hbp(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        if c == '%' || c == '|' || c == '=' || c < ' ' || c == '\u{7f}' {
            out.push_str(&format!("%{:02X}", u32::from(c)));
        } else {
            out.push(c);
        }
    }
    out
}

/// `""`-is-falsy choice: the first value when non-empty, else the second (`a || b`).
pub fn or_str<'a>(first: &'a str, second: &'a str) -> &'a str {
    if first.is_empty() {
        second
    } else {
        first
    }
}

/// Drops an empty string to `None`, as the normalizers delete falsy fields.
pub fn non_empty(value: String) -> Option<String> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}
