import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CALIBRATION_ROWS,
  D,
  quant8,
  runLiveBenchmark,
  tupleBuffer,
} from '../tools/behcs/quant-huge-message-benchmark.mjs';

test('quant bench definition rows are HBP-only and honestly tagged', () => {
  assert.ok(CALIBRATION_ROWS.length >= 10);
  assert.ok(CALIBRATION_ROWS.every((row) => row.endsWith('json=0')));
  assert.ok(CALIBRATION_ROWS.every((row) => !row.includes('{"')));
  assert.ok(CALIBRATION_ROWS.some((row) => row.includes('FAITHFUL_TO_DOCTRINE_NOT_FABRIC_ENGINE_BINDING')));
  assert.ok(CALIBRATION_ROWS.some((row) => row.includes('fidelity=UNSWEPT')));
  assert.ok(CALIBRATION_ROWS.some((row) => row.includes('DRAFT_UNTIL_LIRIS_RERUN_AND_FIDELITY_SWEEP')));
});

test('quant8 is deterministic and the tuple is constant-size regardless of message size', () => {
  const small = new Float64Array(1024); for (let i = 0; i < small.length; i += 1) small[i] = Math.sin(i);
  const large = new Float64Array(65536); for (let i = 0; i < large.length; i += 1) large[i] = Math.cos(i);
  const q1 = quant8(small);
  const q2 = quant8(small);
  assert.deepEqual(Array.from(q1.turbo), Array.from(q2.turbo));
  assert.equal(q1.scale, q2.scale);
  assert.equal(tupleBuffer(quant8(small)).length, tupleBuffer(quant8(large)).length);
  assert.equal(q1.turbo.length, D);
});

test('live smoke runs disk-free and emits HBP rows', () => {
  const rows = runLiveBenchmark({ sizesMB: [1], disk: false });
  assert.equal(rows[0], 'QUANTBENCHLIVEHDR|sizes_mb=1|disk=0|D=1024|json=0');
  assert.ok(rows.every((row) => row.endsWith('json=0')));
  assert.ok(rows.some((row) => row.includes('message_mb=1') && row.includes('payload_kb=')));
});
