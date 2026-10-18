//! JavaScript Number arithmetic on IEEE-754 binary64 bit patterns, computed with integers.
//!
//! hyperbehcs-core.cjs works on signed values (vector entries, `value - min`), takes square roots
//! (lines 57, 72-73, 126, 162) and feeds V8's fdlibm functions, so the whole binary64 domain is
//! covered: both zeros, subnormals, infinities and NaN. `+ - * /` and `sqrt` round to nearest,
//! ties to even, exactly as the hardware V8 runs on.

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Neg, Sub};

const SIGN: u64 = 1 << 63;
const FRAC_MASK: u64 = (1 << 52) - 1;
const HIDDEN: u64 = 1 << 52;
const EXP_ALL: u64 = 0x7FF << 52;

/// A JavaScript Number, held as its IEEE-754 binary64 bit pattern.
///
/// `==` on this type compares bit patterns; [`Number::js_eq`] is JavaScript `===`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Number(u64);

/// Magnitude of a finite non-zero value as `mant * 2^exp` with `mant < 2^53`.
fn split(bits: u64) -> (u64, i32) {
    let biased = ((bits >> 52) & 0x7FF) as i32;
    let frac = bits & FRAC_MASK;
    if biased == 0 {
        (frac, -1074)
    } else {
        (frac | HIDDEN, biased - 1075)
    }
}

/// [`split`] with `mant` shifted into `2^52..2^53`.
fn split_normalized(bits: u64) -> (u64, i32) {
    let (mant, exp) = split(bits);
    let shift = mant.leading_zeros() as i32 - 11;
    (mant << shift, exp - shift)
}

/// Rounds `q * 2^exp`, plus a positive amount below one unit of `q` when `sticky`, to binary64.
///
/// With `sticky` set, `q` must carry at least 55 bits so the rounding position lies above it.
fn round_pack(negative: bool, q: u128, exp: i32, sticky: bool) -> Number {
    let sign = if negative { SIGN } else { 0 };
    if q == 0 {
        return Number(sign);
    }
    let len = 128 - q.leading_zeros() as i32;
    let mut unit = (exp + len - 53).max(-1074);
    let shift = unit - exp;
    let mut mant: u128 = if shift <= 0 {
        debug_assert!(!sticky);
        q << (-shift) as u32
    } else if shift > len {
        0
    } else {
        let s = shift as u32;
        let mut mant = q >> s;
        let rest = q & ((1u128 << s) - 1);
        let half = 1u128 << (s - 1);
        if rest > half || (rest == half && (sticky || mant & 1 == 1)) {
            mant += 1;
        }
        mant
    };
    if mant == 1u128 << 53 {
        mant >>= 1;
        unit += 1;
    }
    let mant = mant as u64;
    if mant < HIDDEN {
        return Number(sign | mant);
    }
    let biased = unit + 1075;
    if biased >= 0x7FF {
        return Number(sign | EXP_ALL);
    }
    Number(sign | ((biased as u64) << 52) | (mant & FRAC_MASK))
}

fn isqrt(n: u128) -> u128 {
    let mut rest = n;
    let mut root = 0u128;
    let mut bit = 1u128 << 126;
    while bit > rest {
        bit >>= 2;
    }
    while bit != 0 {
        if rest >= root + bit {
            rest -= root + bit;
            root = (root >> 1) + bit;
        } else {
            root >>= 1;
        }
        bit >>= 2;
    }
    root
}

impl Number {
    /// `+0`.
    pub const ZERO: Number = Number(0);
    /// `-0`.
    pub const NEG_ZERO: Number = Number(SIGN);
    /// `1`.
    pub const ONE: Number = Number(0x3FF0_0000_0000_0000);
    /// `NaN` (the quiet NaN V8 produces).
    pub const NAN: Number = Number(0x7FF8_0000_0000_0000);
    /// `Infinity`.
    pub const INFINITY: Number = Number(EXP_ALL);
    /// `-Infinity`.
    pub const NEG_INFINITY: Number = Number(SIGN | EXP_ALL);
    /// `Math.PI`.
    pub const PI: Number = Number(0x4009_21FB_5444_2D18);

    /// The Number with this IEEE-754 bit pattern.
    pub const fn from_bits(bits: u64) -> Number {
        Number(bits)
    }

    /// The IEEE-754 bit pattern.
    pub const fn to_bits(self) -> u64 {
        self.0
    }

    /// The Number nearest `n` (exact for `|n| <= 2^53`).
    pub fn from_i64(n: i64) -> Number {
        round_pack(n < 0, u128::from(n.unsigned_abs()), 0, false)
    }

    /// The Number nearest `n` (exact for `n <= 2^53`).
    pub fn from_u64(n: u64) -> Number {
        round_pack(false, u128::from(n), 0, false)
    }

    /// `Number.isNaN(x)`.
    pub fn is_nan(self) -> bool {
        self.0 & !SIGN > EXP_ALL
    }

    /// `Number.isFinite(x)`.
    pub fn is_finite(self) -> bool {
        self.0 & EXP_ALL != EXP_ALL
    }

    /// True for `Infinity` and `-Infinity`.
    pub fn is_infinite(self) -> bool {
        self.0 & !SIGN == EXP_ALL
    }

    /// True for `0` and `-0`.
    pub fn is_zero(self) -> bool {
        self.0 & !SIGN == 0
    }

    /// True when the sign bit is set (including `-0` and negative NaNs).
    pub fn is_sign_negative(self) -> bool {
        self.0 & SIGN != 0
    }

    /// `Math.abs(x)`.
    pub fn abs(self) -> Number {
        Number(self.0 & !SIGN)
    }

    /// JavaScript `a === b`.
    pub fn js_eq(self, other: Number) -> bool {
        self.compare(other) == Some(Ordering::Equal)
    }

    /// JavaScript `a < b`.
    pub fn lt(self, other: Number) -> bool {
        self.compare(other) == Some(Ordering::Less)
    }

    /// JavaScript `a > b`.
    pub fn gt(self, other: Number) -> bool {
        self.compare(other) == Some(Ordering::Greater)
    }

    /// JavaScript `a >= b`.
    pub fn ge(self, other: Number) -> bool {
        matches!(
            self.compare(other),
            Some(Ordering::Greater | Ordering::Equal)
        )
    }

    /// Numeric order of two Numbers: `None` when either is NaN, `-0` equal to `+0`.
    pub fn compare(self, other: Number) -> Option<Ordering> {
        if self.is_nan() || other.is_nan() {
            return None;
        }
        Some(self.order_key().cmp(&other.order_key()))
    }

    fn order_key(self) -> i64 {
        let magnitude = (self.0 & !SIGN) as i64;
        if self.is_sign_negative() {
            -magnitude
        } else {
            magnitude
        }
    }

    /// The order `Math.min` and `Math.max` apply: numeric, with `-0` below `+0`.
    fn min_max_less(self, other: Number) -> bool {
        match self.compare(other) {
            Some(Ordering::Less) => true,
            Some(Ordering::Equal) => self.is_sign_negative() && !other.is_sign_negative(),
            _ => false,
        }
    }

    /// `Math.min(a, b)`.
    pub fn js_min(self, other: Number) -> Number {
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        if other.min_max_less(self) {
            other
        } else {
            self
        }
    }

    /// `Math.max(a, b)`.
    pub fn js_max(self, other: Number) -> Number {
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        if self.min_max_less(other) {
            other
        } else {
            self
        }
    }

    /// `Math.min(...values)` (`Infinity` for no values).
    pub fn min_of(values: &[Number]) -> Number {
        values
            .iter()
            .fold(Number::INFINITY, |acc, &v| acc.js_min(v))
    }

    /// `Math.max(...values)` (`-Infinity` for no values).
    pub fn max_of(values: &[Number]) -> Number {
        values
            .iter()
            .fold(Number::NEG_INFINITY, |acc, &v| acc.js_max(v))
    }

    /// `x || 0`: `0`, `-0` and NaN become `+0`.
    pub fn or_zero(self) -> Number {
        if self.is_zero() || self.is_nan() {
            Number::ZERO
        } else {
            self
        }
    }

    /// `Math.sqrt(x)`, correctly rounded.
    pub fn sqrt(self) -> Number {
        if self.is_nan() || (self.is_sign_negative() && !self.is_zero()) {
            return Number::NAN;
        }
        if self.is_zero() || self.is_infinite() {
            return self;
        }
        let (mant, exp) = split_normalized(self.0);
        // mant << k lies in 2^110..2^113, so the root carries at least 55 bits.
        let k = if (exp - 58) % 2 == 0 { 58 } else { 59 };
        let n = u128::from(mant) << k;
        let root = isqrt(n);
        round_pack(false, root, (exp - k) / 2, root * root != n)
    }

    /// The integer part of a finite `x`, rounded toward zero (C's `static_cast<int64_t>`).
    pub fn trunc_i64(self) -> i64 {
        assert!(self.is_finite(), "non-finite value");
        if self.is_zero() {
            return 0;
        }
        let (mant, exp) = split(self.0);
        let magnitude = if exp >= 0 {
            assert!(exp <= 10, "value outside the i64 domain");
            (mant << exp) as i64
        } else if exp <= -64 {
            0
        } else {
            (mant >> (-exp) as u32) as i64
        };
        if self.is_sign_negative() {
            -magnitude
        } else {
            magnitude
        }
    }

    /// `x` scaled by `2^n` (C's `scalbn`, exact when no overflow or underflow occurs).
    pub fn scalbn(self, n: i32) -> Number {
        if self.is_nan() || self.is_infinite() || self.is_zero() {
            return self;
        }
        let (mant, exp) = split(self.0);
        round_pack(self.is_sign_negative(), u128::from(mant), exp + n, false)
    }

    /// `Math.floor(x)`.
    pub fn floor(self) -> Number {
        let t = self.trunc_toward_zero();
        if self.is_sign_negative() && !t.js_eq(self) {
            t - Number::ONE
        } else {
            t
        }
    }

    /// `Math.ceil(x)`.
    pub fn ceil(self) -> Number {
        let t = self.trunc_toward_zero();
        if !self.is_sign_negative() && !t.js_eq(self) {
            t + Number::ONE
        } else if self.is_sign_negative() && t.is_zero() {
            Number::NEG_ZERO
        } else {
            t
        }
    }

    /// `Math.trunc(x)`.
    fn trunc_toward_zero(self) -> Number {
        if !self.is_finite() || self.is_zero() {
            return self;
        }
        let (_, exp) = split(self.0);
        if exp >= 0 {
            return self;
        }
        let biased = ((self.0 >> 52) & 0x7FF) as i32;
        if biased < 1023 {
            return Number(self.0 & SIGN);
        }
        let drop = (1075 - biased) as u32;
        Number(self.0 & !((1u64 << drop) - 1))
    }

    /// `Math.round(x)`: the integer nearest `x`, ties toward `+Infinity`, `-0` for `-0.5 <= x < 0`.
    pub fn js_round(self) -> Number {
        if !self.is_finite() || self.is_zero() {
            return self;
        }
        let (mant, exp) = split(self.0);
        if exp >= 0 {
            return self;
        }
        let k = (-exp) as u32;
        let negative = self.is_sign_negative();
        let n = if k > 64 {
            0
        } else {
            let whole = u128::from(mant) >> k;
            let frac = u128::from(mant) & ((1u128 << k) - 1);
            let half = 1u128 << (k - 1);
            let up = if negative { frac > half } else { frac >= half };
            whole + u128::from(up)
        };
        round_pack(negative, n, 0, false)
    }

    /// The high 32 bits as fdlibm's `GET_HIGH_WORD` reads them (a signed int32).
    pub fn high_word(self) -> i32 {
        (self.0 >> 32) as u32 as i32
    }

    /// The low 32 bits (`GET_LOW_WORD`).
    pub fn low_word(self) -> u32 {
        self.0 as u32
    }

    /// fdlibm's `INSERT_WORDS(d, hi, lo)`.
    pub fn from_words(hi: i32, lo: u32) -> Number {
        Number((u64::from(hi as u32) << 32) | u64::from(lo))
    }

    /// fdlibm's `SET_LOW_WORD(d, lo)`.
    pub fn with_low_word(self, lo: u32) -> Number {
        Number((self.0 & 0xFFFF_FFFF_0000_0000) | u64::from(lo))
    }
}

impl Neg for Number {
    type Output = Number;

    /// JavaScript unary `-x`.
    fn neg(self) -> Number {
        Number(self.0 ^ SIGN)
    }
}

impl Add for Number {
    type Output = Number;

    /// JavaScript `a + b`.
    fn add(self, other: Number) -> Number {
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        if self.is_infinite() {
            if other.is_infinite() && self.0 != other.0 {
                return Number::NAN;
            }
            return self;
        }
        if other.is_infinite() {
            return other;
        }
        if self.is_zero() && other.is_zero() {
            return Number(self.0 & other.0);
        }
        if self.is_zero() {
            return other;
        }
        if other.is_zero() {
            return self;
        }
        let (ma, ea) = split(self.0);
        let (mb, eb) = split(other.0);
        let (big, small, (mbig, ebig), (msmall, esmall)) = if ea >= eb {
            (self, other, (ma, ea), (mb, eb))
        } else {
            (other, self, (mb, eb), (ma, ea))
        };
        let gap = (ebig - esmall) as u32;
        // Past 70 bits the smaller addend is below 2^-17 of the larger's unit and cannot round.
        if gap > 70 {
            return big;
        }
        let a = u128::from(mbig) << gap;
        let b = u128::from(msmall);
        if big.is_sign_negative() == small.is_sign_negative() {
            return round_pack(big.is_sign_negative(), a + b, esmall, false);
        }
        match a.cmp(&b) {
            Ordering::Equal => Number::ZERO,
            Ordering::Greater => round_pack(big.is_sign_negative(), a - b, esmall, false),
            Ordering::Less => round_pack(small.is_sign_negative(), b - a, esmall, false),
        }
    }
}

impl Sub for Number {
    type Output = Number;

    /// JavaScript `a - b`.
    fn sub(self, other: Number) -> Number {
        self + -other
    }
}

impl Mul for Number {
    type Output = Number;

    /// JavaScript `a * b`.
    fn mul(self, other: Number) -> Number {
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        let negative = self.is_sign_negative() != other.is_sign_negative();
        let sign = if negative { SIGN } else { 0 };
        if self.is_infinite() || other.is_infinite() {
            if self.is_zero() || other.is_zero() {
                return Number::NAN;
            }
            return Number(sign | EXP_ALL);
        }
        if self.is_zero() || other.is_zero() {
            return Number(sign);
        }
        let (ma, ea) = split(self.0);
        let (mb, eb) = split(other.0);
        round_pack(negative, u128::from(ma) * u128::from(mb), ea + eb, false)
    }
}

impl Div for Number {
    type Output = Number;

    /// JavaScript `a / b`.
    fn div(self, other: Number) -> Number {
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        let negative = self.is_sign_negative() != other.is_sign_negative();
        let sign = if negative { SIGN } else { 0 };
        if self.is_infinite() {
            if other.is_infinite() {
                return Number::NAN;
            }
            return Number(sign | EXP_ALL);
        }
        if other.is_infinite() {
            return Number(sign);
        }
        if other.is_zero() {
            if self.is_zero() {
                return Number::NAN;
            }
            return Number(sign | EXP_ALL);
        }
        if self.is_zero() {
            return Number(sign);
        }
        let (ma, ea) = split_normalized(self.0);
        let (mb, eb) = split_normalized(other.0);
        // Both in 2^52..2^53, so the quotient has 55 or 56 bits.
        let num = u128::from(ma) << 55;
        let den = u128::from(mb);
        round_pack(negative, num / den, ea - eb - 55, num % den != 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn n(bits: u64) -> Number {
        Number::from_bits(bits)
    }

    #[test]
    fn small_integer_arithmetic_is_exact() {
        let three = Number::from_i64(3);
        let four = Number::from_i64(4);
        assert_eq!((three * three + four * four).sqrt(), Number::from_i64(5));
        assert_eq!(Number::from_i64(-7) + Number::from_i64(7), Number::ZERO);
        assert_eq!(
            Number::from_i64(10) / Number::from_i64(4),
            n(0x4004_0000_0000_0000)
        );
    }

    #[test]
    fn decimal_rounding_matches_javascript() {
        // JS: 0.1 + 0.2 === 0.30000000000000004 (bits 0x3FD3333333333334).
        let a = n(0x3FB9_9999_9999_999A);
        let b = n(0x3FC9_9999_9999_999A);
        assert_eq!((a + b).to_bits(), 0x3FD3_3333_3333_3334);
        // JS: Math.sqrt(3) === 1.7320508075688772 (bits 0x3FFBB67AE8584CAA).
        assert_eq!(Number::from_i64(3).sqrt().to_bits(), 0x3FFB_B67A_E858_4CAA);
    }

    #[test]
    fn math_round_follows_the_specification() {
        let half = n(0x3FE0_0000_0000_0000);
        assert_eq!(half.js_round(), Number::ONE);
        assert_eq!((-half).js_round(), Number::NEG_ZERO);
        assert_eq!(n(0xC004_0000_0000_0000).js_round(), Number::from_i64(-2)); // -2.5
        assert_eq!(n(0x4004_0000_0000_0000).js_round(), Number::from_i64(3)); // 2.5
                                                                              // 0.49999999999999994 rounds to 0, not 1.
        assert_eq!(n(0x3FDF_FFFF_FFFF_FFFF).js_round(), Number::ZERO);
    }

    #[test]
    fn signed_zeros_and_specials() {
        assert_eq!(Number::NEG_ZERO + Number::NEG_ZERO, Number::NEG_ZERO);
        assert_eq!(Number::NEG_ZERO + Number::ZERO, Number::ZERO);
        assert_eq!(Number::ZERO - Number::ZERO, Number::ZERO);
        assert!((Number::INFINITY - Number::INFINITY).is_nan());
        assert!((Number::ZERO / Number::ZERO).is_nan());
        assert_eq!(Number::ONE / Number::NEG_ZERO, Number::NEG_INFINITY);
        assert_eq!(Number::ZERO.js_min(Number::NEG_ZERO), Number::NEG_ZERO);
        assert_eq!(Number::NEG_ZERO.js_max(Number::ZERO), Number::ZERO);
        assert!(Number::NEG_ZERO.js_eq(Number::ZERO));
        assert_eq!(Number::NEG_ZERO.or_zero(), Number::ZERO);
        assert_eq!(Number::NEG_ZERO.sqrt(), Number::NEG_ZERO);
    }

    #[test]
    fn subnormals_round_trip() {
        let tiny = n(1); // 5e-324
        assert_eq!(tiny + tiny, n(2));
        assert_eq!(tiny / Number::from_i64(2), Number::ZERO); // ties to even
        assert_eq!((tiny * Number::from_i64(3)) / Number::from_i64(2), n(2));
        let min_normal = n(0x0010_0000_0000_0000);
        assert_eq!(min_normal - tiny, n(0x000F_FFFF_FFFF_FFFF));
    }

    #[test]
    fn ceil_floor_trunc() {
        let x = n(0x4004_CCCC_CCCC_CCCD); // 2.6
        assert_eq!(x.ceil(), Number::from_i64(3));
        assert_eq!(x.floor(), Number::from_i64(2));
        assert_eq!((-x).ceil(), Number::from_i64(-2));
        assert_eq!((-x).floor(), Number::from_i64(-3));
        assert_eq!(n(0xBFE0_0000_0000_0000).ceil(), Number::NEG_ZERO);
        assert_eq!(x.trunc_i64(), 2);
        assert_eq!((-x).trunc_i64(), -2);
    }
}
