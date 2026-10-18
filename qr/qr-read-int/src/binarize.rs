//! `binarize(data, width, height, returnInverted)` (index.html:534-624).
//!
//! jsQR keeps grey values and black points in `Uint8ClampedArray`s, so every value it stores is
//! rounded to the nearest integer with ties to even and clamped to 0..=255; this module does
//! that in integers ([`clamp_round`]). Its `Matrix.get` (index.html:526-528) reads the flat
//! index `y * width + x` with no bounds check: past the end it reads `undefined`, which makes
//! a block's sum, minimum and maximum `NaN` (stored as 0), makes a threshold `NaN` and makes
//! `lum <= threshold` false. An `x` past the right edge reads the next row. All of that is
//! reproduced here, with `None` standing for `undefined`/`NaN`.

use crate::bit_matrix::BitMatrix;

/// `REGION_SIZE` (index.html:515).
const REGION_SIZE: usize = 8;

/// `MIN_DYNAMIC_RANGE` (index.html:516).
const MIN_DYNAMIC_RANGE: u32 = 24;

/// `ToUint8Clamp(num / den)` for `num >= 0`, `den > 0`: nearest integer, ties to even, at most
/// 255.
fn clamp_round(num: u32, den: u32) -> u8 {
    let q = num / den;
    let r2 = 2 * (num % den);
    let v = if r2 > den || (r2 == den && q % 2 == 1) {
        q + 1
    } else {
        q
    };
    u8::try_from(v).unwrap_or(u8::MAX)
}

/// `numBetween(value, min, max)` (index.html:517-519), on signed values.
fn num_between(value: i64, min: i64, max: i64) -> i64 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

/// A flat-index read of a `width`-wide matrix: `None` where jsQR reads `undefined`.
fn flat_get(data: &[u8], width: usize, x: i64, y: i64) -> Option<u8> {
    let w = i64::try_from(width).ok()?;
    let i = usize::try_from(y.checked_mul(w)?.checked_add(x)?).ok()?;
    data.get(i).copied()
}

/// The binarised and inverted matrices for one grey plane (`returnInverted` true, as
/// `inversionAttempts: "attemptBoth"` asks at index.html:494-496).
pub fn binarize(grey: &[u8], width: usize, height: usize) -> (BitMatrix, BitMatrix) {
    let h_count = width.div_ceil(REGION_SIZE);
    let v_count = height.div_ceil(REGION_SIZE);
    let mut black_points = vec![0u8; h_count * v_count];
    let bp = |bps: &[u8], x: usize, y: usize| u32::from(bps[y * h_count + x]);
    let region = |r: usize| i64::try_from(r * REGION_SIZE).unwrap_or(i64::MAX);
    let step = |k: usize| i64::try_from(k).unwrap_or(i64::MAX);

    for vr in 0..v_count {
        for hr in 0..h_count {
            // index.html:561-569: sum, min and max over the 8x8 block, NaN past the end.
            let mut sum = 0u32;
            let mut min = u32::MAX;
            let mut max = 0u32;
            let mut nan = false;
            for y in 0..REGION_SIZE {
                for x in 0..REGION_SIZE {
                    match flat_get(grey, width, region(hr) + step(x), region(vr) + step(y)) {
                        Some(l) => {
                            let l = u32::from(l);
                            sum += l;
                            min = min.min(l);
                            max = max.max(l);
                        }
                        None => nan = true,
                    }
                }
            }
            let stored = if nan {
                0
            } else if max - min <= MIN_DYNAMIC_RANGE {
                // index.html:571-590: half the minimum, or the neighbours' weighted black
                // point when the minimum is below it.
                let mut value = clamp_round(min, 2);
                if vr > 0 && hr > 0 {
                    let nb = bp(&black_points, hr, vr - 1)
                        + 2 * bp(&black_points, hr - 1, vr)
                        + bp(&black_points, hr - 1, vr - 1);
                    if 4 * min < nb {
                        value = clamp_round(nb, 4);
                    }
                }
                value
            } else {
                // index.html:570: average = sum / 64.
                clamp_round(sum, 64)
            };
            black_points[vr * h_count + hr] = stored;
        }
    }

    let mut binarized = BitMatrix::create_empty(width, height);
    let mut inverted = BitMatrix::create_empty(width, height);
    let hc = step(h_count);
    let vc = step(v_count);
    for vr in 0..v_count {
        for hr in 0..h_count {
            // index.html:600-607: the 5x5 average of black points around the clamped centre.
            let left = num_between(step(hr), 2, hc - 3);
            let top = num_between(step(vr), 2, vc - 3);
            let mut sum = Some(0u32);
            for xr in -2..=2i64 {
                for yr in -2..=2i64 {
                    let v = flat_get(&black_points, h_count, left + xr, top + yr);
                    sum = sum.zip(v).map(|(s, v)| s + u32::from(v));
                }
            }
            // index.html:608-617: lum <= sum / 25, written at the flat index.
            for xr in 0..REGION_SIZE {
                for yr in 0..REGION_SIZE {
                    let x = region(hr) + step(xr);
                    let y = region(vr) + step(yr);
                    let dark = match (flat_get(grey, width, x, y), sum) {
                        (Some(lum), Some(s)) => 25 * u32::from(lum) <= s,
                        _ => false,
                    };
                    binarized.set(x, y, dark);
                    inverted.set(x, y, !dark);
                }
            }
        }
    }
    (binarized, inverted)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_rounds_ties_to_even() {
        assert_eq!(clamp_round(1, 2), 0);
        assert_eq!(clamp_round(3, 2), 2);
        assert_eq!(clamp_round(5, 2), 2);
        assert_eq!(clamp_round(32, 64), 0);
        assert_eq!(clamp_round(96, 64), 2);
        assert_eq!(clamp_round(97, 64), 2);
        assert_eq!(clamp_round(255 * 64, 64), 255);
        assert_eq!(clamp_round(6, 4), 2);
        assert_eq!(clamp_round(7, 4), 2);
    }
}
