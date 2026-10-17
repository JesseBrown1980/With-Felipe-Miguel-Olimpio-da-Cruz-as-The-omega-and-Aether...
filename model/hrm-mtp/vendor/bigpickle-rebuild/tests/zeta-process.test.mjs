// Unit tests for ZETA process — von Mangoldt chain (Layer 2 of triad).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vonMangoldt,
  nuLambda,
  nuLambdaTable,
  bandWeight,
  vonMangoldtNext,
  predictKPositions,
  chainAntichainBound,
  HONEST_GAPS,
} from '../src/zeta-process.mjs';

// === vonMangoldt =========================================================

test('vonMangoldt of prime p returns log(p)', () => {
  assert.equal(vonMangoldt(2), Math.log(2));
  assert.equal(vonMangoldt(3), Math.log(3));
  assert.equal(vonMangoldt(7), Math.log(7));
});

test('vonMangoldt of prime power p^a returns log(p)', () => {
  assert.equal(vonMangoldt(4), Math.log(2));    // 2^2
  assert.equal(vonMangoldt(8), Math.log(2));    // 2^3
  assert.equal(vonMangoldt(9), Math.log(3));    // 3^2
  assert.equal(vonMangoldt(27), Math.log(3));   // 3^3
});

test('vonMangoldt of composite non-prime-power returns 0', () => {
  assert.equal(vonMangoldt(6), 0);    // 2*3
  assert.equal(vonMangoldt(12), 0);   // 2^2 * 3
  assert.equal(vonMangoldt(15), 0);   // 3*5
});

test('vonMangoldt rejects invalid inputs', () => {
  assert.equal(vonMangoldt(0), 0);
  assert.equal(vonMangoldt(1), 0);
  assert.equal(vonMangoldt(-5), 0);
  assert.equal(vonMangoldt(2.5), 0);
  assert.equal(vonMangoldt('x'), 0);
});

// === nuLambda (invariant measure 1 / (cp · log cp)) ======================

test('nuLambda returns 1/(cp * log cp) for cp >= 2', () => {
  assert.equal(nuLambda(2), 1 / (2 * Math.log(2)));
  assert.equal(nuLambda(10), 1 / (10 * Math.log(10)));
});

test('nuLambda returns 0 for cp < 2 or non-finite', () => {
  assert.equal(nuLambda(0), 0);
  assert.equal(nuLambda(1), 0);
  assert.equal(nuLambda(-3), 0);
  assert.equal(nuLambda(NaN), 0);
  assert.equal(nuLambda(Infinity), 0);
});

test('nuLambdaTable fills entries 2..maxCp and zeros below', () => {
  const t = nuLambdaTable(10);
  assert.equal(t.length, 11);
  assert.equal(t[0], 0);
  assert.equal(t[1], 0);
  assert.equal(t[2], nuLambda(2));
  assert.equal(t[10], nuLambda(10));
});

test('bandWeight is the sum of nuLambda over [start, end]', () => {
  const w = bandWeight(2, 10);
  let expected = 0;
  for (let cp = 2; cp <= 10; cp++) expected += nuLambda(cp);
  assert.equal(w, expected);
  assert.ok(w > 0);
});

// === vonMangoldtNext (deterministic seeded sampler) ======================

test('vonMangoldtNext is deterministic for same (seed, step)', () => {
  const a = vonMangoldtNext(500, { seed: 42, step: 0 });
  const b = vonMangoldtNext(500, { seed: 42, step: 0 });
  assert.deepEqual(a, b);
});

test('vonMangoldtNext varies across distinct seeds (statistical)', () => {
  // Sweep cp [50,500] × distinct seeds. RNG working ⇒ some pair must diverge.
  let differs = 0;
  for (let cp = 50; cp < 500; cp++) {
    const a = vonMangoldtNext(cp, { seed: 0x12345, step: 0 });
    const b = vonMangoldtNext(cp, { seed: 0x98765, step: 0 });
    if (a.next !== b.next || a.divisor !== b.divisor) differs++;
  }
  assert.ok(differs > 0, `expected divergence across seeds, got ${differs}/450`);
});

test('vonMangoldtNext on cp < 2 returns reset to 2', () => {
  const r = vonMangoldtNext(1);
  assert.equal(r.next, 2);
  assert.equal(r.weight, 0);
  assert.match(r.reason, /reset/);
});

test('vonMangoldtNext cp=2 is the absorbing sink documented in HONEST_GAPS', () => {
  // Per HONEST_GAPS entry: only divisor>1 of 2 is 2; cp/2=1 → max(2,1)=2.
  const r = vonMangoldtNext(2, { seed: 0, step: 0 });
  assert.equal(r.next, 2);
  assert.equal(r.divisor, 2);
});

// === predictKPositions ====================================================

test('predictKPositions returns k-step trajectory', () => {
  const out = predictKPositions(500, 4, { seed: 7 });
  assert.equal(out.k, 4);
  assert.equal(out.cp_start, 500);
  assert.equal(out.trajectory.length, 4);
  assert.equal(out.seed, 7);
  assert.equal(out.algorithm, 'zeta-process-von-mangoldt-chain.v1');
});

test('predictKPositions is reproducible for same seed', () => {
  const a = predictKPositions(500, 4, { seed: 13 });
  const b = predictKPositions(500, 4, { seed: 13 });
  assert.deepEqual(a, b);
});

test('predictKPositions cp0=500 depth=1 stays in healthy band (divergence empirical)', () => {
  // Per HONEST_GAPS: cp0=500 depth=1 diverges cleanly (4/4 unique heads).
  // Reproduce: pump 4 distinct seeds, expect mostly unique final_cp values.
  const finals = new Set();
  for (let s = 0; s < 4; s++) finals.add(predictKPositions(500, 1, { seed: s }).final_cp);
  assert.ok(finals.size >= 2, `expected divergence at cp=500 depth=1, got ${finals.size} unique`);
});

test('predictKPositions throws on invalid k', () => {
  assert.throws(() => predictKPositions(500, 0), RangeError);
  assert.throws(() => predictKPositions(500, -1), RangeError);
  assert.throws(() => predictKPositions(500, 1.5), RangeError);
});

// === chainAntichainBound (Tao Prop. 7 citation) ==========================

test('chainAntichainBound returns 1/n required mass for n concurrent', () => {
  const b = chainAntichainBound(3);
  assert.equal(b.n_concurrent, 3);
  assert.equal(b.required_mass_per_pid, 1 / 3);
  assert.match(b.constructive_answer, /revolver/);
});

test('chainAntichainBound throws on invalid n', () => {
  assert.throws(() => chainAntichainBound(0), RangeError);
  assert.throws(() => chainAntichainBound(-1), RangeError);
});

// === HONEST_GAPS canon ====================================================

test('HONEST_GAPS is frozen and documents cp=2 sink', () => {
  assert.ok(Object.isFrozen(HONEST_GAPS));
  assert.ok(HONEST_GAPS.length >= 1);
  assert.ok(HONEST_GAPS.some((g) => /cp=2/.test(g) && /absorb/i.test(g)));
});
