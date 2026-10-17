// MTP heads — Multi-Token Prediction layer.
// K parallel zeta-process branches predicting next K cp positions.
//
// Spec: layer 4 of the prediction-capable federation stack
//   Layer 1: Brown-Hilbert curves (hilbert.mjs)
//   Layer 2: ZETA process (zeta-process.mjs)
//   Layer 3: HRM shape/form (hrm-slow-fast.mjs)
//   Layer 4: MTP heads (THIS FILE) — K parallel concurrency
//   Layer 5: Triple-quant transport (Polar/Turbo/JL via hyperbehcs-core.cjs)
//
// Google MTP analog: multi-head predicts k next tokens in shared latent space.
// Geometric attention analog: positions co-embedded.
// Federation application: pre-warm K revolver chambers BEFORE envelopes arrive.
//
// Pure functions. No hidden state. No I/O. Codex-resistant.

import { predictKPositions, vonMangoldtNext } from './zeta-process.mjs';
import { hilbertDecode } from './hilbert.mjs';

const DEFAULT_K = 4;
const BH_DIMS = 3;
const BH_BITS = 4; // 16-cell-per-axis cube → 4096 cells total

function cpToBhCoord(cp, opts = {}) {
  const dim = opts.dim ?? BH_DIMS;
  const bits = opts.bits ?? BH_BITS;
  const maxIdx = (1 << (bits * dim)) - 1;
  const idx = Math.max(0, Math.min(maxIdx, cp));
  return hilbertDecode(idx, { dimensions: dim, bits });
}

// === MTP: K parallel zeta heads ==========================================

export function mtpHeads(cp0, opts = {}) {
  const k = opts.k ?? DEFAULT_K;
  const depth = opts.depth ?? 1;
  const seed = opts.seed ?? 0;
  if (!Number.isInteger(k) || k < 1) throw new RangeError('mtpHeads: k must be >= 1');
  if (!Number.isInteger(depth) || depth < 1) throw new RangeError('mtpHeads: depth must be >= 1');

  const heads = [];
  for (let h = 0; h < k; h++) {
    const headSeed = (seed ^ (h * 0x9e3779b1)) >>> 0;
    const trajectory = predictKPositions(cp0, depth, { seed: headSeed });
    const finalCp = trajectory.final_cp;
    const finalBh = cpToBhCoord(finalCp, opts);
    heads.push({
      head_index: h,
      head_seed: headSeed,
      depth,
      cp_predicted: finalCp,
      bh_coord_predicted: finalBh,
      trajectory: trajectory.trajectory,
    });
  }

  return {
    algorithm: 'mtp-heads-zeta-parallel.v1',
    cp_start: cp0,
    k,
    depth,
    seed,
    heads,
    final_positions: heads.map((h) => h.bh_coord_predicted),
  };
}

// === Pre-warm decision helper =============================================
// Given current envelope + agent prof, return K candidate chamber-PIDs ready
// for pre-allocation. The revolver consumes these and assigns chambers
// BEFORE the agent's next K envelopes arrive.

export function preWarmCandidates({ cp0, k = DEFAULT_K, depth = 1, seed = 0, profPid = '' } = {}) {
  const prediction = mtpHeads(cp0, { k, depth, seed });
  return {
    algorithm: 'mtp-prewarm-candidates.v1',
    prof_pid: profPid,
    candidates: prediction.heads.map((h) => ({
      head_index: h.head_index,
      cp: h.cp_predicted,
      bh_coord: h.bh_coord_predicted,
      depth,
    })),
  };
}

// === Hit-rate measurement helper ==========================================
// Given a set of predicted positions and the actual emitted positions,
// compute top-K accuracy (how many actual positions appear in the predicted set).

export function measureHitRate(predicted, actual) {
  if (!Array.isArray(predicted) || !Array.isArray(actual)) {
    return { hit_rate: 0, hits: 0, total: 0, note: 'invalid inputs' };
  }
  const predSet = new Set(predicted.map((p) => JSON.stringify(p)));
  let hits = 0;
  for (const a of actual) {
    if (predSet.has(JSON.stringify(a))) hits++;
  }
  return {
    algorithm: 'mtp-hit-rate.v1',
    hit_rate: actual.length > 0 ? hits / actual.length : 0,
    hits,
    total: actual.length,
    predicted_set_size: predSet.size,
  };
}
