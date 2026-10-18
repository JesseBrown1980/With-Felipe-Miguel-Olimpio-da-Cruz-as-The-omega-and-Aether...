//! D2 counts: ACER's sum-down / repeat-up is exact only on the degenerate input, while the integer
//! lifting pair is exact and non-trivial (refute target 4).

use ncm_rq::d2;

#[test]
fn d2_sum_repeat_exhaustive_9_is_trivially_exact() {
    let e = d2::run_sum_repeat_exhaustive_9();
    assert_eq!(e.tested, 19_683, "all of {{-1,0,1}}^9");
    assert_eq!(
        e.roundtrip_exact_finest, 1,
        "only the all-zero vector round-trips"
    );
    assert_eq!(e.full_pyramid_exact, 1);
    assert_eq!(e.per_level_min, vec![-2, -6], "per-level residual minima");
    assert_eq!(e.per_level_max, vec![2, 6], "per-level residual maxima");
    assert_eq!(
        e.per_level_exact,
        vec![1, 343],
        "coarse reproduces the finer block sums: 1 vector at level 0, 7^3 at level 1"
    );
}

#[test]
fn d2_sum_repeat_random_27_is_not_exact() {
    let s = d2::run_sum_repeat_random_27(1_000_000, 0xA5A5_1234, -13, 13);
    assert_eq!(s.tested, 1_000_000);
    assert_eq!(s.roundtrip_exact_finest, 0, "no random vector round-trips");
    assert_eq!(s.full_pyramid_exact, 0);
    assert_eq!(s.per_level_min, vec![-26, -75, -151]);
    assert_eq!(s.per_level_max, vec![26, 77, 152]);
    assert_eq!(
        s.per_level_exact,
        vec![0, 0, 2],
        "the coarse levels almost never reproduce the block sums"
    );
}

#[test]
fn d2_lift3_exhaustive_is_exact_and_coarse_is_mean() {
    let l = d2::run_lift3_exhaustive(-13, 13);
    assert_eq!(l.tested, 19_683, "all of [-13,13]^3");
    assert_eq!(
        l.roundtrip_exact, 19_683,
        "target 4: exact for every integer triple"
    );
    assert_eq!(
        l.coarse_is_floor_mean, 19_683,
        "target 4: coarse is the block floor-mean"
    );
    assert_eq!(
        l.coarse_is_exact_mean, 6_561,
        "sum divisible by 3 in 1/3 of triples (3^8)"
    );
}

#[test]
fn d2_lift27_random_is_exact_and_nontrivial() {
    let l = d2::run_lift27_random(1_000_000, 0xBEEF_0027, -13, 13);
    assert_eq!(l.tested, 1_000_000);
    assert_eq!(
        l.roundtrip_exact, 1_000_000,
        "target 4: exact down/up on the 27-cube"
    );
    assert_eq!(
        l.coarse_level_is_block_means, 1_000_000,
        "the coarse level is the block-mean signal (informative), with no learning"
    );
}

#[test]
fn lift3_roundtrip_spot_including_negatives() {
    for &(a, b, c) in &[
        (0, 0, 0),
        (1, 2, 3),
        (-1, -2, -3),
        (5, -7, 11),
        (-100, 100, -1),
    ] {
        let (coarse, d1, d2v) = d2::lift3(a, b, c);
        assert_eq!(d2::unlift3(coarse, d1, d2v), (a, b, c));
        assert_eq!(
            coarse,
            (a + b + c).div_euclid(3),
            "coarse is the floor-mean"
        );
    }
}
