//! JavaScript values as the upstream planes receive them (bus tuples, gate requests, inbox
//! envelopes), with the language operations those planes apply to them: truthiness, own-property
//! reads, `String(v)`, `Number(v)`, SameValueZero, `>` and `JSON.stringify` of a string.
//!
//! A number is held as `String(x)` of the JavaScript number, so equality and ordering of two
//! numbers are exact without binary arithmetic. Strings are Rust strings (Unicode scalar values),
//! so a JavaScript string with an unpaired surrogate is outside this model.

use core::cmp::Ordering;

mod binary64;

use binary64::Magnitude;

/// A JavaScript value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JsValue {
    /// `undefined`
    Undefined,
    /// `null`
    Null,
    /// `true` / `false`
    Bool(bool),
    /// A number, held as `String(x)`.
    Number(JsNumber),
    /// A string.
    String(String),
    /// An array. Two arrays are never the same value (each JSON-decoded array is a new object).
    Array(Vec<JsValue>),
    /// A plain object with its own enumerable properties in insertion order.
    Object(JsObject),
}

static UNDEFINED: JsValue = JsValue::Undefined;

/// A finite or non-finite JavaScript number, held as the string `String(x)` returns for it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JsNumber(String);

/// A plain object: own enumerable string-keyed properties, keys unique, insertion order kept.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct JsObject {
    entries: Vec<(String, JsValue)>,
}

/// Two entries of one object share a key.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DuplicateKey(pub String);

impl JsNumber {
    /// The integer `n`; `None` when `|n| > 2^53`, where not every integer is a binary64 value.
    pub fn int(n: i64) -> Option<JsNumber> {
        (n.unsigned_abs() <= 1 << 53).then(|| JsNumber(n.to_string()))
    }

    /// A number from its `String(x)` text. Refuses every text that `Number.prototype.toString`
    /// does not return: another digit layout (trailing fraction zeros, more than 17 significant
    /// digits, exponent form outside `e+21..` and `..e-7`), and text whose binary64 value prints
    /// differently (`0.10000000000000001` is the binary64 value printed `0.1`).
    pub fn from_text(text: &str) -> Option<JsNumber> {
        (is_number_text(text) && is_shortest_text(text)).then(|| JsNumber(text.to_string()))
    }

    /// `String(x)`.
    pub fn text(&self) -> &str {
        &self.0
    }

    fn is_falsy(&self) -> bool {
        self.0 == "0" || self.0 == "NaN"
    }

    fn is_finite(&self) -> bool {
        !matches!(self.0.as_str(), "NaN" | "Infinity" | "-Infinity")
    }
}

impl JsObject {
    /// An object from `(key, value)` pairs in insertion order; keys must be unique.
    pub fn new(entries: Vec<(String, JsValue)>) -> Result<JsObject, DuplicateKey> {
        for (i, (key, _)) in entries.iter().enumerate() {
            if entries[..i].iter().any(|(k, _)| k == key) {
                return Err(DuplicateKey(key.clone()));
            }
        }
        Ok(JsObject { entries })
    }

    /// The own property `key`.
    pub fn get(&self, key: &str) -> Option<&JsValue> {
        self.entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    /// `(key, value)` pairs in insertion order.
    pub fn entries(&self) -> &[(String, JsValue)] {
        &self.entries
    }
}

impl JsValue {
    /// A string value.
    pub fn str(s: &str) -> JsValue {
        JsValue::String(s.to_string())
    }

    /// The integer `n` (`|n| <= 2^53`).
    pub fn int(n: i64) -> JsValue {
        JsValue::Number(JsNumber::int(n).expect("integer of magnitude at most 2^53"))
    }

    /// An object from `(key, value)` pairs (keys unique; panics otherwise).
    pub fn object(entries: Vec<(&str, JsValue)>) -> JsValue {
        let entries = entries
            .into_iter()
            .map(|(k, v)| (k.to_string(), v))
            .collect();
        JsValue::Object(JsObject::new(entries).expect("unique keys"))
    }

    /// `!!v`.
    pub fn truthy(&self) -> bool {
        match self {
            JsValue::Undefined | JsValue::Null => false,
            JsValue::Bool(b) => *b,
            JsValue::Number(n) => !n.is_falsy(),
            JsValue::String(s) => !s.is_empty(),
            JsValue::Array(_) | JsValue::Object(_) => true,
        }
    }

    /// `v == null` (undefined or null), the operand test of `??` and `?.`.
    pub fn is_nullish(&self) -> bool {
        matches!(self, JsValue::Undefined | JsValue::Null)
    }

    /// `typeof v === 'object' && v !== null`: arrays and objects.
    pub fn is_object_like(&self) -> bool {
        matches!(self, JsValue::Array(_) | JsValue::Object(_))
    }

    /// `v.key` / `v?.key` for the property names the planes read (none of them is `length`, an
    /// array index or an `Object.prototype` member): an object's own property, else `undefined`.
    /// Reading a property of `null` or `undefined` without `?.` throws upstream; callers check
    /// [`JsValue::is_nullish`] where that matters.
    pub fn get(&self, key: &str) -> &JsValue {
        match self {
            JsValue::Object(o) => o.get(key).unwrap_or(&UNDEFINED),
            _ => &UNDEFINED,
        }
    }

    /// `a || b`.
    pub fn or<'a>(&'a self, other: &'a JsValue) -> &'a JsValue {
        if self.truthy() {
            self
        } else {
            other
        }
    }

    /// `a ?? b`.
    pub fn nullish_or<'a>(&'a self, other: &'a JsValue) -> &'a JsValue {
        if self.is_nullish() {
            other
        } else {
            self
        }
    }

    /// `v === s` for a string `s`.
    pub fn is_str(&self, s: &str) -> bool {
        matches!(self, JsValue::String(x) if x == s)
    }

    /// `Array.isArray(v) && v.includes(s)` for a string `s` (SameValueZero).
    pub fn array_includes_str(&self, s: &str) -> bool {
        matches!(self, JsValue::Array(items) if items.iter().any(|item| item.is_str(s)))
    }

    /// `String(v)`.
    pub fn to_js_string(&self) -> String {
        match self {
            JsValue::Undefined => "undefined".to_string(),
            JsValue::Null => "null".to_string(),
            JsValue::Bool(b) => b.to_string(),
            JsValue::Number(n) => n.0.clone(),
            JsValue::String(s) => s.clone(),
            // Array.prototype.join: null and undefined elements become "".
            JsValue::Array(items) => items
                .iter()
                .map(|item| {
                    if item.is_nullish() {
                        String::new()
                    } else {
                        item.to_js_string()
                    }
                })
                .collect::<Vec<_>>()
                .join(","),
            JsValue::Object(_) => "[object Object]".to_string(),
        }
    }

    /// SameValueZero (`Set.prototype.has`, `includes`): arrays and objects are never equal, as
    /// two JSON-decoded objects are two references.
    pub fn same_value_zero(&self, other: &JsValue) -> bool {
        match (self, other) {
            (JsValue::Undefined, JsValue::Undefined) | (JsValue::Null, JsValue::Null) => true,
            (JsValue::Bool(a), JsValue::Bool(b)) => a == b,
            (JsValue::Number(a), JsValue::Number(b)) => a == b,
            (JsValue::String(a), JsValue::String(b)) => a == b,
            _ => false,
        }
    }
}

/// Why a JavaScript operation lies outside this port's domain.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DomainError {
    /// `a > b` where the operands are not both strings or both numbers.
    MixedComparison,
    /// `Number(v) || 0` is not an integer of magnitude at most 2^53.
    NotSafeInteger(String),
}

/// `a > b` for two strings (UTF-16 code unit order) or two numbers.
pub fn js_greater(a: &JsValue, b: &JsValue) -> Result<bool, DomainError> {
    match (a, b) {
        (JsValue::String(x), JsValue::String(y)) => {
            Ok(x.encode_utf16().cmp(y.encode_utf16()) == Ordering::Greater)
        }
        (JsValue::Number(x), JsValue::Number(y)) => Ok(cmp_num(
            &string_to_number(x.text()),
            &string_to_number(y.text()),
        ) == Some(Ordering::Greater)),
        _ => Err(DomainError::MixedComparison),
    }
}

/// `v <= 1` (ToNumber, then binary64 comparison with 1; NaN gives false).
pub fn le_one(v: &JsValue) -> bool {
    match to_number(v) {
        Num::NaN => false,
        Num::Infinite { neg } => neg,
        // ToNumber rounds to binary64, ties to even; the doubles at or below 1 are exactly the
        // decimals at or below 1 + 2^-53.
        Num::Finite(d) => d.cmp(&Decimal::one_plus_half_ulp()) != Ordering::Greater,
    }
}

/// `Number(v) || 0` as an integer: ToNumber rounds to binary64 (ties to even), then `NaN` and
/// `±0` give 0. A binary64 value that is not an integer of magnitude at most 2^53 is refused.
pub fn number_or_zero(v: &JsValue) -> Result<i64, DomainError> {
    let refused = || DomainError::NotSafeInteger(v.to_js_string());
    match to_number(v) {
        Num::NaN => Ok(0),
        Num::Infinite { .. } => Err(refused()),
        Num::Finite(d) => match binary64::round(&d) {
            Magnitude::Finite(m, e) => binary64::safe_integer(m, e)
                .map(|n| if d.neg { -n } else { n })
                .ok_or_else(refused),
            Magnitude::Infinite => Err(refused()),
        },
    }
}

/// `JSON.stringify(s)` of a string (ECMA-262 QuoteJSONString).
pub fn quote_json_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '\u{8}' => out.push_str("\\b"),
            '\t' => out.push_str("\\t"),
            '\n' => out.push_str("\\n"),
            '\u{c}' => out.push_str("\\f"),
            '\r' => out.push_str("\\r"),
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            c if u32::from(c) < 0x20 => out.push_str(&format!("\\u{:04x}", u32::from(c))),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// `JSON.stringify(x)` of a number: `String(x)`, or `null` when not finite.
pub fn json_number(n: &JsNumber) -> String {
    if n.is_finite() {
        n.0.clone()
    } else {
        "null".to_string()
    }
}

fn is_number_text(text: &str) -> bool {
    if matches!(text, "0" | "NaN" | "Infinity" | "-Infinity") {
        return true;
    }
    let body = text.strip_prefix('-').unwrap_or(text);
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let (mantissa, exponent) = match body.split_once('e') {
        Some((m, e)) => (m, Some(e)),
        None => (body, None),
    };
    let (int_part, frac_part) = match mantissa.split_once('.') {
        Some((i, f)) => (i, Some(f)),
        None => (mantissa, None),
    };
    if !digits(int_part) {
        return false;
    }
    if let Some(f) = frac_part {
        if !digits(f) || f.ends_with('0') {
            return false;
        }
    }
    let frac_len = frac_part.map_or(0, str::len);
    match exponent {
        Some(e) => {
            let (sign, n) = match e.as_bytes().first() {
                Some(b'+') => ("+", &e[1..]),
                Some(b'-') => ("-", &e[1..]),
                _ => return false,
            };
            if int_part.len() != 1 || int_part == "0" || !digits(n) || n.starts_with('0') {
                return false;
            }
            let Ok(n) = n.parse::<u32>() else {
                return false;
            };
            frac_len < 17
                && if sign == "+" {
                    (21..=308).contains(&n)
                } else {
                    (7..=324).contains(&n)
                }
        }
        None if int_part == "0" => {
            let Some(f) = frac_part else {
                return false;
            };
            let zeros = f.len() - f.trim_start_matches('0').len();
            zeros <= 5 && f.len() - zeros <= 17
        }
        None => {
            let significant = match frac_part {
                Some(f) => int_part.len() + f.len(),
                None => int_part.trim_end_matches('0').len(),
            };
            !int_part.starts_with('0') && int_part.len() <= 21 && significant <= 17
        }
    }
}

/// `text` (laid out as [`is_number_text`] accepts) is `String(x)` of the binary64 value `x` it
/// rounds to.
fn is_shortest_text(text: &str) -> bool {
    if matches!(text, "0" | "NaN" | "Infinity" | "-Infinity") {
        return true;
    }
    let Num::Finite(d) = string_to_number(text) else {
        return false;
    };
    match binary64::round(&d) {
        Magnitude::Finite(m, e) if m != 0 => {
            binary64::number_text(d.neg, &binary64::shortest(m, e)) == text
        }
        _ => false,
    }
}

/// An exact decimal `±digits × 10^exp`; `digits` has no leading or trailing zeros, and is empty
/// for zero (whose sign is dropped, as `+0` and `-0` compare equal).
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct Decimal {
    neg: bool,
    digits: Vec<u8>,
    exp: i64,
}

/// The exponents a decimal literal can reach are clamped here; beyond it every comparison the
/// planes make is already decided.
const EXP_CLAMP: i64 = 1 << 40;

impl Decimal {
    fn new(neg: bool, mut digits: Vec<u8>, mut exp: i64) -> Decimal {
        let leading = digits.iter().take_while(|&&d| d == 0).count();
        digits.drain(..leading);
        while digits.last() == Some(&0) {
            digits.pop();
            exp += 1;
        }
        let neg = neg && !digits.is_empty();
        Decimal { neg, digits, exp }
    }

    fn one_plus_half_ulp() -> Decimal {
        // 1 + 2^-53 = 1.00000000000000011102230246251565404236316680908203125
        let text = "100000000000000011102230246251565404236316680908203125";
        Decimal::new(false, text.bytes().map(|b| b - b'0').collect(), -53)
    }

    fn cmp_abs(&self, other: &Decimal) -> Ordering {
        match (self.digits.is_empty(), other.digits.is_empty()) {
            (true, true) => return Ordering::Equal,
            (true, false) => return Ordering::Less,
            (false, true) => return Ordering::Greater,
            (false, false) => {}
        }
        let order = |d: &Decimal| d.digits.len() as i64 + d.exp;
        order(self)
            .cmp(&order(other))
            .then_with(|| self.digits.cmp(&other.digits))
    }

    fn cmp(&self, other: &Decimal) -> Ordering {
        match (self.neg, other.neg) {
            (false, true) => Ordering::Greater,
            (true, false) => Ordering::Less,
            (false, false) => self.cmp_abs(other),
            (true, true) => other.cmp_abs(self),
        }
    }
}

/// The exact value of `Number(v)` before rounding to binary64.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum Num {
    NaN,
    Infinite { neg: bool },
    Finite(Decimal),
}

fn cmp_num(a: &Num, b: &Num) -> Option<Ordering> {
    let rank = |n: &Num| match n {
        Num::Infinite { neg: true } => 0,
        Num::Finite(_) => 1,
        Num::Infinite { neg: false } => 2,
        Num::NaN => 3,
    };
    match (a, b) {
        (Num::NaN, _) | (_, Num::NaN) => None,
        (Num::Finite(x), Num::Finite(y)) => Some(x.cmp(y)),
        _ => Some(rank(a).cmp(&rank(b))),
    }
}

/// ECMA-262 ToNumber.
pub(crate) fn to_number(v: &JsValue) -> Num {
    match v {
        JsValue::Undefined => Num::NaN,
        JsValue::Null => Num::Finite(Decimal::new(false, Vec::new(), 0)),
        JsValue::Bool(b) => Num::Finite(Decimal::new(false, vec![u8::from(*b)], 0)),
        JsValue::Number(n) => string_to_number(n.text()),
        JsValue::String(s) => string_to_number(s),
        // ToPrimitive with hint number: valueOf returns the object itself, so toString is used.
        JsValue::Array(_) | JsValue::Object(_) => string_to_number(&v.to_js_string()),
    }
}

/// StrWhiteSpaceChar: WhiteSpace and LineTerminator (ECMA-262 12.2, 12.3).
fn is_js_space(c: char) -> bool {
    matches!(
        c,
        '\u{9}' | '\u{a}' | '\u{b}' | '\u{c}' | '\u{d}' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
    )
}

fn radix_digits(text: &str, radix: u32) -> Option<Vec<u8>> {
    if text.is_empty() {
        return None;
    }
    // Base-10 big integer: digits, most significant first.
    let mut value: Vec<u8> = Vec::new();
    for c in text.chars() {
        let mut carry = c.to_digit(radix)?;
        for d in value.iter_mut().rev() {
            let t = u32::from(*d) * radix + carry;
            *d = (t % 10) as u8;
            carry = t / 10;
        }
        while carry > 0 {
            value.insert(0, (carry % 10) as u8);
            carry /= 10;
        }
    }
    Some(value)
}

/// ECMA-262 StringToNumber (StringNumericLiteral), exact.
pub(crate) fn string_to_number(s: &str) -> Num {
    let t = s.trim_matches(is_js_space);
    if t.is_empty() {
        return Num::Finite(Decimal::new(false, Vec::new(), 0));
    }
    let lower2 = t.get(..2).map(str::to_ascii_lowercase);
    if let Some(radix) = match lower2.as_deref() {
        Some("0x") => Some(16),
        Some("0o") => Some(8),
        Some("0b") => Some(2),
        _ => None,
    } {
        return match radix_digits(&t[2..], radix) {
            Some(digits) => Num::Finite(Decimal::new(false, digits, 0)),
            None => Num::NaN,
        };
    }
    let (neg, unsigned) = match t.as_bytes()[0] {
        b'-' => (true, &t[1..]),
        b'+' => (false, &t[1..]),
        _ => (false, t),
    };
    if unsigned == "Infinity" {
        return Num::Infinite { neg };
    }
    let (mantissa, exponent) = match unsigned.find(['e', 'E']) {
        Some(i) => (&unsigned[..i], Some(&unsigned[i + 1..])),
        None => (unsigned, None),
    };
    let (int_part, frac_part) = match mantissa.split_once('.') {
        Some((i, f)) => (i, f),
        None => (mantissa, ""),
    };
    let all_digits = |x: &str| x.bytes().all(|b| b.is_ascii_digit());
    if (int_part.is_empty() && frac_part.is_empty())
        || !all_digits(int_part)
        || !all_digits(frac_part)
    {
        return Num::NaN;
    }
    let exp = match exponent {
        None => 0,
        Some(e) => {
            let (e_neg, e_digits) = match e.as_bytes().first() {
                Some(b'-') => (true, &e[1..]),
                Some(b'+') => (false, &e[1..]),
                _ => (false, e),
            };
            if e_digits.is_empty() || !all_digits(e_digits) {
                return Num::NaN;
            }
            let mut value: i64 = 0;
            for b in e_digits.bytes() {
                value = (value * 10 + i64::from(b - b'0')).min(EXP_CLAMP);
            }
            if e_neg {
                -value
            } else {
                value
            }
        }
    };
    let digits: Vec<u8> = int_part
        .bytes()
        .chain(frac_part.bytes())
        .map(|b| b - b'0')
        .collect();
    Num::Finite(Decimal::new(neg, digits, exp - frac_part.len() as i64))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn n(text: &str) -> JsValue {
        JsValue::Number(JsNumber::from_text(text).expect("number text"))
    }

    #[test]
    fn number_texts_follow_number_to_string() {
        for ok in [
            "0",
            "1",
            "-1",
            "0.5",
            "123.25",
            "1e+21",
            "1.5e-7",
            "0.000001",
            "NaN",
            "-Infinity",
            "100000000000000000000",
            "5e-324",
            "1.7976931348623157e+308",
        ] {
            assert!(JsNumber::from_text(ok).is_some(), "{ok}");
        }
        for bad in [
            "",
            "-0",
            "01",
            "1.0",
            "1e21",
            "1e+20",
            "0.0000001",
            "1.5E-7",
            "+1",
            ".5",
            "1.",
            "1000000000000000000000",
            "0.123456789012345678",
            "x",
            // Texts of binary64 values that String(x) prints otherwise.
            "0.10000000000000001",
            "12345678901234567",
            "1.0000000000000001",
            "9007199254740993",
            "4e-324",
        ] {
            assert!(JsNumber::from_text(bad).is_none(), "{bad}");
        }
    }

    #[test]
    fn to_number_and_le_one_follow_the_specification() {
        let cases = [
            (JsValue::Undefined, false),
            (JsValue::Null, true),
            (JsValue::Bool(true), true),
            (n("2"), false),
            (n("1"), true),
            (JsValue::str(" 1 "), true),
            (
                JsValue::str("1.00000000000000011102230246251565404236316680908203125"),
                true,
            ),
            (
                JsValue::str("1.00000000000000011102230246251565404236316680908203126"),
                false,
            ),
            (JsValue::str("0x1"), true),
            (JsValue::str("0x2"), false),
            (JsValue::str("-0x1"), false),
            (JsValue::str(""), true),
            (JsValue::str("abc"), false),
            (JsValue::str("-Infinity"), true),
            (JsValue::str("1e400"), false),
            (JsValue::Array(vec![n("1")]), true),
            (JsValue::Array(vec![n("1"), n("2")]), false),
            (JsValue::object(vec![]), false),
        ];
        for (value, want) in cases {
            assert_eq!(le_one(&value), want, "{value:?}");
        }
    }

    #[test]
    fn number_or_zero_takes_the_binary64_value() {
        assert_eq!(number_or_zero(&JsValue::Undefined), Ok(0));
        assert_eq!(number_or_zero(&JsValue::str("abc")), Ok(0));
        assert_eq!(number_or_zero(&JsValue::str(" 0x10 ")), Ok(16));
        assert_eq!(number_or_zero(&n("-12")), Ok(-12));
        assert_eq!(
            number_or_zero(&JsValue::str("9007199254740992")),
            Ok(1 << 53)
        );
        // Number() rounds first: 2^53 + 1 is 2^53, 1e-400 is 0, 0.99999999999999999 is 1.
        assert_eq!(
            number_or_zero(&JsValue::str("9007199254740993")),
            Ok(1 << 53)
        );
        assert_eq!(
            number_or_zero(&JsValue::str("-9007199254740993")),
            Ok(-(1 << 53))
        );
        assert_eq!(number_or_zero(&JsValue::str("1e-400")), Ok(0));
        assert_eq!(number_or_zero(&JsValue::str("-1e-400")), Ok(0));
        assert_eq!(number_or_zero(&JsValue::str("0.99999999999999999")), Ok(1));
        assert!(number_or_zero(&n("1.5")).is_err());
        assert!(number_or_zero(&JsValue::str("9007199254740995")).is_err());
        assert!(number_or_zero(&JsValue::str("2.5e-324")).is_err());
        assert!(number_or_zero(&n("Infinity")).is_err());
    }

    #[test]
    fn greater_compares_strings_by_utf16_code_units() {
        // U+FF61 > U+1F600 in UTF-16 order (0xFF61 > 0xD83D), the reverse of code point order.
        let a = JsValue::str("\u{ff61}");
        let b = JsValue::str("\u{1f600}");
        assert_eq!(js_greater(&a, &b), Ok(true));
        assert_eq!(js_greater(&n("10"), &n("9")), Ok(true));
        assert_eq!(js_greater(&n("NaN"), &n("9")), Ok(false));
        assert!(js_greater(&n("1"), &JsValue::str("0")).is_err());
    }
}
