//! The 19 tests of vendor/bigpickle-rebuild/tests/zeta-process.test.mjs, against the port.
//! Arguments the typed port cannot receive (2.5, 'x', NaN, Infinity, 1.5) are noted per test.

use hrm_mtp::fdlibm::log_int;
use hrm_mtp::sf64::Sf64;
use hrm_mtp::zeta::{
    band_weight, chain_antichain_bound, nu_lambda, nu_lambda_table, predict_k_positions,
    von_mangoldt, von_mangoldt_next, CHAIN_ALGORITHM, HONEST_GAPS,
};
use hrm_mtp::JsError;
use l0_edge::jsnum::Dbl;
use std::collections::BTreeSet;

fn ln(n: u64) -> Sf64 {
    log_int(n)
}

// test.mjs:18-22
#[test]
fn von_mangoldt_of_prime_returns_log_p() {
    for p in [2, 3, 7] {
        assert_eq!(von_mangoldt(p), ln(p as u64));
    }
}

// test.mjs:24-29
#[test]
fn von_mangoldt_of_prime_power_returns_log_p() {
    for (n, p) in [(4, 2), (8, 2), (9, 3), (27, 3)] {
        assert_eq!(von_mangoldt(n), ln(p));
    }
}

// test.mjs:31-35
#[test]
fn von_mangoldt_of_composite_non_prime_power_returns_0() {
    for n in [6, 12, 15] {
        assert!(von_mangoldt(n).is_zero());
    }
}

// test.mjs:37-43 (2.5 and 'x' are not integers; the typed port takes i64)
#[test]
fn von_mangoldt_rejects_invalid_inputs() {
    for n in [0, 1, -5] {
        assert!(von_mangoldt(n).is_zero());
    }
}

// test.mjs:47-50
#[test]
fn nu_lambda_returns_reciprocal_of_cp_log_cp() {
    for cp in [2u64, 10] {
        let want = Dbl::from_u64(1) / (Dbl::from_u64(cp) * ln(cp).to_dbl());
        assert_eq!(nu_lambda(cp as i64), want);
    }
}

// test.mjs:52-58 (NaN and Infinity are not representable as i64)
#[test]
fn nu_lambda_returns_0_below_2() {
    for cp in [0, 1, -3] {
        assert!(nu_lambda(cp).is_zero());
    }
}

// test.mjs:60-67
#[test]
fn nu_lambda_table_fills_entries() {
    let t = nu_lambda_table(10);
    assert_eq!(t.len(), 11);
    assert!(t[0].is_zero() && t[1].is_zero());
    assert_eq!(t[2], nu_lambda(2));
    assert_eq!(t[10], nu_lambda(10));
}

// test.mjs:69-75
#[test]
fn band_weight_is_the_sum_of_nu_lambda() {
    let w = band_weight(2, 10);
    let expected = (2..=10).fold(Dbl::ZERO, |s, cp| s + nu_lambda(cp));
    assert_eq!(w, expected);
    assert!(w > Dbl::ZERO);
}

// test.mjs:79-83
#[test]
fn von_mangoldt_next_is_deterministic() {
    assert_eq!(von_mangoldt_next(500, 42, 0), von_mangoldt_next(500, 42, 0));
}

// test.mjs:85-94
#[test]
fn von_mangoldt_next_varies_across_distinct_seeds() {
    let differs = (50..500)
        .filter(|&cp| {
            let a = von_mangoldt_next(cp, 0x12345, 0);
            let b = von_mangoldt_next(cp, 0x98765, 0);
            a.next != b.next || a.divisor != b.divisor
        })
        .count();
    assert!(
        differs > 0,
        "expected divergence across seeds, got {differs}/450"
    );
}

// test.mjs:96-101
#[test]
fn von_mangoldt_next_below_2_resets_to_2() {
    let r = von_mangoldt_next(1, 0, 0);
    assert_eq!(r.next, 2);
    assert!(r.weight.is_zero());
    assert!(r.reason.contains("reset"));
}

// test.mjs:103-108
#[test]
fn von_mangoldt_next_cp_2_is_the_absorbing_sink() {
    let r = von_mangoldt_next(2, 0, 0);
    assert_eq!(r.next, 2);
    assert_eq!(r.divisor, 2);
}

// test.mjs:112-119
#[test]
fn predict_k_positions_returns_k_step_trajectory() {
    let out = predict_k_positions(500, 4, 7).expect("k >= 1");
    assert_eq!(out.k, 4);
    assert_eq!(out.cp_start, 500);
    assert_eq!(out.trajectory.len(), 4);
    assert_eq!(out.seed, 7);
    assert_eq!(CHAIN_ALGORITHM, "zeta-process-von-mangoldt-chain.v1");
}

// test.mjs:121-125
#[test]
fn predict_k_positions_is_reproducible() {
    assert_eq!(
        predict_k_positions(500, 4, 13).expect("a"),
        predict_k_positions(500, 4, 13).expect("b")
    );
}

// test.mjs:127-133
#[test]
fn predict_k_positions_cp0_500_depth_1_diverges() {
    let finals: BTreeSet<i64> = (0..4)
        .map(|s| predict_k_positions(500, 1, s).expect("k").final_cp)
        .collect();
    assert!(finals.len() >= 2, "got {} unique", finals.len());
}

// test.mjs:135-139 (1.5 is not an integer; the typed port takes i64)
#[test]
fn predict_k_positions_throws_on_invalid_k() {
    for k in [0, -1] {
        assert!(matches!(
            predict_k_positions(500, k, 0),
            Err(JsError::Range(_))
        ));
    }
}

// test.mjs:143-148
#[test]
fn chain_antichain_bound_returns_reciprocal_mass() {
    let b = chain_antichain_bound(3).expect("n >= 1");
    assert_eq!(b.n_concurrent, 3);
    assert_eq!(b.required_mass_per_pid, Dbl::from_ratio(1, 3));
    assert!(b.constructive_answer.contains("revolver"));
}

// test.mjs:150-153
#[test]
fn chain_antichain_bound_throws_on_invalid_n() {
    for n in [0, -1] {
        assert!(matches!(chain_antichain_bound(n), Err(JsError::Range(_))));
    }
}

// test.mjs:157-161, and each entry equals the vendored zeta-process.mjs text
#[test]
fn honest_gaps_documents_the_cp_2_sink_verbatim() {
    assert!(HONEST_GAPS
        .iter()
        .any(|g| g.contains("cp=2") && g.to_lowercase().contains("absorb")));
    let source = include_str!("../vendor/bigpickle-rebuild/src/zeta-process.mjs");
    for gap in HONEST_GAPS {
        assert!(source.contains(&format!("'{gap}'")), "not verbatim: {gap}");
    }
}
