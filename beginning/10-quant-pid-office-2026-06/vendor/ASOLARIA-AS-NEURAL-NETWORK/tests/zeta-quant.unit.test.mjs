import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { classifyBhIndex } from '../tools/behcs/token-cube-catalog-binder.mjs';
import {
  emitParityRows,
  forcingSweep,
  selfTest,
  zetaClassify,
  zetaTransition,
} from '../tools/behcs/zeta-quant.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('zeta self-test passes all checks', () => {
  assert.equal(selfTest().ok, true);
});

test('lane agrees with the binder across the shared domain (cross-import consistency)', () => {
  for (let i = 0; i <= 5000; i += 1) {
    const z = zetaClassify(i);
    const b = classifyBhIndex(i);
    assert.equal(z.lane, b.lane, `lane mismatch at ${i}`);
    assert.equal(z.ppow, b.ppow, `ppow mismatch at ${i}`);
  }
});

test('the forcing law re-proves 9589/9589 with zero violations', () => {
  const s = forcingSweep();
  assert.equal(s.primes, 9592);
  assert.equal(s.primes_gt3, 9590);
  assert.equal(s.pairs, 9589);
  assert.equal(s.violations, 0);
  assert.equal(s.gap_mod6_0 + s.gap_mod6_2 + s.gap_mod6_4, 9589);
});

test('small primes 2 and 3 are explicit exceptions, never on residence lanes', () => {
  assert.equal(zetaClassify(2).prime_residence, 'small-prime-exception');
  assert.equal(zetaClassify(3).prime_residence, 'small-prime-exception');
  assert.equal(zetaTransition(3, 5).verdict, 'NOT_APPLICABLE');
});

test('validator is necessary-not-sufficient: catches corrupted external lanes only', () => {
  // a true twin pair never violates from self-computed lanes
  assert.equal(zetaTransition(11, 13).verdict, 'FORCED_CONSISTENT');
  // a corrupted recorded lane is caught
  assert.equal(zetaTransition(11, 13, { claimedLaneB: 2 }).verdict, 'FORCING_VIOLATION');
  // HBP records parse as strings, so canonical string lanes must be checked too
  assert.equal(zetaTransition(11, 13, { claimedLaneB: '2' }).verdict, 'FORCING_VIOLATION');
  assert.equal(zetaTransition(11, 13, { claimedLaneA: '2', claimedLaneB: '1' }).verdict, 'FORCED_CONSISTENT');
  // malformed supplied lanes are corruption, not absence
  assert.equal(zetaTransition(11, 13, { claimedLaneB: 'lane2' }).verdict, 'FORCING_VIOLATION');
  // non-prime inputs are not-applicable, never violation
  assert.equal(zetaTransition(4, 6).verdict, 'NOT_APPLICABLE');
});

test('regenerated parity rows byte-match the sealed baseline (STEP166 pattern)', () => {
  const baseline = readFileSync(join(repo, 'docs/ZETA-QUANT-PARITY-BASELINE-2026-06-11.hbp'), 'utf8');
  assert.equal(emitParityRows().join('\n') + '\n', baseline);
});

test('every parity row is HBP-only', () => {
  assert.ok(emitParityRows().every((row) => row.endsWith('json=0') && !row.includes('{"')));
});
