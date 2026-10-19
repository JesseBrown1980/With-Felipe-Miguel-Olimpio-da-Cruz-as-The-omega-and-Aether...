import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProbe, QUANT_TUPLE_BYTES, scheduleFromTuple } from '../src/qprism-quant-chunk.mjs';

test('SpanishBCBL quant probe emits a fixed 3.1KB tuple', () => {
  const probe = buildProbe();
  assert.equal(probe.tuple.length, QUANT_TUPLE_BYTES);
  assert.match(probe.ledgerRow, /raw_in_repo=0/);
  assert.match(probe.ledgerRow, /derived_only=1/);
  assert.match(probe.ledgerRow, /claim=metadata_prior_not_neural_decode/);
  assert.match(probe.ledgerRow, /quant_anchor=ASOLARIA_QUANT8_HUGE_MESSAGE_BENCH/);
  assert.match(probe.ledgerRow, /referential_control_tuple_not_raw_reconstruction_not_gate_proof/);
});

test('quant tuple deterministically produces bounded schedules', () => {
  const probe = buildProbe();
  const a = scheduleFromTuple(probe.tuple, 4);
  const b = scheduleFromTuple(probe.tuple, 4);
  assert.deepEqual(a, b);
  for (const s of a) {
    assert.ok(s.p2Mw >= 1 && s.p2Mw <= 60);
    assert.ok(s.velocityCenterMps >= 70 && s.velocityCenterMps <= 250);
    assert.ok(s.massCenterKDa >= 118 && s.massCenterKDa <= 226);
  }
});
