//! Base-2 logarithms of positive integers in Q64, summed with integer multiplicities, and the
//! decimal rendering of such sums divided by a count.

use std::collections::BTreeMap;

/// Fractional bits of [`log2_q64`].
pub const FRAC: u32 = 64;

/// `log2(m)` in Q64, truncated: the integer part from the bit length, then 64 fraction bits by
/// repeated squaring of `m / 2^floor(log2 m)` held in Q63. Below the exact value by less than
/// 2^-58; MEASURED against 192-bit fixed-point logarithms (tools/rime_referee.py `log2_fixed`) on
/// every `m` up to 2^20 and 200,000 LCG values below 2^44: never above `floor(2^64 log2 m)`, at
/// most 3 units of 2^-64 below it.
pub fn log2_q64(m: u64) -> u128 {
    assert!(m >= 1, "log2 of a positive integer");
    let int = 63 - m.leading_zeros();
    let mut y: u128 = (u128::from(m) << 63) >> int;
    let mut frac: u128 = 0;
    for bit in (0..FRAC).rev() {
        y = (y * y) >> 63;
        if y >= 1 << 64 {
            y >>= 1;
            frac |= 1 << bit;
        }
    }
    (u128::from(int) << FRAC) | frac
}

/// Integer multiplicities `c_v` of `log2(v)`: the sum `sum_v c_v * log2(v)`.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Log2Tally {
    dense: Vec<i64>,
    sparse: BTreeMap<u64, i64>,
}

/// Values below this bound are tallied in a dense table.
const DENSE: u64 = 1 << 22;

impl Log2Tally {
    /// An empty tally.
    pub fn new() -> Log2Tally {
        Log2Tally {
            dense: vec![0; DENSE as usize],
            sparse: BTreeMap::new(),
        }
    }

    /// Adds `coef * log2(v)`.
    pub fn add(&mut self, v: u64, coef: i64) {
        assert!(v >= 1, "log2 of a positive integer");
        if v < DENSE {
            self.dense[v as usize] += coef;
        } else {
            *self.sparse.entry(v).or_insert(0) += coef;
        }
    }

    /// Adds every multiplicity of `other`.
    pub fn absorb(&mut self, other: &Log2Tally) {
        for (v, &c) in other.dense.iter().enumerate() {
            if c != 0 {
                self.dense[v] += c;
            }
        }
        for (&v, &c) in &other.sparse {
            *self.sparse.entry(v).or_insert(0) += c;
        }
    }

    /// The multiplicities, ascending by value, zeros omitted.
    pub fn entries(&self) -> Vec<(u64, i64)> {
        let mut out: Vec<(u64, i64)> = self
            .dense
            .iter()
            .enumerate()
            .filter(|&(_, &c)| c != 0)
            .map(|(v, &c)| (v as u64, c))
            .collect();
        out.extend(
            self.sparse
                .iter()
                .filter(|&(_, &c)| c != 0)
                .map(|(&v, &c)| (v, c)),
        );
        out
    }

    /// `sum_v c_v * log2_q64(v)` (Q64) and `sum_v |c_v|`, which bounds its error in units of
    /// 2^-58.
    pub fn sum_q64(&self) -> (i128, u128) {
        let mut sum = 0i128;
        let mut weight = 0u128;
        for (v, c) in self.entries() {
            sum += i128::from(c) * log2_q64(v) as i128;
            weight += u128::from(c.unsigned_abs());
        }
        (sum, weight)
    }

    /// Resets every multiplicity to zero.
    pub fn clear(&mut self) {
        self.dense.iter_mut().for_each(|c| *c = 0);
        self.sparse.clear();
    }
}

/// `num / (den * 2^64)` in decimal with `digits` fraction digits, truncated, for `num >= 0`.
pub fn render_q64_ratio(num: i128, den: u64, digits: u32) -> String {
    assert!(num >= 0 && den > 0, "non-negative ratio");
    let num = num as u128;
    let d = u128::from(den) << FRAC;
    let int = num / d;
    let mut rem = num % d;
    let mut out = format!("{int}.");
    for _ in 0..digits {
        rem *= 10;
        out.push(char::from(b'0' + (rem / d) as u8));
        rem %= d;
    }
    out
}

/// `num / (den * 2^64)` rounded to `digits` decimals (half up), and the distance from the
/// nearest rounding boundary in units of `10^-(digits + 8)`.
pub fn round_q64_ratio(num: i128, den: u64, digits: u32) -> (String, u128) {
    assert!(num >= 0 && den > 0, "non-negative ratio");
    let extra = 8;
    let fine = render_q64_ratio(num, den, digits + extra);
    let (int_part, frac_part) = fine.split_once('.').expect("decimal point");
    let all: u128 = format!("{int_part}{frac_part}")
        .parse()
        .expect("decimal digits");
    let unit = 10u128.pow(extra);
    let below = all % unit;
    let half = unit / 2;
    let rounded = all / unit + u128::from(below >= half);
    let margin = below.abs_diff(half);
    let scale = 10u128.pow(digits);
    (
        format!(
            "{}.{:0width$}",
            rounded / scale,
            rounded % scale,
            width = digits as usize
        ),
        margin,
    )
}
