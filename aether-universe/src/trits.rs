//! Balanced-ternary helpers. Integer only.
//!
//! Digits are `-1, 0, +1` stored as `i8`, **least significant first** (`lsf`) unless a function says
//! otherwise. Every row the game prints that carries trits also names its order (`order=lsf` or
//! `order=msf`), because the PTP receipt prints cube cells most-significant-first and the
//! addressing rows least-significant-first, and the two are easy to confuse.
//!
//! The packing primitives (`Zero`, `TritWord`) come from the repo's own `asolaria-tribit` crate;
//! nothing here re-implements them.

use asolaria_tribit::{TritWord, Zero, TRITS_PER_U128};

/// The value did not fit the requested width. The game never silently drops a carry.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OutOfRange {
    pub width: usize,
    pub span: i128,
}

/// `3^k` as `u128` (valid for `k <= 80`).
pub fn pow3(k: u32) -> u128 {
    3u128.pow(k)
}

/// The reach of `k` balanced trits: `(3^k - 1) / 2`. Count is not range: `k` trits hold `3^k`
/// states but reach only this far from the centre.
pub fn span(k: u32) -> i128 {
    ((pow3(k) - 1) / 2) as i128
}

/// Balanced digits of `n`, least significant first, minimal width. Zero is `[0]`.
///
/// Rule: `r = n mod 3` (Euclidean); `r == 2` gives digit `-1` and a carry, else digit `r`.
pub fn bal3(n: i128) -> Vec<i8> {
    if n == 0 {
        return vec![0];
    }
    let mut out = Vec::new();
    let mut n = n;
    while n != 0 {
        let r = n.rem_euclid(3);
        if r == 2 {
            out.push(-1);
            n = n.div_euclid(3) + 1;
        } else {
            out.push(r as i8);
            n = n.div_euclid(3);
        }
    }
    out
}

/// Fill `out` with the low `out.len()` balanced digits of `n` (least significant first) and report
/// whether the value fit. When it did not fit, the digits are the low digits and the carry is lost
/// (the caller must treat `false` as out of range).
pub fn bal3_into(n: i128, out: &mut [i8]) -> bool {
    let mut n = n;
    for slot in out.iter_mut() {
        let r = n.rem_euclid(3);
        if r == 2 {
            *slot = -1;
            n = n.div_euclid(3) + 1;
        } else {
            *slot = r as i8;
            n = n.div_euclid(3);
        }
    }
    n == 0
}

/// Fixed-width balanced digits, least significant first. A value beyond `+-(3^k - 1)/2` is an error.
pub fn bal3_width(n: i128, k: usize) -> Result<Vec<i8>, OutOfRange> {
    let mut out = vec![0i8; k];
    if bal3_into(n, &mut out) {
        Ok(out)
    } else {
        Err(OutOfRange {
            width: k,
            span: span(k as u32),
        })
    }
}

/// Value of balanced digits (least significant first).
pub fn from_bal3(t: &[i8]) -> i128 {
    let mut v: i128 = 0;
    for d in t.iter().rev() {
        v = v * 3 + i128::from(*d);
    }
    v
}

/// Ordinary base-3 digits `0..=2`, least significant first. Zero is `[0]`.
pub fn unbalanced_digits(n: u128) -> Vec<u8> {
    if n == 0 {
        return vec![0];
    }
    let mut out = Vec::new();
    let mut n = n;
    while n > 0 {
        out.push((n % 3) as u8);
        n /= 3;
    }
    out
}

/// How many ordinary base-3 digits `n` needs: the least `w` with `n < 3^w`.
pub fn unbalanced_width(n: u128) -> usize {
    unbalanced_digits(n).len()
}

/// Balanced digits as `Zero` values, **most significant first** (the order `TritWord::pack` wants).
pub fn to_zeros_msf(t_lsf: &[i8]) -> Vec<Zero> {
    t_lsf
        .iter()
        .rev()
        .map(|d| Zero::from_digit((*d + 1) as u8))
        .collect()
}

/// Inverse of [`to_zeros_msf`]: back to least-significant-first `i8` digits.
pub fn from_zeros_msf(z: &[Zero]) -> Vec<i8> {
    z.iter().rev().map(|x| x.direction()).collect()
}

/// Pack balanced digits into one `TritWord` (80 trits at most).
pub fn tritword(t_lsf: &[i8]) -> Option<TritWord> {
    if t_lsf.len() > TRITS_PER_U128 {
        return None;
    }
    Some(TritWord::pack(&to_zeros_msf(t_lsf)))
}

/// Unpack a `TritWord` of known width back to least-significant-first balanced digits.
pub fn untritword(w: TritWord, width: usize) -> Vec<i8> {
    let mut buf = vec![Zero::Nil; width.min(TRITS_PER_U128)];
    let n = w.unpack(&mut buf);
    from_zeros_msf(&buf[..n])
}

/// `"+,0,-"` style.
pub fn fmt_sym(t: &[i8]) -> String {
    t.iter()
        .map(|d| match d {
            -1 => "-",
            0 => "0",
            _ => "+",
        })
        .collect::<Vec<_>>()
        .join(",")
}

/// `"1,0,-1"` style (the receipts' style).
pub fn fmt_num(t: &[i8]) -> String {
    t.iter()
        .map(|d| d.to_string())
        .collect::<Vec<_>>()
        .join(",")
}

pub fn gcd(a: u64, b: u64) -> u64 {
    let (mut a, mut b) = (a, b);
    while b != 0 {
        let t = a % b;
        a = b;
        b = t;
    }
    a
}

pub fn lcm(a: u64, b: u64) -> u64 {
    a / gcd(a, b) * b
}

/// The cube cell of `n`: its residue mod 27 and the three balanced digits of the **centred**
/// residue (`r - 27` when `r > 13`), least significant first. Centring on the ground point is what
/// lets three trits hold all 27 residues at all.
pub fn cube_cell(n: u64) -> (u32, [i8; 3]) {
    let r = (n % 27) as i64;
    let c = if r > 13 { r - 27 } else { r };
    let mut d = [0i8; 3];
    let fit = bal3_into(i128::from(c), &mut d);
    debug_assert!(fit, "a centred residue mod 27 always fits three trits");
    (r as u32, d)
}

/// The spoke of `n` on the six mod-6 cylinders: `+1` for `6k+1`, `-1` for `6k-1`, else `None`.
pub fn spoke(n: u64) -> Option<i8> {
    match n % 6 {
        1 => Some(1),
        5 => Some(-1),
        _ => None,
    }
}

/// The room of `n` at `level`: the low `3 * level` balanced digits of `n`, least significant first.
/// A room at level L is the residue mod `3^(3L)` written as `3L` trits; because digit `i` depends
/// only on `n mod 3^(i+1)`, the low digits never change when the level grows.
pub fn room_digits(n: u64, level: usize) -> Vec<i8> {
    let mut out = vec![0i8; 3 * level];
    bal3_into(i128::from(n), &mut out);
    out
}

/// Room from the residue `n mod 3^(3L)` rather than from `n`: a second route to the same digits,
/// used to check that the rooms of two levels really nest. Valid for `level <= 13`.
pub fn room_from_residue(n: u64, level: usize) -> Vec<i8> {
    let m = 3u64.pow(3 * level as u32);
    let r = i128::from(n % m);
    let half = i128::from(m / 2);
    let c = if r > half { r - i128::from(m) } else { r };
    let mut out = vec![0i8; 3 * level];
    let fit = bal3_into(c, &mut out);
    debug_assert!(fit);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn three_trits_hold_27_states_but_span_only_13() {
        assert_eq!(pow3(3), 27);
        assert_eq!(span(3), 13);
        // every integer in -13..=13 has exactly one 3-trit form, and the 27 forms are distinct
        let mut seen = std::collections::BTreeSet::new();
        for n in -13i128..=13 {
            let t = bal3_width(n, 3).expect("in range");
            assert_eq!(from_bal3(&t), n);
            assert!(seen.insert(t));
        }
        assert_eq!(seen.len(), 27);
        // 14 and -14 do not fit: count is not range
        assert!(bal3_width(14, 3).is_err());
        assert!(bal3_width(-14, 3).is_err());
        assert_eq!(bal3(14), vec![-1, -1, -1, 1]);
    }

    #[test]
    fn bal3_matches_the_worked_examples() {
        assert_eq!(bal3(0), vec![0]);
        assert_eq!(bal3(13), vec![1, 1, 1]);
        assert_eq!(bal3(2), vec![-1, 1]);
        assert_eq!(bal3(3), vec![0, 1]);
        assert_eq!(bal3(-1), vec![-1]);
        assert_eq!(fmt_sym(&bal3(13)), "+,+,+");
        assert_eq!(fmt_num(&bal3(2)), "-1,1");
    }

    #[test]
    fn round_trips_through_tribit_tritword_for_every_n_in_ten_trit_range() {
        // 10 balanced trits reach +-29,524. Pack each form as asolaria_tribit Zero digits into a
        // TritWord, unpack, and compare with the game's own digits.
        for n in -29_524i128..=29_524 {
            let t = bal3_width(n, 10).expect("fits ten trits");
            let w = tritword(&t).expect("fits 80 trits");
            let back = untritword(w, 10);
            assert_eq!(back, t, "n={n}");
            assert_eq!(from_bal3(&back), n);
        }
    }

    #[test]
    fn unbalanced_width_is_the_sixty_four_bit_answer() {
        // 3^40 < 2^64 <= 3^41: a 64-bit value needs 41 ordinary base-3 digits.
        assert_eq!(unbalanced_width(u128::from(u64::MAX)), 41);
        assert_eq!(unbalanced_width(pow3(40) - 1), 40);
        assert_eq!(unbalanced_width(pow3(40)), 41);
        assert!(pow3(40) < 1u128 << 64);
        assert!(1u128 << 64 <= pow3(41));
    }

    #[test]
    fn centring_matters_for_sixty_four_bit_values() {
        // Raw u64::MAX does NOT fit 41 balanced trits (reach 1.82e19 < 1.84e19) ...
        let raw = i128::from(u64::MAX);
        assert!(bal3_width(raw, 41).is_err());
        assert_eq!(bal3(raw).len(), 42);
        // ... but centred on the ground point (value - 2^63) every 64-bit value fits 41, and 40 is short.
        let centred_max = i128::from(u64::MAX) - (1i128 << 63);
        let centred_min = -(1i128 << 63);
        assert!(bal3_width(centred_max, 41).is_ok());
        assert!(bal3_width(centred_min, 41).is_ok());
        assert!(bal3_width(centred_max, 40).is_err());
    }

    #[test]
    fn cube_cell_matches_the_receipt_cells() {
        // CELL rows of RECEIPT-PTP-CLOUD, printed most significant first there.
        let msf = |n: u64| {
            let (_, d) = cube_cell(n);
            let mut v = d.to_vec();
            v.reverse();
            v
        };
        assert_eq!(msf(5), vec![1, -1, -1]);
        assert_eq!(msf(13), vec![1, 1, 1]);
        assert_eq!(msf(14), vec![-1, -1, -1]);
        assert_eq!(msf(26), vec![0, 0, -1]);
        assert_eq!(msf(3), vec![0, 1, 0]);
        assert_eq!(cube_cell(27 * 5 + 13).0, 13);
    }

    #[test]
    fn spokes_are_6k_plus_minus_1() {
        assert_eq!(spoke(5), Some(-1));
        assert_eq!(spoke(7), Some(1));
        assert_eq!(spoke(11), Some(-1));
        assert_eq!(spoke(13), Some(1));
        assert_eq!(spoke(2), None);
        assert_eq!(spoke(3), None);
    }

    #[test]
    fn rooms_nest_and_never_move() {
        assert_eq!(fmt_num(&room_digits(2, 1)), "-1,1,0");
        assert_eq!(fmt_num(&room_digits(3, 1)), "0,1,0");
        // the low digits of level L+1 are exactly the digits of level L, for primes-sized numbers
        for n in [2u64, 3, 13, 1_000_003, 9_999_991, 7_174_454, 7_174_453] {
            for level in 1..6usize {
                let lo = room_digits(n, level);
                let hi = room_digits(n, level + 1);
                assert_eq!(&hi[..3 * level], &lo[..], "n={n} level={level}");
                // second route (residue) agrees with the first (digits)
                assert_eq!(room_from_residue(n, level), lo, "n={n} level={level}");
            }
        }
        // level 60 of a small number is the level-1 room padded with zero trits
        let r60 = room_digits(2, 60);
        assert_eq!(r60.len(), 180);
        assert_eq!(&r60[..3], &[-1, 1, 0]);
        assert!(r60[3..].iter().all(|d| *d == 0));
    }

    #[test]
    fn gcd_lcm() {
        assert_eq!(gcd(8, 10), 2);
        assert_eq!(lcm(8, 10), 40);
        assert_eq!(gcd(13, 27), 1);
        assert_eq!(gcd(9, 27), 9);
    }
}
