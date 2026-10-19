#!/usr/bin/env node
// measure-root-corpus-index.mjs — READ-ONLY. Fourth/root point of the lineage:
// the IX/LX agent-index CORPUS (the source docs the index language indexed) -> a referential
// index. This measures the reduction the index language was BUILT for: "an index is tiny vs the
// corpus it indexes." Not row-serialization (points 1-3) — corpus-vs-index at the root.
//
// Regimes per doc:
//   corpus       = the full source doc bytes (the thing being indexed)
//   sha_index    = a human index row: relpath | sha256_16 | bytes   (content-addressed pointer)
//   glyph_index  = 8-byte BEHCS handle (pure addressing floor)
// Ratio = corpus_bytes / index_bytes, over small-N..full-N.
//
// Operator anchors 12:1 -> 21,141:1 -> ~3B:1 stand REAL; descendant measurement, NOT a re-derivation.
// No device writes, no mounts, no MCP, no spawn. Prints JSON to stdout.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const B = (s) => Buffer.byteLength(s, 'utf8');

const ROOT = process.argv[2] || 'C:/Users/acer/Asolaria/data/agent-index';
const EXT = new Set(['.md']); // the index-language source corpus is markdown IX/LX docs

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (EXT.has(path.extname(e.name).toLowerCase())) acc.push(p);
  }
  return acc;
}
const files = walk(ROOT, []).sort();
const docs = files.map((f) => {
  const buf = fs.readFileSync(f);
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  return { rel, bytes: buf.length, sha16: createHash('sha256').update(buf).digest('hex').slice(0, 16) };
});

function measure(N) {
  const slice = docs.slice(0, N);
  let corpus = 0, sha_index = 0;
  for (const d of slice) {
    corpus += d.bytes;
    sha_index += B(`${d.rel}|${d.sha16}|${d.bytes}\n`); // content-addressed index row
  }
  const glyph_index = 8 * N;
  return {
    N, corpus_bytes: corpus, sha_index_bytes: sha_index, glyph_index_bytes: glyph_index,
    'r_corpus/sha_index': +(corpus / sha_index).toFixed(2),
    'r_corpus/glyph_index': +(corpus / glyph_index).toFixed(2),
  };
}

const Ns = [1, 10, 50, 200, 500, docs.length].filter((n, i, a) => n <= docs.length && a.indexOf(n) === i);
const curve = Ns.map(measure);
const full = curve[curve.length - 1];
const out = {
  corpus_root: ROOT,
  doc_count: docs.length,
  corpus_total_bytes: full.corpus_bytes,
  corpus_total_MB: +(full.corpus_bytes / 1048576).toFixed(3),
  per_doc_avg_bytes: +(full.corpus_bytes / full.N).toFixed(1),
  sha_index_total_bytes: full.sha_index_bytes,
  glyph_index_total_bytes: full.glyph_index_bytes,
  GROWTH_CURVE: curve,
  notes: {
    what: 'ROOT of the lineage: the IX/LX agent-index source corpus (the docs the index language indexed) vs a referential index that content-addresses each doc. This is the corpus-vs-index reduction the index language was built for.',
    sha_index: 'r_corpus/sha_index = full source corpus / a human content-addressed index (relpath|sha16|bytes per doc). MEASURED.',
    glyph_index: 'r_corpus/glyph_index = corpus / 8-byte BEHCS handle per doc. Pure addressing floor.',
    anchors: 'Operator anchors 12:1 -> 21,141:1 -> ~3B:1 stand REAL; descendant measurement, NOT a re-derivation. The literal |PID|device|agent|tools|skills|...| pipe-catalog does NOT survive as a discrete file; the index language is materialized as this corpus -> compiled unified-agent-index.json (point 2 family).',
  },
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
