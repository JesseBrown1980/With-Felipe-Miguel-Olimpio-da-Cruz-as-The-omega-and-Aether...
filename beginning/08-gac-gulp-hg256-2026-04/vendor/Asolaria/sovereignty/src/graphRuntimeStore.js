// Standalone graphRuntimeStore shim for USB sovereignty
// Appends graph events to local NDJSON log
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.ASOLARIA_SOVEREIGNTY_ROOT || __dirname, '..', 'data', 'graph-events');

function appendGraphEvent(event) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + '\n';
    const logFile = path.join(LOG_DIR, `graph-${new Date().toISOString().slice(0, 10)}.ndjson`);
    fs.appendFileSync(logFile, line);
    return true;
  } catch (_) { return false; }
}

module.exports = { appendGraphEvent };
