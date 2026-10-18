//! D1 counts: greedy balanced residual quantization is exact balanced ternary in range, fails out
//! of range, needs the centring, and is a bijection for every K from 1 to 13.

use ncm_rq::d1;
use ncm_rq::tribit::Zero;

#[test]
fn d1_in_range_k13_is_exact_balanced_ternary() {
    let r = d1::run_d1(13);
    assert_eq!(r.tested, 1_594_323, "3^13 values enumerated");
    assert_eq!(
        r.residual_zero, 1_594_323,
        "(a) final residual 0 for every x"
    );
    assert_eq!(
        r.trits_match, 1_594_323,
        "(b) greedy indices equal tribit balanced trits"
    );
    assert_eq!(r.ties, 0, "(c) tie count 0");
    assert_eq!(
        r.invariant_held, 1_594_323,
        "(d)/target 2 invariant held before each level"
    );
    assert_eq!(r.recon_ok, 1_594_323, "recon_msb inverts every x");
}

#[test]
fn d1_out_of_range_residual_is_nonzero() {
    let o = d1::run_out_of_range(13, 1000);
    assert_eq!(o.tested, 2000);
    assert_eq!(
        o.nonzero_residual, 2000,
        "(e) every just-out-of-range x leaves a nonzero residual"
    );

    // The two named boundary points x = ±797_162 = ±((3^13 - 1)/2 + 1).
    assert_eq!(d1::bound(13) + 1, 797_162);
    let mut trits = [Zero::Nil; 13];
    assert_ne!(d1::quantize(797_162, &mut trits).residual, 0);
    assert_ne!(d1::quantize(-797_162, &mut trits).residual, 0);
}

#[test]
fn d1_uncentred_disagrees_with_base3() {
    let u = d1::run_uncentred(13);
    assert_eq!(u.tested, 1_594_323);
    assert_eq!(
        u.digit_disagreements, 1_577_940,
        "uncentred greedy is not base-3 extraction"
    );
    assert_eq!(u.nonzero_residual, 1_577_940, "and it does not reconstruct");
    assert!(u.digit_disagreements > 0, "the centring is load-bearing");
}

#[test]
fn d1_bijection_for_k_1_to_13() {
    for k in 1..=13usize {
        let b = d1::run_d1(k);
        let pow = 3u64.pow(k as u32);
        assert_eq!(b.tested, pow, "exactly 3^{k} values in range");
        assert_eq!(
            b.recon_ok, pow,
            "injective, so all 3^{k} codewords are distinct"
        );
        assert_eq!(b.residual_zero, pow);
        assert_eq!(b.trits_match, pow);
        assert_eq!(b.ties, 0);
        assert_eq!(b.invariant_held, pow);
    }
}

#[test]
fn target1_the_no_tie_step_is_exact() {
    // 2r == ±3^k is impossible because 3^k is odd (even never equals odd); choose_balanced reports
    // no tie for every residual, which the full enumeration above confirms (ties == 0).
    for k in 0..=d1::MAX_K {
        let p = d1::POW3[k];
        assert_eq!(p % 2, 1, "3^{k} is odd");
        // A tie would need 2r == p with p odd; scan the reachable residual band to show none exist.
        for r in -p..=p {
            let (_, tie) = d1::choose_balanced(r, p);
            assert!(
                !tie,
                "2*{r} == {p} would require an even number to equal an odd one"
            );
        }
    }
}
