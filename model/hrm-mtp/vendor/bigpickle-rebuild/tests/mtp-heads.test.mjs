// Unit tests for MTP heads — K parallel zeta-process prediction (Layer 4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mtpHeads,
  preWarmCandidates,
  measureHitRate,
} from '../src/mtp-heads.mjs';

// === mtpHeads =============================================================

test('mtpHeads returns k heads for cp0=500 depth=1', () => {
  const out = mtpHeads(500, { k: 4, depth: 1, seed: 0 });
  assert.equal(out.k, 4);
  assert.equal(out.depth, 1);
  assert.equal(out.cp_start, 500);
  assert.equal(out.heads.length, 4);
  assert.equal(out.algorithm, 'mtp-heads-zeta-parallel.v1');
  for (const h of out.heads) {
    assert.equal(typeof h.cp_predicted, 'number');
    assert.equal(h.bh_coord_predicted.length, 3); // BH_DIMS = 3
    assert.equal(h.trajectory.length, 1);          // depth = 1
  }
});

test('mtpHeads heads have distinct seeds', () => {
  const out = mtpHeads(500, { k: 4 });
  const seeds = new Set(out.heads.map((h) => h.head_seed));
  assert.equal(seeds.size, 4);
});

test('mtpHeads cp0=500 depth=1 diverges across heads (healthy band)', () => {
  // Per ZETA HONEST_GAPS: healthy band cp∈[~50,~900], depth≤2.
  const out = mtpHeads(500, { k: 4, depth: 1, seed: 0 });
  const finals = new Set(out.heads.map((h) => h.cp_predicted));
  assert.ok(finals.size >= 2, `expected head divergence, got ${finals.size} unique`);
});

test('mtpHeads is reproducible for same (cp0, k, depth, seed)', () => {
  const a = mtpHeads(500, { k: 4, depth: 1, seed: 99 });
  const b = mtpHeads(500, { k: 4, depth: 1, seed: 99 });
  assert.deepEqual(a, b);
});

test('mtpHeads throws on invalid k', () => {
  assert.throws(() => mtpHeads(500, { k: 0 }), RangeError);
  assert.throws(() => mtpHeads(500, { k: -1 }), RangeError);
  assert.throws(() => mtpHeads(500, { k: 1.5 }), RangeError);
});

test('mtpHeads throws on invalid depth', () => {
  assert.throws(() => mtpHeads(500, { k: 4, depth: 0 }), RangeError);
  assert.throws(() => mtpHeads(500, { k: 4, depth: -1 }), RangeError);
});

test('mtpHeads default k=4 when omitted', () => {
  const out = mtpHeads(500);
  assert.equal(out.heads.length, 4);
});

// === preWarmCandidates ====================================================

test('preWarmCandidates returns k candidates with bh_coord', () => {
  const out = preWarmCandidates({ cp0: 500, k: 4, depth: 1, seed: 0, profPid: 'TEST-PID' });
  assert.equal(out.algorithm, 'mtp-prewarm-candidates.v1');
  assert.equal(out.prof_pid, 'TEST-PID');
  assert.equal(out.candidates.length, 4);
  for (const c of out.candidates) {
    assert.equal(typeof c.cp, 'number');
    assert.equal(c.bh_coord.length, 3);
    assert.equal(c.depth, 1);
  }
});

test('preWarmCandidates default arguments', () => {
  const out = preWarmCandidates({ cp0: 500 });
  assert.equal(out.candidates.length, 4);
  assert.equal(out.prof_pid, '');
});

// === measureHitRate =======================================================

test('measureHitRate full hit returns 1.0', () => {
  const predicted = [[1, 2, 3], [4, 5, 6]];
  const actual = [[1, 2, 3], [4, 5, 6]];
  const r = measureHitRate(predicted, actual);
  assert.equal(r.hit_rate, 1);
  assert.equal(r.hits, 2);
  assert.equal(r.total, 2);
});

test('measureHitRate partial hit', () => {
  const predicted = [[1, 2, 3]];
  const actual = [[1, 2, 3], [9, 9, 9]];
  const r = measureHitRate(predicted, actual);
  assert.equal(r.hit_rate, 0.5);
  assert.equal(r.hits, 1);
  assert.equal(r.total, 2);
});

test('measureHitRate zero hit', () => {
  const r = measureHitRate([[1, 1, 1]], [[2, 2, 2]]);
  assert.equal(r.hit_rate, 0);
  assert.equal(r.hits, 0);
});

test('measureHitRate empty actual returns 0', () => {
  const r = measureHitRate([[1, 2, 3]], []);
  assert.equal(r.hit_rate, 0);
  assert.equal(r.hits, 0);
  assert.equal(r.total, 0);
});

test('measureHitRate invalid inputs return note', () => {
  const r = measureHitRate(null, null);
  assert.equal(r.hit_rate, 0);
  assert.equal(r.note, 'invalid inputs');
});
