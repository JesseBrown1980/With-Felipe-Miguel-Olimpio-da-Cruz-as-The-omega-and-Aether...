//! Signed IEEE-754 binary64 arithmetic on integers (round to nearest, ties to even), for the
//! upstream expressions that subtract, carry a sign or read the high word of a double.
//!
//! `l0_edge::jsnum::Dbl` holds the non-negative JavaScript values of the zeta weights; it has no
//! subtraction, sign or word access, which `Math.log` (fdlibm) and the HRM shape pulls need, so
//! this module supplies them. Domain: zero and normal numbers; subnormal, infinite or NaN results
//! panic, as no upstream expression ported here produces one.

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Neg, Sub};
use l0_edge::jsnum::Dbl;

const FRAC_BITS: u32 = 52;
const MANT_BITS: u32 = 53;

/// A binary64 value held as its IEEE-754 bit pattern.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Sf64(u64);

/// `(negative, mantissa, exponent)` with value `(-1)^negative * mantissa * 2^exponent`;
/// mantissa is 0 or in `2^52..2^53`.
type Parts = (bool, u64, i32);

fn bit_len(n: u128) -> u32 {
    128 - n.leading_zeros()
}

impl Sf64 {
    /// +0.
    pub const ZERO: Sf64 = Sf64(0);
    /// 1.0.
    pub const ONE: Sf64 = Sf64(0x3ff0_0000_0000_0000);
    /// 2.0.
    pub const TWO: Sf64 = Sf64(0x4000_0000_0000_0000);
    /// 0.5.
    pub const HALF: Sf64 = Sf64(0x3fe0_0000_0000_0000);

    /// The value with this bit pattern.
    pub const fn from_bits(bits: u64) -> Sf64 {
        Sf64(bits)
    }

    /// The IEEE-754 bit pattern.
    pub const fn to_bits(self) -> u64 {
        self.0
    }

    /// The double equal to `n`; `|n|` must be below 2^53, where the conversion is exact.
    pub fn from_i64(n: i64) -> Sf64 {
        assert!(
            n.unsigned_abs() < 1 << MANT_BITS,
            "integer outside the exact range"
        );
        pack(n < 0, u128::from(n.unsigned_abs()), false, 0)
    }

    /// The double nearest `num / den` (both below 2^53), as JavaScript's `num / den`.
    pub fn from_ratio(num: u64, den: u64) -> Sf64 {
        let int = |n: u64| Sf64::from_i64(i64::try_from(n).expect("integer below 2^53"));
        int(num).over(int(den))
    }

    fn parts(self) -> Parts {
        let neg = self.0 >> 63 == 1;
        let biased = ((self.0 >> FRAC_BITS) & 0x7ff) as i32;
        let frac = self.0 & ((1 << FRAC_BITS) - 1);
        if biased == 0 {
            assert!(frac == 0, "subnormal values are outside the domain");
            return (neg, 0, 0);
        }
        assert!(
            biased != 0x7ff,
            "infinite and NaN values are outside the domain"
        );
        (
            neg,
            frac | (1 << FRAC_BITS),
            biased - 1023 - FRAC_BITS as i32,
        )
    }

    /// True for +0 and -0.
    pub fn is_zero(self) -> bool {
        self.0 & !(1 << 63) == 0
    }

    /// True when the sign bit is set.
    pub fn is_sign_negative(self) -> bool {
        self.0 >> 63 == 1
    }

    /// `-x`.
    pub fn negate(self) -> Sf64 {
        Sf64(self.0 ^ (1 << 63))
    }

    /// The high 32 bits as a signed word (fdlibm `GET_HIGH_WORD`).
    pub fn high_word(self) -> i32 {
        (self.0 >> 32) as u32 as i32
    }

    /// The low 32 bits (fdlibm `GET_LOW_WORD`).
    pub fn low_word(self) -> u32 {
        self.0 as u32
    }

    /// This value with its high word replaced (fdlibm `SET_HIGH_WORD`).
    pub fn with_high_word(self, high: i32) -> Sf64 {
        Sf64((u64::from(high as u32) << 32) | (self.0 & 0xffff_ffff))
    }

    /// `a + b`.
    pub fn plus(self, other: Sf64) -> Sf64 {
        if self.is_zero() && other.is_zero() {
            return if self.is_sign_negative() && other.is_sign_negative() {
                self
            } else {
                Sf64::ZERO
            };
        }
        if self.is_zero() {
            return other;
        }
        if other.is_zero() {
            return self;
        }
        let (a, b) = (self.parts(), other.parts());
        let (big, small) = if a.2 >= b.2 { (a, b) } else { (b, a) };
        let gap = (big.2 - small.2) as u32;
        // Past 74 bits the smaller addend lies below a quarter unit of the larger and cannot
        // change its rounding, even when the larger is a power of two and the signs differ.
        if gap > 74 {
            return if big == a { self } else { other };
        }
        let wide = u128::from(big.1) << gap;
        let narrow = u128::from(small.1);
        if big.0 == small.0 {
            return pack(big.0, wide + narrow, false, small.2);
        }
        match wide.cmp(&narrow) {
            Ordering::Equal => Sf64::ZERO,
            Ordering::Greater => pack(big.0, wide - narrow, false, small.2),
            Ordering::Less => pack(small.0, narrow - wide, false, small.2),
        }
    }

    /// `a - b`.
    pub fn minus(self, other: Sf64) -> Sf64 {
        self.plus(other.negate())
    }

    /// `a * b`.
    pub fn times(self, other: Sf64) -> Sf64 {
        let neg = self.is_sign_negative() != other.is_sign_negative();
        if self.is_zero() || other.is_zero() {
            return if neg { Sf64::ZERO.negate() } else { Sf64::ZERO };
        }
        let (a, b) = (self.parts(), other.parts());
        pack(neg, u128::from(a.1) * u128::from(b.1), false, a.2 + b.2)
    }

    /// `a / b`; `b` must be non-zero.
    pub fn over(self, other: Sf64) -> Sf64 {
        assert!(!other.is_zero(), "division by zero");
        let neg = self.is_sign_negative() != other.is_sign_negative();
        if self.is_zero() {
            return if neg { Sf64::ZERO.negate() } else { Sf64::ZERO };
        }
        let (a, b) = (self.parts(), other.parts());
        // 56 extra bits keep at least 55 quotient bits, so the rounding bit is in the quotient.
        let shift = 56u32;
        let scaled = u128::from(a.1) << shift;
        let den = u128::from(b.1);
        pack(
            neg,
            scaled / den,
            scaled % den != 0,
            a.2 - b.2 - shift as i32,
        )
    }

    /// JavaScript `Math.round(x)`: `floor(x + 1/2)` on the exact value (ties toward +infinity).
    pub fn js_round(self) -> i64 {
        self.floor_scaled_plus_half()
    }

    fn floor_scaled_plus_half(self) -> i64 {
        if self.is_zero() {
            return 0;
        }
        let (neg, mant, exp) = self.parts();
        let signed = if neg {
            -i128::from(mant)
        } else {
            i128::from(mant)
        };
        if exp >= 0 {
            assert!(exp <= 10, "value outside the i64 domain");
            return i64::try_from(signed << exp).expect("value outside the i64 domain");
        }
        let k = exp.unsigned_abs();
        if k > 120 {
            // |x| < 2^-67: floor(x + 1/2) is 0 for either sign.
            return 0;
        }
        let num = 2 * signed + (1i128 << k);
        i64::try_from(num.div_euclid(1i128 << (k + 1))).expect("value outside the i64 domain")
    }

    /// `Math.ceil(x)` on the exact value.
    pub fn ceil(self) -> i64 {
        if self.is_zero() {
            return 0;
        }
        let (neg, mant, exp) = self.parts();
        let signed = if neg {
            -i128::from(mant)
        } else {
            i128::from(mant)
        };
        if exp >= 0 {
            assert!(exp <= 10, "value outside the i64 domain");
            return i64::try_from(signed << exp).expect("value outside the i64 domain");
        }
        let k = exp.unsigned_abs().min(120);
        let floor = signed.div_euclid(1i128 << k);
        let exact = signed.rem_euclid(1i128 << k) == 0;
        i64::try_from(if exact { floor } else { floor + 1 }).expect("value outside the i64 domain")
    }

    /// The exact value as `(negative, mantissa, exponent)`, mantissa 0 for zero.
    pub fn to_parts(self) -> (bool, u64, i32) {
        self.parts()
    }

    /// The same non-negative value as an `l0_edge::jsnum::Dbl` (exact).
    pub fn to_dbl(self) -> Dbl {
        assert!(
            !self.is_sign_negative() || self.is_zero(),
            "Dbl holds non-negative values"
        );
        if self.is_zero() {
            return Dbl::ZERO;
        }
        let (_, mant, exp) = self.parts();
        let dbl = if exp >= 0 {
            assert!(exp <= 10, "value outside the converted range");
            Dbl::from_u64(mant << exp)
        } else {
            let k = exp.unsigned_abs();
            assert!(k <= 63, "value outside the converted range");
            Dbl::from_ratio(mant, 1u64 << k)
        };
        assert_eq!(dbl.to_bits(), self.0, "conversion to Dbl is exact");
        dbl
    }

    /// Numeric comparison (`<`, `===`, `>` of JavaScript); -0 and +0 compare equal.
    pub fn num_cmp(self, other: Sf64) -> Ordering {
        let key = |x: Sf64| -> i128 {
            if x.is_zero() {
                return 0;
            }
            let magnitude = i128::from(x.0 & !(1 << 63));
            if x.is_sign_negative() {
                -magnitude
            } else {
                magnitude
            }
        };
        key(self).cmp(&key(other))
    }

    /// The `Dbl` value as an `Sf64` (same bits).
    pub fn from_dbl(value: Dbl) -> Sf64 {
        Sf64(value.to_bits())
    }
}

/// Rounds `q * 2^exp` (plus a positive amount below one unit of `q` when `sticky`) to 53 bits,
/// ties to even. `sticky` must be false when `q` has 53 bits or fewer.
fn pack(neg: bool, q: u128, sticky: bool, exp: i32) -> Sf64 {
    let sign = u64::from(neg) << 63;
    if q == 0 {
        assert!(!sticky, "sticky bit without a quotient");
        return Sf64(sign);
    }
    let len = bit_len(q);
    let (mut mant, mut exp) = if len <= MANT_BITS {
        assert!(!sticky, "sticky bit below an exact mantissa");
        let shift = MANT_BITS - len;
        ((q << shift) as u64, exp - shift as i32)
    } else {
        let shift = len - MANT_BITS;
        let mut mant = (q >> shift) as u64;
        let rest = q & ((1u128 << shift) - 1);
        let half = 1u128 << (shift - 1);
        if rest > half || (rest == half && (sticky || mant & 1 == 1)) {
            mant += 1;
        }
        (mant, exp + shift as i32)
    };
    if mant == 1 << MANT_BITS {
        mant >>= 1;
        exp += 1;
    }
    let biased = exp + FRAC_BITS as i32 + 1023;
    assert!(
        (1..0x7ff).contains(&biased),
        "result outside the normal range"
    );
    Sf64(sign | ((biased as u64) << FRAC_BITS) | (mant & ((1 << FRAC_BITS) - 1)))
}

impl Add for Sf64 {
    type Output = Sf64;

    /// JavaScript `a + b`.
    fn add(self, other: Sf64) -> Sf64 {
        self.plus(other)
    }
}

impl Sub for Sf64 {
    type Output = Sf64;

    /// JavaScript `a - b`.
    fn sub(self, other: Sf64) -> Sf64 {
        self.minus(other)
    }
}

impl Mul for Sf64 {
    type Output = Sf64;

    /// JavaScript `a * b`.
    fn mul(self, other: Sf64) -> Sf64 {
        self.times(other)
    }
}

impl Div for Sf64 {
    type Output = Sf64;

    /// JavaScript `a / b`.
    fn div(self, other: Sf64) -> Sf64 {
        self.over(other)
    }
}

impl Neg for Sf64 {
    type Output = Sf64;

    /// JavaScript `-x`.
    fn neg(self) -> Sf64 {
        self.negate()
    }
}
