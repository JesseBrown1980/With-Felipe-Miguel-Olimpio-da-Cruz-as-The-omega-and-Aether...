import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultSeeds, runComparison } from '../src/qprism-experiment.mjs';

test('defaultSeeds returns stable seed ids', () => {
  assert.deepEqual(defaultSeeds(3), ['qprism-000', 'qprism-001', 'qprism-002']);
});

test('runComparison summarizes all policies', () => {
  const result = runComparison({ seeds: defaultSeeds(4), steps: 8 });
  assert.equal(result.schema, 'qprism.compare.v1');
  assert.equal(Object.keys(result.policies).sort().join(','), 'classical,prism,random');
  assert.equal(result.policies.classical.trials, 4);
  assert.ok(['classical', 'prism', 'random'].includes(result.winner));
  assert.match(result.ledgerRow, /^QPRISM_COMPARE\|/);
  assert.match(result.ledgerRow, /\|evidence=MEASURED_SIM\|/);
});
