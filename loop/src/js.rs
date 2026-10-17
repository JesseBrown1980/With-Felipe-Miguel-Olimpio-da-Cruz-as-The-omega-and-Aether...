//! ECMAScript string operations that the upstream lines rely on, reproduced on Rust `&str`.
//!
//! JavaScript strings are UTF-16: `slice` and `charCodeAt` count UTF-16 code units, `trim` strips the
//! ECMAScript WhiteSpace and LineTerminator code points, and `JSON.stringify` of a string returns its
//! quoted literal. Node's `createHash().update(string)` and `appendFileSync` write a string as UTF-8,
//! encoding an unpaired surrogate as U+FFFD.

use std::fmt::Write;

/// `JSON.stringify(s)` for a string value (ECMA-262 QuoteJSONString). It quotes one string and parses
/// nothing; a Rust `&str` holds no unpaired surrogate, so the `\uDXXX` branch of the algorithm never applies.
pub fn json_quote(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if u32::from(c) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", u32::from(c));
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// `String(s).slice(0, n)` as Node writes it to UTF-8: the first `n` UTF-16 code units. When the cut
/// splits a surrogate pair, the kept high surrogate is written as U+FFFD.
pub fn utf16_prefix(s: &str, n: usize) -> String {
    let mut out = String::new();
    let mut units = 0usize;
    for c in s.chars() {
        let width = c.len_utf16();
        if units + width > n {
            if units < n {
                out.push('\u{FFFD}');
            }
            break;
        }
        out.push(c);
        units += width;
    }
    out
}

/// ECMAScript WhiteSpace (TAB, VT, FF, ZWNBSP, category Zs) and LineTerminator (LF, CR, LS, PS) code
/// points, the set `String.prototype.trim` strips.
pub fn is_js_whitespace(c: char) -> bool {
    const SINGLES: [char; 14] = [
        '\u{9}', '\u{A}', '\u{B}', '\u{C}', '\u{D}', '\u{20}', '\u{A0}', '\u{1680}', '\u{2028}',
        '\u{2029}', '\u{202F}', '\u{205F}', '\u{3000}', '\u{FEFF}',
    ];
    SINGLES.contains(&c) || ('\u{2000}'..='\u{200A}').contains(&c)
}

/// `String(s).trim()`.
pub fn js_trim(s: &str) -> &str {
    s.trim_matches(is_js_whitespace)
}
