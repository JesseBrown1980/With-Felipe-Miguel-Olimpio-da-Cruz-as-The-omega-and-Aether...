#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FABRIC_ENDPOINTS,
  listRouterEndpoints,
  planRoute,
  routeTranslate,
} from './omnidirectional-translator-router.mjs';

export const D22_ADAPTER_ID = 'd22-verb-adapter.v1';

export const D22_VERBS = Object.freeze([
  'tuple_to_english',
  'english_to_tuple',
  'ix_to_tuple',
  'hilbert_to_human',
  'crlt_merge',
  'auto_transition_all_languages',
  'namespace_walk',
]);

function sha16(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function clean(value) {
  return String(value ?? '').replace(/[|\r\n]/g, '_').trim();
}

function compactObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v != null));
}

function tupleFromInput(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const compact = routeTranslate(input, 'json', 'omnilanguage');
    return { ok: true, source: 'json', tuple: compactObject(input), compact: compact.output };
  }

  if (typeof input === 'string' && input.trim().startsWith('@packet')) {
    const parsed = routeTranslate(input, 'omnilanguage', 'json');
    return { ok: true, source: 'omnilanguage', tuple: parsed.output, compact: input.trim() };
  }

  return {
    ok: false,
    source: 'unknown',
    tuple: null,
    compact: '',
    state: 'UNSUPPORTED_TUPLE_INPUT',
    gates: ['provide-json-object-or-omnilanguage-packet'],
  };
}

export function tupleToEnglish(input) {
  const tuple = tupleFromInput(input);
  if (!tuple.ok) {
    return { ok: false, verb: 'tuple_to_english', state: tuple.state, gates: tuple.gates, output: null };
  }

  const keys = Object.keys(tuple.tuple).sort();
  const label = keys.length ? keys.map((key) => `${key}=${tuple.tuple[key]}`).join(' ') : 'empty_tuple';
  return {
    ok: true,
    verb: 'tuple_to_english',
    state: 'IMPLEMENTED_THIN_ADAPTER',
    source: tuple.source,
    output: `D22 tuple ${label}`,
    tuple: tuple.tuple,
    compact: tuple.compact,
  };
}

export function englishToTuple(input) {
  const text = clean(input);
  if (text.startsWith('@packet')) {
    const parsed = routeTranslate(text, 'omnilanguage', 'json');
    return {
      ok: true,
      verb: 'english_to_tuple',
      state: 'IMPLEMENTED_ALREADY_TUPLE_PACKET',
      output: parsed.output,
      note: 'Input was already omnilanguage tuple syntax; no natural-language parse was inferred.',
    };
  }

  const plan = planRoute('plain_english', 'json');
  return {
    ok: false,
    verb: 'english_to_tuple',
    state: plan.state,
    executable: false,
    gates: plan.gates,
    input_sha16: sha16(text),
    output: null,
    note: 'Natural-language intent parsing remains gated; no tuple was fabricated.',
  };
}

export function ixToTuple(input) {
  const plan = planRoute('IX', 'json');
  const match = String(input ?? '').trim().match(/^(IX-\d+)\s*(.*)$/);
  return {
    ok: false,
    verb: 'ix_to_tuple',
    state: plan.state,
    executable: false,
    gates: plan.gates,
    ix_id: match ? match[1] : null,
    input_sha16: sha16(input ?? ''),
    output: null,
    note: 'IX parser is registered as a planned dialect; adapter exposes the route without parsing it.',
  };
}

export function hilbertToHuman(input) {
  const text = clean(input);
  return {
    ok: true,
    verb: 'hilbert_to_human',
    state: 'IMPLEMENTED_SHALLOW_DESCRIPTOR',
    output: `Hilbert address ${text || 'unset'} is a D22 translation target; semantic lookup remains outside this adapter.`,
    input_sha16: sha16(text),
  };
}

export function crltMerge(inputs) {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  const merged = {};
  for (const item of list) {
    const tuple = tupleFromInput(item);
    if (tuple.ok) Object.assign(merged, tuple.tuple);
  }

  if (Object.keys(merged).length === 0) {
    return {
      ok: false,
      verb: 'crlt_merge',
      state: 'NO_TUPLES_TO_MERGE',
      gates: ['provide-json-object-or-omnilanguage-packet'],
      output: null,
    };
  }

  const compact = routeTranslate(merged, 'json', 'omnilanguage');
  return {
    ok: true,
    verb: 'crlt_merge',
    state: 'IMPLEMENTED_SHALLOW_MERGE',
    output: merged,
    compact: compact.output,
  };
}

export function autoTransitionAllLanguages(input, from = 'omnilanguage') {
  const endpoints = listRouterEndpoints();
  const targets = [
    ...endpoints.dialects.map((dialect) => dialect.id),
    ...Object.keys(FABRIC_ENDPOINTS),
  ];
  return {
    ok: true,
    verb: 'auto_transition_all_languages',
    state: 'PLAN_MATRIX_ONLY',
    input_sha16: sha16(input ?? ''),
    from,
    plans: targets.map((to) => planRoute(from, to)),
  };
}

export function namespaceWalk() {
  const endpoints = listRouterEndpoints();
  return {
    ok: true,
    verb: 'namespace_walk',
    state: 'IMPLEMENTED_NAMESPACE_READ',
    adapter: D22_ADAPTER_ID,
    verbs: [...D22_VERBS],
    dialects: endpoints.dialects.map((dialect) => dialect.id),
    implementedPairs: endpoints.implementedPairs,
    fabricEndpoints: Object.keys(endpoints.fabricEndpoints),
  };
}

export function runD22Verb(verb, input, opts = {}) {
  switch (verb) {
    case 'tuple_to_english': return tupleToEnglish(input);
    case 'english_to_tuple': return englishToTuple(input);
    case 'ix_to_tuple': return ixToTuple(input);
    case 'hilbert_to_human': return hilbertToHuman(input);
    case 'crlt_merge': return crltMerge(input);
    case 'auto_transition_all_languages': return autoTransitionAllLanguages(input, opts.from);
    case 'namespace_walk': return namespaceWalk();
    default:
      return {
        ok: false,
        verb: clean(verb),
        state: 'UNKNOWN_D22_VERB',
        gates: ['use-one-of-' + D22_VERBS.join(',')],
        output: null,
      };
  }
}

export function statusRows() {
  return [
    `D22ADAPTERHDR|ok=1|id=${D22_ADAPTER_ID}|verbs=${D22_VERBS.length}|state=READY_DRAFT_NO_ENGINE_EDIT|json=0`,
    'D22ADAPTERVERB|verb=tuple_to_english|state=IMPLEMENTED_FOR_JSON_OR_OMNILANGUAGE_TUPLES|json=0',
    'D22ADAPTERVERB|verb=english_to_tuple|state=DRAFT_FOR_TRUE_PLAIN_ENGLISH_ALREADY_PACKET_EXECUTES|json=0',
    'D22ADAPTERVERB|verb=ix_to_tuple|state=DRAFT_ROUTE_ONLY_NOT_EXECUTABLE|json=0',
    'D22ADAPTERVERB|verb=hilbert_to_human|state=IMPLEMENTED_SHALLOW_DESCRIPTOR|json=0',
    'D22ADAPTERVERB|verb=crlt_merge|state=IMPLEMENTED_SHALLOW_MERGE_FOR_TUPLES|json=0',
    'D22ADAPTERVERB|verb=auto_transition_all_languages|state=PLAN_MATRIX_ONLY|json=0',
    'D22ADAPTERVERB|verb=namespace_walk|state=IMPLEMENTED_NAMESPACE_READ|json=0',
    'D22ADAPTERSAFETY|mutates=audit-hbp-append-only-when-implemented-pair-executes|mints=0|launches=0|usb_writes=0|engine_edits=0|external_calls=0|json=0',
    'D22ADAPTERFTR|state=F5_D22_THIN_VERB_ADAPTER_READY_FOR_BILATERAL_PULL|json=0',
  ];
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  add('seven-verbs-exposed', D22_VERBS.length === 7 && namespaceWalk().verbs.includes('namespace_walk'));
  add('tuple-to-english-json', tupleToEnglish({ from: 'liris', verb: 'test.ping' }).output.includes('verb=test.ping'));
  add('english-to-tuple-no-fabrication', englishToTuple('run the room').ok === false);
  add('ix-to-tuple-draft', ixToTuple('IX-459 beast discovery').state === 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE');
  add('auto-transition-matrix', autoTransitionAllLanguages('@packet verb=test', 'omnilanguage').plans.some((plan) => plan.to === 'json' && plan.executable));
  add('status-hbp-only', statusRows().every((row) => row.includes('json=0') && !row.includes('{"')));

  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--verb') {
    const verb = process.argv[3];
    const input = process.argv.slice(4).join(' ');
    console.log(JSON.stringify(runD22Verb(verb, input), null, 2));
  } else {
    console.error('usage: d22-verb-adapter.mjs --status | --self-test | --verb <verb> <input>');
    process.exit(1);
  }
}
