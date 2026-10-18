//! Port of `crank.py` (The-Brown-Light-erdos-Engine-block-powered-by-light@a2a6c44, blob
//! 12b03433; the same blob ships in the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3):
//! the fraction of surviving residues whose balanced digit `k` of `2^n` is `-1`, over one full
//! period `2 * 3^k` per level. Integer only; `stdout()` is byte-equal to the script's output.

use crate::binary64::Binary64;
use crate::frac::Frac;
use core::fmt::Write;

/// crank.py:23.
pub const MAXK: u32 = 13;

fn pow_mod(base: u64, mut exp: u64, modulus: u64) -> u64 {
    let mut acc = 1 % modulus;
    let mut b = base % modulus;
    while exp > 0 {
        if exp & 1 == 1 {
            acc = acc * b % modulus;
        }
        b = b * b % modulus;
        exp >>= 1;
    }
    acc
}

/// One printed row of crank.py:52-53.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Level {
    pub k: u32,
    pub period: u64,
    pub survivors_in: u64,
    pub fire_at_k: u64,
    pub carry: u64,
    pub fire_fraction: Frac,
}

/// crank.py:24-56.
pub fn levels() -> Vec<Level> {
    let mut rows = Vec::new();
    // survivors[n mod prev_period]: n has not fired yet (crank.py:24-25)
    let mut survivors: Option<Vec<bool>> = None;
    let mut prev_period = 0u64;
    for k in 0..MAXK {
        let modulus = 3u64.pow(k + 1);
        let period = 2 * 3u64.pow(k);
        let cur: Vec<u64> = match &survivors {
            None => (0..period).collect(),
            Some(s) => (0..period)
                .filter(|n| s[(n % prev_period) as usize])
                .collect(),
        };
        let mut fired = vec![false; period as usize];
        let mut fire = 0u64;
        for &n in &cur {
            let mut v = pow_mod(2, n, modulus);
            // walk to digit k (crank.py:41-47)
            for _ in 0..k {
                let r = v % 3;
                if r == 2 {
                    v = (v + 1) / 3;
                } else {
                    v /= 3;
                }
            }
            if v % 3 == 2 {
                fired[n as usize] = true;
                fire += 1;
            }
        }
        let mut next = vec![false; period as usize];
        let mut carry = 0u64;
        for &n in &cur {
            if !fired[n as usize] {
                next[n as usize] = true;
                carry += 1;
            }
        }
        let f = if cur.is_empty() {
            Frac::new(0, 1)
        } else {
            Frac::new(fire, cur.len() as u64)
        };
        rows.push(Level {
            k,
            period,
            survivors_in: cur.len() as u64,
            fire_at_k: fire,
            carry,
            fire_fraction: f,
        });
        survivors = Some(next);
        prev_period = period;
        if carry == 0 {
            break;
        }
    }
    rows
}

/// The closed form of crank.py:70: `1/2` at `k = 0`, else `(1/6) * (2/3)^(k-1)`.
pub fn closed_form(k: u32) -> Frac {
    if k == 0 {
        Frac::new(1, 2)
    } else {
        Frac::new(2u64.pow(k - 1), 6 * 3u64.pow(k - 1))
    }
}

/// Everything crank.py prints, byte for byte.
pub fn stdout() -> String {
    let mut o = String::new();
    o.push_str("CRANK|exact over full periods|json=0\n");
    o.push('\n');
    o.push_str(" k   period      survivors_in   fire_at_k   carry   fire_fraction   exact\n");
    o.push_str(&format!(" {}\n", "-".repeat(76)));
    for row in levels() {
        let f = row.fire_fraction;
        let exact = Binary64::from_ratio(false, u128::from(f.num), u128::from(f.den)).repr();
        writeln!(
            o,
            " {:<3} {:<11} {:<14} {:<11} {:<7} {:<15} {}",
            row.k,
            row.period,
            row.survivors_in,
            row.fire_at_k,
            row.carry,
            f.to_string(),
            exact
        )
        .expect("write to String");
    }
    o.push('\n');
    o.push_str("READING|json=0\n");
    o.push_str("  level 0  fire fraction 1/2   <- parity: the coset {2,5,8} mod 9\n");
    o.push_str("  level k  fire fraction 1/3   <- one of three throws on the subgroup\n");
    o.push('\n');
    o.push_str("IF 1/3 HOLDS AT EVERY LEVEL:\n");
    o.push_str("  P(0) = 1/2\n");
    o.push_str("  P(k) = (1/2) * (2/3)^(k-1) * (1/3) = (1/6)(2/3)^(k-1)   for k >= 1\n");
    o.push_str("  and P(no -1 ever) = lim (1/2)(2/3)^k = 0\n");
    o.push('\n');
    o.push_str("CHECK|closed form against the exact fractions above|json=0\n");
    for k in 0..8 {
        let p = closed_form(k);
        let shown = Binary64::from_ratio(false, u128::from(p.num), u128::from(p.den));
        writeln!(
            o,
            "  P({}) = {:<10} = {}",
            k,
            p.to_string(),
            shown.fmt_fixed(6)
        )
        .expect("write to String");
    }
    o
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn thirteen_levels_one_half_then_one_third() {
        let rows = levels();
        assert_eq!(rows.len(), 13);
        assert_eq!(rows[0].fire_fraction, Frac::new(1, 2));
        for (i, row) in rows.iter().enumerate().skip(1) {
            assert_eq!(row.fire_fraction, Frac::new(1, 3));
            assert_eq!(row.survivors_in, 3 << (i - 1));
            assert_eq!(row.fire_at_k, 1 << (i - 1));
            assert_eq!(row.carry, 2 << (i - 1));
        }
        assert_eq!(rows[12].period, 1_062_882);
    }
}
