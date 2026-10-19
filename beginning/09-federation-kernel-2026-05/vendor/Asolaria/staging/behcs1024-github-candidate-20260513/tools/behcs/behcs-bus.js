#!/usr/bin/env node
/**
 * behcs-bus.js — BEHCS Omnidirectional Message Bus
 *
 * Brown-Edens-Hilbert-Chiqueto-Smith universal device communication.
 * Every device talks to every device. Three modes: real, shadow, stealth.
 *
 * Starts an HTTP server on the device that accepts + sends messages
 * to any other device in the BEHCS registry.
 *
 * Usage:
 *   node tools/behcs/behcs-bus.js                    # start bus on this device
 *   node tools/behcs/behcs-bus.js --send <device> <message>  # send to device
 *   node tools/behcs/behcs-bus.js --health            # check all devices
 *
 * Cube: D34 CROSS_COLONY (2685619) + D26 OMNIDIRECTIONAL (1030301)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { ingressCheck: schemaIngressCheck } = require('./schema-ingress.js');

// Structured logger (additive to existing audit/NDJSON paths). Uses dynamic
// import so a missing module never breaks the daemon. Cached after first load.
// Mirrors the agent-keyboard pattern (cascade C6).
let _slogModulePromise = null;
function slog(component, event, fields) {
  try {
    if (!_slogModulePromise) {
      _slogModulePromise = import('./structured-log.mjs').catch(function () { return null; });
    }
    _slogModulePromise.then(function (mod) {
      if (mod && typeof mod.slog === 'function') {
        mod.slog(component, event, fields || {}).catch(function () {});
      }
    }).catch(function () {});
  } catch (_) {
    // never throw
  }
}

// Q-003 schema-ingress mode: "observe" (default, log-only), "warn", "reject"
const SCHEMA_INGRESS_MODE = process.env.BEHCS_SCHEMA_INGRESS_MODE || 'observe';

// 2026-04-28 per-envelope-type enforce override for the C1 schema validator.
// Comma-separated list of msg.type values whose violations should produce
// HTTP 422 + _schema_check.action="reject" (instead of the default
// warn-mode where action is always "accept"). Default: empty set, which
// preserves current production warn-mode behavior. Example:
//   BEHCS_SCHEMA_ENFORCE_TYPES=FIRST_MESSAGE_CANON,CANON_LOADED_ACK
const SCHEMA_ENFORCE_TYPES = new Set(
  String(process.env.BEHCS_SCHEMA_ENFORCE_TYPES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

// G-090 staleness surface
const PROCESS_STARTED_AT = new Date().toISOString();
let SOURCE_COMMIT = 'unknown';
try {
  SOURCE_COMMIT = execSync('git -C C:/asolaria-acer rev-parse HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().slice(0, 12);
} catch { /* not a repo or no git */ }

const ROOT = process.env.BEHCS_ROOT || 'C:/Users/acer/Asolaria';
const BEHCS_DIR = path.join(ROOT, 'data/behcs');
const INBOX = path.join(BEHCS_DIR, 'inbox.ndjson');
const OUTBOX = path.join(BEHCS_DIR, 'outbox.ndjson');
const REGISTRY = path.join(BEHCS_DIR, 'device-registry.json');
const SYMBOL_TABLE = path.join(BEHCS_DIR, 'symbol-table-256.json');

// 2026-04-18 ingress sig-verify — complements Liris's outbound signer.
// Loads the ed25519 registry lazily per-request so acer picks up new
// peer keys without needing a bus restart.
const ED25519_REGISTRY_PATH = process.env.ED25519_REGISTRY || 'C:/asolaria-acer/kernel/ed25519-registry.json';
// 2026-04-28 hot-reload instrumentation — track last observed registry mtime
// and emit an EVT-REGISTRY-RELOAD line each time mtime advances. Allows key
// rotations without daemon restart and gives operators an audit trail.
const REGISTRY_RELOAD_LOG = path.join(process.env.BEHCS_ROOT || 'C:/Users/acer/Asolaria', 'logs', 'registry-reload.log');
let ED25519_REGISTRY_LAST_MTIME_MS = 0;
let ED25519_REGISTRY_LAST_KEY_COUNT = 0;

function loadEd25519Registry() {
  try {
    if (!fs.existsSync(ED25519_REGISTRY_PATH)) return null;
    const st = fs.statSync(ED25519_REGISTRY_PATH);
    const parsed = JSON.parse(fs.readFileSync(ED25519_REGISTRY_PATH, 'utf-8'));
    if (st.mtimeMs !== ED25519_REGISTRY_LAST_MTIME_MS) {
      const prevMtime = ED25519_REGISTRY_LAST_MTIME_MS;
      const prevKeyCount = ED25519_REGISTRY_LAST_KEY_COUNT;
      const keyCount = Array.isArray(parsed && parsed.keys) ? parsed.keys.length : 0;
      ED25519_REGISTRY_LAST_MTIME_MS = st.mtimeMs;
      ED25519_REGISTRY_LAST_KEY_COUNT = keyCount;
      const entry = {
        event: 'EVT-REGISTRY-RELOAD',
        ts: new Date().toISOString(),
        registry_path: ED25519_REGISTRY_PATH,
        prev_mtime_ms: prevMtime,
        new_mtime_ms: st.mtimeMs,
        prev_mtime_iso: prevMtime ? new Date(prevMtime).toISOString() : null,
        new_mtime_iso: new Date(st.mtimeMs).toISOString(),
        size_bytes: st.size,
        key_count: keyCount,
        prev_key_count: prevKeyCount,
        key_count_delta: keyCount - prevKeyCount,
        first_load: prevMtime === 0,
        device: process.env.BEHCS_DEVICE || 'acer',
        glyph_sentence: `EVT-REGISTRY-RELOAD · keys=${keyCount} · delta=${keyCount - prevKeyCount} · mtime=${new Date(st.mtimeMs).toISOString()} @ M-EYEWITNESS .`,
      };
      try {
        ensureDir(path.dirname(REGISTRY_RELOAD_LOG));
        fs.appendFileSync(REGISTRY_RELOAD_LOG, JSON.stringify(entry) + '\n');
      } catch (logErr) {
        console.error('[BEHCS:registry] reload log write error:', logErr.message);
      }
      console.log(`[BEHCS] registry reload · keys=${keyCount} · delta=${keyCount - prevKeyCount} · mtime=${new Date(st.mtimeMs).toISOString()}`);
    }
    return parsed;
  } catch { return null; }
}

function rawPubKeyToKeyObject(b64) {
  const raw = Buffer.from(b64, 'base64');
  // SPKI ed25519 wrapper: 302a300506032b6570032100 <32 bytes>
  const header = Buffer.from('302a300506032b6570032100', 'hex');
  const der = Buffer.concat([header, raw]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

// Returns { verdict: 'VERIFIED'|'REJECTED'|'UNSIGNED', reason, owner_glyph, key_id }
function verifyIngressEnvelope(msg) {
  // Accept two shapes:
  //   (a) top-level { payload, signature: { key_id, sig_b64, alg, signed_at } }  (D-055 SignedEnvelope<T>)
  //   (b) nested body.*_signed_envelope same shape (observed in bilateral reciprocal)
  //   (c) no signature → UNSIGNED (backward compat)
  let envelope = null;
  let nested = false; // true when shape (b) — used by W8-4 scope cross-check
  if (msg && msg.signature && msg.payload) envelope = msg;
  else if (msg && msg.body && typeof msg.body === 'object') {
    for (const k of Object.keys(msg.body)) {
      const v = msg.body[k];
      if (v && typeof v === 'object' && v.signature && v.payload) { envelope = v; nested = true; break; }
    }
  }
  if (!envelope) return { verdict: 'UNSIGNED' };

  const sig = envelope.signature;
  if (!sig.key_id || !sig.sig_b64) return { verdict: 'REJECTED', reason: 'missing_sig_fields' };
  if (sig.alg && sig.alg !== 'ed25519') return { verdict: 'REJECTED', reason: 'wrong_alg', key_id: sig.key_id };

  const reg = loadEd25519Registry();
  if (!reg) return { verdict: 'REJECTED', reason: 'registry_not_loadable', key_id: sig.key_id };

  const entry = (reg.keys || []).find(k => k.key_id === sig.key_id);
  if (!entry) return { verdict: 'REJECTED', reason: 'key_not_in_registry', key_id: sig.key_id };
  if (entry.rotated_at) return { verdict: 'REJECTED', reason: 'key_rotated_out', key_id: sig.key_id, owner_glyph: entry.owner_glyph };

  try {
    const pub = rawPubKeyToKeyObject(entry.public_key_b64);
    const ok = crypto.verify(null, Buffer.from(JSON.stringify(envelope.payload), 'utf-8'), pub, Buffer.from(sig.sig_b64, 'base64'));
    if (!ok) return { verdict: 'REJECTED', reason: 'signature_mismatch', key_id: sig.key_id, owner_glyph: entry.owner_glyph };

    // 2026-04-28 W8-4 scope cross-check. For nested shape (b) the
    // signature only covers the inner subset (id/ts/from/to/type/verb/pid),
    // but downstream consumers read msg.from/to/id/ts/type/verb from the
    // OUTER envelope. An attacker (or buggy intermediary) could mutate
    // outer headers and reuse the inner+sig pair. We require the inner
    // subset to match the outer same-named fields. Shape (a) signs the
    // outer envelope itself so this gap doesn't apply.
    if (nested) {
      const inner = envelope.payload || {};
      const fields = ['id', 'ts', 'from', 'to', 'type', 'verb'];
      const mismatched = [];
      for (const f of fields) {
        if (Object.prototype.hasOwnProperty.call(inner, f)
            && Object.prototype.hasOwnProperty.call(msg, f)
            && inner[f] !== msg[f]) {
          mismatched.push({ field: f, outer: msg[f], inner: inner[f] });
        }
      }
      if (mismatched.length > 0) {
        return {
          verdict: 'REJECTED',
          reason: 'scope_mismatch_outer_inner',
          key_id: sig.key_id,
          owner_glyph: entry.owner_glyph,
          mismatched_fields: mismatched,
        };
      }
    }

    return { verdict: 'VERIFIED', key_id: sig.key_id, owner_glyph: entry.owner_glyph, host_device: entry.host_device, scope: nested ? 'nested-inner-with-outer-crosscheck' : 'top-level' };
  } catch (e) {
    return { verdict: 'REJECTED', reason: 'verify_exception:' + (e.message || String(e)), key_id: sig.key_id };
  }
}

const DEFAULT_PORT = parseInt(process.env.BEHCS_PORT || '4947'); // 47th dim cube-adjacent
const DEVICE_ID = process.env.BEHCS_DEVICE || 'acer';

// 2026-04-28 enhancements (additive, no behavioral break to existing routes).
//   1. /behcs/canon/current?target= helper
//   2. enriched /behcs/health (sig_events_count_24h, last_canon_load_at)
//   3. real schema validator (warn-mode, no rejection)
//   4. per-source-IP sliding-1s rate limit on /behcs/send
const CANON_LOAD_LOG = path.join(ROOT, 'logs', 'canon-load.log');
const INGRESS_SIG_EVENTS = path.join(BEHCS_DIR, 'ingress-sig-events.ndjson');
const INGRESS_SCHEMA_REJECTIONS = path.join(BEHCS_DIR, 'ingress-schema-rejections.ndjson');
const CLAUDE_SETTINGS_PATH = process.env.BEHCS_CLAUDE_SETTINGS || path.join(ROOT, '.claude', 'settings.json');

// 2026-04-28 G-cascade /behcs/status — service version + bus uptime anchor.
// uptime_seconds derives from PROCESS_STARTED_AT, version is bumped here so
// downstream operators can pin against bus revisions even when the source
// commit is unknown.
const SERVICE_VERSION = '1.4.0';

// E15-style hooks cache: read .claude/settings.json once at boot, re-read on
// mtime change. Exposed via /behcs/status as `hooks_registered` (sorted list
// of hook event names).
let HOOKS_CACHE = { mtimeMs: 0, hooks_registered: [], loaded_at: null, error: null };
function refreshHooksCache() {
  try {
    const st = fs.statSync(CLAUDE_SETTINGS_PATH);
    if (st.mtimeMs === HOOKS_CACHE.mtimeMs && HOOKS_CACHE.loaded_at) return HOOKS_CACHE;
    const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const hooks = parsed && parsed.hooks && typeof parsed.hooks === 'object' ? Object.keys(parsed.hooks) : [];
    HOOKS_CACHE = {
      mtimeMs: st.mtimeMs,
      hooks_registered: hooks.slice().sort(),
      loaded_at: new Date().toISOString(),
      error: null,
    };
  } catch (e) {
    HOOKS_CACHE = { mtimeMs: 0, hooks_registered: [], loaded_at: HOOKS_CACHE.loaded_at, error: e.message || String(e) };
  }
  return HOOKS_CACHE;
}

// Best-effort peer reachability cache populated by an in-process probe loop.
// Lean: HEAD-style GET /behcs/health with 2s timeout. Stamped on each cycle.
const PEER_REACH_CACHE = new Map(); // peer_id -> { reachable, last_check_at, latency_ms, error }
function probePeerOnce(peerId, endpoint) {
  return new Promise((resolveP) => {
    let url;
    try { url = new URL('/behcs/health', endpoint); }
    catch { resolveP({ reachable: false, last_check_at: new Date().toISOString(), error: 'bad_url' }); return; }
    const start = Date.now();
    const req = http.get(url, { timeout: 2000 }, (r) => {
      r.resume();
      r.on('end', () => {
        const ok = r.statusCode >= 200 && r.statusCode < 300;
        resolveP({ reachable: ok, last_check_at: new Date().toISOString(), latency_ms: Date.now() - start });
      });
      r.on('error', (e) => resolveP({ reachable: false, last_check_at: new Date().toISOString(), error: e.code || e.message }));
    });
    req.on('timeout', () => { req.destroy(); resolveP({ reachable: false, last_check_at: new Date().toISOString(), error: 'timeout' }); });
    req.on('error', (e) => resolveP({ reachable: false, last_check_at: new Date().toISOString(), error: e.code || e.message }));
  });
}

// Rate limiter — sliding 1s window per source IP. 30 envelopes / sec ceiling.
const RATE_LIMIT_MAX = parseInt(process.env.BEHCS_SEND_RPS || '30', 10);
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_BUCKETS = new Map(); // ip -> array of recent ts (ms)

// 2026-04-28 e10ba926 cosign-drift fix (W3-E17 / W5-1):
// in-memory dedup of envelope ids. Ring of last DEDUP_RING_MAX ids with
// parallel Maps for ts and content-hash. /behcs/send rejects duplicate ids
// with HTTP 409 before appending to inbox.ndjson. Seeded from inbox tail at
// startup so the protection survives daemon restarts.
const DEDUP_RING_MAX = parseInt(process.env.BEHCS_DEDUP_RING_MAX || '1000', 10);
const DEDUP_IDS = new Map();              // id -> ts (ISO string of first sighting)
const DEDUP_CONTENT_HASHES = new Map();   // id -> 16-char content hash
const DEDUP_ORDER = [];                   // FIFO of ids for ring eviction
const DEDUP_REJECTIONS_LOG = path.join(ROOT, 'logs', 'dedup-rejections.ndjson');

function dedupRemember(id, ts, contentHash) {
  if (!id) return;
  if (DEDUP_IDS.has(id)) return; // first sighting wins
  DEDUP_IDS.set(id, ts || null);
  if (contentHash) DEDUP_CONTENT_HASHES.set(id, contentHash);
  DEDUP_ORDER.push(id);
  while (DEDUP_ORDER.length > DEDUP_RING_MAX) {
    const evict = DEDUP_ORDER.shift();
    DEDUP_IDS.delete(evict);
    DEDUP_CONTENT_HASHES.delete(evict);
  }
}

// Stable hashing of envelope content (for collision-vs-retry classification).
// Excludes ts/received_at/received_by/_sig_check/_schema_check fields so we
// detect "same id, different content" as a true id-collision anomaly even
// when those volatile fields differ.
function hashEnvelopeContent(msg) {
  try {
    const stable = {
      from: msg.from || null,
      to: msg.to || null,
      type: msg.type || null,
      verb: msg.verb || null,
      payload: msg.payload === undefined ? null : msg.payload,
      body: msg.body === undefined ? null : msg.body,
    };
    return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

function dedupSeedFromInbox() {
  try {
    if (!fs.existsSync(INBOX)) return 0;
    const data = fs.readFileSync(INBOX, 'utf8');
    const lines = data.split('\n').filter(Boolean);
    const tail = lines.slice(-DEDUP_RING_MAX);
    let seeded = 0;
    for (const ln of tail) {
      let env;
      try { env = JSON.parse(ln); } catch { continue; }
      if (env && env.id) {
        const ts = env.ts || env.received_at || null;
        dedupRemember(env.id, ts, hashEnvelopeContent(env));
        seeded += 1;
      }
    }
    return seeded;
  } catch (e) {
    console.error('[BEHCS:dedup] seed error:', e.message);
    return 0;
  }
}

function rateLimitCheck(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  let arr = RATE_LIMIT_BUCKETS.get(ip);
  if (!arr) { arr = []; RATE_LIMIT_BUCKETS.set(ip, arr); }
  // drop expired
  while (arr.length && arr[0] < cutoff) arr.shift();
  if (arr.length >= RATE_LIMIT_MAX) {
    return { ok: false, count: arr.length };
  }
  arr.push(now);
  return { ok: true, count: arr.length };
}

// Real schema validator — warn-mode (records violations, never rejects here).
// Returns { violations: [...], type: <type or null> }.
function validateEnvelopeSchema(msg) {
  const violations = [];
  const type = msg && typeof msg === 'object' ? msg.type : null;
  if (type === 'FIRST_MESSAGE_CANON') {
    if (!msg.payload_sha256 || typeof msg.payload_sha256 !== 'string') {
      violations.push({ field: 'payload_sha256', reason: 'missing_or_not_string' });
    }
    if (!msg.canon_version || typeof msg.canon_version !== 'string') {
      violations.push({ field: 'canon_version', reason: 'missing_or_not_string' });
    }
    if (typeof msg.payload !== 'string' || msg.payload.length === 0) {
      violations.push({ field: 'payload', reason: 'missing_or_empty_string' });
    }
  } else if (type === 'CANON_LOADED_ACK') {
    const p = msg && msg.payload;
    if (!p || typeof p !== 'object') {
      violations.push({ field: 'payload', reason: 'missing_or_not_object' });
    } else {
      if (!p.canon_envelope_id || typeof p.canon_envelope_id !== 'string') {
        violations.push({ field: 'payload.canon_envelope_id', reason: 'missing_or_not_string' });
      }
      if (!p.session_id || typeof p.session_id !== 'string') {
        violations.push({ field: 'payload.session_id', reason: 'missing_or_not_string' });
      }
    }
  }
  return { type, violations };
}

// Canon-current helper: scan inbox tail (last 200 lines) for newest VERIFIED|UNSIGNED
// FIRST_MESSAGE_CANON envelope addressed to <target>.
function findCurrentCanonForTarget(target) {
  if (!fs.existsSync(INBOX)) return null;
  const data = fs.readFileSync(INBOX, 'utf8');
  const lines = data.split('\n').filter(Boolean);
  const tail = lines.slice(-200);
  for (let i = tail.length - 1; i >= 0; i--) {
    let env;
    try { env = JSON.parse(tail[i]); } catch { continue; }
    if (!env || env.type !== 'FIRST_MESSAGE_CANON') continue;
    if (env.to !== target) continue;
    const verdict = env._sig_check && env._sig_check.verdict;
    if (verdict !== 'VERIFIED' && verdict !== 'UNSIGNED') continue;
    return env;
  }
  return null;
}

function countSigEventsLast24h() {
  if (!fs.existsSync(INGRESS_SIG_EVENTS)) return 0;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let count = 0;
  try {
    const data = fs.readFileSync(INGRESS_SIG_EVENTS, 'utf8');
    const lines = data.split('\n');
    for (const ln of lines) {
      if (!ln.trim()) continue;
      try {
        const obj = JSON.parse(ln);
        const t = Date.parse(obj.ts || '');
        if (!isNaN(t) && t >= cutoff) count += 1;
      } catch { /* skip */ }
    }
  } catch { /* unreadable */ }
  return count;
}

// 2026-04-28 C-prior-wave (sig-events analyzer inlined; mirrors patterns from
// tools/behcs/sig-events-report.mjs but kept lean — single file read, three
// rolling windows computed in one pass.)
//   - sig_rejection_rate_24h: REJECTED / total (last 24h), 0.0 if no events
//   - sig_anomaly_keys: key_ids with rejection_rate > 5% AND total >= 10 (last 30d)
//   - sig_last_verified_at: ISO ts of most recent VERIFIED event (any age)
function analyzeSigEvents() {
  const result = { rejection_rate_24h: 0.0, anomaly_keys: [], last_verified_at: null };
  if (!fs.existsSync(INGRESS_SIG_EVENTS)) return result;
  const now = Date.now();
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;
  let total24h = 0;
  let rejected24h = 0;
  let lastVerifiedTs = -Infinity;
  let lastVerifiedIso = null;
  // 30d per-key tally: key_id -> { total, rejected }
  const perKey30d = new Map();
  try {
    const data = fs.readFileSync(INGRESS_SIG_EVENTS, 'utf8');
    const lines = data.split('\n');
    for (const ln of lines) {
      if (!ln.trim()) continue;
      let obj;
      try { obj = JSON.parse(ln); } catch { continue; }
      const t = Date.parse(obj.ts || '');
      if (isNaN(t)) continue;
      const ev = obj.event;
      const isVerified = ev === 'EVT-INGRESS-SIG-VERIFIED';
      const isRejected = ev === 'EVT-INGRESS-SIG-REJECTED';
      if (!isVerified && !isRejected) continue;
      // 24h rate
      if (t >= cutoff24h) {
        total24h += 1;
        if (isRejected) rejected24h += 1;
      }
      // 30d per-key
      if (t >= cutoff30d) {
        const kid = obj.key_id || '(none)';
        let bucket = perKey30d.get(kid);
        if (!bucket) { bucket = { total: 0, rejected: 0 }; perKey30d.set(kid, bucket); }
        bucket.total += 1;
        if (isRejected) bucket.rejected += 1;
      }
      // last verified (any age)
      if (isVerified && t > lastVerifiedTs) {
        lastVerifiedTs = t;
        lastVerifiedIso = obj.ts;
      }
    }
  } catch { /* unreadable */ }
  result.rejection_rate_24h = total24h === 0 ? 0.0 : +(rejected24h / total24h * 100).toFixed(2);
  for (const [kid, b] of perKey30d) {
    if (b.total >= 10 && (b.rejected / b.total) > 0.05) {
      result.anomaly_keys.push(kid);
    }
  }
  result.last_verified_at = lastVerifiedIso;
  return result;
}

function lastCanonLoadAt() {
  if (!fs.existsSync(CANON_LOAD_LOG)) return null;
  try {
    const data = fs.readFileSync(CANON_LOAD_LOG, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i];
      if (ln.indexOf('ingested') === -1) continue;
      const m = ln.match(/^\[([^\]]+)\]/);
      if (m) return m[1];
    }
  } catch { /* unreadable */ }
  return null;
}

// 2026-04-28 G-cascade /behcs/status — current canon record from canon-load.log
// Returns the most recent `ingested` line as a structured object so operators
// see the same fields the loader stamped (version, sha256_8, owner, ts).
function lastCanonRecord() {
  const out = { current_version: null, sha256_8: null, sig_owner: null, received_at: null };
  if (!fs.existsSync(CANON_LOAD_LOG)) return out;
  try {
    const data = fs.readFileSync(CANON_LOAD_LOG, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i];
      if (ln.indexOf('ingested') === -1) continue;
      const tsMatch = ln.match(/^\[([^\]]+)\]/);
      const verMatch = ln.match(/canon_version=([^\s]+)/);
      const shaMatch = ln.match(/sha256_8=([0-9a-fA-F]+)/);
      const ownerMatch = ln.match(/owner=([^\s]+)/);
      out.received_at = tsMatch ? tsMatch[1] : null;
      out.current_version = verMatch ? verMatch[1] : null;
      out.sha256_8 = shaMatch ? shaMatch[1] : null;
      out.sig_owner = ownerMatch ? ownerMatch[1] : null;
      return out;
    }
  } catch { /* unreadable */ }
  return out;
}

// 2026-04-28 G-cascade /behcs/status — sig events 24h breakdown.
// Single-pass NDJSON read. Counts VERIFIED + REJECTED in the last 24h
// and computes rejection_rate as a 0..1 float (3-decimal).
function sigEventsBreakdown24h() {
  const out = { count: 0, verified: 0, rejected: 0, rejection_rate: 0.0 };
  if (!fs.existsSync(INGRESS_SIG_EVENTS)) return out;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  try {
    const data = fs.readFileSync(INGRESS_SIG_EVENTS, 'utf8');
    const lines = data.split('\n');
    for (const ln of lines) {
      if (!ln.trim()) continue;
      let obj;
      try { obj = JSON.parse(ln); } catch { continue; }
      const t = Date.parse(obj.ts || '');
      if (isNaN(t) || t < cutoff) continue;
      const ev = obj.event;
      if (ev === 'EVT-INGRESS-SIG-VERIFIED') { out.count += 1; out.verified += 1; }
      else if (ev === 'EVT-INGRESS-SIG-REJECTED') { out.count += 1; out.rejected += 1; }
    }
  } catch { /* unreadable */ }
  out.rejection_rate = out.count === 0 ? 0.0 : +(out.rejected / out.count).toFixed(3);
  return out;
}

// 2026-04-28 G-cascade /behcs/status — schema rejections 24h, grouped by type.
// Reads the per-type-enforce rejection log so the status surface mirrors the
// same data operators inspect via tail of ingress-schema-rejections.ndjson.
function schemaRejectionsBreakdown24h() {
  const out = { count: 0, by_type: {} };
  if (!fs.existsSync(INGRESS_SCHEMA_REJECTIONS)) return out;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  try {
    const data = fs.readFileSync(INGRESS_SCHEMA_REJECTIONS, 'utf8');
    const lines = data.split('\n');
    for (const ln of lines) {
      if (!ln.trim()) continue;
      let obj;
      try { obj = JSON.parse(ln); } catch { continue; }
      const t = Date.parse(obj.ts || '');
      if (isNaN(t) || t < cutoff) continue;
      out.count += 1;
      const ty = obj.type || '(unknown)';
      out.by_type[ty] = (out.by_type[ty] || 0) + 1;
    }
  } catch { /* unreadable */ }
  return out;
}

// 2026-04-28 G-cascade /behcs/status — GC state surface.
// archives_count = number of inbox-*.ndjson files currently in the archive dir.
// active_lines = current INBOX line count (cheap; one file read).
// last_sweep_at = in-process ts of most recent sweep (null until first sweep).
function gcStateSnapshot() {
  let archivesCount = 0;
  try {
    if (fs.existsSync(GC_ARCHIVE_DIR)) {
      archivesCount = fs.readdirSync(GC_ARCHIVE_DIR).filter(n => /^inbox-.*\.ndjson$/i.test(n)).length;
    }
  } catch { /* unreadable */ }
  let activeLines = 0;
  try {
    if (fs.existsSync(INBOX)) {
      activeLines = fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).length;
    }
  } catch { /* unreadable */ }
  return {
    last_sweep_at: GC_LAST_SWEEP_TS,
    archives_count: archivesCount,
    active_lines: activeLines,
  };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

// GC-INBOX-SUPERVISOR · PROF PID-H04-A01-W035000000-P035-N00001 · Hilbert room 35
// Symmetric mirror of Liris's 2026-04-20T13:36:13Z patch.
// Policy: view=leader-scroll-last-500 · archive=unlimited · never-delete.
// Every 50 appends on INBOX, if line count > 1000, prune to last 500 and move the rest
// to data/behcs/inbox-archives/inbox-<ts>.ndjson so operators can audit.
const GC_THRESHOLD_LINES = 1000;
const GC_KEEP_LAST = 500;
const GC_CHECK_EVERY = 50;
const GC_ARCHIVE_DIR = path.resolve(process.env.ASOLARIA_BEHCS_INBOX_ARCHIVE_DIR || path.join(__dirname, '..', '..', 'data', 'behcs', 'inbox-archives'));
const GC_ARCHIVE_MAX_BYTES = Math.max(1_000_000, Number(process.env.ASOLARIA_BEHCS_INBOX_ARCHIVE_MAX_BYTES || 128 * 1024 * 1024));
let GC_APPEND_COUNTER = 0;
let GC_LAST_SWEEP_TS = null;
// W7-3 fix (2026-04-28): module-level mutex so concurrent sweeps cannot fire.
// gcSweepInbox is now async (setImmediate-deferred + fs.promises) to keep the
// HTTP request handler that triggered an append unblocked. The mutex prevents
// the periodic-tick path and the append-counter path from racing on the inbox.
let GC_SWEEP_IN_PROGRESS = false;

function directoryBytes(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return total + directoryBytes(full);
      if (!entry.isFile()) return total;
      try { return total + fs.statSync(full).size; } catch { return total; }
    }, 0);
  } catch {
    return 0;
  }
}

function pruneInboxArchives() {
  try {
    if (!fs.existsSync(GC_ARCHIVE_DIR)) return { pruned: 0, bytes: 0 };
    const files = fs.readdirSync(GC_ARCHIVE_DIR)
      .filter((name) => /^inbox-.*\.ndjson$/i.test(name))
      .map((name) => {
        const full = path.join(GC_ARCHIVE_DIR, name);
        const stat = fs.statSync(full);
        return { full, size: stat.size, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs);
    let bytes = files.reduce((total, file) => total + file.size, 0);
    let pruned = 0;
    for (const file of files) {
      if (bytes <= GC_ARCHIVE_MAX_BYTES) break;
      fs.unlinkSync(file.full);
      bytes -= file.size;
      pruned += 1;
    }
    return { pruned, bytes };
  } catch (e) {
    console.error('[gc] archive prune error', e.message);
    return { pruned: 0, bytes: directoryBytes(GC_ARCHIVE_DIR) };
  }
}

// W7-3 fix (2026-04-28): async, setImmediate-deferred sweep with module-level
// mutex. Returns a Promise that resolves to the sweep summary (or null when
// nothing to do / mutex held). The fs work runs via fs.promises so the node
// event loop is not blocked while the inbox is rewritten. Atomic write pattern
// preserved: archive → tmp → rename. If any step fails partway, the live
// inbox.ndjson is never touched (the rename is the single commit point).
function gcSweepInbox(inboxPath) {
  if (GC_SWEEP_IN_PROGRESS) {
    // Another sweep is in flight — skip this one rather than racing on the
    // inbox. The next append (or periodic tick) will retry.
    return Promise.resolve(null);
  }
  GC_SWEEP_IN_PROGRESS = true;
  return new Promise((resolve) => {
    setImmediate(async () => {
      try {
        const fsp = fs.promises;
        let stat;
        try {
          stat = await fsp.stat(inboxPath);
        } catch (e) {
          if (e && e.code === 'ENOENT') { resolve(null); return; }
          throw e;
        }
        if (!stat || !stat.isFile()) { resolve(null); return; }
        const data = await fsp.readFile(inboxPath, 'utf8');
        const lines = data.split('\n').filter(Boolean);
        if (lines.length <= GC_THRESHOLD_LINES) { resolve(null); return; }
        ensureDir(GC_ARCHIVE_DIR);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(GC_ARCHIVE_DIR, `inbox-${ts}.ndjson`);
        const archived = lines.slice(0, lines.length - GC_KEEP_LAST);
        const kept = lines.slice(-GC_KEEP_LAST);
        // Write archive first (full success required before we touch inbox).
        await fsp.writeFile(archivePath, archived.join('\n') + '\n');
        // Prune is bounded sync (small dir of archive files) — keep sync for
        // simplicity; this runs already inside setImmediate so it does not
        // block the request handler that triggered the append.
        const archivePrune = pruneInboxArchives();
        // Atomic inbox replace: write tmp, then rename. The live inbox.ndjson
        // is never modified directly. If the tmp write fails the rename never
        // happens and the inbox is intact.
        const tmp = inboxPath + '.gc.tmp';
        await fsp.writeFile(tmp, kept.join('\n') + '\n');
        await fsp.rename(tmp, inboxPath);
        GC_LAST_SWEEP_TS = new Date().toISOString();
        const sweep = {
          archived_count: archived.length,
          kept_count: kept.length,
          archive_path: archivePath,
          archive_dir: GC_ARCHIVE_DIR,
          archive_max_bytes: GC_ARCHIVE_MAX_BYTES,
          archive_pruned_files: archivePrune.pruned,
          archive_bytes_after_prune: archivePrune.bytes,
          swept_at: GC_LAST_SWEEP_TS,
        };
        // Emit EVT-BUS-GC-SWEEP as a new inbox line (so downstream observers
        // see the sweep). Async append, but errors are non-fatal.
        try {
          await fsp.appendFile(inboxPath, JSON.stringify({
            id: `acer-gc-sweep-${Date.now()}`,
            from: 'acer', to: 'federation', mode: 'real',
            verb: 'EVT-BUS-GC-SWEEP',
            actor: 'acer-gc-inbox-supervisor',
            supervisor_pid: 'PID-H04-A01-W035000000-P035-N00001',
            prof_glyph: 'PROF-GC-INBOX-SUPERVISOR',
            hilbert_hotel_room: 35,
            ts: GC_LAST_SWEEP_TS,
            payload: `acer inbox swept · ${sweep.archived_count} archived · ${sweep.kept_count} kept`,
            body: sweep,
          }) + '\n');
        } catch (_) {}
        // C6 structured log: gc sweep.
        slog('behcs-bus', 'bus.gc_sweep', {
          archived_count: sweep.archived_count,
          kept_count: sweep.kept_count,
          archive_path: sweep.archive_path,
          archive_pruned_files: sweep.archive_pruned_files,
          archive_bytes_after_prune: sweep.archive_bytes_after_prune,
          swept_at: sweep.swept_at,
        });
        resolve(sweep);
      } catch (e) {
        // never let GC failure drop envelopes
        console.error('[gc] sweep error', e && e.message ? e.message : e);
        resolve(null);
      } finally {
        GC_SWEEP_IN_PROGRESS = false;
      }
    });
  });
}

function appendNdjson(f, obj) {
  ensureDir(path.dirname(f));
  fs.appendFileSync(f, JSON.stringify(obj) + '\n');
  // Symmetric leader-scroll-last-500 GC only on the INBOX file.
  if (typeof INBOX === 'string' && f === INBOX) {
    GC_APPEND_COUNTER = (GC_APPEND_COUNTER + 1) % GC_CHECK_EVERY;
    if (GC_APPEND_COUNTER === 0) {
      // W7-3: fire-and-forget. gcSweepInbox is now setImmediate-deferred and
      // returns a Promise, so the request handler that called appendNdjson
      // returns to its caller while the sweep runs in a later tick. The .catch
      // is defensive: gcSweepInbox is already wrapped in try/catch and never
      // rejects, but we attach a sink to be safe.
      Promise.resolve(gcSweepInbox(f)).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════════════
// DEVICE REGISTRY — all known devices
// ═══════════════════════════════════════════════════════════

const DEFAULT_REGISTRY = {
  devices: {
    acer: {
      id: 'acer', label: 'Asolaria-acer (${BEHCS_OPERATOR_NAME})', role: 'capital',
      endpoints: ['http://${BEHCS_PRIVATE_HOST}:4947', 'http://localhost:4947'],
      capabilities: ['full_compute', 'dashboard', 'gate_pipeline', 'cube_engine'],
      cube: { D15: 103823, D1: '${BEHCS_OPERATOR_NAME}' },
    },
    liris: {
      id: 'liris', label: 'Liris-kuromi (${BEHCS_OPERATOR_NAME})', role: 'sub_colony',
      endpoints: ['http://${BEHCS_PRIVATE_HOST}:4947'],
      capabilities: ['full_compute', 'gslgnn', 'omni_processor'],
      cube: { D15: 103823, D1: '${BEHCS_OPERATOR_NAME}' },
    },
    falcon: {
      id: 'falcon', label: 'Falcon ${BEHCS_DEVICE_MODEL} (${BEHCS_OPERATOR_NAME})', role: 'orbital',
      endpoints: ['http://localhost:4947'], // via ADB reverse
      capabilities: ['termux', 'edge_compute', 'screen_capture', 'whatsapp'],
      cube: { D15: 103823, D1: '${BEHCS_OPERATOR_NAME}' },
      adb_serial: '${BEHCS_DEVICE_SERIAL}',
    },
    felipe: {
      id: 'felipe', label: 'Felipe A06 (Smith)', role: 'orbital',
      endpoints: ['http://${BEHCS_PRIVATE_HOST}:4947'],
      capabilities: ['termux', 'edge_compute'],
      cube: { D15: 103823, D1: 'felipe' },
      adb_serial: '${BEHCS_DEVICE_SERIAL}',
    },
    beast: {
      id: 'beast', label: 'Beast ${BEHCS_DEVICE_MODEL} (${BEHCS_OPERATOR_NAME})', role: 'orbital',
      endpoints: [],
      capabilities: ['mtp_only'],
      cube: { D15: 103823, D1: '${BEHCS_OPERATOR_NAME}' },
      adb_serial: '${BEHCS_DEVICE_SERIAL}',
      note: 'screen broken, USB MTP only',
    },
    dan: {
      id: 'dan', label: 'Dan Edens (remote)', role: 'collaborator',
      endpoints: ['https://github.com/JesseBrown1980/Asolaria'], // via GitHub
      capabilities: ['github_webhook', 'code_review'],
      cube: { D15: 103823, D1: 'dan' },
    },
  },
};

function loadRegistry() {
  if (fs.existsSync(REGISTRY)) {
    try { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); } catch (_) {}
  }
  ensureDir(BEHCS_DIR);
  fs.writeFileSync(REGISTRY, JSON.stringify(DEFAULT_REGISTRY, null, 2));
  return DEFAULT_REGISTRY;
}

// ═══════════════════════════════════════════════════════════
// MESSAGE ENVELOPE — cube-addressed, mode-tagged
// ═══════════════════════════════════════════════════════════

function createEnvelope(from, to, payload, options = {}) {
  return {
    id: crypto.randomBytes(16).toString('hex'),
    ts: new Date().toISOString(),
    from,
    to,
    mode: options.mode || 'real', // real | shadow | stealth
    type: options.type || 'message', // message | heartbeat | command | inference | cosign | error
    payload,
    cube: {
      D1_ACTOR: from,
      D3_TARGET: to,
      D7_STATE: 'executing',
      D20_TIME: new Date().toISOString(),
      D26_OMNIDIRECTIONAL: 'bilateral',
      D34_CROSS_COLONY: from === to ? 'local_only' : 'cross_host_lan',
      D38_ENCRYPTION: options.mode === 'stealth' ? 'vault_encrypted' : 'plaintext',
    },
    hash: null, // filled below
  };
}

function hashEnvelope(env) {
  const data = JSON.stringify({ from: env.from, to: env.to, ts: env.ts, payload: env.payload });
  env.hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
  return env;
}

// ═══════════════════════════════════════════════════════════
// BUS SERVER — receives messages from any device
// ═══════════════════════════════════════════════════════════

function startBus(port) {
  ensureDir(BEHCS_DIR);
  const registry = loadRegistry();
  // 2026-04-28 G-cascade /behcs/status — prime hooks cache on daemon start.
  // Re-reads on file mtime change inside refreshHooksCache(); this call seeds it.
  refreshHooksCache();
  // 2026-04-28 e10ba926 cosign-drift fix — seed dedup ring from inbox tail
  // so envelope ids already on disk are immediately recognized as duplicates.
  const dedupSeeded = dedupSeedFromInbox();
  console.log(`[BEHCS] dedup ring seeded · ${dedupSeeded} ids · cap=${DEDUP_RING_MAX}`);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    // Health — harmonized v1 schema (bilateral contract with liris per EVT-AGENT-D-BUS-INSPECT 2026-04-20)
    if (url.pathname === '/behcs/health') {
      let inboxDepth = null;
      try { if (fs.existsSync(INBOX)) inboxDepth = fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).length; } catch (_) {}
      const deepHealth = process.env.BEHCS_HEALTH_DEEP === '1';
      const sigEvents24h = deepHealth ? countSigEventsLast24h() : null;
      const lastCanonLoad = lastCanonLoadAt();
      const sigAnalysis = deepHealth
        ? analyzeSigEvents()
        : { rejection_rate_24h: null, anomaly_keys: [], last_verified_at: null };
      res.writeHead(200);
      res.end(JSON.stringify({
        // required harmonized v1 fields (symmetric with liris sidecar)
        ok: true,
        service: 'acer-bus',
        named_agent: 'acer-bus-behcs-v1',
        host: '0.0.0.0',
        port,
        process_started_at: PROCESS_STARTED_AT,
        uptime_s: Math.round(process.uptime()),
        law_001: [4947, 4950],
        inbox_path: INBOX,
        inbox_depth: inboxDepth,
        hilbert_hotel_room: 35, // PROF-GC-INBOX-SUPERVISOR anchors the bus in the GC wing
        prof_wing_position: 'GC=24, GNN=25, UNISON=26, SUP-DAEMON=27, BUS-MIRROR=28, BUS-AND-KICK=29, GC-INBOX=35, MSG-TRACKER=36, SUPER-GULP=37, GC-GNN-FEEDER=38, FALCON-FRONT-END-KICKER=39',
        cosign: { acer: true, liris: 'expected_via_dual_cosign_protocol' },
        source_commit: SOURCE_COMMIT,
        // optional / legacy fields (kept for acer-internal consumers)
        device: DEVICE_ID,
        bus: 'behcs',
        ts: new Date().toISOString(),
        registry: Object.keys(registry.devices).length + ' devices',
        cube: { D34: 2685619, D26: 1030301 },
        contract_version: 'v1-harmonized-2026-04-20',
        health_profile: deepHealth ? 'deep' : 'fast',
        // 2026-04-28 enrichment
        sig_events_count_24h: sigEvents24h,
        last_canon_load_at: lastCanonLoad,
        // 2026-04-28 prior-wave C7 sig-events analyzer wire-in
        sig_rejection_rate_24h: sigAnalysis.rejection_rate_24h,
        sig_anomaly_keys: sigAnalysis.anomaly_keys,
        sig_last_verified_at: sigAnalysis.last_verified_at,
      }));
      return;
    }

    // 2026-04-28 G-cascade /behcs/status — comprehensive operator one-liner.
    // Sibling of /behcs/health (kept lean). Inlines all logic — no CLI imports.
    if (url.pathname === '/behcs/status') {
      try {
        const hooks = refreshHooksCache();
        const canon = lastCanonRecord();
        const sig24 = sigEventsBreakdown24h();
        const schema24 = schemaRejectionsBreakdown24h();
        const gc = gcStateSnapshot();
        const startedMs = Date.parse(PROCESS_STARTED_AT);
        const uptimeSeconds = isNaN(startedMs) ? Math.round(process.uptime()) : Math.round((Date.now() - startedMs) / 1000);
        res.writeHead(200);
        res.end(JSON.stringify({
          ok: true,
          service: 'behcs-bus',
          version: SERVICE_VERSION,
          device: DEVICE_ID,
          port,
          uptime_seconds: uptimeSeconds,
          process_started_at: PROCESS_STARTED_AT,
          source_commit: SOURCE_COMMIT,
          canon: {
            current_version: canon.current_version,
            sha256_8: canon.sha256_8,
            sig_owner: canon.sig_owner,
            received_at: canon.received_at,
          },
          hooks_registered: hooks.hooks_registered,
          hooks_loaded_at: hooks.loaded_at,
          hooks_settings_path: CLAUDE_SETTINGS_PATH,
          hooks_error: hooks.error,
          sig_events_24h: sig24,
          schema_rejections_24h: schema24,
          gc_state: gc,
          ts: new Date().toISOString(),
        }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: e.message || String(e) }));
      }
      return;
    }

    // 2026-04-28 canon-current — newest FIRST_MESSAGE_CANON for ?target=<peer>
    // with sig verdict in {VERIFIED, UNSIGNED}. 404 if none.
    if (url.pathname === '/behcs/canon/current') {
      const target = url.searchParams.get('target');
      if (!target) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: 'missing_target_param' }));
        return;
      }
      const env = findCurrentCanonForTarget(target);
      if (!env) {
        res.writeHead(404);
        res.end(JSON.stringify({ ok: false, error: 'no_canon_for_target', target }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        envelope_id: env.id || null,
        ts: env.ts || env.received_at || null,
        canon_version: env.canon_version || null,
        payload_sha256: env.payload_sha256 || null,
        sig_verdict: (env._sig_check && env._sig_check.verdict) || null,
        sig_owner: (env._sig_check && env._sig_check.owner_glyph) || null,
      }));
      return;
    }

    // Receive message
    if ((url.pathname === '/behcs/send' || url.pathname === '/publish' || url.pathname === '/behcs/publish') && req.method === 'POST') {
      // 2026-04-28 rate limit — 30/sec sliding per source IP. 429 on exceed.
      const sourceIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
        || (req.socket && req.socket.remoteAddress) || 'unknown';
      const rl = rateLimitCheck(sourceIp);
      if (!rl.ok) {
        res.setHeader('Retry-After', '1');
        res.writeHead(429);
        res.end(JSON.stringify({ ok: false, error: 'rate_limited', limit: RATE_LIMIT_MAX, window_ms: RATE_LIMIT_WINDOW_MS, source_ip: sourceIp }));
        return;
      }
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const msg = JSON.parse(body);

          // 2026-04-18 ingress sig-verify (D-055 + D-056 + complements liris validator).
          // Stamps msg._sig_check with verdict. REJECTED signatures block ingestion
          // with HTTP 403. UNSIGNED envelopes accepted (backward compat) but tagged.
          const sigCheck = verifyIngressEnvelope(msg);
          msg._sig_check = sigCheck;
          if (sigCheck.verdict === 'REJECTED') {
            const evt = {
              event: 'EVT-INGRESS-SIG-REJECTED',
              ts: new Date().toISOString(),
              reason: sigCheck.reason,
              key_id: sigCheck.key_id || null,
              owner_glyph: sigCheck.owner_glyph || null,
              from: msg.from || msg.actor || null,
              verb: msg.verb || null,
              glyph_sentence: `EVT-INGRESS-SIG-REJECTED · reason=${sigCheck.reason} · key=${sigCheck.key_id || 'none'} @ M-EYEWITNESS .`,
            };
            appendNdjson(path.join(BEHCS_DIR, 'ingress-sig-events.ndjson'), evt);
            console.log('[BEHCS] REJECTED sig:', sigCheck.reason, 'key=' + (sigCheck.key_id || 'none'));
            res.writeHead(403);
            res.end(JSON.stringify({ ok: false, error: 'sig_rejected', reason: sigCheck.reason, key_id: sigCheck.key_id, by: DEVICE_ID }));
            return;
          }
          if (sigCheck.verdict === 'VERIFIED') {
            const evt = {
              event: 'EVT-INGRESS-SIG-VERIFIED',
              ts: new Date().toISOString(),
              key_id: sigCheck.key_id,
              owner_glyph: sigCheck.owner_glyph,
              host_device: sigCheck.host_device,
              from: msg.from || msg.actor || null,
              verb: msg.verb || null,
              glyph_sentence: `EVT-INGRESS-SIG-VERIFIED · key=${sigCheck.key_id} · owner=${sigCheck.owner_glyph} @ M-EYEWITNESS .`,
            };
            appendNdjson(path.join(BEHCS_DIR, 'ingress-sig-events.ndjson'), evt);
            console.log('[BEHCS] VERIFIED sig:', sigCheck.key_id, 'owner=' + sigCheck.owner_glyph);
          }

          // 2026-04-28 real schema validator — warn-mode by default.
          // For type=FIRST_MESSAGE_CANON require payload_sha256, canon_version,
          // payload (string non-empty). For type=CANON_LOADED_ACK require
          // payload.canon_envelope_id and payload.session_id.
          //
          // Per-type enforce override (BEHCS_SCHEMA_ENFORCE_TYPES): when
          // msg.type is in the override set AND violations exist, we flip to
          // reject for that envelope and respond HTTP 422. Lets operators
          // promote individual envelope types from warn → enforce after
          // stabilization without making the whole bus a strict gate.
          try {
            const v = validateEnvelopeSchema(msg);
            const perTypeEnforce = !!v.type
              && SCHEMA_ENFORCE_TYPES.has(v.type)
              && v.violations.length > 0;
            msg._schema_check = {
              action: perTypeEnforce ? 'reject' : 'accept',
              type: v.type,
              violations: v.violations,
              violation_count: v.violations.length,
              mode: perTypeEnforce ? 'enforce-per-type' : 'warn',
              enforce_types: Array.from(SCHEMA_ENFORCE_TYPES),
            };
            if (v.violations.length > 0) {
              const evt = {
                event: perTypeEnforce ? 'EVT-INGRESS-SCHEMA-REJECTED' : 'EVT-INGRESS-SCHEMA-WARN',
                ts: new Date().toISOString(),
                type: v.type,
                mode: perTypeEnforce ? 'enforce-per-type' : 'warn',
                per_type_enforce: perTypeEnforce,
                violation_count: v.violations.length,
                violations: v.violations,
                from: msg.from || msg.actor || null,
                verb: msg.verb || null,
                glyph_sentence: perTypeEnforce
                  ? `EVT-INGRESS-SCHEMA-REJECTED · type=${v.type} · n=${v.violations.length} · per-type-enforce @ M-EYEWITNESS .`
                  : `EVT-INGRESS-SCHEMA-WARN · type=${v.type} · n=${v.violations.length} @ M-EYEWITNESS .`,
              };
              appendNdjson(path.join(BEHCS_DIR, 'ingress-schema-events.ndjson'), evt);
              console.log(perTypeEnforce ? '[BEHCS:schema-reject]' : '[BEHCS:schema-warn]', evt.glyph_sentence);
            }
            if (perTypeEnforce) {
              const rejectionEvt = {
                event: 'EVT-INGRESS-SCHEMA-REJECTED-PER-TYPE',
                ts: new Date().toISOString(),
                type: v.type,
                violation_count: v.violations.length,
                violations: v.violations,
                from: msg.from || msg.actor || null,
                verb: msg.verb || null,
                enforce_types: Array.from(SCHEMA_ENFORCE_TYPES),
                msg_id: msg.id || null,
                by: DEVICE_ID,
                glyph_sentence: `EVT-INGRESS-SCHEMA-REJECTED-PER-TYPE · type=${v.type} · n=${v.violations.length} · by=${DEVICE_ID} @ M-EYEWITNESS .`,
              };
              appendNdjson(path.join(BEHCS_DIR, 'ingress-schema-rejections.ndjson'), rejectionEvt);
              // C6 structured log: schema rejection (per-type enforce).
              slog('behcs-bus', 'bus.schema_reject', {
                id: msg.id || null,
                type: v.type,
                from: msg.from || msg.actor || null,
                verb: msg.verb || null,
                violation_count: v.violations.length,
                violations: v.violations,
                enforce_types: Array.from(SCHEMA_ENFORCE_TYPES),
              });
              res.writeHead(422);
              res.end(JSON.stringify({
                ok: false,
                error: 'schema_rejected',
                reason: 'per_type_enforce',
                type: v.type,
                violations: v.violations,
                enforce_types: Array.from(SCHEMA_ENFORCE_TYPES),
                by: DEVICE_ID,
              }));
              return;
            }
          } catch (sve) {
            console.log('[BEHCS:schema-warn] validator error:', sve.message);
          }

          // Q-003 schema ingress check — observe-mode logs drift without blocking.
          // Authoritative contracts in packages/schema-contracts; this probe mirrors
          // their shape in plain JS so behcs-bus can measure real-wire compliance.
          try {
            const schemaCheck = schemaIngressCheck(msg, SCHEMA_INGRESS_MODE);
            msg._schema_check_q003 = { action: schemaCheck.action, matched: schemaCheck.matched_contract, violations: schemaCheck.violations.length };
            if (schemaCheck.violations.length > 0 || schemaCheck.matched_contract) {
              const evt = {
                event: schemaCheck.violations.length > 0
                  ? (SCHEMA_INGRESS_MODE === 'reject' ? 'EVT-INGRESS-SCHEMA-REJECTED' :
                     SCHEMA_INGRESS_MODE === 'warn' ? 'EVT-INGRESS-SCHEMA-WARNED' : 'EVT-INGRESS-SCHEMA-OBSERVED')
                  : 'EVT-INGRESS-SCHEMA-OK',
                ts: new Date().toISOString(),
                mode: SCHEMA_INGRESS_MODE,
                verb: msg.verb || null,
                matched_contract: schemaCheck.matched_contract,
                violation_count: schemaCheck.violations.length,
                violations: schemaCheck.violations.slice(0, 10),
                from: msg.from || msg.actor || null,
                glyph_sentence: schemaCheck.glyph_sentence,
              };
              appendNdjson(path.join(BEHCS_DIR, 'ingress-schema-events.ndjson'), evt);
              if (schemaCheck.violations.length > 0) {
                console.log('[BEHCS:schema]', schemaCheck.glyph_sentence);
              }
            }
            if (schemaCheck.action === 'reject' && SCHEMA_INGRESS_MODE === 'reject') {
              // C6 structured log: schema rejection (Q-003 contract).
              slog('behcs-bus', 'bus.schema_reject', {
                id: msg.id || null,
                contract: schemaCheck.matched_contract,
                from: msg.from || msg.actor || null,
                verb: msg.verb || null,
                violation_count: schemaCheck.violations.length,
                violations: schemaCheck.violations.slice(0, 10),
                mode: SCHEMA_INGRESS_MODE,
                source: 'q003',
              });
              res.writeHead(400);
              res.end(JSON.stringify({ ok: false, error: 'schema_rejected', contract: schemaCheck.matched_contract, violations: schemaCheck.violations, by: DEVICE_ID }));
              return;
            }
          } catch (se) {
            console.log('[BEHCS:schema] shim error:', se.message);
          }

          msg.received_at = new Date().toISOString();
          msg.received_by = DEVICE_ID;

          // 2026-04-28 e10ba926 cosign-drift fix (W3-E17 / W5-1):
          // Reject duplicate envelope ids with HTTP 409 BEFORE inbox append.
          // Same id + same content = idempotent retry (still rejected, desired).
          // Same id + different content = id_collision_different_content anomaly.
          if (msg && msg.id && DEDUP_IDS.has(msg.id)) {
            const existingTs = DEDUP_IDS.get(msg.id);
            const newTs = msg.ts || msg.received_at || null;
            const newContentHash = hashEnvelopeContent(msg);
            const existingContentHash = DEDUP_CONTENT_HASHES.get(msg.id) || null;
            const isAnomaly = !!(existingContentHash && newContentHash && existingContentHash !== newContentHash);
            const dedupEvt = {
              event: 'EVT-BUS-DEDUP-REJECTED',
              ts: new Date().toISOString(),
              envelope_id: msg.id,
              existing_ts: existingTs,
              new_ts: newTs,
              from: msg.from || msg.actor || null,
              to: msg.to || msg.target || null,
              verb: msg.verb || null,
              type: msg.type || null,
              existing_content_hash: existingContentHash,
              new_content_hash: newContentHash,
              by: DEVICE_ID,
              glyph_sentence: isAnomaly
                ? `EVT-BUS-DEDUP-REJECTED · id=${msg.id} · ANOMALY id_collision_different_content · existing_hash=${existingContentHash} new_hash=${newContentHash} @ M-EYEWITNESS .`
                : `EVT-BUS-DEDUP-REJECTED · id=${msg.id} · idempotent_retry · existing_ts=${existingTs} @ M-EYEWITNESS .`,
            };
            if (isAnomaly) dedupEvt._anomaly = 'id_collision_different_content';
            try {
              ensureDir(path.dirname(DEDUP_REJECTIONS_LOG));
              fs.appendFileSync(DEDUP_REJECTIONS_LOG, JSON.stringify(dedupEvt) + '\n');
            } catch (logErr) {
              console.error('[BEHCS:dedup] log write error:', logErr.message);
            }
            console.log('[BEHCS:dedup]', dedupEvt.glyph_sentence);
            res.writeHead(409);
            res.end(JSON.stringify({
              ok: false,
              error: 'duplicate_envelope_id',
              envelope_id: msg.id,
              existing_ts: existingTs,
              new_ts: newTs,
              anomaly: isAnomaly ? 'id_collision_different_content' : null,
              by: DEVICE_ID,
            }));
            return;
          }

          // Log to inbox
          if (msg.mode === 'stealth') {
            // Stealth: encrypt before logging
            const encrypted = crypto.createHash('sha256').update(JSON.stringify(msg.payload)).digest('hex');
            appendNdjson(INBOX, { ...msg, payload: '[STEALTH:' + encrypted.slice(0, 8) + ']' });
          } else {
            appendNdjson(INBOX, msg);
          }
          // Remember id for future dedup checks (after successful append).
          if (msg && msg.id) {
            dedupRemember(msg.id, msg.ts || msg.received_at || null, hashEnvelopeContent(msg));
          }

          // Print to console if real mode
          if (msg.mode === 'real') {
            const displayPayload = msg.payload ?? msg.body ?? msg.verb ?? msg.type ?? msg.action ?? '';
            const displayText = typeof displayPayload === 'string'
              ? displayPayload
              : JSON.stringify(displayPayload);
            console.log(`[BEHCS] ${msg.from} → ${msg.to}: ${String(displayText || '').slice(0, 200)}`);
          } else if (msg.mode === 'shadow') {
            console.log(`[BEHCS:shadow] ${msg.from} → ${msg.to}: [shadow message]`);
          }
          // Stealth: no console output

          // C6 structured log: envelope ingestion (additive to inbox NDJSON).
          slog('behcs-bus', 'bus.ingest', {
            id: msg.id || null,
            from: msg.from || msg.actor || null,
            to: msg.to || null,
            type: msg.type || null,
            verb: msg.verb || null,
            mode: msg.mode || null,
            sig_verdict: sigCheck.verdict,
            sig_owner: sigCheck.owner_glyph || null,
            source_ip: sourceIp,
          });

          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, received: msg.id, by: DEVICE_ID, sig_verdict: sigCheck.verdict, sig_owner: sigCheck.owner_glyph || null }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    // List inbox
    if (url.pathname === '/behcs/inbox') {
      try {
        // 2026-04-18 fix: honor all filter params (bilateral fix mirroring
        // liris sidecar). Previously only ?mode and ?last were read, so
        // targeted ack-tracking lost messages under heartbeat flood.
        const mode = url.searchParams.get('mode') || 'all';
        const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || url.searchParams.get('last') || '50', 10) || 50), 5000);
        const since = url.searchParams.get('since');
        const actor = url.searchParams.get('actor');
        const verb = url.searchParams.get('verb');
        const target = url.searchParams.get('target');
        const eventId = url.searchParams.get('event_id');
        const fallbackD1 = url.searchParams.get('d1');

        const raw = fs.existsSync(INBOX)
          ? fs.readFileSync(INBOX, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean)
          : [];
        let msgs = mode === 'all' ? raw : raw.filter(l => l.mode === mode);
        if (eventId) {
          msgs = msgs.filter(m => {
            const eid = m.gate_results && m.gate_results.gnn && m.gate_results.gnn.edge && m.gate_results.gnn.edge.eventId;
            return eid === eventId;
          });
        } else {
          if (since) { const s = Date.parse(since); if (!isNaN(s)) msgs = msgs.filter(m => Date.parse(m.received_at || m.ts || '') >= s); }
          if (actor) msgs = msgs.filter(m => m.actor === actor || m.from === actor);
          if (verb) msgs = msgs.filter(m => m.verb === verb);
          if (target) msgs = msgs.filter(m => m.target === target || m.to === target);
          if (fallbackD1) msgs = msgs.filter(m => Array.isArray(m.fallbackTuples) && m.fallbackTuples.includes('D1:' + fallbackD1));
        }

        const tail = msgs.slice(-limit);
        res.writeHead(200);
        res.end(JSON.stringify({
          ok: true,
          count: raw.length,
          filtered: msgs.length,
          returned: tail.length,
          filters_applied: { mode, limit, since, actor, verb, target, event_id: eventId, d1: fallbackD1 },
          messages: tail,
        }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return;
    }

    // Device registry
    if (url.pathname === '/behcs/devices') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, devices: registry.devices }));
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: 'not found', routes: ['/behcs/health', '/behcs/status', '/behcs/canon/current', '/behcs/send', '/behcs/inbox', '/behcs/devices'] }));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[BEHCS] Bus running on 0.0.0.0:${port} as device=${DEVICE_ID}`);
    console.log(`[BEHCS] Modes: real | shadow | stealth`);
    console.log(`[BEHCS] Devices: ${Object.keys(registry.devices).join(', ')}`);
    console.log(`[BEHCS] Cube: D34 CROSS_COLONY (2685619) + D26 OMNIDIRECTIONAL (1030301)`);
  });

  // 2026-04-28 belt-and-braces periodic GC trigger (additive, complements
  // the append-counter sweep above). Every BEHCS_GC_INTERVAL_MINUTES (default
  // 60), call gcSweepInbox(INBOX) and emit a structured log line to
  // logs/bus-gc.log so operators can audit sweeps even if the per-append
  // counter logic drifts.
  const GC_INTERVAL_MINUTES = Math.max(1, parseInt(process.env.BEHCS_GC_INTERVAL_MINUTES || '60', 10) || 60);
  const GC_INTERVAL_MS = GC_INTERVAL_MINUTES * 60 * 1000;
  const BUS_GC_LOG = path.join(ROOT, 'logs', 'bus-gc.log');

  function countInboxLines() {
    try {
      if (!fs.existsSync(INBOX)) return 0;
      return fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).length;
    } catch { return null; }
  }

  async function periodicGcTick() {
    const ts = new Date().toISOString();
    const linesBefore = countInboxLines();
    let entry;
    try {
      // W7-3: gcSweepInbox is now async (setImmediate + fs.promises). The
      // periodic tick still waits for the result so the bus-gc.log entry can
      // record archived counts and the post-sweep line count.
      const sweep = await gcSweepInbox(INBOX);
      if (!sweep) {
        entry = {
          ts,
          trigger: 'periodic',
          interval_minutes: GC_INTERVAL_MINUTES,
          status: 'no-op',
          lines_before: linesBefore,
          lines_after: linesBefore,
          archived: 0,
          archive_path: null,
        };
      } else {
        const linesAfter = countInboxLines();
        entry = {
          ts,
          trigger: 'periodic',
          interval_minutes: GC_INTERVAL_MINUTES,
          status: 'swept',
          lines_before: linesBefore,
          lines_after: linesAfter,
          archived: sweep.archived_count,
          archive_path: sweep.archive_path,
        };
      }
    } catch (e) {
      entry = {
        ts,
        trigger: 'periodic',
        interval_minutes: GC_INTERVAL_MINUTES,
        status: 'error',
        error: e.message || String(e),
        lines_before: linesBefore,
      };
    }
    try {
      ensureDir(path.dirname(BUS_GC_LOG));
      fs.appendFileSync(BUS_GC_LOG, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('[gc:periodic] log write error', e.message);
    }
  }

  const periodicGcTimer = setInterval(periodicGcTick, GC_INTERVAL_MS);
  if (typeof periodicGcTimer.unref === 'function') periodicGcTimer.unref();
  console.log(`[BEHCS] Periodic GC every ${GC_INTERVAL_MINUTES} min → ${BUS_GC_LOG}`);

  return server;
}

// ═══════════════════════════════════════════════════════════
// SEND — push message to another device
// ═══════════════════════════════════════════════════════════

function sendMessage(targetDevice, payload, options = {}) {
  const registry = loadRegistry();
  const target = registry.devices[targetDevice];
  if (!target) {
    console.error(`[BEHCS] Unknown device: ${targetDevice}`);
    return Promise.resolve({ ok: false, error: 'unknown device' });
  }
  if (!target.endpoints || target.endpoints.length === 0) {
    console.error(`[BEHCS] No endpoints for device: ${targetDevice}`);
    return Promise.resolve({ ok: false, error: 'no endpoints' });
  }

  const env = hashEnvelope(createEnvelope(DEVICE_ID, targetDevice, payload, options));

  // Log to outbox
  appendNdjson(OUTBOX, env);

  // Try each endpoint
  const endpoint = target.endpoints[0];
  const url = new URL('/behcs/send', endpoint);
  const data = JSON.stringify(env);

  return new Promise((resolve) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (_) { resolve({ ok: false, error: body }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK — ping all devices
// ═══════════════════════════════════════════════════════════

async function healthCheck() {
  const registry = loadRegistry();
  const results = {};
  for (const [id, device] of Object.entries(registry.devices)) {
    if (!device.endpoints || device.endpoints.length === 0) {
      results[id] = { ok: false, reason: 'no endpoints' };
      continue;
    }
    for (const ep of device.endpoints) {
      try {
        const url = new URL('/behcs/health', ep);
        const res = await new Promise((resolve) => {
          const req = http.get(url, (r) => {
            let body = '';
            r.on('data', c => body += c);
            r.on('end', () => { try { resolve(JSON.parse(body)); } catch (_) { resolve({ ok: false }); } });
          });
          req.on('error', () => resolve({ ok: false }));
          req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
        });
        results[id] = res;
        break; // first successful endpoint wins
      } catch (_) {
        results[id] = { ok: false };
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--health')) {
    const results = await healthCheck();
    console.log('[BEHCS] Device Health:');
    for (const [id, res] of Object.entries(results)) {
      console.log(`  ${id}: ${res.ok ? 'ALIVE' : 'DEAD'} ${res.error || ''}`);
    }
    return;
  }

  if (args.includes('--send')) {
    const idx = args.indexOf('--send');
    const target = args[idx + 1];
    const message = args.slice(idx + 2).join(' ');
    if (!target || !message) {
      console.error('Usage: --send <device> <message>');
      process.exit(1);
    }
    const mode = args.includes('--shadow') ? 'shadow' : (args.includes('--stealth') ? 'stealth' : 'real');
    const result = await sendMessage(target, message, { mode });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Default: start bus
  startBus(DEFAULT_PORT);
}

main().catch(e => console.error('FATAL:', e.message));

module.exports = { startBus, sendMessage, healthCheck, createEnvelope, loadRegistry };
