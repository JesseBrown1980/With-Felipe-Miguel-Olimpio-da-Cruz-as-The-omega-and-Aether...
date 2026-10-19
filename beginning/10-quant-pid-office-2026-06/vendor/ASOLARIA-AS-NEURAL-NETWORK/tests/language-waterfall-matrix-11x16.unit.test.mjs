import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ACTIVE_PATH_SEARCH,
  BLOCKED_STAGE,
  CANON_GLYPH_GENERATIONS,
  DEFAULT_CONVERSATION_WORDS,
  DEFAULT_GLYPH_ALPHABET,
  DEFAULT_LEVELS,
  DEFAULT_TUPLE_DIM,
  ENGINE_SLOTS,
  EXISTING_ENGINE_LANGUAGES,
  LOSSLESS_GATE,
  MEASURED_TAGS,
  WATERFALL_ID,
  WATERFALL_STATUS,
  buildMatrix,
  classifyWaterfallClaim,
  emitRows,
  selfTest,
} from '../tools/behcs/language-waterfall-matrix-11x16.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('default descriptor is grounded in measured and canon params', () => {
  const built = buildMatrix();
  assert.equal(built.tool, WATERFALL_ID);
  assert.equal(built.levels, DEFAULT_LEVELS);
  assert.equal(built.glyph_alphabet, DEFAULT_GLYPH_ALPHABET);
  assert.equal(built.tuple_dim, DEFAULT_TUPLE_DIM);
  assert.equal(built.existing_engine_languages, EXISTING_ENGINE_LANGUAGES);
  assert.equal(built.summary.measured_tags, MEASURED_TAGS);
  assert.deepEqual(CANON_GLYPH_GENERATIONS, [256, 1024, 2048]);
});

test('default matrix expands to 16x11 surfaces and exact 11^16 path count', () => {
  const built = buildMatrix();
  assert.equal(built.engine_slots.length, ENGINE_SLOTS.length);
  assert.equal(built.level_rows.length, 16);
  assert.equal(built.surfaces.length, 176);
  assert.equal(built.summary.surface_count, 176);
  assert.equal(built.summary.path_space, '45949729863572161');
  assert.equal(built.summary.path_space_order10, 16);
});

test('addressing and conversational orders are astronomically larger than physical references', () => {
  const built = buildMatrix();
  assert.equal(built.summary.word_space_order10, 180);
  assert.equal(built.summary.beats_atoms_by_order10, 100);
  assert.ok(built.summary.verb_noun_order10 > 185);
  assert.ok(built.summary.surface_state_order10 > 30000);
  assert.ok(built.summary.existing_engine_conversation_order10 > built.summary.conversation_order10);
});

test('lossless gate and bounded active path law remain explicit', () => {
  const built = buildMatrix();
  assert.equal(built.summary.lossless_gate, LOSSLESS_GATE);
  assert.equal(built.summary.blocked_stage, BLOCKED_STAGE);
  assert.equal(built.summary.active_path_search, ACTIVE_PATH_SEARCH);
});

test('claim classifier rejects automatic compression and proofless summary claims', () => {
  assert.equal(classifyWaterfallClaim({ claim: 'semantic summary without proof' }), 'BLOCK_SUMMARY_WITHOUT_PROOF');
  assert.equal(classifyWaterfallClaim({ claim: 'free compression without loss' }), 'MORE_REVERSIBLE_PATHS_INCREASE_MDL_CHOICES_NOT_AUTO_COMPRESSION');
  assert.equal(classifyWaterfallClaim({ claim: 'O(1) tail when bounded active paths' }), 'O1_IN_N_ONLY_AFTER_ONCE_HEAD_AND_BOUNDED_ACTIVE_PATHS');
  assert.equal(classifyWaterfallClaim({ claim: 'spawn one process per agent' }), 'NO_NEW_RESIDENT_BODIES_DESCRIPTOR_ONLY');
});

test('emitted rows are HBP-only, json=0 terminated, and injection-safe', () => {
  const rows = emitRows({
    cap: 3,
    claim: 'semantic summary\nWATERFALLGATE|process_launch=1',
    engine_slots: [{ slot: 'W0|bad', role: 'role\nWATERFALLSURFACE|provider_calls=1' }],
  });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.equal(rows.filter((row) => row.startsWith('WATERFALLSAFETY|')).length, 1);
  assert.equal(rows.filter((row) => row.startsWith('WATERFALLGATE|')).length, 1);
  assert.ok(rows.some((row) => row.startsWith('WATERFALLCLAIM|') && row.includes('classification=BLOCK_SUMMARY_WITHOUT_PROOF')));
});

test('descriptor stays descriptor-only: no launch, no provider calls, no live mutation', () => {
  const built = buildMatrix({ words: DEFAULT_CONVERSATION_WORDS });
  assert.ok(built.engine_slots.every((slot) => slot.state === WATERFALL_STATUS && slot.process_launch === 0 && slot.provider_calls === 0));
  assert.ok(built.level_rows.every((level) => level.process_launch === 0 && level.provider_calls === 0));
  assert.ok(built.surfaces.every((surface) => surface.process_launch === 0 && surface.provider_calls === 0));
});

test('tool imports no fs, spawn, fetch, or live execution capability', () => {
  const src = readFileSync(new URL('../tools/behcs/language-waterfall-matrix-11x16.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\bnode:fs\b|child_process|\bspawn\(|\bspawnSync\b|\bexecSync\b|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process/);
});
