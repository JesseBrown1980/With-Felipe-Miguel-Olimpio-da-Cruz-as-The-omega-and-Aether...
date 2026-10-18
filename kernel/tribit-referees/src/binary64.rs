//! Integer model of the IEEE-754 binary64 values the vendored scripts compute or print, and of
//! the CPython 3.13 conversions applied to them: `int / int`, `float(Fraction)`, float literals,
//! `+`, `-`, `*`, `abs`, `max`, builtin `sum`, `%.Nf`, `%.Ne` and `repr`.
//!
//! Written here, not upstream. Every value is held exactly as `mant * 2^exp` in integers; each
//! operation rounds once to 53 bits, ties to even, as IEEE-754 round-to-nearest does. The domain
//! is finite normal values: a result that would be subnormal, infinite or NaN panics, and so does
//! a conversion whose scaled integers leave `u128`. None of the vendored scripts reaches either.

use core::cmp::Ordering;
use core::ops::{Add, Mul, Neg, Sub};

const HIDDEN: u64 = 1 << 52;
const MIN_EXP: i32 = -1074;
const MAX_EXP: i32 = 971;

/// A finite normal binary64 value or a signed zero: `(-1)^neg * mant * 2^exp`, `mant` 0 or in
/// `2^52..2^53`. Equality is equality of bit patterns (so `+0` and `-0` differ).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Binary64 {
    neg: bool,
    mant: u64,
    exp: i32,
}

fn bit_len(q: u128) -> u32 {
    128 - q.leading_zeros()
}

/// Rounds `q * 2^exp` (plus a positive amount below one unit of `2^exp` when `sticky`) to 53
/// bits, ties to even. `sticky` needs `q` wider than 54 bits.
fn round(neg: bool, q: u128, exp: i32, sticky: bool) -> Binary64 {
    assert!(q != 0, "round() is called with a non-zero magnitude");
    let bits = bit_len(q);
    let (mut mant, mut e) = if bits <= 53 {
        assert!(!sticky, "a sticky remainder needs more than 53 bits");
        ((q << (53 - bits)) as u64, exp - (53 - bits) as i32)
    } else {
        let shift = bits - 53;
        assert!(
            !sticky || shift >= 2,
            "a sticky remainder needs a guard bit"
        );
        let kept = (q >> shift) as u64;
        let rem = q & ((1u128 << shift) - 1);
        let half = 1u128 << (shift - 1);
        let up = rem > half || (rem == half && (sticky || kept & 1 == 1));
        (kept + u64::from(up), exp + shift as i32)
    };
    if mant == 1 << 53 {
        mant >>= 1;
        e += 1;
    }
    assert!(
        (MIN_EXP..=MAX_EXP).contains(&e),
        "result outside the finite normal binary64 range"
    );
    Binary64 { neg, mant, exp: e }
}

impl Binary64 {
    pub const fn zero(neg: bool) -> Binary64 {
        Binary64 {
            neg,
            mant: 0,
            exp: 0,
        }
    }

    /// Correctly rounded `(-1)^neg * num / den`: CPython's `int / int` and `float(Fraction)`,
    /// and the value of a decimal float literal `num / 10^k`.
    pub fn from_ratio(neg: bool, num: u128, den: u128) -> Binary64 {
        assert!(den != 0, "division by zero");
        if num == 0 {
            return Binary64::zero(neg);
        }
        let (nb, db) = (bit_len(num) as i32, bit_len(den) as i32);
        let s = 56 + db - nb;
        let (q, r) = if s >= 0 {
            assert!(nb + s <= 127, "ratio outside the u128 range");
            let n = num << s;
            (n / den, n % den)
        } else {
            let d = den << (-s);
            (num / d, num % d)
        };
        round(neg, q, -s, r != 0)
    }

    /// `float(n)`, exact for `|n| < 2^53`.
    pub fn from_int(n: i64) -> Binary64 {
        assert!(
            n.unsigned_abs() < 1 << 53,
            "integer not exactly representable"
        );
        Binary64::from_ratio(n < 0, u128::from(n.unsigned_abs()), 1)
    }

    pub fn is_zero(self) -> bool {
        self.mant == 0
    }

    pub fn is_negative(self) -> bool {
        self.neg
    }

    /// `abs(x)` / C `fabs`.
    pub fn abs(self) -> Binary64 {
        Binary64 { neg: false, ..self }
    }

    /// Order of `|self|` and `|other|`.
    pub fn cmp_abs(self, other: Binary64) -> Ordering {
        match (self.mant == 0, other.mant == 0) {
            (true, true) => Ordering::Equal,
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            (false, false) => (self.exp, self.mant).cmp(&(other.exp, other.mant)),
        }
    }

    /// `self > other` for values that are both `>= 0`.
    pub fn gt_nonneg(self, other: Binary64) -> bool {
        assert!(
            (self.mant == 0 || !self.neg) && (other.mant == 0 || !other.neg),
            "gt_nonneg() compares non-negative values"
        );
        self.cmp_abs(other) == Ordering::Greater
    }

    /// Correctly rounded `x^k` for `k >= 1` (the exact power, rounded once).
    pub fn powi_correctly_rounded(self, k: u32) -> Binary64 {
        assert!(k >= 1, "k = 0 is float_pow's own special case");
        let neg = self.neg && k % 2 == 1;
        if self.mant == 0 {
            return Binary64::zero(neg);
        }
        // little-endian u64 limbs of mant^k
        let mut limbs: Vec<u64> = vec![self.mant];
        for _ in 1..k {
            let mut carry: u128 = 0;
            for l in limbs.iter_mut() {
                let t = u128::from(*l) * u128::from(self.mant) + carry;
                *l = t as u64;
                carry = t >> 64;
            }
            if carry != 0 {
                limbs.push(carry as u64);
            }
        }
        let top = limbs.len() - 1;
        let bits = top as u32 * 64 + (64 - limbs[top].leading_zeros());
        let exp = self.exp * k as i32;
        if bits <= 120 {
            let mut q: u128 = 0;
            for &l in limbs.iter().rev() {
                q = (q << 64) | u128::from(l);
            }
            return round(neg, q, exp, false);
        }
        // keep the top 64 bits; everything below them is a sticky remainder
        let drop = bits - 64;
        let bit = |i: u32| (limbs[(i / 64) as usize] >> (i % 64)) & 1;
        let mut q: u128 = 0;
        for i in (drop..bits).rev() {
            q = (q << 1) | u128::from(bit(i));
        }
        let sticky = (0..drop).any(|i| bit(i) == 1);
        round(neg, q, exp + drop as i32, sticky)
    }
}

impl Neg for Binary64 {
    type Output = Binary64;

    /// `-x`.
    fn neg(self) -> Binary64 {
        Binary64 {
            neg: !self.neg,
            ..self
        }
    }
}

impl Add for Binary64 {
    type Output = Binary64;

    /// `x + y`, round to nearest, ties to even; an exact zero sum is `+0` unless both are `-0`.
    fn add(self, other: Binary64) -> Binary64 {
        if self.mant == 0 && other.mant == 0 {
            return Binary64::zero(self.neg && other.neg);
        }
        if self.mant == 0 {
            return other;
        }
        if other.mant == 0 {
            return self;
        }
        let (hi, lo) = if self.exp >= other.exp {
            (self, other)
        } else {
            (other, self)
        };
        let diff = (hi.exp - lo.exp) as u32;
        let up = diff.min(64);
        let hi_q = u128::from(hi.mant) << up;
        let unit = hi.exp - up as i32;
        let down = diff - up;
        let (lo_q, lost) = if down == 0 {
            (u128::from(lo.mant), false)
        } else if down >= 53 {
            (0, true)
        } else {
            (
                u128::from(lo.mant >> down),
                lo.mant & ((1u64 << down) - 1) != 0,
            )
        };
        if hi.neg == lo.neg {
            round(hi.neg, hi_q + lo_q, unit, lost)
        } else if lost {
            // |lo| sits below the last of hi's 64 extra bits, so the difference keeps hi's sign.
            round(hi.neg, hi_q - lo_q - 1, unit, true)
        } else {
            match hi_q.cmp(&lo_q) {
                Ordering::Greater => round(hi.neg, hi_q - lo_q, unit, false),
                Ordering::Less => round(lo.neg, lo_q - hi_q, unit, false),
                Ordering::Equal => Binary64::zero(false),
            }
        }
    }
}

impl Sub for Binary64 {
    type Output = Binary64;

    /// `x - y`.
    fn sub(self, other: Binary64) -> Binary64 {
        self + -other
    }
}

impl Mul for Binary64 {
    type Output = Binary64;

    /// `x * y`, round to nearest, ties to even.
    fn mul(self, other: Binary64) -> Binary64 {
        let neg = self.neg != other.neg;
        if self.mant == 0 || other.mant == 0 {
            return Binary64::zero(neg);
        }
        let q = u128::from(self.mant) * u128::from(other.mant);
        round(neg, q, self.exp + other.exp, false)
    }
}

impl Binary64 {
    /// `%.{prec}f`: the exact value rounded half to even at `prec` decimals (CPython dtoa mode 3).
    pub fn fmt_fixed(self, prec: u32) -> String {
        let sign = if self.neg { "-" } else { "" };
        let units = if self.mant == 0 {
            0
        } else {
            let (num, den) = scale(u128::from(self.mant), self.exp, prec as i32);
            round_div_half_even(num, den)
        };
        if prec == 0 {
            return format!("{sign}{units}");
        }
        let p = pow10(prec);
        format!(
            "{sign}{}.{:0width$}",
            units / p,
            units % p,
            width = prec as usize
        )
    }

    /// `%.{prec}e`: `prec + 1` significant digits, half to even (CPython dtoa mode 2).
    pub fn fmt_exp(self, prec: u32) -> String {
        let sign = if self.neg { "-" } else { "" };
        let (digits, e10) = if self.mant == 0 {
            ("0".repeat(prec as usize + 1), 0)
        } else {
            let mut e10 = decimal_exponent(self.mant, self.exp);
            let (num, den) = scale(u128::from(self.mant), self.exp, prec as i32 - e10);
            let mut n = round_div_half_even(num, den);
            if n == pow10(prec + 1) {
                n = pow10(prec);
                e10 += 1;
            }
            (n.to_string(), e10)
        };
        let mantissa = if prec == 0 {
            digits
        } else {
            format!("{}.{}", &digits[..1], &digits[1..])
        };
        let esign = if e10 < 0 { '-' } else { '+' };
        format!("{sign}{mantissa}e{esign}{:02}", e10.unsigned_abs())
    }

    /// `repr(x)` (and `str(x)`, `%s`): the shortest decimal that reads back to `x`, closest to
    /// `x` among those, laid out as CPython's `'r'` format (exponent when `decpt <= -4 || > 16`).
    pub fn repr(self) -> String {
        let sign = if self.neg { "-" } else { "" };
        if self.mant == 0 {
            return format!("{sign}0.0");
        }
        let m = u128::from(self.mant);
        let e = self.exp;
        // rounding interval in units of 2^(e-2); its ends read back to `m` only when m is even
        let high = 4 * m + 2;
        let low = if self.mant == HIDDEN && e > MIN_EXP {
            4 * m - 1
        } else {
            4 * m - 2
        };
        let inclusive = m % 2 == 0;
        let inside = |c: u128, s: i32| {
            let lo = cmp_scaled(c, 0, s, low, e - 2, 0);
            let hi = cmp_scaled(c, 0, s, high, e - 2, 0);
            let above = lo == Ordering::Greater || (inclusive && lo == Ordering::Equal);
            let below = hi == Ordering::Less || (inclusive && hi == Ordering::Equal);
            above && below
        };
        let e10 = decimal_exponent(self.mant, e);
        for p in 1..=17i32 {
            let s = e10 + 1 - p;
            let (num, den) = scale(m, e, -s);
            let c_lo = num / den;
            let r = num % den;
            let lo_ok = inside(c_lo, s);
            let hi_ok = inside(c_lo + 1, s);
            let c = match (lo_ok, hi_ok) {
                (false, false) => continue,
                (true, false) => c_lo,
                (false, true) => c_lo + 1,
                (true, true) => match r.cmp(&(den - r)) {
                    Ordering::Less => c_lo,
                    Ordering::Greater => c_lo + 1,
                    Ordering::Equal => c_lo + (c_lo & 1),
                },
            };
            let (digits, decpt) = if c == pow10(p as u32) {
                ("1".to_string(), e10 + 2)
            } else {
                (c.to_string(), e10 + 1)
            };
            let digits = digits.trim_end_matches('0').to_string();
            return format!("{sign}{}", layout_repr(&digits, decpt));
        }
        unreachable!("17 significant digits always read back")
    }
}

fn layout_repr(d: &str, decpt: i32) -> String {
    let n = d.len() as i32;
    if decpt <= -4 || decpt > 16 {
        let e = decpt - 1;
        let esign = if e < 0 { '-' } else { '+' };
        let frac = if n > 1 {
            format!(".{}", &d[1..])
        } else {
            String::new()
        };
        format!("{}{frac}e{esign}{:02}", &d[..1], e.unsigned_abs())
    } else if decpt <= 0 {
        format!("0.{}{d}", "0".repeat((-decpt) as usize))
    } else if decpt >= n {
        format!("{d}{}.0", "0".repeat((decpt - n) as usize))
    } else {
        format!("{}.{}", &d[..decpt as usize], &d[decpt as usize..])
    }
}

fn pow10(n: u32) -> u128 {
    10u128
        .checked_pow(n)
        .expect("power of ten outside the u128 range")
}

fn mul_checked(a: u128, b: u128) -> u128 {
    a.checked_mul(b)
        .expect("scaled value outside the u128 range")
}

fn pow2(n: u32) -> u128 {
    assert!(n < 128, "power of two outside the u128 range");
    1u128 << n
}

/// `(num, den)` with `num / den = m * 2^e2 * 10^e10`.
fn scale(m: u128, e2: i32, e10: i32) -> (u128, u128) {
    let mut num = m;
    let mut den = 1u128;
    if e2 >= 0 {
        num = mul_checked(num, pow2(e2 as u32));
    } else {
        den = mul_checked(den, pow2((-e2) as u32));
    }
    if e10 >= 0 {
        num = mul_checked(num, pow10(e10 as u32));
    } else {
        den = mul_checked(den, pow10((-e10) as u32));
    }
    (num, den)
}

/// Order of `a * 2^a2 * 10^a10` and `b * 2^b2 * 10^b10`.
fn cmp_scaled(a: u128, a2: i32, a10: i32, b: u128, b2: i32, b10: i32) -> Ordering {
    let (d2, d10) = (a2 - b2, a10 - b10);
    let mut lhs = a;
    let mut rhs = b;
    if d2 >= 0 {
        lhs = mul_checked(lhs, pow2(d2 as u32));
    } else {
        rhs = mul_checked(rhs, pow2((-d2) as u32));
    }
    if d10 >= 0 {
        lhs = mul_checked(lhs, pow10(d10 as u32));
    } else {
        rhs = mul_checked(rhs, pow10((-d10) as u32));
    }
    lhs.cmp(&rhs)
}

fn round_div_half_even(num: u128, den: u128) -> u128 {
    let (q, r) = (num / den, num % den);
    match r.cmp(&(den - r)) {
        Ordering::Less => q,
        Ordering::Greater => q + 1,
        Ordering::Equal => q + (q & 1),
    }
}

/// `E` with `10^E <= mant * 2^exp < 10^(E+1)`.
fn decimal_exponent(mant: u64, exp: i32) -> i32 {
    let m = u128::from(mant);
    // log10(2) ~ 30103/100000 gives a start within one of E
    let mut e10 = ((exp + 52) * 30103).div_euclid(100_000);
    while cmp_scaled(m, exp, 0, 1, 0, e10) == Ordering::Less {
        e10 -= 1;
    }
    while cmp_scaled(m, exp, 0, 1, 0, e10 + 1) != Ordering::Less {
        e10 += 1;
    }
    e10
}

/// CPython 3.13 builtin `sum(items)` with the default int start `0`, for float items:
/// `0 + first` (bltinmodule.c `PyNumber_Add` on leaving the int path), then the compensated
/// loop `t = f + x; c += (f - t) + x` or `(x - t) + f` by `fabs` order, and `f += c` when
/// `c != 0` at the end.
pub fn py_sum(items: &[Binary64]) -> Binary64 {
    let (first, rest) = items
        .split_first()
        .expect("an empty sum is the int 0, not a float");
    let mut f = Binary64::zero(false) + *first;
    let mut c = Binary64::zero(false);
    for &x in rest {
        let t = f + x;
        if f.cmp_abs(x) != Ordering::Less {
            c = c + ((f - t) + x);
        } else {
            c = c + ((x - t) + f);
        }
        f = t;
    }
    if !c.is_zero() {
        f = f + c;
    }
    f
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(n: u128, d: u128) -> Binary64 {
        Binary64::from_ratio(false, n, d)
    }

    #[test]
    fn third_and_tenth_bit_patterns() {
        // 1/3 = 6004799503160661 * 2^-54, 0.1 = 7205759403792794 * 2^-56 (IEEE-754 binary64)
        assert_eq!(
            r(1, 3),
            Binary64 {
                neg: false,
                mant: 6004799503160661,
                exp: -54
            }
        );
        assert_eq!(
            r(1, 10),
            Binary64 {
                neg: false,
                mant: 7205759403792794,
                exp: -56
            }
        );
    }

    #[test]
    fn repr_layouts() {
        assert_eq!(r(1, 2).repr(), "0.5");
        assert_eq!(r(1, 3).repr(), "0.3333333333333333");
        assert_eq!(r(2, 3).repr(), "0.6666666666666666");
        assert_eq!(r(1, 10).repr(), "0.1");
        assert_eq!(r(1, 1).repr(), "1.0");
        assert_eq!(r(1, 100_000).repr(), "1e-05");
        assert_eq!(r(1, 10_000).repr(), "0.0001");
        assert_eq!(r(10_000_000_000_000_000, 1).repr(), "1e+16");
        assert_eq!(r(1_000_000_000_000_000, 1).repr(), "1000000000000000.0");
        assert_eq!(Binary64::zero(true).repr(), "-0.0");
    }

    #[test]
    fn tenth_plus_fifth_reads_back_with_seventeen_digits() {
        // 0.1 + 0.2 = 0.30000000000000004 in binary64
        assert_eq!((r(1, 10) + r(2, 10)).repr(), "0.30000000000000004");
        assert_eq!((r(3, 10) - r(1, 10)).repr(), "0.19999999999999998");
    }

    #[test]
    fn fixed_and_exponent_layouts() {
        assert_eq!(r(1, 2).fmt_fixed(6), "0.500000");
        assert_eq!(r(1, 6).fmt_fixed(6), "0.166667");
        assert_eq!(r(1, 32).fmt_fixed(4), "0.0312");
        assert_eq!(r(3, 32).fmt_fixed(4), "0.0938");
        assert_eq!(Binary64::zero(false).fmt_exp(6), "0.000000e+00");
        assert_eq!((-r(1, 3)).fmt_exp(6), "-3.333333e-01");
        assert_eq!(r(99_999_996, 100).fmt_exp(6), "1.000000e+06");
    }

    #[test]
    fn sum_compensates_like_cpython() {
        // sum([1e16, 1.0, -1e16]) is 1.0 with the compensated loop, 0.0 left to right
        let big = r(10_000_000_000_000_000, 1);
        let one = Binary64::from_int(1);
        assert_eq!(py_sum(&[big, one, -big]), one);
        assert_eq!(big + one + -big, Binary64::zero(false));
    }

    #[test]
    fn exact_cancellation_is_positive_zero() {
        let x = r(11, 10);
        assert_eq!(x - x, Binary64::zero(false));
        assert_eq!(
            Binary64::zero(true) + Binary64::zero(true),
            Binary64::zero(true)
        );
    }

    #[test]
    fn power_rounds_once() {
        // (2/3)**k values as glibc 2.39 pow returned them (as_integer_ratio), k = 2..5
        let x = r(2, 3);
        let want = [
            (2001599834386887u128, 4503599627370496u128),
            (5337599558365031, 18014398509481984),
            (7116799411153375, 36028797018963968),
            (1186133235192229, 9007199254740992),
        ];
        for (k, (n, d)) in (2..=5).zip(want) {
            assert_eq!(x.powi_correctly_rounded(k), r(n, d));
        }
    }
}
