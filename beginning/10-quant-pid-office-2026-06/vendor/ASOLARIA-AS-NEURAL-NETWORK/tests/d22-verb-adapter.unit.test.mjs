import assert from 'node:assert/strict';
import test from 'node:test';

import {
  D22_VERBS,
  autoTransitionAllLanguages,
  crltMerge,
  englishToTuple,
  hilbertToHuman,
  ixToTuple,
  namespaceWalk,
  selfTest,
  statusRows,
  tupleToEnglish,
} from '../tools/behcs/d22-verb-adapter.mjs';

test('D22 adapter exposes the seven canonical verbs', () => {
  assert.deepEqual(D22_VERBS, [
    'tuple_to_english',
    'english_to_tuple',
    'ix_to_tuple',
    'hilbert_to_human',
    'crlt_merge',
    'auto_transition_all_languages',
    'namespace_walk',
  ]);
  assert.equal(namespaceWalk().verbs.length, 7);
});

test('tuple_to_english executes only for tuple-shaped inputs', () => {
  const result = tupleToEnglish({ from: 'liris', to: 'acer', verb: 'test.ping' });
  assert.equal(result.ok, true);
  assert.equal(result.state, 'IMPLEMENTED_THIN_ADAPTER');
  assert.match(result.output, /verb=test\.ping/);

  const blocked = tupleToEnglish('plain words');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.state, 'UNSUPPORTED_TUPLE_INPUT');
});

test('english_to_tuple refuses to fabricate natural-language tuples', () => {
  const result = englishToTuple('send the room to the cube');
  assert.equal(result.ok, false);
  assert.equal(result.state, 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE');
  assert.equal(result.output, null);

  const packet = englishToTuple('@packet from=liris verb=test.ping');
  assert.equal(packet.ok, true);
  assert.equal(packet.output.verb, 'test.ping');
});

test('planned D22 routes stay explicit drafts', () => {
  const ix = ixToTuple('IX-459 beast discovery');
  assert.equal(ix.ok, false);
  assert.equal(ix.ix_id, 'IX-459');
  assert.equal(ix.state, 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE');

  const human = hilbertToHuman('PID-H04-A01-W001-P001-N00001');
  assert.equal(human.ok, true);
  assert.match(human.output, /PID-H04/);
});

test('crlt_merge and auto_transition use deterministic tuple core', () => {
  const merged = crltMerge([
    { from: 'liris', verb: 'one' },
    '@packet to=acer input_a=2',
  ]);
  assert.equal(merged.ok, true);
  assert.equal(merged.output.from, 'liris');
  assert.equal(merged.output.to, 'acer');
  assert.match(merged.compact, /input_a=2/);

  const matrix = autoTransitionAllLanguages('@packet verb=test', 'omnilanguage');
  assert.ok(matrix.plans.some((plan) => plan.to === 'json' && plan.executable === true));
  assert.ok(matrix.plans.some((plan) => plan.to === 'cube' && plan.executable === false));
});

test('status rows and self-test stay HBP only', () => {
  const rows = statusRows();
  assert.ok(rows.every((row) => row.includes('json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
  assert.equal(selfTest().ok, true);
});
