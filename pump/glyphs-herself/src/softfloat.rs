//! Integer emulation of the non-negative IEEE-754 binary64 arithmetic the numpy generators use,
//! so the port reproduces their results bit for bit. The representation and rounding follow
//! `model/l0-edge/src/jsnum.rs::Dbl`; sub, sqrt, floor/trunc and the fixed-point formatter are
//! added for the operations `asolaria_herself.py` and `pump_glyphs_mythos.py` perform.

use core::cmp::Ordering;
use core::ops::{Add, Div, Mul, Sub};

const MANT_BITS: u32 = 53;

/// A non-negative finite IEEE-754 binary64 value, held exactly as `mant * 2^exp`.
/// `mant` is 0 (zero) or lies in `2^52..2^53`; subnormals are outside the domain.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Dbl {
    mant: u64,
    exp: i32,
}

fn bit_len(n: u128) -> u32 {
    128 - n.leading_zeros()
}

/// Rounds `q * 2^exp` (plus a positive amount below one unit of `q` when `sticky`) to 53 bits,
/// ties to even. `sticky` must be false when `q` has 53 bits or fewer.
fn round_to_double(q: u128, sticky: bool, exp: i32) -> Dbl {
    if q == 0 {
        return Dbl::ZERO;
    }
    let len = bit_len(q);
    if len <= MANT_BITS {
        let shift = MANT_BITS - len;
        return Dbl {
            mant: (q << shift) as u64,
            exp: exp - shift as i32,
        };
    }
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
    Dbl {
        mant: mant as u64,
        exp,
    }
}

/// Correctly rounded `num / den * 2^exp`; `den` must be non-zero and at most 73 bits.
fn ratio(num: u128, den: u128, exp: i32) -> Dbl {
    assert!(den != 0, "division by zero");
    assert!(bit_len(den) <= 73, "denominator wider than 73 bits");
    if num == 0 {
        return Dbl::ZERO;
    }
    // A quotient of at least 55 bits (53 kept, a guard bit, and the remainder as sticky) rounds
    // correctly; the scaled numerator stays within 128 bits for every denominator up to 73 bits.
    let shift = (55 + bit_len(den)).saturating_sub(bit_len(num));
    let scaled = num << shift;
    round_to_double(scaled / den, scaled % den != 0, exp - shift as i32)
}

/// Correctly rounded `m1 * 2^e1 + m2 * 2^e2` for non-negative mantissas of at most 106 bits.
fn sum_exact(m1: u128, e1: i32, m2: u128, e2: i32) -> Dbl {
    if m1 == 0 {
        return round_to_double(m2, false, e2);
    }
    if m2 == 0 {
        return round_to_double(m1, false, e1);
    }
    let (top1, top2) = (bit_len(m1) as i32 + e1, bit_len(m2) as i32 + e2);
    let ((mb, eb), (ms, es)) = if top1 >= top2 {
        ((m1, e1), (m2, e2))
    } else {
        ((m2, e2), (m1, e1))
    };
    // Place the larger term's top bit at bit 126 and align the smaller one to it; bits shifted
    // out of the smaller term lie far below the 53-bit rounding position and act as sticky.
    let base = bit_len(mb) as i32 + eb - 126;
    let big = mb << (eb - base) as u32;
    let shift = es - base;
    let (small, sticky) = if shift >= 0 {
        (ms << shift as u32, false)
    } else if -shift >= 128 {
        (0, true)
    } else {
        let k = (-shift) as u32;
        (ms >> k, ms & ((1u128 << k) - 1) != 0)
    };
    round_to_double(big + small, sticky, base)
}

/// Correctly rounded `a * b + c` with a single rounding, as the x86 `vfmadd231pd` instruction
/// computes it (non-negative operands).
pub fn fma(a: Dbl, b: Dbl, c: Dbl) -> Dbl {
    if a.is_zero() || b.is_zero() {
        return c;
    }
    sum_exact(
        u128::from(a.mant) * u128::from(b.mant),
        a.exp + b.exp,
        u128::from(c.mant),
        c.exp,
    )
}

/// IEEE binary32 bit pattern of a non-negative integer that binary32 represents exactly (a
/// voxel count, a composite sum of counts, a rime residue).
pub fn int_to_f32_bits(v: u64) -> u32 {
    if v == 0 {
        return 0;
    }
    let e = 63 - v.leading_zeros(); // v in 2^e..2^(e+1)
    let m = if e <= 23 {
        v << (23 - e)
    } else {
        v >> (e - 23)
    };
    assert!(
        e <= 23 || m << (e - 23) == v,
        "integer not exact in binary32"
    );
    ((e + 127) << 23) | (m as u32 & ((1 << 23) - 1))
}

/// The binary32 value nearest the integer `v` (round to nearest, ties to even), as an integer:
/// numpy float32 holding a count or a sum of counts (`np.add.at(c, ..., np.float32(1.))`,
/// `composite += c`).
pub fn round_f32_int(v: u64) -> u64 {
    let len = 64 - v.leading_zeros();
    if len <= 24 {
        return v;
    }
    let shift = len - 24;
    let mut m = v >> shift;
    let rest = v & ((1u64 << shift) - 1);
    let half = 1u64 << (shift - 1);
    if rest > half || (rest == half && m & 1 == 1) {
        m += 1;
    }
    m << shift
}

impl Dbl {
    pub const ZERO: Dbl = Dbl { mant: 0, exp: 0 };

    /// The double nearest `n` (exact below 2^53).
    pub fn from_u64(n: u64) -> Dbl {
        round_to_double(u128::from(n), false, 0)
    }

    /// The double nearest `num / den`, as numpy/Python `num / den` on integer operands.
    pub fn from_ratio(num: u64, den: u64) -> Dbl {
        ratio(u128::from(num), u128::from(den), 0)
    }

    /// The double nearest the decimal `units / 10^digits` (e.g. the literal `0.005`).
    pub fn decimal(units: u64, digits: u32) -> Dbl {
        ratio(u128::from(units), 10u128.pow(digits), 0)
    }

    /// A non-negative normal binary64 from its IEEE bit pattern (a pinned constant, e.g. a
    /// kernel tap). Zero, subnormals, infinities and NaNs are outside the domain.
    pub fn from_bits(bits: u64) -> Dbl {
        if bits == 0 {
            return Dbl::ZERO;
        }
        assert!(bits >> 63 == 0, "negative value outside the domain");
        let biased = ((bits >> 52) & 0x7ff) as i32;
        assert!(
            (1..2047).contains(&biased),
            "subnormal/inf/nan outside the domain"
        );
        let mant = (1u64 << 52) | (bits & ((1 << 52) - 1));
        Dbl {
            mant,
            exp: biased - 1023 - 52,
        }
    }

    pub fn is_zero(self) -> bool {
        self.mant == 0
    }

    /// The IEEE-754 binary64 bit pattern (non-negative values only).
    pub fn to_bits(self) -> u64 {
        if self.is_zero() {
            return 0;
        }
        let biased = self.exp + 52 + 1023;
        assert!(
            (1..2047).contains(&biased),
            "value outside the normal range"
        );
        ((biased as u64) << 52) | (self.mant & ((1 << 52) - 1))
    }

    /// The IEEE-754 binary32 bit pattern of the binary64 value, round-to-nearest-even
    /// (numpy `astype(np.float32)` on a non-negative value within the normal float32 range).
    pub fn to_f32_bits(self) -> u32 {
        if self.is_zero() {
            return 0;
        }
        // mant is 53 bits (2^52..2^53); float32 keeps 24. Round mant to 24 bits, ties even.
        let drop = MANT_BITS - 24;
        let low = self.mant & ((1u64 << drop) - 1);
        let half = 1u64 << (drop - 1);
        let mut m = self.mant >> drop;
        if low > half || (low == half && (m & 1 == 1)) {
            m += 1;
        }
        let mut e = self.exp + drop as i32;
        if m == 1u64 << 24 {
            m >>= 1;
            e += 1;
        }
        // value = m * 2^e, m in 2^23..2^24. biased exponent for float32:
        let biased = e + 23 + 127;
        assert!(
            (1..255).contains(&biased),
            "value outside float32 normal range"
        );
        ((biased as u32) << 23) | ((m as u32) & ((1 << 23) - 1))
    }

    /// The value of a non-negative normal binary32 bit pattern (zero included).
    pub fn from_f32_bits(bits: u32) -> Dbl {
        if bits == 0 {
            return Dbl::ZERO;
        }
        assert!(bits >> 31 == 0, "negative value outside the domain");
        let biased = ((bits >> 23) & 0xff) as i32;
        assert!(
            (1..255).contains(&biased),
            "subnormal/inf/nan outside the domain"
        );
        let m = u64::from((1u32 << 23) | (bits & ((1 << 23) - 1)));
        Dbl {
            mant: m << 29,
            exp: biased - 127 - 23 - 29,
        }
    }

    /// The binary32 value nearest `self` (round to nearest, ties to even), held as a `Dbl`.
    pub fn round_f32(self) -> Dbl {
        Dbl::from_f32_bits(self.to_f32_bits())
    }

    /// Largest integer `<= self` (floor toward zero; non-negative domain).
    pub fn floor_u64(self) -> u64 {
        if self.is_zero() {
            return 0;
        }
        if self.exp >= 0 {
            assert!(self.exp <= 11, "value outside the u64 integer domain");
            self.mant << self.exp as u32
        } else {
            let k = self.exp.unsigned_abs();
            if k >= 64 {
                0
            } else {
                self.mant >> k
            }
        }
    }

    /// Truncation toward zero (`numpy.astype(np.int64)` on a non-negative value) == floor here.
    pub fn trunc_u64(self) -> u64 {
        self.floor_u64()
    }

    /// Correctly rounded square root (IEEE binary64 sqrt).
    pub fn sqrt(self) -> Dbl {
        if self.is_zero() {
            return Dbl::ZERO;
        }
        // value = mant * 2^exp; make exp even so sqrt(2^exp) is exact.
        let (mant, exp) = if self.exp & 1 == 0 {
            (u128::from(self.mant), self.exp)
        } else {
            (u128::from(self.mant) << 1, self.exp - 1)
        };
        // sqrt(value) = sqrt(mant) * 2^(exp/2). Scale mant up by 2^54 for >=54 result bits.
        let q = mant << 54;
        let r = isqrt_u128(q);
        let sticky = r * r != q;
        round_to_double(r, sticky, exp / 2 - 27)
    }

    /// `self` rounded to `digits` decimal places as the integer count of `10^-digits` units,
    /// round-half-to-even on the exact binary value (matches Python's `f"{x:.Nf}"`).
    pub fn round_decimal_units(self, digits: u32) -> u128 {
        if self.is_zero() {
            return 0;
        }
        let scale = 10u128.pow(digits);
        let m = u128::from(self.mant);
        if self.exp >= 0 {
            return (m << self.exp as u32) * scale;
        }
        let k = self.exp.unsigned_abs();
        // value * scale = m * scale / 2^k; round to nearest integer, ties to even.
        let num = m * scale;
        if k >= 128 {
            return 0;
        }
        let q = num >> k;
        let rem = num & ((1u128 << k) - 1);
        let half = 1u128 << (k - 1);
        if rem > half || (rem == half && (q & 1 == 1)) {
            q + 1
        } else {
            q
        }
    }
}

/// Floor of the integer square root of a u128.
pub fn isqrt_u128(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = 1u128 << ((bit_len(n) + 1) / 2);
    loop {
        let y = (x + n / x) >> 1;
        if y >= x {
            return x;
        }
        x = y;
    }
}

/// Floor of the integer square root of a u64 (the geometry radial bin).
pub fn isqrt_u64(n: u64) -> u64 {
    isqrt_u128(u128::from(n)) as u64
}

impl Mul for Dbl {
    type Output = Dbl;
    fn mul(self, other: Dbl) -> Dbl {
        if self.is_zero() || other.is_zero() {
            return Dbl::ZERO;
        }
        let product = u128::from(self.mant) * u128::from(other.mant);
        round_to_double(product, false, self.exp + other.exp)
    }
}

impl Add for Dbl {
    type Output = Dbl;
    fn add(self, other: Dbl) -> Dbl {
        if self.is_zero() {
            return other;
        }
        if other.is_zero() {
            return self;
        }
        let (big, small) = if self.exp >= other.exp {
            (self, other)
        } else {
            (other, self)
        };
        let gap = (big.exp - small.exp) as u32;
        if gap > 70 {
            return big;
        }
        let sum = (u128::from(big.mant) << gap) + u128::from(small.mant);
        round_to_double(sum, false, small.exp)
    }
}

impl Sub for Dbl {
    type Output = Dbl;
    /// `self - other`, requiring `self >= other` (the non-negative domain).
    fn sub(self, other: Dbl) -> Dbl {
        if other.is_zero() {
            return self;
        }
        assert!(self >= other, "subtraction would be negative");
        if self == other {
            return Dbl::ZERO;
        }
        let gap = (self.exp - other.exp) as u32;
        // For a gap of 56 or more `other` is below a quarter unit of `self` even when `self` is a
        // power of two, so the result rounds to `self`; up to 64 the shifted mantissa fits in 128 bits.
        if gap > 64 {
            return self;
        }
        let diff = (u128::from(self.mant) << gap) - u128::from(other.mant);
        round_to_double(diff, false, other.exp)
    }
}

// ---------------------------------------------------------------- binary32 (numpy float32)
// Each float32 operation is the binary64 result rounded once more to binary32. For +, -, *, /
// and sqrt on binary32 operands this equals the directly rounded binary32 result, because
// 53 >= 2*24 + 2 (double rounding is innocuous; S. Figueroa, "When is double rounding
// innocuous?", SIGNUM Newsletter 30(3), 1995). The referee grid checks each against an
// integer-only direct rounding to 24 bits.

/// float32 `a + b`.
pub fn add32(a: Dbl, b: Dbl) -> Dbl {
    (a + b).round_f32()
}

/// float32 `|a - b|` (the magnitude of numpy's float32 `a - b`; rounding is sign-symmetric).
pub fn absdiff32(a: Dbl, b: Dbl) -> Dbl {
    if a >= b { a - b } else { b - a }.round_f32()
}

/// float32 `a * b`.
pub fn mul32(a: Dbl, b: Dbl) -> Dbl {
    (a * b).round_f32()
}

/// float32 `a / b`.
pub fn div32(a: Dbl, b: Dbl) -> Dbl {
    (a / b).round_f32()
}

/// float32 `sqrt(a)`.
pub fn sqrt32(a: Dbl) -> Dbl {
    a.sqrt().round_f32()
}

impl Div for Dbl {
    type Output = Dbl;
    fn div(self, other: Dbl) -> Dbl {
        assert!(!other.is_zero(), "division by zero");
        ratio(
            u128::from(self.mant),
            u128::from(other.mant),
            self.exp - other.exp,
        )
    }
}

impl PartialOrd for Dbl {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Dbl {
    fn cmp(&self, other: &Self) -> Ordering {
        match (self.is_zero(), other.is_zero()) {
            (true, true) => Ordering::Equal,
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            (false, false) => self.exp.cmp(&other.exp).then(self.mant.cmp(&other.mant)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn integers_and_order() {
        for n in [0u64, 1, 2, 3, 99, 1 << 40, 1 << 52, (1 << 53) - 1] {
            assert_eq!(Dbl::from_u64(n).floor_u64(), n);
        }
        assert!(Dbl::ZERO < Dbl::from_u64(1));
        assert!(Dbl::from_u64(10) < Dbl::from_u64(226));
    }

    #[test]
    fn sqrt_of_squares_is_exact() {
        for n in [0u64, 1, 2, 4, 9, 100, 123456, 1 << 26, 1 << 30] {
            let r = Dbl::from_u64(n * n).sqrt();
            assert_eq!(r.floor_u64(), n, "sqrt({})", n * n);
        }
    }

    #[test]
    fn sub_and_div() {
        // 226 - 10 = 216
        assert_eq!((Dbl::from_u64(226) - Dbl::from_u64(10)).floor_u64(), 216);
        // 1/2 rounds to the exact double; *4 == 2
        let half = Dbl::from_ratio(1, 2);
        assert_eq!((half * Dbl::from_u64(4)).floor_u64(), 2);
    }
}
