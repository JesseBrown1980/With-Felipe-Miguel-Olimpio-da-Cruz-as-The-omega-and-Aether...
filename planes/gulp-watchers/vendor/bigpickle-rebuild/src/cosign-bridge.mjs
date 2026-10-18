// Cosign bridge — Node-native HTTP client for asolaria-cosign-chain-daemon (:4953).
// Pairs with redis-bridge.mjs to implement the canonical durability pattern:
//
//   cosign-chain-as-durable-log + pub/sub-as-notification
//
// === VANTAGE SCOPE ========================================================
//
// This module is ACER-VANTAGE-LOCAL. The cosign daemon at :4953 is bound to
// 127.0.0.1 ONLY (see C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py line
// 131: ThreadingHTTPServer(("127.0.0.1", PORT), ...)) — cross-vantage POSTs
// will fail at TCP layer.
//
// Bilateral architecture canon = TWO PARALLEL CHAINS + TWIN-SEAL, not one
// shared chain. Each vantage maintains its own cosign log via its own local
// transport (acer: HTTP daemon at :4953; liris: local .hbp file writes).
// Cross-vantage durability is achieved via TWIN-SEAL antecedents — each
// vantage's hop cosigns the other's most recent row_hash in its antecedents
// array, producing a bridging DAG.
//
// Liris should NOT instantiate this module pointing at acer:4953 — that would
// be dishonest code (non-functional artifact). Liris-side equivalent is her
// local .hbp writer, or a future liris-side HTTP daemon if she stands one up.
// (Liris-vantage step-back 2026-05-25 hop 19 ae6f8dfd5baf1a1c correctly
// flagged this and skipped writing a shared-bridge.)
//
// Spec: project_synaptic_substrate_durability_pattern_2026_05_25.md
//       project_bilateral_synaptic_substrate_LIVE_2026_05_25.md
//
// === Why this module exists ==============================================
//
// Previously, cosign POSTs were issued via `curl` from bash on Windows. This
// causes a subtle bug: non-ASCII glyphs (em-dash `—`, curly quotes, etc.) get
// mangled by Windows shell/curl encoding BEFORE reaching the daemon, producing:
//
//   {"ok": false, "error": "parse", "detail": "'utf-8' codec can't decode byte 0x97..."}
//
// Empirical 2026-05-25 attempt at acer cosign seq=339: em-dashes in payload
// caused parse failure; retry with ASCII-only succeeded. Documented as
// anti-pattern in durability-pattern memory.
//
// This module avoids the bug by routing through Node's http module, which
// handles UTF-8 natively. As a defensive belt-and-suspenders layer, it also
// exposes hasNonAscii() / findNonAscii() so callers who DO relay through shell
// can detect the hazard pre-emptively.
//
// Pure functions where possible. No hidden state.

import http from 'node:http';
import { dualEmitObservation } from './universal-route.mjs';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4953;

// === Defensive: non-ASCII detection (for shell-relay safety) =============

export function hasNonAscii(str) {
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return true;
  }
  return false;
}

export function findNonAscii(str) {
  const s = String(str);
  const offenders = [];
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 127) offenders.push({ pos: i, code, hex: '0x' + code.toString(16), char: s[i] });
  }
  return offenders;
}

// === cosignAppend: POST to /api/cosign/append via Node http ==============
// Bug-immune to the Windows-curl-em-dash issue because Node's http handles
// UTF-8 bytes correctly end-to-end.

export async function cosignAppend(payload, opts = {}) {
  const host = opts.host ?? DEFAULT_HOST;
  const port = opts.port ?? DEFAULT_PORT;
  const body = JSON.stringify(payload);
  if (opts.warnNonAscii && hasNonAscii(body)) {
    const sample = findNonAscii(body).slice(0, 3);
    // eslint-disable-next-line no-console
    console.warn('[cosign-bridge] non-ASCII glyphs detected (Node http handles safely; unsafe if you also relay via Windows curl):', sample);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path: '/api/cosign/append',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('cosign-bridge.cosignAppend: response parse failed - ' + e.message + ' body=' + data)); }
        });
      }
    );
    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
}

// === cosignHead / cosignRange: read-side helpers =========================

export async function cosignHead(opts = {}) {
  return getJson('/api/cosign/head', opts);
}

export async function cosignRange(start, end, opts = {}) {
  return getJson(`/api/cosign/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, opts);
}

function getJson(path, opts = {}) {
  const host = opts.host ?? DEFAULT_HOST;
  const port = opts.port ?? DEFAULT_PORT;
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method: 'GET' }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('cosign-bridge.getJson: parse failed for ' + path + ' - ' + e.message + ' body=' + data)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// === durableNotify: canonical cosign+pubsub combo ========================
// Atomic from caller's perspective: cosign log first (source of truth), then
// redis publish (live notify). The publish payload carries the cosign receipt
// (seq + row_hash) so receivers can verify against the chain and catch up via
// poll if they missed the live PUBLISH.
//
// Usage:
//   const cosign = await new RedisBridge({ ..., bearer }); await cosign.connect(); await cosign.auth();
//   const result = await durableNotify('omni-asolaria/acer/heartbeat/tick', { event: 'tick', vantage: 'acer', ... }, cosign);

export async function durableNotify(channel, payload, redisBridge, opts = {}) {
  if (typeof channel !== 'string' || !channel) {
    throw new TypeError('cosign-bridge.durableNotify: channel must be non-empty string');
  }
  if (!redisBridge || typeof redisBridge.publish !== 'function') {
    throw new TypeError('cosign-bridge.durableNotify: redisBridge must expose publish(channel, payload)');
  }
  const cosign = await cosignAppend(payload, opts);
  if (!cosign.ok) {
    throw new Error('cosign-bridge.durableNotify: cosign append failed - ' + JSON.stringify(cosign));
  }
  const notifyPayload = JSON.stringify({
    cosign_seq: cosign.seq,
    cosign_row: cosign.row_hash,
    cosign_prev: cosign.antecedent_prev,
    channel,
    event_summary: payload && typeof payload === 'object'
      ? { event: payload.event, vantage: payload.vantage }
      : null,
  });
  const pub = await redisBridge.publish(channel, notifyPayload);
  // Universal-route doctrine 2026-05-26: every message dual-emits to hookwall
  // + GNN observation lanes by default. Set opts.universalRoute = false to
  // opt out (e.g. for very high-volume inner-loop seals where observation
  // pressure matters).
  const universalRoute = opts.universalRoute !== false;
  const observation = universalRoute
    ? dualEmitObservation(payload, cosign, { ...opts, channel })
    : null;
  return {
    algorithm: 'durable-notify-cosign-plus-redis.v1',
    cosign,
    publish: pub,
    observation,
    durability_gap_status: pub.subscribers === 0 ? 'logged-but-no-live-subscriber' : 'live-and-logged',
  };
}

// === Status / honest gaps ================================================

export const STATUS = Object.freeze({
  schema: 'cosign-bridge.v1',
  default_endpoint: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  routes: ['POST /api/cosign/append', 'GET /api/cosign/head', 'GET /api/cosign/range'],
  bypasses_bug: 'windows-curl-em-dash-utf8-corruption-via-node-native-http-client',
  pattern_implemented: 'cosign-for-log + redis-for-notify combo (durableNotify)',
  spec: 'project_synaptic_substrate_durability_pattern_2026_05_25.md',
});
