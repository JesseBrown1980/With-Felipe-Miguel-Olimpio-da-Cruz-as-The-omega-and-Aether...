//! The four colours ("flashlights") of universe simulator @3f9f42d and their composition:
//!
//! - `measurements/pump_glyphs_mythos.py:74-88`: the P (percentile), R (rank) and G (glyph-rank)
//!   look-up tables, `uint8` after `np.clip(..., 0, 255)`; `:112-116` composes them into a glyph
//!   word; `:142-156` emits one glyph's cube.
//! - `measurements/asolaria_herself.py:56-83`: the same colours turned into bijections by
//!   `as_perm`; `:95-99,135-137` compose them, RPR on every channel.
//!
//! The arithmetic is numpy `float64` element-wise arithmetic and `np.percentile` (numpy 2.x
//! `_lerp`), reproduced bit for bit with [`B64`]. The D (gradiated) table, `:91-104`, sums a
//! Gaussian kernel from numpy's `exp` through `np.convolve`, whose summation order is set by the
//! BLAS dot kernel; its values are produced by the vendored Python in the cold lane only. Its
//! bijection is ported through its order (see [`perm_d`]).

use crate::binary64::B64;
use crate::gguf;
use core::ops::{Add, Div, Mul, Sub};

/// A 256-entry look-up table.
pub type Lut = [u8; 256];

/// The colour names, in the order the glyph words use them (`pump_glyphs_mythos.py:107`).
pub const COLOURS: [char; 4] = ['P', 'R', 'G', 'D'];

fn histogram(v: &[u8]) -> [u64; 256] {
    let mut h = [0u64; 256];
    for &x in v {
        h[usize::from(x)] += 1;
    }
    h
}

/// `float(np.percentile(v, q))` for `q = units / 10^digits` with numpy 2.x's `linear` method:
/// `virtual = (n-1) * (q/100)`, `gamma = virtual - floor(virtual)`, then `_lerp(a, b, gamma)` =
/// `a + (b-a)*gamma`, or `b - (b-a)*(1-gamma)` when `gamma >= 0.5`.
pub fn percentile(v: &[u8], units: i64, digits: u32) -> B64 {
    assert!(!v.is_empty(), "percentile of an empty array");
    let mut sorted = v.to_vec();
    sorted.sort_unstable();
    let n = sorted.len() as i64;
    let q = B64::decimal(units, digits).div(B64::from_int(100));
    let virtual_index = B64::from_int(n - 1).mul(q);
    let (prev, next) = if virtual_index >= B64::from_int(n - 1) {
        (n - 1, n - 1)
    } else {
        let p = virtual_index.floor_int();
        (p, p + 1)
    };
    let previous_for_gamma = if virtual_index >= B64::from_int(n - 1) {
        -1
    } else {
        prev
    };
    let gamma = virtual_index.sub(B64::from_int(previous_for_gamma));
    let a = B64::from_int(i64::from(sorted[prev as usize]));
    let b = B64::from_int(i64::from(sorted[next as usize]));
    let diff = b.sub(a);
    if gamma >= B64::decimal(5, 1) {
        b.sub(diff.mul(B64::from_int(1).sub(gamma)))
    } else {
        a.add(diff.mul(gamma))
    }
}

fn clip_to_u8(x: B64) -> u8 {
    let x = if x < B64::ZERO {
        B64::ZERO
    } else if x > B64::from_int(255) {
        B64::from_int(255)
    } else {
        x
    };
    x.trunc_int() as u8
}

/// Python `max(x, floor)`: the first argument unless the second is greater.
fn py_max(x: B64, floor: B64) -> B64 {
    if floor > x {
        floor
    } else {
        x
    }
}

/// The P values before the cast (`pump_glyphs_mythos.py:75-76`, `asolaria_herself.py:57-58`):
/// `np.clip((np.arange(256.) - lo) / max(hi - lo, 1e-9) * 255, 0, 255)`.
pub fn values_p(v: &[u8]) -> [B64; 256] {
    let lo = percentile(v, 5, 1);
    let hi = percentile(v, 995, 1);
    let span = py_max(hi.sub(lo), B64::decimal(1, 9));
    core::array::from_fn(|i| {
        let x = B64::from_int(i as i64)
            .sub(lo)
            .div(span)
            .mul(B64::from_int(255));
        if x < B64::ZERO {
            B64::ZERO
        } else if x > B64::from_int(255) {
            B64::from_int(255)
        } else {
            x
        }
    })
}

/// `L_p` (`pump_glyphs_mythos.py:74-76`).
pub fn lut_p(v: &[u8]) -> Lut {
    values_p(v).map(clip_to_u8)
}

/// Twice the R values, `2 * (cumsum(h) - 0.5 * h)`, exact integers (`asolaria_herself.py:61-63`).
pub fn twice_values_r(v: &[u8]) -> [i64; 256] {
    let h = histogram(v);
    let mut cum = 0i64;
    core::array::from_fn(|i| {
        cum += h[i] as i64;
        2 * cum - h[i] as i64
    })
}

/// `L_r` (`pump_glyphs_mythos.py:79-82`).
pub fn lut_r(v: &[u8]) -> Lut {
    let twice = twice_values_r(v);
    let c = twice.map(|x| B64::from_ratio(i128::from(x), 2));
    let den = py_max(c[255], B64::decimal(1, 9));
    c.map(|x| clip_to_u8(x.div(den).mul(B64::from_int(255))))
}

/// The G values, `np.searchsorted(np.unique(v), np.arange(256))` (`asolaria_herself.py:66-68`).
pub fn values_g(v: &[u8]) -> [i64; 256] {
    let present = histogram(v).map(|c| c > 0);
    let mut below = 0i64;
    core::array::from_fn(|i| {
        let out = below;
        below += i64::from(present[i]);
        out
    })
}

/// `L_g` (`pump_glyphs_mythos.py:85-88`).
pub fn lut_g(v: &[u8]) -> Lut {
    let unique = histogram(v).iter().filter(|&&c| c > 0).count() as i128;
    let den = (unique - 1).max(1);
    values_g(v).map(|s| clip_to_u8(B64::from_ratio(i128::from(s), den).mul(B64::from_int(255))))
}

/// The P, R and G tables of one channel (the D table is not ported).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Luts {
    /// `L_p`.
    pub p: Lut,
    /// `L_r`.
    pub r: Lut,
    /// `L_g`.
    pub g: Lut,
}

impl Luts {
    /// The tables of channel values `v` (`pump_glyphs_mythos.py:108`).
    pub fn of(v: &[u8]) -> Luts {
        Luts {
            p: lut_p(v),
            r: lut_r(v),
            g: lut_g(v),
        }
    }

    fn get(&self, colour: char) -> Option<&Lut> {
        match colour {
            'P' => Some(&self.p),
            'R' => Some(&self.r),
            'G' => Some(&self.g),
            _ => None,
        }
    }
}

/// `glyph_lut` (`pump_glyphs_mythos.py:112-116`): the word's tables applied left to right;
/// `None` for a word containing D.
pub fn glyph_lut(luts: &Luts, word: &str) -> Option<Lut> {
    let mut o: Lut = core::array::from_fn(|i| i as u8);
    for ch in word.chars() {
        let t = luts.get(ch)?;
        o = o.map(|x| t[usize::from(x)]);
    }
    Some(o)
}

/// `words(level)` (`pump_glyphs_mythos.py:159-163`), in emission order.
pub fn words(level: u32) -> Vec<String> {
    let mut o = vec![String::new()];
    for _ in 0..level {
        o = o
            .iter()
            .flat_map(|x| COLOURS.iter().map(move |c| format!("{x}{c}")))
            .collect();
    }
    o
}

/// `emit` (`pump_glyphs_mythos.py:142-156`) for the MYTHOS being (`AX = 2`, `:59`): the 64-cube
/// counts after `c *= (c >= TAU)`, the voxels dropped by that step, and the owned triples. The
/// cube is `float32` upstream (`:150-153`), so a count stops at 2^24 ([`gguf::binary32_increment`]).
pub fn emit(tri: &[[u8; 3]], luts: &[Luts; 3], word: &str) -> Option<(Vec<u32>, u64, u64)> {
    const N: usize = 64;
    let tables: Vec<Lut> = luts
        .iter()
        .map(|l| glyph_lut(l, word))
        .collect::<Option<_>>()?;
    let mut c = vec![0u32; N * N * N];
    let mut owned = 0u64;
    for t in tri {
        let q: [u8; 3] = core::array::from_fn(|ci| tables[ci][usize::from(t[ci])] >> 2);
        if q[2] > q[0] && q[2] > q[1] {
            owned += 1;
            let v = &mut c[(usize::from(q[0]) * N + usize::from(q[1])) * N + usize::from(q[2])];
            *v = gguf::binary32_increment(*v);
        }
    }
    let pre = c.iter().filter(|&&x| x > 0).count() as u64;
    for x in &mut c {
        if *x < 2 {
            *x = 0;
        }
    }
    let post = c.iter().filter(|&&x| x > 0).count() as u64;
    Some((c, pre - post, owned))
}

/// A permutation of 0..=255.
pub type Perm = [u8; 256];

/// `as_perm` (`asolaria_herself.py:79-83`): `p[i]` is the rank of `i` ordered by
/// `(value, index)` (`np.lexsort((np.arange(256), x))`).
pub fn as_perm<K: Ord + Copy>(keys: &[K; 256]) -> Perm {
    let mut order: Vec<usize> = (0..256).collect();
    order.sort_by(|&a, &b| keys[a].cmp(&keys[b]).then(a.cmp(&b)));
    let mut p = [0u8; 256];
    for (rank, &i) in order.iter().enumerate() {
        p[i] = rank as u8;
    }
    p
}

/// The D bijection (`asolaria_herself.py:71-76,79-83`) through its order. With `h` the integer
/// histogram and `hs = h * k` (non-negative kernel, smallest weight about 9.6e-4), `cumsum(hs) -
/// 0.5 hs` never decreases in binary64 while the running sum stays below 2^41 (one unit there,
/// 2^-11, is below every positive `hs`), and equal values keep index order, so the rank of `i` is
/// `i`. Requires fewer than 2^41 triples.
pub fn perm_d(v: &[u8]) -> Perm {
    assert!(
        (v.len() as u64) < 1 << 41,
        "D order shown for fewer than 2^41 values"
    );
    core::array::from_fn(|i| i as u8)
}

/// The four bijections of one channel (`asolaria_herself.py:86-87`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Perms {
    /// P.
    pub p: Perm,
    /// R.
    pub r: Perm,
    /// G.
    pub g: Perm,
    /// D.
    pub d: Perm,
}

impl Perms {
    /// The bijections of channel values `v`.
    pub fn of(v: &[u8]) -> Perms {
        Perms {
            p: as_perm(&values_p(v)),
            r: as_perm(&twice_values_r(v)),
            g: as_perm(&values_g(v)),
            d: perm_d(v),
        }
    }

    fn get(&self, colour: char) -> &Perm {
        match colour {
            'P' => &self.p,
            'R' => &self.r,
            'G' => &self.g,
            _ => &self.d,
        }
    }
}

/// `glyph` (`asolaria_herself.py:95-99`): the word's bijections applied left to right.
pub fn glyph(perms: &Perms, word: &str) -> Perm {
    let mut o: Perm = core::array::from_fn(|i| i as u8);
    for ch in word.chars() {
        let t = perms.get(ch);
        o = o.map(|x| t[usize::from(x)]);
    }
    o
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentile_matches_numpy_examples() {
        // numpy: np.percentile(np.arange(10, dtype=np.uint8), 0.5) == 0.045,
        //        np.percentile(np.arange(10, dtype=np.uint8), 99.5) == 8.955.
        let v: Vec<u8> = (0..10).collect();
        assert_eq!(percentile(&v, 5, 1).to_bits(), 0x3fa70a3d70a3d70a);
        assert_eq!(percentile(&v, 995, 1).to_bits(), 0x4021e8f5c28f5c29);
        assert_eq!(percentile(&[7], 995, 1), B64::from_int(7));
    }

    #[test]
    fn rank_table_of_uniform_bytes() {
        let v: Vec<u8> = (0..=255).collect();
        let r = lut_r(&v);
        assert_eq!(r[0], 0);
        assert_eq!(r[255], 255);
        let g = lut_g(&v);
        assert_eq!(g, core::array::from_fn(|i| i as u8));
    }

    #[test]
    fn words_and_composition() {
        assert_eq!(words(1), vec!["P", "R", "G", "D"]);
        assert_eq!(words(4).len(), 256);
        assert_eq!(words(4)[0], "PPPP");
        let v: Vec<u8> = b"ASOLARIA colour".to_vec();
        let luts = Luts::of(&v);
        assert!(glyph_lut(&luts, "RPD").is_none());
        let rpr = glyph_lut(&luts, "RPR").unwrap();
        assert_eq!(
            rpr[65],
            luts.r[usize::from(luts.p[usize::from(luts.r[65])])]
        );
    }

    #[test]
    fn emitted_counts_stop_at_two_to_the_24() {
        // numpy running pump_glyphs_mythos.py:142-156: 2^24 + 3 owned triples on one voxel give
        // c == 16777216.0 there; `owned` is the int64 sum, 2^24 + 3.
        let luts = [Luts::of(&[0]), Luts::of(&[0]), Luts::of(&[0, 255])];
        let tri = vec![[0, 0, 255]; (1 << 24) + 3];
        let (cube, dropped, owned) = emit(&tri, &luts, "G").unwrap();
        assert_eq!(cube[63], 1 << 24);
        assert_eq!((dropped, owned), (0, (1 << 24) + 3));
    }

    #[test]
    fn as_perm_breaks_ties_by_index() {
        let mut keys = [0i64; 256];
        keys[3] = -1;
        let p = as_perm(&keys);
        assert_eq!(p[3], 0);
        assert_eq!(p[0], 1);
        assert_eq!(p[255], 255);
    }
}
