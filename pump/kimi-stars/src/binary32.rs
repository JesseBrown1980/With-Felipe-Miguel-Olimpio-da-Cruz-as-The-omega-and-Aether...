//! IEEE-754 binary32 bit patterns of non-negative integers, rounded to nearest, ties to even, as
//! numpy writes them for `astype(np.float32)` of an integer-valued `int64` or `float64` array.

/// The binary32 bit pattern nearest the integer `n` (ties to even).
///
/// Below 2^24 the value is exact. `n` must be below 2^53, where an integer-valued `float64`
/// holds `n` exactly, so a single rounding to binary32 gives the same pattern numpy writes.
pub fn bits_of(n: u64) -> u32 {
    assert!(n < 1 << 53, "integer outside the exact float64 range");
    if n == 0 {
        return 0;
    }
    let len = 64 - n.leading_zeros();
    let (mut mant, mut exp) = if len <= 24 {
        (n << (24 - len), len - 1)
    } else {
        let shift = len - 24;
        let kept = n >> shift;
        let rest = n & ((1u64 << shift) - 1);
        let half = 1u64 << (shift - 1);
        let up = rest > half || (rest == half && kept & 1 == 1);
        (kept + u64::from(up), len - 1)
    };
    if mant == 1 << 24 {
        mant >>= 1;
        exp += 1;
    }
    ((exp + 127) << 23) | (mant as u32 & 0x7f_ffff)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_integers_match_numpy() {
        // numpy: np.float32(1).view(np.uint32) == 0x3f800000; 255 -> 0x437f0000;
        // 951846 -> 0x49686260; 2**24 - 1 -> 0x4b7fffff.
        assert_eq!(bits_of(0), 0);
        assert_eq!(bits_of(1), 0x3f80_0000);
        assert_eq!(bits_of(255), 0x437f_0000);
        assert_eq!(bits_of(951_846), 0x4968_6260);
        assert_eq!(bits_of((1 << 24) - 1), 0x4b7f_ffff);
    }

    #[test]
    fn rounding_is_to_nearest_even() {
        // numpy: np.array([2**24 + 1, 2**24 + 3, 2**25 + 2, 2**25 + 6], np.int64).astype(np.float32)
        // gives 16777216, 16777220, 33554432, 33554440.
        assert_eq!(bits_of((1 << 24) + 1), bits_of(1 << 24));
        assert_eq!(bits_of((1 << 24) + 3), bits_of((1 << 24) + 4));
        assert_eq!(bits_of((1 << 25) + 2), bits_of(1 << 25));
        assert_eq!(bits_of((1 << 25) + 6), bits_of((1 << 25) + 8));
        // Rounding up across a power of two: 2**25 - 1 rounds to 2**25.
        assert_eq!(bits_of((1 << 25) - 1), 0x4c00_0000);
    }

    #[test]
    fn agrees_with_the_colour_crate_below_two_to_the_24() {
        for n in [1u64, 2, 3, 7, 4301, 65_535, 1_000_080, (1 << 24) - 1] {
            assert_eq!(bits_of(n), colour::gguf::binary32_bits(n));
        }
    }
}
