// prof-supervisor-daemon.cjs — generic per-prof/supervisor daemon
//
// Anchor: ASOLARIA-PROF-SUPERVISOR-CONSTELLATION-PID-2026-05-22
//
// Usage: node prof-supervisor-daemon.cjs <ENTITY_NAME> [kind] [band] [interval_sec]
// Emits: C:/HyperBEHCS/data/prof-supervisors/{ENTITY_NAME}.hbp + sidecar trinity

"use strict";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENTITY = process.argv[2];
const KIND = process.argv[3] || 'unknown';
const BAND = process.argv[4] || 'unknown';
const INTERVAL_SEC = parseInt(process.argv[5] || '60', 10);
const ANCHOR = 'ASOLARIA-PROF-SUPERVISOR-CONSTELLATION-PID-2026-05-22';
const OUT_DIR = 'C:/HyperBEHCS/data/prof-supervisors';

if (!ENTITY) { console.error('USAGE: node prof-supervisor-daemon.cjs <ENTITY> [kind] [band] [interval_sec]'); process.exit(2); }
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SAFE = ENTITY.replace(/[^a-zA-Z0-9_-]/g, '_');
const HBP_PATH = path.join(OUT_DIR, `${SAFE}.hbp`);
const HBI_PATH = path.join(OUT_DIR, `${SAFE}.hbi`);

function sha16(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }
function readTip() {
  if (!fs.existsSync(HBP_PATH)) return '0000000000000000';
  const c = fs.readFileSync(HBP_PATH, 'utf8').trim();
  if (!c) return '0000000000000000';
  const lines = c.split('\n');
  const m = lines[lines.length - 1].match(/row_hash=([a-f0-9]{16})/);
  return m ? m[1] : '0000000000000000';
}

let prev = readTip();
let tickCount = 0;

function tick() {
  tickCount++;
  const ts = new Date().toISOString();
  const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  const fields = [
    'HBPv1',
    `layer=prof-supervisor-heartbeat`,
    `anchor_pid=${ANCHOR}`,
    `entity=${ENTITY}`,
    `kind=${KIND}`,
    `band=${BAND}`,
    `tick=${tickCount}`,
    `ts=${ts}`,
    `host_process_pid=${process.pid}`,
    `host_mem_mb=${memMb}`,
    `antecedents=${prev}`,
    'json=0', 'runtime=0', 'promote=0',
  ];
  const body = fields.join('|');
  const rh = sha16(body);
  fs.appendFileSync(HBP_PATH, `${body}|row_hash=${rh}\n`);
  fs.appendFileSync(HBI_PATH, `HBIv1|index=by-tick|key=${tickCount}|row_hash=${rh}|entity=${ENTITY}|kind=${KIND}\n`);
  prev = rh;
}

process.title = `aso-prof-${SAFE.slice(0, 28)}`;
console.log(`prof-supervisor for ${ENTITY} [${KIND}/${BAND}] starting (host PID ${process.pid})`);
tick();
setInterval(tick, INTERVAL_SEC * 1000);
process.on('SIGINT', () => { tick(); process.exit(0); });
