//! `mtp-heads.mjs` (Layer 4): K seeded zeta chains from one code point, each ending in a 3-D
//! Hilbert cell.

use crate::hilbert::hilbert_decode;
use crate::zeta::{predict_k_positions, TrajectoryStep};
use crate::JsError;
use l0_edge::jsnum::Dbl;

/// `DEFAULT_K` (mtp-heads.mjs:20).
pub const DEFAULT_K: i64 = 4;
/// `BH_DIMS` (mtp-heads.mjs:21).
pub const BH_DIMS: i64 = 3;
/// `BH_BITS` (mtp-heads.mjs:22).
pub const BH_BITS: i64 = 4;
/// `algorithm` of [`mtp_heads`] (mtp-heads.mjs:58).
pub const HEADS_ALGORITHM: &str = "mtp-heads-zeta-parallel.v1";
/// `algorithm` of [`pre_warm_candidates`] (mtp-heads.mjs:76).
pub const PREWARM_ALGORITHM: &str = "mtp-prewarm-candidates.v1";
/// `algorithm` of [`measure_hit_rate`] (mtp-heads.mjs:101).
pub const HIT_RATE_ALGORITHM: &str = "mtp-hit-rate.v1";

/// Head counts `k` below this bound keep every `h * 0x9e3779b1` exact in binary64.
pub const MAX_HEADS: u32 = 1 << 21;

/// `(seed ^ (h * 0x9e3779b1)) >>> 0` (mtp-heads.mjs:43, hrm-slow-fast.mjs:126) for `h < 2^21`,
/// where the product is exact in binary64; panics for a larger `h`.
pub fn head_seed(seed: u32, h: u32) -> u32 {
    assert!(h < MAX_HEADS, "head index below 2^21");
    seed ^ ((u64::from(h) * 0x9e37_79b1) as u32)
}

/// `cpToBhCoord(cp, opts)` (mtp-heads.mjs:24-30): `maxIdx = (1 << (bits * dim)) - 1` as an int32
/// shift, `idx = Math.max(0, Math.min(maxIdx, cp))`, then `hilbertDecode`.
pub fn cp_to_bh_coord(cp: i64, dim: i64, bits: i64) -> Result<Vec<i64>, JsError> {
    let shift = bits.saturating_mul(dim).rem_euclid(32) as u32;
    let max_idx = i64::from(1i32.wrapping_shl(shift)) - 1;
    hilbert_decode(cp.min(max_idx).max(0), dim, bits)
}

/// One head of [`mtp_heads`] (mtp-heads.mjs:47-54).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MtpHead {
    /// `head_index`.
    pub head_index: u32,
    /// `head_seed`.
    pub head_seed: u32,
    /// `depth`.
    pub depth: u32,
    /// `cp_predicted`.
    pub cp_predicted: i64,
    /// `bh_coord_predicted`.
    pub bh_coord_predicted: Vec<i64>,
    /// `trajectory`.
    pub trajectory: Vec<TrajectoryStep>,
}

/// `mtpHeads` output (mtp-heads.mjs:57-65).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MtpHeads {
    /// `cp_start`.
    pub cp_start: i64,
    /// `k`.
    pub k: u32,
    /// `depth`.
    pub depth: u32,
    /// `seed`.
    pub seed: u32,
    /// `heads`.
    pub heads: Vec<MtpHead>,
}

impl MtpHeads {
    /// `final_positions` (mtp-heads.mjs:64).
    pub fn final_positions(&self) -> Vec<Vec<i64>> {
        self.heads
            .iter()
            .map(|h| h.bh_coord_predicted.clone())
            .collect()
    }
}

/// Options of [`mtp_heads`]; `None` is an absent key (`??` default).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct MtpOptions {
    /// `k` (default 4).
    pub k: Option<i64>,
    /// `depth` (default 1).
    pub depth: Option<i64>,
    /// `seed` (default 0).
    pub seed: Option<u32>,
    /// `dim` for `cpToBhCoord` (default 3).
    pub dim: Option<i64>,
    /// `bits` for `cpToBhCoord` (default 4).
    pub bits: Option<i64>,
}

/// `mtpHeads(cp0, opts)` (mtp-heads.mjs:34-66).
pub fn mtp_heads(cp0: i64, opts: MtpOptions) -> Result<MtpHeads, JsError> {
    let k = opts.k.unwrap_or(DEFAULT_K);
    let depth = opts.depth.unwrap_or(1);
    let seed = opts.seed.unwrap_or(0);
    if k < 1 {
        return Err(JsError::Range("mtpHeads: k must be >= 1".to_string()));
    }
    if depth < 1 {
        return Err(JsError::Range("mtpHeads: depth must be >= 1".to_string()));
    }
    let k = u32::try_from(k)
        .ok()
        .filter(|&k| k < MAX_HEADS)
        .ok_or_else(|| JsError::Domain("mtpHeads: k below 2^21".to_string()))?;
    let (dim, bits) = (opts.dim.unwrap_or(BH_DIMS), opts.bits.unwrap_or(BH_BITS));
    let mut heads = Vec::with_capacity(k as usize);
    for h in 0..k {
        let head_seed = head_seed(seed, h);
        let trajectory = predict_k_positions(cp0, depth, head_seed)?;
        let final_cp = trajectory.final_cp;
        heads.push(MtpHead {
            head_index: h,
            head_seed,
            depth: trajectory.k,
            cp_predicted: final_cp,
            bh_coord_predicted: cp_to_bh_coord(final_cp, dim, bits)?,
            trajectory: trajectory.trajectory,
        });
    }
    Ok(MtpHeads {
        cp_start: cp0,
        k,
        depth: depth as u32,
        seed,
        heads,
    })
}

/// One candidate of [`pre_warm_candidates`] (mtp-heads.mjs:78-83).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PreWarmCandidate {
    /// `head_index`.
    pub head_index: u32,
    /// `cp`.
    pub cp: i64,
    /// `bh_coord`.
    pub bh_coord: Vec<i64>,
    /// `depth`.
    pub depth: u32,
}

/// `preWarmCandidates` output (mtp-heads.mjs:75-84).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PreWarmCandidates {
    /// `prof_pid`.
    pub prof_pid: String,
    /// `candidates`.
    pub candidates: Vec<PreWarmCandidate>,
}

/// `preWarmCandidates({ cp0, k = 4, depth = 1, seed = 0, profPid = '' })` (mtp-heads.mjs:73-85).
pub fn pre_warm_candidates(
    cp0: i64,
    k: i64,
    depth: i64,
    seed: u32,
    prof_pid: &str,
) -> Result<PreWarmCandidates, JsError> {
    let prediction = mtp_heads(
        cp0,
        MtpOptions {
            k: Some(k),
            depth: Some(depth),
            seed: Some(seed),
            ..MtpOptions::default()
        },
    )?;
    Ok(PreWarmCandidates {
        prof_pid: prof_pid.to_string(),
        candidates: prediction
            .heads
            .into_iter()
            .map(|h| PreWarmCandidate {
                head_index: h.head_index,
                cp: h.cp_predicted,
                bh_coord: h.bh_coord_predicted,
                depth: depth as u32,
            })
            .collect(),
    })
}

/// `measureHitRate` output (mtp-heads.mjs:100-106).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HitRate {
    /// `hit_rate` = `hits / actual.length`, or 0 for an empty `actual`.
    pub hit_rate: Dbl,
    /// `hits`.
    pub hits: u64,
    /// `total`.
    pub total: u64,
    /// `predicted_set_size`.
    pub predicted_set_size: u64,
}

/// `measureHitRate(predicted, actual)` (mtp-heads.mjs:91-107) for arrays of integer coordinates;
/// `JSON.stringify` of an integer array is equal for equal arrays, so set membership is equality.
pub fn measure_hit_rate(predicted: &[Vec<i64>], actual: &[Vec<i64>]) -> HitRate {
    let mut set: Vec<&Vec<i64>> = Vec::new();
    for p in predicted {
        if !set.contains(&p) {
            set.push(p);
        }
    }
    let hits = actual.iter().filter(|a| set.contains(a)).count() as u64;
    let total = actual.len() as u64;
    HitRate {
        hit_rate: if total > 0 {
            Dbl::from_ratio(hits, total)
        } else {
            Dbl::ZERO
        },
        hits,
        total,
        predicted_set_size: set.len() as u64,
    }
}
