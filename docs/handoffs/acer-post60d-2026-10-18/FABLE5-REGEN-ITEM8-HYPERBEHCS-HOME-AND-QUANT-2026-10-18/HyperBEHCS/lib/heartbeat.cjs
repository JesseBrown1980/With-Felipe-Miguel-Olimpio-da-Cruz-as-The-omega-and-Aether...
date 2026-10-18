// heartbeat.cjs — HyperBEHCS system heartbeat module
// PID: AGT-FALCON-AUTO_DAEMON-W19G-HEARTBEAT-2026-05-21
// Operator: "THE SYSTEM HAS A HEARTBEAT"
//
// Peer process — NEVER mutates the daemon. Append-only ndjson + counter sidecar.
// GATES: NEW files only. NO daemon mutation.

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { liveProbe } = require('./gpu-lane.cjs');

const STORE_DIR = 'C:/HyperBEHCS/store';
const HB_NDJSON = path.join(STORE_DIR, 'system-heartbeat.ndjson');
const HB_COUNTER = path.join(STORE_DIR, 'system-heartbeat.counter');
const SUBSTRATE = path.join(STORE_DIR, 'hyperbehcs-substrate.v1.hbs');
const DAEMON_HOST = '127.0.0.1';
const DAEMON_PORT = Number(process.env.HYPERBEHCS_PORT || 49257);

function sha16(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
}

function nowIso() { return new Date().toISOString(); }

function nextBeatSeq() {
  try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch (_) {}
  let cur = 0;
  try {
    const raw = fs.readFileSync(HB_COUNTER, 'utf8').trim();
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) cur = n;
  } catch (_) { cur = 0; }
  const next = cur + 1;
  const tmp = HB_COUNTER + '.tmp';
  fs.writeFileSync(tmp, String(next), 'utf8');
  fs.renameSync(tmp, HB_COUNTER);
  return next;
}

function readDaemonHealth(timeoutMs) {
  return new Promise((resolve) => {
    const to = timeoutMs || 1500;
    let finished = false;
    const finish = (v) => { if (!finished) { finished = true; resolve(v); } };
    const req = http.get({ host: DAEMON_HOST, port: DAEMON_PORT, path: '/health', timeout: to }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d.toString(); });
      res.on('end', () => {
        try {
          const obj = JSON.parse(body);
          finish({ ok: obj.ok === true, pid: obj.pid || null, gpu_path_ready: obj.gpu_path_ready === true, substrate_ready: obj.substrate_ready === true, status: res.statusCode });
        } catch (e) {
          finish({ ok: false, error: 'parse_failed', message: e.message, status: res.statusCode });
        }
      });
    });
    req.on('timeout', () => { try { req.destroy(); } catch (_) {} finish({ ok: false, error: 'timeout', timeout_ms: to }); });
    req.on('error', (e) => finish({ ok: false, error: 'http_error', message: e.message }));
  });
}

function substrateStat() {
  try {
    const st = fs.statSync(SUBSTRATE);
    return { size: st.size, mtime: st.mtimeMs };
  } catch (e) {
    return { size: null, mtime: null, error: e.message };
  }
}

async function pulse() {
  const ts_iso = nowIso();
  const beat_seq = nextBeatSeq();
  let daemon_health = null;
  let gpu_lane = null;
  let substrate = null;
  let err = null;
  try {
    daemon_health = await readDaemonHealth(1500);
    gpu_lane = await liveProbe(1500);
    substrate = substrateStat();
  } catch (e) {
    err = e && e.message ? e.message : String(e);
  }
  const beat = {
    ts_iso,
    beat_seq,
    daemon_pid: daemon_health && daemon_health.pid != null ? daemon_health.pid : null,
    daemon_health,
    gpu_lane,
    substrate_size: substrate ? substrate.size : null,
    substrate_mtime: substrate ? substrate.mtime : null,
    pid: process.pid
  };
  if (err) beat.error = err;
  beat.fingerprint = sha16(JSON.stringify({
    ts: beat.ts_iso, seq: beat.beat_seq, dh: beat.daemon_health,
    gl: beat.gpu_lane, ss: beat.substrate_size, sm: beat.substrate_mtime, e: beat.error || null
  }));
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.appendFileSync(HB_NDJSON, JSON.stringify(beat) + '\n', 'utf8');
  } catch (e) {
    beat.append_error = e.message;
  }
  return beat;
}

function startLoop(intervalMs, opts) {
  const iv = Math.max(1000, intervalMs || 10000);
  const o = opts || {};
  const log = o.log === false ? () => {} : (msg) => { try { process.stdout.write(msg + '\n'); } catch (_) {} };
  let stopped = false;
  let timer = null;
  const tick = async () => {
    if (stopped) return;
    try {
      const beat = await pulse();
      log(`[hb] seq=${beat.beat_seq} fp=${beat.fingerprint} gpu_ok=${beat.gpu_lane && beat.gpu_lane.ok} dh_ok=${beat.daemon_health && beat.daemon_health.ok}`);
    } catch (e) {
      try {
        const errBeat = { ts_iso: nowIso(), beat_seq: nextBeatSeq(), error: e.message || String(e), pid: process.pid };
        errBeat.fingerprint = sha16(JSON.stringify(errBeat));
        fs.appendFileSync(HB_NDJSON, JSON.stringify(errBeat) + '\n', 'utf8');
        log(`[hb] ERR seq=${errBeat.beat_seq} ${errBeat.error}`);
      } catch (_) {}
    }
    if (!stopped) timer = setTimeout(tick, iv);
  };
  // Immediate first beat, then interval
  timer = setTimeout(tick, 0);
  return { stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
}

function readRecent(n) {
  const want = Math.max(1, n || 10);
  let raw = '';
  try { raw = fs.readFileSync(HB_NDJSON, 'utf8'); } catch (_) { return []; }
  const lines = raw.split('\n').filter(Boolean);
  const tail = lines.slice(-want);
  return tail.map((ln) => { try { return JSON.parse(ln); } catch (_) { return { parse_error: true, raw: ln }; } });
}

function summarizeWindow(n) {
  const want = Math.max(1, n || 60);
  const beats = readRecent(want);
  const count = beats.length;
  if (count === 0) return { count: 0, uptime_ms: 0, gpu_path_ready_pct: 0, beats_with_errors: 0, avg_pstate: null };
  const tsFirst = beats[0].ts_iso ? Date.parse(beats[0].ts_iso) : null;
  const tsLast = beats[count - 1].ts_iso ? Date.parse(beats[count - 1].ts_iso) : null;
  const uptime_ms = (tsFirst && tsLast) ? (tsLast - tsFirst) : 0;
  let gpu_ok = 0;
  let errCount = 0;
  const pstates = [];
  for (const b of beats) {
    if (b.error || b.append_error) errCount += 1;
    if (b.gpu_lane && b.gpu_lane.ok === true) {
      gpu_ok += 1;
      if (b.gpu_lane.pstate) {
        const m = String(b.gpu_lane.pstate).match(/P(\d+)/);
        if (m) pstates.push(Number(m[1]));
      }
    }
  }
  const avg_pstate = pstates.length ? (pstates.reduce((a, b) => a + b, 0) / pstates.length) : null;
  return {
    count,
    uptime_ms,
    gpu_path_ready_pct: Math.round((gpu_ok / count) * 1000) / 10,
    beats_with_errors: errCount,
    avg_pstate
  };
}

module.exports = {
  pulse,
  startLoop,
  readRecent,
  summarizeWindow,
  paths: { HB_NDJSON, HB_COUNTER, SUBSTRATE }
};
