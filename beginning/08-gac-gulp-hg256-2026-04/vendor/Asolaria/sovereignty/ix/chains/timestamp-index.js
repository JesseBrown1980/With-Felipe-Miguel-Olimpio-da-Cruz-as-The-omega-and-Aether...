#!/usr/bin/env node
// IX chain: timestamp-index | PID: asolaria-core-v1 | Profile: asolaria
// Every action gets a timestamp + catalog entry. The chain of evidence.
// Append-only NDJSON log. Every IX entry, every verb, every chain gets stamped.
// Reference: IX-321 (self-indexing rule), IX-518 (Language V2.1)
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'timestamp-index.ndjson');
const PID = 'asolaria-core-v1';

function ensureDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function stamp(entry) {
  ensureDir();
  const record = {
    ts: new Date().toISOString(),
    pid: entry.pid || PID,
    action: entry.action || 'unknown',
    ix: entry.ix || null,
    chain: entry.chain || null,
    verb: entry.verb || null,
    target: entry.target || null,
    result: entry.result || null,
    note: entry.note || null,
    session: entry.session || process.env.ASOLARIA_SESSION || null
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  return record;
}

function readLog(maxLines) {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n');
  const slice = maxLines ? lines.slice(-maxLines) : lines;
  return slice.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function stats() {
  const entries = readLog();
  const actions = {};
  const pids = {};
  for (const e of entries) {
    actions[e.action] = (actions[e.action] || 0) + 1;
    pids[e.pid] = (pids[e.pid] || 0) + 1;
  }
  return {
    total: entries.length,
    first: entries[0]?.ts || null,
    last: entries[entries.length - 1]?.ts || null,
    actions,
    pids
  };
}

// CLI mode
async function main(arg) {
  if (arg === 'stats') {
    return stats();
  }
  if (arg === 'tail') {
    return readLog(20);
  }
  // Default: stamp this session start
  return stamp({ action: 'session-start', note: 'timestamp-index chain invoked' });
}

module.exports = { stamp, readLog, stats };
module.exports.default = main;
if (require.main === module) {
  main(process.argv[2]).then(r => console.log(JSON.stringify(r, null, 2)));
}
