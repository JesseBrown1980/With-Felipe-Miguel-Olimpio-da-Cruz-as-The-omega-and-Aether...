//! JS numbers in integers: each value is held as its IEEE-754 binary64 bit pattern, and each
//! operation jsQR's `locate` and `extract` apply (index.html:9723-10222) is computed exactly and
//! rounded once to nearest, ties to even, as ECMAScript number arithmetic is. So the reader holds
//! the page's own values bit for bit, including where binary rounding moves a result off the
//! exact one (a mapped module centre a hair either side of a pixel edge).
//!
//! `l0_edge::jsnum::Dbl` (`model/l0-edge`) holds non-negative finite values with `+`, `*` and
//! `/`. jsQR here also subtracts, takes square roots and meets negative values, signed zeros,
//! infinities and `NaN`, and this crate keeps no dependencies, so it carries this module.

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Neg, Sub};

const SIGN: u64 = 1 << 63;
const INF_BITS: u64 = 0x7ff << 52;
const NAN_BITS: u64 = 0x7ff8 << 48;
const FRAC_MASK: u64 = (1 << 52) - 1;
/// The exponent of a subnormal's last place: 2^-1074.
const MIN_EXP: i32 = -1074;

/// One JS number, as its IEEE-754 binary64 bit pattern. `==` compares bit patterns (`-0` and `0`
/// differ, `NaN` equals itself); [`Dbl::lt`], [`Dbl::le`], [`Dbl::gt`], [`Dbl::ge`] and
/// [`Dbl::js_eq`] are the JS comparisons.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Dbl(u64);

enum Class {
    Nan,
    Inf(bool),
    Zero(bool),
    /// `(-1)^neg * m * 2^e` with `0 < m < 2^53`.
    Finite(bool, u64, i32),
}

/// `floor(sqrt(n))`.
fn isqrt(n: u128) -> u128 {
    if n < 2 {
        return n;
    }
    let bits = 128 - n.leading_zeros();
    let mut x: u128 = 1 << bits.div_ceil(2);
    loop {
        let y = (x + n / x) / 2;
        if y >= x {
            return x;
        }
        x = y;
    }
}

/// `m * 2^e` with `m` shifted up to 53 bits.
fn normalise(m: u64, e: i32) -> (u64, i32) {
    let shift = m.leading_zeros() - 11;
    (m << shift, e - shift as i32)
}

/// The JS number nearest `(-1)^neg * (q + s) * 2^e`, ties to even, where `0 <= s < 1` and
/// `s > 0` exactly when `sticky`; the one rounding every operation ends with. `q < 2^120`, and
/// with `sticky` `q` has at least 55 bits, so `s` lies below the rounding bit.
fn round(neg: bool, q: u128, sticky: bool, e: i32) -> Dbl {
    let sign = if neg { SIGN } else { 0 };
    if q == 0 {
        return Dbl(sign);
    }
    let len = 128 - q.leading_zeros() as i32;
    let shift = (len - 53).max(MIN_EXP - e);
    let (mant, exp) = if shift <= 0 {
        (q << shift.unsigned_abs(), e + shift)
    } else if shift > len {
        // Below half of the smallest subnormal.
        return Dbl(sign);
    } else {
        let s = shift.unsigned_abs();
        let kept = q >> s;
        let rest = q & ((1 << s) - 1);
        let half = 1u128 << (s - 1);
        let up = rest > half || (rest == half && (sticky || kept & 1 == 1));
        (kept + u128::from(up), e + shift)
    };
    // `mant <= 2^53` at `exp >= -1074`: the exponent field `exp + 1074` above the mantissa,
    // hidden bit included, is the bit pattern; a carry out of the mantissa moves the exponent.
    let bits = (u128::from((exp - MIN_EXP).unsigned_abs()) << 52) + mant;
    if bits >= u128::from(INF_BITS) {
        Dbl(sign | INF_BITS)
    } else {
        Dbl(sign | bits as u64)
    }
}

fn infinity(neg: bool) -> Dbl {
    Dbl(if neg { SIGN | INF_BITS } else { INF_BITS })
}

fn zero(neg: bool) -> Dbl {
    Dbl(if neg { SIGN } else { 0 })
}

impl Dbl {
    /// `0`.
    pub const ZERO: Dbl = Dbl(0);
    /// `NaN`.
    pub const NAN: Dbl = Dbl(NAN_BITS);

    /// The number with this bit pattern.
    pub const fn from_bits(bits: u64) -> Dbl {
        Dbl(bits)
    }

    /// The bit pattern, as a `Float64Array` holds it.
    pub const fn to_bits(self) -> u64 {
        self.0
    }

    /// The JS number nearest the integer `n` (exact for `|n| <= 2^53`).
    pub fn from_int(n: i64) -> Dbl {
        round(n < 0, u128::from(n.unsigned_abs()), false, 0)
    }

    fn class(self) -> Class {
        let neg = self.0 & SIGN != 0;
        let field = (self.0 >> 52) & 0x7ff;
        let frac = self.0 & FRAC_MASK;
        match (field, frac) {
            (0x7ff, 0) => Class::Inf(neg),
            (0x7ff, _) => Class::Nan,
            (0, 0) => Class::Zero(neg),
            (0, _) => Class::Finite(neg, frac, MIN_EXP),
            _ => Class::Finite(neg, frac | 1 << 52, field as i32 - 1075),
        }
    }

    /// `Number.isNaN(x)`.
    pub fn is_nan(self) -> bool {
        matches!(self.class(), Class::Nan)
    }

    /// `Math.abs(x)`.
    pub fn abs(self) -> Dbl {
        if self.is_nan() {
            Dbl::NAN
        } else {
            Dbl(self.0 & !SIGN)
        }
    }

    /// `Math.sqrt(x)`, correctly rounded as IEEE-754 requires.
    pub fn sqrt(self) -> Dbl {
        match self.class() {
            Class::Nan | Class::Inf(true) | Class::Finite(true, ..) => Dbl::NAN,
            Class::Zero(_) | Class::Inf(false) => self,
            Class::Finite(false, m, e) => {
                let (m, e) = normalise(m, e);
                let (m, e) = if e & 1 == 0 { (m, e) } else { (m << 1, e - 1) };
                // m < 2^54, so n < 2^118 and its root has 59 bits.
                let n = u128::from(m) << 64;
                let r = isqrt(n);
                round(false, r, r * r != n, (e - 64) / 2)
            }
        }
    }

    /// `Math.floor(x)` as an integer; `None` for `NaN`, the infinities and values beyond `i64`,
    /// which every index test here reads as outside the matrix.
    pub fn floor_int(self) -> Option<i64> {
        match self.class() {
            Class::Nan | Class::Inf(_) => None,
            Class::Zero(_) => Some(0),
            Class::Finite(neg, m, e) => {
                let v = if neg { -i128::from(m) } else { i128::from(m) };
                if e >= 64 {
                    // |x| >= 2^64.
                    None
                } else if e >= 0 {
                    i64::try_from(v << e.unsigned_abs()).ok()
                } else {
                    i64::try_from(v >> e.unsigned_abs().min(127)).ok()
                }
            }
        }
    }

    /// `Math.round(x)` as an integer: the integer nearest `x`, a tie going toward `+Infinity`;
    /// `None` as for [`Dbl::floor_int`].
    pub fn round_int(self) -> Option<i64> {
        match self.class() {
            Class::Nan | Class::Inf(_) => None,
            Class::Zero(_) => Some(0),
            Class::Finite(neg, m, e) => {
                if e >= 0 {
                    return self.floor_int();
                }
                let k = e.unsigned_abs();
                if k >= 120 {
                    // |x| < 2^-67.
                    return Some(0);
                }
                let v = if neg { -i128::from(m) } else { i128::from(m) };
                // floor(v / 2^k + 1/2) = floor((2v + 2^k) / 2^(k+1)).
                i64::try_from((2 * v + (1i128 << k)) >> (k + 1)).ok()
            }
        }
    }

    /// The value on a line that orders every number but `NaN`, both zeros equal.
    fn key(self) -> Option<i128> {
        if self.is_nan() {
            return None;
        }
        let mag = i128::from(self.0 & !SIGN);
        Some(if self.0 & SIGN != 0 { -mag } else { mag })
    }

    fn compare(self, other: Dbl) -> Option<Ordering> {
        Some(self.key()?.cmp(&other.key()?))
    }

    /// JS `x < y`.
    pub fn lt(self, other: Dbl) -> bool {
        self.compare(other) == Some(Ordering::Less)
    }

    /// JS `x <= y`.
    pub fn le(self, other: Dbl) -> bool {
        matches!(self.compare(other), Some(Ordering::Less | Ordering::Equal))
    }

    /// JS `x > y`.
    pub fn gt(self, other: Dbl) -> bool {
        self.compare(other) == Some(Ordering::Greater)
    }

    /// JS `x >= y`.
    pub fn ge(self, other: Dbl) -> bool {
        matches!(
            self.compare(other),
            Some(Ordering::Greater | Ordering::Equal)
        )
    }

    /// JS `x === y`.
    pub fn js_eq(self, other: Dbl) -> bool {
        self.compare(other) == Some(Ordering::Equal)
    }

    /// The order `Array.prototype.sort` takes from the comparator `(a, b) => a - b`: the sign of
    /// `a - b`, with a `NaN` result read as `+0` (ECMAScript SortCompare).
    pub fn sort_order(a: Dbl, b: Dbl) -> Ordering {
        let d = a - b;
        if d.lt(Dbl::ZERO) {
            Ordering::Less
        } else if d.gt(Dbl::ZERO) {
            Ordering::Greater
        } else {
            Ordering::Equal
        }
    }
}

impl Neg for Dbl {
    type Output = Dbl;

    /// JS `-x`.
    fn neg(self) -> Dbl {
        if self.is_nan() {
            Dbl::NAN
        } else {
            Dbl(self.0 ^ SIGN)
        }
    }
}

impl Add for Dbl {
    type Output = Dbl;

    /// JS `x + y`.
    fn add(self, other: Dbl) -> Dbl {
        match (self.class(), other.class()) {
            (Class::Nan, _) | (_, Class::Nan) => Dbl::NAN,
            (Class::Inf(a), Class::Inf(b)) => {
                if a == b {
                    self
                } else {
                    Dbl::NAN
                }
            }
            (Class::Inf(_), _) => self,
            (_, Class::Inf(_)) => other,
            (Class::Zero(a), Class::Zero(b)) => zero(a && b),
            (Class::Zero(_), _) => other,
            (_, Class::Zero(_)) => self,
            (Class::Finite(na, ma, ea), Class::Finite(nb, mb, eb)) => {
                let ((nh, mh, eh), (nl, ml, el)) = if ea >= eb {
                    ((na, ma, ea), (nb, mb, eb))
                } else {
                    ((nb, mb, eb), (na, ma, ea))
                };
                let gap = (eh - el).unsigned_abs();
                // Up to a gap of 66 the sum is exact in 120 bits. Past it the smaller term lies
                // below every bit that decides the rounding of the larger one (a normal number,
                // since a subnormal term leaves no gap) and is kept as a sticky bit 66 bits
                // under it.
                let (hi, lo, sticky, e) = if gap <= 66 {
                    (u128::from(mh) << gap, u128::from(ml), false, el)
                } else {
                    let s = gap - 66;
                    let (lo, sticky) = if s >= 64 {
                        (0, true)
                    } else {
                        (ml >> s, ml & ((1 << s) - 1) != 0)
                    };
                    (u128::from(mh) << 66, u128::from(lo), sticky, eh - 66)
                };
                if nh == nl {
                    round(nh, hi + lo, sticky, e)
                } else if sticky {
                    // hi - (lo + s) = (hi - lo - 1) + (1 - s), with 0 < 1 - s < 1.
                    round(nh, hi - lo - 1, true, e)
                } else {
                    match hi.cmp(&lo) {
                        Ordering::Greater => round(nh, hi - lo, false, e),
                        Ordering::Less => round(nl, lo - hi, false, e),
                        Ordering::Equal => Dbl::ZERO,
                    }
                }
            }
        }
    }
}

impl Sub for Dbl {
    type Output = Dbl;

    /// JS `x - y`, which IEEE-754 defines as `x + (-y)`.
    fn sub(self, other: Dbl) -> Dbl {
        self + -other
    }
}

impl Mul for Dbl {
    type Output = Dbl;

    /// JS `x * y`.
    fn mul(self, other: Dbl) -> Dbl {
        match (self.class(), other.class()) {
            (Class::Nan, _) | (_, Class::Nan) => Dbl::NAN,
            (Class::Inf(_), Class::Zero(_)) | (Class::Zero(_), Class::Inf(_)) => Dbl::NAN,
            (Class::Inf(a), Class::Inf(b))
            | (Class::Inf(a), Class::Finite(b, ..))
            | (Class::Finite(a, ..), Class::Inf(b)) => infinity(a != b),
            (Class::Zero(a), Class::Zero(b))
            | (Class::Zero(a), Class::Finite(b, ..))
            | (Class::Finite(a, ..), Class::Zero(b)) => zero(a != b),
            (Class::Finite(na, ma, ea), Class::Finite(nb, mb, eb)) => {
                round(na != nb, u128::from(ma) * u128::from(mb), false, ea + eb)
            }
        }
    }
}

impl Div for Dbl {
    type Output = Dbl;

    /// JS `x / y`.
    fn div(self, other: Dbl) -> Dbl {
        match (self.class(), other.class()) {
            (Class::Nan, _) | (_, Class::Nan) => Dbl::NAN,
            (Class::Inf(_), Class::Inf(_)) | (Class::Zero(_), Class::Zero(_)) => Dbl::NAN,
            (Class::Inf(a), Class::Zero(b))
            | (Class::Inf(a), Class::Finite(b, ..))
            | (Class::Finite(a, ..), Class::Zero(b)) => infinity(a != b),
            (Class::Zero(a), Class::Inf(b))
            | (Class::Finite(a, ..), Class::Inf(b))
            | (Class::Zero(a), Class::Finite(b, ..)) => zero(a != b),
            (Class::Finite(na, ma, ea), Class::Finite(nb, mb, eb)) => {
                let (ma, ea) = normalise(ma, ea);
                let (mb, eb) = normalise(mb, eb);
                // Both mantissas have 53 bits, so the quotient has 62 or 63.
                let num = u128::from(ma) << 62;
                let den = u128::from(mb);
                round(na != nb, num / den, num % den != 0, ea - eb - 62)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn int(n: i64) -> Dbl {
        Dbl::from_int(n)
    }

    /// `n / 10^k` as JS parses the decimal literal.
    fn decimal(n: i64, k: u32) -> Dbl {
        int(n) / int(10i64.pow(k))
    }

    #[test]
    fn bit_patterns_of_known_values() {
        assert_eq!(int(1).to_bits(), 0x3ff0_0000_0000_0000);
        assert_eq!(int(-2).to_bits(), 0xc000_0000_0000_0000);
        assert_eq!((int(7) / int(2)).to_bits(), 0x400c_0000_0000_0000); // 3.5
        assert_eq!(decimal(1, 1).to_bits(), 0x3fb9_9999_9999_999a); // 0.1
        assert_eq!(decimal(3, 1).to_bits(), 0x3fd3_3333_3333_3333); // 0.3
                                                                    // 0.1 + 0.2 === 0.30000000000000004.
        assert_eq!(
            (decimal(1, 1) + decimal(2, 1)).to_bits(),
            0x3fd3_3333_3333_3334
        );
        assert_eq!((int(1) / int(3)).to_bits(), 0x3fd5_5555_5555_5555);
        assert_eq!(int(2).sqrt().to_bits(), 0x3ff6_a09e_667f_3bcd);
        assert_eq!(int(1 << 53).to_bits(), 0x4340_0000_0000_0000);
        // 2^53 + 1 rounds to even (2^53); 2^53 + 3 rounds up to 2^53 + 4.
        assert_eq!(int((1 << 53) + 1), int(1 << 53));
        assert_eq!(int((1 << 53) + 3), int((1 << 53) + 4));
    }

    #[test]
    fn subnormals_overflow_and_specials() {
        let min_normal = Dbl::from_bits(0x0010_0000_0000_0000);
        let tiny = Dbl::from_bits(1);
        assert_eq!((min_normal / int(1 << 52)).to_bits(), 1);
        assert_eq!((tiny / int(2)).to_bits(), 0); // a tie rounds to the even 0
        assert_eq!((tiny * int(3) / int(2)).to_bits(), 2); // 1.5 ulp: tie to even 2
        assert_eq!((min_normal - tiny).to_bits(), 0x000f_ffff_ffff_ffff);
        let max = Dbl::from_bits(0x7fef_ffff_ffff_ffff);
        assert_eq!((max + max).to_bits(), INF_BITS);
        assert_eq!((max * int(-2)).to_bits(), SIGN | INF_BITS);
        assert!((int(0) / int(0)).is_nan());
        assert_eq!((int(1) / int(0)).to_bits(), INF_BITS);
        assert_eq!((int(-1) / int(0)).to_bits(), SIGN | INF_BITS);
        assert!((infinity(false) - infinity(false)).is_nan());
        assert!((infinity(false) * int(0)).is_nan());
        assert_eq!((int(1) / infinity(true)).to_bits(), SIGN);
        assert_eq!((int(3) - int(3)).to_bits(), 0);
        assert_eq!((zero(true) + zero(true)).to_bits(), SIGN);
        assert_eq!((zero(true) - zero(false)).to_bits(), SIGN);
        assert!(int(-4).sqrt().is_nan());
        assert_eq!(zero(true).sqrt().to_bits(), SIGN);
        assert!(!Dbl::NAN.lt(int(1)) && !Dbl::NAN.ge(int(1)) && !Dbl::NAN.js_eq(Dbl::NAN));
        assert!(zero(true).js_eq(Dbl::ZERO) && zero(true) != Dbl::ZERO);
        assert_eq!(
            Dbl::sort_order(infinity(false), infinity(false)),
            Ordering::Equal
        );
        assert_eq!(Dbl::sort_order(int(1), int(2)), Ordering::Less);
        assert_eq!(Dbl::sort_order(Dbl::NAN, int(2)), Ordering::Equal);
    }

    #[test]
    fn rounding_of_sums_far_apart_and_cancellations() {
        // 1 + 2^-53 is a tie: even 1. 1 + 2^-53 + 2^-105 is above it: 1 + 2^-52.
        let one = int(1);
        let h = one / int(1 << 53);
        assert_eq!(one + h, one);
        let tiny = h / int(1 << 52);
        assert_eq!((one + (h + tiny)).to_bits(), 0x3ff0_0000_0000_0001);
        // 1 - 2^-54 lies between the two neighbours below 1: tie to even, 1.
        let q = h / int(2);
        assert_eq!(one - q, one);
        // A term below every bit of the other: 2^60 - 2^-60 is 2^60.
        let big = int(1 << 60);
        let small = one / big;
        assert_eq!(big - small, big);
        assert_eq!(big + small, big);
        // (2^53 - 1) - (2^53 - 2) = 1, exact.
        assert_eq!(int((1 << 53) - 1) - int((1 << 53) - 2), one);
    }

    #[test]
    fn floor_and_round_follow_math_floor_and_math_round() {
        let half = int(1) / int(2);
        assert_eq!(half.floor_int(), Some(0));
        assert_eq!((-half).floor_int(), Some(-1));
        assert_eq!(half.round_int(), Some(1));
        assert_eq!((-half).round_int(), Some(0)); // Math.round(-0.5) is -0
        assert_eq!((int(-5) / int(2)).round_int(), Some(-2));
        assert_eq!((int(5) / int(2)).round_int(), Some(3));
        assert_eq!(decimal(-1, 1).floor_int(), Some(-1));
        // 363 - 2^-44, the double just below 363 (prints as 362.99999999999994).
        assert_eq!((int(363) - int(1) / int(1 << 44)).floor_int(), Some(362));
        assert_eq!(int(i64::MAX).floor_int(), None); // 2^63 is past i64
        assert_eq!(Dbl::NAN.floor_int(), None);
        assert_eq!(infinity(true).round_int(), None);
        assert_eq!(Dbl::from_bits(1).round_int(), Some(0));
    }
}
