#!/usr/bin/env node
// measure-rich-index-curve.mjs — READ-ONLY. Same harness shape as the office-roster run,
// applied to the RICH index-language catalog (unified agent index, 224 docs x 23 fields).
//
// Two honest regimes:
//  (A) LOSSLESS METADATA amortization (MEASURED): hydrated-JSON-meta -> tuple -> verb-overlay,
//      keeping all per-row metadata entropy, dict-coding shared vocabulary (type/layer/
//      sourceKind/prefix/tags/chain/agents) with the codebook counted ONCE. Ratio climbs with N.
//  (B) REFERENTIAL index (MEASURED for the index, MODEL for the corpus): the rich record's
//      `body`/`summary` free-text is the bulk; the INDEX row keeps metadata + a 16-byte
//      content-hash pointer to the body (body stored ONCE in the codebook/cube). This is the
//      legitimate "an index is tiny vs the corpus it indexes" compression — and the regime the
//      operator anchors 12:1 -> 21,141:1 -> ~3B:1 live in. This run does NOT re-derive them.
//
// No device writes, no mounts, no MCP, no spawn. Prints JSON to stdout.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
const B = (s) => Buffer.byteLength(typeof s === 'string' ? s : JSON.stringify(s), 'utf8');

const PATH = process.argv[2] || 'C:/Users/acer/Asolaria/.history/staging/compiled-unified-agent-index.json';
const docs = JSON.parse(fs.readFileSync(PATH, 'utf8')).documents;

const arr = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
// metadata projection (the index fields; body/summary excluded — they are corpus, not index)
function meta(d) {
  return {
    id: d.id, number: d.number, title: d.title, type: d.type, layer: d.layer,
    sourceKind: d.sourceKind, prefix: d.prefix, tags: arr(d.tags), chain: arr(d.chain),
    agents: arr(d.agents), updatedAt: d.updatedAt, source: d.source,
  };
}

// shared codebook: categorical single-value dicts + token dict for array vocab. Counted ONCE.
const CATS = ['type', 'layer', 'sourceKind', 'prefix'];
const cat = Object.fromEntries(CATS.map((c) => [c, new Map()]));
const tok = new Map(); // shared token vocabulary for tags/chain/agents
for (const d of docs) {
  const m = meta(d);
  for (const c of CATS) if (m[c] != null && !cat[c].has(m[c])) cat[c].set(m[c], cat[c].size);
  for (const f of ['tags', 'chain', 'agents']) for (const t of m[f]) if (!tok.has(t)) tok.set(t, tok.size);
}
let codebook_bytes = B('id|number|title|type|layer|sourceKind|prefix|tags|chain|agents|updatedAt|source\n');
for (const c of CATS) for (const [v, i] of cat[c]) codebook_bytes += B(`${c}${i}=${v}\n`);
for (const [v, i] of tok) codebook_bytes += B(`t${i}=${v}\n`);

// terse pipe row (lossless metadata, human keys dropped -> positional)
function tupleMeta(d) {
  const m = meta(d);
  return [m.id, m.number, m.title, m.type, m.layer, m.sourceKind, m.prefix,
    m.tags.join(','), m.chain.join(','), m.agents.join(','), m.updatedAt, m.source].join('|');
}
// verb-overlay: categoricals -> dict idx, array vocab -> token idx, entropy kept
function verbMeta(d) {
  const m = meta(d);
  const ci = (c) => String(cat[c].get(m[c]) ?? '');
  const ti = (xs) => xs.map((t) => tok.get(t)).join(',');
  return [m.id, m.number, m.title, ci('type'), ci('layer'), ci('sourceKind'), ci('prefix'),
    ti(m.tags), ti(m.chain), ti(m.agents), m.updatedAt, m.source].join('\x1f');
}

function measure(N) {
  const slice = docs.slice(0, N);
  let json_full = 0, json_meta = 0, tuple = 0, verb = codebook_bytes, ref_full = codebook_bytes, body_corpus = 0;
  for (const d of slice) {
    json_full += B(JSON.stringify(d)) + 1;                 // real hydrated record (incl body)
    json_meta += B(JSON.stringify(meta(d))) + 1;           // hydrated metadata only
    tuple += B(tupleMeta(d)) + 1;                          // lossless terse metadata
    verb += B(verbMeta(d)) + 1;                            // dict-coded metadata
    ref_full += B(tupleMeta(d)) + 16 + 1;                  // index row + 16B body content-hash
    body_corpus += B(d.body || '') + B(d.summary || '');   // the corpus stored ONCE (referenced)
  }
  return {
    N,
    json_full_bytes: json_full, json_meta_bytes: json_meta,
    tuple_meta_bytes: tuple, verb_meta_bytes: verb, ref_full_bytes: ref_full,
    glyph_ref_bytes: 8 * N, body_corpus_bytes: body_corpus,
    // LOSSLESS metadata amortization (MEASURED):
    'r_jsonmeta/verb': +(json_meta / verb).toFixed(2),
    'r_jsonmeta/tuple': +(json_meta / tuple).toFixed(2),
    // REFERENTIAL index: full hydrated record vs index-row-with-body-hash (MEASURED for index):
    'r_jsonfull/refindex': +(json_full / ref_full).toFixed(2),
    'r_jsonfull/tuplemeta': +(json_full / tuple).toFixed(2),
    // referential MODEL (handle only):
    'r_jsonfull/glyphref': +(json_full / (8 * N)).toFixed(2),
  };
}

const Ns = [1, 5, 20, 50, 100, 150, docs.length].filter((n, i, a) => n <= docs.length && a.indexOf(n) === i);
const curve = Ns.map(measure);
const full = curve[curve.length - 1];
const out = {
  catalog: PATH,
  documents: docs.length,
  codebook_bytes_shared_once: codebook_bytes,
  vocab_sizes: { type: cat.type.size, layer: cat.layer.size, sourceKind: cat.sourceKind.size, prefix: cat.prefix.size, array_tokens: tok.size },
  per_row_avg_bytes: {
    json_full: +(full.json_full_bytes / full.N).toFixed(1),
    json_meta: +(full.json_meta_bytes / full.N).toFixed(1),
    tuple_meta: +(full.tuple_meta_bytes / full.N).toFixed(1),
    verb_meta_payload: +((full.verb_meta_bytes - codebook_bytes) / full.N).toFixed(1),
    body_corpus: +(full.body_corpus_bytes / full.N).toFixed(1),
  },
  GROWTH_CURVE: curve,
  notes: {
    lossless_metadata: 'r_jsonmeta/verb is MEASURED lossless metadata compression; climbs with N as the shared vocabulary codebook amortizes.',
    referential_index: 'r_jsonfull/refindex is MEASURED for the INDEX: the rich record keeps metadata + a 16B content-hash; the body/summary corpus (body_corpus_bytes) is stored ONCE and referenced. This is the legitimate index-vs-corpus compression and the regime the operator anchors live in.',
    anchors: 'Operator anchors 12:1 -> 21,141:1 -> ~3B:1 stand REAL on provenance; this run is a descendant curve, NOT a re-derivation of them.',
  },
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
