//! The two JS number operations `readBlob` (relay-hbi-indexer.mjs:26-35) performs on its
//! string arguments, computed in integer arithmetic: `Number(s)` (ECMA-262 StringToNumber,
//! rounded once to the nearest double, ties to even) and `String(x)` (Number::toString) for the
//! non-negative integer values its two messages print. `l0_edge::jsnum::Dbl` carries neither
//! operation, so they are written here.

use std::cmp::Ordering;

/// A JS number value: NaN, ±Infinity, or `(-1)^neg × m × 2^e` with `m < 2^53`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JsNum {
    NaN,
    Infinite { neg: bool },
    Finite { neg: bool, m: u64, e: i32 },
}

/// Unsigned big integer, little-endian base 2^32 limbs, no trailing zero limbs.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Big(Vec<u32>);

impl Big {
    fn zero() -> Big {
        Big(Vec::new())
    }
    fn from_u64(n: u64) -> Big {
        let mut b = Big(vec![n as u32, (n >> 32) as u32]);
        b.trim();
        b
    }
    fn trim(&mut self) {
        while self.0.last() == Some(&0) {
            self.0.pop();
        }
    }
    fn is_zero(&self) -> bool {
        self.0.is_empty()
    }
    fn bit_len(&self) -> u64 {
        match self.0.last() {
            None => 0,
            Some(&top) => (self.0.len() as u64 - 1) * 32 + u64::from(32 - top.leading_zeros()),
        }
    }
    fn mul_add_small(&mut self, mul: u32, add: u32) {
        let mut carry = u64::from(add);
        for limb in self.0.iter_mut() {
            let v = u64::from(*limb) * u64::from(mul) + carry;
            *limb = v as u32;
            carry = v >> 32;
        }
        if carry > 0 {
            self.0.push(carry as u32);
        }
        self.trim();
    }
    fn div_rem_small(&mut self, d: u32) -> u32 {
        let mut rem = 0u64;
        for limb in self.0.iter_mut().rev() {
            let cur = (rem << 32) | u64::from(*limb);
            *limb = (cur / u64::from(d)) as u32;
            rem = cur % u64::from(d);
        }
        self.trim();
        rem as u32
    }
    fn shl(&self, bits: u64) -> Big {
        if self.is_zero() {
            return Big::zero();
        }
        let r = (bits % 32) as u32;
        let mut out = vec![0u32; (bits / 32) as usize];
        if r == 0 {
            out.extend_from_slice(&self.0);
        } else {
            let mut carry = 0u32;
            for &l in &self.0 {
                out.push((l << r) | carry);
                carry = l >> (32 - r);
            }
            if carry != 0 {
                out.push(carry);
            }
        }
        Big(out)
    }
    fn shr(&self, bits: u64) -> Big {
        let skip = (bits / 32) as usize;
        if skip >= self.0.len() {
            return Big::zero();
        }
        let r = (bits % 32) as u32;
        let src = &self.0[skip..];
        let mut out = Vec::with_capacity(src.len());
        for i in 0..src.len() {
            let lo = src[i] >> r;
            let hi = if r == 0 {
                0
            } else {
                src.get(i + 1).map_or(0, |&n| n << (32 - r))
            };
            out.push(lo | hi);
        }
        let mut b = Big(out);
        b.trim();
        b
    }
    fn cmp_big(&self, o: &Big) -> Ordering {
        self.0
            .len()
            .cmp(&o.0.len())
            .then_with(|| self.0.iter().rev().cmp(o.0.iter().rev()))
    }
    fn add(&self, o: &Big) -> Big {
        let n = self.0.len().max(o.0.len());
        let mut out = Vec::with_capacity(n + 1);
        let mut carry = 0u64;
        for i in 0..n {
            let v = u64::from(*self.0.get(i).unwrap_or(&0))
                + u64::from(*o.0.get(i).unwrap_or(&0))
                + carry;
            out.push(v as u32);
            carry = v >> 32;
        }
        if carry > 0 {
            out.push(carry as u32);
        }
        let mut b = Big(out);
        b.trim();
        b
    }
    /// `self - o`; the caller guarantees `self >= o`.
    fn sub(&self, o: &Big) -> Big {
        let mut out = Vec::with_capacity(self.0.len());
        let mut borrow = 0i64;
        for i in 0..self.0.len() {
            let mut v = i64::from(self.0[i]) - i64::from(*o.0.get(i).unwrap_or(&0)) - borrow;
            borrow = 0;
            if v < 0 {
                v += 1 << 32;
                borrow = 1;
            }
            out.push(v as u32);
        }
        let mut b = Big(out);
        b.trim();
        b
    }
    fn to_u64(&self) -> Option<u64> {
        match self.0.len() {
            0 => Some(0),
            1 => Some(u64::from(self.0[0])),
            2 => Some(u64::from(self.0[0]) | (u64::from(self.0[1]) << 32)),
            _ => None,
        }
    }
    fn pow10(n: u64) -> Big {
        let mut b = Big::from_u64(1);
        for _ in 0..n {
            b.mul_add_small(10, 0);
        }
        b
    }
    fn from_digits(digits: &[u8], radix: u32) -> Big {
        let mut b = Big::zero();
        for &d in digits {
            b.mul_add_small(radix, u32::from(d));
        }
        b
    }
    fn to_decimal(&self) -> String {
        if self.is_zero() {
            return "0".to_string();
        }
        let mut n = self.clone();
        let mut out: Vec<u8> = Vec::new();
        while !n.is_zero() {
            out.push(b'0' + n.div_rem_small(10) as u8);
        }
        out.reverse();
        String::from_utf8(out).unwrap_or_default()
    }
}

/// floor(num / den) for a quotient below 2^55, and whether the remainder is below, at, or above
/// half of `den`.
fn div_small_quotient(num: &Big, den: &Big) -> (u64, Ordering) {
    let mut rem = num.clone();
    let mut quo = 0u64;
    for bit in (0..55u64).rev() {
        let t = den.shl(bit);
        if rem.cmp_big(&t) != Ordering::Less {
            rem = rem.sub(&t);
            quo |= 1u64 << bit;
        }
    }
    (quo, rem.shl(1).cmp_big(den))
}

/// The nearest double to the positive ratio p/q, ties to even: `Some((m, e))` with value
/// `m × 2^e`, or `None` when it rounds past the largest finite double (Infinity).
fn round_ratio(p: &Big, q: &Big) -> Option<(u64, i32)> {
    if p.is_zero() {
        return Some((0, 0));
    }
    let mut s: i64 = 53 - (p.bit_len() as i64 - q.bit_len() as i64);
    loop {
        let s_eff = s.min(1074);
        let (num, den) = if s_eff >= 0 {
            (p.shl(s_eff as u64), q.clone())
        } else {
            (p.clone(), q.shl(s_eff.unsigned_abs()))
        };
        let (mut quo, half) = div_small_quotient(&num, &den);
        if quo >= 1u64 << 53 && s_eff == s {
            s -= 1;
            continue;
        }
        if half == Ordering::Greater || (half == Ordering::Equal && quo & 1 == 1) {
            quo += 1;
        }
        let mut e = -s_eff;
        if quo == 1u64 << 53 {
            quo = 1u64 << 52;
            e += 1;
        }
        if e > 971 {
            return None;
        }
        return Some((quo, e as i32));
    }
}

/// ECMA-262 StrWhiteSpaceChar: WhiteSpace (TAB, VT, FF, ZWNBSP, Zs) and LineTerminator.
fn is_js_space(c: char) -> bool {
    matches!(
        c,
        '\u{0009}'..='\u{000D}'
            | '\u{0020}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

fn finite(neg: bool, p: &Big, q: &Big) -> JsNum {
    match round_ratio(p, q) {
        Some((m, e)) => JsNum::Finite { neg, m, e },
        None => JsNum::Infinite { neg },
    }
}

/// `Number(s)` for a string `s` (ECMA-262 StringToNumber): trimmed, then a decimal literal with
/// optional sign, fraction and exponent, `Infinity`, or an unsigned 0x/0o/0b integer.
pub fn string_to_number(s: &str) -> JsNum {
    let t = s.trim_matches(is_js_space);
    if t.is_empty() {
        return JsNum::Finite {
            neg: false,
            m: 0,
            e: 0,
        };
    }
    let b = t.as_bytes();
    if b.len() > 2 && b[0] == b'0' {
        let radix = match b[1] {
            b'x' | b'X' => 16,
            b'o' | b'O' => 8,
            b'b' | b'B' => 2,
            _ => 0,
        };
        if radix != 0 {
            let mut digits = Vec::with_capacity(b.len() - 2);
            for &c in &b[2..] {
                match (c as char).to_digit(radix) {
                    Some(d) => digits.push(d as u8),
                    None => return JsNum::NaN,
                }
            }
            let sig = &digits[digits.iter().position(|&d| d != 0).unwrap_or(digits.len())..];
            // radix^(len-1) >= 2^1024 already rounds to Infinity.
            if (sig.len() as u64).saturating_sub(1) * u64::from(radix.trailing_zeros()) >= 1024 {
                return JsNum::Infinite { neg: false };
            }
            return finite(false, &Big::from_digits(sig, radix), &Big::from_u64(1));
        }
    }
    let (neg, body) = match b[0] {
        b'+' => (false, &b[1..]),
        b'-' => (true, &b[1..]),
        _ => (false, b),
    };
    if body == b"Infinity" {
        return JsNum::Infinite { neg };
    }
    let mut i = 0;
    let mut digits: Vec<u8> = Vec::new();
    while i < body.len() && body[i].is_ascii_digit() {
        digits.push(body[i] - b'0');
        i += 1;
    }
    let int_len = digits.len();
    let mut frac_len = 0u64;
    if i < body.len() && body[i] == b'.' {
        i += 1;
        while i < body.len() && body[i].is_ascii_digit() {
            digits.push(body[i] - b'0');
            frac_len += 1;
            i += 1;
        }
    }
    if int_len == 0 && frac_len == 0 {
        return JsNum::NaN;
    }
    let mut exp: i64 = 0;
    if i < body.len() && (body[i] == b'e' || body[i] == b'E') {
        i += 1;
        let mut eneg = false;
        if i < body.len() && (body[i] == b'+' || body[i] == b'-') {
            eneg = body[i] == b'-';
            i += 1;
        }
        let start = i;
        while i < body.len() && body[i].is_ascii_digit() {
            exp = (exp * 10 + i64::from(body[i] - b'0')).min(1_000_000_000_000);
            i += 1;
        }
        if i == start {
            return JsNum::NaN;
        }
        if eneg {
            exp = -exp;
        }
    }
    if i != body.len() {
        return JsNum::NaN;
    }
    let first_nonzero = digits.iter().position(|&d| d != 0);
    let Some(fz) = first_nonzero else {
        return JsNum::Finite { neg, m: 0, e: 0 };
    };
    let mut sig = digits[fz..].to_vec();
    let mut e10 = exp - frac_len as i64;
    let magnitude = sig.len() as i64 + e10;
    // A double's halfway points need at most 767 significant digits, so the first 780 digits plus
    // one sticky digit for any non-zero remainder round to the same double (V8 StringToDouble
    // keeps a bounded digit buffer the same way).
    if sig.len() > 780 {
        let dropped_nonzero = sig[780..].iter().any(|&d| d != 0);
        e10 += sig.len() as i64 - 780;
        sig.truncate(780);
        if dropped_nonzero {
            sig.push(1);
            e10 -= 1;
        }
    }
    let sig = &sig[..];
    if magnitude >= 310 {
        return JsNum::Infinite { neg };
    }
    if magnitude <= -324 {
        return JsNum::Finite { neg, m: 0, e: 0 };
    }
    let n = Big::from_digits(sig, 10);
    if e10 >= 0 {
        let p = Big::pow10(e10 as u64);
        let mut prod = Big::zero();
        for (k, &limb) in p.0.iter().enumerate() {
            let mut part = n.clone();
            part.mul_add_small(limb, 0);
            prod = prod.add(&part.shl(32 * k as u64));
        }
        finite(neg, &prod, &Big::from_u64(1))
    } else {
        finite(neg, &n, &Big::pow10(e10.unsigned_abs()))
    }
}

impl JsNum {
    /// `Number.isInteger(x) && !(x < 0)` — the value as an exact integer, or `None`.
    fn nonneg_integer(self) -> Option<Big> {
        let JsNum::Finite { neg, m, e } = self else {
            return None;
        };
        if m == 0 {
            return Some(Big::zero());
        }
        if neg {
            return None;
        }
        if e >= 0 {
            return Some(Big::from_u64(m).shl(e as u64));
        }
        let sh = e.unsigned_abs();
        if sh >= 64 || m & ((1u64 << sh) - 1) != 0 {
            return None;
        }
        Some(Big::from_u64(m >> sh))
    }
}

/// `String(x)` (Number::toString, radix 10) for a non-negative integer double `x`.
fn integer_to_js_string(x: &Big) -> String {
    if x.bit_len() <= 53 {
        return x.to_decimal();
    }
    let Some((m, e)) = round_ratio(x, &Big::from_u64(1)) else {
        return "Infinity".to_string();
    };
    let four_x = x.shl(2);
    let up = Big::from_u64(1).shl(e as u64 + 1);
    let down = if m == 1u64 << 52 {
        Big::from_u64(1).shl(e as u64)
    } else {
        up.clone()
    };
    let hi4 = four_x.add(&up);
    let lo4 = four_x.sub(&down);
    let inclusive = m & 1 == 0;
    let inside = |c: &Big| {
        let c4 = c.shl(2);
        let above = match c4.cmp_big(&lo4) {
            Ordering::Greater => true,
            Ordering::Equal => inclusive,
            Ordering::Less => false,
        };
        let below = match c4.cmp_big(&hi4) {
            Ordering::Less => true,
            Ordering::Equal => inclusive,
            Ordering::Greater => false,
        };
        above && below
    };
    let digits = x.to_decimal();
    let n = digits.len();
    let mut chosen = x.clone();
    for k in 1..=n {
        let zeros = (n - k) as u64;
        let step = Big::pow10(zeros);
        let s_lo = Big::from_digits(
            &digits.as_bytes()[..k]
                .iter()
                .map(|d| d - b'0')
                .collect::<Vec<u8>>(),
            10,
        );
        let mut s_hi = s_lo.clone();
        s_hi.mul_add_small(1, 1);
        let scale = |s: &Big| {
            let mut out = Big::zero();
            for (j, &limb) in step.0.iter().enumerate() {
                let mut part = s.clone();
                part.mul_add_small(limb, 0);
                out = out.add(&part.shl(32 * j as u64));
            }
            out
        };
        let c_lo = scale(&s_lo);
        let c_hi = scale(&s_hi);
        let (lo_in, hi_in) = (inside(&c_lo), inside(&c_hi));
        if !lo_in && !hi_in {
            continue;
        }
        chosen = if lo_in && hi_in {
            match x.sub(&c_lo).cmp_big(&c_hi.sub(x)) {
                Ordering::Less => c_lo,
                Ordering::Greater => c_hi,
                Ordering::Equal => {
                    if s_lo.0.first().map_or(0, |l| l & 1) == 0 {
                        c_lo
                    } else {
                        c_hi
                    }
                }
            }
        } else if lo_in {
            c_lo
        } else {
            c_hi
        };
        break;
    }
    let full = chosen.to_decimal();
    if full.len() <= 21 {
        return full;
    }
    let sig = full.trim_end_matches('0');
    let mut out = sig[..1].to_string();
    if sig.len() > 1 {
        out.push('.');
        out.push_str(&sig[1..]);
    }
    out.push_str(&format!("e+{}", full.len() - 1));
    out
}

/// The outcome of `readBlob`'s argument checks (relay-hbi-indexer.mjs:27-29) on the store size.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BlobBounds {
    /// Both arguments are non-negative integers and `off + len` is within the store.
    Read { off: u64, len: u64 },
    /// One of the three `BOUNDS_REJECT` messages, as the JS builds it.
    Reject(String),
}

/// relay-hbi-indexer.mjs:27-29: `Number()` both arguments, require non-negative integers, cap
/// `len`, then require `off + len` (a double sum) within `size`.
pub fn blob_bounds(off: &str, len: &str, max_payload: u64, size: u64) -> BlobBounds {
    let (Some(off), Some(len)) = (
        string_to_number(off).nonneg_integer(),
        string_to_number(len).nonneg_integer(),
    ) else {
        return BlobBounds::Reject("BOUNDS_REJECT: bad off/len".to_string());
    };
    if len.cmp_big(&Big::from_u64(max_payload)) == Ordering::Greater {
        return BlobBounds::Reject(format!(
            "BOUNDS_REJECT: len {} exceeds cap {max_payload}",
            integer_to_js_string(&len)
        ));
    }
    let sum = off.add(&len);
    let rounded = match round_ratio(&sum, &Big::from_u64(1)) {
        Some((m, e)) if e >= 0 => Big::from_u64(m).shl(e as u64),
        Some((m, e)) => Big::from_u64(m).shr(u64::from(e.unsigned_abs())),
        None => sum.clone(),
    };
    if rounded.cmp_big(&Big::from_u64(size)) == Ordering::Greater {
        return BlobBounds::Reject(format!(
            "BOUNDS_REJECT: off+len {} exceeds store size {size}",
            integer_to_js_string(&rounded)
        ));
    }
    match (off.to_u64(), len.to_u64()) {
        (Some(off), Some(len)) => BlobBounds::Read { off, len },
        _ => BlobBounds::Reject("BOUNDS_REJECT: bad off/len".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn big(s: &str) -> Big {
        Big::from_digits(&s.bytes().map(|d| d - b'0').collect::<Vec<u8>>(), 10)
    }

    #[test]
    fn number_to_string_matches_v8_on_measured_values() {
        // Values printed by node 22.22.0 for String(Number(s)).
        for (s, want) in [
            ("99999999999999999999", "100000000000000000000"),
            ("9007199254740993", "9007199254740992"),
            ("123456789012345678901", "123456789012345680000"),
            ("1000000000000000000000", "1e+21"),
        ] {
            let JsNum::Finite { m, e, .. } = string_to_number(s) else {
                panic!("{s}")
            };
            let x = if e >= 0 {
                Big::from_u64(m).shl(e as u64)
            } else {
                Big::from_u64(m).shr(u64::from(e.unsigned_abs()))
            };
            assert_eq!(integer_to_js_string(&x), want, "{s}");
        }
        assert_eq!(integer_to_js_string(&big("8388609")), "8388609");
    }
}
