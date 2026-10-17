// Unit tests for HRM slow/fast — Hierarchical Reasoning Model (Layer 3).
// Deterministic stub; full model lives at D:/Asolaria-HRM/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHAPES,
  slowLoopPredictShape,
  fastLoopRefinePosition,
  hrmShapedPrediction,
} from '../src/hrm-slow-fast.mjs';

// === SHAPES canon =========================================================

test('SHAPES is frozen and contains 8 canonical shapes', () => {
  assert.ok(Object.isFrozen(SHAPES));
  assert.equal(SHAPES.length, 8);
  for (const s of ['linear', 'branch', 'spiral', 'fold', 'cascade', 'ring', 'star', 'fractal']) {
    assert.ok(SHAPES.includes(s));
  }
});

// === slowLoopPredictShape =================================================

test('slowLoopPredictShape classifies cascade envelope', () => {
  const r = slowLoopPredictShape({ envelopeType: 'cascade-fanout', currentCp: 500 });
  assert.equal(r.shape, 'cascade');
});

test('slowLoopPredictShape classifies wave-spawn as star', () => {
  const r = slowLoopPredictShape({ envelopeType: 'wave-spawn', currentCp: 500 });
  assert.equal(r.shape, 'star');
  assert.equal(r.branching_factor, 4);
});

test('slowLoopPredictShape classifies revolver as ring', () => {
  const r = slowLoopPredictShape({ envelopeType: 'revolver-rotation', currentCp: 500 });
  assert.equal(r.shape, 'ring');
});

test('slowLoopPredictShape classifies wave-nesting as fractal', () => {
  const r = slowLoopPredictShape({ envelopeType: 'wave-nesting', currentCp: 500 });
  assert.equal(r.shape, 'fractal');
});

test('slowLoopPredictShape classifies branch envelope', () => {
  const r = slowLoopPredictShape({ envelopeType: 'fork-branch', currentCp: 500 });
  assert.equal(r.shape, 'branch');
  assert.equal(r.branching_factor, 2);
});

test('slowLoopPredictShape defaults to linear for unknown envelope', () => {
  const r = slowLoopPredictShape({ envelopeType: 'totally-unknown-type', currentCp: 500 });
  assert.equal(r.shape, 'linear');
  assert.equal(r.branching_factor, 1);
});

test('slowLoopPredictShape axis_bias matches cp band', () => {
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 400 }).axis_bias, 'helm');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 500 }).axis_bias, 'vector');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 600 }).axis_bias, 'rook');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 750 }).axis_bias, 'forge');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 850 }).axis_bias, 'falcon');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 950 }).axis_bias, 'livefree');
  assert.equal(slowLoopPredictShape({ envelopeType: 'x', currentCp: 300 }).axis_bias, 'gaia');
});

test('slowLoopPredictShape history fallback flags linear when stable axis', () => {
  const history = [
    { bh_coord: [1, 5, 5] },
    { bh_coord: [2, 5, 5] },
    { bh_coord: [3, 5, 5] },
  ];
  const r = slowLoopPredictShape({ envelopeType: 'no-match', currentCp: 500, history });
  assert.equal(r.shape, 'linear');
});

// === fastLoopRefinePosition ===============================================

test('fastLoopRefinePosition returns path and bounded final_cp for linear', () => {
  const r = fastLoopRefinePosition({ shape: 'linear', currentCp: 500, iterations: 5, seed: 0 });
  assert.equal(r.shape, 'linear');
  assert.equal(r.iterations, 5);
  assert.equal(r.path.length, 5);
  assert.ok(r.final_cp >= 2 && r.final_cp <= 1023);
});

test('fastLoopRefinePosition supports all 8 shapes', () => {
  for (const shape of SHAPES) {
    const r = fastLoopRefinePosition({ shape, currentCp: 500, iterations: 3, seed: 0 });
    assert.equal(r.shape, shape);
    assert.ok(r.final_cp >= 2 && r.final_cp <= 1023, `${shape}: final_cp out of band ${r.final_cp}`);
  }
});

test('fastLoopRefinePosition throws on unknown shape', () => {
  assert.throws(
    () => fastLoopRefinePosition({ shape: 'not-a-shape', currentCp: 500 }),
    RangeError,
  );
});

test('fastLoopRefinePosition is deterministic for same (shape, cp, iters, seed)', () => {
  const a = fastLoopRefinePosition({ shape: 'spiral', currentCp: 500, iterations: 8, seed: 42 });
  const b = fastLoopRefinePosition({ shape: 'spiral', currentCp: 500, iterations: 8, seed: 42 });
  assert.deepEqual(a, b);
});

// === hrmShapedPrediction (full F4) ========================================

test('hrmShapedPrediction returns k heads with shape + bh_coord', () => {
  const r = hrmShapedPrediction({
    envelopeType: 'cascade-fanout',
    agentProf: 'VEC',
    currentCp: 500,
    k: 4,
    fastIters: 5,
    seed: 0,
  });
  assert.equal(r.algorithm, 'hrm-shaped-prediction-stub.v1');
  assert.equal(r.shape, 'cascade');
  assert.equal(r.cp_start, 500);
  assert.equal(r.k, 4);
  assert.equal(r.heads.length, 4);
  for (const h of r.heads) {
    assert.equal(typeof h.cp_predicted, 'number');
    assert.equal(h.bh_coord_predicted.length, 3);
  }
});

test('hrmShapedPrediction is reproducible for same args', () => {
  const args = { envelopeType: 'revolver', agentProf: 'X', currentCp: 600, k: 3, fastIters: 4, seed: 11 };
  const a = hrmShapedPrediction(args);
  const b = hrmShapedPrediction(args);
  assert.deepEqual(a, b);
});

test('hrmShapedPrediction propagates shape from slow loop', () => {
  const r = hrmShapedPrediction({
    envelopeType: 'wave-nesting',
    currentCp: 500,
    k: 2,
    fastIters: 3,
  });
  assert.equal(r.shape, 'fractal');
});
