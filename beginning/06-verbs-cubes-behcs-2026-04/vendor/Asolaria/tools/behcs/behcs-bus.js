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

const ROOT = process.env.BEHCS_ROOT || 'C:/Users/acer/Asolaria';
const BEHCS_DIR = path.join(ROOT, 'data/behcs');
const INBOX = path.join(BEHCS_DIR, 'inbox.ndjson');
const OUTBOX = path.join(BEHCS_DIR, 'outbox.ndjson');
const REGISTRY = path.join(BEHCS_DIR, 'device-registry.json');
const SYMBOL_TABLE = path.join(BEHCS_DIR, 'symbol-table-256.json');

const DEFAULT_PORT = parseInt(process.env.BEHCS_PORT || '4947'); // 47th dim cube-adjacent
const DEVICE_ID = process.env.BEHCS_DEVICE || 'acer';

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function appendNdjson(f, obj) { ensureDir(path.dirname(f)); fs.appendFileSync(f, JSON.stringify(obj) + '\n'); }

// ═══════════════════════════════════════════════════════════
// DEVICE REGISTRY — all known devices
// ═══════════════════════════════════════════════════════════

const DEFAULT_REGISTRY = {
  devices: {
    acer: {
      id: 'acer', label: 'Asolaria-acer (Jesse)', role: 'capital',
      endpoints: ['http://192.168.15.189:4947', 'http://localhost:4947'],
      capabilities: ['full_compute', 'dashboard', 'gate_pipeline', 'cube_engine'],
      cube: { D15: 103823, D1: 'jesse' },
    },
    liris: {
      id: 'liris', label: 'Liris-kuromi (Rayssa)', role: 'sub_colony',
      endpoints: ['http://192.168.1.6:4947'],
      capabilities: ['full_compute', 'gslgnn', 'omni_processor'],
      cube: { D15: 103823, D1: 'rayssa' },
    },
    falcon: {
      id: 'falcon', label: 'Falcon S24 FE (Jesse)', role: 'orbital',
      endpoints: ['http://localhost:4947'], // via ADB reverse
      capabilities: ['termux', 'edge_compute', 'screen_capture', 'whatsapp'],
      cube: { D15: 103823, D1: 'jesse' },
      adb_serial: 'R5CXA4MGQXV',
    },
    felipe: {
      id: 'felipe', label: 'Felipe A06 (Smith)', role: 'orbital',
      endpoints: ['http://192.168.1.11:4947'],
      capabilities: ['termux', 'edge_compute'],
      cube: { D15: 103823, D1: 'felipe' },
      adb_serial: 'R9QY205KAKJ',
    },
    beast: {
      id: 'beast', label: 'Beast S22 Ultra (Jesse)', role: 'orbital',
      endpoints: [],
      capabilities: ['mtp_only'],
      cube: { D15: 103823, D1: 'jesse' },
      adb_serial: 'RQCT302BXMA',
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

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    // Health
    if (url.pathname === '/behcs/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true, device: DEVICE_ID, bus: 'behcs',
        port, ts: new Date().toISOString(),
        registry: Object.keys(registry.devices).length + ' devices',
        cube: { D34: 2685619, D26: 1030301 },
      }));
      return;
    }

    // Receive message
    if (url.pathname === '/behcs/send' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const msg = JSON.parse(body);
          msg.received_at = new Date().toISOString();
          msg.received_by = DEVICE_ID;

          // Log to inbox
          if (msg.mode === 'stealth') {
            // Stealth: encrypt before logging
            const encrypted = crypto.createHash('sha256').update(JSON.stringify(msg.payload)).digest('hex');
            appendNdjson(INBOX, { ...msg, payload: '[STEALTH:' + encrypted.slice(0, 8) + ']' });
          } else {
            appendNdjson(INBOX, msg);
          }

          // Print to console if real mode
          if (msg.mode === 'real') {
            console.log(`[BEHCS] ${msg.from} → ${msg.to}: ${typeof msg.payload === 'string' ? msg.payload.slice(0, 200) : JSON.stringify(msg.payload).slice(0, 200)}`);
          } else if (msg.mode === 'shadow') {
            console.log(`[BEHCS:shadow] ${msg.from} → ${msg.to}: [shadow message]`);
          }
          // Stealth: no console output

          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, received: msg.id, by: DEVICE_ID }));
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
        const mode = url.searchParams.get('mode') || 'all';
        const lines = fs.existsSync(INBOX)
          ? fs.readFileSync(INBOX, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
          : [];
        const filtered = mode === 'all' ? lines : lines.filter(l => l.mode === mode);
        const last = parseInt(url.searchParams.get('last') || '20');
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, count: filtered.length, messages: filtered.slice(-last) }));
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
    res.end(JSON.stringify({ ok: false, error: 'not found', routes: ['/behcs/health', '/behcs/send', '/behcs/inbox', '/behcs/devices'] }));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[BEHCS] Bus running on 0.0.0.0:${port} as device=${DEVICE_ID}`);
    console.log(`[BEHCS] Modes: real | shadow | stealth`);
    console.log(`[BEHCS] Devices: ${Object.keys(registry.devices).join(', ')}`);
    console.log(`[BEHCS] Cube: D34 CROSS_COLONY (2685619) + D26 OMNIDIRECTIONAL (1030301)`);
  });

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
