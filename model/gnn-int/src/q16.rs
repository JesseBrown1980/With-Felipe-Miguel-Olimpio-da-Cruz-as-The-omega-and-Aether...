//! Q16 fixed point: an `i32` where `ONE = 65536` represents 1.0.
//!
//! Rounding everywhere in this crate is **round half away from zero**
//! (`0.5 -> 1`, `-0.5 -> -1`, `2.5 -> 3`). Results outside `i32` saturate.

/// Number of fractional bits.
pub const FRAC_BITS: u32 = 16;

/// 1.0 in Q16.
pub const ONE: i32 = 1 << FRAC_BITS;

/// Clamps a wide integer into `i32`.
pub fn saturate(x: i128) -> i32 {
    x.clamp(i128::from(i32::MIN), i128::from(i32::MAX)) as i32
}

/// Divides `x` by `2^shift` (`shift` in `1..=126`), rounding half away from zero.
pub(crate) fn round_shift_wide(x: i128, shift: u32) -> i128 {
    let shift = shift.clamp(1, 126);
    let half = 1i128 << (shift - 1);
    if x >= 0 {
        x.saturating_add(half) >> shift
    } else {
        -(x.saturating_neg().saturating_add(half) >> shift)
    }
}

/// Rescales a Q32 value (e.g. a sum of Q16 x Q16 products) to Q16, rounding then saturating.
pub fn rescale(x: i128) -> i32 {
    saturate(round_shift_wide(x, FRAC_BITS))
}

/// Q16 multiply: exact `i64` product, one rounding, saturating.
pub fn mul(a: i32, b: i32) -> i32 {
    rescale(i128::from(i64::from(a) * i64::from(b)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounding_is_half_away_from_zero() {
        assert_eq!(rescale(32768), 1);
        assert_eq!(rescale(-32768), -1);
        assert_eq!(rescale(32767), 0);
        assert_eq!(rescale(-32767), 0);
        assert_eq!(rescale(98304), 2); // 1.5 -> 2
        assert_eq!(rescale(163840), 3); // 2.5 -> 3 (half-even would give 2)
        assert_eq!(rescale(-163840), -3);
        assert_eq!(rescale(0), 0);
    }

    #[test]
    fn mul_basic_and_saturating() {
        assert_eq!(mul(ONE, ONE), ONE);
        assert_eq!(mul(ONE / 2, ONE / 2), ONE / 4);
        assert_eq!(mul(-ONE, 3 * ONE), -3 * ONE);
        assert_eq!(mul(1, 32768), 1); // 2^-16 * 0.5 = 2^-17 rounds away to 2^-16
        assert_eq!(mul(i32::MAX, i32::MAX), i32::MAX);
        assert_eq!(mul(i32::MIN, i32::MAX), i32::MIN);
        assert_eq!(mul(i32::MIN, i32::MIN), i32::MAX);
    }

    #[test]
    fn extremes_do_not_panic() {
        assert_eq!(rescale(i128::MAX), i32::MAX);
        assert_eq!(rescale(i128::MIN), i32::MIN);
    }
}
