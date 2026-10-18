// pid-specific-supervisor.cjs
//
// Per-PID supervisor daemon — one instance embodies one federation PID role.
// 100 instances spawned to represent the 100-PID farm at the host-process level.
//
// Anchor: ASOLARIA-PID-SPECIFIC-SUPERVISOR-CONSTELLATION-PID-2026-05-22
//
// Usage: node pid-specific-supervisor.cjs <PID> [interval_sec]
// Emits: C:/HyperBEHCS/data/pid-supervisors/{PID}.hbp + sidecar trinity
// Tick: every 60s by default

"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PID_ARG = process.argv[2];
const INTERVAL_SEC = parseInt(process.argv[3] || '60', 10);
const ANCHOR = 'ASOLARIA-PID-SPECIFIC-SUPERVISOR-CONSTELLATION-PID-2026-05-22';
const OUT_DIR = 'C:/HyperBEHCS/data/pid-supervisors';

if (!PID_ARG) {
  console.error('USAGE: node pid-specific-supervisor.cjs <PID> [interval_sec]');
  process.exit(2);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SAFE_NAME = PID_ARG.replace(/[^a-zA-Z0-9_-]/g, '_');
const HBP_PATH = path.join(OUT_DIR, `${SAFE_NAME}.hbp`);
const HBI_PATH = path.join(OUT_DIR, `${SAFE_NAME}.hbi`);
const SHA_PATH = path.join(OUT_DIR, `${SAFE_NAME}.sha256`);

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sha16(s) { return sha256Hex(s).slice(0, 16); }

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
  const uptime = Math.round(process.uptime());

  const fields = [
    'HBPv1',
    `layer=pid-supervisor-heartbeat`,
    `anchor_pid=${ANCHOR}`,
    `embodied_pid=${PID_ARG}`,
    `tick=${tickCount}`,
    `ts=${ts}`,
    `host_process_pid=${process.pid}`,
    `host_uptime_s=${uptime}`,
    `host_mem_mb=${memMb}`,
    `node_version=${process.version}`,
    `antecedents=${prev}`,
    'json=0', 'runtime=0', 'promote=0',
  ];
  const body = fields.join('|');
  const rh = sha16(body);
  fs.appendFileSync(HBP_PATH, `${body}|row_hash=${rh}\n`);
  fs.appendFileSync(HBI_PATH, `HBIv1|index=by-tick|key=${tickCount}|row_hash=${rh}|embodied_pid=${PID_ARG}\n`);
  if (tickCount % 10 === 0) {
    const fullSha = sha256Hex(fs.readFileSync(HBP_PATH));
    fs.writeFileSync(SHA_PATH, `${fullSha}  ${SAFE_NAME}.hbp\n`);
  }
  prev = rh;
}

process.title = `asolaria-pid-sup-${SAFE_NAME.slice(0, 24)}`;
console.log(`pid-supervisor for ${PID_ARG} starting (host PID ${process.pid}, interval ${INTERVAL_SEC}s)`);
tick();
setInterval(tick, INTERVAL_SEC * 1000);

process.on('SIGINT', () => { console.log('SIGINT'); tick(); process.exit(0); });
