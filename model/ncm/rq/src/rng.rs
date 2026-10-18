//! A seeded integer-only xorshift64 generator, so the random D2 runs are reproducible and carry
//! no floating point.

/// xorshift64. The seed must be nonzero; [`Rng::new`] enforces it.
pub struct Rng(u64);

impl Rng {
    /// A generator seeded from `seed`, or from a fixed nonzero constant when `seed` is 0.
    pub fn new(seed: u64) -> Self {
        Rng(if seed == 0 {
            0x9E37_79B9_7F4A_7C15
        } else {
            seed
        })
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }

    /// A uniform integer in `lo..=hi`. Requires `lo <= hi`.
    pub fn int_in(&mut self, lo: i64, hi: i64) -> i64 {
        let span = (hi - lo + 1) as u64;
        lo + (self.next_u64() % span) as i64
    }
}
