#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..', '..');
const INBOX   = path.join(ROOT, 'data', 'behcs', 'inbox.ndjson');
const OUT     = path.join(ROOT, 'data', 'behcs', 'gnn-edges.ndjson');
const ACCEPT  = new Set(['gnn_edge', 'wave_pulse', 'cross_host_sync']);

function transform(entry) {
  const verb = entry.type === 'gnn_edge'        ? (entry.verb || entry.payload?.verb || 'gnn.edge')
             : entry.type === 'wave_pulse'       ? (entry.verb || entry.payload?.verb || 'wave.pulse')
             :                                     (entry.verb || entry.payload?.verb || 'cross_host.sync');
  return JSON.stringify({
    from:   entry.from   || 'unknown',
    to:     entry.to     || 'unknown',
    verb,
    weight: entry.weight ?? entry.payload?.weight ?? 1,
    ts:     entry.ts     || new Date().toISOString(),
    source: 'inbox-ingestion'
  });
}

// --- main ---
if (!fs.existsSync(INBOX)) {
  console.log('[ingest-gnn-edges] inbox not found at', INBOX);
  process.exit(0);
}

const raw   = fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean);
const edges = [];

for (const line of raw) {
  try {
    const entry = JSON.parse(line);
    if (ACCEPT.has(entry.type)) edges.push(transform(entry));
  } catch { /* skip malformed */ }
}

if (edges.length === 0) {
  console.log('[ingest-gnn-edges] 0 matching entries (gnn_edge|wave_pulse|cross_host_sync) in', raw.length, 'inbox lines');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.appendFileSync(OUT, edges.join('\n') + '\n');
console.log(`[ingest-gnn-edges] ingested ${edges.length} edges from ${raw.length} inbox lines → ${OUT}`);
