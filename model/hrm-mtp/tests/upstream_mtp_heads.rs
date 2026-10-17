//! The 14 tests of vendor/bigpickle-rebuild/tests/mtp-heads.test.mjs, and chain links 1-3 of
//! bigpickle-rebuild tests/integration/triad-chain.test.mjs (lines 17-69; that file is cited by
//! blob id in PROVENANCE.md, not vendored).

use hrm_mtp::hrm::{hrm_shaped_prediction, HrmArgs, Shape};
use hrm_mtp::mtp::{
    measure_hit_rate, mtp_heads, pre_warm_candidates, MtpOptions, HEADS_ALGORITHM,
    PREWARM_ALGORITHM,
};
use hrm_mtp::revolver::{PidChainRevolver, PreWarmOptions, LANE_CYCLE, PREWARM_ALGORITHM as REV};
use hrm_mtp::zeta::predict_k_positions;
use hrm_mtp::JsError;
use l0_edge::jsnum::Dbl;
use std::collections::BTreeSet;

fn opts(k: Option<i64>, depth: Option<i64>, seed: Option<u32>) -> MtpOptions {
    MtpOptions {
        k,
        depth,
        seed,
        ..MtpOptions::default()
    }
}

// mtp-heads.test.mjs:13-25
#[test]
fn mtp_heads_returns_k_heads_for_cp0_500_depth_1() {
    let out = mtp_heads(500, opts(Some(4), Some(1), Some(0))).expect("valid");
    assert_eq!(out.k, 4);
    assert_eq!(out.depth, 1);
    assert_eq!(out.cp_start, 500);
    assert_eq!(out.heads.len(), 4);
    assert_eq!(HEADS_ALGORITHM, "mtp-heads-zeta-parallel.v1");
    for h in &out.heads {
        assert_eq!(h.bh_coord_predicted.len(), 3);
        assert_eq!(h.trajectory.len(), 1);
    }
}

// mtp-heads.test.mjs:27-31
#[test]
fn mtp_heads_heads_have_distinct_seeds() {
    let out = mtp_heads(500, opts(Some(4), None, None)).expect("valid");
    let seeds: BTreeSet<u32> = out.heads.iter().map(|h| h.head_seed).collect();
    assert_eq!(seeds.len(), 4);
}

// mtp-heads.test.mjs:33-38
#[test]
fn mtp_heads_cp0_500_depth_1_diverges_across_heads() {
    let out = mtp_heads(500, opts(Some(4), Some(1), Some(0))).expect("valid");
    let finals: BTreeSet<i64> = out.heads.iter().map(|h| h.cp_predicted).collect();
    assert!(finals.len() >= 2);
}

// mtp-heads.test.mjs:40-44
#[test]
fn mtp_heads_is_reproducible() {
    let o = opts(Some(4), Some(1), Some(99));
    assert_eq!(mtp_heads(500, o).expect("a"), mtp_heads(500, o).expect("b"));
}

// mtp-heads.test.mjs:46-50 (1.5 is not an integer; the typed port takes i64)
#[test]
fn mtp_heads_throws_on_invalid_k() {
    for k in [0, -1] {
        assert!(matches!(
            mtp_heads(500, opts(Some(k), None, None)),
            Err(JsError::Range(_))
        ));
    }
}

// mtp-heads.test.mjs:52-55
#[test]
fn mtp_heads_throws_on_invalid_depth() {
    for depth in [0, -1] {
        assert!(matches!(
            mtp_heads(500, opts(Some(4), Some(depth), None)),
            Err(JsError::Range(_))
        ));
    }
}

// mtp-heads.test.mjs:57-60
#[test]
fn mtp_heads_default_k_is_4() {
    assert_eq!(
        mtp_heads(500, MtpOptions::default())
            .expect("valid")
            .heads
            .len(),
        4
    );
}

// mtp-heads.test.mjs:64-74
#[test]
fn pre_warm_candidates_returns_k_candidates_with_bh_coord() {
    let out = pre_warm_candidates(500, 4, 1, 0, "TEST-PID").expect("valid");
    assert_eq!(PREWARM_ALGORITHM, "mtp-prewarm-candidates.v1");
    assert_eq!(out.prof_pid, "TEST-PID");
    assert_eq!(out.candidates.len(), 4);
    for c in &out.candidates {
        assert_eq!(c.bh_coord.len(), 3);
        assert_eq!(c.depth, 1);
    }
}

// mtp-heads.test.mjs:76-80
#[test]
fn pre_warm_candidates_default_arguments() {
    let out = pre_warm_candidates(500, 4, 1, 0, "").expect("valid");
    assert_eq!(out.candidates.len(), 4);
    assert_eq!(out.prof_pid, "");
}

// mtp-heads.test.mjs:84-91
#[test]
fn measure_hit_rate_full_hit_returns_1() {
    let p = vec![vec![1, 2, 3], vec![4, 5, 6]];
    let r = measure_hit_rate(&p, &p);
    assert_eq!(r.hit_rate, Dbl::from_u64(1));
    assert_eq!(r.hits, 2);
    assert_eq!(r.total, 2);
}

// mtp-heads.test.mjs:93-100
#[test]
fn measure_hit_rate_partial_hit() {
    let r = measure_hit_rate(&[vec![1, 2, 3]], &[vec![1, 2, 3], vec![9, 9, 9]]);
    assert_eq!(r.hit_rate, Dbl::from_ratio(1, 2));
    assert_eq!(r.hits, 1);
    assert_eq!(r.total, 2);
}

// mtp-heads.test.mjs:102-106
#[test]
fn measure_hit_rate_zero_hit() {
    let r = measure_hit_rate(&[vec![1, 1, 1]], &[vec![2, 2, 2]]);
    assert!(r.hit_rate.is_zero());
    assert_eq!(r.hits, 0);
}

// mtp-heads.test.mjs:108-113
#[test]
fn measure_hit_rate_empty_actual_returns_0() {
    let r = measure_hit_rate(&[vec![1, 2, 3]], &[]);
    assert!(r.hit_rate.is_zero());
    assert_eq!(r.hits, 0);
    assert_eq!(r.total, 0);
}

// mtp-heads.test.mjs:115-119: `measureHitRate(null, null)` returns the 'invalid inputs' note; the
// typed port takes slices, so a non-array argument cannot be passed.
#[test]
fn measure_hit_rate_on_empty_inputs() {
    let r = measure_hit_rate(&[], &[]);
    assert!(r.hit_rate.is_zero());
    assert_eq!(r.total, 0);
}

// triad-chain.test.mjs:24-29 (chain link 1: zeta -> mtp)
#[test]
fn triad_zeta_predict_k_positions_matches_mtp_head_0() {
    let zeta = predict_k_positions(500, 1, 0).expect("k");
    let mtp = mtp_heads(500, opts(Some(4), Some(1), Some(0))).expect("valid");
    assert_eq!(mtp.heads[0].cp_predicted, zeta.final_cp);
}

// triad-chain.test.mjs:33-44 (chain link 2: mtp -> revolver.preWarm)
#[test]
fn triad_pre_warm_consumes_mtp_candidates_into_16_hex_pids() {
    let rev = PidChainRevolver::new("TEST-ACER", None).expect("anchor");
    let out = rev
        .pre_warm(PreWarmOptions {
            k: Some(4),
            depth: Some(1),
            seed: Some(0),
            cp0: Some(500),
        })
        .expect("prewarm");
    assert_eq!(REV, "pid-chain-revolver-mtp-prewarm.v1");
    assert_eq!(out.candidates.len(), 4);
    for c in &out.candidates {
        assert_eq!(c.speculative_pid.len(), 16);
        assert!(c
            .speculative_pid
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
        assert!((2..=1023).contains(&c.cp_predicted));
        assert_eq!(c.bh_coord_predicted.len(), 3);
        assert!(LANE_CYCLE.contains(&c.lane));
    }
}

// triad-chain.test.mjs:46-53
#[test]
fn triad_pre_warm_does_not_advance_counter() {
    let mut rev = PidChainRevolver::new("TEST-ACER", None).expect("anchor");
    rev.next_pid().expect("1");
    rev.next_pid().expect("2");
    let before = rev.counter;
    rev.pre_warm(PreWarmOptions {
        k: Some(4),
        cp0: Some(500),
        ..PreWarmOptions::default()
    })
    .expect("prewarm");
    assert_eq!(rev.counter, before, "preWarm must not mutate counter");
}

// triad-chain.test.mjs:57-69 (chain link 3: hrm shape -> positions)
#[test]
fn triad_hrm_classifies_cascade_and_emits_k_positions() {
    let r = hrm_shaped_prediction(&HrmArgs {
        envelope_type: Some("cascade-fanout".to_string()),
        current_cp: 500,
        k: Some(4),
        fast_iters: Some(5),
        seed: Some(0),
        ..HrmArgs::default()
    })
    .expect("prediction");
    assert_eq!(r.shape, Shape::Cascade);
    assert_eq!(r.heads.len(), 4);
    for h in &r.heads {
        assert!((2..=1023).contains(&h.cp_predicted));
    }
}
