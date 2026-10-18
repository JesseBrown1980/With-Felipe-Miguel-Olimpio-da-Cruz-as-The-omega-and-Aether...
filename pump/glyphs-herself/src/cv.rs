//! `cv_of` as both generators define it (`asolaria_herself.py:113-122`,
//! `pump_glyphs_mythos.py:130-139`, the same lines), with numpy's float32 semantics:
//! the cube `c` is float32, so each masked `.sum()` is a float32 pairwise sum, `per` is a
//! float32 array, and `per.std()`, `per.mean()` and `np.median(o)` stay float32.
//! The result is that float32 value (held as a `Dbl`); `None` is the generator's `float("nan")`.

use crate::softfloat::{absdiff32, add32, div32, mul32, round_f32_int, sqrt32, Dbl};

const N3: usize = 64 * 64 * 64;
/// Directions `k != 13` in `DIRS` order (`[k for k in range(27) if k != 13]`).
const NDIR: usize = 26;
/// Bands `r` in `range(2, 30)`: `MASKS[r-2] = (RR >= r) & (RR < r + 1)`.
const NBAND: usize = 28;
/// Voxel outside every `(band, direction)` mask.
pub const NO_GROUP: u16 = u16::MAX;
const F32_EXACT: u64 = 1 << 24;

/// The `(band, direction)` mask a voxel belongs to, from its radial bin `isqrt(dx²+dy²+dz²)`
/// (equal to `floor(RR)` with `RR` the float32 sqrt; `referee/dump_vectors.py` compares the two,
/// with every `MASKS` band and `KEY`, voxel by voxel) and its
/// 27-direction key `KEY = (sx+1)*9 + (sy+1)*3 + (sz+1)`.
pub fn group_of(radial: u64, key: u8) -> u16 {
    if !(2..30).contains(&radial) || key == 13 {
        return NO_GROUP;
    }
    let d = if key < 13 { key } else { key - 1 } as u16;
    (radial as u16 - 2) * NDIR as u16 + d
}

/// numpy's pairwise summation (`pairwise_sum`, `numpy/_core/src/umath/loops_utils.h.src`,
/// block 128, 8 accumulators) carried out in float32 on float32 values.
pub fn pairwise_sum_f32(a: &[Dbl]) -> Dbl {
    let n = a.len();
    if n < 8 {
        let mut res = Dbl::ZERO;
        for &x in a {
            res = add32(res, x);
        }
        return res;
    }
    if n <= 128 {
        let mut r = [Dbl::ZERO; 8];
        r[..8].copy_from_slice(&a[..8]);
        let mut i = 8;
        while i < n - (n % 8) {
            for j in 0..8 {
                r[j] = add32(r[j], a[i + j]);
            }
            i += 8;
        }
        let mut res = add32(
            add32(add32(r[0], r[1]), add32(r[2], r[3])),
            add32(add32(r[4], r[5]), add32(r[6], r[7])),
        );
        while i < n {
            res = add32(res, a[i]);
            i += 1;
        }
        return res;
    }
    let mut n2 = n / 2;
    n2 -= n2 % 8;
    add32(pairwise_sum_f32(&a[..n2]), pairwise_sum_f32(&a[n2..]))
}

// A float32 `.sum()` of integer counts: while the exact integer total is below 2^24 every partial
// sum is an exactly representable integer, so the float32 sum is the exact total; otherwise the
// float32 pairwise sum is reproduced over the elements in C order.

/// float32 `c.sum()` over the whole C-contiguous 64^3 cube (`pump_glyphs_mythos.py:197`). numpy
/// 2.5.4 reduces the contiguous cube as one pairwise sum over all 262,144 elements (measured:
/// 12 of 12 integer cubes with totals 26,338,977..20,978,446,596 match that order; summing in
/// 8,192- or 4,096-element chunks matches 4 and 3 of them).
pub fn cube_sum_f32(cube: &[u32]) -> Dbl {
    let exact: u64 = cube.iter().map(|&x| u64::from(x)).sum();
    if exact < F32_EXACT {
        return Dbl::from_u64(exact);
    }
    let vals: Vec<Dbl> = cube.iter().map(|&x| Dbl::from_u64(u64::from(x))).collect();
    pairwise_sum_f32(&vals)
}

/// The generator's `cv_of(c)`; `group[v]` is `group_of` for voxel `v`.
pub fn cv_of(cube: &[u32], group: &[u16]) -> Option<Dbl> {
    let mut exact = [0u64; NBAND * NDIR];
    for v in 0..N3 {
        let g = group[v];
        if g != NO_GROUP {
            exact[g as usize] += u64::from(cube[v]);
        }
    }
    // `c[m & (KEY == k)]` in C order, gathered only when some masked sum reaches 2^24
    let mut masked: Vec<Vec<Dbl>> = Vec::new();
    if exact.iter().any(|&s| s >= F32_EXACT) {
        masked = vec![Vec::new(); NBAND * NDIR];
        for v in 0..N3 {
            let g = group[v];
            if g != NO_GROUP {
                masked[g as usize].push(Dbl::from_u64(u64::from(cube[v])));
            }
        }
    }
    let mut o: Vec<Dbl> = Vec::new();
    for band in 0..NBAND {
        // `if c[m].sum() <= 0: continue` (a float32 sum of non-negative values is > 0 iff any is)
        let row = &exact[band * NDIR..(band + 1) * NDIR];
        if row.iter().all(|&s| s == 0) {
            continue;
        }
        // per = [c[m & (KEY == k)].sum() for k in DIRS]; per = per[per > 0]
        let mut per: Vec<Dbl> = Vec::new();
        for (d, &s) in row.iter().enumerate() {
            if s == 0 {
                continue;
            }
            per.push(if s < F32_EXACT {
                Dbl::from_u64(s)
            } else {
                pairwise_sum_f32(&masked[band * NDIR + d])
            });
        }
        if per.len() >= 4 {
            o.push(coeff_var_f32(&per));
        }
    }
    if o.is_empty() {
        None
    } else {
        Some(median_f32(&o))
    }
}

/// `per.std() / per.mean()` in float32 (numpy `_methods._var`, `_std`, `_mean`): the mean is the
/// float32 pairwise sum divided by the count and rounded to float32; the variance is the float32
/// pairwise sum of float32 squared deviations divided by the count; std is its float32 sqrt.
fn coeff_var_f32(per: &[Dbl]) -> Dbl {
    let n = Dbl::from_u64(per.len() as u64);
    let mean = div32(pairwise_sum_f32(per), n);
    let sq: Vec<Dbl> = per
        .iter()
        .map(|&x| {
            let d = absdiff32(x, mean);
            mul32(d, d)
        })
        .collect();
    let var = div32(pairwise_sum_f32(&sq), n);
    div32(sqrt32(var), mean)
}

/// `np.median(o)` on a float32 array: the middle value, or the float32 mean of the two middle
/// values (`np.mean` of a 2-element float32 slice: float32 sum, then divided by 2).
fn median_f32(vals: &[Dbl]) -> Dbl {
    let mut v = vals.to_vec();
    v.sort();
    let n = v.len();
    if n % 2 == 1 {
        v[n / 2]
    } else {
        div32(add32(v[n / 2 - 1], v[n / 2]), Dbl::from_u64(2))
    }
}

/// One voxel's count after `np.add.at(c, idx, np.float32(1.))`: each add is a float32 add, so a
/// voxel stops increasing at 2^24 (2^24 + 1 rounds to 2^24, ties to even).
pub fn add_one_f32(v: &mut u32) {
    if u64::from(*v) < F32_EXACT {
        *v += 1;
    }
}

/// float32 `acc + x` for integer-valued float32 operands (`composite += c`), as an integer.
pub fn add_f32_int(acc: u64, x: u64) -> u64 {
    round_f32_int(acc + x)
}
