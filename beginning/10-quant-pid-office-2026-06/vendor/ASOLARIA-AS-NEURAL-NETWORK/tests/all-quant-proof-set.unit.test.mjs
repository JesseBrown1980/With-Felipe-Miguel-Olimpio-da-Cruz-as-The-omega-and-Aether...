import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAllQuantProofSet,
  PROOF_ID,
  TARGET_EXPONENT,
} from '../tools/behcs/all-quant-proof-set.mjs';

test('all-quant proof set is deterministic, HBP-only, and includes the 1e100M target', async () => {
  const a = await buildAllQuantProofSet({ exponent: TARGET_EXPONENT, samples: 60 });
  const b = await buildAllQuantProofSet({ exponent: TARGET_EXPONENT, samples: 60 });
  assert.deepEqual(a, b);
  assert.ok(a.every((row) => row.endsWith('|json=0')));
  assert.ok(a.every((row) => !row.includes('{"')));
  assert.ok(a[0].includes(`id=${PROOF_ID}`));
  assert.ok(a.some((row) => row.includes('target=1e100000000')));
  assert.ok(a.some((row) => row.includes('materializes_100000001_digit_decimal=0')));
});

test('all-quant proof set carries every quant family and the extreme modular proof', async () => {
  const rows = await buildAllQuantProofSet({ exponent: TARGET_EXPONENT, samples: 60 });
  assert.ok(rows.some((row) => row.startsWith('AQPQUANT8|scenario=dense-sine')));
  assert.ok(rows.some((row) => row.startsWith('AQPFALCONCORE|status=PASS')));
  assert.ok(rows.some((row) => row.startsWith('AQPZETASWEEP|') && row.includes('pairs=9589') && row.includes('violations=0')));
  assert.ok(rows.some((row) => row.startsWith('AQPZETATRANSITION|') && row.includes('mode=corrupt-external-lane') && row.includes('FORCING_VIOLATION')));
  assert.ok(rows.some((row) => row.startsWith('AQPZETAPROCESS|status=PASS')));
  assert.ok(rows.some((row) => row.startsWith('AQPQUANT4|') && row.includes('result=PASS')));
  assert.ok(rows.some((row) => row.startsWith('AQPOMNIQUANT|')));
  assert.ok(rows.some((row) => row.startsWith('AQPEXTREMEFORMULA|') && row.includes('pow10_mod3=1') && row.includes('pow10_mod6=4') && row.includes('ppow_10E=composite')));
  assert.equal(rows.at(-1).startsWith('AQPFTR|status=PASS'), true);
});
