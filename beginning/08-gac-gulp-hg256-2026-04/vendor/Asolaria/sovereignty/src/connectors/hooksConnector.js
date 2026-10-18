// Standalone hooksConnector shim for owner-bound local sovereignty.
// Replaces the full Asolaria server dependency with local-first operation.
const fs = require('fs');
const path = require('path');
const { buildTransportTruth } = require('../ownerBoundTransportTruth');

const BASE_ROOT = process.env.ASOLARIA_SOVEREIGNTY_ROOT || path.join(__dirname, '..', '..');
const LOG_DIR = path.join(BASE_ROOT, 'data', 'hook-events');

// Dangerous verbs that pre_tool_guard blocks outright
const BLOCKED_VERBS = new Set([
  'rm_rf', 'format_disk', 'drop_database', 'delete_sovereignty',
  'flash_bios_no_backup', 'disable_all_gates', 'bypass_hookwall'
]);

function getGuardVerdict(verb, args) {
  if (BLOCKED_VERBS.has(verb)) return { blocked: true, reason: `verb "${verb}" is permanently blocked` };
  if (typeof args?.command === 'string' && /rm\s+(-rf?|--recursive)\s+\//.test(args.command)) {
    return { blocked: true, reason: 'recursive delete on root path blocked' };
  }
  return { blocked: false };
}

function ingestHookEvent(event) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const transportTruth = buildTransportTruth(event);
    const line = JSON.stringify({
      ...event,
      transportTruth,
      operationalChain: transportTruth.operationalChain,
      ingested: new Date().toISOString()
    }) + '\n';
    const logFile = path.join(LOG_DIR, `hooks-${new Date().toISOString().slice(0, 10)}.ndjson`);
    fs.appendFileSync(logFile, line);
  } catch (_) { /* fail silently — hooks must not crash the system */ }
}

module.exports = { getGuardVerdict, ingestHookEvent };
