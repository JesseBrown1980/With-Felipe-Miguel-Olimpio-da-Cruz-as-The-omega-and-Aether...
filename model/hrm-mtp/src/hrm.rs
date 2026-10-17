//! `hrm-slow-fast.mjs` (Layer 3): the slow loop picks one of eight shapes from the envelope
//! type, the fast loop runs the zeta chain with a per-shape pull, K heads end in Hilbert cells.
//!
//! Upstream's own header (hrm-slow-fast.mjs:14-18): "This file is the DETERMINISTIC stub. Full
//! HRM (trained model) lives at D:/Asolaria-HRM/. ... Pure functions. No model load at this
//! layer."

use crate::hilbert::hilbert_decode;
use crate::mtp::{head_seed, MAX_HEADS};
use crate::sf64::Sf64;
use crate::trig::{round_cos, round_sin};
use crate::zeta::{von_mangoldt_next, MAX_CP, MAX_STEP};
use crate::JsError;

/// `SHAPES` (hrm-slow-fast.mjs:23-32), in order.
pub const SHAPES: [&str; 8] = [
    "linear", "branch", "spiral", "fold", "cascade", "ring", "star", "fractal",
];

/// `algorithm` of [`slow_loop_predict_shape`] (hrm-slow-fast.mjs:65).
pub const SLOW_ALGORITHM: &str = "hrm-slow-loop-shape-stub.v1";
/// `algorithm` of [`fast_loop_refine_position`] (hrm-slow-fast.mjs:93).
pub const FAST_ALGORITHM: &str = "hrm-fast-loop-zeta-refine.v1";
/// `algorithm` of [`hrm_shaped_prediction`] (hrm-slow-fast.mjs:142).
pub const PREDICTION_ALGORITHM: &str = "hrm-shaped-prediction-stub.v1";
/// `stub_note` (hrm-slow-fast.mjs:75).
pub const STUB_NOTE: &str = "deterministic-stub-pending-D:/Asolaria-HRM-model-wire";

/// Fast-loop iteration counts in the ported domain: the zeta step stays below 2^22 and every
/// `Math.sin` / `Math.cos` argument below 2^14.
pub const MAX_ITERATIONS: u32 = 16_384;

/// One of [`SHAPES`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Shape {
    /// `linear`.
    Linear,
    /// `branch`.
    Branch,
    /// `spiral`.
    Spiral,
    /// `fold`.
    Fold,
    /// `cascade`.
    Cascade,
    /// `ring`.
    Ring,
    /// `star`.
    Star,
    /// `fractal`.
    Fractal,
}

impl Shape {
    /// The shape named `name`, if it is in [`SHAPES`] (`SHAPE_SET.has`, hrm-slow-fast.mjs:34).
    pub fn from_name(name: &str) -> Option<Shape> {
        Some(match name {
            "linear" => Shape::Linear,
            "branch" => Shape::Branch,
            "spiral" => Shape::Spiral,
            "fold" => Shape::Fold,
            "cascade" => Shape::Cascade,
            "ring" => Shape::Ring,
            "star" => Shape::Star,
            "fractal" => Shape::Fractal,
            _ => return None,
        })
    }

    /// The name in [`SHAPES`].
    pub fn name(self) -> &'static str {
        match self {
            Shape::Linear => "linear",
            Shape::Branch => "branch",
            Shape::Spiral => "spiral",
            Shape::Fold => "fold",
            Shape::Cascade => "cascade",
            Shape::Ring => "ring",
            Shape::Star => "star",
            Shape::Fractal => "fractal",
        }
    }
}

/// `shapeRecord(shape, currentCp)` (hrm-slow-fast.mjs:63-77).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ShapeRecord {
    /// `shape`.
    pub shape: Shape,
    /// `branching_factor`: 4 for star, 2 for branch, else 1.
    pub branching_factor: u32,
    /// `axis_bias`: the code-point band name.
    pub axis_bias: &'static str,
}

fn shape_record(shape: Shape, current_cp: i64) -> ShapeRecord {
    let cp = current_cp;
    ShapeRecord {
        shape,
        branching_factor: match shape {
            Shape::Star => 4,
            Shape::Branch => 2,
            _ => 1,
        },
        axis_bias: if (384..=479).contains(&cp) {
            "helm"
        } else if (480..=575).contains(&cp) {
            "vector"
        } else if (576..=703).contains(&cp) {
            "rook"
        } else if (704..=799).contains(&cp) {
            "forge"
        } else if (800..=895).contains(&cp) {
            "falcon"
        } else if (896..=1023).contains(&cp) {
            "livefree"
        } else if (256..=383).contains(&cp) {
            "gaia"
        } else {
            "cube_cubed_sealer"
        },
    }
}

/// `slowLoopPredictShape({ envelopeType, agentProf, currentCp, history })`
/// (hrm-slow-fast.mjs:38-61). `envelope_type` `None` is an absent key; `history` holds each
/// row's `bh_coord` (`None` when the row has none). `agentProf` is read by no branch upstream.
pub fn slow_loop_predict_shape(
    envelope_type: Option<&str>,
    current_cp: i64,
    history: &[Option<Vec<i64>>],
) -> ShapeRecord {
    let t = envelope_type.unwrap_or("").to_lowercase();
    let has = |s: &str| t.contains(s);
    let rules: [(&str, &str, Shape); 8] = [
        ("cascade", "fanout", Shape::Cascade),
        ("bilateral", "mirror", Shape::Linear),
        ("wave-spawn", "star", Shape::Star),
        ("bus-relay", "edge", Shape::Linear),
        ("revolver", "rotation", Shape::Ring),
        ("cube-of-cubes", "recursion", Shape::Fold),
        ("wave-nesting", "fractal", Shape::Fractal),
        ("branch", "fork", Shape::Branch),
    ];
    for (a, b, shape) in rules {
        if has(a) || has(b) {
            return shape_record(shape, current_cp);
        }
    }
    if history.len() >= 3 {
        let zero = vec![0, 0, 0];
        let recent: Vec<&Vec<i64>> = history[history.len() - 3..]
            .iter()
            .map(|h| h.as_ref().unwrap_or(&zero))
            .collect();
        let axis_same = |axis: usize| recent.iter().all(|c| c.get(axis) == recent[0].get(axis));
        if axis_same(0) || axis_same(1) {
            return shape_record(Shape::Linear, current_cp);
        }
    }
    shape_record(Shape::Linear, current_cp)
}

/// `applyShapePull(candidateCp, shape, iter, totalIters)` (hrm-slow-fast.mjs:101-118), with the
/// distance of each `Math.round` argument from a tie for the trig shapes (units of 2^-112).
fn apply_shape_pull(
    candidate_cp: i64,
    shape: Shape,
    iter: u32,
    total_iters: u32,
) -> Result<(i64, Option<u128>), JsError> {
    let c = Sf64::from_i64(candidate_cp);
    let it = Sf64::from_i64(i64::from(iter));
    let t = if total_iters > 0 {
        it / Sf64::from_i64(i64::from(total_iters))
    } else {
        Sf64::ZERO
    };
    let sign = |positive: bool| Sf64::from_i64(if positive { 1 } else { -1 });
    let tie = |_| {
        JsError::Domain(format!(
            "applyShapePull: Math.round argument within 2^-40 of a tie at iter {iter}"
        ))
    };
    let (target, margin) = match shape {
        Shape::Linear => (candidate_cp, None),
        Shape::Branch => {
            let pull = Sf64::from_i64(64) * t * sign(iter % 2 == 0);
            (candidate_cp + pull.js_round(), None)
        }
        Shape::Spiral => {
            let r = round_sin(0, 32, it * SEVEN_TENTHS).map_err(tie)?;
            (candidate_cp + r.value, Some(r.margin))
        }
        Shape::Fold => {
            let r = round_cos(0, 48, it * FOUR_TENTHS).map_err(tie)?;
            (candidate_cp + r.value, Some(r.margin))
        }
        Shape::Cascade => ((c * (Sf64::ONE - t * ONE_TENTH)).js_round(), None),
        Shape::Ring => {
            let x = it * PI / Sf64::from_i64(4);
            let r = round_sin(candidate_cp, 16, x).map_err(tie)?;
            (r.value, Some(r.margin))
        }
        Shape::Star => {
            let pull = Sf64::from_i64(96) * sign(iter % 4 == 0) * t;
            (candidate_cp + pull.js_round(), None)
        }
        Shape::Fractal => ((c / (Sf64::ONE + ONE_TENTH * t)).js_round(), None),
    };
    Ok((target.clamp(2, 1023), margin))
}

/// `0.7` (hrm-slow-fast.mjs:109).
pub const SEVEN_TENTHS: Sf64 = Sf64::from_bits(0x3fe6_6666_6666_6666);
/// `0.4` (hrm-slow-fast.mjs:110).
pub const FOUR_TENTHS: Sf64 = Sf64::from_bits(0x3fd9_9999_9999_999a);
/// `0.1` (hrm-slow-fast.mjs:111,114).
pub const ONE_TENTH: Sf64 = Sf64::from_bits(0x3fb9_9999_9999_999a);
/// `Math.PI` (hrm-slow-fast.mjs:112).
pub const PI: Sf64 = Sf64::from_bits(0x4009_21fb_5444_2d18);

/// One `path` row of [`fast_loop_refine_position`] (hrm-slow-fast.mjs:90).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PathStep {
    /// `iter`.
    pub iter: u32,
    /// `cp` after the shape pull.
    pub cp: i64,
    /// `divisor` chosen by `vonMangoldtNext`.
    pub divisor: i64,
}

/// `fastLoopRefinePosition` output (hrm-slow-fast.mjs:92-98).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FastLoop {
    /// `shape`.
    pub shape: Shape,
    /// `iterations`.
    pub iterations: u32,
    /// `final_cp`.
    pub final_cp: i64,
    /// `path`.
    pub path: Vec<PathStep>,
}

/// `fastLoopRefinePosition({ shape, currentCp, iterations = 15, seed = 0 })`
/// (hrm-slow-fast.mjs:81-99) for an integer `currentCp`.
pub fn fast_loop_refine_position(
    shape: &str,
    current_cp: i64,
    iterations: u32,
    seed: u32,
) -> Result<FastLoop, JsError> {
    refine(shape, current_cp, iterations, seed).map(|(run, _)| run)
}

/// Verification only, not part of upstream's result: the smallest distance of a trig
/// `Math.round` argument from a tie over the [`fast_loop_refine_position`] run with the same
/// arguments, in units of 2^-112 (`None` when the shape calls no `Math.sin` / `Math.cos`).
pub fn fast_loop_tie_margin(
    shape: &str,
    current_cp: i64,
    iterations: u32,
    seed: u32,
) -> Result<Option<u128>, JsError> {
    refine(shape, current_cp, iterations, seed).map(|(_, margin)| margin)
}

fn refine(
    shape: &str,
    current_cp: i64,
    iterations: u32,
    seed: u32,
) -> Result<(FastLoop, Option<u128>), JsError> {
    let shape = Shape::from_name(shape).ok_or_else(|| {
        JsError::Range(format!(
            "fastLoopRefinePosition: shape must be one of {}",
            SHAPES.join(",")
        ))
    })?;
    if iterations > MAX_ITERATIONS || iterations >= MAX_STEP {
        return Err(JsError::Domain(format!(
            "fastLoopRefinePosition: iterations {iterations} above the ported {MAX_ITERATIONS}"
        )));
    }
    if iterations > 0 && current_cp >= MAX_CP {
        return Err(JsError::Domain(format!(
            "fastLoopRefinePosition: currentCp {current_cp} not below the ported 2^52"
        )));
    }
    let mut cp = current_cp;
    let mut path = Vec::with_capacity(iterations as usize);
    let mut min_tie_margin: Option<u128> = None;
    for i in 0..iterations {
        let candidate = von_mangoldt_next(cp, seed, i);
        let (pulled, margin) = apply_shape_pull(candidate.next, shape, i, iterations)?;
        cp = pulled;
        if let Some(m) = margin {
            min_tie_margin = Some(min_tie_margin.map_or(m, |old| old.min(m)));
        }
        path.push(PathStep {
            iter: i,
            cp,
            divisor: candidate.divisor,
        });
    }
    let run = FastLoop {
        shape,
        iterations,
        final_cp: cp,
        path,
    };
    Ok((run, min_tie_margin))
}

/// One head of [`hrm_shaped_prediction`] (hrm-slow-fast.mjs:134-139).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HrmHead {
    /// `head_index`.
    pub head_index: u32,
    /// `head_seed`.
    pub head_seed: u32,
    /// `cp_predicted`.
    pub cp_predicted: i64,
    /// `bh_coord_predicted`.
    pub bh_coord_predicted: Vec<i64>,
}

/// `hrmShapedPrediction` output (hrm-slow-fast.mjs:141-148).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HrmPrediction {
    /// `shape`.
    pub shape: Shape,
    /// `shape_params`.
    pub shape_params: ShapeRecord,
    /// `cp_start`.
    pub cp_start: i64,
    /// `k`.
    pub k: u32,
    /// `heads`.
    pub heads: Vec<HrmHead>,
}

/// Arguments of [`hrm_shaped_prediction`]; `None` is an absent key (default as upstream).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct HrmArgs {
    /// `envelopeType`.
    pub envelope_type: Option<String>,
    /// `currentCp`.
    pub current_cp: i64,
    /// `history` (each row's `bh_coord`).
    pub history: Vec<Option<Vec<i64>>>,
    /// `k` (default 4).
    pub k: Option<u32>,
    /// `fastIters` (default 15).
    pub fast_iters: Option<u32>,
    /// `seed` (default 0).
    pub seed: Option<u32>,
}

/// `hrmShapedPrediction({ envelopeType, agentProf, currentCp, history = [], k = 4,
/// fastIters = 15, seed = 0 })` (hrm-slow-fast.mjs:122-149).
pub fn hrm_shaped_prediction(args: &HrmArgs) -> Result<HrmPrediction, JsError> {
    let k = args.k.unwrap_or(4);
    let fast_iters = args.fast_iters.unwrap_or(15);
    let seed = args.seed.unwrap_or(0);
    if k >= MAX_HEADS {
        return Err(JsError::Domain(format!(
            "hrmShapedPrediction: k {k} not below the ported 2^21"
        )));
    }
    let shape = slow_loop_predict_shape(
        args.envelope_type.as_deref(),
        args.current_cp,
        &args.history,
    );
    let mut heads = Vec::with_capacity(k as usize);
    for h in 0..k {
        let head_seed = head_seed(seed, h);
        let refined =
            fast_loop_refine_position(shape.shape.name(), args.current_cp, fast_iters, head_seed)?;
        let bh = hilbert_decode(refined.final_cp.clamp(0, 4095), 3, 4)?;
        heads.push(HrmHead {
            head_index: h,
            head_seed,
            cp_predicted: refined.final_cp,
            bh_coord_predicted: bh,
        });
    }
    Ok(HrmPrediction {
        shape: shape.shape,
        shape_params: shape,
        cp_start: args.current_cp,
        k,
        heads,
    })
}
