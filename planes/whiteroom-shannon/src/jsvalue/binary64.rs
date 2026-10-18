//! The binary64 value of an exact decimal (IEEE-754 roundTiesToEven, the rounding ECMA-262
//! StringToNumber applies) and `Number::toString` (ECMA-262 6.1.6.1.20) of that value, in
//! integer arithmetic.

use super::Decimal;
use core::cmp::Ordering;

/// The magnitude of a binary64 value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Magnitude {
    /// `m × 2^e` with `m < 2^53`, and `m >= 2^52` unless `e == -1074`; zero is `(0, 0)`.
    Finite(u64, i64),
    /// At or past the overflow threshold.
    Infinite,
}

/// Every binary64 value and every midpoint between two neighbours has at most 767 significant
/// digits, so past this many digits only whether any further digit is non-zero decides the rounding.
const KEEP_DIGITS: usize = 800;
const MIN_EXP: i64 = -1074;
const MAX_EXP: i64 = 971;

/// An unsigned integer: little-endian base-2^32 limbs, no zero limb at the top.
#[derive(Clone, Debug)]
struct Big(Vec<u32>);

impl Big {
    fn from_u64(n: u64) -> Big {
        let mut big = Big(vec![n as u32, (n >> 32) as u32]);
        big.trim();
        big
    }

    fn from_digits(digits: &[u8]) -> Big {
        let mut big = Big(Vec::new());
        for chunk in digits.chunks(9) {
            let value = chunk.iter().fold(0, |acc, &d| acc * 10 + u32::from(d));
            big.mul_add(10u32.pow(chunk.len() as u32), value);
        }
        big
    }

    fn trim(&mut self) {
        while self.0.last() == Some(&0) {
            self.0.pop();
        }
    }

    fn mul_add(&mut self, mul: u32, add: u32) {
        let mut carry = u64::from(add);
        for limb in &mut self.0 {
            let t = u64::from(*limb) * u64::from(mul) + carry;
            *limb = t as u32;
            carry = t >> 32;
        }
        if carry > 0 {
            self.0.push(carry as u32);
        }
    }

    /// `self × base^n`.
    fn mul_pow(&mut self, base: u32, mut n: u64) {
        let (mut step, mut per) = (1u32, 0u64);
        while let Some(next) = step.checked_mul(base) {
            (step, per) = (next, per + 1);
        }
        while n >= per {
            self.mul_add(step, 0);
            n -= per;
        }
        self.mul_add(base.pow(n as u32), 0);
    }

    /// `floor(self / div)`; returns the remainder.
    fn div_rem(&mut self, div: u32) -> u32 {
        let mut rem = 0u64;
        for limb in self.0.iter_mut().rev() {
            let t = (rem << 32) | u64::from(*limb);
            *limb = (t / u64::from(div)) as u32;
            rem = t % u64::from(div);
        }
        self.trim();
        rem as u32
    }

    /// `floor(self / 10^n)`; true when the division was inexact.
    fn div_pow10(&mut self, mut n: u64) -> bool {
        let mut inexact = false;
        while n > 0 {
            let k = n.min(9);
            inexact |= self.div_rem(10u32.pow(k as u32)) != 0;
            n -= k;
        }
        inexact
    }

    fn shl(&mut self, n: u64) {
        if self.0.is_empty() {
            return;
        }
        self.mul_add(1 << (n % 32), 0);
        self.0
            .splice(0..0, core::iter::repeat(0).take((n / 32) as usize));
    }

    /// `floor(self / 2^n)`; true when a one bit was dropped.
    fn shr(&mut self, n: u64) -> bool {
        let limbs = ((n / 32) as usize).min(self.0.len());
        let mut inexact = self.0.drain(..limbs).any(|limb| limb != 0);
        inexact |= self.div_rem(1 << (n % 32)) != 0;
        inexact
    }

    fn bit_len(&self) -> i64 {
        self.0.last().map_or(0, |&top| {
            32 * (self.0.len() as i64 - 1) + i64::from(32 - top.leading_zeros())
        })
    }

    fn low_u64(&self) -> u64 {
        self.0
            .iter()
            .take(2)
            .rev()
            .fold(0, |acc, &limb| (acc << 32) | u64::from(limb))
    }

    /// Decimal digits, most significant first; empty for zero.
    fn into_digits(mut self) -> Vec<u8> {
        let mut groups = Vec::new();
        while !self.0.is_empty() {
            groups.push(self.div_rem(1_000_000_000));
        }
        let mut text = String::new();
        for (i, group) in groups.iter().rev().enumerate() {
            if i == 0 {
                text.push_str(&group.to_string());
            } else {
                text.push_str(&format!("{group:09}"));
            }
        }
        text.bytes().map(|b| b - b'0').collect()
    }
}

/// `floor(n × 10^exp × 2^shift)` and whether it was inexact.
fn scaled(n: &Big, exp: i64, shift: i64) -> (Big, bool) {
    let mut q = n.clone();
    if exp > 0 {
        q.mul_pow(10, exp.unsigned_abs());
    }
    let mut inexact = false;
    if shift >= 0 {
        q.shl(shift.unsigned_abs());
    } else {
        inexact |= q.shr(shift.unsigned_abs());
    }
    if exp < 0 {
        inexact |= q.div_pow10(exp.unsigned_abs());
    }
    (q, inexact)
}

/// The binary64 magnitude nearest `|d|`, ties to even.
pub(super) fn round(d: &Decimal) -> Magnitude {
    if d.digits.is_empty() {
        return Magnitude::Finite(0, 0);
    }
    // 10^(order - 1) <= |d| < 10^order.
    let order = d.digits.len() as i64 + d.exp;
    if order > 309 {
        return Magnitude::Infinite;
    }
    if order < -323 {
        // |d| < 10^-324, below 2^-1075 (half the least subnormal).
        return Magnitude::Finite(0, 0);
    }
    let (digits, exp) = if d.digits.len() > KEEP_DIGITS {
        // The dropped digits are not all zero (a Decimal has no trailing zeros): one sticky digit.
        let mut kept = d.digits[..KEEP_DIGITS].to_vec();
        kept.push(1);
        (kept, order - KEEP_DIGITS as i64 - 1)
    } else {
        (d.digits.clone(), d.exp)
    };
    let n = Big::from_digits(&digits);
    // At most floor(log2 |d|) - 52 (3.321928 < log2 10), so the first q is not zero.
    let mut sh = (((order - 1) * 3_321_928).div_euclid(1_000_000) - 54).max(MIN_EXP);
    loop {
        // q = floor(|d| / 2^(sh - 1)): the mantissa at exponent sh and one guard bit.
        let (q, inexact) = scaled(&n, exp, 1 - sh);
        let bits = q.bit_len();
        if bits > 54 {
            sh += bits - 54;
        } else if bits < 54 && sh > MIN_EXP {
            sh = (sh - (54 - bits)).max(MIN_EXP);
        } else {
            return finish(q.low_u64(), inexact, sh);
        }
    }
}

fn finish(q: u64, inexact: bool, sh: i64) -> Magnitude {
    let mut m = q >> 1;
    if q & 1 == 1 && (inexact || m & 1 == 1) {
        m += 1;
    }
    let (m, sh) = if m == 1 << 53 {
        (1 << 52, sh + 1)
    } else {
        (m, sh)
    };
    if sh > MAX_EXP {
        Magnitude::Infinite
    } else if m == 0 {
        Magnitude::Finite(0, 0)
    } else {
        Magnitude::Finite(m, sh)
    }
}

/// `m × 2^e` as an integer when it is one of magnitude at most 2^53.
pub(super) fn safe_integer(m: u64, e: i64) -> Option<i64> {
    let value = if m == 0 {
        0
    } else if e >= 0 {
        // m < 2^53, so e <= 1 keeps m × 2^e below 2^54.
        if e > 1 {
            return None;
        }
        m << e
    } else {
        let k = e.unsigned_abs();
        if k >= 53 || m % (1 << k) != 0 {
            return None;
        }
        m >> k
    };
    (value <= 1 << 53).then_some(value as i64)
}

/// The exact decimal value of `m × 2^e`.
fn exact_decimal(m: u64, e: i64) -> Decimal {
    let mut big = Big::from_u64(m);
    if e >= 0 {
        big.shl(e.unsigned_abs());
        Decimal::new(false, big.into_digits(), 0)
    } else {
        big.mul_pow(5, e.unsigned_abs());
        Decimal::new(false, big.into_digits(), e)
    }
}

fn decimal_of(s: u64, exp: i64) -> Decimal {
    Decimal::new(
        false,
        s.to_string().bytes().map(|b| b - b'0').collect(),
        exp,
    )
}

/// The decimal `Number::toString` prints for `m × 2^e` (`m > 0`): the fewest significant digits
/// whose value rounds back to it, the closest such decimal, the even one on a tie (ECMA-262
/// 6.1.6.1.20 step 5 with its note 2).
pub(super) fn shortest(m: u64, e: i64) -> Decimal {
    let x = exact_decimal(m, e);
    let order = x.digits.len() as i64 + x.exp;
    let target = Magnitude::Finite(m, e);
    for k in 1..x.digits.len() {
        let lo = x.digits[..k]
            .iter()
            .fold(0, |acc, &d| acc * 10 + u64::from(d));
        // x lies strictly between lo and lo + 1 (in units of 10^(order - k)); `rest` ends in a
        // non-zero digit, so it is exactly one half only as the single digit 5.
        let rest = &x.digits[k..];
        let half = rest[0].cmp(&5).then(if rest.len() > 1 {
            Ordering::Greater
        } else {
            Ordering::Equal
        });
        let exp = order - k as i64;
        let lo_ok = round(&decimal_of(lo, exp)) == target;
        let hi_ok = round(&decimal_of(lo + 1, exp)) == target;
        let pick = match (lo_ok, hi_ok) {
            (true, true) => match half {
                Ordering::Less => lo,
                Ordering::Greater => lo + 1,
                Ordering::Equal => lo + (lo & 1),
            },
            (true, false) => lo,
            (false, true) => lo + 1,
            (false, false) => continue,
        };
        return decimal_of(pick, exp);
    }
    x
}

/// `Number::toString` layout (ECMA-262 6.1.6.1.20 steps 6-12) of `±d`, `d` non-zero.
pub(super) fn number_text(neg: bool, d: &Decimal) -> String {
    let s: String = d.digits.iter().map(|&b| char::from(b'0' + b)).collect();
    let k = d.digits.len() as i64;
    let n = k + d.exp;
    let body = if (k..=21).contains(&n) {
        format!("{s}{}", "0".repeat((n - k) as usize))
    } else if (1..=21).contains(&n) {
        let (int, frac) = s.split_at(n as usize);
        format!("{int}.{frac}")
    } else if (-5..=0).contains(&n) {
        format!("0.{}{s}", "0".repeat(n.unsigned_abs() as usize))
    } else {
        let e = n - 1;
        let sign = if e < 0 { '-' } else { '+' };
        let (head, tail) = s.split_at(1);
        if tail.is_empty() {
            format!("{head}e{sign}{}", e.unsigned_abs())
        } else {
            format!("{head}.{tail}e{sign}{}", e.unsigned_abs())
        }
    };
    if neg {
        format!("-{body}")
    } else {
        body
    }
}

#[cfg(test)]
mod tests {
    use super::super::{string_to_number, Num};
    use super::*;

    fn rounded(text: &str) -> Magnitude {
        match string_to_number(text) {
            Num::Finite(d) => round(&d),
            other => panic!("{text}: {other:?}"),
        }
    }

    fn printed(text: &str) -> String {
        let Num::Finite(d) = string_to_number(text) else {
            panic!("{text}")
        };
        match round(&d) {
            Magnitude::Finite(m, e) if m != 0 => number_text(d.neg, &shortest(m, e)),
            other => format!("{other:?}"),
        }
    }

    #[test]
    fn decimals_round_to_the_nearest_binary64_ties_to_even() {
        let two_53 = 1 << 53;
        let cases = [
            ("1", Magnitude::Finite(1 << 52, -52)),
            ("9007199254740992", Magnitude::Finite(1 << 52, 1)),
            // 2^53 + 1 lies halfway between 2^53 and 2^53 + 2: the even mantissa, 2^53.
            ("9007199254740993", Magnitude::Finite(1 << 52, 1)),
            (
                "9007199254740993.000001",
                Magnitude::Finite((1 << 52) + 1, 1),
            ),
            ("9007199254740995", Magnitude::Finite((1 << 52) + 2, 1)),
            ("0.5", Magnitude::Finite(1 << 52, -53)),
            ("5e-324", Magnitude::Finite(1, -1074)),
            // 2^-1075 (half the least subnormal) rounds to zero, anything above it does not.
            ("2.4703282292062327e-324", Magnitude::Finite(0, 0)),
            ("2.4703282292062328e-324", Magnitude::Finite(1, -1074)),
            ("1e-400", Magnitude::Finite(0, 0)),
            ("2.2250738585072014e-308", Magnitude::Finite(1 << 52, -1074)),
            ("1.7976931348623157e308", Magnitude::Finite(two_53 - 1, 971)),
            ("1.7976931348623158e308", Magnitude::Finite(two_53 - 1, 971)),
            ("1e400", Magnitude::Infinite),
        ];
        for (text, want) in cases {
            assert_eq!(rounded(text), want, "{text}");
        }
        // 2^1024 - 2^970, halfway between the largest finite value and 2^1024, rounds to 2^1024.
        let overflow = "179769313486231580793728971405303415079934132710037826936173778980444968292764750946649017977587207096330286416692887910946555547851940402630657488671505820681908902000708383676273854845817711531764475730270069855571366959622842914819860834936475292719074168444365510704342711559699508093042880177904174497792";
        assert_eq!(rounded(overflow), Magnitude::Infinite);
        let below = format!("{}1", &overflow[..overflow.len() - 1]);
        assert_eq!(rounded(&below), Magnitude::Finite(two_53 - 1, 971));
        let long = format!("1.{}1", "0".repeat(2000));
        assert_eq!(rounded(&long), Magnitude::Finite(1 << 52, -52));
        let above_half = format!(
            "1.00000000000000011102230246251565404236316680908203125{}1",
            "0".repeat(900)
        );
        assert_eq!(rounded(&above_half), Magnitude::Finite((1 << 52) + 1, -52));
    }

    #[test]
    fn number_to_string_prints_the_shortest_closest_decimal() {
        for (text, want) in [
            ("0.1", "0.1"),
            ("0.10000000000000001", "0.1"),
            ("12345678901234567", "12345678901234568"),
            ("1.0000000000000001", "1"),
            ("5e-324", "5e-324"),
            ("2.4703282292062328e-324", "5e-324"),
            ("123e-20", "1.23e-18"),
            ("1e21", "1e+21"),
            ("-1.5e-7", "-1.5e-7"),
            ("0.000001", "0.000001"),
            ("1.7976931348623157e308", "1.7976931348623157e+308"),
            ("9007199254740993", "9007199254740992"),
            ("0.3", "0.3"),
            ("0.30000000000000004", "0.30000000000000004"),
            ("100", "100"),
            ("4.35", "4.35"),
        ] {
            assert_eq!(printed(text), want, "{text}");
        }
    }

    #[test]
    fn safe_integers_are_the_integers_up_to_2_53() {
        assert_eq!(safe_integer(0, 0), Some(0));
        assert_eq!(safe_integer(1 << 52, -52), Some(1));
        assert_eq!(safe_integer(1 << 52, 1), Some(1 << 53));
        assert_eq!(safe_integer((1 << 52) + 1, 1), None);
        assert_eq!(safe_integer(3 << 51, -52), None);
        assert_eq!(safe_integer(1, -1074), None);
    }
}
