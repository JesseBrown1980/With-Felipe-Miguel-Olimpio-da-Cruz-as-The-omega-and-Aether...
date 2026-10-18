//! `Number::toString(10)` (ECMA-262 6.1.6.1.20), the text `JSON.stringify` writes for a Number.
//!
//! The digits are the shortest decimal that reads back to the same binary64, and of those the
//! one nearest the exact value (V8's shortest mode); boundaries count when the significand is
//! even, as round-to-nearest-even reading accepts them. Digit generation is exact, on integers.

use crate::number::Number;
use core::cmp::Ordering;

/// Unsigned big integer, little-endian base-2^32 limbs.
#[derive(Clone, Debug)]
struct Big(Vec<u32>);

impl Big {
    fn from_u64(v: u64) -> Big {
        let mut b = Big(vec![v as u32, (v >> 32) as u32]);
        b.trim();
        b
    }

    fn trim(&mut self) {
        while self.0.last() == Some(&0) {
            self.0.pop();
        }
    }

    fn mul_small(&mut self, m: u32) {
        let mut carry = 0u64;
        for limb in self.0.iter_mut() {
            let v = u64::from(*limb) * u64::from(m) + carry;
            *limb = v as u32;
            carry = v >> 32;
        }
        if carry != 0 {
            self.0.push(carry as u32);
        }
        self.trim();
    }

    fn mul_pow10(&mut self, mut k: u32) {
        while k >= 9 {
            self.mul_small(1_000_000_000);
            k -= 9;
        }
        self.mul_small(10u32.pow(k));
    }

    fn shl(&mut self, n: u32) {
        let words = (n / 32) as usize;
        let bits = n % 32;
        if bits != 0 {
            let mut carry = 0u32;
            for limb in self.0.iter_mut() {
                let v = (*limb << bits) | carry;
                carry = *limb >> (32 - bits);
                *limb = v;
            }
            if carry != 0 {
                self.0.push(carry);
            }
        }
        if words != 0 && !self.0.is_empty() {
            let mut shifted = vec![0u32; words];
            shifted.extend_from_slice(&self.0);
            self.0 = shifted;
        }
    }

    fn add(&self, other: &Big) -> Big {
        let len = self.0.len().max(other.0.len());
        let mut out = Vec::with_capacity(len + 1);
        let mut carry = 0u64;
        for i in 0..len {
            let a = u64::from(*self.0.get(i).unwrap_or(&0));
            let b = u64::from(*other.0.get(i).unwrap_or(&0));
            let v = a + b + carry;
            out.push(v as u32);
            carry = v >> 32;
        }
        if carry != 0 {
            out.push(carry as u32);
        }
        let mut b = Big(out);
        b.trim();
        b
    }

    /// `self -= other`; requires `self >= other`.
    fn sub_assign(&mut self, other: &Big) {
        let mut borrow = 0i64;
        for i in 0..self.0.len() {
            let b = i64::from(*other.0.get(i).unwrap_or(&0));
            let mut v = i64::from(self.0[i]) - b - borrow;
            borrow = 0;
            if v < 0 {
                v += 1 << 32;
                borrow = 1;
            }
            self.0[i] = v as u32;
        }
        debug_assert_eq!(borrow, 0);
        self.trim();
    }

    fn cmp(&self, other: &Big) -> Ordering {
        self.0
            .len()
            .cmp(&other.0.len())
            .then_with(|| self.0.iter().rev().cmp(other.0.iter().rev()))
    }
}

/// `floor(e * log10(2))` for `|e| <= 1100`.
fn floor_log10_pow2(e: i32) -> i32 {
    ((i64::from(e) * 1_292_913_986) >> 32) as i32
}

/// Shortest round-trip digits of a finite positive Number and its decimal exponent `k`:
/// the value is `0.d1 d2 ... dn * 10^k`.
fn shortest_digits(x: Number) -> (Vec<u8>, i32) {
    let bits = x.to_bits();
    let biased = ((bits >> 52) & 0x7FF) as i32;
    let frac = bits & ((1 << 52) - 1);
    let (f, e) = if biased == 0 {
        (frac, -1074)
    } else {
        (frac | (1 << 52), biased - 1075)
    };
    let even = f % 2 == 0;
    // The gap below a power of two is half the gap above it.
    let lower_boundary_closer = frac == 0 && biased > 1;
    let (mut r, mut s, mut m_plus, mut m_minus);
    if e >= 0 {
        let mut be = Big::from_u64(1);
        be.shl(e as u32);
        if lower_boundary_closer {
            r = Big::from_u64(f);
            r.shl(e as u32 + 2);
            s = Big::from_u64(4);
            m_plus = be.clone();
            m_plus.shl(1);
            m_minus = be;
        } else {
            r = Big::from_u64(f);
            r.shl(e as u32 + 1);
            s = Big::from_u64(2);
            m_plus = be.clone();
            m_minus = be;
        }
    } else if lower_boundary_closer {
        r = Big::from_u64(f);
        r.shl(2);
        s = Big::from_u64(1);
        s.shl((2 - e) as u32);
        m_plus = Big::from_u64(2);
        m_minus = Big::from_u64(1);
    } else {
        r = Big::from_u64(f);
        r.shl(1);
        s = Big::from_u64(1);
        s.shl((1 - e) as u32);
        m_plus = Big::from_u64(1);
        m_minus = Big::from_u64(1);
    }
    // x lies in [2^(e+len-1), 2^(e+len)), so floor(log10 x) is this estimate or one above it.
    let len = 64 - f.leading_zeros() as i32;
    let mut k = floor_log10_pow2(e + len - 1) + 1;
    if k >= 0 {
        s.mul_pow10(k as u32);
    } else {
        let p = (-k) as u32;
        r.mul_pow10(p);
        m_plus.mul_pow10(p);
        m_minus.mul_pow10(p);
    }
    let high_reaches = |r: &Big, m_plus: &Big, s: &Big| {
        let high = r.add(m_plus);
        match high.cmp(s) {
            Ordering::Greater => true,
            Ordering::Equal => even,
            Ordering::Less => false,
        }
    };
    while high_reaches(&r, &m_plus, &s) {
        s.mul_small(10);
        k += 1;
    }
    loop {
        let mut high = r.add(&m_plus);
        high.mul_small(10);
        let below = match high.cmp(&s) {
            Ordering::Less => true,
            Ordering::Equal => !even,
            Ordering::Greater => false,
        };
        if !below {
            break;
        }
        r.mul_small(10);
        m_plus.mul_small(10);
        m_minus.mul_small(10);
        k -= 1;
    }
    let mut digits: Vec<u8> = Vec::new();
    loop {
        r.mul_small(10);
        m_plus.mul_small(10);
        m_minus.mul_small(10);
        let mut d = 0u8;
        while r.cmp(&s) != Ordering::Less {
            r.sub_assign(&s);
            d += 1;
        }
        let low = match r.cmp(&m_minus) {
            Ordering::Less => true,
            Ordering::Equal => even,
            Ordering::Greater => false,
        };
        let high = high_reaches(&r, &m_plus, &s);
        if !low && !high {
            digits.push(d);
            continue;
        }
        let up = if low && high {
            let mut twice = r.clone();
            twice.shl(1);
            match twice.cmp(&s) {
                Ordering::Less => false,
                Ordering::Greater => true,
                // Halfway: V8's bignum-dtoa rounds the last digit to even.
                Ordering::Equal => d % 2 == 1,
            }
        } else {
            high
        };
        digits.push(d + u8::from(up));
        break;
    }
    // A last digit of 10 carries into the digits before it.
    let mut i = digits.len() - 1;
    while digits[i] == 10 {
        digits[i] = 0;
        if i == 0 {
            digits.insert(0, 1);
            k += 1;
            break;
        }
        i -= 1;
        digits[i] += 1;
    }
    while digits.len() > 1 && digits.last() == Some(&0) {
        digits.pop();
    }
    (digits, k)
}

/// `Number::toString(10)`: what `String(x)` returns.
pub fn number_to_string(x: Number) -> String {
    if x.is_nan() {
        return "NaN".to_string();
    }
    if x.is_zero() {
        return "0".to_string();
    }
    if x.is_sign_negative() {
        return format!("-{}", number_to_string(-x));
    }
    if x.is_infinite() {
        return "Infinity".to_string();
    }
    // Below 2^53 every integer is a Number, so an integer's shortest digits are its own.
    if x.lt(Number::from_u64(1 << 53)) {
        let t = x.trunc_i64();
        if Number::from_i64(t) == x {
            return t.to_string();
        }
    }
    let (digits, n) = shortest_digits(x);
    let ds: String = digits.iter().map(|d| char::from(b'0' + d)).collect();
    let k = digits.len() as i32;
    if k <= n && n <= 21 {
        return format!("{ds}{}", "0".repeat((n - k) as usize));
    }
    if 0 < n && n <= 21 {
        let (a, b) = ds.split_at(n as usize);
        return format!("{a}.{b}");
    }
    if -6 < n && n <= 0 {
        return format!("0.{}{ds}", "0".repeat((-n) as usize));
    }
    let e = n - 1;
    let sign = if e >= 0 { '+' } else { '-' };
    if k == 1 {
        format!("{ds}e{sign}{}", e.abs())
    } else {
        let (a, b) = ds.split_at(1);
        format!("{a}.{b}e{sign}{}", e.abs())
    }
}

/// `JSON.stringify(x)` for a Number: non-finite values are written as `null`.
pub fn json_number(x: Number) -> String {
    if x.is_finite() {
        number_to_string(x)
    } else {
        "null".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(bits: u64) -> String {
        number_to_string(Number::from_bits(bits))
    }

    #[test]
    fn formats_like_javascript() {
        assert_eq!(s(0x3FB9_9999_9999_999A), "0.1");
        assert_eq!(s(0x3FD3_3333_3333_3334), "0.30000000000000004");
        assert_eq!(s(0x4059_0000_0000_0000), "100");
        assert_eq!(s(0x3EB0_C6F7_A0B5_ED8D), "0.000001");
        assert_eq!(s(0x3E7A_D7F2_9ABC_AF48), "1e-7");
        assert_eq!(s(0x4415_AF1D_78B5_8C40), "100000000000000000000");
        assert_eq!(s(0x444B_1AE4_D6E2_EF50), "1e+21");
        assert_eq!(s(0x0000_0000_0000_0001), "5e-324");
        assert_eq!(s(0x7FEF_FFFF_FFFF_FFFF), "1.7976931348623157e+308");
        assert_eq!(s(0x4340_0000_0000_0000), "9007199254740992");
        assert_eq!(s(0xC00C_0000_0000_0000), "-3.5");
        assert_eq!(s(0x8000_0000_0000_0000), "0");
        assert_eq!(json_number(Number::NAN), "null");
        assert_eq!(json_number(Number::NEG_INFINITY), "null");
    }
}
