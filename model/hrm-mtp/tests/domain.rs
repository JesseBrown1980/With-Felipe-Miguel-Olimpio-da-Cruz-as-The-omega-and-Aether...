//! The ported domain (README "Errors"): arguments outside it come back as `JsError::Domain` from
//! the entry points that return a `Result`, rather than as a value or a panic.

use hrm_mtp::hilbert::{hilbert_decode, hilbert_encode};
use hrm_mtp::hrm::{fast_loop_refine_position, hrm_shaped_prediction, HrmArgs};
use hrm_mtp::mtp::{mtp_heads, MtpOptions, MAX_HEADS};
use hrm_mtp::revolver::{PidChainRevolver, PreWarmOptions};
use hrm_mtp::sf64::Sf64;
use hrm_mtp::trig::{round_cos, round_sin, NearTie, OFFSET_LIMIT, SCALE_MAX};
use hrm_mtp::zeta::{predict_k_positions, MAX_CP, MAX_STEP};
use hrm_mtp::JsError;

fn is_domain<T: std::fmt::Debug>(r: Result<T, JsError>) -> bool {
    matches!(r, Err(JsError::Domain(_)))
}

#[test]
fn hilbert_bounds() {
    assert!(is_domain(hilbert_decode(1 << 53, 3, 4)));
    assert!(hilbert_decode((1 << 53) - 1, 2, 4).is_ok());
    assert!(is_domain(hilbert_encode(&[1 << 31, 0, 0], 3, 4)));
    assert!(is_domain(hilbert_encode(&[0, -(1 << 31) - 1], 2, 4)));
    assert!(hilbert_encode(&[-(1 << 31), (1 << 31) - 1], 2, 15).is_ok());
    assert!(is_domain(hilbert_decode(0, 4, 8)));
}

#[test]
fn zeta_chain_bounds() {
    let k = i64::from(MAX_STEP);
    assert!(is_domain(predict_k_positions(2, k + 1, 0)));
    assert!(predict_k_positions(MAX_CP - 1, 1, 0).is_ok());
    assert!(is_domain(predict_k_positions(MAX_CP, 1, 0)));
    let opts = MtpOptions {
        k: Some(1),
        depth: Some(k + 1),
        ..MtpOptions::default()
    };
    assert!(is_domain(mtp_heads(500, opts)));
    let opts = MtpOptions {
        k: Some(i64::from(MAX_HEADS)),
        ..MtpOptions::default()
    };
    assert!(is_domain(mtp_heads(500, opts)));
    let rv = PidChainRevolver::new("A", None).expect("anchor");
    let warm = rv.pre_warm(PreWarmOptions {
        cp0: Some(MAX_CP),
        ..PreWarmOptions::default()
    });
    assert!(is_domain(warm));
}

#[test]
fn hrm_bounds() {
    assert!(is_domain(fast_loop_refine_position("ring", MAX_CP, 1, 0)));
    // Zero iterations return currentCp unchanged, as upstream (hrm-slow-fast.mjs:85-97).
    let r = fast_loop_refine_position("ring", MAX_CP, 0, 0).expect("no iteration");
    assert_eq!(r.final_cp, MAX_CP);
    assert!(is_domain(fast_loop_refine_position("spiral", 2, 16_385, 0)));
    let args = HrmArgs {
        envelope_type: Some("revolver".to_string()),
        current_cp: 500,
        k: Some(MAX_HEADS),
        ..HrmArgs::default()
    };
    assert!(is_domain(hrm_shaped_prediction(&args)));
    let args = HrmArgs {
        k: Some(MAX_HEADS),
        fast_iters: Some(0),
        ..args
    };
    assert!(is_domain(hrm_shaped_prediction(&args)));
}

#[test]
fn trig_rounding_bounds() {
    let zero = Sf64::ZERO;
    let one = Sf64::ONE;
    let big = i64::MAX - 1;
    // A zero sine adds nothing to any offset (Math.sin(+0) is +0).
    assert_eq!(round_sin(big, 16, zero).map(|r| r.value), Ok(big));
    let limit = OFFSET_LIMIT as i64;
    assert!(round_sin(limit - 1, 16, one).is_ok());
    assert_eq!(round_sin(limit, 16, one), Err(NearTie));
    assert_eq!(round_cos(-limit, 16, zero), Err(NearTie));
    let scale = SCALE_MAX as i64;
    assert!(round_cos(0, scale, one).is_ok());
    assert_eq!(round_cos(0, scale + 1, one), Err(NearTie));
    assert_eq!(round_sin(0, i64::MIN, one), Err(NearTie));
}
