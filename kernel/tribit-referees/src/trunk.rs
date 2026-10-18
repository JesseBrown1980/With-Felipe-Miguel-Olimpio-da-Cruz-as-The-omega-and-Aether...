//! Port of `trunk.py` (does-2-to-the-n-always-contain-a-digit-2-in-base-3@02299b4, blob
//! 5cefbf01; the same blob ships in the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3):
//! the low `K = 320` balanced-ternary digits of `2^n` for `n = 0..=N`, the lowest `-1` digit,
//! record setters, and the distribution. Integer only; `stdout(n)` is byte-equal to
//! `python trunk.py n` with `n` (a `u64`) written as ASCII decimal digits. trunk.py also runs
//! for N < 0, which this port does not take (PROVENANCE.md §5).

use crate::binary64::Binary64;
use core::fmt::Write;

/// trunk.py:20.
pub const K: usize = 320;
/// trunk.py:45, used when no argument is given.
pub const DEFAULT_N: u64 = 200_000;

/// `3^32`: `2^n mod 3^K` is held as ten base-`3^32` limbs, least significant first, so
/// `MOD = 3^K` (trunk.py:21) is `LIMB^10` and reducing mod `MOD` drops the carry out of the top.
const LIMB: u64 = 1_853_020_188_851_841;
const LIMB_TRITS: usize = 32;
const LIMBS: usize = K / LIMB_TRITS;

/// `2^n mod 3^K` for consecutive `n`, each value equal to trunk.py:26 `pow(2, n, MOD)`.
#[derive(Clone, Debug)]
pub struct Pow2Mod {
    limbs: [u64; LIMBS],
}

impl Pow2Mod {
    /// `2^0 mod 3^K`.
    pub fn one() -> Pow2Mod {
        let mut limbs = [0; LIMBS];
        limbs[0] = 1;
        Pow2Mod { limbs }
    }

    /// `2^(n+1) mod 3^K` from `2^n mod 3^K`.
    pub fn double(&mut self) {
        let mut carry = 0;
        for l in self.limbs.iter_mut() {
            let t = 2 * *l + carry;
            if t >= LIMB {
                *l = t - LIMB;
                carry = 1;
            } else {
                *l = t;
                carry = 0;
            }
        }
    }

    /// trunk.py:24-36 `low_digits`: the first `K` balanced digits, LSB first, in `{-1, 0, 1}`.
    ///
    /// `v = sum t[j] 3^j` with standard trits `t`. After `i` steps trunk.py's `v` equals
    /// `v // 3^i + c` where `c` is the 1 trunk.py:32 adds before dividing, so its `v % 3` is
    /// `(t[i] + c) % 3` and its next `c` is `(t[i] + c + 1) // 3` or `(t[i] + c) // 3`.
    pub fn low_digits(&self) -> [i8; K] {
        let mut out = [0i8; K];
        let mut c = 0u64;
        let mut i = 0;
        for &limb in &self.limbs {
            let mut x = limb;
            for _ in 0..LIMB_TRITS {
                let v = x % 3 + c;
                x /= 3;
                let r = v % 3;
                if r == 2 {
                    out[i] = -1;
                    c = (v + 1) / 3;
                } else {
                    out[i] = r as i8;
                    c = v / 3;
                }
                i += 1;
            }
        }
        out
    }
}

/// trunk.py:39-42 `leaves`: (lowest `-1` position, count of `-1`, of `0`, of `1`).
pub fn leaves(d: &[i8; K]) -> (Option<usize>, u64, u64, u64) {
    let lowest = d.iter().position(|&x| x == -1);
    let count = |t: i8| d.iter().filter(|&&x| x == t).count() as u64;
    (lowest, count(-1), count(0), count(1))
}

/// The state trunk.py:51-69 builds over `n = 0..=N`.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Sweep {
    pub n_max: u64,
    /// `(n, lowest_minus, minus_count)` for each record setter.
    pub records: Vec<(u64, usize, u64)>,
    pub no_minus: Vec<u64>,
    /// `(min_count_after8, argmin)`.
    pub min_after8: Option<(u64, u64)>,
    /// `hist[pos]` = how many `n` have their lowest `-1` at `pos`.
    pub hist: Vec<u64>,
}

/// trunk.py:51-69.
pub fn sweep(n_max: u64) -> Sweep {
    let mut s = Sweep {
        n_max,
        hist: vec![0; K],
        ..Sweep::default()
    };
    let mut record: i64 = -1;
    let mut v = Pow2Mod::one();
    for n in 0..=n_max {
        let (lowest, m, _z, _p) = leaves(&v.low_digits());
        v.double();
        let Some(lowest) = lowest else {
            s.no_minus.push(n);
            continue;
        };
        s.hist[lowest] += 1;
        if lowest as i64 > record {
            record = lowest as i64;
            s.records.push((n, lowest, m));
        }
        if n > 8 {
            match s.min_after8 {
                Some((best, _)) if m >= best => {}
                _ => s.min_after8 = Some((m, n)),
            }
        }
    }
    s
}

fn percent(count: u64, n_max: u64) -> String {
    // trunk.py:84,86,92 `100 * count / (N + 1)`: int / int, correctly rounded, then `%.4f`
    Binary64::from_ratio(false, 100 * u128::from(count), u128::from(n_max) + 1).fmt_fixed(4)
}

fn py_list(xs: &[u64]) -> String {
    let parts: Vec<String> = xs.iter().map(|x| x.to_string()).collect();
    format!("[{}]", parts.join(", "))
}

/// trunk.py:92 `100 * (2 / 3) ** k * (1 / 3)`, evaluated left to right in binary64.
///
/// `(2 / 3) ** k`: CPython float_pow returns 1.0 for `k = 0` and calls C `pow` otherwise; this
/// takes `pow` as the correctly rounded power, which glibc 2.39 `pow` returned for k = 1..5
/// (as_integer_ratio compared; see PROVENANCE.md).
pub fn iid_expected(k: u32) -> Binary64 {
    let two_thirds = Binary64::from_ratio(false, 2, 3);
    let p = if k == 0 {
        Binary64::from_int(1)
    } else {
        two_thirds.powi_correctly_rounded(k)
    };
    Binary64::from_int(100) * p * Binary64::from_ratio(false, 1, 3)
}

/// Everything `python trunk.py n_max` prints, byte for byte.
pub fn stdout(n_max: u64) -> String {
    let s = sweep(n_max);
    let mut o = String::new();
    let w = &mut o;
    let line = |w: &mut String, text: &str| {
        w.push_str(text);
        w.push('\n');
    };
    line(
        w,
        &format!("TRUNK|erdos_base3_in_balanced_ternary|K={K}|N={n_max}|json=0"),
    );
    line(
        w,
        "CONJECTURE|for n>8 the balanced expansion of 2^n contains a -1|json=0",
    );
    line(w, "");
    line(
        w,
        &format!("NO_MINUS_ANYWHERE|n={}|json=0", py_list(&s.no_minus)),
    );
    line(
        w,
        "  (these are the known exceptions; empty beyond n=8 supports the conjecture)",
    );
    line(w, "");
    line(
        w,
        &format!(
            "RECORD_SETTERS|n where lowest_minus beats all previous|count={}|json=0",
            s.records.len()
        ),
    );
    line(
        w,
        &format!("      n          lowest_minus   minus_count_in_low_{K}"),
    );
    for &(n, lo, m) in &s.records {
        writeln!(w, "   {n:<10} {lo:<14} {m}").expect("write to String");
    }
    line(w, "");
    let (value, at_n) = match s.min_after8 {
        Some((m, n)) => (m.to_string(), n.to_string()),
        None => ("None".to_string(), "None".to_string()),
    };
    line(
        w,
        &format!("MIN_MINUS_COUNT|for n>8|value={value}|at_n={at_n}|json=0"),
    );
    line(
        w,
        "  (if this never reaches 0, no counterexample was seen in this range)",
    );
    line(w, "");
    line(w, "DISTRIBUTION|lowest_minus position -> how many n|json=0");
    // `sorted(hist)[:20]`: the first 20 positions that occur (trunk.py:83)
    let present: Vec<usize> = (0..K).filter(|&k| s.hist[k] > 0).collect();
    for &k in present.iter().take(20) {
        writeln!(
            w,
            "   pos {k:<4} {:>8}   ({}%)",
            s.hist[k],
            percent(s.hist[k], n_max)
        )
        .expect("write to String");
    }
    let tail: u64 = (20..K).map(|k| s.hist[k]).sum();
    writeln!(w, "   pos>=20  {tail:>8}   ({}%)", percent(tail, n_max)).expect("write to String");
    line(w, "");
    line(
        w,
        "PREDICTED|if digits were uniform iid over {-1,0,1}:|json=0",
    );
    line(w, "   P(lowest_minus = k) = (2/3)^k * (1/3)");
    for k in 0..6u32 {
        writeln!(
            w,
            "   pos {k:<4} expected {}%   observed {}%",
            iid_expected(k).fmt_fixed(4),
            percent(s.hist[k as usize], n_max)
        )
        .expect("write to String");
    }
    o
}

#[cfg(test)]
mod tests {
    use super::*;

    fn digits_of(n: u32) -> Vec<i8> {
        let mut v = Pow2Mod::one();
        for _ in 0..n {
            v.double();
        }
        v.low_digits().to_vec()
    }

    fn value(d: &[i8]) -> i128 {
        d.iter()
            .rev()
            .fold(0i128, |acc, &t| acc * 3 + i128::from(t))
    }

    #[test]
    fn balanced_digits_reconstruct_small_powers() {
        // below 3^K/2 the K balanced digits are the whole expansion
        for n in 0..100 {
            assert_eq!(value(&digits_of(n)), 1i128 << n, "n = {n}");
        }
        // README "n=1 2 base3 2 bal3 1T", "n=9 512 bal3 1T0100T"
        assert_eq!(&digits_of(1)[..2], &[-1, 1]);
        assert_eq!(&digits_of(9)[..7], &[-1, 0, 0, 1, 0, -1, 1]);
    }

    #[test]
    fn exceptions_are_zero_two_eight() {
        let s = sweep(4000);
        assert_eq!(s.no_minus, vec![0, 2, 8]);
        assert_eq!(s.min_after8, Some((2, 9)));
    }
}
