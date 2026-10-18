//! D1: balanced ternary is the exact-integer case of residual quantization.
//!
//! Greedy coarse-to-fine residual quantization in one dimension, level `k` from `K-1` down to `0`,
//! with the balanced codebook `{-3^k, 0, +3^k}` and a nearest-code choice. For an integer `x` with
//! `|x| <= (3^K - 1)/2` the chosen indices are the balanced-ternary trits of `x` and the final
//! residual is 0.
//!
//! # Trit order and sign convention
//!
//! A trit is the kernel's [`Zero`] (`Neg = -1`, `Nil = 0`, `Pos = +1`); [`Zero::direction`] returns
//! the signed index and `Zero::from_digit(index + 1)` builds it, exactly as `kernel/tribit`
//! packs. The index chosen at level `k` is the sign of the code `index * 3^k`. Trits are written
//! **most significant first**: slot 0 is the index of `3^(K-1)`, the coarsest level, matching
//! `TritWord::pack`'s order. [`balanced_ternary`] computes the same trits directly and
//! [`recon_msb`] is their left inverse.

use asolaria_tribit::Zero;

/// The largest `K` the exhaustive D1 run enumerates (`3^13 = 1_594_323`).
pub const MAX_K: usize = 13;

/// `3^0 .. 3^MAX_K` as integers, so no level ever calls `pow`.
pub const POW3: [i64; MAX_K + 1] = {
    let mut p = [1i64; MAX_K + 1];
    let mut k = 1;
    while k <= MAX_K {
        p[k] = p[k - 1] * 3;
        k += 1;
    }
    p
};

/// `(3^k - 1) / 2`, the balanced-ternary bound for `k` trits.
pub const fn bound(k: usize) -> i64 {
    (POW3[k] - 1) / 2
}

/// The nearest balanced code at level `k` for residual `r`: the index in `{-1, 0, +1}` and whether
/// the choice was a tie.
///
/// Codes are `{-p, 0, +p}` with `p = 3^k`. The decision compares `2r` against `+p` and `-p`, so it
/// is exact integer arithmetic with no division. A tie is `2|r| == p`; because `p` is odd and `2r`
/// is even it can never occur, and the deterministic choice on a (would-be) tie is the code `0`.
#[inline]
pub fn choose_balanced(r: i64, p: i64) -> (i64, bool) {
    let two_r = 2 * r;
    let tie = two_r == p || two_r == -p;
    let index = if two_r > p {
        1
    } else if two_r < -p {
        -1
    } else {
        0
    };
    (index, tie)
}

/// The outcome of quantizing one integer.
pub struct Quant {
    /// Final residual after level 0. Exactly 0 for in-range inputs.
    pub residual: i64,
    /// Number of ties encountered (always 0; see [`choose_balanced`]).
    pub ties: u32,
    /// Whether `|r| <= (3^(k+1) - 1)/2` held before every level `k` (refute target 2).
    pub invariant_held: bool,
}

/// Greedy coarse-to-fine residual quantization of `x` into `trits` (length `K`, MSB first) with the
/// balanced codebook. Returns the residual, the tie count, and whether the level-by-level invariant
/// held.
pub fn quantize(x: i64, trits: &mut [Zero]) -> Quant {
    let k_levels = trits.len();
    let mut r = x;
    let mut ties = 0u32;
    let mut invariant_held = true;
    for (slot, k) in (0..k_levels).rev().enumerate() {
        // Before level k the invariant claims |r| <= (3^(k+1) - 1)/2.
        let pre = bound(k + 1);
        if r > pre || r < -pre {
            invariant_held = false;
        }
        let p = POW3[k];
        let (index, tie) = choose_balanced(r, p);
        if tie {
            ties += 1;
        }
        trits[slot] = Zero::from_digit((index + 1) as u8);
        r -= index * p;
    }
    Quant {
        residual: r,
        ties,
        invariant_held,
    }
}

/// The balanced-ternary trits of `x` written into `trits` (length `K`, MSB first), using the kernel
/// sign convention. For `|x| <= (3^K - 1)/2` these are the full representation; a larger `|x|` keeps
/// only its low `K` trits.
pub fn balanced_ternary(x: i64, trits: &mut [Zero]) {
    let k_levels = trits.len();
    let mut n = x;
    for power in 0..k_levels {
        let mut r = n.rem_euclid(3);
        n = n.div_euclid(3);
        if r == 2 {
            r = -1;
            n += 1;
        }
        trits[k_levels - 1 - power] = Zero::from_digit((r + 1) as u8);
    }
}

/// Reconstruct the integer from MSB-first trits: the left inverse of [`quantize`] and
/// [`balanced_ternary`].
pub fn recon_msb(trits: &[Zero]) -> i64 {
    let mut acc = 0i64;
    for t in trits {
        acc = acc * 3 + t.direction() as i64;
    }
    acc
}

/// Greedy nearest-code quantization with the **uncentred** codebook `{0, 1*3^k, 2*3^k}`, level `k`
/// from `K-1` down to `0`. Digits are written into `digits` (length `K`, MSB first); the final
/// residual is returned. This is the control for D1 failure mode (a): without centring, greedy
/// nearest-code is not digit extraction.
pub fn quantize_uncentred(x: i64, digits: &mut [u8]) -> i64 {
    let k_levels = digits.len();
    let mut r = x;
    for (slot, k) in (0..k_levels).rev().enumerate() {
        let p = POW3[k];
        // Nearest of {0, p, 2p}: midpoints p/2 and 3p/2, compared as 2r vs p and 3p.
        let two_r = 2 * r;
        let d: i64 = if two_r < p {
            0
        } else if two_r < 3 * p {
            1
        } else {
            2
        };
        digits[slot] = d as u8;
        r -= d * p;
    }
    r
}

/// Plain base-3 digit extraction of a non-negative `x` into `digits` (length `K`, MSB first), digits
/// in `{0, 1, 2}`. This is what greedy uncentred quantization is compared against.
pub fn base3_digits(x: i64, digits: &mut [u8]) {
    let k_levels = digits.len();
    let mut n = x;
    for power in 0..k_levels {
        digits[k_levels - 1 - power] = n.rem_euclid(3) as u8;
        n = n.div_euclid(3);
    }
}

/// Aggregated result of the centred greedy run over every in-range `x` for one `K`.
#[derive(Clone, Debug)]
pub struct D1Report {
    pub k: usize,
    /// Values enumerated, `3^K`.
    pub tested: u64,
    /// Count with final residual exactly 0.
    pub residual_zero: u64,
    /// Count where the greedy indices equal the balanced-ternary trits.
    pub trits_match: u64,
    /// Total ties over all levels and inputs.
    pub ties: u64,
    /// Count where the invariant held before every level (refute target 2).
    pub invariant_held: u64,
    /// Count where `recon_msb` of the greedy trits returns `x`. Equal to `tested` proves the map is
    /// injective, hence a bijection onto `{-1,0,+1}^K`, so all `3^K` codewords are distinct.
    pub recon_ok: u64,
}

/// Run centred greedy quantization over every integer in `[-(3^K - 1)/2, (3^K - 1)/2]`.
pub fn run_d1(k: usize) -> D1Report {
    let hi = bound(k);
    let mut trits = vec![Zero::Nil; k];
    let mut bt = vec![Zero::Nil; k];
    let mut rep = D1Report {
        k,
        tested: 0,
        residual_zero: 0,
        trits_match: 0,
        ties: 0,
        invariant_held: 0,
        recon_ok: 0,
    };
    let mut x = -hi;
    while x <= hi {
        let q = quantize(x, &mut trits);
        balanced_ternary(x, &mut bt);
        rep.tested += 1;
        if q.residual == 0 {
            rep.residual_zero += 1;
        }
        if trits == bt {
            rep.trits_match += 1;
        }
        rep.ties += u64::from(q.ties);
        if q.invariant_held {
            rep.invariant_held += 1;
        }
        if recon_msb(&trits) == x {
            rep.recon_ok += 1;
        }
        x += 1;
    }
    rep
}

/// Result of the just-out-of-range run.
#[derive(Clone, Debug)]
pub struct OutOfRangeReport {
    pub k: usize,
    /// Values tested on each side of the range.
    pub band: u64,
    /// Values tested in total (both sides).
    pub tested: u64,
    /// Count with nonzero final residual (expected: all of them).
    pub nonzero_residual: u64,
}

/// Run greedy quantization on `band` values just above `(3^K - 1)/2` and `band` values just below
/// `-(3^K - 1)/2`. The first value on each side is `±((3^K - 1)/2 + 1)`.
pub fn run_out_of_range(k: usize, band: u64) -> OutOfRangeReport {
    let hi = bound(k);
    let mut trits = vec![Zero::Nil; k];
    let mut nonzero_residual = 0u64;
    let mut tested = 0u64;
    for step in 1..=band as i64 {
        for &x in &[hi + step, -(hi + step)] {
            let q = quantize(x, &mut trits);
            tested += 1;
            if q.residual != 0 {
                nonzero_residual += 1;
            }
        }
    }
    OutOfRangeReport {
        k,
        band,
        tested,
        nonzero_residual,
    }
}

/// Result of the uncentred control run over `[0, 3^K - 1]`.
#[derive(Clone, Debug)]
pub struct UncentredReport {
    pub k: usize,
    /// Values enumerated, `3^K`.
    pub tested: u64,
    /// Count where greedy uncentred digits differ from base-3 digit extraction.
    pub digit_disagreements: u64,
    /// Count where greedy uncentred quantization leaves a nonzero residual.
    pub nonzero_residual: u64,
}

/// Run uncentred greedy nearest-code over `[0, 3^K - 1]` and compare with base-3 digit extraction.
pub fn run_uncentred(k: usize) -> UncentredReport {
    let n = POW3[k];
    let mut greedy = vec![0u8; k];
    let mut base = vec![0u8; k];
    let mut digit_disagreements = 0u64;
    let mut nonzero_residual = 0u64;
    let mut x = 0i64;
    while x < n {
        let residual = quantize_uncentred(x, &mut greedy);
        base3_digits(x, &mut base);
        if greedy != base {
            digit_disagreements += 1;
        }
        if residual != 0 {
            nonzero_residual += 1;
        }
        x += 1;
    }
    UncentredReport {
        k,
        tested: n as u64,
        digit_disagreements,
        nonzero_residual,
    }
}
