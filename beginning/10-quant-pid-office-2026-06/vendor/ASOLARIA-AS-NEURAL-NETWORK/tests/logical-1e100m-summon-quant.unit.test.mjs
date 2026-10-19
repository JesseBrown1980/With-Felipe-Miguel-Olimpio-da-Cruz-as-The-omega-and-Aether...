import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSummonRows,
  SUMMON_ID,
  TARGET_EXPONENT,
} from '../tools/behcs/logical-1e100m-summon-quant.mjs';

test('logical 1e100M summon is HBP-only and keeps address/body boundary explicit', async () => {
  const rows = await buildSummonRows({
    exponent: TARGET_EXPONENT,
    offsets: 600,
    quantSamples: 128,
    liveSeconds: 0,
  });
  assert.ok(rows.every((row) => row.endsWith('|json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
  assert.ok(rows[0].includes(`id=${SUMMON_ID}`));
  assert.ok(rows.some((row) => row.includes('meaning=logical-address-summon-not-body-summon')));
  assert.ok(rows.some((row) => row.includes('node_means=address-point-not-NodeJS')));
  assert.ok(rows.some((row) => row.includes('resident_bodies_for_target=0')));
});

test('logical 1e100M summon tests quants against logical samples', async () => {
  const rows = await buildSummonRows({
    exponent: TARGET_EXPONENT,
    offsets: 600,
    quantSamples: 128,
    liveSeconds: 0,
  });
  assert.ok(rows.some((row) => row.startsWith('LOGICALSUMMONDIST|') && row.includes('lane_counts=200,200,200')));
  assert.ok(rows.some((row) => row.startsWith('LOGICALSUMMONFORMULA|') && row.includes('pow10_mod3=1') && row.includes('pow10_mod6=4')));
  assert.ok(rows.some((row) => row.startsWith('LOGICALSUMMONQUANT|') && row.includes('q4_identity_collisions=0') && row.includes('q4_pid_collisions=0')));
  assert.ok(rows.some((row) => row.startsWith('LOGICALSUMMONZETA|') && row.includes('forcing_pairs=9589') && row.includes('forcing_violations=0')));
  assert.ok(rows.some((row) => row.startsWith('LOGICALSUMMONALLQUANT|') && row.includes('status=PASS')));
  assert.ok(rows.at(-1).startsWith('LOGICALSUMMONFTR|status=PASS'));
});
