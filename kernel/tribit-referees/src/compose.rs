//! Port of `compose.py` (does-the-closure-survive-81-levels@00dc393, blob f3574ed1): the
//! three-arm closure `2a-b-c, 2b-a-c, 2c-a-b` over nested ternary trees and one 81-level path,
//! in the script's two arithmetics. The integer and Fraction lanes are integers here; the
//! float64 lanes (compose.py:80-102, 145-156) are carried by `Binary64`, the integer model of
//! binary64 and CPython 3.13 `sum`. `stdout()` is byte-equal to the script's output.

use crate::binary64::{py_sum, Binary64};
use crate::wide::Wide;
use core::fmt::Write;

/// compose.py:26.
pub const MAXD_FULL: u32 = 13;
/// compose.py:27.
pub const DEPTHS: [u32; 5] = [1, 3, 9, 27, 81];
/// The seed of compose.py:35,59,81.
pub const SEED: i64 = 20260801;

/// The generator of compose.py:38-41, 60-63, 82-85.
struct Lcg(i64);

impl Lcg {
    fn rnd(&mut self) -> i64 {
        self.0 = (self.0 * 1103515245 + 12345) & 0x7FFF_FFFF;
        self.0 % 2001 - 1000
    }
}

/// compose.py:30-31 on integers.
fn arms_int(a: i64, b: i64, c: i64) -> [i64; 3] {
    [2 * a - b - c, 2 * b - a - c, 2 * c - a - b]
}

/// compose.py:30-31 on exact integers wider than 128 bits (the Fraction lane).
fn arms_wide(a: Wide, b: Wide, c: Wide) -> [Wide; 3] {
    // `2 * a` on an integer Fraction is `a + a`
    [a + a - b - c, b + b - a - c, c + c - a - b]
}

/// compose.py:30-31 on binary64: `2 * a` is exact, then two rounded subtractions per arm.
fn arms_float(a: Binary64, b: Binary64, c: Binary64) -> [Binary64; 3] {
    let two = Binary64::from_int(2);
    [two * a - b - c, two * b - a - c, two * c - a - b]
}

/// compose.py:35-53 `nest_int`: (levels whose arms do not sum to 0, root).
pub fn nest_int(depth: u32) -> (u64, i64) {
    let mut g = Lcg(SEED);
    let mut level: Vec<i64> = (0..3usize.pow(depth)).map(|_| g.rnd()).collect();
    let mut bad = 0;
    for _ in 0..depth {
        let mut nxt = Vec::with_capacity(level.len() / 3);
        for t in level.chunks_exact(3) {
            let (a, b, c) = (t[0], t[1], t[2]);
            let arms = arms_int(a, b, c);
            if arms.iter().sum::<i64>() != 0 {
                bad += 1;
            }
            nxt.push(a + b + c);
        }
        level = nxt;
    }
    (bad, level[0])
}

/// compose.py:57-77 `free_centre_int`: triples whose arms moved when every level is shifted.
pub fn free_centre_int(depth: u32, shift: i64) -> u64 {
    let mut g = Lcg(SEED);
    let base: Vec<i64> = (0..3usize.pow(depth)).map(|_| g.rnd()).collect();
    let mut moved = 0;
    let mut lvl_a = base.clone();
    let mut lvl_b: Vec<i64> = base.iter().map(|x| x + shift).collect();
    for _ in 0..depth {
        let mut na = Vec::with_capacity(lvl_a.len() / 3);
        let mut nb = Vec::with_capacity(lvl_a.len() / 3);
        for (ta, tb) in lvl_a.chunks_exact(3).zip(lvl_b.chunks_exact(3)) {
            if arms_int(ta[0], ta[1], ta[2]) != arms_int(tb[0], tb[1], tb[2]) {
                moved += 1;
            }
            na.push(ta.iter().sum::<i64>());
            nb.push(tb.iter().sum::<i64>());
        }
        lvl_a = na;
        lvl_b = nb.iter().map(|x| x + shift).collect();
    }
    moved
}

/// compose.py:80-102 `free_centre_float`: (arms that moved, worst `|delta|`).
pub fn free_centre_float(depth: u32, shift: Binary64) -> (u64, Binary64) {
    let mut g = Lcg(SEED);
    // compose.py:85 `float(s % 2001 - 1000) + 0.1`
    let tenth = Binary64::from_ratio(false, 1, 10);
    let base: Vec<Binary64> = (0..3usize.pow(depth))
        .map(|_| Binary64::from_int(g.rnd()) + tenth)
        .collect();
    let mut moved = 0;
    let mut worst = Binary64::zero(false);
    let mut lvl_a = base.clone();
    let mut lvl_b: Vec<Binary64> = base.iter().map(|&x| x + shift).collect();
    for _ in 0..depth {
        let mut na = Vec::with_capacity(lvl_a.len() / 3);
        let mut nb = Vec::with_capacity(lvl_a.len() / 3);
        for (ta, tb) in lvl_a.chunks_exact(3).zip(lvl_b.chunks_exact(3)) {
            let arms_a = arms_float(ta[0], ta[1], ta[2]);
            let arms_b = arms_float(tb[0], tb[1], tb[2]);
            for (x, y) in arms_a.iter().zip(arms_b.iter()) {
                let d = (*x - *y).abs();
                if !d.is_zero() {
                    moved += 1;
                    // `max(worst, d)` keeps `worst` unless `d > worst`
                    if d.gt_nonneg(worst) {
                        worst = d;
                    }
                }
            }
            na.push(py_sum(ta));
            nb.push(py_sum(tb));
        }
        lvl_a = na;
        lvl_b = nb.iter().map(|&x| x + shift).collect();
    }
    (moved, worst)
}

/// compose.py:131-143: the residual carried exactly down one path of `depth` levels.
pub fn single_path_exact(depth: u32) -> Wide {
    let w = Wide::from_i64;
    let (mut a, mut b, mut c) = (w(11), w(-4), w(93));
    let mut resid = Wide::ZERO;
    for _ in 0..depth {
        let arms = arms_wide(a, b, c);
        resid = resid + (arms[0] + arms[1] + arms[2]);
        let t = w(7919);
        (a, b, c) = (a + t, b + t, c + t);
        let arms2 = arms_wide(a, b, c);
        resid = resid + ((arms2[0] - arms[0]) + (arms2[1] - arms[1]) + (arms2[2] - arms[2]));
        (a, b, c) = (arms2[0] + w(1), arms2[1] + w(2), arms2[2] + w(3));
    }
    resid
}

/// compose.py:145-155: the same path in binary64.
pub fn single_path_float(depth: u32) -> Binary64 {
    let lit = |neg: bool, tenths: u128| Binary64::from_ratio(neg, tenths, 10);
    // 11.1, -4.1, 93.1 (compose.py:146); `-4.1` is the negation of the literal 4.1
    let (mut a, mut b, mut c) = (lit(false, 111), -lit(false, 41), lit(false, 931));
    let mut resid = Binary64::zero(false);
    for _ in 0..depth {
        let arms = arms_float(a, b, c);
        resid = resid + py_sum(&arms);
        let t = Binary64::from_int(7919);
        (a, b, c) = (a + t, b + t, c + t);
        let arms2 = arms_float(a, b, c);
        let deltas = [arms2[0] - arms[0], arms2[1] - arms[1], arms2[2] - arms[2]];
        resid = resid + py_sum(&deltas);
        let i = Binary64::from_int;
        (a, b, c) = (arms2[0] + i(1), arms2[1] + i(2), arms2[2] + i(3));
    }
    resid
}

/// Everything compose.py prints, byte for byte.
pub fn stdout() -> String {
    let mut o = String::new();
    let w = &mut o;
    let line = |w: &mut String, text: &str| {
        w.push_str(text);
        w.push('\n');
    };
    line(w, "COMPOSE|does the closure survive nesting|json=0");
    line(w, "");
    line(w, "=== 1. closure at every level, exact integers ===");
    line(w, " depth   leaves        levels_checked   sum_ne_zero");
    for d in 1..=MAXD_FULL {
        let (bad, _root) = nest_int(d);
        writeln!(w, "  {d:<6} {:<13} {d:<16} {bad}", 3u64.pow(d)).expect("write to String");
    }
    line(w, "");
    line(
        w,
        "=== 2. THE DECISIVE TEST: is the centre still free at depth? ===",
    );
    line(w, "   shift the centre at EVERY level; arms must not move.");
    line(w, "");
    line(w, " depth   arithmetic   arm_changes   worst_|delta|");
    for d in [1, 3, 6, 9, 12] {
        let m = free_centre_int(d, 7919);
        writeln!(w, "  {d:<6} {:<12} {m:<13} 0 exactly", "int").expect("write to String");
    }
    for d in [1, 3, 6, 9, 12] {
        let (m, worst) = free_centre_float(d, Binary64::from_int(7919));
        writeln!(w, "  {d:<6} {:<12} {m:<13} {}", "float64", worst.fmt_exp(6))
            .expect("write to String");
    }
    line(w, "");
    line(
        w,
        "=== 3. depth 27 and 81 \u{2014} single path, exact rationals ===",
    );
    line(
        w,
        "   full enumeration is impossible (3^27 = 7.6e12 leaves), so we walk one",
    );
    line(
        w,
        "   path to the requested depth and carry the residual exactly.",
    );
    line(w, "");
    line(w, " depth   arithmetic   residual_at_root");
    for d in DEPTHS {
        let resid = single_path_exact(d);
        writeln!(w, "  {d:<6} {:<12} {resid}", "exact").expect("write to String");
    }
    for d in DEPTHS {
        let resid = single_path_float(d);
        writeln!(w, "  {d:<6} {:<12} {}", "float64", resid.fmt_exp(6)).expect("write to String");
    }
    o
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn integer_lanes_hold_at_every_depth() {
        for d in 1..=9 {
            assert_eq!(nest_int(d).0, 0);
        }
        for d in [1, 3, 6, 9] {
            assert_eq!(free_centre_int(d, 7919), 0);
        }
        for d in DEPTHS {
            assert!(single_path_exact(d).is_zero());
        }
    }
}
