// room-dispatcher.mjs — the free-agent executor + router for the district fabric.
//
// FLOW (operator-specified 2026-06-01):
//   rotator district  -- PID emitter rotates room assignments (folder/file stamp)
//     -> spawn type-correct agent in room (FREE opencode; deterministic mock fallback)
//       -> agent emits answer into outbox.hbp (sha-verified)
//         -> route to PRISM rooms (forward prism)
//           -> feed back through HOOKWALL gate
//             -> forward GNN (:4792) + reverse-gain GNN
//               -> omnishannon entropy + shannon parts
//                 -> mint genius/mistake into white-room
//
// HBP only — no JSON hot path. PID-specific throughout.
// Pairs: district-fabric.mjs · hbp-reader.mjs · hbp-emitter.mjs
// Operator: Jesse Daniel Brown — authorized 2026-06-01.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { sha16, sha8, roomDir, roomPid } from './district-fabric.mjs';
import { parsePipeRow } from './hbp-reader.mjs';
import { PIDChainRevolver, LANE_CYCLE } from './pid-chain-revolver.mjs';

function ts() { return new Date().toISOString(); }

// ── 1. AGENT TYPE PER DISTRICT — which rooms host which agents ───────────────
export const AGENT_TYPE_BY_DISTRICT = Object.freeze({
  rotator:       { type: 'pid-rotator',   spawns: false, role: 'rotate PIDs through rooms; assign work, do not answer' },
  prism:         { type: 'prism-relay',   spawns: false, role: 'forward-dispatch + reverse-collect; pure routing' },
  engineering:   { type: 'opencode-coder', spawns: true,  role: 'real free opencode agent — reads question, writes code/answer' },
  'white-room':  { type: 'mint-critic',   spawns: true,  role: 'clean-room critic — classify genius vs mistake from 0' },
  'gnn-feed':    { type: 'gnn-scorer',    spawns: false, role: 'score edges via forward + reverse-gain GNN' },
  council:       { type: 'vote-agent',    spawns: true,  role: 'vote/review — supervisor decision' },
});

// ── 2. FREE OPENCODE AGENT ─────────────────────────────────────────────────
// FREE mechanism (operator canon): opencode accumulates context/cost PER PROJECT.
// Reuse a project name => NOT free. So each call MUST run in a UNIQUE project
// (= the unique room dir) with a UNIQUE PID/profile. The 10K rooms + PID-emitter
// rotator ARE the unique-project generator — fresh room => fresh session => free.
// Plain-text capture only; NO JSON (HBP-first doctrine). opencode is on PATH.
function findOpencodeCli() {
  // opencode is on PATH (/c/nvm4w/nodejs/opencode); allow override.
  return process.env.OPENCODE_CLI || 'opencode';
}

// strip ANSI/TUI control codes from opencode default output
function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

export async function runFreeAgent(agentType, question, pid, opts = {}) {
  const cli = opts.cli ?? findOpencodeCli();
  // Deterministic mock: sha-derived answer so the pipeline is testable at $0,
  // reproducible. Real opencode runs when opts.live is set (and a unique roomDir given).
  if (opts.mock || !opts.live) {
    const seed = sha16(`${agentType}|${pid}|${question}`);
    const score = (parseInt(seed.slice(0, 4), 16) % 1000) / 1000; // 0..0.999 spread
    return {
      ok: true, mock: true, agentType,
      answer: `[${agentType}] ${seed}: deterministic response for "${String(question).slice(0, 60)}"`,
      self_score: score,
    };
  }
  // REAL free opencode agent — UNIQUE project per call = free.
  // --dir <roomDir> makes each room a distinct project (fresh session, no
  // accumulated context). Plain text out (no JSON). model defaults to a free one.
  const model = opts.model || 'opencode/big-pickle';
  const roomDir = opts.roomDir; // the unique project — REQUIRED for free
  if (!roomDir) {
    return { ok: false, mock: false, agentType, answer: '', self_score: null, error: 'live mode requires opts.roomDir (unique project) — refusing to run in default project (would not be free)' };
  }
  return await new Promise((resolve) => {
    const args = ['run', '-m', model, '--dir', roomDir, question];
    const proc = spawn(cli, args, { windowsHide: true, env: { ...process.env, NO_COLOR: '1', TERM: 'dumb', FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', done = false;
    const finish = (ok) => {
      if (done) return; done = true;
      const clean = stripAnsi(out).split('\n')
        .filter((l) => l.trim() && !/build · |^>\s|^\s*⠀/.test(l))
        .join('\n').trim().slice(0, 1000);
      resolve({ ok, mock: false, agentType, answer: clean, self_score: null, model, roomDir });
    };
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('exit', (code) => finish(code === 0));
    proc.on('error', () => finish(false));
    setTimeout(() => { if (!done) { try { proc.kill('SIGTERM'); } catch {} finish(false); } }, opts.timeoutMs || 120000);
  });
}

// ── 3. PID-DRIVEN ROOM ROTATION — the PROVEN PIDChainRevolver (ported) ───────
// Canonical invariant (model-citizen-rotator): ONE subprocess per ROOM (rotor),
// not one per agent. The revolver mints a unique agent PID per .next() (anchor +
// counter, 7 lanes); the room idx cycles the UNIQUE PROJECT (= room dir) that
// keeps each opencode call free. This replaces the ad-hoc cursor with the proven
// emitter from the bigpickle/neuro runs.
const _revolvers = new Map();
function revolverFor(district) {
  if (!_revolvers.has(district)) {
    _revolvers.set(district, new PIDChainRevolver({ anchor: `ASOLARIA-DISTRICT-${String(district).toUpperCase()}` }));
  }
  return _revolvers.get(district);
}
export function rotateRoom(district, roomCount, opts = {}) {
  const rev = revolverFor(district);
  const rotation = rev.counter;            // index used for this mint
  const agentPid = rev.next();             // PROVEN canonical PID emitter
  const idx = rotation % roomCount;        // unique project (room dir) cycles
  const roomAddr = roomPid(district, idx); // the room's Brown-Hilbert address
  const lane = LANE_CYCLE[rotation % LANE_CYCLE.length];
  const rd = roomDir(district, idx);
  // stamp the descriptor: agent PID + lane + room address (append-only; folder stays)
  const stamp = `HBPv1|row=rotation|agent_pid=${agentPid}|room_pid=${roomAddr}|district=${district}|idx=${idx}|lane=${lane}|rotation=${rotation}|state=assigned|ts=${ts()}|json=0|row_hash=${sha8(agentPid + rotation)}`;
  if (!opts.dryRun && existsSync(rd)) {
    try { appendFileSync(join(rd, 'ROOM.hbp'), stamp + '\n', 'utf8'); } catch {}
  }
  // pid kept = agentPid for back-compat; roomPid exposed for the unique-project dir
  return { district, idx, pid: agentPid, agentPid, roomPid: roomAddr, lane, rotation, dir: rd };
}

// ── 4. HOOKWALL GATE → GNN → REVERSE-GAIN → SHANNON ──────────────────────────
function gnnInfer(nodes, edges, edgeFeatures, port = 4792, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const body = JSON.stringify({ nodes, edges, edge_features: edgeFeatures });
    const req = http.request({ hostname: host, port, path: '/infer', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let d = ''; res.on('data', (c) => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ ok: false }); } }); });
    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(2500, () => { req.destroy(); resolve({ ok: false }); });
    req.write(body); req.end();
  });
}

export function hookwallGate(score) {
  // forward-gate: >=0.72 farm-gem, else block-and-preserve
  return score >= 0.72
    ? { pass: true, status: 'FARM_GEM_WITH_GATES' }
    : { pass: false, status: 'BLOCK_AND_PRESERVE' };
}

export function reverseGain(score) {
  const reverseRisk = +(1 - score).toFixed(4);
  const promoted = score >= 0.72 && reverseRisk <= 0.28;
  return { reverseRisk, promoted, gnnStatus: promoted ? 'FORWARD_GNN_MARK_GENIUS' : 'REVERSE_GAIN_MARK_MISTAKE' };
}

// omnishannon: entropy across the 12 shannon positions of an answer's byte histogram
export function shannonParts(answer) {
  const buf = Buffer.from(String(answer), 'utf8');
  const bins = new Array(12).fill(0);
  for (const b of buf) bins[b % 12]++;
  const total = bins.reduce((a, c) => a + c, 0) || 1;
  const probs = bins.map((c) => c / total);
  const H = -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
  const maxH = Math.log2(12);
  return { H: +H.toFixed(4), efficiency: +(H / maxH).toFixed(4), parts: 12 };
}

// ── 5. DISPATCH ONE ROOM end-to-end ──────────────────────────────────────────
export async function dispatchRoom(district, idx, opts = {}) {
  const meta = AGENT_TYPE_BY_DISTRICT[district] || { type: 'generic', spawns: false };
  const rd = roomDir(district, idx);
  const inboxPath = join(rd, 'inbox.hbp');
  const outboxPath = join(rd, 'outbox.hbp');

  // read the question (HBP)
  let question = `[${district}] default lane probe`;
  let pid = roomPid(district, idx);
  if (existsSync(inboxPath)) {
    const raw = readFileSync(inboxPath, 'utf8').trim();
    if (raw) { const { fields } = parsePipeRow(raw.split('\n')[0]); question = fields.question || fields.lane || question; if (fields.pid) pid = fields.pid; }
  }

  // run the type-correct free agent
  const agent = await runFreeAgent(meta.type, question, pid, opts);
  const answer = agent.answer;

  // hookwall -> GNN -> reverse-gain -> shannon
  const aHash = sha16(answer);
  const nodeFeat = Array.from({ length: 6 }, (_, i) => parseInt(sha16(pid).slice(i * 2, i * 2 + 2), 16) / 255);
  const edgeFeat = [parseInt(aHash.slice(0, 2), 16) / 255, parseInt(aHash.slice(2, 4), 16) / 255, parseInt(aHash.slice(4, 6), 16) / 255];
  let gnnScore = agent.self_score ?? 0.5;
  let gnnReal = false;
  if (!opts.skipGnn) {
    const r = await gnnInfer([nodeFeat, nodeFeat], [[0, 1]], [edgeFeat], opts.gnnPort || 4792);
    if (r && r.ok) { gnnScore = Array.isArray(r.scores) ? r.scores[0] : r.scores; gnnReal = true; }
  }
  const hook = hookwallGate(gnnScore);
  const rg = reverseGain(gnnScore);
  const shannon = shannonParts(answer);

  // write the answer to outbox (HBP, sha-stamped)
  const row = [
    'HBPv1', 'row=room_answer', `pid=${pid}`, `district=${district}`, `idx=${idx}`,
    `agent_type=${meta.type}`, `mock=${agent.mock}`,
    `gnn_score=${(+gnnScore).toFixed(4)}`, `gnn_real=${gnnReal}`,
    `hookwall=${hook.status}`, `gnn_status=${rg.gnnStatus}`, `reverse_risk=${rg.reverseRisk}`, `promoted=${rg.promoted}`,
    `shannon_H=${shannon.H}`, `shannon_eff=${shannon.efficiency}`,
    `answer_sha16=${sha16(answer)}`, `ts=${ts()}`, 'json=0', 'runtime=0',
    `row_hash=${sha8(pid + rg.gnnStatus + answer)}`,
  ].join('|');
  if (!opts.dryRun) writeFileSync(outboxPath, row + '\n', 'utf8');

  return { district, idx, pid, agent_type: meta.type, answer_sha16: sha16(answer), gnn_score: +(+gnnScore).toFixed(4), gnn_real: gnnReal, hookwall: hook.status, gnn_status: rg.gnnStatus, reverse_risk: rg.reverseRisk, promoted: rg.promoted, shannon, outbox_row: row };
}

// ── 6. PRISM ROUTING — forward an answer into a prism room ───────────────────
export function routeToPrism(answerRow, prismIdx, opts = {}) {
  const rd = roomDir('prism', prismIdx);
  const inboxPath = join(rd, 'inbox.hbp');
  const { fields } = parsePipeRow(answerRow);
  const route = `HBPv1|row=prism_forward|from_pid=${fields.pid}|from_district=${fields.district}|gnn_status=${fields.gnn_status}|gnn_score=${fields.gnn_score}|shannon_H=${fields.shannon_H}|answer_sha16=${fields.answer_sha16}|ts=${ts()}|json=0|row_hash=${sha8((fields.pid || '') + 'prism' + prismIdx)}`;
  if (!opts.dryRun && existsSync(rd)) { try { appendFileSync(inboxPath, route + '\n', 'utf8'); } catch {} }
  return { prismIdx, route };
}
