//! The JavaScript string rules the upstream lines use: the `\s` / `trim()` whitespace set, `.length` in
//! UTF-16 code units, `toLowerCase()`, and the `||` fallback that treats `""` as absent.

/// ECMAScript `WhiteSpace` and `LineTerminator`: the set `/\s/` matches and `String.prototype.trim` removes.
/// It holds U+FEFF and not U+0085, unlike Rust's `char::is_whitespace`.
pub fn is_js_whitespace(c: char) -> bool {
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

/// `str.trim()`.
pub fn js_trim(s: &str) -> &str {
    s.trim_matches(is_js_whitespace)
}

/// `str.split(/\s+/)` with the empty pieces dropped (every caller here filters them by length).
pub fn js_words(s: &str) -> impl Iterator<Item = &str> {
    s.split(is_js_whitespace).filter(|w| !w.is_empty())
}

/// `str.length`: the UTF-16 code-unit count.
pub fn utf16_len(s: &str) -> usize {
    s.chars().map(char::len_utf16).sum()
}

/// `str.toLowerCase()`, with Rust 1.81's Unicode 15.1 case tables; V8 uses its ICU's tables, which can be a
/// later Unicode version for characters added since.
pub fn js_lower(s: &str) -> String {
    s.to_lowercase()
}

/// `value || fallback` for a string option: `None` and `""` both take the fallback.
pub fn or_js<'a>(value: Option<&'a str>, fallback: &'a str) -> &'a str {
    match value {
        Some(v) if !v.is_empty() => v,
        _ => fallback,
    }
}

/// The string when it is truthy (`Some` and not `""`).
pub fn truthy(value: Option<&str>) -> Option<&str> {
    value.filter(|v| !v.is_empty())
}
