//! The 16 tests of vendor/bigpickle-rebuild/tests/hrm-slow-fast.test.mjs, against the port.

use hrm_mtp::hrm::{
    fast_loop_refine_position, hrm_shaped_prediction, slow_loop_predict_shape, HrmArgs, Shape,
    PREDICTION_ALGORITHM, SHAPES,
};
use hrm_mtp::JsError;

fn slow(envelope: &str, cp: i64) -> hrm_mtp::hrm::ShapeRecord {
    slow_loop_predict_shape(Some(envelope), cp, &[])
}

// test.mjs:15-21
#[test]
fn shapes_is_frozen_and_contains_8_canonical_shapes() {
    assert_eq!(SHAPES.len(), 8);
    for s in [
        "linear", "branch", "spiral", "fold", "cascade", "ring", "star", "fractal",
    ] {
        assert!(SHAPES.contains(&s));
    }
}

// test.mjs:25-28
#[test]
fn slow_loop_classifies_cascade_envelope() {
    assert_eq!(slow("cascade-fanout", 500).shape, Shape::Cascade);
}

// test.mjs:30-34
#[test]
fn slow_loop_classifies_wave_spawn_as_star() {
    let r = slow("wave-spawn", 500);
    assert_eq!(r.shape, Shape::Star);
    assert_eq!(r.branching_factor, 4);
}

// test.mjs:36-39
#[test]
fn slow_loop_classifies_revolver_as_ring() {
    assert_eq!(slow("revolver-rotation", 500).shape, Shape::Ring);
}

// test.mjs:41-44
#[test]
fn slow_loop_classifies_wave_nesting_as_fractal() {
    assert_eq!(slow("wave-nesting", 500).shape, Shape::Fractal);
}

// test.mjs:46-50
#[test]
fn slow_loop_classifies_branch_envelope() {
    let r = slow("fork-branch", 500);
    assert_eq!(r.shape, Shape::Branch);
    assert_eq!(r.branching_factor, 2);
}

// test.mjs:52-56
#[test]
fn slow_loop_defaults_to_linear_for_unknown_envelope() {
    let r = slow("totally-unknown-type", 500);
    assert_eq!(r.shape, Shape::Linear);
    assert_eq!(r.branching_factor, 1);
}

// test.mjs:58-66
#[test]
fn slow_loop_axis_bias_matches_cp_band() {
    for (cp, bias) in [
        (400, "helm"),
        (500, "vector"),
        (600, "rook"),
        (750, "forge"),
        (850, "falcon"),
        (950, "livefree"),
        (300, "gaia"),
    ] {
        assert_eq!(slow("x", cp).axis_bias, bias);
    }
}

// test.mjs:68-76
#[test]
fn slow_loop_history_fallback_flags_linear_when_stable_axis() {
    let history = vec![
        Some(vec![1, 5, 5]),
        Some(vec![2, 5, 5]),
        Some(vec![3, 5, 5]),
    ];
    let r = slow_loop_predict_shape(Some("no-match"), 500, &history);
    assert_eq!(r.shape, Shape::Linear);
}

// test.mjs:80-86
#[test]
fn fast_loop_returns_path_and_bounded_final_cp_for_linear() {
    let r = fast_loop_refine_position("linear", 500, 5, 0).expect("linear");
    assert_eq!(r.shape, Shape::Linear);
    assert_eq!(r.iterations, 5);
    assert_eq!(r.path.len(), 5);
    assert!((2..=1023).contains(&r.final_cp));
}

// test.mjs:88-94
#[test]
fn fast_loop_supports_all_8_shapes() {
    for shape in SHAPES {
        let r = fast_loop_refine_position(shape, 500, 3, 0).expect("shape");
        assert_eq!(r.shape.name(), shape);
        assert!(
            (2..=1023).contains(&r.final_cp),
            "{shape}: final_cp out of band {}",
            r.final_cp
        );
    }
}

// test.mjs:96-101
#[test]
fn fast_loop_throws_on_unknown_shape() {
    assert!(matches!(
        fast_loop_refine_position("not-a-shape", 500, 15, 0),
        Err(JsError::Range(_))
    ));
}

// test.mjs:103-107
#[test]
fn fast_loop_is_deterministic_for_same_arguments() {
    let a = fast_loop_refine_position("spiral", 500, 8, 42).expect("spiral");
    let b = fast_loop_refine_position("spiral", 500, 8, 42).expect("spiral");
    assert_eq!(a, b);
}

// test.mjs:111-129
#[test]
fn hrm_shaped_prediction_returns_k_heads_with_shape_and_bh_coord() {
    let r = hrm_shaped_prediction(&HrmArgs {
        envelope_type: Some("cascade-fanout".to_string()),
        current_cp: 500,
        k: Some(4),
        fast_iters: Some(5),
        seed: Some(0),
        ..HrmArgs::default()
    })
    .expect("prediction");
    assert_eq!(PREDICTION_ALGORITHM, "hrm-shaped-prediction-stub.v1");
    assert_eq!(r.shape, Shape::Cascade);
    assert_eq!(r.cp_start, 500);
    assert_eq!(r.k, 4);
    assert_eq!(r.heads.len(), 4);
    for h in &r.heads {
        assert_eq!(h.bh_coord_predicted.len(), 3);
    }
}

// test.mjs:131-136
#[test]
fn hrm_shaped_prediction_is_reproducible() {
    let args = HrmArgs {
        envelope_type: Some("revolver".to_string()),
        current_cp: 600,
        k: Some(3),
        fast_iters: Some(4),
        seed: Some(11),
        ..HrmArgs::default()
    };
    assert_eq!(
        hrm_shaped_prediction(&args).expect("a"),
        hrm_shaped_prediction(&args).expect("b")
    );
}

// test.mjs:138-146
#[test]
fn hrm_shaped_prediction_propagates_shape_from_slow_loop() {
    let r = hrm_shaped_prediction(&HrmArgs {
        envelope_type: Some("wave-nesting".to_string()),
        current_cp: 500,
        k: Some(2),
        fast_iters: Some(3),
        ..HrmArgs::default()
    })
    .expect("prediction");
    assert_eq!(r.shape, Shape::Fractal);
}
