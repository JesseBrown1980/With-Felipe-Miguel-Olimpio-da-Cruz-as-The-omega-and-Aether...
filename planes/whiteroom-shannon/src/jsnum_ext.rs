//! Two JavaScript number operations the planes use that `l0_edge::jsnum::Dbl` does not provide,
//! written over its public API, so the binary64 values stay the ones `Dbl` computes.
//! (`toFixed(6)` comes from `quant_cubes::whiteroom::to_fixed6`.)

use l0_edge::jsnum::Dbl;

const FRAC_MASK: u64 = (1 << 52) - 1;
const Q24_ONE: u64 = 1 << 24;

/// JavaScript `Math.ceil(x)`; `x` below 2^64.
pub fn ceil(x: Dbl) -> u64 {
    let bits = x.to_bits();
    if bits == 0 {
        return 0;
    }
    let mant = (bits & FRAC_MASK) | (1 << 52);
    let exp = (bits >> 52) as i32 - 1075;
    if exp >= 0 {
        assert!(
            exp <= 11,
            "Math.ceil of a value at or above 2^64 is outside the domain"
        );
        return mant << exp;
    }
    let k = exp.unsigned_abs();
    if k > 53 {
        return 1;
    }
    let whole = mant >> k;
    if mant & ((1u64 << k) - 1) == 0 {
        whole
    } else {
        whole + 1
    }
}

/// A Q24 score `q / 2^24` (0..=2^24) as the binary64 value it equals exactly.
pub fn q24_to_dbl(q: i64) -> Dbl {
    let q = u64::try_from(q.clamp(0, Q24_ONE as i64)).unwrap_or(0);
    Dbl::from_ratio(q, Q24_ONE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ceil_matches_javascript() {
        assert_eq!(ceil(Dbl::ZERO), 0);
        assert_eq!(ceil(Dbl::from_ratio(1, 3)), 1);
        assert_eq!(ceil(Dbl::from_u64(7)), 7);
        assert_eq!(ceil(Dbl::from_ratio(7, 2)), 4);
        assert_eq!(ceil(Dbl::from_ratio(1, 1 << 60)), 1);
        assert_eq!(ceil(Dbl::from_u64(1 << 60)), 1 << 60);
    }

    #[test]
    fn q24_values_are_exact() {
        assert_eq!(q24_to_dbl(1 << 24), Dbl::from_u64(1));
        assert_eq!(q24_to_dbl(1 << 23), Dbl::from_ratio(1, 2));
        assert_eq!(q24_to_dbl(0), Dbl::ZERO);
    }
}
