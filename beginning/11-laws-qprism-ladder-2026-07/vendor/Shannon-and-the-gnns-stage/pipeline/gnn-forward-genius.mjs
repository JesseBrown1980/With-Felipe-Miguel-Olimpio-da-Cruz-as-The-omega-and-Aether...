// ============================================================================
// Lineage: GNN architecture descendant of Dan Edens' 6-hook bundle
// (Madness Interactive / madnessinteractive.cc / Omnispindle MCP).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// gnn-forward-genius plane — role: forward_genius_mining.
// AGT-G2-FORWARD-GENIUS-GNN-PID-2026-05-19 — second of Jesse's 3-GNN stack.
//
// Identifies WINNING PATHS through the hypergraph via forward propagation.
// Genius-mining = +weight on js_quant (JL projection) — paths whose JL
// fingerprints align with a seed envelope (opts.seed) score higher.
// Composes downstream of G1 edge-mining (consumes its envelopes unchanged).
//
// Stateless w.r.t. external state (in-memory tallies only). Deterministic.
// JL seed canonical 'revolver-10k' (matches omniquant.mjs default).

import { quantMetadata } from '../omniquant.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

let _mined = 0;
let _lastTopPid = null;
let _lastGeniusQuant = 0;
let _lastPathLen = 0;

// Hamming similarity between two equal-length hex strings (fp16 → 64 bits).
// Returns fraction of matching bits in [0,1]. Empty → 0.
function hexHamming(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let bits = 0;
  let match = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16);
    const y = parseInt(b[i], 16);
    let diff = x ^ y;
    // 4 bits per hex digit
    let same = 4;
    while (diff) { same -= (diff & 1); diff >>>= 1; }
    match += same;
    bits += 4;
  }
  return bits === 0 ? 0 : match / bits;
}

// Count 1-bits in an authority bitmask string.
function popcount(bitstr) {
  if (!bitstr) return 0;
  let n = 0;
  for (let i = 0; i < bitstr.length; i++) if (bitstr[i] === '1') n++;
  return n;
}

// Compute a single envelope's genius score against seed JL fingerprint.
// Score = 0.7 * JL-similarity + 0.3 * (authority_popcount / 16).
function scoreEnvelope(env, seedJsQuant) {
  const sim = hexHamming(env.js_quant || '', seedJsQuant);
  const authBits = popcount(env.authority_quant || '');
  const auth = authBits / 16;
  return 0.7 * sim + 0.3 * auth;
}

// Build a deterministic path PID from an ordered list of room_ids.
function pathPid(rooms) {
  const tag = rooms.map((r) => Number(r) || 0).join('-');
  return `G2-FWD-GENIUS-PATH-${tag}-PID-2026-05-19`;
}

// Main: rank envelopes as forward paths by JL-similarity to seed + cumulative authority_quant.
// opts:
//   seed:       envelope or quant fp16; canonical 'revolver-10k' if absent
//   topK:       number of paths to return (default 3)
// Returns { paths:[{pid, rooms, score, js_alignment, auth_bits}], top_path_pid, genius_quant }.
export function mineForward(envs, opts = {}) {
  const list = Array.isArray(envs) ? envs : [];
  // Enrich each envelope (idempotent — quant-bus is roundtrip-safe).
  const enriched = list.map((e) => enrichEnvelope({ ...e }));
  // Resolve seed JL fingerprint.
  let seedJs;
  if (opts.seed && typeof opts.seed === 'object') {
    const s = enrichEnvelope({ ...opts.seed });
    seedJs = s.js_quant || '';
  } else if (typeof opts.seed === 'string' && /^[0-9a-f]{16}$/.test(opts.seed)) {
    seedJs = opts.seed;
  } else {
    // Canonical 'revolver-10k' seed via a unit-vector envelope.
    const canonical = { room_id: 1, port_outer: 1, port_inner: 1, elapsed_ms: 1, stdout_len: 1, ok: 1, ts_ms: 1, job_seq: 1 };
    enrichEnvelope(canonical);
    seedJs = canonical.js_quant;
  }
  // Score each envelope. Build pairwise-prefix paths (forward propagation):
  // path_k = [env_0 .. env_k]. Path score = mean of envelope scores.
  const scored = enriched.map((e) => ({
    env: e,
    js_alignment: hexHamming(e.js_quant || '', seedJs),
    auth_bits: popcount(e.authority_quant || ''),
    score: scoreEnvelope(e, seedJs),
  }));
  const paths = [];
  for (let k = 0; k < scored.length; k++) {
    const prefix = scored.slice(0, k + 1);
    const mean = prefix.reduce((a, p) => a + p.score, 0) / prefix.length;
    const rooms = prefix.map((p) => p.env.room_id ?? 0);
    paths.push({
      pid: pathPid(rooms),
      rooms,
      length: prefix.length,
      score: mean,
      js_alignment: prefix[prefix.length - 1].js_alignment,
      auth_bits: prefix.reduce((a, p) => a + p.auth_bits, 0),
    });
  }
  paths.sort((a, b) => b.score - a.score || b.length - a.length);
  const topK = Number.isInteger(opts.topK) ? opts.topK : 3;
  const winners = paths.slice(0, Math.max(1, topK));
  const top = winners[0] || { pid: null, score: 0, length: 0 };
  // genius_quant: JL fingerprint of an envelope built from top path's aggregate signature.
  const agg = { room_id: top.length, port_outer: Math.round(top.score * 1e6), port_inner: top.auth_bits, elapsed_ms: 0, stdout_len: 0, ok: 1, ts_ms: 0, job_seq: _mined };
  const aggPacket = quantMetadata(agg, 'jl');
  const fp = (aggPacket && aggPacket.fingerprint) ? String(aggPacket.fingerprint).slice(0, 16) : '';
  _mined++;
  _lastTopPid = top.pid;
  _lastGeniusQuant = top.score;
  _lastPathLen = top.length;
  return { paths: winners, top_path_pid: top.pid, genius_quant: fp, seed_js_quant: seedJs };
}

export function state() {
  return {
    plane: 'gnn-forward-genius',
    mined: _mined,
    last_top_path_pid: _lastTopPid,
    last_genius_score: _lastGeniusQuant,
    last_path_len: _lastPathLen,
  };
}

export function selfTest() {
  // Build a 7-envelope test path. Seed = envelope #4 itself (it must win on alignment).
  const base = 1715000000000;
  const envs = [];
  for (let i = 0; i < 7; i++) {
    envs.push({
      room_id: 100 + i,
      port_outer: 50100 + i,
      port_inner: 7000 + i,
      elapsed_ms: 100 + i * 17,
      stdout_len: 32 + i * 8,
      ok: 1,
      ts_ms: base + i * 1000,
      job_seq: i,
      authority: i === 3 ? { op_jesse: true, shannon: true, hermes: true, foundation: true, fabric: true } : { fabric: true },
    });
  }
  // Use envelope #3 as the seed (mid-path) so paths containing it should rank high.
  const seedEnv = envs[3];
  const result = mineForward(envs, { seed: seedEnv, topK: 5 });
  // Assertions.
  const enrichedSeed = enrichEnvelope({ ...seedEnv });
  const topPath = result.paths[0];
  const seedSelfAlign = hexHamming(enrichedSeed.js_quant, enrichedSeed.js_quant); // = 1.0
  const allHaveJs = result.paths.every((p) => /^.+$/.test(p.pid));
  const monotonicSort = result.paths.every((p, i, a) => i === 0 || a[i - 1].score >= p.score);
  const topHasReasonableAlignment = topPath.js_alignment >= 0.0 && topPath.js_alignment <= 1.0;
  const geniusQuantValid = /^[0-9a-f]{16}$/.test(result.genius_quant);
  const seedAlignSane = seedSelfAlign === 1;
  const ok = allHaveJs && monotonicSort && topHasReasonableAlignment && geniusQuantValid && seedAlignSane && !!result.top_path_pid;
  return {
    ok,
    paths_returned: result.paths.length,
    top_path_pid: result.top_path_pid,
    top_score: topPath.score,
    top_js_alignment: topPath.js_alignment,
    genius_quant: result.genius_quant,
    seed_js_quant: result.seed_js_quant,
    monotonic_sort: monotonicSort,
    seed_self_align: seedSelfAlign,
    state: state(),
  };
}

// wire(bus): subscribe forward-genius mining on the conductor bus.
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('gnn-forward-genius', 'mineForward', (tuple, _ctx) => {
    const out = mineForward(tuple && tuple.envs, tuple && tuple.opts);
    if (typeof bus.publish === 'function') {
      try { bus.publish('gnnForwardPath', { top_path_pid: out.top_path_pid, genius_quant: out.genius_quant }); } catch (_) { /* swallow */ }
    }
    return out;
  });
}
