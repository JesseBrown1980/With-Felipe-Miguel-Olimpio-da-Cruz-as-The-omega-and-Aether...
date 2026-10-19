#!/usr/bin/env node
// language-waterfall-matrix-11x16.mjs - descriptor-first waterfall matrix.
//
// This is not a live agent swarm, not a daemon launcher, and not a compression
// claim by assertion. It describes the 11x16 waterfall as reversible codebook
// surfaces over the existing address fabric: more path choice, no new resident
// bodies, no live mutation, no provider calls, no process launch.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WATERFALL_ID = 'language-waterfall-matrix-11x16.v1';
export const DEFAULT_LEVELS = 16;
export const DEFAULT_ENGINES_PER_LEVEL = 11;
export const DEFAULT_GLYPH_ALPHABET = 1024;
export const DEFAULT_TUPLE_DIM = 60;
export const CANON_GLYPH_GENERATIONS = Object.freeze([256, 1024, 2048]);
export const DEFAULT_CATALOG_FLOOR = 47;
export const DEFAULT_CATALOG_CEILING = 60;
export const EXISTING_ENGINE_LANGUAGES = 17;
export const DEFAULT_CONVERSATION_WORDS = 50;
export const ATOMS_ORDER10 = 80;
export const PLANCK_INFO_ORDER10 = 185;
export const LOSSLESS_GATE = 'roundtrip_verified_OR_residual_stored_OR_original_addressed';
export const BLOCKED_STAGE = 'semantic_summary_without_proof';
export const ACTIVE_PATH_SEARCH = 'bounded_active_slice_NOT_global_11pow16_bruteforce';
export const WATERFALL_STATUS = 'DESCRIPTOR_ONLY_NO_LIVE_LAUNCH';
export const MEASURED_TAGS = 'alphabet-BEHCS-1024+tuple_dim-60+levels-16';
export const CANON_TAGS = 'gens-256-1024-2048+catalogs-47-to-60+existing-engine-languages-17';

export const ENGINE_SLOTS = Object.freeze(Array.from({ length: DEFAULT_ENGINES_PER_LEVEL }, (_, index) => Object.freeze({
  slot: `W${String(index).padStart(2, '0')}`,
  role: 'GENERIC_TRANSLATION_SURFACE_CANON_NAME_PENDING',
  state: WATERFALL_STATUS,
})));

const isObj = (value) => value !== null && typeof value === 'object';
const toBig = (value) => (typeof value === 'bigint' ? value : BigInt(value));
const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const safe = (value) => {
  try {
    return String(value == null ? '' : value).replace(/[|\r\n]/g, '_');
  } catch {
    return '_';
  }
};
const prop = (obj, key, fallback = '') => {
  try {
    return isObj(obj) ? obj[key] : fallback;
  } catch {
    return fallback;
  }
};

function intFrom(value, fallback, min, max) {
  const n = Number.parseInt(String(value), 10);
  const picked = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, picked));
}

function digits(value) {
  return String(value).length;
}

function order10(value) {
  return Math.max(0, digits(value) - 1);
}

function pow(base, exponent) {
  return toBig(base) ** toBig(exponent);
}

function factorial(input) {
  let out = 1n;
  const max = toBig(input);
  for (let i = 2n; i <= max; i += 1n) out *= i;
  return out;
}

function makeDefaultSlot(index) {
  return {
    slot: `W${String(index).padStart(2, '0')}`,
    role: 'GENERIC_TRANSLATION_SURFACE_CANON_NAME_PENDING',
    state: WATERFALL_STATUS,
  };
}

function normalizeSlot(input, index) {
  const fallback = makeDefaultSlot(index);
  try {
    if (typeof input === 'string') {
      return {
        slot: safe(input) || fallback.slot,
        role: fallback.role,
        state: WATERFALL_STATUS,
        process_launch: 0,
        provider_calls: 0,
      };
    }
    return {
      slot: safe(prop(input, 'slot', prop(input, 'id', fallback.slot))) || fallback.slot,
      role: safe(prop(input, 'role', fallback.role)) || fallback.role,
      state: WATERFALL_STATUS,
      process_launch: 0,
      provider_calls: 0,
    };
  } catch {
    return {
      slot: fallback.slot,
      role: fallback.role,
      state: WATERFALL_STATUS,
      process_launch: 0,
      provider_calls: 0,
    };
  }
}

function normalizeSlots(input, count) {
  const slots = [];
  const source = Array.isArray(input) ? input : ENGINE_SLOTS;
  for (let index = 0; index < count; index += 1) {
    slots.push(normalizeSlot(source[index], index));
  }
  return slots;
}

export function classifyWaterfallClaim(input = {}) {
  try {
    const raw = String(prop(input, 'claim', input) ?? '').toLowerCase();
    if (/summar|semantic/.test(raw)) return 'BLOCK_SUMMARY_WITHOUT_PROOF';
    if (/(free|automatic).*(compress|compression)|compress.*without loss/.test(raw)) {
      return 'MORE_REVERSIBLE_PATHS_INCREASE_MDL_CHOICES_NOT_AUTO_COMPRESSION';
    }
    if (/o\(1\)|constant time|bounded active|tail/.test(raw)) {
      return 'O1_IN_N_ONLY_AFTER_ONCE_HEAD_AND_BOUNDED_ACTIVE_PATHS';
    }
    if (/resident bod|spawn|process per agent|live launch/.test(raw)) {
      return 'NO_NEW_RESIDENT_BODIES_DESCRIPTOR_ONLY';
    }
    return 'DESCRIPTOR_ONLY_LANGUAGE_WATERFALL';
  } catch {
    return 'DESCRIPTOR_ONLY_LANGUAGE_WATERFALL';
  }
}

export function buildMatrix(input = {}) {
  const opts = isObj(input) ? input : {};
  const levels = intFrom(prop(opts, 'levels', DEFAULT_LEVELS), DEFAULT_LEVELS, 1, 64);
  const engines_per_level = intFrom(prop(opts, 'engines_per_level', DEFAULT_ENGINES_PER_LEVEL), DEFAULT_ENGINES_PER_LEVEL, 1, 64);
  const glyph_alphabet = intFrom(prop(opts, 'glyph_alphabet', DEFAULT_GLYPH_ALPHABET), DEFAULT_GLYPH_ALPHABET, 2, 65536);
  const tuple_dim = intFrom(prop(opts, 'tuple_dim', DEFAULT_TUPLE_DIM), DEFAULT_TUPLE_DIM, 1, 256);
  const catalog_floor = intFrom(prop(opts, 'catalog_floor', DEFAULT_CATALOG_FLOOR), DEFAULT_CATALOG_FLOOR, 1, 1000000);
  const catalog_ceiling = Math.max(catalog_floor, intFrom(prop(opts, 'catalog_ceiling', DEFAULT_CATALOG_CEILING), DEFAULT_CATALOG_CEILING, 1, 1000000));
  const existing_engine_languages = intFrom(prop(opts, 'existing_engine_languages', EXISTING_ENGINE_LANGUAGES), EXISTING_ENGINE_LANGUAGES, 1, 256);
  const words = intFrom(prop(opts, 'words', DEFAULT_CONVERSATION_WORDS), DEFAULT_CONVERSATION_WORDS, 1, 512);
  const engine_slots = normalizeSlots(prop(opts, 'engine_slots', ENGINE_SLOTS), engines_per_level);

  const surface_count = levels * engines_per_level;
  const path_space = pow(engines_per_level, levels);
  const word_space = pow(glyph_alphabet, tuple_dim);
  const full_omni_space = word_space * factorial(existing_engine_languages) * BigInt(levels);
  const surface_state_space = pow(word_space, surface_count);
  const verb_noun_space = word_space ** 2n;
  const verb_noun_with_surface_choice = (word_space * BigInt(surface_count)) ** 2n;
  const path_coded_verb_noun_space = path_space * verb_noun_space;
  const conversation_space = word_space ** BigInt(words);
  const existing_engine_conversation_space = (word_space * BigInt(existing_engine_languages)) ** BigInt(words);
  const surface_conversation_space = (word_space * BigInt(surface_count)) ** BigInt(words);
  const catalog_growth_factor = pow(glyph_alphabet, catalog_ceiling - catalog_floor);

  const level_rows = Array.from({ length: levels }, (_, index) => ({
    level: index,
    level_id: `L${String(index).padStart(2, '0')}`,
    engines_per_level,
    translate_surface_count: engines_per_level,
    state: WATERFALL_STATUS,
    process_launch: 0,
    provider_calls: 0,
  }));

  const surfaces = level_rows.flatMap((level) => engine_slots.map((slot, slot_index) => ({
    level: level.level,
    level_id: level.level_id,
    slot: slot.slot,
    role: slot.role,
    state: WATERFALL_STATUS,
    slot_index,
    process_launch: 0,
    provider_calls: 0,
    surface_id: `${level.level_id}-${slot.slot}`,
    route_sha16: sha16([level.level_id, slot.slot, slot.role].join('|')),
  })));

  return {
    tool: WATERFALL_ID,
    levels,
    engines_per_level,
    glyph_alphabet,
    tuple_dim,
    catalog_floor,
    catalog_ceiling,
    existing_engine_languages,
    words,
    engine_slots,
    level_rows,
    surfaces,
    summary: {
      measured_tags: MEASURED_TAGS,
      canon_tags: CANON_TAGS,
      levels,
      engines_per_level,
      surface_count,
      path_space: String(path_space),
      path_space_order10: order10(path_space),
      word_space_order10: order10(word_space),
      word_space_digits: digits(word_space),
      surface_state_order10: order10(surface_state_space),
      full_omni_order10: order10(full_omni_space),
      verb_noun_order10: order10(verb_noun_space),
      verb_noun_with_surface_choice_order10: order10(verb_noun_with_surface_choice),
      path_coded_verb_noun_order10: order10(path_coded_verb_noun_space),
      conversation_order10: order10(conversation_space),
      existing_engine_conversation_order10: order10(existing_engine_conversation_space),
      surface_conversation_order10: order10(surface_conversation_space),
      catalog_delta: catalog_ceiling - catalog_floor,
      catalog_growth_factor_order10: order10(catalog_growth_factor),
      beats_atoms_by_order10: Math.max(0, order10(word_space) - ATOMS_ORDER10),
      verb_noun_beats_planck_by_order10: Math.max(0, order10(verb_noun_space) - PLANCK_INFO_ORDER10),
      lossless_gate: LOSSLESS_GATE,
      blocked_stage: BLOCKED_STAGE,
      active_path_search: ACTIVE_PATH_SEARCH,
      status: WATERFALL_STATUS,
    },
  };
}

export function emitRows(input = {}) {
  try {
    const opts = isObj(input) ? input : {};
    const cap = intFrom(prop(opts, 'cap', 12), 12, 0, 176);
    const built = buildMatrix(opts);
    const s = built.summary;
    const rows = [
      `WATERFALLHDR|tool=${WATERFALL_ID}|levels=${built.levels}|engines_per_level=${built.engines_per_level}|surfaces=${s.surface_count}|base_alphabet=BEHCS${built.glyph_alphabet}|tuple_dim=${built.tuple_dim}|status=${WATERFALL_STATUS}|read_only=1|process_launch=0|provider_calls=0|json=0`,
      `WATERFALLPARAM|measured=${MEASURED_TAGS}|canon=${CANON_TAGS}|existing_engine_languages=${built.existing_engine_languages}|catalog_floor=${built.catalog_floor}|catalog_ceiling=${built.catalog_ceiling}|words=${built.words}|json=0`,
      `WATERFALLWORD|space=${built.glyph_alphabet}pow${built.tuple_dim}|order10=${s.word_space_order10}|digits=${s.word_space_digits}|beats_atoms_by_order10=${s.beats_atoms_by_order10}|full_omni_order10=${s.full_omni_order10}|json=0`,
      `WATERFALLPATH|path_space=${s.path_space}|order10=${s.path_space_order10}|search=${ACTIVE_PATH_SEARCH}|surface_count=${s.surface_count}|json=0`,
      `WATERFALLCAT|catalog_delta=${s.catalog_delta}|per_catalog_factor=${built.glyph_alphabet}|growth_factor_order10=${s.catalog_growth_factor_order10}|note=more-catalogs-expand-address-choices-not-materialized-storage|json=0`,
      `WATERFALLPHYSICS|verb_noun_order10=${s.verb_noun_order10}|verb_noun_with_surface_choice_order10=${s.verb_noun_with_surface_choice_order10}|path_coded_verb_noun_order10=${s.path_coded_verb_noun_order10}|beats_planck_by_order10=${s.verb_noun_beats_planck_by_order10}|json=0`,
      `WATERFALLCONVO|words=${built.words}|conversation_order10=${s.conversation_order10}|existing_engine_conversation_order10=${s.existing_engine_conversation_order10}|surface_conversation_order10=${s.surface_conversation_order10}|surface_state_order10=${s.surface_state_order10}|json=0`,
    ];
    for (const slot of built.engine_slots) {
      rows.push(`WATERFALLENGINE|slot=${safe(slot.slot)}|role=${safe(slot.role)}|state=${safe(slot.state)}|process_launch=0|provider_calls=0|canon_name_pending=1|json=0`);
    }
    for (const level of built.level_rows) {
      rows.push(`WATERFALLLEVEL|level=${level.level}|level_id=${level.level_id}|engine_slots=${level.engines_per_level}|state=${level.state}|process_launch=0|provider_calls=0|json=0`);
    }
    for (const surface of built.surfaces.slice(0, cap)) {
      rows.push(`WATERFALLSURFACE|surface_id=${surface.surface_id}|level_id=${surface.level_id}|slot=${safe(surface.slot)}|role=${safe(surface.role)}|route_sha16=${surface.route_sha16}|process_launch=0|provider_calls=0|json=0`);
    }
    const claim = prop(opts, 'claim', '');
    if (claim) {
      rows.push(`WATERFALLCLAIM|claim_sha16=${sha16(claim)}|classification=${classifyWaterfallClaim({ claim })}|raw_claim_inlined=0|json=0`);
    }
    rows.push(`WATERFALLGATE|stage_allowed=${LOSSLESS_GATE}|stage_blocked=${BLOCKED_STAGE}|lossless_only_if=proof_or_residual_or_original_pointer|semantic_summary_without_proof=0|json=0`);
    rows.push(`WATERFALLMDL|score=path_id_bytes+encoded_payload_bytes+residual_bytes+proof_bytes+codebook_ref_bytes|winner=min_score_among_bounded_active_paths|global_bruteforce=0|search=${ACTIVE_PATH_SEARCH}|json=0`);
    rows.push('WATERFALLSAFETY|process_launch=0|provider_calls=0|no_self_firing=1|no_live_catalog_mutation=1|operator_gate_required_for_materialization=1|json=0');
    rows.push(`WATERFALLSUM|levels=${built.levels}|engines_per_level=${built.engines_per_level}|surfaces=${s.surface_count}|emitted_surfaces=${Math.min(cap, built.surfaces.length)}|status=${s.status}|json=0`);
    return rows;
  } catch {
    return [
      `WATERFALLHDR|tool=${WATERFALL_ID}|levels=${DEFAULT_LEVELS}|engines_per_level=${DEFAULT_ENGINES_PER_LEVEL}|surfaces=${DEFAULT_LEVELS * DEFAULT_ENGINES_PER_LEVEL}|base_alphabet=BEHCS${DEFAULT_GLYPH_ALPHABET}|tuple_dim=${DEFAULT_TUPLE_DIM}|status=INVALID_HELD|read_only=1|process_launch=0|provider_calls=0|json=0`,
      'WATERFALLSAFETY|process_launch=0|provider_calls=0|no_self_firing=1|no_live_catalog_mutation=1|operator_gate_required_for_materialization=1|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildMatrix();
  add('default-surface-count', built.summary.surface_count === 176);
  add('exact-path-space-11pow16', built.summary.path_space === '45949729863572161');
  add('measured-word-space-order', built.summary.word_space_order10 === 180 && built.summary.beats_atoms_by_order10 === 100);
  add('surface-state-explodes', built.summary.surface_state_order10 > 30000);
  add('verb-noun-beats-planck', built.summary.verb_noun_order10 > PLANCK_INFO_ORDER10);
  add('claim-blocks-summary', classifyWaterfallClaim({ claim: 'semantic summary without proof' }) === 'BLOCK_SUMMARY_WITHOUT_PROOF');
  add('claim-rejects-auto-compression', classifyWaterfallClaim({ claim: 'free compression without loss' }) === 'MORE_REVERSIBLE_PATHS_INCREASE_MDL_CHOICES_NOT_AUTO_COMPRESSION');
  add('claim-o1-bounded-only', classifyWaterfallClaim({ claim: 'O(1) tail when bounded active paths' }) === 'O1_IN_N_ONLY_AFTER_ONCE_HEAD_AND_BOUNDED_ACTIVE_PATHS');
  const hostile = emitRows({
    engine_slots: [{ slot: 'W0|bad', role: 'x\nWATERFALLGATE|process_launch=1' }],
    claim: 'semantic summary\nWATERFALLSAFETY|provider_calls=1',
    cap: 2,
  });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  add('single-safety-row', hostile.filter((row) => row.startsWith('WATERFALLSAFETY|')).length === 1);
  add('descriptor-only-flags', hostile.some((row) => row.startsWith('WATERFALLSAFETY|') && row.includes('process_launch=0') && row.includes('provider_calls=0')));
  let threw = false;
  try {
    buildMatrix(null);
    emitRows(null);
    classifyWaterfallClaim(null);
    buildMatrix({ get levels() { throw new Error('boom'); } });
    emitRows({ engine_slots: [{ get slot() { throw new Error('boom'); } }] });
  } catch {
    threw = true;
  }
  add('total-never-throws', threw === false);
  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  }
  const capArg = process.argv.find((arg) => arg.startsWith('--cap='));
  const claimArg = process.argv.find((arg) => arg.startsWith('--claim='));
  const wordArg = process.argv.find((arg) => arg.startsWith('--words='));
  const cap = capArg ? capArg.slice('--cap='.length) : 12;
  const claim = claimArg ? claimArg.slice('--claim='.length) : '';
  const words = wordArg ? wordArg.slice('--words='.length) : DEFAULT_CONVERSATION_WORDS;
  process.stdout.write(emitRows({ cap, claim, words }).join('\n') + '\n');
}
