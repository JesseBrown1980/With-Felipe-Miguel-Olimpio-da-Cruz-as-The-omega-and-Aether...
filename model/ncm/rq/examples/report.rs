//! Prints every MEASURED number this crate asserts, as pipe-delimited rows. Run with
//! `cargo run --release --example report`.

use ncm_rq::{d1, d2};

fn main() {
    // ---- D1 ----
    let k = d1::MAX_K;
    let r = d1::run_d1(k);
    println!(
        "D1|k={}|tested={}|residual_zero={}|trits_match={}|ties={}|invariant_held={}|recon_ok={}",
        r.k, r.tested, r.residual_zero, r.trits_match, r.ties, r.invariant_held, r.recon_ok
    );

    let o = d1::run_out_of_range(k, 1000);
    println!(
        "D1_OUT_OF_RANGE|k={}|band_each_side={}|tested={}|nonzero_residual={}|first_pos={}|first_neg={}",
        o.k,
        o.band,
        o.tested,
        o.nonzero_residual,
        d1::bound(k) + 1,
        -(d1::bound(k) + 1)
    );

    let u = d1::run_uncentred(k);
    println!(
        "D1_UNCENTRED|k={}|tested={}|digit_disagreements={}|nonzero_residual={}",
        u.k, u.tested, u.digit_disagreements, u.nonzero_residual
    );

    for k in 1..=d1::MAX_K {
        let b = d1::run_d1(k);
        let pow = 3u64.pow(k as u32);
        println!(
            "D1_BIJECTION|k={}|tested={}|expected_3^k={}|recon_ok={}|bijection={}",
            k,
            b.tested,
            pow,
            b.recon_ok,
            u8::from(b.tested == pow && b.recon_ok == pow)
        );
    }

    // ---- D2: ACER sum-down / repeat-up ----
    let e = d2::run_sum_repeat_exhaustive_9();
    println!(
        "D2_SUMREPEAT_EXHAUSTIVE9|tested={}|roundtrip_exact_finest={}|full_pyramid_exact={}|per_level_min={:?}|per_level_max={:?}|per_level_exact={:?}",
        e.tested,
        e.roundtrip_exact_finest,
        e.full_pyramid_exact,
        e.per_level_min,
        e.per_level_max,
        e.per_level_exact
    );

    let s = d2::run_sum_repeat_random_27(1_000_000, 0xA5A5_1234, -13, 13);
    println!(
        "D2_SUMREPEAT_RANDOM27|tested={}|roundtrip_exact_finest={}|full_pyramid_exact={}|per_level_min={:?}|per_level_max={:?}|per_level_exact={:?}",
        s.tested,
        s.roundtrip_exact_finest,
        s.full_pyramid_exact,
        s.per_level_min,
        s.per_level_max,
        s.per_level_exact
    );

    // ---- D2: integer lifting (target 4) ----
    let l3 = d2::run_lift3_exhaustive(-13, 13);
    println!(
        "D2_LIFT3_EXHAUSTIVE|tested={}|roundtrip_exact={}|coarse_is_floor_mean={}|coarse_is_exact_mean={}",
        l3.tested, l3.roundtrip_exact, l3.coarse_is_floor_mean, l3.coarse_is_exact_mean
    );

    let l27 = d2::run_lift27_random(1_000_000, 0xBEEF_0027, -13, 13);
    println!(
        "D2_LIFT27_RANDOM|tested={}|roundtrip_exact={}|coarse_level_is_block_means={}",
        l27.tested, l27.roundtrip_exact, l27.coarse_level_is_block_means
    );
}
