#!/usr/bin/env node
// measure-compression-curve.mjs — READ-ONLY. Measures a REAL fabric-designated index-tuple
// catalog through JSON -> tuple-HBP -> verb-overlay -> glyph, at small-N vs full-N, to show
// the codebook-amortization growth curve ("exploded as it cataloged more").
//
// HONEST DUAL-LENS:
//   - LOSSLESS curve (JSON -> tuple -> verb-overlay): fully MEASURED. Keeps all per-row entropy
//     (name/pid/hilbert/g1024/g5); only removes redundancy (verbose keys, repeated categoricals,
//     JSON punctuation). The shared codebook is counted ONCE -> ratio grows with N then plateaus.
//   - REFERENTIAL glyph asymptote: a MODEL, clearly tagged. A row -> an 8-byte BEHCS-256 handle
//     that POINTS into a stored-once codebook. This is the regime the operator's REAL anchors
//     (12:1 -> 21,141:1 -> ~3B:1) live in; this script does NOT re-derive them — it only shows
//     the descendant curve's direction. The anchors stand REAL on operator provenance.
//
// No device writes, no mounts, no MCP, no spawn. Prints JSON to stdout.

import fs from 'node:fs';

const CATALOG = process.argv[2] || 'D:/PID-Registration-Office/fabric-feed/supervisors-fabric-feed-2026-06-10.hbp';
const B = (s) => Buffer.byteLength(s, 'utf8');

const text = fs.readFileSync(CATALOG, 'utf8');
const regLines = text.split(/\r?\n/).filter((l) => l.startsWith('REG|'));

// --- parse a pipe row into {raw, obj} ---
function parse(line) {
  const obj = { record_type: 'REG' };
  for (const tok of line.split('|').slice(1)) {
    const i = tok.indexOf('=');
    if (i === -1) continue;
    obj[tok.slice(0, i)] = tok.slice(i + 1);
  }
  return { raw: line, obj };
}
const rows = regLines.map(parse);

// --- (1) OLD HYDRATED JSON: descriptive keys + typed values ---
const KEY = { record_type: 'record_type', name: 'agent_name', pid: 'process_identifier',
  hilbert: 'hilbert_address', layer: 'layer', class: 'classification',
  g1024: 'glyph_behcs1024_index', g5: 'glyph_rule_of_five_index', sector: 'sector', status: 'status' };
const NUMERIC = new Set(['hilbert', 'g1024', 'g5']); // typed as JSON numbers (pid is hex -> string)
function toJson(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    const ek = KEY[k] || k;
    o[ek] = (NUMERIC.has(k) && /^-?\d+$/.test(v)) ? Number(v) : v;
  }
  return o;
}

// --- (3) VERB-OVERLAY codebook (shared, counted ONCE): keys dropped (positional),
//        categorical VALUES (layer/class/status) dictionary-coded; entropy fields kept verbatim ---
const FIELDS = ['name', 'pid', 'hilbert', 'layer', 'class', 'g1024', 'g5', 'sector', 'status'];
const CAT = ['layer', 'class', 'status'];
const dict = {};
for (const c of CAT) dict[c] = new Map();
for (const { obj } of rows) for (const c of CAT) if (obj[c] != null && !dict[c].has(obj[c])) dict[c].set(obj[c], dict[c].size);
// codebook bytes = field-order schema + each categorical dict ("idx=value\n")
let codebook_bytes = B(FIELDS.join('|') + '\n');
for (const c of CAT) for (const [val, idx] of dict[c]) codebook_bytes += B(`${c}${idx}=${val}\n`);

function verbRow(obj) {
  // positional, categoricals -> dict index, entropy kept
  const parts = FIELDS.map((f) => CAT.includes(f) ? String(dict[f].get(obj[f]) ?? '') : (obj[f] ?? ''));
  return parts.join('\x1f'); // unit separator
}

// --- measure a slice of N rows ---
function measure(N) {
  const slice = rows.slice(0, N);
  const objs = slice.map((r) => toJson(r.obj));
  const json_array = B(JSON.stringify(objs));
  const jsonl = objs.reduce((a, o) => a + B(JSON.stringify(o)) + 1, 0);
  const tuple = slice.reduce((a, r) => a + B(r.raw) + 1, 0);
  const verb = codebook_bytes + slice.reduce((a, r) => a + B(verbRow(r.obj)) + 1, 0);
  const glyph_ref = 8 * N; // referential handles only (codebook = the stored-once hydrated catalog)
  return {
    N,
    json_array_bytes: json_array,
    jsonl_bytes: jsonl,
    tuple_hbp_bytes: tuple,
    verb_overlay_bytes: verb,
    glyph_ref_bytes: glyph_ref,
    // LOSSLESS ratios (real, no info lost):
    'r_json/tuple': +(json_array / tuple).toFixed(2),
    'r_json/verb': +(json_array / verb).toFixed(2),
    'r_jsonl/verb': +(jsonl / verb).toFixed(2),
    // REFERENTIAL ratio (MODEL: json-at-point-of-use / 8-byte handle), excl. shared codebook:
    'r_json/glyphref': +(json_array / glyph_ref).toFixed(2),
  };
}

const Ns = [1, 5, 20, 50, 100, 250, 500, rows.length].filter((n, i, a) => n <= rows.length && a.indexOf(n) === i);
const curve = Ns.map(measure);

// asymptotic per-row averages (full catalog)
const full = curve[curve.length - 1];
const out = {
  catalog: CATALOG,
  catalog_raw_bytes: B(text),
  reg_rows: rows.length,
  codebook_bytes_shared_once: codebook_bytes,
  categorical_dict_sizes: Object.fromEntries(CAT.map((c) => [c, dict[c].size])),
  per_row_avg: {
    json_array: +(full.json_array_bytes / full.N).toFixed(1),
    tuple_hbp: +(full.tuple_hbp_bytes / full.N).toFixed(1),
    verb_overlay_payload: +((full.verb_overlay_bytes - codebook_bytes) / full.N).toFixed(1),
    glyph_ref: 8,
  },
  GROWTH_CURVE: curve,
  notes: {
    lossless: 'r_json/tuple and r_json/verb are MEASURED lossless (all per-row entropy kept). r_json/verb climbs with N as the shared codebook amortizes, then plateaus at the lossless asymptote.',
    referential: 'r_json/glyphref is a MODEL of the referential regime (row -> 8-byte BEHCS-256 handle into a stored-once codebook). The operator anchors 12:1 -> 21,141:1 -> ~3B:1 live in this regime and scale with reference-multiplicity (cache hits); this script does NOT re-derive them. They stand REAL on operator provenance.',
  },
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
