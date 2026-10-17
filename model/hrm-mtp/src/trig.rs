//! `Math.round(offset + scale * Math.sin(x))` and the `Math.cos` form, as integers.
//!
//! ECMAScript leaves `Math.sin` and `Math.cos` implementation-approximated (V8 builds either
//! fdlibm or glibc's routine, ieee754.cc:1351,2447), so their last bits differ between engines;
//! the upstream expressions only pass them through `Math.round`. Here sin/cos of the exact double
//! argument are evaluated in Q112 (error below 2^-96), and the rounded integer is returned only
//! when the exact value lies at least 2^-40 from a rounding tie, with `|scale| <= 48` and, when the
//! sine or cosine is not zero, `|offset| < 2^10`. Every engine whose sine and cosine are within
//! 2^-46 of the true values then returns the same integer: the engine error moves the argument by
//! at most 48 * 2^-46 = 3 * 2^-42, the binary64 product `scale * sin` rounds by at most 2^-48 and
//! the binary64 sum `offset + scale * sin` (below 2^11) by at most 2^-43, together below 2^-40.
//! A zero sine is exact in every engine (`Math.sin(+0)` is `+0`), so any `offset` is exact then.

use crate::sf64::Sf64;

const FRAC: u32 = 112;
/// floor(pi/2 * 2^112).
pub const HALF_PI_Q112: u128 = 0x1_921f_b544_42d1_8469_898c_c517_01b8;
/// Required distance between the exact value and a tie, in Q112 units (2^-40).
const MARGIN_MIN: u128 = 1 << (FRAC - 40);
/// Largest `|scale|` the 2^-40 margin covers.
pub const SCALE_MAX: u64 = 48;
/// `|offset|` must lie below this bound when the sine or cosine is not zero.
pub const OFFSET_LIMIT: u64 = 1 << 10;

/// The rounded integer could depend on the engine's last bits: the exact value lies within
/// 2^-40 of a tie, or `scale` / `offset` lie outside the bounds the 2^-40 margin covers.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NearTie;

/// A rounded result and its distance from the nearest tie, in units of 2^-112.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rounded {
    /// `Math.round` of the expression.
    pub value: i64,
    /// Distance of the exact expression from the nearest half-integer, in units of 2^-112.
    pub margin: u128,
}

/// High 256-bit product shifted right by `FRAC`.
fn mul_q(a: u128, b: u128) -> u128 {
    let (a_hi, a_lo) = (a >> 64, a & u128::from(u64::MAX));
    let (b_hi, b_lo) = (b >> 64, b & u128::from(u64::MAX));
    let lo_lo = a_lo * b_lo;
    let mid = a_hi * b_lo + a_lo * b_hi + (lo_lo >> 64);
    let hi = a_hi * b_hi + (mid >> 64);
    let low = ((mid & u128::from(u64::MAX)) << 64) | (lo_lo & u128::from(u64::MAX));
    // Product = hi * 2^128 + low; shift right by 112.
    assert!(hi < 1 << FRAC, "product outside the Q112 range");
    (hi << (128 - FRAC)) | (low >> FRAC)
}

/// `(sin x, cos x)` in Q112 for `0 <= x < 2^14`.
fn sin_cos_q112(x: Sf64) -> (i128, i128) {
    let one = 1i128 << FRAC;
    if x.is_zero() {
        return (0, one);
    }
    let (neg, mant, exp) = x.to_parts();
    assert!(!neg, "argument is non-negative");
    let shift = exp + FRAC as i32;
    assert!(shift <= 73, "argument below 2^14");
    let fixed = if shift >= 0 {
        u128::from(mant) << shift
    } else {
        u128::from(mant) >> shift.unsigned_abs().min(127)
    };
    assert!(fixed < 1 << (FRAC + 14), "argument below 2^14");
    let quadrant = fixed / HALF_PI_Q112;
    let r = fixed - quadrant * HALF_PI_Q112;
    let r2 = mul_q(r, r);
    // sin r = r - r^3/3! + ..., cos r = 1 - r^2/2! + ...; terms shrink below 2^-112 by n = 40.
    let (mut sin, mut cos) = (r as i128, one);
    let (mut sin_term, mut cos_term) = (r, 1u128 << FRAC);
    let mut n = 1u128;
    while sin_term != 0 || cos_term != 0 {
        cos_term = mul_q(cos_term, r2) / ((2 * n - 1) * (2 * n));
        sin_term = mul_q(sin_term, r2) / ((2 * n) * (2 * n + 1));
        if n % 2 == 1 {
            cos -= cos_term as i128;
            sin -= sin_term as i128;
        } else {
            cos += cos_term as i128;
            sin += sin_term as i128;
        }
        n += 1;
    }
    match quadrant % 4 {
        0 => (sin, cos),
        1 => (cos, -sin),
        2 => (-sin, -cos),
        _ => (-cos, sin),
    }
}

/// `Math.round` of `offset + scale * t` for an exact Q112 value `t`. `offset` is an integer, so
/// the result is `offset + Math.round(scale * t)` and `offset * 2^112` is never formed.
fn round_q112(offset: i64, scale: i64, t: i128) -> Result<Rounded, NearTie> {
    if scale.unsigned_abs() > SCALE_MAX || (t != 0 && offset.unsigned_abs() >= OFFSET_LIMIT) {
        return Err(NearTie);
    }
    let one = 1i128 << FRAC;
    let shifted = i128::from(scale) * t + (one >> 1);
    let rounded = shifted.div_euclid(one);
    let frac = shifted.rem_euclid(one) as u128;
    let margin = frac.min((1u128 << FRAC) - frac);
    if margin < MARGIN_MIN {
        return Err(NearTie);
    }
    // |rounded| <= |scale| + 1 <= 49, and it is 0 whenever t == 0 (where |offset| is unbounded).
    Ok(Rounded {
        value: offset + rounded as i64,
        margin,
    })
}

/// `Math.round(offset + scale * Math.sin(x))` for `0 <= x < 2^14`.
pub fn round_sin(offset: i64, scale: i64, x: Sf64) -> Result<Rounded, NearTie> {
    round_q112(offset, scale, sin_cos_q112(x).0)
}

/// `Math.round(offset + scale * Math.cos(x))` for `0 <= x < 2^14`.
pub fn round_cos(offset: i64, scale: i64, x: Sf64) -> Result<Rounded, NearTie> {
    round_q112(offset, scale, sin_cos_q112(x).1)
}
