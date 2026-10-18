//! JavaScript numbers as binary64 bit patterns, in integers only: the value `JSON.parse` gives a
//! number token (correctly rounded, ties to even; overflow to infinity, underflow to zero) and
//! `Number::toString` (ECMA-262 6.1.6.1.20: the fewest digits that round-trip, the closest of them,
//! ties to the even digit).

use alloc::string::String;
use alloc::vec::Vec;
use core::cmp::Ordering;

const SIGN: u64 = 1 << 63;
const FRACTION: u64 = (1 << 52) - 1;
const INFINITY: u64 = 0x7ff << 52;
/// Significant digits kept from a token; further non-zero digits become one sticky digit.
const KEPT_DIGITS: usize = 800;

/// Unsigned integer, little-endian `u32` limbs, no zero high limb.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Big(Vec<u32>);

impl Big {
    fn from_u64(n: u64) -> Big {
        let mut b = Big(alloc::vec![n as u32, (n >> 32) as u32]);
        b.trim();
        b
    }

    fn trim(&mut self) {
        while self.0.last() == Some(&0) {
            self.0.pop();
        }
    }

    fn mul_add(&mut self, mul: u32, add: u32) {
        let mut carry = u64::from(add);
        for limb in &mut self.0 {
            let t = u64::from(*limb) * u64::from(mul) + carry;
            *limb = t as u32;
            carry = t >> 32;
        }
        if carry != 0 {
            self.0.push(carry as u32);
        }
    }

    fn mul_pow10(&mut self, mut n: u64) {
        while n >= 9 {
            self.mul_add(1_000_000_000, 0);
            n -= 9;
        }
        if n > 0 {
            self.mul_add(10u32.pow(n as u32), 0);
        }
    }

    fn shl(&mut self, bits: u64) {
        if self.0.is_empty() {
            return;
        }
        let limbs = (bits / 32) as usize;
        let rem = (bits % 32) as u32;
        if rem != 0 {
            let mut carry = 0u32;
            for limb in &mut self.0 {
                let next = *limb >> (32 - rem);
                *limb = (*limb << rem) | carry;
                carry = next;
            }
            if carry != 0 {
                self.0.push(carry);
            }
        }
        if limbs > 0 {
            self.0.splice(0..0, core::iter::repeat(0).take(limbs));
        }
    }

    fn bit_len(&self) -> u64 {
        match self.0.last() {
            None => 0,
            Some(top) => (self.0.len() as u64 - 1) * 32 + u64::from(32 - top.leading_zeros()),
        }
    }

    fn bit(&self, i: u64) -> bool {
        self.0
            .get((i / 32) as usize)
            .is_some_and(|limb| (limb >> (i % 32)) & 1 == 1)
    }

    /// Whether any bit below position `i` is set.
    fn any_below(&self, i: u64) -> bool {
        let whole = ((i / 32) as usize).min(self.0.len());
        if self.0[..whole].iter().any(|&l| l != 0) {
            return true;
        }
        let rem = i % 32;
        rem != 0
            && self
                .0
                .get(whole)
                .is_some_and(|&l| l & ((1 << rem) - 1) != 0)
    }

    /// `self >> shift`, which must fit in 64 bits.
    fn shr_u64(&self, shift: u64) -> u64 {
        let mut out = 0u64;
        for k in 0..64 {
            if self.bit(shift + k) {
                out |= 1 << k;
            }
        }
        out
    }

    fn sub_assign(&mut self, other: &Big) {
        let mut borrow = 0i64;
        for (i, limb) in self.0.iter_mut().enumerate() {
            let t = i64::from(*limb) - i64::from(other.0.get(i).copied().unwrap_or(0)) - borrow;
            borrow = i64::from(t < 0);
            *limb = (t + (borrow << 32)) as u32;
        }
        self.trim();
    }

    /// `(num / den, num % den != 0)`; the quotient must fit in 64 bits.
    fn div(num: &Big, den: &Big) -> (u64, bool) {
        let (nl, dl) = (num.bit_len(), den.bit_len());
        let mut rem = num.clone();
        let mut q = 0u64;
        if nl >= dl {
            assert!(nl - dl < 64, "quotient wider than 64 bits");
            for b in (0..=nl - dl).rev() {
                let mut t = den.clone();
                t.shl(b);
                if rem >= t {
                    rem.sub_assign(&t);
                    q |= 1 << b;
                }
            }
        }
        (q, !rem.0.is_empty())
    }
}

impl Ord for Big {
    fn cmp(&self, other: &Big) -> Ordering {
        self.0
            .len()
            .cmp(&other.0.len())
            .then_with(|| self.0.iter().rev().cmp(other.0.iter().rev()))
    }
}

impl PartialOrd for Big {
    fn partial_cmp(&self, other: &Big) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Rounds `(q + s) * 2^exp2` to binary64, ties to even, where `s` is a positive amount below one
/// unit of `q` when `sticky` (then `q` carries at least 56 bits).
fn round(sign: u64, q: &Big, sticky: bool, exp2: i64) -> u64 {
    let top = q.bit_len() as i64 - 1 + exp2;
    let mut lsb = if top >= -1022 { top - 52 } else { -1074 };
    let shift = lsb - exp2;
    let mut mant = if shift <= 0 {
        q.shr_u64(0) << -shift
    } else {
        let s = shift as u64;
        let m = q.shr_u64(s);
        let up = q.bit(s - 1) && (sticky || q.any_below(s - 1) || m & 1 == 1);
        m + u64::from(up)
    };
    if mant == 1 << 53 {
        mant >>= 1;
        lsb += 1;
    }
    if mant < 1 << 52 {
        return sign | mant;
    }
    let biased = lsb + 1075;
    if biased >= 0x7ff {
        return sign | INFINITY;
    }
    sign | ((biased as u64) << 52) | (mant & FRACTION)
}

/// The binary64 bits `JSON.parse` gives a token of the JSON number grammar.
pub(crate) fn parse(token: &[u8]) -> u64 {
    let sign = if token.first() == Some(&b'-') {
        SIGN
    } else {
        0
    };
    let mut digits: Vec<u8> = Vec::new();
    let mut scale: i64 = 0;
    let mut exp: i64 = 0;
    let mut exp_neg = false;
    let mut part = 0;
    for &c in token {
        match c {
            b'.' => part = 1,
            b'e' | b'E' => part = 2,
            b'-' if part == 2 => exp_neg = true,
            b'0'..=b'9' if part == 2 => exp = (exp * 10 + i64::from(c - b'0')).min(1 << 40),
            b'0'..=b'9' => {
                if part == 1 {
                    scale -= 1;
                }
                if !(digits.is_empty() && c == b'0') {
                    digits.push(c - b'0');
                }
            }
            _ => {}
        }
    }
    scale += if exp_neg { -exp } else { exp };
    while digits.last() == Some(&0) {
        digits.pop();
        scale += 1;
    }
    if digits.is_empty() {
        return sign;
    }
    if digits.len() > KEPT_DIGITS {
        scale += (digits.len() - KEPT_DIGITS - 1) as i64;
        digits.truncate(KEPT_DIGITS);
        digits.push(1);
    }
    let magnitude = digits.len() as i64 + scale;
    if magnitude >= 310 {
        return sign | INFINITY;
    }
    if magnitude <= -324 {
        return sign;
    }
    let mut d = Big(Vec::new());
    for &digit in &digits {
        d.mul_add(10, u32::from(digit));
    }
    if scale >= 0 {
        d.mul_pow10(scale as u64);
        return round(sign, &d, false, 0);
    }
    let mut den = Big::from_u64(1);
    den.mul_pow10(scale.unsigned_abs());
    let t = d.bit_len() as i64 - den.bit_len() as i64 - 56;
    if t >= 0 {
        den.shl(t as u64);
    } else {
        d.shl(t.unsigned_abs());
    }
    let (q, sticky) = Big::div(&d, &den);
    round(sign, &Big::from_u64(q), sticky, t)
}

/// Whether the value is +0 or -0 (the falsy numbers `JSON.parse` can give).
pub(crate) fn is_zero(bits: u64) -> bool {
    bits & !SIGN == 0
}

pub(crate) fn is_finite(bits: u64) -> bool {
    bits & INFINITY != INFINITY
}

/// Ordering of `c * 10^j` against `x * 2^p`.
fn cmp_scaled(c: u64, j: i64, x: u64, p: i64) -> Ordering {
    let (mut a, mut b) = (Big::from_u64(c), Big::from_u64(x));
    if j >= 0 {
        a.mul_pow10(j as u64);
    } else {
        b.mul_pow10(j.unsigned_abs());
    }
    if p >= 0 {
        b.shl(p as u64);
    } else {
        a.shl(p.unsigned_abs());
    }
    a.cmp(&b)
}

/// Shortest digits `s` and exponent `n` with `s * 10^(n - len(s))` rounding to `m * 2^e`.
fn shortest(m: u64, e: i64, lower_closer: bool) -> (String, i64) {
    // Value and rounding interval in units of 2^(e-2).
    let p = e - 2;
    let v4 = 4 * m;
    let lo = v4 - if lower_closer { 1 } else { 2 };
    let hi = v4 + 2;
    let inclusive = m % 2 == 0;
    let log2 = 63 - i64::from(m.leading_zeros()) + e;
    let mut n = (log2 * 1233).div_euclid(4096) + 1;
    while cmp_scaled(1, n, v4, p) != Ordering::Greater {
        n += 1;
    }
    while cmp_scaled(1, n - 1, v4, p) == Ordering::Greater {
        n -= 1;
    }
    let in_range = |c: u64, j: i64| {
        let (l, h) = (cmp_scaled(c, j, lo, p), cmp_scaled(c, j, hi, p));
        if inclusive {
            l != Ordering::Less && h != Ordering::Greater
        } else {
            l == Ordering::Greater && h == Ordering::Less
        }
    };
    // For k digits, the grid 10^(n-k) points just below and above the value, and whether each
    // lies in the interval. Having a k-digit candidate implies one at k+1, so k is bisected.
    let candidates = |k: i64| {
        let j = n - k;
        let (mut num, mut den) = (Big::from_u64(m), Big::from_u64(1));
        if e >= 0 {
            num.shl(e as u64);
        } else {
            den.shl(e.unsigned_abs());
        }
        if j >= 0 {
            den.mul_pow10(j as u64);
        } else {
            num.mul_pow10(j.unsigned_abs());
        }
        let s = Big::div(&num, &den).0;
        (j, s, in_range(s, j), in_range(s + 1, j))
    };
    let (mut low, mut high) = (1, 17);
    while low < high {
        let mid = (low + high) / 2;
        let (_, _, down, up) = candidates(mid);
        if down || up {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    let (mut j, s, down, up) = candidates(low);
    let mut c = match (down, up) {
        (true, true) => match cmp_scaled(2 * s + 1, j, 8 * m, p) {
            Ordering::Greater => s,
            Ordering::Less => s + 1,
            Ordering::Equal => s + s % 2,
        },
        (true, false) => s,
        (false, true) => s + 1,
        (false, false) => unreachable!("17 significant digits always round-trip"),
    };
    while c % 10 == 0 {
        c /= 10;
        j += 1;
    }
    let digits = alloc::format!("{c}");
    let n = j + digits.len() as i64;
    (digits, n)
}

/// `Number::toString(x, 10)`, as JavaScript's `String(x)`.
pub(crate) fn to_js_string(bits: u64) -> String {
    let neg = bits & SIGN != 0;
    let abs = bits & !SIGN;
    if abs == 0 {
        return String::from("0");
    }
    let biased = (abs >> 52) as i64;
    let fraction = abs & FRACTION;
    if biased == 0x7ff {
        return String::from(match (fraction, neg) {
            (0, false) => "Infinity",
            (0, true) => "-Infinity",
            _ => "NaN",
        });
    }
    let (m, e) = if biased == 0 {
        (fraction, -1074)
    } else {
        (fraction | (1 << 52), biased - 1075)
    };
    let (digits, n) = shortest(m, e, fraction == 0 && biased > 1);
    let k = digits.len() as i64;
    let mut out = String::new();
    if neg {
        out.push('-');
    }
    if k <= n && n <= 21 {
        out.push_str(&digits);
        out.extend(core::iter::repeat('0').take((n - k) as usize));
    } else if 0 < n && n <= 21 {
        out.push_str(&digits[..n as usize]);
        out.push('.');
        out.push_str(&digits[n as usize..]);
    } else if -6 < n && n <= 0 {
        out.push_str("0.");
        out.extend(core::iter::repeat('0').take(n.unsigned_abs() as usize));
        out.push_str(&digits);
    } else {
        out.push_str(&digits[..1]);
        if k > 1 {
            out.push('.');
            out.push_str(&digits[1..]);
        }
        out.push('e');
        out.push(if n - 1 < 0 { '-' } else { '+' });
        out.push_str(&alloc::format!("{}", (n - 1).unsigned_abs()));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn js(token: &str) -> String {
        to_js_string(parse(token.as_bytes()))
    }

    #[test]
    fn parse_gives_the_nearest_binary64() {
        assert_eq!(parse(b"0.1"), 0x3fb9_9999_9999_999a);
        assert_eq!(parse(b"1"), 0x3ff0_0000_0000_0000);
        assert_eq!(parse(b"-2.5e-3"), 0xbf64_7ae1_47ae_147b);
        assert_eq!(parse(b"9007199254740993"), 0x4340_0000_0000_0000);
        assert_eq!(parse(b"9007199254740995"), 0x4340_0000_0000_0002);
        assert_eq!(parse(b"5e-324"), 1);
        assert_eq!(parse(b"2.4703282292062328e-324"), 1);
        assert_eq!(parse(b"2.4703282292062327e-324"), 0);
        assert_eq!(parse(b"2.2250738585072011e-308"), 0x000f_ffff_ffff_ffff);
        assert_eq!(parse(b"1.7976931348623158e308"), 0x7fef_ffff_ffff_ffff);
        assert_eq!(parse(b"1.7976931348623159e308"), INFINITY);
        assert_eq!(parse(b"-1e400"), SIGN | INFINITY);
        assert_eq!(parse(b"-1e-400"), SIGN);
        assert_eq!(parse(b"-0"), SIGN);
        assert_eq!(parse(b"0e99999999999999999999"), 0);
        assert_eq!(parse(b"1e-99999999999999999999"), 0);
    }

    #[test]
    fn sticky_digits_past_the_kept_window_break_a_tie() {
        // 2^53 + 1 is the tie between 2^53 and 2^53 + 2; anything above it rounds up.
        let mut above = String::from("9007199254740993.");
        above.extend(core::iter::repeat('0').take(1000));
        above.push('1');
        assert_eq!(parse(above.as_bytes()), 0x4340_0000_0000_0001);
        let mut tie = String::from("9007199254740993.");
        tie.extend(core::iter::repeat('0').take(1000));
        assert_eq!(parse(tie.as_bytes()), 0x4340_0000_0000_0000);
    }

    #[test]
    fn to_string_follows_number_to_string() {
        assert_eq!(js("0"), "0");
        assert_eq!(js("-0"), "0");
        assert_eq!(js("0.1"), "0.1");
        assert_eq!(js("100"), "100");
        assert_eq!(js("1e21"), "1e+21");
        assert_eq!(js("123456789012345678901"), "123456789012345680000");
        assert_eq!(js("1e-6"), "0.000001");
        assert_eq!(js("1e-7"), "1e-7");
        assert_eq!(js("-1.5e-7"), "-1.5e-7");
        assert_eq!(js("123e-20"), "1.23e-18");
        assert_eq!(js("12345678901234567890123"), "1.2345678901234568e+22");
        assert_eq!(js("5e-324"), "5e-324");
        assert_eq!(js("1.7976931348623157e308"), "1.7976931348623157e+308");
        assert_eq!(js("2.2250738585072014e-308"), "2.2250738585072014e-308");
        assert_eq!(js("1e400"), "Infinity");
        assert_eq!(js("-1e400"), "-Infinity");
        assert_eq!(js("0.30000000000000004"), "0.30000000000000004");
        // A tie between two shortest candidates goes to the even digit, as node prints it.
        assert_eq!(js("562949953421312.25"), "562949953421312.2");
        // Powers of two have a closer lower neighbour.
        assert_eq!(js("9007199254740992"), "9007199254740992");
        assert_eq!(js("1.1102230246251565e-16"), "1.1102230246251565e-16");
    }
}
