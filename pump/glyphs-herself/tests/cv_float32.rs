//! `cv_of` and the float32 cube sum against the owner's own `cv_of` (asolaria_herself.py:113-122
//! and pump_glyphs_mythos.py:130-139, run unchanged by the referee) on 48 seeded cubes: values
//! 2..maxval at splitmix64 positions, maxval up to 2^24 so masked sums pass 2^24.
mod common;

use common::{hbp_rows, SplitMix64};
use pump_glyphs_herself::cv::{cube_sum_f32, cv_of, group_of};
use pump_glyphs_herself::softfloat::isqrt_u64;

fn groups() -> Vec<u16> {
    let sk = |d: i64| (d.signum() + 1) as u8;
    let mut g = Vec::with_capacity(64 * 64 * 64);
    for i in 0..64i64 {
        for j in 0..64i64 {
            for k in 0..64i64 {
                let (dx, dy, dz) = (i - 32, j - 32, k - 32);
                let radial = isqrt_u64((dx * dx + dy * dy + dz * dz) as u64);
                g.push(group_of(radial, sk(dx) * 9 + sk(dy) * 3 + sk(dz)));
            }
        }
    }
    g
}

#[test]
fn cv_of_matches_owner_float32() {
    let g = groups();
    let rows = hbp_rows("cv_cases.hbp", "CVCASE");
    assert_eq!(rows.len(), 48);
    for row in rows {
        let num = |k: &str| row[k].parse::<u64>().unwrap();
        let (seed, nnz, maxval) = (num("seed"), num("nnz"), num("maxval"));
        let mut r = SplitMix64(seed * 1_000_003 + nnz * 7 + maxval);
        let mut cube = vec![0u32; 64 * 64 * 64];
        for _ in 0..nnz {
            let idx = (r.next() % (64 * 64 * 64)) as usize;
            cube[idx] = (2 + r.next() % (maxval - 1)) as u32;
        }
        let cv = cv_of(&cube, &g);
        let (bits, six) = match cv {
            Some(d) => {
                let u = d.round_decimal_units(6);
                (
                    format!("{:08x}", d.to_f32_bits()),
                    format!("{}.{:06}", u / 1_000_000, u % 1_000_000),
                )
            }
            None => ("nan".to_string(), "nan".to_string()),
        };
        let case = format!("seed={seed} nnz={nnz} maxval={maxval}");
        assert_eq!(bits, row["cv_bits"], "cv bits, {case}");
        assert_eq!(six, row["cv6"], "cv .6f, {case}");
        let csum = format!("{:08x}", cube_sum_f32(&cube).to_f32_bits());
        assert_eq!(csum, row["csum_bits"], "c.sum(), {case}");
    }
}
