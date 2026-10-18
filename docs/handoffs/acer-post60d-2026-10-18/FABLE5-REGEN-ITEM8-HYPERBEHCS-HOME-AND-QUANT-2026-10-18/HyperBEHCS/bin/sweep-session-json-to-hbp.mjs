// Sweep this session's JSON/NDJSON outputs and convert to HBP + sidecar trinity.
// Per AGENTS.md L20-26: HBP hot-path, JSON cold-egress only.
//
// Targets (5 files emitted this session):
//   1. C:/HyperBEHCS/store/100-pid-roster-W113.json                     → .hbp
//   2. C:/HyperBEHCS/store/dashboard-supervisor-roster-W113.json        → .hbp
//   3. C:/HyperBEHCS/data/catalogs/pid-prompt-edges.ndjson              → .hbp
//   4. C:/HyperBEHCS/data/catalogs/pid-prompt-node-features.ndjson      → .hbp
//   5. C:/HyperBEHCS/data/catalogs/pid-prompt-noun-training-hrm-frames.ndjson → .hbp
//
// Originals renamed to *.cold.json (cold-egress archive per Codex hot-path canon).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TS = new Date().toISOString();
const ANCHOR = 'ASOLARIA-JSON-DISCIPLINE-SWEEP-2026-05-22';

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

function emitHbpRow(fields, prevHash) {
  const parts = ['HBPv1'];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    parts.push(`${k}=${String(v).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)}`);
  }
  parts.push(`antecedents=${prevHash}`, `ts=${TS}`, 'json=0', 'runtime=0', 'promote=0');
  const body = parts.join('|');
  const rh = sha16(body);
  return { row: `${body}|row_hash=${rh}\n`, hash: rh };
}

function emitSidecarTrinity(hbpPath, hbpContent, indexRows) {
  const fileSha = sha256Hex(hbpContent);
  fs.writeFileSync(hbpPath, hbpContent);
  fs.writeFileSync(hbpPath.replace('.hbp', '.hbi'), indexRows.join('\n') + '\n');
  fs.writeFileSync(hbpPath.replace('.hbp', '.sha256'), `${fileSha}  ${path.basename(hbpPath)}\n`);
  fs.writeFileSync(hbpPath.replace('.hbp', '.hex'), Buffer.from(hbpContent, 'utf8').toString('hex'));
  return fileSha;
}

const conversions = [];

// === 1. 100-pid-roster-W113.json ===
{
  const src = 'C:/HyperBEHCS/store/100-pid-roster-W113.json';
  if (fs.existsSync(src)) {
    const j = JSON.parse(fs.readFileSync(src, 'utf8'));
    const lines = [];
    const idx = [];
    let prev = '0000000000000000';
    const gen = emitHbpRow({ catalog: '100-pid-roster', layer: 'genesis', wave: j.wave, count: j.count, anchor_pid: ANCHOR }, prev);
    lines.push(gen.row);
    prev = gen.hash;
    for (const r of j.roster) {
      const e = emitHbpRow({
        catalog: '100-pid-roster',
        entry: r.pid,
        level: r.level,
        role: r.role,
        blast: r.blast,
        sup: r.sup,
        h: r.h,
        room: r.room,
      }, prev);
      lines.push(e.row);
      idx.push(`HBIv1|index=by-pid|key=${r.pid}|row_hash=${e.hash}|level=${r.level}|h=${r.h}`);
      prev = e.hash;
    }
    const dest = 'C:/HyperBEHCS/store/100-pid-roster-W113.hbp';
    const sha = emitSidecarTrinity(dest, lines.join(''), idx);
    fs.renameSync(src, src.replace('.json', '.cold.json'));
    conversions.push({ src, dest, rows: lines.length, sha });
  }
}

// === 2. dashboard-supervisor-roster-W113.json ===
{
  const src = 'C:/HyperBEHCS/store/dashboard-supervisor-roster-W113.json';
  if (fs.existsSync(src)) {
    const j = JSON.parse(fs.readFileSync(src, 'utf8'));
    const lines = [];
    const idx = [];
    let prev = '0000000000000000';
    const gen = emitHbpRow({ catalog: 'dashboard-supervisor-roster', layer: 'genesis', wave: j.wave, anchor_pid: ANCHOR,
      counts_supervisors: j.counts?.supervisors, counts_agents: j.counts?.agents, counts_routes: j.counts?.routes, counts_lanes: j.counts?.lanes }, prev);
    lines.push(gen.row); prev = gen.hash;
    for (const s of (j.supervisors || [])) {
      const e = emitHbpRow({ catalog: 'dashboard-supervisor-roster', kind: 'supervisor', entry: s }, prev);
      lines.push(e.row); idx.push(`HBIv1|index=by-supervisor|key=${s}|row_hash=${e.hash}`); prev = e.hash;
    }
    for (const a of (j.agents || [])) {
      const e = emitHbpRow({ catalog: 'dashboard-supervisor-roster', kind: 'agent', entry: a }, prev);
      lines.push(e.row); idx.push(`HBIv1|index=by-agent|key=${a}|row_hash=${e.hash}`); prev = e.hash;
    }
    for (const r of (j.routes || [])) {
      const e = emitHbpRow({ catalog: 'dashboard-supervisor-roster', kind: 'route', entry: r }, prev);
      lines.push(e.row); idx.push(`HBIv1|index=by-route|key=${r}|row_hash=${e.hash}`); prev = e.hash;
    }
    for (const l of (j.lanes || [])) {
      const e = emitHbpRow({ catalog: 'dashboard-supervisor-roster', kind: 'lane', entry: l }, prev);
      lines.push(e.row); idx.push(`HBIv1|index=by-lane|key=${l}|row_hash=${e.hash}`); prev = e.hash;
    }
    const dest = 'C:/HyperBEHCS/store/dashboard-supervisor-roster-W113.hbp';
    const sha = emitSidecarTrinity(dest, lines.join(''), idx);
    fs.renameSync(src, src.replace('.json', '.cold.json'));
    conversions.push({ src, dest, rows: lines.length, sha });
  }
}

// === 3-5. NDJSON files in data/catalogs ===
const ndjsonFiles = [
  { src: 'C:/HyperBEHCS/data/catalogs/pid-prompt-edges.ndjson', catalog: 'pid-prompt-edges' },
  { src: 'C:/HyperBEHCS/data/catalogs/pid-prompt-node-features.ndjson', catalog: 'pid-prompt-node-features' },
  { src: 'C:/HyperBEHCS/data/catalogs/pid-prompt-noun-training-hrm-frames.ndjson', catalog: 'pid-prompt-noun-training-hrm-frames' },
];
for (const { src, catalog } of ndjsonFiles) {
  if (!fs.existsSync(src)) continue;
  const rows = fs.readFileSync(src, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const lines = [];
  const idx = [];
  let prev = '0000000000000000';
  const gen = emitHbpRow({ catalog, layer: 'genesis', count: rows.length, anchor_pid: ANCHOR }, prev);
  lines.push(gen.row); prev = gen.hash;
  for (const r of rows) {
    const fields = { catalog };
    // flatten common fields
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'object' && v !== null) {
        fields[k] = JSON.stringify(v).slice(0, 200);
      } else {
        fields[k] = v;
      }
    }
    const e = emitHbpRow(fields, prev);
    lines.push(e.row);
    const key = r.pid || r.source_pid || r.id || r.entry || `row-${idx.length}`;
    idx.push(`HBIv1|index=by-key|key=${key}|row_hash=${e.hash}`);
    prev = e.hash;
  }
  const dest = src.replace('.ndjson', '.hbp');
  const sha = emitSidecarTrinity(dest, lines.join(''), idx);
  fs.renameSync(src, src.replace('.ndjson', '.cold.ndjson'));
  conversions.push({ src, dest, rows: lines.length, sha });
}

console.log('=== JSON DISCIPLINE SWEEP COMPLETE ===\n');
for (const c of conversions) {
  console.log(`  ${path.basename(c.src).padEnd(56)} → ${path.basename(c.dest)}`);
  console.log(`    rows: ${c.rows}, sha: ${c.sha.slice(0,16)}, original renamed to *.cold.* `);
}
console.log(`\nTotal: ${conversions.length} JSON files converted to HBP+sidecar trinity. Originals renamed to *.cold.* per AGENTS.md L20-26 (JSON cold-egress only).`);
