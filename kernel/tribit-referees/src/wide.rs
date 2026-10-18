//! A 256-bit two's-complement integer for compose.py's exact lane (compose.py:131-143), whose
//! values pass `i128` near depth 77 (each step multiplies the spread of the triple by 3).
//! Written here, not upstream; overflow panics.

use core::fmt;
use core::ops::{Add, Neg, Sub};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Wide([u64; 4]);

impl Wide {
    pub const ZERO: Wide = Wide([0; 4]);

    pub fn from_i64(n: i64) -> Wide {
        let fill = if n < 0 { u64::MAX } else { 0 };
        Wide([n as u64, fill, fill, fill])
    }

    pub fn is_negative(self) -> bool {
        self.0[3] >> 63 == 1
    }

    pub fn is_zero(self) -> bool {
        self.0 == [0; 4]
    }
}

impl Add for Wide {
    type Output = Wide;

    fn add(self, other: Wide) -> Wide {
        let mut out = [0u64; 4];
        let mut carry = 0u128;
        for (i, slot) in out.iter_mut().enumerate() {
            let t = u128::from(self.0[i]) + u128::from(other.0[i]) + carry;
            *slot = t as u64;
            carry = t >> 64;
        }
        let r = Wide(out);
        assert!(
            self.is_negative() != other.is_negative() || r.is_negative() == self.is_negative(),
            "256-bit overflow"
        );
        r
    }
}

impl Neg for Wide {
    type Output = Wide;

    fn neg(self) -> Wide {
        let r = Wide([!self.0[0], !self.0[1], !self.0[2], !self.0[3]]) + Wide::from_i64(1);
        assert!(self.is_zero() || r != self, "256-bit overflow");
        r
    }
}

impl Sub for Wide {
    type Output = Wide;

    fn sub(self, other: Wide) -> Wide {
        self + -other
    }
}

impl fmt::Display for Wide {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        const CHUNK: u128 = 1_000_000_000_000_000_000;
        let mut mag = if self.is_negative() {
            (-*self).0
        } else {
            self.0
        };
        let mut chunks: Vec<u64> = Vec::new();
        loop {
            // divide the magnitude by 10^18, most significant limb first
            let mut rem = 0u128;
            for limb in mag.iter_mut().rev() {
                let cur = (rem << 64) | u128::from(*limb);
                *limb = (cur / CHUNK) as u64;
                rem = cur % CHUNK;
            }
            chunks.push(rem as u64);
            if mag == [0; 4] {
                break;
            }
        }
        let mut s = String::new();
        if self.is_negative() {
            s.push('-');
        }
        let mut iter = chunks.iter().rev();
        if let Some(top) = iter.next() {
            s.push_str(&top.to_string());
        }
        for c in iter {
            s.push_str(&format!("{c:018}"));
        }
        f.write_str(&s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decimal_text_matches_python_int_str() {
        assert_eq!(Wide::from_i64(0).to_string(), "0");
        assert_eq!(Wide::from_i64(-4).to_string(), "-4");
        // 3^81 = 443426488243037769948249630619149892803 (Python: str(3**81))
        let mut x = Wide::from_i64(1);
        for _ in 0..81 {
            x = x + x + x;
        }
        assert_eq!(x.to_string(), "443426488243037769948249630619149892803");
        assert_eq!((-x).to_string(), "-443426488243037769948249630619149892803");
        assert_eq!(x - x, Wide::ZERO);
    }
}
