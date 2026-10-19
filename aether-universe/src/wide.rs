//! A 256-bit signed integer, two's complement, four `u64` limbs (little-endian).
//!
//! Secret 7 walks the closure to depth 81. The walk grows by a factor of three per level, so by
//! depth 81 the values are about 7.9 * 10^40, beyond `i128` (1.7 * 10^38). The bound that makes 256
//! bits enough: 93 * 3^81 is about 4 * 10^40 while 2^255 is about 5.8 * 10^76.
//!
//! Overflow is never silent: every arithmetic method reports it or panics.

use std::cmp::Ordering;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub struct I256 {
    limbs: [u64; 4],
}

impl I256 {
    pub const ZERO: I256 = I256 { limbs: [0; 4] };

    pub fn from_i128(v: i128) -> I256 {
        let lo = v as u128;
        let ext = if v < 0 { u64::MAX } else { 0 };
        I256 {
            limbs: [lo as u64, (lo >> 64) as u64, ext, ext],
        }
    }

    pub fn from_i64(v: i64) -> I256 {
        I256::from_i128(v as i128)
    }

    pub fn is_negative(&self) -> bool {
        self.limbs[3] >> 63 == 1
    }

    pub fn is_zero(&self) -> bool {
        self.limbs == [0; 4]
    }

    /// `(self + other, overflowed)` in two's complement.
    pub fn overflowing_add(self, other: I256) -> (I256, bool) {
        let mut out = [0u64; 4];
        let mut carry = false;
        for (slot, (a, b)) in out
            .iter_mut()
            .zip(self.limbs.iter().zip(other.limbs.iter()))
        {
            let (s1, c1) = a.overflowing_add(*b);
            let (s2, c2) = s1.overflowing_add(u64::from(carry));
            *slot = s2;
            carry = c1 || c2;
        }
        let r = I256 { limbs: out };
        let overflow =
            self.is_negative() == other.is_negative() && r.is_negative() != self.is_negative();
        (r, overflow)
    }

    /// Two's-complement negation. `MIN` negates to itself and is reported as overflow.
    pub fn overflowing_neg(self) -> (I256, bool) {
        let inv = I256 {
            limbs: [
                !self.limbs[0],
                !self.limbs[1],
                !self.limbs[2],
                !self.limbs[3],
            ],
        };
        let (r, _) = inv.overflowing_add(I256::from_i64(1));
        let overflow = self.is_negative() && r.is_negative();
        (r, overflow)
    }

    pub fn overflowing_sub(self, other: I256) -> (I256, bool) {
        let (n, o1) = other.overflowing_neg();
        let (r, o2) = self.overflowing_add(n);
        (r, o1 || o2)
    }

    /// Checked addition: `None` on overflow.
    pub fn checked_add(self, other: I256) -> Option<I256> {
        let (r, o) = self.overflowing_add(other);
        (!o).then_some(r)
    }

    pub fn checked_sub(self, other: I256) -> Option<I256> {
        let (r, o) = self.overflowing_sub(other);
        (!o).then_some(r)
    }

    /// Addition that panics on overflow: the walk's bound is proved, so an overflow is a bug.
    pub fn plus(self, other: I256) -> I256 {
        self.checked_add(other).expect("I256 add overflowed")
    }

    pub fn minus(self, other: I256) -> I256 {
        self.checked_sub(other).expect("I256 sub overflowed")
    }

    pub fn add_i64(self, v: i64) -> I256 {
        self.plus(I256::from_i64(v))
    }

    /// Shift left by one bit (doubling), panicking on overflow.
    pub fn shl1(self) -> I256 {
        self.plus(self)
    }

    /// `Some(v)` when the value fits an `i128`.
    pub fn to_i128(&self) -> Option<i128> {
        let lo = (u128::from(self.limbs[1]) << 64) | u128::from(self.limbs[0]);
        let ext = if (lo >> 127) == 1 { u64::MAX } else { 0 };
        if self.limbs[2] == ext && self.limbs[3] == ext {
            Some(lo as i128)
        } else {
            None
        }
    }

    /// The absolute value as four unsigned limbs (little-endian).
    pub fn magnitude(&self) -> [u64; 4] {
        if self.is_negative() {
            let (n, _) = self.overflowing_neg();
            n.limbs
        } else {
            self.limbs
        }
    }

    /// Decimal text, with a leading `-` for negatives.
    pub fn to_decimal(&self) -> String {
        let mut mag = self.magnitude();
        if mag == [0; 4] {
            return "0".to_string();
        }
        const CHUNK: u64 = 10_000_000_000_000_000_000; // 10^19
        let mut chunks: Vec<u64> = Vec::new();
        while mag != [0; 4] {
            let mut rem: u128 = 0;
            for limb in mag.iter_mut().rev() {
                let cur = (rem << 64) | u128::from(*limb);
                *limb = (cur / u128::from(CHUNK)) as u64;
                rem = cur % u128::from(CHUNK);
            }
            chunks.push(rem as u64);
        }
        let mut s = String::new();
        if self.is_negative() {
            s.push('-');
        }
        let mut iter = chunks.iter().rev();
        if let Some(first) = iter.next() {
            s.push_str(&first.to_string());
        }
        for c in iter {
            s.push_str(&format!("{c:019}"));
        }
        s
    }

    /// Number of decimal digits of the absolute value (`0` has one digit).
    pub fn decimal_digits(&self) -> usize {
        let d = self.to_decimal();
        d.trim_start_matches('-').len()
    }
}

impl PartialOrd for I256 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for I256 {
    fn cmp(&self, other: &Self) -> Ordering {
        match (self.is_negative(), other.is_negative()) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => {
                for i in (0..4).rev() {
                    match self.limbs[i].cmp(&other.limbs[i]) {
                        Ordering::Equal => {}
                        o => return o,
                    }
                }
                Ordering::Equal
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Seeded generator: the same LCG constants as the operator's compose.py.
    fn lcg(s: &mut u64) -> u64 {
        *s = (*s * 1_103_515_245 + 12_345) & 0x7FFF_FFFF;
        *s
    }

    fn rand_i128(s: &mut u64) -> i128 {
        let mut v: i128 = 0;
        for _ in 0..4 {
            v = (v << 30) | i128::from(lcg(s) & 0x3FFF_FFFF);
        }
        // 120 bits of magnitude with a random sign
        if lcg(s) & 1 == 1 {
            -v
        } else {
            v
        }
    }

    #[test]
    fn agrees_with_i128_on_a_million_seeded_values() {
        let mut s: u64 = 20_260_801;
        let mut checked = 0u32;
        for _ in 0..1_000_000 {
            let a = rand_i128(&mut s);
            let b = rand_i128(&mut s);
            let (x, y) = (I256::from_i128(a), I256::from_i128(b));
            assert_eq!(x.plus(y).to_i128(), Some(a + b));
            assert_eq!(x.minus(y).to_i128(), Some(a - b));
            assert_eq!(x.shl1().to_i128(), Some(a * 2));
            assert_eq!(x.cmp(&y), a.cmp(&b));
            assert_eq!(x.overflowing_neg().0.to_i128(), Some(-a));
            checked += 1;
        }
        assert_eq!(checked, 1_000_000);
    }

    #[test]
    fn decimal_matches_i128_and_handles_zero_and_negatives() {
        let mut s: u64 = 7;
        for _ in 0..2000 {
            let a = rand_i128(&mut s);
            assert_eq!(I256::from_i128(a).to_decimal(), a.to_string());
        }
        assert_eq!(I256::ZERO.to_decimal(), "0");
        assert_eq!(I256::from_i64(-1).to_decimal(), "-1");
        assert_eq!(
            I256::from_i128(i128::MIN).to_decimal(),
            i128::MIN.to_string()
        );
        assert_eq!(
            I256::from_i128(i128::MAX).to_decimal(),
            i128::MAX.to_string()
        );
    }

    #[test]
    fn grows_beyond_i128_and_overflow_is_reported_not_wrapped() {
        // i128::MAX + 1 does not fit i128 but is fine in 256 bits
        let big = I256::from_i128(i128::MAX).add_i64(1);
        assert_eq!(big.to_i128(), None);
        assert_eq!(big.to_decimal(), "170141183460469231731687303715884105728");
        // 2^255 - 1 is the top of the range; one more overflows
        let mut v = I256::from_i64(1);
        for _ in 0..254 {
            v = v.shl1();
        }
        assert!(
            v.checked_add(v).is_none(),
            "2^254 + 2^254 = 2^255 overflows a signed 256-bit"
        );
        assert!(I256::from_i64(-1).checked_add(I256::from_i64(1)).is_some());
    }

    #[test]
    fn ordering_is_signed() {
        let neg = I256::from_i128(-5).shl1().shl1();
        let pos = I256::from_i64(3);
        assert!(neg < pos);
        assert!(I256::from_i128(i128::MAX).add_i64(1) > I256::from_i128(i128::MAX));
        assert!(I256::from_i128(i128::MIN).minus(I256::from_i64(1)) < I256::from_i128(i128::MIN));
    }
}
