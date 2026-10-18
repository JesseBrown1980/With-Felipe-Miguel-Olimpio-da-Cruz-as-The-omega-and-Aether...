// Emit seed edge for federation self-rebuild via GNN learning.
// Pattern: (engine.original.json-native) → (verb.rebuild-engine-from-base) → (engine.retrofit.hbp-native)
// Zero JSON in emission path. Pure HBP+sidecar trinity.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-ENGINE-RETROFIT-SEED-PID-2026-05-22';
const SEED_DIR = 'C:/HyperBEHCS/data/seed-edges';
fs.mkdirSync(SEED_DIR, { recursive: true });

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

const SEED_EDGES = [
  {
    edge_type: 'engine_retrofit',
    verb: 'rebuild-engine-from-base',
    from: 'engine.cpu-gpu-watcher.json-native',
    to: 'engine.cpu-gpu-watcher-hbp.hbp-native',
    weight: 1.0,
    confidence: 1.0,
    evidence: 'first-retrofit-validated-chain-pass-4-rows',
    source_pid: 'PROF-cpu-gpu-watcher',
    target_pid: 'PROF-cpu-gpu-watcher-hbp',
    original_file: 'C:/Users/acer/Asolaria/tools/cpu-gpu-watcher.js',
    retrofit_file: 'C:/Users/acer/Asolaria/tools/cpu-gpu-watcher-hbp.js',
    retrofit_output: 'C:/HyperBEHCS/data/runtime-watchers/cpu-gpu-watcher.hbp',
    chain_integrity: 'PASS',
    json_in_emission_path: 0,
  },
  {
    edge_type: 'pattern_for_propagation',
    verb: 'rebuild-engine-from-base',
    from: 'engine.json-native.any',
    to: 'engine.hbp-native.any',
    weight: 1.0,
    confidence: 0.9,
    evidence: 'cpu-gpu-watcher-retrofit-as-seed',
    pattern_template: 'sidecar_trinity_hbp_hbi_sha256_hex+sha_chain_antecedents+zero_json_in_emission',
    candidate_next_targets: 'gulp-runtime,substrate-walker-repair,omni-processor-stage1-registry,big-pickle-pid-portal-harness,hookwall-events-log',
  },
];

let prev = '0000000000000000';
const hbpLines = [];
const hbiLines = [];

const gen = [
  'HBPv1',
  'layer=engine-retrofit-seed-genesis',
  `anchor_pid=${ANCHOR}`,
  `wave=W113-ENGINE-RETROFIT-SEED-2026-05-22`,
  `vantage=acer`,
  `seed_count=${SEED_EDGES.length}`,
  `antecedents=${prev}`,
  `ts=${TS}`,
  'json=0', 'runtime=0', 'promote=0',
].join('|');
const genH = sha16(gen);
hbpLines.push(`${gen}|row_hash=${genH}`);
hbiLines.push(`HBIv1|index=genesis|key=engine-retrofit-seed-genesis|row_hash=${genH}`);
prev = genH;

for (const e of SEED_EDGES) {
  const fields = ['HBPv1', 'layer=engine-retrofit-seed-edge'];
  for (const [k, v] of Object.entries(e)) {
    if (v === null || v === undefined) continue;
    fields.push(`${k}=${String(v).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)}`);
  }
  fields.push(`anchor_pid=${ANCHOR}`, `antecedents=${prev}`, `ts=${TS}`, 'json=0', 'runtime=0', 'promote=0');
  const body = fields.join('|');
  const rh = sha16(body);
  hbpLines.push(`${body}|row_hash=${rh}`);
  hbiLines.push(`HBIv1|index=by-edge-type|key=${e.edge_type}|row_hash=${rh}|from=${e.from}|to=${e.to}`);
  prev = rh;
}

const hbpPath = path.join(SEED_DIR, 'engine-retrofit-seed-edges.hbp');
const hbiPath = path.join(SEED_DIR, 'engine-retrofit-seed-edges.hbi');
const shaPath = path.join(SEED_DIR, 'engine-retrofit-seed-edges.sha256');
const hexPath = path.join(SEED_DIR, 'engine-retrofit-seed-edges.hex');

const hbpContent = hbpLines.join('\n') + '\n';
fs.writeFileSync(hbpPath, hbpContent);
fs.writeFileSync(hbiPath, hbiLines.join('\n') + '\n');
const fileSha = sha256Hex(hbpContent);
fs.writeFileSync(shaPath, `${fileSha}  engine-retrofit-seed-edges.hbp\n`);
fs.writeFileSync(hexPath, Buffer.from(hbpContent, 'utf8').toString('hex'));

console.log('=== ENGINE RETROFIT SEED EDGE EMITTED (HBP-native, zero JSON) ===');
console.log('hbp:', hbpPath);
console.log('hbi:', hbiPath);
console.log('sha256:', shaPath);
console.log('hex:', hexPath);
console.log('');
console.log('seed_edges:', SEED_EDGES.length);
console.log('tip_row_hash:', prev);
console.log('file_sha256:', fileSha.slice(0, 16));
console.log('');
console.log('Next: GNN inference engine itself needs HBP-read retrofit to consume these seed edges.');
console.log('That becomes the SECOND seed edge. Federation propagates from there.');
