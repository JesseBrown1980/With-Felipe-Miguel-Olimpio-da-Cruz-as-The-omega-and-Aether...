// gaia-loader.mjs — GAIA's catalog-load + PID-spawn summon-executor.
//
// STEP B of the Asolaria crank: wire the served roster (host8-serve :5088) +
// the available 60D verb·noun·glyph·sha catalog so a POSITION/SEAT can be
// FILLED by the right agent (PID + profile) — DUPLICATABLE BY DEVICE — at the
// right time, spawned into the proven $0 opencode backend.
//
// WHY this file exists (measured, honest):
//   - host8-serve (:5088 /seats.hbp) already serves ~1860 POSITIONS to fill.
//   - runFreeAgent() in room-dispatcher.mjs is the PROVEN $0 spawn primitive
//     (fresh --dir => fresh opencode session => $0, keyless our side).
//   - model-citizen-rotator.mjs is registry/census ONLY; its honest_gap says
//     "summon execution not yet implemented". THIS module fills that gap.
//   - GAIA (per packages-legacy-import/spawnContextBuilder) is the lightweight
//     briefing/PID-controller component (priorityChains + inbox signals +
//     health flags). It BUILDS spawn-context packets but never SHELLS a real
//     agent. This module is GAIA's summon-EXECUTOR: catalog -> resolve -> fire.
//
// E=0 ADDITIVE: imports runFreeAgent (does not modify it) + buildReceipt.
// Does NOT modify room-dispatcher or model-citizen-rotator. HBP/json=0 friendly.
//
// Operator: Jesse Daniel Brown. Built 2026-06-19 (step B).

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { runFreeAgent } from './room-dispatcher.mjs';
import { buildReceipt } from './free-agent-receipt.mjs';

// ── primitives (same hashing the rest of the fabric uses) ────────────────────
function sha256hex(s) { return createHash('sha256').update(String(s)).digest('hex'); }
function sha16(s) { return sha256hex(s).slice(0, 16); }
function ts() { return new Date().toISOString(); }

// ── config / paths (measured live) ───────────────────────────────────────────
const SEATS_HOST = process.env.HOST8_SERVE_HOST || '127.0.0.1';
const SEATS_PORT = Number(process.env.HOST8_SERVE_PORT || 5088);
const OFFICE_REGISTERED = process.env.PID_OFFICE_REGISTERED || 'D:/PID-Registration-Office/registered';
const OFFICE_FEED = process.env.PID_OFFICE_FEED || 'D:/PID-Registration-Office/fabric-feed';
// 60D verb·noun·glyph·sha catalogs (measured: C:\HyperBEHCS\data\catalogs + tools)
const CATALOG_DIR = process.env.HYPERBEHCS_CATALOGS || 'C:/HyperBEHCS/data/catalogs';
const HILBERT_OMNI_47D = process.env.HILBERT_OMNI_47D || 'C:/Users/acer/Asolaria/tools/hilbert-omni-47D.json';
// where summon rooms are minted (unique dir per summon => fresh opencode => $0)
const SUMMON_ROOT = process.env.GAIA_SUMMON_ROOT || 'D:/bigpickle-rebuild/gaia-summon-rooms';

// ── HTTP GET helper (host8-serve roster) ─────────────────────────────────────
function httpGet(path, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const req = http.request({ host: SEATS_HOST, port: SEATS_PORT, path, method: 'GET' }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: d }));
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, body: '', error: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0, body: '', error: 'timeout' }); });
    req.end();
  });
}

// ── parse one HOST8SEAT pipe row -> position object ──────────────────────────
function parseSeatRow(line) {
  if (!line || !line.startsWith('HOST8SEAT|')) return null;
  const f = {};
  for (const kv of line.split('|')) {
    const i = kv.indexOf('=');
    if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1);
  }
  if (!f.handle8) return null;
  return {
    name: f.name || '',
    handle8: f.handle8,                 // base PID = the seat handle8
    class: f.class || '',
    layer: f.layer || '',
    cube_bh: f.cube_bh || '',
    hilbert: f.hilbert || '',
    source: f.source || '',
    profile: null,                      // filled by mergeCatalog()
  };
}

// ── 60D catalog: verb·noun·glyph·sha tuple from the available catalogs ────────
// Honest scope: the FULL 69D/49D atlas is a proposal overlay; what is LIVE on
// disk is the 47D canon (hilbert-omni-47D.json) + the HBP catalog corpus
// (verbs.hbp, abilities.hbp, etc.). We load the verb axis + the abilities
// (agent profiles) and build a 60D-shaped tuple {verb, noun, glyph, sha} per
// position. This is "the full 69D OR what is available" — what is available.
function loadVerbCatalog() {
  const verbs = [];
  const p = join(CATALOG_DIR, 'verbs.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('|entry=')) continue;
      const m = line.match(/\|entry=([^|]+)\|/);
      if (m) verbs.push(m[1]);
    }
  }
  return verbs;
}

function loadAbilityProfiles() {
  // agent profiles (kind=agent_profile) = the PROFILE a position carries
  const profiles = {};
  const p = join(CATALOG_DIR, 'abilities.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('kind=agent_profile')) continue;
      const f = {};
      for (const kv of line.split('|')) { const i = kv.indexOf('='); if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1); }
      if (f.entry) profiles[f.entry] = { read_grep: f.read_grep, bash_readonly: f.bash_readonly, write_edit: f.write_edit };
    }
  }
  return profiles;
}

// Build the 60D-shaped tuple for a position. DETERMINISTIC.
//   verb  — chosen from the verb axis by stable hash of the seat name
//   noun  — the seat name itself (the addressed thing)
//   glyph — sha16('glyph|'+name+'|'+cube_bh)  (BEHCS-style glyph id)
//   sha   — the seat handle8 (its canonical identity)
export function tuple60D(position, verbCatalog) {
  const noun = position.name;
  const verb = (verbCatalog && verbCatalog.length)
    ? verbCatalog[parseInt(sha16(position.handle8 + '|verb').slice(0, 8), 16) % verbCatalog.length]
    : 'report';
  const glyph = sha16(`glyph|${noun}|${position.cube_bh}`);
  const sha = position.handle8;
  return { verb, noun, glyph, sha };
}

// ── PUBLIC 1: loadCatalog() ──────────────────────────────────────────────────
// Reads the host8-serve roster (:5088 /seats.hbp; fallback office files) and
// merges the available 60D catalog. Returns an array of positions, each with
// {name, handle8, class, layer, cube_bh, profile{tuple60D, ability}}.
export async function loadCatalog(opts = {}) {
  let positions = [];
  let source = '';

  // primary: host8-serve :5088 /seats.hbp
  const r = await httpGet('/seats.hbp', opts.timeoutMs || 8000);
  if (r.ok && r.body.includes('HOST8SEAT|')) {
    for (const line of r.body.split('\n')) {
      const p = parseSeatRow(line.trim());
      if (p) positions.push(p);
    }
    source = `host8-serve http://${SEATS_HOST}:${SEATS_PORT}/seats.hbp`;
  } else {
    // fallback: read the office files directly (registered/*.hbp + fabric-feed)
    source = 'office-files';
    const dirs = [OFFICE_REGISTERED, OFFICE_FEED];
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      for (const fn of readdirSync(dir)) {
        if (!fn.endsWith('.hbp')) continue;
        for (const line of readFileSync(join(dir, fn), 'utf8').split('\n')) {
          const p = parseSeatRow(line.trim());
          if (p) positions.push(p);
        }
      }
    }
  }

  // merge available 60D catalog + ability profiles onto each position
  const verbCatalog = loadVerbCatalog();
  const abilityProfiles = loadAbilityProfiles();
  for (const p of positions) {
    const t = tuple60D(p, verbCatalog);
    // ability profile heuristic: match by class/layer keyword, else generic
    const abilityKey = Object.keys(abilityProfiles).find((k) =>
      (p.class || '').toLowerCase().includes(k.toLowerCase()) ||
      (p.name || '').toLowerCase().includes(k.toLowerCase())) || 'general-purpose';
    p.profile = { tuple60D: t, ability: abilityKey, ability_caps: abilityProfiles[abilityKey] || null };
  }

  const out = {
    ok: positions.length > 0,
    count: positions.length,
    source,
    verb_axis: verbCatalog.length,
    ability_profiles: Object.keys(abilityProfiles).length,
    catalog_47d_present: existsSync(HILBERT_OMNI_47D),
    positions,
  };
  console.error(`[gaia-loader] loadCatalog: ${out.count} positions from ${source} ` +
    `(verb_axis=${out.verb_axis}, ability_profiles=${out.ability_profiles}, 47D=${out.catalog_47d_present})`);
  return out;
}

// ── PUBLIC 2: resolveAgent(position, device, timestamp) ──────────────────────
// DETERMINISTICALLY select the agent PID+profile for a position, DUPLICATABLE
// BY DEVICE. The base PID is the seat handle8; the device-specific instance is
// a deterministic variant keyed by (handle8, device, timestamp, 60D tuple).
// Same profile, device-distinct instance id. This realizes "any Agent
// PID/profile loadable into any device tuple, just different by device".
export function resolveAgent(position, device, timestamp) {
  if (!position || !position.handle8) throw new Error('resolveAgent: position must carry handle8');
  const dev = String(device || 'acer');
  const tsv = String(timestamp != null ? timestamp : ts());
  const t = (position.profile && position.profile.tuple60D)
    || tuple60D(position, loadVerbCatalog());
  // device-distinct instance pid (deterministic): seat handle8 ⊗ device ⊗ ts ⊗ 60D
  const tupleStr = `${t.verb}.${t.noun}.${t.glyph}.${t.sha}`;
  const instance_pid = sha16(`${position.handle8}|${dev}|${tsv}|${tupleStr}`);
  return {
    base_handle8: position.handle8,     // the SEAT (position) identity — shared
    instance_pid,                       // device-distinct INSTANCE — differs by device
    device: dev,
    ts: tsv,
    name: position.name,
    class: position.class,
    layer: position.layer,
    cube_bh: position.cube_bh,
    tuple60D: t,                        // verb·noun·glyph·sha
    profile: position.profile || null,  // carried profile (same across devices)
  };
}

// ── live opencode launcher (REPLICATES room-dispatcher's EXACT invocation) ───
// room-dispatcher's runFreeAgent does spawn(cli, ['run','-m',model,'--dir',
// roomDir, question]) with NO_COLOR/TERM=dumb env. On Node >=18.20/20.12,
// spawn() of a .cmd throws EINVAL without shell:true (CVE-2024-27980), and the
// only opencode entry on this seat is opencode.cmd. So when OPENCODE_CLI points
// at a .cmd/.bat, we launch the SAME opencode args via `node <bin-js> run ...`
// (no shell, cross-platform). Same model, same --dir unique-project $0
// mechanism, same plain-text capture. room-dispatcher is NOT modified.
function stripAnsiLocal(s) {
  return String(s).replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}
function resolveOpencodeJsBin() {
  // env override first; else the canonical nvm opencode-ai package bin
  if (process.env.OPENCODE_JS_BIN && existsSync(process.env.OPENCODE_JS_BIN)) return process.env.OPENCODE_JS_BIN;
  const cands = [
    'C:/Users/acer/AppData/Local/nvm/v20.11.0/node_modules/opencode-ai/bin/opencode',
  ];
  for (const c of cands) if (existsSync(c)) return c;
  return null;
}
async function runFreeAgentNodeDirect(agentType, question, pid, opts = {}) {
  const roomDir = opts.roomDir;
  if (!roomDir) return { ok: false, mock: false, agentType, answer: '', error: 'roomDir required (unique project = $0)' };
  const bin = resolveOpencodeJsBin();
  if (!bin) return { ok: false, mock: false, agentType, answer: '', error: 'opencode JS bin not found (set OPENCODE_JS_BIN)' };
  const model = opts.model || 'opencode/big-pickle';
  // EXACT opencode args room-dispatcher uses, just launched via node <bin>
  const args = [bin, 'run', '-m', model, '--dir', roomDir, question];
  return await new Promise((resolve) => {
    const proc = spawn(process.execPath, args, {
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb', FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', done = false;
    const finish = (ok) => {
      if (done) return; done = true;
      const clean = stripAnsiLocal(out).split('\n')
        .filter((l) => l.trim() && !/build · |^>\s|^\s*⠀/.test(l))
        .join('\n').trim().slice(0, 1000);
      resolve({ ok, mock: false, agentType, answer: clean, model, roomDir });
    };
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('exit', (code) => finish(code === 0));
    proc.on('error', () => finish(false));
    setTimeout(() => { if (!done) { try { proc.kill('SIGTERM'); } catch {} finish(false); } }, opts.timeoutMs || 120000);
  });
}

// ── PUBLIC 3: summon(position, device, timestamp, question) ──────────────────
// resolveAgent -> fire via runFreeAgent (the PROVEN $0 opencode path) ->
// return a receipt. Mints a UNIQUE summon room dir keyed by instance_pid so the
// opencode session is fresh => $0. opts.live=true fires real opencode; default
// (opts.live falsey) uses runFreeAgent's deterministic $0 mock (testable).
export async function summon(position, device, timestamp, question, opts = {}) {
  const t0 = Date.now();
  const agent = resolveAgent(position, device, timestamp);

  // unique project dir = fresh opencode session = $0 (the proven free mechanism)
  const roomDir = join(SUMMON_ROOT, `summon-${agent.instance_pid}`);
  if (opts.live && !opts.dryRunDir) {
    try { mkdirSync(roomDir, { recursive: true }); } catch {}
  }

  const agentType = (agent.profile && agent.profile.ability) || 'opencode-coder';
  // Live launch selection: if the configured CLI is a .cmd/.bat (spawn EINVAL on
  // modern Node), use the node-direct replica; otherwise use the PROVEN
  // runFreeAgent unchanged. Mock ($0, no opencode) still goes through runFreeAgent.
  const cliIsCmd = /\.(cmd|bat)$/i.test(process.env.OPENCODE_CLI || '');
  const useNodeDirect = opts.live && (opts.nodeDirect || cliIsCmd);
  const fireOpts = { live: !!opts.live, roomDir, model: opts.model || 'opencode/big-pickle', timeoutMs: opts.timeoutMs || 120000 };
  const fire = useNodeDirect
    ? await runFreeAgentNodeDirect(agentType, question, agent.instance_pid, fireOpts)
    : await runFreeAgent(agentType, question, agent.instance_pid, fireOpts);

  const durationMs = Date.now() - t0;
  const exitCode = fire.ok ? 0 : 1;
  const response = fire.answer || '';

  // receipt via the proven free-agent-receipt builder (provable real vs mock)
  let receipt = null;
  try {
    const built = buildReceipt({
      agentType, pid: agent.instance_pid, model: fire.model || (opts.model || 'opencode/big-pickle'),
      project: roomDir, question, answer: response, exitCode, durationMs, vantage: agent.device, nodePid: process.pid,
    });
    receipt = built.receipt;
  } catch { /* receipt is advisory; do not fail the summon */ }

  return {
    ok: !!fire.ok,
    instance_pid: agent.instance_pid,
    base_handle8: agent.base_handle8,
    device: agent.device,
    ts: agent.ts,
    position: agent.name,
    tuple60D: agent.tuple60D,
    agent_type: agentType,
    cost: 0,                            // unique-dir opencode = $0 (or mock = $0)
    exit: exitCode,
    mock: !!fire.mock,
    live: !!opts.live,
    response,
    duration_ms: durationMs,
    room_dir: roomDir,
    receipt,
  };
}

// ── HBP record emitter (json=0 friendly) for a summon receipt ────────────────
export function summonHbpRow(s) {
  return [
    'HBPv1', 'row=gaia_summon', `instance_pid=${s.instance_pid}`, `base_handle8=${s.base_handle8}`,
    `device=${s.device}`, `position=${s.position}`, `agent_type=${s.agent_type}`,
    `verb=${s.tuple60D.verb}`, `glyph=${s.tuple60D.glyph}`,
    `cost=${s.cost}`, `exit=${s.exit}`, `mock=${s.mock}`, `live=${s.live}`,
    `ts=${s.ts}`, 'json=0', `row_hash=${sha16(s.instance_pid + s.base_handle8 + s.exit)}`,
  ].join('|');
}
