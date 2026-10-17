//! Integer emulation of IEEE-754 binary64 arithmetic (round to nearest, ties to even), so the
//! ports reproduce the Python `float` and numpy `float64` element-wise results of the upstream
//! colour code bit for bit. Only finite values in the normal range and zero are in the domain.

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Neg, Sub};

const MANT_BITS: u32 = 53;

/// A finite binary64 value, held exactly as `(-1)^neg * mant * 2^exp`.
///
/// `mant` is 0 (the value zero, always positive here) or lies in `2^52..2^53`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct B64 {
    neg: bool,
    mant: u64,
    exp: i32,
}

fn bit_len(n: u128) -> u32 {
    128 - n.leading_zeros()
}

/// `floor(sqrt(n))`.
fn isqrt(n: u128) -> u128 {
    if n < 2 {
        return n;
    }
    let mut x = 1u128 << bit_len(n).div_ceil(2);
    loop {
        let y = (x + n / x) / 2;
        if y >= x {
            return x;
        }
        x = y;
    }
}

/// Rounds `(-1)^neg * (q + s) * 2^exp` to 53 bits, ties to even, where `s` is a positive amount
/// below one unit of `q` when `sticky`. `sticky` requires `q` to carry at least 56 bits.
fn round(neg: bool, q: u128, sticky: bool, exp: i32) -> B64 {
    if q == 0 {
        assert!(!sticky, "sticky without quotient bits");
        return B64::ZERO;
    }
    let len = bit_len(q);
    if len <= MANT_BITS {
        assert!(!sticky, "sticky needs at least 56 quotient bits");
        let shift = MANT_BITS - len;
        return B64::normal(neg, (q << shift) as u64, exp - shift as i32);
    }
    assert!(
        !sticky || len >= 56,
        "sticky needs at least 56 quotient bits"
    );
    let shift = len - MANT_BITS;
    let mut mant = q >> shift;
    let rest = q & ((1u128 << shift) - 1);
    let half = 1u128 << (shift - 1);
    if rest > half || (rest == half && (sticky || mant & 1 == 1)) {
        mant += 1;
    }
    let mut exp = exp + shift as i32;
    if mant == 1u128 << MANT_BITS {
        mant >>= 1;
        exp += 1;
    }
    B64::normal(neg, mant as u64, exp)
}

/// Correctly rounded `(-1)^neg * num / den * 2^exp`.
fn ratio(neg: bool, num: u128, den: u128, exp: i32) -> B64 {
    assert!(den != 0, "division by zero");
    if num == 0 {
        return B64::ZERO;
    }
    assert!(bit_len(den) <= 70, "denominator outside the domain");
    // At least 57 quotient bits keep the rounding and sticky bits inside the quotient.
    let shift = (57 + bit_len(den)).saturating_sub(bit_len(num));
    let scaled = num << shift;
    round(neg, scaled / den, scaled % den != 0, exp - shift as i32)
}

impl B64 {
    /// The value zero.
    pub const ZERO: B64 = B64 {
        neg: false,
        mant: 0,
        exp: 0,
    };

    fn normal(neg: bool, mant: u64, exp: i32) -> B64 {
        let biased = exp + 52 + 1023;
        assert!(
            (1..2047).contains(&biased),
            "value outside the normal range"
        );
        B64 { neg, mant, exp }
    }

    /// The value nearest the integer `n` (exact below 2^53), as Python `float(n)`.
    pub fn from_int(n: i64) -> B64 {
        round(n < 0, u128::from(n.unsigned_abs()), false, 0)
    }

    /// The value nearest `num / den`, as Python `num / den` on integer operands.
    pub fn from_ratio(num: i128, den: i128) -> B64 {
        ratio(
            (num < 0) != (den < 0),
            num.unsigned_abs(),
            den.unsigned_abs(),
            0,
        )
    }

    /// The value Python parses from the decimal literal `units * 10^-digits` (e.g. `0.6`).
    pub fn decimal(units: i64, digits: u32) -> B64 {
        B64::from_ratio(i128::from(units), 10i128.pow(digits))
    }

    /// The value with this IEEE-754 bit pattern; normal values and +0 only.
    pub fn from_bits(bits: u64) -> B64 {
        if bits == 0 {
            return B64::ZERO;
        }
        let biased = ((bits >> 52) & 0x7ff) as i32;
        assert!((1..2047).contains(&biased), "bits outside the normal range");
        B64::normal(
            bits >> 63 == 1,
            (bits & ((1 << 52) - 1)) | (1 << 52),
            biased - 1075,
        )
    }

    /// The IEEE-754 binary64 bit pattern.
    pub fn to_bits(self) -> u64 {
        if self.is_zero() {
            return 0;
        }
        let biased = (self.exp + 52 + 1023) as u64;
        (u64::from(self.neg) << 63) | (biased << 52) | (self.mant & ((1 << 52) - 1))
    }

    /// True for the value zero.
    pub fn is_zero(self) -> bool {
        self.mant == 0
    }

    /// True for values below zero.
    pub fn is_negative(self) -> bool {
        self.neg && !self.is_zero()
    }

    /// `abs(x)`.
    pub fn abs(self) -> B64 {
        B64 { neg: false, ..self }
    }

    /// Correctly rounded square root (`math.sqrt`, `np.sqrt`); `x` must not be negative.
    pub fn sqrt(self) -> B64 {
        assert!(!self.is_negative(), "square root of a negative value");
        if self.is_zero() {
            return B64::ZERO;
        }
        let (mant, exp) = if self.exp & 1 != 0 {
            (u128::from(self.mant) << 1, self.exp - 1)
        } else {
            (u128::from(self.mant), self.exp)
        };
        // mant < 2^54, so the scaled radicand stays below 2^114 and its root carries 57 bits.
        let radicand = mant << 60;
        let root = isqrt(radicand);
        round(false, root, root * root != radicand, exp / 2 - 30)
    }

    /// `floor(x)` as an integer (`math.floor`, `np.floor` then an integer cast).
    pub fn floor_int(self) -> i64 {
        let magnitude_floor = self.magnitude_floor();
        if self.is_negative() {
            let exact = self.exp >= 0 || self.fraction_is_zero();
            -(magnitude_floor + i64::from(!exact))
        } else {
            magnitude_floor
        }
    }

    /// Truncation toward zero as an integer (Python `int(x)`, numpy `astype(int)`).
    pub fn trunc_int(self) -> i64 {
        let magnitude_floor = self.magnitude_floor();
        if self.is_negative() {
            -magnitude_floor
        } else {
            magnitude_floor
        }
    }

    fn magnitude_floor(self) -> i64 {
        if self.is_zero() {
            return 0;
        }
        if self.exp >= 0 {
            assert!(self.exp <= 10, "value outside the i64 domain");
            return (self.mant << self.exp) as i64;
        }
        let k = self.exp.unsigned_abs();
        if k >= 64 {
            0
        } else {
            (self.mant >> k) as i64
        }
    }

    fn fraction_is_zero(self) -> bool {
        if self.exp >= 0 {
            return true;
        }
        let k = self.exp.unsigned_abs();
        k < 64 && self.mant & ((1u64 << k) - 1) == 0
    }

    /// Python `x % 1.0`: C `fmod(x, 1.0)` (exact), then `+ 1.0` when that is negative.
    pub fn py_mod_one(self) -> B64 {
        let frac = if self.exp >= 0 {
            B64::ZERO
        } else {
            let k = self.exp.unsigned_abs();
            if k >= 64 {
                self
            } else {
                round(
                    self.neg,
                    u128::from(self.mant & ((1u64 << k) - 1)),
                    false,
                    self.exp,
                )
            }
        };
        if frac.is_negative() {
            frac.add(B64::from_int(1))
        } else {
            frac
        }
    }

    /// Python `format(x, f".{digits}f")`: the exact value rounded half to even.
    pub fn format_fixed(self, digits: u32) -> String {
        assert!(digits <= 6, "digits above 6 are outside the domain");
        let scale = 10u128.pow(digits);
        let units: u128 = if self.is_zero() {
            0
        } else if self.exp >= 0 {
            assert!(self.exp <= 40, "value outside the formatting domain");
            (u128::from(self.mant) << self.exp) * scale
        } else {
            let k = self.exp.unsigned_abs();
            let scaled = u128::from(self.mant) * scale;
            // scaled < 2^73, so for k >= 75 the value is below one half unit.
            if k >= 75 {
                0
            } else {
                let q = scaled >> k;
                let rest = scaled & ((1u128 << k) - 1);
                let half = 1u128 << (k - 1);
                if rest > half || (rest == half && q & 1 == 1) {
                    q + 1
                } else {
                    q
                }
            }
        };
        let int_part = units / scale;
        let frac_part = units % scale;
        let sign = if self.is_negative() { "-" } else { "" };
        if digits == 0 {
            format!("{sign}{int_part}")
        } else {
            format!(
                "{sign}{int_part}.{frac_part:0width$}",
                width = digits as usize
            )
        }
    }
}

impl Neg for B64 {
    type Output = B64;

    /// `-x`.
    fn neg(self) -> B64 {
        if self.is_zero() {
            return self;
        }
        B64 {
            neg: !self.neg,
            ..self
        }
    }
}

impl Add for B64 {
    type Output = B64;

    /// `x + y`.
    fn add(self, other: B64) -> B64 {
        if self.is_zero() {
            return other;
        }
        if other.is_zero() {
            return self;
        }
        let (big, small) = if (self.exp, self.mant) >= (other.exp, other.mant) {
            (self, other)
        } else {
            (other, self)
        };
        let gap = (big.exp - small.exp) as u32;
        // Past 70 bits the smaller term is below a quarter unit of the larger and cannot round.
        if gap > 70 {
            return big;
        }
        let big_mant = u128::from(big.mant) << gap;
        let small_mant = u128::from(small.mant);
        if big.neg == small.neg {
            round(big.neg, big_mant + small_mant, false, small.exp)
        } else {
            round(big.neg, big_mant - small_mant, false, small.exp)
        }
    }
}

impl Sub for B64 {
    type Output = B64;

    /// `x - y`.
    fn sub(self, other: B64) -> B64 {
        self + -other
    }
}

impl Mul for B64 {
    type Output = B64;

    /// `x * y`.
    fn mul(self, other: B64) -> B64 {
        if self.is_zero() || other.is_zero() {
            return B64::ZERO;
        }
        let product = u128::from(self.mant) * u128::from(other.mant);
        round(self.neg != other.neg, product, false, self.exp + other.exp)
    }
}

impl Div for B64 {
    type Output = B64;

    /// `x / y`; `y` must be non-zero.
    fn div(self, other: B64) -> B64 {
        assert!(!other.is_zero(), "division by zero");
        ratio(
            self.neg != other.neg,
            u128::from(self.mant),
            u128::from(other.mant),
            self.exp - other.exp,
        )
    }
}

impl PartialOrd for B64 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for B64 {
    fn cmp(&self, other: &Self) -> Ordering {
        let sign = |x: &B64| -> i8 {
            if x.is_zero() {
                0
            } else if x.neg {
                -1
            } else {
                1
            }
        };
        match sign(self).cmp(&sign(other)) {
            Ordering::Equal => {}
            unequal => return unequal,
        }
        let magnitude = (self.exp, self.mant).cmp(&(other.exp, other.mant));
        if self.is_negative() {
            magnitude.reverse()
        } else {
            magnitude
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bits(x: B64) -> u64 {
        x.to_bits()
    }

    #[test]
    fn decimal_literals_round_like_python() {
        // Python: (0.1).hex() == '0x1.999999999999ap-4', (0.6).hex() == '0x1.3333333333333p-1'.
        assert_eq!(bits(B64::decimal(1, 1)), 0x3fb999999999999a);
        assert_eq!(bits(B64::decimal(6, 1)), 0x3fe3333333333333);
        // Python: 0.1 + 0.2 == 0.30000000000000004.
        let sum = B64::decimal(1, 1).add(B64::decimal(2, 1));
        assert_eq!(bits(sum), 0x3fd3333333333334);
        assert_eq!(sum.format_fixed(4), "0.3000");
    }

    #[test]
    fn subtraction_and_signs() {
        let a = B64::from_int(3);
        let b = B64::from_int(5);
        assert_eq!(a.sub(b), B64::from_int(-2));
        assert!(a.sub(b).is_negative());
        assert_eq!(a.sub(a), B64::ZERO);
        assert_eq!(B64::from_int(-7).abs(), B64::from_int(7));
        assert!(B64::from_int(-1) < B64::ZERO);
        assert!(B64::from_int(-2) < B64::from_int(-1));
    }

    #[test]
    fn formatting_is_round_half_even_on_the_exact_value() {
        // Python: f"{0.03125:.4f}" == '0.0312', f"{0.09375:.4f}" == '0.0938'.
        assert_eq!(B64::from_ratio(1, 32).format_fixed(4), "0.0312");
        assert_eq!(B64::from_ratio(3, 32).format_fixed(4), "0.0938");
        // Python: f"{2.675:.2f}" == '2.67' (2.675 is stored below 2.675).
        assert_eq!(B64::decimal(2675, 3).format_fixed(2), "2.67");
        assert_eq!(B64::from_int(-3).format_fixed(1), "-3.0");
        assert_eq!(B64::ZERO.format_fixed(4), "0.0000");
    }

    #[test]
    fn sqrt_and_division_round_correctly() {
        // Python: math.sqrt(2).hex() == '0x1.6a09e667f3bcdp+0'.
        assert_eq!(bits(B64::from_int(2).sqrt()), 0x3ff6a09e667f3bcd);
        assert_eq!(B64::from_int(49).sqrt(), B64::from_int(7));
        // Python: (1/3).hex() == '0x1.5555555555555p-2'.
        assert_eq!(bits(B64::from_ratio(1, 3)), 0x3fd5555555555555);
        assert_eq!(
            bits(B64::from_int(1).div(B64::from_int(3))),
            0x3fd5555555555555
        );
    }

    #[test]
    fn modulo_one_follows_python() {
        // Python: (-0.25) % 1.0 == 0.75; (-1e-17) % 1.0 == 1.0; 2.5 % 1.0 == 0.5.
        assert_eq!(B64::from_ratio(-1, 4).py_mod_one(), B64::from_ratio(3, 4));
        assert_eq!(B64::decimal(-1, 17).py_mod_one(), B64::from_int(1));
        assert_eq!(B64::from_ratio(5, 2).py_mod_one(), B64::from_ratio(1, 2));
        assert_eq!(B64::from_int(-3).py_mod_one(), B64::ZERO);
    }

    #[test]
    fn floor_and_trunc() {
        assert_eq!(B64::from_ratio(7, 2).floor_int(), 3);
        assert_eq!(B64::from_ratio(-7, 2).floor_int(), -4);
        assert_eq!(B64::from_ratio(-7, 2).trunc_int(), -3);
        assert_eq!(B64::from_int(-4).floor_int(), -4);
        assert_eq!(B64::from_ratio(1, 3).floor_int(), 0);
    }

    #[test]
    fn bits_round_trip() {
        for x in [
            B64::from_int(1),
            B64::from_int(-255),
            B64::decimal(6, 1),
            B64::from_ratio(1, 255),
        ] {
            assert_eq!(B64::from_bits(x.to_bits()), x);
        }
    }
}
