//! The byte-stream port of `trijection.py` (`trijection_forward` `:50-57`, `trijection_inverse`
//! `:59-64`), `to_balanced_ternary` (`:42-48`) and the zero-trit count of `measure()` (`:83-88`):
//! restore through the inverse, and the fixed-width conversion against `bal3` and the `rime_*` loop.

mod common;

use common::rows::seeded_bytes;
use ternary::balanced::{bal3, low_trits, recon, to_balanced_ternary};
use ternary::trijection::{trijection_forward, trijection_inverse, zero_trits, ZeroTrits};
use ternary::Zero;

fn round_trip(data: &[u8]) -> bool {
    let f = trijection_forward(data);
    assert_eq!(f.total_len % 3, 0);
    assert_eq!(f.total_len, data.len() + f.pad);
    assert!(f.pad <= 2);
    assert_eq!(f.c0.len() * 3, f.total_len);
    trijection_inverse(&f.c0, &f.sa, &f.sb, &f.rem, f.total_len, f.pad).as_deref() == Some(data)
}

/// Every byte triple, 256 buffers of 65,536 triples each, through forward and inverse.
#[test]
fn every_byte_triple_restores_through_the_stream_functions() {
    let (mut ok, mut rems) = (0u64, [0u64; 3]);
    let (mut lo, mut hi) = (0i16, 0i16);
    for a in 0..=255u8 {
        let data = common::rows::byte_triples_of(a);
        let f = trijection_forward(&data);
        assert_eq!((f.total_len, f.pad), (196_608, 0));
        for &r in &f.rem {
            rems[usize::from(r)] += 1;
        }
        for &x in f.sa.iter().chain(&f.sb) {
            lo = lo.min(x);
            hi = hi.max(x);
        }
        let back = trijection_inverse(&f.c0, &f.sa, &f.sb, &f.rem, f.total_len, f.pad)
            .expect("bytes restore");
        ok += data
            .chunks_exact(3)
            .zip(back.chunks_exact(3))
            .filter(|(x, y)| x == y)
            .count() as u64;
    }
    assert_eq!(ok, 16_777_216);
    assert_eq!(rems, [5_592_406, 5_592_405, 5_592_405]);
    // separations of three bytes span -170..=170 (a - c0 with a = 0, b = c = 255, and its mirror)
    assert_eq!((lo, hi), (-170, 170));
}

/// Every buffer of length 0, 1 and 2 (the two padded classes), and seeded buffers of every
/// length 3..=12.
#[test]
fn every_short_buffer_restores() {
    assert!(round_trip(&[]));
    for a in 0..=255u8 {
        assert!(round_trip(&[a]));
        for b in 0..=255u8 {
            assert!(round_trip(&[a, b]));
        }
    }
    for len in 3..=12usize {
        for k in 0..2_000u64 {
            assert!(round_trip(&seeded_bytes(
                50_000 + 10_000 * len as u64 + k,
                len
            )));
        }
    }
    let f = trijection_forward(&[7]);
    assert_eq!((f.total_len, f.pad), (3, 2));
    let f = trijection_forward(&[7, 8]);
    assert_eq!((f.total_len, f.pad), (3, 1));
}

#[test]
fn seeded_large_buffers_restore() {
    for (seed, n) in [
        (5u64, 299_999usize),
        (6, 300_000),
        (7, 300_001),
        (8, 1_000_000),
        (9, 1_048_577),
    ] {
        assert!(round_trip(&seeded_bytes(seed, n)), "seed {seed} len {n}");
    }
}

/// `trijection.py:61-64`: `zip` stops at the shortest stream, `bytes()` refuses a value outside
/// a byte, and the result is `out[:total_len - pad]` with Python's slice end.
#[test]
fn inverse_follows_zip_bytes_and_the_slice_end() {
    let (c0, sa, sb, rem) = ([10u8, 20], [1i16, -1], [0i16, 2], [0u8, 1]);
    let full = vec![11u8, 10, 9, 19, 22, 20];
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, 6, 0),
        Some(full.clone())
    );
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, 6, 2),
        Some(full[..4].to_vec())
    );
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, 9, 0),
        Some(full.clone())
    );
    // negative end: out[:-1], out[:-6], out[:-7]
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, 0, 1),
        Some(full[..5].to_vec())
    );
    assert_eq!(trijection_inverse(&c0, &sa, &sb, &rem, 0, 6), Some(vec![]));
    assert_eq!(trijection_inverse(&c0, &sa, &sb, &rem, 0, 7), Some(vec![]));
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, 0, usize::MAX),
        Some(vec![])
    );
    assert_eq!(
        trijection_inverse(&c0, &sa, &sb, &rem, usize::MAX, 0),
        Some(full.clone())
    );
    // zip stops at the shortest
    assert_eq!(
        trijection_inverse(&c0, &sa[..1], &sb, &rem, 6, 0),
        Some(full[..3].to_vec())
    );
    // a value outside 0..=255 is ValueError upstream
    assert_eq!(trijection_inverse(&[255], &[1], &[0], &[0], 3, 0), None);
    assert_eq!(trijection_inverse(&[0], &[1], &[0], &[0], 3, 0), None);
}

fn tbt(n: i64, digits: usize) -> Vec<Zero> {
    let mut v = vec![Zero::Nil; digits];
    to_balanced_ternary(n, &mut v);
    v
}

/// `to_balanced_ternary(n, d)` (fixed width, `trijection.py:42-48`) against `bal3(n)` (variable
/// width, `reframe_check.py:22-34`) and the 3-trit loop (`rime_27fischers.py:39-44`) on every
/// value ten balanced trits hold.
#[test]
fn to_balanced_ternary_against_bal3_and_the_rime_loop() {
    const R: i64 = 29_524;
    let mut counts = Vec::new();
    for d in 1..=10usize {
        let m = 3i64.pow(d as u32);
        let (mut list_eq, mut padded_eq, mut low_eq) = (0u64, 0u64, 0u64);
        for n in -R..=R {
            let t = tbt(n, d);
            let b = bal3(n);
            let b = b.as_slice();
            list_eq += u64::from(t[..] == *b);
            padded_eq += u64::from(
                b.len() <= d && t[..b.len()] == *b && t[b.len()..].iter().all(|z| *z == Zero::Nil),
            );
            low_eq += u64::from((0..d).all(|i| t[i] == b.get(i).copied().unwrap_or(Zero::Nil)));
            // the d trits are the balanced form of n mod 3^d
            let r = recon(&t).expect("small");
            assert_eq!((r - n).rem_euclid(m), 0);
            assert!(2 * r.abs() < m);
            // low_trits divides after the carry, to_balanced_ternary before: same trits
            let mut l = vec![Zero::Nil; d];
            low_trits(n, &mut l);
            assert_eq!(l, t, "n={n} d={d}");
        }
        counts.push((d, list_eq, padded_eq, low_eq));
    }
    // list-equal: bal3 has exactly d trits, (3^(d-1)-1)/2 < |n| <= (3^d-1)/2;
    // padded-equal: |n| <= (3^d-1)/2; low-equal: every value
    assert_eq!(counts[2], (3, 18, 27, 59_049));
    assert_eq!(counts[5], (6, 486, 729, 59_049));
    assert_eq!(counts[9], (10, 39_366, 59_049, 59_049));
    assert_eq!(tbt(0, 6), vec![Zero::Nil; 6]);
    assert_eq!(bal3(0).as_slice(), &[Zero::Nil]);
    // 365 = (3^6 - 1) / 2 + 1 keeps its low six trits: 365 - 729 = -364
    assert_eq!(recon(&tbt(365, 6)), Some(-364));
}

/// `trijection.py:84-87` on small inputs, as `zeros/trits`.
#[test]
fn zero_trit_counts() {
    let z = |sa: &[i16], sb: &[i16]| {
        let r = zero_trits(sa, sb);
        (r.zeros, r.trits)
    };
    assert_eq!(zero_trits(&[], &[]), ZeroTrits::default());
    assert_eq!(z(&[0], &[0]), (12, 12));
    // abs(1) = 1 -> [1,0,0,0,0,0]; abs(-1) the same
    assert_eq!(z(&[1], &[-1]), (10, 12));
    // 170 -> [-1,0,1,0,-1,1] (-1 + 9 - 81 + 243): 2 zeros
    assert_eq!(z(&[170], &[]), (2, 6));
    // 364 = (3^6 - 1) / 2 -> [1,1,1,1,1,1]
    assert_eq!(z(&[364], &[]), (0, 6));
    // abs(i16::MIN) = 32768 keeps its low six trits, as upstream's loop does
    let mut six = [Zero::Nil; 6];
    to_balanced_ternary(32_768, &mut six);
    let want = six.iter().filter(|t| **t == Zero::Nil).count() as u64;
    assert_eq!(z(&[i16::MIN], &[]), (want, 6));
}
