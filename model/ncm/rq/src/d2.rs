//! D2: a ternary multiscale schedule on the 27-cube, and refute target 4.
//!
//! Two integer down/up pairs are implemented and measured:
//!
//! - [`down_sum`] / [`up_repeat`] — ACER's 1/3/9/27 proposal: block sums of three on the way down
//!   (addition only, no division, the remainder never dropped to a mean), repeat on the way up. It
//!   is measured to be exact only on the degenerate all-zero input.
//! - [`lift3`] / [`unlift3`] — an integer S-transform lifting step for a block of three: the coarse
//!   value is the floor-mean of the block and the two details are adjacent differences. It is
//!   exactly invertible for every integer triple, and [`lift_27`] stacks it to a full exact
//!   down/up pair on the 27-cube whose coarse level is the block-mean signal.
//!
//! Target 4 asks whether an integer down/up pair can be exact **and** non-trivial (coarse levels
//! informative) without learning. The lifting pair is both: exact round trip and a coarse level
//! equal to the block means. That is signal structure, not learned meaning — see this crate's
//! `README.md`, which records ACER's 2026-10-08 rung-law caveat.

use crate::rng::Rng;

/// Block-sum down by a factor of three. `v.len()` must be a multiple of 3.
pub fn down_sum(v: &[i64]) -> Vec<i64> {
    v.chunks(3).map(|c| c.iter().sum::<i64>()).collect()
}

/// Repeat each value three times (up by a factor of three).
pub fn up_repeat(v: &[i64]) -> Vec<i64> {
    let mut out = Vec::with_capacity(v.len() * 3);
    for &x in v {
        out.push(x);
        out.push(x);
        out.push(x);
    }
    out
}

/// Aggregated result of the sum-down / repeat-up run over a set of equal-length inputs.
#[derive(Clone, Debug)]
pub struct SumRepeatReport {
    /// Number of down steps (log base 3 of the input length).
    pub levels: usize,
    /// Inputs tested.
    pub tested: u64,
    /// Count where the finest operator round-trips exactly: `up_repeat(down_sum(v)) == v`.
    pub roundtrip_exact_finest: u64,
    /// Count where reconstructing from the single coarsest scalar returns `v`.
    pub full_pyramid_exact: u64,
    /// Per level, the minimum element of the residual `finer - up_repeat(down_sum(finer))`.
    pub per_level_min: Vec<i64>,
    /// Per level, the maximum element of that residual.
    pub per_level_max: Vec<i64>,
    /// Per level, the count of inputs where that operator reproduces the finer block sums exactly.
    pub per_level_exact: Vec<u64>,
}

impl SumRepeatReport {
    fn new(levels: usize) -> Self {
        SumRepeatReport {
            levels,
            tested: 0,
            roundtrip_exact_finest: 0,
            full_pyramid_exact: 0,
            per_level_min: vec![i64::MAX; levels],
            per_level_max: vec![i64::MIN; levels],
            per_level_exact: vec![0; levels],
        }
    }

    fn accumulate(&mut self, v: &[i64]) {
        self.tested += 1;
        let mut finer = v.to_vec();
        let mut level = 0;
        let mut finest_exact = true;
        while finer.len() >= 3 {
            let coarse = down_sum(&finer);
            let reconstructed = up_repeat(&coarse);
            let mut exact = true;
            for (&a, &b) in finer.iter().zip(reconstructed.iter()) {
                let residual = a - b;
                if residual != 0 {
                    exact = false;
                }
                if residual < self.per_level_min[level] {
                    self.per_level_min[level] = residual;
                }
                if residual > self.per_level_max[level] {
                    self.per_level_max[level] = residual;
                }
            }
            if exact {
                self.per_level_exact[level] += 1;
            }
            if level == 0 {
                finest_exact = exact;
            }
            finer = coarse;
            level += 1;
        }
        if finest_exact {
            self.roundtrip_exact_finest += 1;
        }
        let mut reconstruction = finer; // the coarsest scalar
        while reconstruction.len() < v.len() {
            reconstruction = up_repeat(&reconstruction);
        }
        if reconstruction == v {
            self.full_pyramid_exact += 1;
        }
    }
}

/// Run sum-down / repeat-up over every vector in `{-1, 0, +1}^9` (the 1/3/9 sub-schedule).
pub fn run_sum_repeat_exhaustive_9() -> SumRepeatReport {
    let mut report = SumRepeatReport::new(2);
    let mut v = [0i64; 9];
    let total = 3i64.pow(9);
    for index in 0..total {
        let mut t = index;
        for slot in v.iter_mut() {
            *slot = t.rem_euclid(3) - 1;
            t = t.div_euclid(3);
        }
        report.accumulate(&v);
    }
    report
}

/// Run sum-down / repeat-up over `count` seeded random length-27 vectors with entries in `lo..=hi`.
pub fn run_sum_repeat_random_27(count: u64, seed: u64, lo: i64, hi: i64) -> SumRepeatReport {
    let mut report = SumRepeatReport::new(3);
    let mut rng = Rng::new(seed);
    let mut v = [0i64; 27];
    for _ in 0..count {
        for slot in v.iter_mut() {
            *slot = rng.int_in(lo, hi);
        }
        report.accumulate(&v);
    }
    report
}

// ---------------------------------------------------------------- integer lifting (target 4)

/// Forward integer S-transform lifting of a block of three. The coarse value is the floor-mean of
/// the block; the two details are adjacent differences.
pub fn lift3(a: i64, b: i64, c: i64) -> (i64, i64, i64) {
    let coarse = (a + b + c).div_euclid(3);
    let detail1 = b - a;
    let detail2 = c - b;
    (coarse, detail1, detail2)
}

/// Exact inverse of [`lift3`] for every integer input.
pub fn unlift3(coarse: i64, detail1: i64, detail2: i64) -> (i64, i64, i64) {
    let a = coarse - (2 * detail1 + detail2).div_euclid(3);
    let b = a + detail1;
    let c = b + detail2;
    (a, b, c)
}

/// The floor-mean of a block of three: the informative coarse value of [`lift3`].
pub fn floor_mean3(a: i64, b: i64, c: i64) -> i64 {
    (a + b + c).div_euclid(3)
}

/// A full lifting of the 27-cube: one coarse scalar and 26 details (18 at level 1, 6 at level 2,
/// 2 at level 3).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Lift27 {
    pub coarse: i64,
    pub details: [i64; 26],
}

/// The nine level-1 coarse values of the 27-cube: the floor-mean of each block of three. This is
/// the informative coarse level that target 4 asks for.
pub fn coarse_level_9(v: &[i64; 27]) -> [i64; 9] {
    let mut coarse = [0i64; 9];
    for (i, slot) in coarse.iter_mut().enumerate() {
        *slot = floor_mean3(v[3 * i], v[3 * i + 1], v[3 * i + 2]);
    }
    coarse
}

/// Forward lifting of the whole 27-cube.
pub fn lift_27(v: &[i64; 27]) -> Lift27 {
    let mut details = [0i64; 26];
    let mut c9 = [0i64; 9];
    for i in 0..9 {
        let (c, d1, d2) = lift3(v[3 * i], v[3 * i + 1], v[3 * i + 2]);
        c9[i] = c;
        details[2 * i] = d1;
        details[2 * i + 1] = d2;
    }
    let mut c3 = [0i64; 3];
    for i in 0..3 {
        let (c, d1, d2) = lift3(c9[3 * i], c9[3 * i + 1], c9[3 * i + 2]);
        c3[i] = c;
        details[18 + 2 * i] = d1;
        details[18 + 2 * i + 1] = d2;
    }
    let (coarse, d1, d2) = lift3(c3[0], c3[1], c3[2]);
    details[24] = d1;
    details[25] = d2;
    Lift27 { coarse, details }
}

/// Exact inverse of [`lift_27`].
pub fn unlift_27(t: &Lift27) -> [i64; 27] {
    let (c30, c31, c32) = unlift3(t.coarse, t.details[24], t.details[25]);
    let c3 = [c30, c31, c32];
    let mut c9 = [0i64; 9];
    for i in 0..3 {
        let (a, b, c) = unlift3(c3[i], t.details[18 + 2 * i], t.details[18 + 2 * i + 1]);
        c9[3 * i] = a;
        c9[3 * i + 1] = b;
        c9[3 * i + 2] = c;
    }
    let mut v = [0i64; 27];
    for i in 0..9 {
        let (a, b, c) = unlift3(c9[i], t.details[2 * i], t.details[2 * i + 1]);
        v[3 * i] = a;
        v[3 * i + 1] = b;
        v[3 * i + 2] = c;
    }
    v
}

/// Result of the exhaustive single-block lifting run.
#[derive(Clone, Debug)]
pub struct Lift3Report {
    /// Triples tested.
    pub tested: u64,
    /// Count where `unlift3(lift3(..))` returns the input triple.
    pub roundtrip_exact: u64,
    /// Count where the coarse value equals the floor-mean of the block (expected: all).
    pub coarse_is_floor_mean: u64,
    /// Count where the coarse value equals the exact mean (block sum divisible by 3).
    pub coarse_is_exact_mean: u64,
}

/// Run `lift3` / `unlift3` over every triple in `[lo, hi]^3`.
pub fn run_lift3_exhaustive(lo: i64, hi: i64) -> Lift3Report {
    let mut report = Lift3Report {
        tested: 0,
        roundtrip_exact: 0,
        coarse_is_floor_mean: 0,
        coarse_is_exact_mean: 0,
    };
    for a in lo..=hi {
        for b in lo..=hi {
            for c in lo..=hi {
                let (coarse, d1, d2) = lift3(a, b, c);
                report.tested += 1;
                if unlift3(coarse, d1, d2) == (a, b, c) {
                    report.roundtrip_exact += 1;
                }
                if coarse == floor_mean3(a, b, c) {
                    report.coarse_is_floor_mean += 1;
                }
                if (a + b + c).rem_euclid(3) == 0 {
                    report.coarse_is_exact_mean += 1;
                }
            }
        }
    }
    report
}

/// Result of the random 27-cube lifting run.
#[derive(Clone, Debug)]
pub struct Lift27Report {
    /// Vectors tested.
    pub tested: u64,
    /// Count where `unlift_27(lift_27(v)) == v`.
    pub roundtrip_exact: u64,
    /// Count where the level-1 coarse values equal the block floor-means (expected: all).
    pub coarse_level_is_block_means: u64,
}

/// Run `lift_27` / `unlift_27` over `count` seeded random vectors with entries in `lo..=hi`.
pub fn run_lift27_random(count: u64, seed: u64, lo: i64, hi: i64) -> Lift27Report {
    let mut report = Lift27Report {
        tested: 0,
        roundtrip_exact: 0,
        coarse_level_is_block_means: 0,
    };
    let mut rng = Rng::new(seed);
    let mut v = [0i64; 27];
    for _ in 0..count {
        for slot in v.iter_mut() {
            *slot = rng.int_in(lo, hi);
        }
        let lifted = lift_27(&v);
        report.tested += 1;
        if unlift_27(&lifted) == v {
            report.roundtrip_exact += 1;
        }
        // The level-1 coarse values are details-free; recompute them two ways and compare.
        let means = coarse_level_9(&v);
        let mut c9 = [0i64; 9];
        for i in 0..9 {
            c9[i] = lift3(v[3 * i], v[3 * i + 1], v[3 * i + 2]).0;
        }
        if means == c9 {
            report.coarse_level_is_block_means += 1;
        }
    }
    report
}
