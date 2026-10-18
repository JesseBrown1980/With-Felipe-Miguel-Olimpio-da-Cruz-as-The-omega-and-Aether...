//! The trijection law's statements that are integer counts, measured exhaustively, and the
//! restore / reconstruction round trips of the ports.

use ternary::balanced::{bal3, base3, low_trits, recon, I64_TRITS};
use ternary::cube::{self, Cell, CELLS};
use ternary::trijection::{third, trij};
use ternary::Zero;

/// splitmix64 (test inputs only).
fn splitmix(state: &mut u64) -> u64 {
    *state = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
    let mut z = *state;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

fn as_i64(u: u64) -> i64 {
    i64::from_ne_bytes(u.to_ne_bytes())
}

#[test]
fn the_tribit_unit_is_re_exported_not_copied() {
    // same type, same items: a value of one is a value of the other
    let z: asolaria_tribit::Zero = ternary::Zero::Pos;
    assert_eq!(z.rotate(), ternary::tribit::Zero::Neg);
    assert_eq!(ternary::P, asolaria_tribit::P);
    assert_eq!(ternary::TRITS_PER_U128, 80);
    let w: asolaria_tribit::TritWord = ternary::TritWord::pack(&[Zero::Pos, Zero::Neg]);
    assert_eq!(w.0, 2 * 3);
}

/// Law `:5` "`restore=OK` on every case (lossless bijection)", over every byte triple: the
/// domain of the law's measurement ("300,000 B/case", `:27`).
#[test]
fn restore_is_ok_on_every_byte_triple() {
    let mut ok = 0u64;
    let mut rems = [0u64; 3];
    for a in 0..=255i64 {
        for b in 0..=255i64 {
            for c in 0..=255i64 {
                let t = trij(a, b, c);
                if t.restore() == Some((a, b, c)) {
                    ok += 1;
                }
                rems[usize::from(t.rem)] += 1;
            }
        }
    }
    assert_eq!(ok, 16_777_216);
    assert_eq!(rems, [5_592_406, 5_592_405, 5_592_405]);
}

#[test]
fn restore_is_ok_on_a_signed_grid_and_seeded_i64_triples() {
    let mut ok = 0u64;
    for a in -40..=40i64 {
        for b in -40..=40i64 {
            for c in -40..=40i64 {
                let t = trij(a, b, c);
                assert!(t.rem <= 2);
                // the third point is free: rime_27fischers.py:92 gives it from a, b and the centre
                assert_eq!(third(a, b, t.c0, t.rem), Some(c));
                if t.restore() == Some((a, b, c)) {
                    ok += 1;
                }
            }
        }
    }
    assert_eq!(ok, 81 * 81 * 81);
    let edges = [i64::MIN, i64::MIN + 1, -1, 0, 1, i64::MAX - 1, i64::MAX];
    for a in edges {
        for b in edges {
            for c in edges {
                assert_eq!(trij(a, b, c).restore(), Some((a, b, c)));
            }
        }
    }
    let mut s = 7u64;
    for _ in 0..200_000 {
        let (a, b, c) = (
            as_i64(splitmix(&mut s)),
            as_i64(splitmix(&mut s)),
            as_i64(splitmix(&mut s)),
        );
        let t = trij(a, b, c);
        assert_eq!(t.restore(), Some((a, b, c)));
        assert_eq!(third(a, b, t.c0, t.rem), Some(c));
    }
}

#[test]
fn bal3_reconstructs_every_value_exhaustively_and_on_seeded_i64() {
    // (3^10 - 1) / 2 = 29524: every value ten trits hold, and one past each end
    for n in -29_525..=29_525i64 {
        let t = bal3(n);
        assert_eq!(recon(t.as_slice()), Some(n));
        // no leading zero trit except zero itself (reframe_check.py:24-25)
        let top = *t.as_slice().last().expect("never empty");
        assert_eq!(top == Zero::Nil, n == 0);
        // the sign is the sign of the most significant trit
        assert_eq!(i64::from(top.direction()), n.signum());
    }
    for n in [i64::MIN, i64::MIN + 1, i64::MAX, i64::MAX - 1] {
        let t = bal3(n);
        assert_eq!(recon(t.as_slice()), Some(n));
        assert_eq!(t.as_slice().len(), I64_TRITS);
    }
    let mut s = 11u64;
    for _ in 0..200_000 {
        let n = as_i64(splitmix(&mut s));
        assert_eq!(recon(bal3(n).as_slice()), Some(n));
    }
    assert_eq!(bal3(0).as_slice(), &[Zero::Nil]);
    // reframe_check.py:46 shows "n=1   2   base3 2   bal3 1T" (T = -1, most significant first)
    assert_eq!(bal3(2).as_slice(), &[Zero::Neg, Zero::Pos]);
}

#[test]
fn base3_digits_rebuild_the_value() {
    let mut s = 13u64;
    for i in 0..100_000u64 {
        let n = if i < 60_000 { i } else { splitmix(&mut s) };
        let d = base3(n);
        let mut acc: u128 = 0;
        for &x in d.as_slice().iter().rev() {
            assert!(x <= 2);
            acc = acc * 3 + u128::from(x);
        }
        assert_eq!(acc, u128::from(n));
    }
    assert_eq!(base3(u64::MAX).as_slice().len(), 41);
}

/// `low_trits` with `k` slots gives the first `k` trits of `bal3` (zero-padded), which is the
/// statement of trunk.py's docstring: "the first K balanced digits of v depend ONLY on v mod 3^K".
#[test]
fn low_trits_are_the_low_trits_of_bal3() {
    for k in 1..=6usize {
        let m: i64 = 3i64.pow(k as u32);
        for v in -2000..=2000i64 {
            let mut out = [Zero::Nil; 6];
            low_trits(v, &mut out[..k]);
            let full = bal3(v);
            for (i, t) in out[..k].iter().enumerate() {
                let want = full.as_slice().get(i).copied().unwrap_or(Zero::Nil);
                assert_eq!(*t, want, "v={v} k={k} trit {i}");
            }
            // the k trits hold v mod 3^k in balanced form
            let r = recon(&out[..k]).expect("small");
            assert_eq!((r - v).rem_euclid(m), 0);
            assert!(2 * r.abs() < m);
        }
    }
}

fn all_cells() -> Vec<Cell> {
    (0..CELLS).map(cube::cell).collect()
}

/// Law `:24-25`: "3 trits = 3³ = 27 = the cube: `1 center + 6 faces + 12 edges + 8 corners`".
#[test]
fn the_cube_is_one_centre_six_faces_twelve_edges_eight_corners() {
    let mut by_sep = [0u32; 4];
    for (i, c) in all_cells().into_iter().enumerate() {
        assert_eq!(usize::from(cube::index(c)), i);
        by_sep[usize::from(cube::separation(c))] += 1;
    }
    assert_eq!(by_sep, [1, 6, 12, 8]);
    // rime_27fischers.py:88-89: the free 0 centre is colour (0,0,0) = glyph 13
    assert_eq!(cube::index([Zero::Nil; 3]), 13);
}

/// Law `:131-139`: `N·N = id`, `R·R·R = id`, `R ≠ R⁻¹`; R fixes the main diagonal, orbit sizes
/// `{1:3, 3:8}`; the full group `{N,R,R²}` fixes only `(0,0,0)`.
#[test]
fn trianti_counts() {
    let cells = all_cells();
    let nn = cells
        .iter()
        .filter(|c| cube::negate(cube::negate(**c)) == **c)
        .count();
    let rrr = cells
        .iter()
        .filter(|c| cube::rotate(cube::rotate(cube::rotate(**c))) == **c)
        .count();
    let r_eq_r2 = cells
        .iter()
        .filter(|c| cube::rotate(**c) == cube::rotate(cube::rotate(**c)))
        .count();
    assert_eq!((nn, rrr), (27, 27));
    // R and R² agree only where R fixes the cell, so R ≠ R⁻¹ as maps
    assert_eq!(r_eq_r2, 3);
    let fixed_r: Vec<u8> = cells
        .iter()
        .filter(|c| cube::rotate(**c) == **c)
        .map(|c| cube::index(*c))
        .collect();
    let diagonal = [[Zero::Neg; 3], [Zero::Nil; 3], [Zero::Pos; 3]].map(cube::index);
    assert_eq!(fixed_r, diagonal.to_vec());
    // orbits of R: 3 of size 1 and 8 of size 3
    let mut seen = [false; 27];
    let mut sizes = [0u32; 4];
    for c in &cells {
        let i = usize::from(cube::index(*c));
        if seen[i] {
            continue;
        }
        let mut x = *c;
        let mut size = 0;
        loop {
            seen[usize::from(cube::index(x))] = true;
            size += 1;
            x = cube::rotate(x);
            if x == *c {
                break;
            }
        }
        sizes[size] += 1;
    }
    assert_eq!(sizes, [0, 3, 0, 8]);
    let fixed_all: Vec<Cell> = cells
        .iter()
        .copied()
        .filter(|c| cube::negate(*c) == *c && cube::rotate(*c) == *c)
        .collect();
    assert_eq!(fixed_all, vec![[Zero::Nil; 3]]);
}
