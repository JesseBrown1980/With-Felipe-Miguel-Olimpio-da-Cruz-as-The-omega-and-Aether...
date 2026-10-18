//! JavaScript values as `JSON.parse` builds them, with `JSON.stringify`, `String(v)` and
//! truthiness on them. Strings are UTF-16 code units (lone surrogates allowed); numbers are
//! binary64 bit patterns.

use alloc::collections::BTreeMap;
use alloc::string::String;
use alloc::vec::Vec;
use core::fmt::Write;

use super::number;

/// A JavaScript string: UTF-16 code units, lone surrogates allowed.
pub type JsString = Vec<u16>;

/// Deepest array/object nesting the parser builds. Node parses deeper lines, but its own
/// `JSON.stringify` and `String` throw a RangeError somewhere between 1,000 and 5,000 levels.
pub const MAX_DEPTH: usize = 512;

/// A value `JSON.parse` returns.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Json {
    Null,
    Bool(bool),
    /// The binary64 bit pattern of the number.
    Number(u64),
    String(JsString),
    Array(Vec<Json>),
    /// Own properties in creation order. A repeated key keeps its first slot and takes the last
    /// value, as `JSON.parse` does.
    Object(Vec<(JsString, Json)>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ParseError {
    /// `JSON.parse` throws a SyntaxError.
    Syntax,
    /// Nested deeper than `MAX_DEPTH`; node would parse it.
    TooDeep,
}

/// A JavaScript TypeError the bridge would throw.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JsError {
    /// `String(o)` where `o` (or an element of an array being joined) is an object with an own
    /// `toString` key: a parsed value is never callable, so `ToPrimitive` throws.
    ToPrimitive,
    /// `.toLowerCase()` on a truthy verb or target that is not a string.
    NotAString,
}

/// `JSON.parse(text)`.
pub fn parse(text: &str) -> Result<Json, ParseError> {
    let mut p = Parser {
        text,
        b: text.as_bytes(),
        pos: 0,
    };
    p.ws();
    let v = p.value(0)?;
    p.ws();
    if p.pos == p.b.len() {
        Ok(v)
    } else {
        Err(ParseError::Syntax)
    }
}

struct Parser<'a> {
    text: &'a str,
    b: &'a [u8],
    pos: usize,
}

impl Parser<'_> {
    fn ws(&mut self) {
        while matches!(self.b.get(self.pos), Some(b' ' | b'\t' | b'\n' | b'\r')) {
            self.pos += 1;
        }
    }

    fn eat(&mut self, c: u8) -> bool {
        let hit = self.b.get(self.pos) == Some(&c);
        self.pos += usize::from(hit);
        hit
    }

    fn value(&mut self, depth: usize) -> Result<Json, ParseError> {
        match self.b.get(self.pos) {
            Some(b'{' | b'[') if depth == MAX_DEPTH => Err(ParseError::TooDeep),
            Some(b'{') => self.object(depth + 1),
            Some(b'[') => self.array(depth + 1),
            Some(b'"') => self.string().map(Json::String),
            Some(b't') => self.literal("true", Json::Bool(true)),
            Some(b'f') => self.literal("false", Json::Bool(false)),
            Some(b'n') => self.literal("null", Json::Null),
            Some(b'-' | b'0'..=b'9') => self.number(),
            _ => Err(ParseError::Syntax),
        }
    }

    fn literal(&mut self, word: &str, v: Json) -> Result<Json, ParseError> {
        if self.b[self.pos..].starts_with(word.as_bytes()) {
            self.pos += word.len();
            Ok(v)
        } else {
            Err(ParseError::Syntax)
        }
    }

    fn digits(&mut self) -> usize {
        let start = self.pos;
        while self.b.get(self.pos).is_some_and(u8::is_ascii_digit) {
            self.pos += 1;
        }
        self.pos - start
    }

    fn number(&mut self) -> Result<Json, ParseError> {
        let start = self.pos;
        self.eat(b'-');
        if !self.eat(b'0') && self.digits() == 0 {
            return Err(ParseError::Syntax);
        }
        if self.eat(b'.') && self.digits() == 0 {
            return Err(ParseError::Syntax);
        }
        if self.eat(b'e') || self.eat(b'E') {
            let _ = self.eat(b'+') || self.eat(b'-');
            if self.digits() == 0 {
                return Err(ParseError::Syntax);
            }
        }
        Ok(Json::Number(number::parse(&self.b[start..self.pos])))
    }

    fn hex4(&mut self) -> Result<u16, ParseError> {
        let mut u = 0u16;
        for _ in 0..4 {
            let d = match self.b.get(self.pos) {
                Some(c @ b'0'..=b'9') => c - b'0',
                Some(c @ b'a'..=b'f') => c - b'a' + 10,
                Some(c @ b'A'..=b'F') => c - b'A' + 10,
                _ => return Err(ParseError::Syntax),
            };
            u = (u << 4) | u16::from(d);
            self.pos += 1;
        }
        Ok(u)
    }

    fn string(&mut self) -> Result<JsString, ParseError> {
        self.pos += 1;
        let mut out = Vec::new();
        loop {
            let start = self.pos;
            while self
                .b
                .get(self.pos)
                .is_some_and(|&c| c != b'"' && c != b'\\' && c >= 0x20)
            {
                self.pos += 1;
            }
            out.extend(self.text[start..self.pos].encode_utf16());
            match self.b.get(self.pos) {
                Some(b'"') => {
                    self.pos += 1;
                    return Ok(out);
                }
                Some(b'\\') => {
                    self.pos += 1;
                    let unit = match self.b.get(self.pos) {
                        Some(b'"') => 0x22,
                        Some(b'\\') => 0x5c,
                        Some(b'/') => 0x2f,
                        Some(b'b') => 0x08,
                        Some(b'f') => 0x0c,
                        Some(b'n') => 0x0a,
                        Some(b'r') => 0x0d,
                        Some(b't') => 0x09,
                        Some(b'u') => {
                            self.pos += 1;
                            out.push(self.hex4()?);
                            continue;
                        }
                        _ => return Err(ParseError::Syntax),
                    };
                    self.pos += 1;
                    out.push(unit);
                }
                _ => return Err(ParseError::Syntax),
            }
        }
    }

    fn array(&mut self, depth: usize) -> Result<Json, ParseError> {
        self.pos += 1;
        let mut items = Vec::new();
        self.ws();
        if self.eat(b']') {
            return Ok(Json::Array(items));
        }
        loop {
            items.push(self.value(depth)?);
            self.ws();
            if self.eat(b']') {
                return Ok(Json::Array(items));
            }
            if !self.eat(b',') {
                return Err(ParseError::Syntax);
            }
            self.ws();
        }
    }

    fn object(&mut self, depth: usize) -> Result<Json, ParseError> {
        self.pos += 1;
        let mut entries: Vec<(JsString, Json)> = Vec::new();
        let mut slots: BTreeMap<JsString, usize> = BTreeMap::new();
        self.ws();
        if self.eat(b'}') {
            return Ok(Json::Object(entries));
        }
        loop {
            if self.b.get(self.pos) != Some(&b'"') {
                return Err(ParseError::Syntax);
            }
            let key = self.string()?;
            self.ws();
            if !self.eat(b':') {
                return Err(ParseError::Syntax);
            }
            self.ws();
            let v = self.value(depth)?;
            match slots.get(&key) {
                Some(&slot) => entries[slot].1 = v,
                None => {
                    slots.insert(key.clone(), entries.len());
                    entries.push((key, v));
                }
            }
            self.ws();
            if self.eat(b'}') {
                return Ok(Json::Object(entries));
            }
            if !self.eat(b',') {
                return Err(ParseError::Syntax);
            }
            self.ws();
        }
    }
}

fn units_eq(units: &[u16], s: &str) -> bool {
    units.iter().copied().eq(s.encode_utf16())
}

impl Json {
    /// `v[key]` for an own property; `None` is `undefined` (also for every non-object, since no
    /// prototype the bridge reaches has the keys it reads).
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Object(entries) => entries
                .iter()
                .find(|(k, _)| units_eq(k, key))
                .map(|(_, v)| v),
            _ => None,
        }
    }
}

/// JavaScript truthiness; `None` is `undefined`.
pub fn truthy(v: Option<&Json>) -> bool {
    match v {
        None | Some(Json::Null) => false,
        Some(Json::Bool(b)) => *b,
        Some(Json::Number(bits)) => !number::is_zero(*bits),
        Some(Json::String(s)) => !s.is_empty(),
        Some(Json::Array(_) | Json::Object(_)) => true,
    }
}

/// `a || b`.
pub fn or<'a>(a: Option<&'a Json>, b: Option<&'a Json>) -> Option<&'a Json> {
    if truthy(a) {
        a
    } else {
        b
    }
}

/// `String(v)`.
pub fn js_string(v: &Json) -> Result<JsString, JsError> {
    Ok(match v {
        Json::Null => "null".encode_utf16().collect(),
        Json::Bool(b) => (if *b { "true" } else { "false" }).encode_utf16().collect(),
        Json::Number(bits) => number::to_js_string(*bits).encode_utf16().collect(),
        Json::String(s) => s.clone(),
        Json::Array(items) => {
            let mut out = Vec::new();
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(u16::from(b','));
                }
                if *item != Json::Null {
                    out.extend(js_string(item)?);
                }
            }
            out
        }
        Json::Object(_) if v.get("toString").is_some() => return Err(JsError::ToPrimitive),
        Json::Object(_) => "[object Object]".encode_utf16().collect(),
    })
}

/// UTF-8 of a JavaScript string as node writes it: a lone surrogate becomes U+FFFD.
pub fn to_utf8_lossy(units: &[u16]) -> String {
    char::decode_utf16(units.iter().copied())
        .map(|r| r.unwrap_or(char::REPLACEMENT_CHARACTER))
        .collect()
}

/// Canonical decimal of an integer `0..=2^32-2`: an array index, which `JSON.stringify` (via
/// `OrdinaryOwnPropertyKeys`) lists first, in ascending order.
fn array_index(key: &[u16]) -> Option<u32> {
    if key.is_empty() || key.len() > 10 || (key.len() > 1 && key[0] == u16::from(b'0')) {
        return None;
    }
    let mut n = 0u64;
    for &u in key {
        if !(u16::from(b'0')..=u16::from(b'9')).contains(&u) {
            return None;
        }
        n = n * 10 + u64::from(u - u16::from(b'0'));
    }
    u32::try_from(n).ok().filter(|&n| n != u32::MAX)
}

fn quote(s: &[u16], out: &mut String) {
    out.push('"');
    let mut i = 0;
    while i < s.len() {
        let u = s[i];
        match u {
            0x22 => out.push_str("\\\""),
            0x5c => out.push_str("\\\\"),
            0x08 => out.push_str("\\b"),
            0x0c => out.push_str("\\f"),
            0x0a => out.push_str("\\n"),
            0x0d => out.push_str("\\r"),
            0x09 => out.push_str("\\t"),
            0xd800..=0xdbff if s.get(i + 1).is_some_and(|n| (0xdc00..=0xdfff).contains(n)) => {
                out.extend(char::decode_utf16([u, s[i + 1]]).map(|r| r.unwrap_or_default()));
                i += 1;
            }
            0..=0x1f | 0xd800..=0xdfff => {
                let _ = write!(out, "\\u{u:04x}");
            }
            _ => out.push(char::from_u32(u32::from(u)).unwrap_or_default()),
        }
        i += 1;
    }
    out.push('"');
}

fn stringify_into(v: &Json, out: &mut String) {
    match v {
        Json::Null => out.push_str("null"),
        Json::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Json::Number(bits) if number::is_finite(*bits) => {
            out.push_str(&number::to_js_string(*bits))
        }
        Json::Number(_) => out.push_str("null"),
        Json::String(s) => quote(s, out),
        Json::Array(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                stringify_into(item, out);
            }
            out.push(']');
        }
        Json::Object(entries) => {
            let mut order: Vec<(Option<u32>, usize)> = entries
                .iter()
                .enumerate()
                .map(|(i, (k, _))| (array_index(k), i))
                .collect();
            // Indices first by value, then the other keys in creation order.
            order.sort_by_key(|&(index, i)| match index {
                Some(n) => (0, u64::from(n)),
                None => (1, i as u64),
            });
            out.push('{');
            for (n, &(_, i)) in order.iter().enumerate() {
                if n > 0 {
                    out.push(',');
                }
                quote(&entries[i].0, out);
                out.push(':');
                stringify_into(&entries[i].1, out);
            }
            out.push('}');
        }
    }
}

/// `JSON.stringify(v)` (well-formed: lone surrogates escaped, so the result is valid UTF-8).
pub fn stringify(v: &Json) -> String {
    let mut out = String::new();
    stringify_into(v, &mut out);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(text: &str) -> JsString {
        text.encode_utf16().collect()
    }

    fn round_trip(text: &str) -> String {
        stringify(&parse(text).expect("parses"))
    }

    #[test]
    fn parse_follows_the_json_grammar() {
        for bad in [
            "",
            " ",
            "{",
            "[1,]",
            "{\"a\":1,}",
            "01",
            "[01]",
            "-",
            "1.",
            ".5",
            "1e",
            "+1",
            "tru",
            "nul",
            "'a'",
            "\"a",
            "\"\\x\"",
            "\"\\u00\"",
            "\"\\u00g0\"",
            "\"tab\there\"",
            "{a:1}",
            "[1 2]",
            "\u{feff}{}",
            "\u{a0}{}",
            "{}x",
            "NaN",
            "Infinity",
        ] {
            assert_eq!(parse(bad), Err(ParseError::Syntax), "{bad:?}");
        }
        assert_eq!(parse(" \t\r\n{} \r"), Ok(Json::Object(Vec::new())));
        assert_eq!(parse("\"\\u0041\\/\""), Ok(Json::String(s("A/"))));
        assert_eq!(parse("\"\\ud800\""), Ok(Json::String(alloc::vec![0xd800])));
        assert_eq!(parse("-0"), Ok(Json::Number(1 << 63)));
    }

    #[test]
    fn nesting_past_max_depth_is_refused_not_misread() {
        let ok = alloc::format!("{}{}", "[".repeat(MAX_DEPTH), "]".repeat(MAX_DEPTH));
        assert!(parse(&ok).is_ok());
        let deep = alloc::format!("{}{}", "[".repeat(MAX_DEPTH + 1), "]".repeat(MAX_DEPTH + 1));
        assert_eq!(parse(&deep), Err(ParseError::TooDeep));
    }

    #[test]
    fn stringify_matches_node() {
        // Expected strings printed by node 22.22.0's JSON.stringify(JSON.parse(input)).
        assert_eq!(
            round_trip(
                r#"{"b":1,"4294967295":2,"4294967294":3,"1":4,"01":5,"-1":6,"a":7,"b":8,"0":9}"#
            ),
            r#"{"0":9,"1":4,"4294967294":3,"b":8,"4294967295":2,"01":5,"-1":6,"a":7}"#
        );
        assert_eq!(
            round_trip(r#"{"__proto__":1,"toJSON":2,"toString":3}"#),
            r#"{"__proto__":1,"toJSON":2,"toString":3}"#
        );
        assert_eq!(
            round_trip("[1e400,-1e400,-0,0.0,1e-400,1e21,1e-7,0.1,5e-324]"),
            "[null,null,0,0,0,1e+21,1e-7,0.1,5e-324]"
        );
        assert_eq!(
            round_trip(r#""\ud800\udc00\ud800x\udc00\u2028\u007f\u0000\u001f\b\f\n\r\t\"\\\/""#),
            "\"\u{10000}\\ud800x\\udc00\u{2028}\u{7f}\\u0000\\u001f\\b\\f\\n\\r\\t\\\"\\\\/\""
        );
        assert_eq!(
            round_trip("[true,false,null,[],{}]"),
            "[true,false,null,[],{}]"
        );
    }

    #[test]
    fn js_string_matches_node() {
        let v = parse(r#"[1,null,[2,[3,null]],{"a":1},true,"x",-0,1e21]"#).unwrap();
        assert_eq!(
            js_string(&v),
            Ok(s("1,,2,3,,[object Object],true,x,0,1e+21"))
        );
        let o = parse(r#"{"valueOf":1}"#).unwrap();
        assert_eq!(js_string(&o), Ok(s("[object Object]")));
        let bad = parse(r#"{"toString":1}"#).unwrap();
        assert_eq!(js_string(&bad), Err(JsError::ToPrimitive));
        let nested = parse(r#"[{"toString":"x"}]"#).unwrap();
        assert_eq!(js_string(&nested), Err(JsError::ToPrimitive));
        assert_eq!(js_string(&Json::Bool(false)), Ok(s("false")));
        assert_eq!(js_string(&Json::Array(Vec::new())), Ok(Vec::new()));
    }

    #[test]
    fn duplicate_keys_keep_the_first_slot_and_the_last_value() {
        let v = parse(r#"{"id":"first","x":1,"id":"second"}"#).unwrap();
        assert_eq!(v.get("id"), Some(&Json::String(s("second"))));
        assert_eq!(stringify(&v), r#"{"id":"second","x":1}"#);
    }

    #[test]
    fn truthiness() {
        for (text, t) in [
            ("null", false),
            ("false", false),
            ("0", false),
            ("-0", false),
            ("1e-400", false),
            ("\"\"", false),
            ("true", true),
            ("1", true),
            ("\"0\"", true),
            ("[]", true),
            ("{}", true),
        ] {
            assert_eq!(truthy(Some(&parse(text).unwrap())), t, "{text}");
        }
        assert!(!truthy(None));
    }

    #[test]
    fn lone_surrogates_become_replacement_characters_in_utf8() {
        assert_eq!(
            to_utf8_lossy(&[0x61, 0xd83d, 0xde00, 0xd83d, 0x62]),
            "a\u{1f600}\u{fffd}b"
        );
    }
}
