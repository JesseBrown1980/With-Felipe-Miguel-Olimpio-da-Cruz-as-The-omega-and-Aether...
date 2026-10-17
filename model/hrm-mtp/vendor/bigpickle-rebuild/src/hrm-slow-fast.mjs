// HRM — Hierarchical Reasoning Model: slow-loop shape + fast-loop position.
// Layer 3 of the prediction-capable federation stack.
//
// Spec: project_w20qq_zeta_canon_ready_2026_05_25 (F4 spec) +
//       D:/Asolaria-HRM/ standalone repo (HEAD ac15626f, 2026-05-16)
//
// Two recurrent modules:
//   Slow module (high-level, few iterations) — predicts trajectory SHAPE/FORM
//   Fast module (low-level, many iterations per slow step) — refines position
//
// Federation shapes (operator canon — already in-system as strings):
//   linear  · branch · spiral · fold · cascade · ring · star · fractal
//
// This file is the DETERMINISTIC stub. Full HRM (trained model) lives at
// D:/Asolaria-HRM/. Stub uses envelope history + agent prof to deterministically
// classify shape, then composes with vonMangoldtNext from zeta-process.mjs.
//
// Pure functions. No model load at this layer.

import { vonMangoldtNext, predictKPositions } from './zeta-process.mjs';
import { hilbertDecode } from './hilbert.mjs';

export const SHAPES = Object.freeze([
  'linear',
  'branch',
  'spiral',
  'fold',
  'cascade',
  'ring',
  'star',
  'fractal',
]);

const SHAPE_SET = new Set(SHAPES);

// === Slow loop: shape classifier (deterministic stub) ====================

export function slowLoopPredictShape({ envelopeType, agentProf, currentCp, history = [] } = {}) {
  // Deterministic stub: shape is a function of (envelopeType, agentProf, history pattern).
  // When the HRM model is trained + wired (D:/Asolaria-HRM), this swaps in.
  // For now: pure-function classifier based on string patterns + history shape.

  const t = String(envelopeType || '').toLowerCase();
  if (t.includes('cascade') || t.includes('fanout')) return shapeRecord('cascade', currentCp);
  if (t.includes('bilateral') || t.includes('mirror')) return shapeRecord('linear', currentCp);
  if (t.includes('wave-spawn') || t.includes('star')) return shapeRecord('star', currentCp);
  if (t.includes('bus-relay') || t.includes('edge')) return shapeRecord('linear', currentCp);
  if (t.includes('revolver') || t.includes('rotation')) return shapeRecord('ring', currentCp);
  if (t.includes('cube-of-cubes') || t.includes('recursion')) return shapeRecord('fold', currentCp);
  if (t.includes('wave-nesting') || t.includes('fractal')) return shapeRecord('fractal', currentCp);
  if (t.includes('branch') || t.includes('fork')) return shapeRecord('branch', currentCp);

  // History-pattern fallback
  if (history.length >= 3) {
    const recent = history.slice(-3).map((h) => h.bh_coord || [0, 0, 0]);
    const sameAxis = recent.every((c) => c[0] === recent[0][0]) || recent.every((c) => c[1] === recent[0][1]);
    if (sameAxis) return shapeRecord('linear', currentCp);
  }

  return shapeRecord('linear', currentCp);
}

function shapeRecord(shape, currentCp) {
  return {
    algorithm: 'hrm-slow-loop-shape-stub.v1',
    shape,
    branching_factor: shape === 'star' ? 4 : shape === 'branch' ? 2 : 1,
    axis_bias: currentCp >= 384 && currentCp <= 479 ? 'helm' :
               currentCp >= 480 && currentCp <= 575 ? 'vector' :
               currentCp >= 576 && currentCp <= 703 ? 'rook' :
               currentCp >= 704 && currentCp <= 799 ? 'forge' :
               currentCp >= 800 && currentCp <= 895 ? 'falcon' :
               currentCp >= 896 && currentCp <= 1023 ? 'livefree' :
               currentCp >= 256 && currentCp <= 383 ? 'gaia' : 'cube_cubed_sealer',
    stub_note: 'deterministic-stub-pending-D:/Asolaria-HRM-model-wire',
  };
}

// === Fast loop: position refinement via zeta + shape pull ================

export function fastLoopRefinePosition({ shape, currentCp, iterations = 15, seed = 0 } = {}) {
  if (!SHAPE_SET.has(shape)) {
    throw new RangeError(`fastLoopRefinePosition: shape must be one of ${SHAPES.join(',')}`);
  }
  let cp = currentCp;
  const path = [];
  for (let i = 0; i < iterations; i++) {
    const candidate = vonMangoldtNext(cp, { seed, step: i });
    cp = applyShapePull(candidate.next, shape, i, iterations);
    path.push({ iter: i, cp, divisor: candidate.divisor });
  }
  return {
    algorithm: 'hrm-fast-loop-zeta-refine.v1',
    shape,
    iterations,
    final_cp: cp,
    path,
  };
}

function applyShapePull(candidateCp, shape, iter, totalIters) {
  // Pull candidate toward shape-S manifold. Deterministic + bounded [2, 1023].
  // Stub heuristic: shape biases the cp drift direction within BEHCS-1024 bands.
  const t = totalIters > 0 ? iter / totalIters : 0;
  let target;
  switch (shape) {
    case 'linear':   target = candidateCp; break;
    case 'branch':   target = candidateCp + Math.round(64 * t * (iter % 2 === 0 ? 1 : -1)); break;
    case 'spiral':   target = candidateCp + Math.round(32 * Math.sin(iter * 0.7)); break;
    case 'fold':     target = candidateCp + Math.round(48 * Math.cos(iter * 0.4)); break;
    case 'cascade':  target = Math.round(candidateCp * (1 - t * 0.1)); break;
    case 'ring':     target = Math.round(candidateCp + 16 * Math.sin(iter * Math.PI / 4)); break;
    case 'star':     target = candidateCp + Math.round(96 * (iter % 4 === 0 ? 1 : -1) * t); break;
    case 'fractal':  target = Math.round(candidateCp / (1 + 0.1 * t)); break;
    default:         target = candidateCp;
  }
  return Math.max(2, Math.min(1023, target));
}

// === Full F4: HRM-shaped K-position prediction ===========================

export function hrmShapedPrediction({ envelopeType, agentProf, currentCp, history = [], k = 4, fastIters = 15, seed = 0 } = {}) {
  const shape = slowLoopPredictShape({ envelopeType, agentProf, currentCp, history });
  const heads = [];
  for (let h = 0; h < k; h++) {
    const headSeed = (seed ^ (h * 0x9e3779b1)) >>> 0;
    const refined = fastLoopRefinePosition({
      shape: shape.shape,
      currentCp,
      iterations: fastIters,
      seed: headSeed,
    });
    const bh = hilbertDecode(Math.min(4095, Math.max(0, refined.final_cp)), { dimensions: 3, bits: 4 });
    heads.push({
      head_index: h,
      head_seed: headSeed,
      cp_predicted: refined.final_cp,
      bh_coord_predicted: bh,
    });
  }
  return {
    algorithm: 'hrm-shaped-prediction-stub.v1',
    shape: shape.shape,
    shape_params: shape,
    cp_start: currentCp,
    k,
    heads,
  };
}
