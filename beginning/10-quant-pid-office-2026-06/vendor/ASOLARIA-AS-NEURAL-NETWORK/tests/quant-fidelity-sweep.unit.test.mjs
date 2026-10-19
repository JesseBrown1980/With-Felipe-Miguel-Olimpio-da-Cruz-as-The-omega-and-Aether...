import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  FAMILIES,
  RHO_LEVELS,
  sweep,
  sweepCell,
} from '../tools/behcs/quant-fidelity-sweep.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('sweep definition rows are HBP-only and spec-anchored', () => {
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('json=0')));
  assert.ok(DEFINITION_ROWS.every((row) => !row.includes('{"')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('QUANTFIDELITYSPEC8-2026-06-11.hbp')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('promotion_min=200')));
});

test('sweepCell is deterministic: identical rows on repeated runs', () => {
  const a = sweepCell(16384, 0.5, 'f1-dense');
  const b = sweepCell(16384, 0.5, 'f1-dense');
  assert.equal(a.row, b.row);
});

test('regenerated 16384-dim pilot rows byte-match the sealed baseline (STEP166 pattern)', () => {
  const baseline = readFileSync(join(repo, 'docs/QUANT-FIDELITY-PILOT-BASELINE-2026-06-11.hbp'), 'utf8')
    .split(/\r?\n/)
    .filter((row) => row.startsWith('QUANTFIDELITY|cell=16384-'));
  assert.equal(baseline.length, RHO_LEVELS.length * FAMILIES.length);
  const regenerated = sweep([16384]).filter((row) => row.startsWith('QUANTFIDELITY|'));
  assert.equal(regenerated.length, baseline.length);
  for (let i = 0; i < baseline.length; i += 1) {
    assert.equal(regenerated[i], baseline[i], `row ${i} drifted`);
  }
});

test('pilot verdict row records FAIL honestly (f4b cancellation breaks absolute cosine)', () => {
  const text = readFileSync(join(repo, 'docs/QUANT-FIDELITY-PILOT-BASELINE-2026-06-11.hbp'), 'utf8');
  assert.match(text, /QFSWEEPVERDICT\|cells=90\|/);
  assert.match(text, /result=FAIL\|grade=PILOT_CANNOT_PROMOTE/);
  assert.match(text, /worst_rank_preserve=1\.000000/);
  assert.match(text, /rank_missing_cells=[1-9][0-9]*/);
});
