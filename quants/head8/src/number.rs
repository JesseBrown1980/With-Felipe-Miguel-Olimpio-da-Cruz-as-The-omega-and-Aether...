//! JavaScript Number arithmetic on IEEE-754 binary64 bit patterns, computed with integers.
//!
//! Signed values, zeros of both signs, subnormals, infinities and NaN are all in the domain,
//! because quant-huge-message-benchmark.mjs accumulates signed message values (line 55) and
//! V8's `Math.log2` works on negative intermediates. `+ - * /` round to nearest, ties to even.

use core::ops::{Add, Div, Mul, Neg, Sub};

const SIGN: u64 = 1 << 63;
const EXP_MASK: u64 = 0x7FF0_0000_0000_0000;
const FRAC_MASK: u64 = (1 << 52) - 1;
const HIDDEN: u64 = 1 << 52;

/// A JavaScript Number, held as its IEEE-754 binary64 bit pattern.
///
/// `==` on this type compares bit patterns; [`Number::js_eq`] is JavaScript `===`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Number(u64);

/// Magnitude of a finite non-zero value as `mant * 2^exp`, `mant < 2^53`.
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
/// When `sticky` is set the result's unit must lie above `2^exp` (callers give `q` 55+ bits).
fn round_pack(negative: bool, q: u128, exp: i32, sticky: bool) -> Number {
    let sign = if negative { SIGN } else { 0 };
    if q == 0 {
        return Number(sign);
    }
    let len = 128 - q.leading_zeros() as i32;
    debug_assert!(len < 128);
    let mut unit = (exp + len - 53).max(-1074);
    let shift = unit - exp;
    let mut mant = if shift <= 0 {
        debug_assert!(!sticky);
        (q << (-shift) as u32) as u64
    } else if shift > len {
        0
    } else {
        let shift = shift as u32;
        let mut mant = (q >> shift) as u64;
        let rest = q & ((1u128 << shift) - 1);
        let half = 1u128 << (shift - 1);
        if rest > half || (rest == half && (sticky || mant & 1 == 1)) {
            mant += 1;
        }
        mant
    };
    if mant == 1 << 53 {
        mant >>= 1;
        unit += 1;
    }
    if mant < HIDDEN {
        return Number(sign | mant);
    }
    let biased = unit + 1075;
    if biased >= 0x7FF {
        return Number(sign | EXP_MASK);
    }
    Number(sign | ((biased as u64) << 52) | (mant & FRAC_MASK))
}

impl Number {
    /// `+0`.
    pub const ZERO: Number = Number(0);
    /// `1`.
    pub const ONE: Number = Number(0x3FF0_0000_0000_0000);
    /// `NaN` (the quiet NaN with an empty payload).
    pub const NAN: Number = Number(0x7FF8_0000_0000_0000);
    /// `Infinity`.
    pub const INFINITY: Number = Number(EXP_MASK);
    /// `-Infinity`.
    pub const NEG_INFINITY: Number = Number(SIGN | EXP_MASK);

    /// The Number with this binary64 bit pattern (a `Float64Array` element read as `BigUint64`).
    #[inline]
    pub const fn from_bits(bits: u64) -> Number {
        Number(bits)
    }

    /// The binary64 bit pattern.
    #[inline]
    pub const fn to_bits(self) -> u64 {
        self.0
    }

    /// The Number nearest `n` (exact for `|n| < 2^53`).
    pub fn from_i64(n: i64) -> Number {
        round_pack(n < 0, u128::from(n.unsigned_abs()), 0, false)
    }

    /// The Number nearest `k * 2^-unit`: exact whenever that value is representable, as it is
    /// for `|k| < 2^53` and `unit <= 1074`.
    pub fn from_scaled(k: i64, unit: u32) -> Number {
        round_pack(k < 0, u128::from(k.unsigned_abs()), -(unit as i32), false)
    }

    /// A finite value as `(negative, mant, exp)` with value `(-1)^negative * mant * 2^exp` and
    /// `mant < 2^53` (`mant = 0` for the zeros); `None` for NaN and the infinities.
    #[inline]
    pub fn decompose(self) -> Option<(bool, u64, i32)> {
        if !self.is_finite() {
            return None;
        }
        let mag = self.0 & !SIGN;
        if mag == 0 {
            return Some((self.sign_bit(), 0, 0));
        }
        let (mant, exp) = split(mag);
        Some((self.sign_bit(), mant, exp))
    }

    /// The Number nearest `n` (exact for `n < 2^53`).
    pub fn from_u64(n: u64) -> Number {
        round_pack(false, u128::from(n), 0, false)
    }

    /// The Number nearest `num / den` (one rounding), as JavaScript parses a decimal literal
    /// `num / 10^d` when `num` and `den` are below 2^53.
    pub fn from_ratio(num: u64, den: u64) -> Number {
        Number::from_u64(num) / Number::from_u64(den)
    }

    /// True for NaN.
    pub fn is_nan(self) -> bool {
        self.0 & !SIGN > EXP_MASK
    }

    /// True for every value except NaN and the two infinities.
    pub fn is_finite(self) -> bool {
        self.0 & EXP_MASK != EXP_MASK
    }

    /// True for `+0` and `-0`.
    pub fn is_zero(self) -> bool {
        self.0 & !SIGN == 0
    }

    /// True when the sign bit is set (including `-0` and negative NaN patterns).
    pub fn sign_bit(self) -> bool {
        self.0 & SIGN != 0
    }

    /// `Math.abs(x)`.
    pub fn abs(self) -> Number {
        Number(self.0 & !SIGN)
    }

    /// Ordering key for non-NaN values: `-0` and `+0` share the key 0.
    fn key(self) -> i64 {
        let mag = (self.0 & !SIGN) as i64;
        if self.sign_bit() {
            -mag
        } else {
            mag
        }
    }

    /// JavaScript `a < b` (false when either is NaN).
    pub fn lt(self, other: Number) -> bool {
        !self.is_nan() && !other.is_nan() && self.key() < other.key()
    }

    /// JavaScript `a > b` (false when either is NaN).
    pub fn gt(self, other: Number) -> bool {
        other.lt(self)
    }

    /// JavaScript `a === b` on Numbers (`-0 === 0`; NaN equals nothing).
    pub fn js_eq(self, other: Number) -> bool {
        !self.is_nan() && !other.is_nan() && self.key() == other.key()
    }

    /// `Math.round(x)`: the integral Number closest to `x`, ties toward `+Infinity`; `-0` for
    /// `-0.5 <= x < 0`.
    pub fn js_round(self) -> Number {
        if !self.is_finite() || self.is_zero() {
            return self;
        }
        let mag = self.0 & !SIGN;
        let biased = mag >> 52;
        if biased >= 1075 {
            // |x| >= 2^52: already integral.
            return self;
        }
        if biased < 1022 {
            // |x| < 1/2.
            return Number(self.0 & SIGN);
        }
        let (mant, exp) = split(mag);
        let k = exp.unsigned_abs();
        let twice = u128::from(mant) * 2;
        if !self.sign_bit() {
            // floor(x + 1/2)
            let n = (twice + (1u128 << k)) >> (k + 1);
            return Number::from_u64(n as u64);
        }
        // x = -y: floor(-y + 1/2) = -ceil(y - 1/2), and -0 when y <= 1/2.
        if twice <= 1u128 << k {
            return Number(SIGN);
        }
        let num = twice - (1u128 << k);
        let n = (num + (1u128 << (k + 1)) - 1) >> (k + 1);
        Number::from_i64(-(n as i64))
    }

    /// ECMAScript `ToInt32(x)`: truncate, then wrap modulo 2^32 into `-2^31..2^31`.
    pub fn to_int32(self) -> i32 {
        self.to_uint32() as i32
    }

    /// ECMAScript `ToUint32(x)` (`x >>> 0`): truncate, then wrap modulo 2^32.
    pub fn to_uint32(self) -> u32 {
        if !self.is_finite() || self.is_zero() {
            return 0;
        }
        let (mant, exp) = split(self.0 & !SIGN);
        let low = if exp >= 0 {
            if exp >= 32 {
                0
            } else {
                ((u128::from(mant) << exp) & 0xFFFF_FFFF) as u32
            }
        } else if exp <= -64 {
            0
        } else {
            (mant >> exp.unsigned_abs()) as u32
        };
        if self.sign_bit() {
            low.wrapping_neg()
        } else {
            low
        }
    }

    /// ECMAScript `ToInt8(x)`, the value an `Int8Array` element stores.
    pub fn to_int8(self) -> i8 {
        self.to_uint32() as u8 as i8
    }

    /// ECMAScript `ToUint8(x)`, the value a `Uint8Array` element stores.
    pub fn to_uint8(self) -> u8 {
        self.to_uint32() as u8
    }

    /// The high 32 bits as fdlibm's `GET_HIGH_WORD` reads them (signed).
    pub fn high_word(self) -> i32 {
        (self.0 >> 32) as u32 as i32
    }

    /// The low 32 bits as fdlibm's `GET_LOW_WORD` reads them.
    pub fn low_word(self) -> u32 {
        self.0 as u32
    }

    /// fdlibm `SET_HIGH_WORD(x, hi)`.
    pub fn with_high_word(self, hi: u32) -> Number {
        Number((u64::from(hi) << 32) | (self.0 & 0xFFFF_FFFF))
    }

    /// fdlibm `SET_LOW_WORD(x, lo)`.
    pub fn with_low_word(self, lo: u32) -> Number {
        Number((self.0 & !0xFFFF_FFFF) | u64::from(lo))
    }

    /// `x.toFixed(digits)` for `|x| < 1e21` (digits <= 18): the nearest decimal with `digits`
    /// fraction digits, ties away from zero; `-` only for values below zero.
    pub fn to_fixed(self, digits: u32) -> String {
        assert!(
            self.is_finite() && digits <= 18,
            "outside the toFixed domain"
        );
        let negative = self.lt(Number::ZERO);
        let scale = 10u128.pow(digits);
        let units = if self.is_zero() {
            0
        } else {
            let (mant, exp) = split(self.0 & !SIGN);
            let scaled = u128::from(mant) * scale;
            if exp >= 0 {
                assert!(exp < 64, "outside the toFixed domain");
                scaled << exp
            } else {
                let k = exp.unsigned_abs();
                if k >= 120 {
                    0
                } else {
                    (2 * scaled + (1u128 << k)) >> (k + 1)
                }
            }
        };
        let (int, frac) = (units / scale, units % scale);
        let sign = if negative { "-" } else { "" };
        if digits == 0 {
            format!("{sign}{int}")
        } else {
            format!("{sign}{int}.{frac:0width$}", width = digits as usize)
        }
    }
}

impl Neg for Number {
    type Output = Number;

    /// JavaScript unary `-x` (flips the sign bit).
    #[inline]
    fn neg(self) -> Number {
        Number(self.0 ^ SIGN)
    }
}

/// `a + b` for two normal operands with a normal or infinite sum; `None` for a subnormal sum.
///
/// Significands carry 9 bits below the result's last place and the bits shifted out of the
/// smaller one are ORed into its lowest bit, so the rounding decision is the exact sum's
/// (the add/sub scheme of Berkeley SoftFloat). Selections are written as plain value choices
/// so the signs of random data cost no branch.
#[inline]
fn add_normals(a: u64, b: u64) -> Option<Number> {
    let swap = a & !SIGN < b & !SIGN;
    let big = if swap { b } else { a };
    let small = if swap { a } else { b };
    let big_exp = ((big >> 52) & 0x7FF) as i32;
    let gap = (big_exp - ((small >> 52) & 0x7FF) as i32) as u32;
    let big_sig = ((big & FRAC_MASK) | HIDDEN) << 9;
    let small_full = ((small & FRAC_MASK) | HIDDEN) << 9;
    // For a gap of 63 or more the whole significand is shifted out and only the jam bit stays.
    let g = gap.min(63);
    let small_sig = (small_full >> g) | u64::from((small_full << 1) << (63 - g) != 0);
    let sum = big_sig + small_sig;
    let difference = big_sig - small_sig;
    let raw = if (a ^ b) & SIGN == 0 { sum } else { difference };
    if raw == 0 {
        // Exact cancellation is +0 when rounding to nearest.
        return Some(Number::ZERO);
    }
    let lz = raw.leading_zeros();
    let sig = if lz == 1 {
        (raw >> 1) | (raw & 1)
    } else {
        raw << lz.saturating_sub(2)
    };
    let exp = big_exp + 2 - lz as i32;
    if exp <= 0 {
        return None;
    }
    if exp >= 0x7FF {
        return Some(Number((big & SIGN) | EXP_MASK));
    }
    let rest = sig & 0x1FF;
    let mant = sig >> 9;
    let round_up = rest > 0x100 || (rest == 0x100 && mant & 1 == 1);
    // A carry out of the significand moves into the exponent, up to Infinity at 0x7FF.
    let bits = (((exp - 1) as u64) << 52) + mant + u64::from(round_up);
    Some(Number((big & SIGN) | bits))
}

/// True for a finite, non-zero, non-subnormal value.
#[inline]
fn is_normal(bits: u64) -> bool {
    (((bits >> 52) & 0x7FF) as u32).wrapping_sub(1) < 0x7FE
}

impl Add for Number {
    type Output = Number;

    /// JavaScript `a + b`.
    #[inline]
    fn add(self, other: Number) -> Number {
        if is_normal(self.0) && is_normal(other.0) {
            if let Some(sum) = add_normals(self.0, other.0) {
                return sum;
            }
        }
        add_any(self, other)
    }
}

/// `a + b` over the whole binary64 domain, exact sum then one rounding.
fn add_any(this: Number, other: Number) -> Number {
    if this.is_nan() || other.is_nan() {
        return Number::NAN;
    }
    let (a_inf, b_inf) = (!this.is_finite(), !other.is_finite());
    if a_inf || b_inf {
        if a_inf && b_inf && this.sign_bit() != other.sign_bit() {
            return Number::NAN;
        }
        return if a_inf { this } else { other };
    }
    let (a_mag, b_mag) = (this.0 & !SIGN, other.0 & !SIGN);
    if a_mag == 0 && b_mag == 0 {
        // -0 + -0 is -0; every other sum of zeros is +0.
        return Number(this.0 & other.0 & SIGN);
    }
    if a_mag == 0 {
        return other;
    }
    if b_mag == 0 {
        return this;
    }
    let (big, small) = if a_mag >= b_mag {
        (this, other)
    } else {
        (other, this)
    };
    let (big_mant, big_exp) = split(big.0 & !SIGN);
    let (small_mant, small_exp) = split(small.0 & !SIGN);
    let negative = big.sign_bit();
    let subtract = big.sign_bit() != small.sign_bit();
    let gap = (big_exp - small_exp) as u32;
    if gap <= 64 {
        let wide = u128::from(big_mant) << gap;
        let q = if subtract {
            wide - u128::from(small_mant)
        } else {
            wide + u128::from(small_mant)
        };
        if q == 0 {
            // Exact cancellation is +0 when rounding to nearest.
            return Number::ZERO;
        }
        return round_pack(negative, q, small_exp, false);
    }
    // The smaller addend is below 2^-11 units of the larger: it only steers the rounding.
    let wide = u128::from(big_mant) << 3;
    let q = if subtract { wide - 1 } else { wide };
    round_pack(negative, q, big_exp - 3, true)
}

impl Sub for Number {
    type Output = Number;

    /// JavaScript `a - b`, which is `a + (-b)` for every binary64 pair.
    fn sub(self, other: Number) -> Number {
        self + (-other)
    }
}

impl Mul for Number {
    type Output = Number;

    /// JavaScript `a * b`.
    fn mul(self, other: Number) -> Number {
        let negative = self.sign_bit() != other.sign_bit();
        let sign = if negative { SIGN } else { 0 };
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        if !self.is_finite() || !other.is_finite() {
            if self.is_zero() || other.is_zero() {
                return Number::NAN;
            }
            return Number(sign | EXP_MASK);
        }
        if self.is_zero() || other.is_zero() {
            return Number(sign);
        }
        let (a_mant, a_exp) = split(self.0 & !SIGN);
        let (b_mant, b_exp) = split(other.0 & !SIGN);
        round_pack(
            negative,
            u128::from(a_mant) * u128::from(b_mant),
            a_exp + b_exp,
            false,
        )
    }
}

impl Div for Number {
    type Output = Number;

    /// JavaScript `a / b`.
    fn div(self, other: Number) -> Number {
        let negative = self.sign_bit() != other.sign_bit();
        let sign = if negative { SIGN } else { 0 };
        if self.is_nan() || other.is_nan() {
            return Number::NAN;
        }
        let (a_inf, b_inf) = (!self.is_finite(), !other.is_finite());
        if a_inf {
            return if b_inf {
                Number::NAN
            } else {
                Number(sign | EXP_MASK)
            };
        }
        if b_inf {
            return Number(sign);
        }
        if other.is_zero() {
            return if self.is_zero() {
                Number::NAN
            } else {
                Number(sign | EXP_MASK)
            };
        }
        if self.is_zero() {
            return Number(sign);
        }
        let (a_mant, a_exp) = split_normalized(self.0 & !SIGN);
        let (b_mant, b_exp) = split_normalized(other.0 & !SIGN);
        // A quotient of 61 or 62 bits keeps the rounding bit and a sticky remainder.
        let num = u128::from(a_mant) << 62;
        let den = u128::from(b_mant);
        round_pack(negative, num / den, a_exp - b_exp - 62, num % den != 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn n(bits: u64) -> Number {
        Number::from_bits(bits)
    }

    #[test]
    fn integers_are_exact_below_2_pow_53() {
        assert_eq!(Number::from_u64(1).to_bits(), 0x3FF0_0000_0000_0000);
        assert_eq!(Number::from_i64(-2).to_bits(), 0xC000_0000_0000_0000);
        assert_eq!(Number::from_u64((1 << 53) + 1), Number::from_u64(1 << 53));
        assert_eq!(
            Number::from_u64((1 << 53) + 3),
            Number::from_u64((1 << 53) + 4)
        );
        assert_eq!(Number::from_i64(0), Number::ZERO);
    }

    #[test]
    fn decimal_arithmetic_matches_javascript() {
        // 0.1 + 0.2 === 0.30000000000000004 (0x3FD3333333333334).
        let sum = Number::from_ratio(1, 10) + Number::from_ratio(2, 10);
        assert_eq!(sum.to_bits(), 0x3FD3_3333_3333_3334);
        // 0.3 / 0.1 === 2.9999999999999996.
        let q = Number::from_ratio(3, 10) / Number::from_ratio(1, 10);
        assert_eq!(q.to_bits(), 0x4007_FFFF_FFFF_FFFF);
        // 0.1 - 0.3 === -0.19999999999999998.
        let d = Number::from_ratio(1, 10) - Number::from_ratio(3, 10);
        assert_eq!(d.to_bits(), 0xBFC9_9999_9999_9999);
    }

    #[test]
    fn zeros_infinities_and_nan() {
        let neg_zero = -Number::ZERO;
        assert_eq!(neg_zero + neg_zero, neg_zero);
        assert_eq!(neg_zero + Number::ZERO, Number::ZERO);
        assert_eq!(Number::ONE - Number::ONE, Number::ZERO);
        assert!((Number::INFINITY + Number::NEG_INFINITY).is_nan());
        assert!((Number::INFINITY * Number::ZERO).is_nan());
        assert!((Number::ZERO / Number::ZERO).is_nan());
        assert_eq!(Number::ONE / neg_zero, Number::NEG_INFINITY);
        assert!(neg_zero.js_eq(Number::ZERO));
        assert!(!Number::NAN.js_eq(Number::NAN));
        assert!(!Number::NAN.lt(Number::ONE) && !Number::NAN.gt(Number::ONE));
    }

    #[test]
    fn subnormals_and_overflow() {
        let tiny = n(1);
        assert_eq!(tiny + tiny, n(2));
        assert_eq!(n(0x0010_0000_0000_0000) - tiny, n(0x000F_FFFF_FFFF_FFFF));
        // 2^-1074 / 2 is a tie between 0 and 2^-1074: ties to even gives +0.
        assert_eq!(tiny / Number::from_u64(2), Number::ZERO);
        assert_eq!(n(3) / Number::from_u64(2), n(2));
        let max = n(0x7FEF_FFFF_FFFF_FFFF);
        assert_eq!(max + max, Number::INFINITY);
        assert_eq!(max * Number::from_u64(2), Number::INFINITY);
    }

    #[test]
    fn math_round_ties_toward_positive_infinity() {
        let round = |num: i64, den: u64| {
            let x = Number::from_ratio(num.unsigned_abs(), den);
            let x = if num < 0 { -x } else { x };
            x.js_round()
        };
        assert_eq!(round(5, 2), Number::from_u64(3));
        assert_eq!(round(-5, 2), Number::from_i64(-2));
        assert_eq!(round(-7, 2), Number::from_i64(-3));
        assert_eq!(round(-1, 2), -Number::ZERO);
        assert_eq!(round(-3, 10), -Number::ZERO);
        assert_eq!(round(1, 2), Number::ONE);
        // 0.49999999999999994 rounds to 0, not 1.
        assert_eq!(n(0x3FDF_FFFF_FFFF_FFFF).js_round(), Number::ZERO);
    }

    #[test]
    fn int32_conversions_wrap() {
        assert_eq!(Number::from_u64(1 << 31).to_int32(), i32::MIN);
        assert_eq!(Number::from_u64((1 << 32) + 5).to_uint32(), 5);
        assert_eq!(Number::from_i64(-1).to_uint32(), u32::MAX);
        assert_eq!(Number::from_ratio(7, 2).to_int32(), 3);
        assert_eq!((-Number::from_ratio(7, 2)).to_int32(), -3);
        assert_eq!(Number::from_u64(200).to_int8(), -56);
        assert_eq!(Number::from_i64(-1).to_uint8(), 255);
        assert_eq!(Number::NAN.to_int32(), 0);
        assert_eq!(Number::INFINITY.to_uint32(), 0);
    }

    #[test]
    fn to_fixed_matches_javascript() {
        assert_eq!(Number::from_ratio(3200, 1024).to_fixed(1), "3.1");
        assert_eq!(Number::from_ratio(1005, 1000).to_fixed(2), "1.00");
        assert_eq!(Number::from_ratio(5, 2).to_fixed(0), "3");
        assert_eq!((-Number::from_ratio(5, 2)).to_fixed(0), "-3");
        assert_eq!((-Number::ZERO).to_fixed(1), "0.0");
    }
}
