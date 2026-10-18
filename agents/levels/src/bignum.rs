//! Unsigned integers of any size, for the Python `int` arithmetic of rime_27fischers.py, whose
//! modulus `M = prod(primes)` over 27 primes near 10^6 has 163 decimal digits (lines 68-70,
//! 46-50). Little-endian base-2^32 limbs, no leading zero limbs.

use core::cmp::Ordering;

/// A non-negative integer.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Big {
    limbs: Vec<u32>,
}

impl Big {
    /// Zero.
    pub fn zero() -> Big {
        Big { limbs: Vec::new() }
    }

    /// `v`.
    pub fn from_u64(v: u64) -> Big {
        Big::from_limbs(vec![v as u32, (v >> 32) as u32])
    }

    /// `int.from_bytes(bytes, "big")`, as `int(hexdigest, 16)` reads a digest.
    pub fn from_be_bytes(bytes: &[u8]) -> Big {
        let mut limbs = Vec::with_capacity(bytes.len() / 4 + 1);
        for chunk in bytes.rchunks(4) {
            let mut v = 0u32;
            for &b in chunk {
                v = v << 8 | u32::from(b);
            }
            limbs.push(v);
        }
        Big::from_limbs(limbs)
    }

    fn from_limbs(mut limbs: Vec<u32>) -> Big {
        while limbs.last() == Some(&0) {
            limbs.pop();
        }
        Big { limbs }
    }

    /// `self == 0`.
    pub fn is_zero(&self) -> bool {
        self.limbs.is_empty()
    }

    /// The number of significant bits.
    pub fn bits(&self) -> usize {
        match self.limbs.last() {
            None => 0,
            Some(&top) => self.limbs.len() * 32 - top.leading_zeros() as usize,
        }
    }

    /// `self * v`.
    pub fn mul_u64(&self, v: u64) -> Big {
        let (lo, hi) = (v as u32, (v >> 32) as u32);
        let a = self.mul_u32(lo);
        let b = self.mul_u32(hi).shl_bits(32);
        a.add(&b)
    }

    fn mul_u32(&self, v: u32) -> Big {
        let mut out = Vec::with_capacity(self.limbs.len() + 1);
        let mut carry = 0u64;
        for &l in &self.limbs {
            let t = u64::from(l) * u64::from(v) + carry;
            out.push(t as u32);
            carry = t >> 32;
        }
        out.push(carry as u32);
        Big::from_limbs(out)
    }

    /// `self + other`.
    pub fn add(&self, other: &Big) -> Big {
        let n = self.limbs.len().max(other.limbs.len());
        let mut out = Vec::with_capacity(n + 1);
        let mut carry = 0u64;
        for i in 0..n {
            let a = u64::from(*self.limbs.get(i).unwrap_or(&0));
            let b = u64::from(*other.limbs.get(i).unwrap_or(&0));
            let t = a + b + carry;
            out.push(t as u32);
            carry = t >> 32;
        }
        out.push(carry as u32);
        Big::from_limbs(out)
    }

    /// `self - other`, for `self >= other`.
    pub fn sub(&self, other: &Big) -> Big {
        assert!(*self >= *other, "non-negative difference");
        let mut out = Vec::with_capacity(self.limbs.len());
        let mut borrow = 0i64;
        for i in 0..self.limbs.len() {
            let mut t =
                i64::from(self.limbs[i]) - i64::from(*other.limbs.get(i).unwrap_or(&0)) - borrow;
            borrow = 0;
            if t < 0 {
                t += 1 << 32;
                borrow = 1;
            }
            out.push(t as u32);
        }
        Big::from_limbs(out)
    }

    /// `self << k`.
    pub fn shl_bits(&self, k: usize) -> Big {
        if self.is_zero() {
            return Big::zero();
        }
        let (words, bits) = (k / 32, (k % 32) as u32);
        let mut out = vec![0u32; words];
        let mut carry = 0u32;
        for &l in &self.limbs {
            if bits == 0 {
                out.push(l);
            } else {
                out.push(l << bits | carry);
                carry = l >> (32 - bits);
            }
        }
        out.push(carry);
        Big::from_limbs(out)
    }

    /// `(self // d, self % d)` for `d >= 1`.
    pub fn divmod_u64(&self, d: u64) -> (Big, u64) {
        assert!(d >= 1, "integer division by zero");
        let d = u128::from(d);
        let mut q = vec![0u32; self.limbs.len()];
        let mut r = 0u128;
        for i in (0..self.limbs.len()).rev() {
            let cur = r << 32 | u128::from(self.limbs[i]);
            q[i] = (cur / d) as u32;
            r = cur % d;
        }
        (Big::from_limbs(q), r as u64)
    }

    /// `self % d` for `d >= 1`.
    pub fn rem_u64(&self, d: u64) -> u64 {
        self.divmod_u64(d).1
    }

    /// `self % m` for `m > 0`, by binary long division.
    pub fn rem(&self, m: &Big) -> Big {
        assert!(!m.is_zero(), "integer modulo by zero");
        let mut r = self.clone();
        if r < *m {
            return r;
        }
        let mut shift = r.bits() - m.bits();
        loop {
            let s = m.shl_bits(shift);
            if r >= s {
                r = r.sub(&s);
            }
            if shift == 0 {
                break;
            }
            shift -= 1;
        }
        r
    }

    /// `prod(vs)`.
    pub fn product(vs: &[u64]) -> Big {
        vs.iter().fold(Big::from_u64(1), |acc, &v| acc.mul_u64(v))
    }

    /// `str(self)`.
    pub fn to_decimal(&self) -> String {
        if self.is_zero() {
            return "0".to_string();
        }
        let mut chunks = Vec::new();
        let mut v = self.clone();
        while !v.is_zero() {
            let (q, r) = v.divmod_u64(1_000_000_000);
            chunks.push(r);
            v = q;
        }
        let mut s = chunks.pop().expect("non-zero").to_string();
        for c in chunks.iter().rev() {
            s.push_str(&format!("{c:09}"));
        }
        s
    }
}

impl PartialOrd for Big {
    fn partial_cmp(&self, other: &Big) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Big {
    fn cmp(&self, other: &Big) -> Ordering {
        self.limbs
            .len()
            .cmp(&other.limbs.len())
            .then_with(|| self.limbs.iter().rev().cmp(other.limbs.iter().rev()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn to_u128(b: &Big) -> u128 {
        b.limbs
            .iter()
            .rev()
            .fold(0u128, |acc, &l| acc << 32 | u128::from(l))
    }

    #[test]
    fn agrees_with_u128() {
        let mut x = 0x9e37_79b9_7f4a_7c15u64;
        for _ in 0..2_000 {
            x = x
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            let a = u128::from(x >> 7) * u128::from(x >> 40 | 1);
            let small = (x >> 17) | 1;
            let ba = Big::from_be_bytes(&a.to_be_bytes());
            assert_eq!(to_u128(&ba), a);
            assert_eq!(ba.rem_u64(small), (a % u128::from(small)) as u64);
            let (q, r) = ba.divmod_u64(small);
            assert_eq!(to_u128(&q), a / u128::from(small));
            assert_eq!(u128::from(r), a % u128::from(small));
            let m = Big::from_u64(small);
            assert_eq!(to_u128(&ba.rem(&m)), a % u128::from(small));
            let c = u128::from(x >> 3);
            assert_eq!(to_u128(&Big::from_u64(x >> 3).add(&ba)), c + a);
            assert_eq!(to_u128(&ba.sub(&Big::zero())), a);
            assert_eq!(ba.to_decimal(), a.to_string());
            assert_eq!(ba.bits(), 128 - a.leading_zeros() as usize);
            let p = (x >> 30) as u32;
            assert_eq!(
                to_u128(&Big::from_u64(u64::from(p)).mul_u64(x >> 4)),
                u128::from(p) * u128::from(x >> 4)
            );
            assert_eq!(
                to_u128(&Big::from_u64(x >> 6).shl_bits(5)),
                u128::from(x >> 6) << 5
            );
            assert_eq!(
                to_u128(&Big::from_u64(x >> 6).shl_bits(64)),
                u128::from(x >> 6) << 64
            );
            let big_m = Big::from_be_bytes(&(a >> 40 | 1).to_be_bytes());
            assert_eq!(to_u128(&ba.rem(&big_m)), a % (a >> 40 | 1));
        }
        assert_eq!(Big::zero().to_decimal(), "0");
        assert_eq!(Big::product(&[]).to_decimal(), "1");
        assert_eq!(
            Big::product(&[1_000_081, 1_000_621, 1_000_999, 1_001_107]).to_decimal(),
            (1_000_081u128 * 1_000_621 * 1_000_999 * 1_001_107).to_string()
        );
    }
}
