//! A non-negative reduced fraction printed as Python's `str(Fraction)`: `n/d`, or `n` when the
//! denominator is 1. Written here, not upstream.

use core::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Frac {
    pub num: u64,
    pub den: u64,
}

fn gcd(mut a: u64, mut b: u64) -> u64 {
    while b != 0 {
        (a, b) = (b, a % b);
    }
    a
}

impl Frac {
    /// `Fraction(num, den)`, reduced to lowest terms.
    pub fn new(num: u64, den: u64) -> Frac {
        assert!(den != 0, "Fraction(n, 0)");
        let g = gcd(num, den);
        Frac {
            num: num / g,
            den: den / g,
        }
    }
}

impl fmt::Display for Frac {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.den == 1 {
            write!(f, "{}", self.num)
        } else {
            write!(f, "{}/{}", self.num, self.den)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Frac;

    #[test]
    fn prints_like_python_fraction_str() {
        assert_eq!(Frac::new(2, 6).to_string(), "1/3");
        assert_eq!(Frac::new(0, 7).to_string(), "0");
        assert_eq!(Frac::new(4, 2).to_string(), "2");
        assert_eq!(Frac::new(32, 2187 * 3).to_string(), "32/6561");
    }
}
