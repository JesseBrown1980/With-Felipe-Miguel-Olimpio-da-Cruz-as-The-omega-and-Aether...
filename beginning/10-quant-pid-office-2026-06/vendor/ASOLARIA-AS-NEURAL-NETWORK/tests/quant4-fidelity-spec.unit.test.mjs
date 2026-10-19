import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  emitQuant4Rows,
  quant4Address,
  runQuant4Fidelity,
  selfTest,
} from '../tools/behcs/quant4-fidelity-spec.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('definition rows are HBP-only and ontology-anchored', () => {
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('|json=0')));
  assert.ok(DEFINITION_ROWS.every((row) => !row.includes('{"')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('quants-are-address-and-evidence-classes-not-raw-material')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('not-vector-reconstruction')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('claim_17_languages=THESIS-NOT-ENUMERATED')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('placement=sha256-preimage-residue-addressing')));
});

test('quant4Address is deterministic and uses live PID/address fields', () => {
  const a = quant4Address('q4-determinism-probe');
  const b = quant4Address('q4-determinism-probe');
  assert.equal(a.pid, b.pid);
  assert.equal(a.route_key, b.route_key);
  assert.match(a.register_identity_sha16, /^[0-9a-f]{16}$/);
  assert.match(a.pid, /^AGT-OPENCODE-LOGICAL-WAVE-/);
  assert.match(a.cube_bh, /^BH\.\d+\.[0-2]\.\d+$/);
});

test('mutation changes identity, but route collision remains finite-bucket behavior', () => {
  const a = quant4Address('q4-mutation-probe');
  const b = quant4Address('q4-mutation-probe-mutated');
  assert.notEqual(a.register_identity_sha16, b.register_identity_sha16);
  assert.notEqual(a.pid, b.pid);
  const rows = emitQuant4Rows({ samples: 512, duplicates: 32, mutations: 32 });
  assert.ok(rows.some((row) => row.includes('finite_bucket_collisions=EXPECTED_NOT_IDENTITY_FAILURE')));
});

test('small pilot passes only the address/evidence gate, not semantic fidelity', () => {
  const run = runQuant4Fidelity({ samples: 1024, duplicates: 64, mutations: 64 });
  assert.equal(run.verdict.result, 'PASS');
  assert.equal(run.verdict.grade, 'ROUTING_HINT_MEASURED_NOT_GATING');
  assert.equal(run.metrics.identity_collisions, 0);
  assert.equal(run.metrics.pid_collisions, 0);
  assert.equal(run.metrics.duplicate_stable, 64);
  assert.equal(run.metrics.mutation_identity_changed, 64);
});

test('generated rows are deterministic and explicitly not gating', () => {
  const a = emitQuant4Rows({ samples: 512, duplicates: 32, mutations: 32 });
  const b = emitQuant4Rows({ samples: 512, duplicates: 32, mutations: 32 });
  assert.deepEqual(a, b);
  assert.ok(a.every((row) => row.endsWith('|json=0')));
  assert.ok(a.some((row) => row.includes('not_semantic_fidelity=1|not_gating=1')));
});

test('SPEC4 tool does not import or call the QUANT8 sweep', () => {
  const src = readFileSync(join(repo, 'tools/behcs/quant4-fidelity-spec.mjs'), 'utf8');
  assert.equal(src.includes('quant-fidelity-sweep'), false);
  assert.equal(src.includes('quant-huge-message-benchmark'), false);
  assert.equal(src.includes('sweepCell'), false);
  assert.equal(src.includes('quant8('), false);
  assert.match(src, /metric_cosine=not-applicable-for-hash-tail/);
});
