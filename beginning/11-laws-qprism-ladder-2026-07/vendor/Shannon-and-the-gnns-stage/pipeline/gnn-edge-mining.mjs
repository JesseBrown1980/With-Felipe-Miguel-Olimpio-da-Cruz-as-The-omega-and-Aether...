// ============================================================================
// Lineage: GNN architecture descendant of Dan Edens' 6-hook bundle
// (Madness Interactive / madnessinteractive.cc / Omnispindle MCP).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// gnn-edge-mining plane — AGT-G1-EDGE-MINING-GNN-PID-2026-05-19
// First of Jesse's 3-GNN stack (cp 896 edge-mining). Cp 897 + cp 898 are siblings.
//
// Role: scores WHICH edges in the hypergraph matter — emits a weight ∈ [0,1] per
// (src_pid, dst_pid, kind) triple, derived from:
//   1. authority_quant bit-population-count / 16  (authority half of the weight)
//   2. JL-fingerprint distance between src and dst meta vectors (geometric half)
//
// Reads authority_quant via quant-bus.enrichEnvelope. Default-closed: empty env
// → weight = 0.5 (neutral prior, no signal).
//
// Append-only emit. No JSON-on-wire — outputs HBPv1 frame via encodeFrame.

import { encodeFrame } from '../bpi-codec.mjs';
import { quantMetadata, packQuantPacket } from '../omniquant.mjs';
import { enrichEnvelope, AUTHORITY_FIELDS } from '../quant-bus.mjs';

let _mined = 0;
const _kinds = new Set();
const _top = []; // bounded top-10 by weight, descending

function popcount16(bits) {
  if (typeof bits !== 'string' || bits.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') n++;
  return n;
}

// JL fingerprint over src + dst meta vector. Deterministic via fixed seed.
function jlFingerprint(env) {
  const jl = quantMetadata(env, 'jl');
  const proj = jl.projection || jl.codes || [];
  if (!proj || proj.length === 0) return 0;
  // Reduce projection to scalar in [0,1] via L2 norm normalized by length.
  let sumsq = 0;
  for (let i = 0; i < proj.length; i++) {
    const v = Number(proj[i]) || 0;
    sumsq += v * v;
  }
  const norm = Math.sqrt(sumsq / proj.length);
  // Squash to [0,1] via 1 - exp(-norm) (any positive norm → (0,1)).
  return 1 - Math.exp(-norm);
}

// Bit-tail of packed JL bytes for edge_quant signature.
function edgeQuantTail(env) {
  const jl = quantMetadata(env, 'jl');
  if (!jl || (!jl.projection && !jl.codes)) return '';
  const proj = jl.projection || jl.codes;
  if (!proj.length) return '';
  // Pack via same path as quant-bus so signatures align with envelope.js_quant.
  const arr = proj instanceof Float32Array ? proj : Float32Array.from(proj);
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  // 8-hex tail (compact — full 16-hex tail already lives in env.js_quant).
  return buf.toString('hex').slice(0, 8);
}

// Mine a single (src → dst) edge from an envelope. Envelope may carry
// src_pid / dst_pid / kind, or supply them via the second argument.
export function mineEdge(env, edgeOverride = {}) {
  if (!env || typeof env !== 'object') {
    return { src: '', dst: '', kind: '', weight: 0.5, edge_quant: '' };
  }
  enrichEnvelope(env);
  const src  = edgeOverride.src  ?? env.src_pid  ?? env.src  ?? '';
  const dst  = edgeOverride.dst  ?? env.dst_pid  ?? env.dst  ?? '';
  const kind = edgeOverride.kind ?? env.kind     ?? 'meta';

  const authBits = env.authority_quant || '';
  const authNorm = authBits.length === AUTHORITY_FIELDS.length
    ? popcount16(authBits) / AUTHORITY_FIELDS.length
    : 0;
  const jlDist   = jlFingerprint(env);

  // 50/50 blend authority half + JL half. Empty env → both 0 → weight 0.5 mid-point.
  const blended  = (authNorm + jlDist) / 2;
  const weight   = src === '' && dst === '' ? 0.5 : blended;
  const edge_quant = edgeQuantTail(env);

  _mined++;
  _kinds.add(kind);

  // Bounded top-10 insertion (descending by weight).
  const entry = { src, dst, kind, weight: Number(weight.toFixed(6)), edge_quant };
  _top.push(entry);
  _top.sort((a, b) => b.weight - a.weight);
  if (_top.length > 10) _top.length = 10;

  return entry;
}

// Emit an edge-mining frame on the wire (HBPv1).
export function gnnEdgeEmit(env, edgeOverride) {
  const e = mineEdge(env, edgeOverride);
  return encodeFrame('GNNE', [
    e.src,
    e.dst,
    e.kind,
    e.weight.toFixed(6),
    e.edge_quant,
    env.authority_quant || '',
  ]);
}

export function state() {
  return {
    plane: 'gnn-edge-mining',
    mined: _mined,
    distinct_kinds: _kinds.size,
    top10_edges: _top.slice(),
  };
}

export function selfTest() {
  // Reset locals so the test is hermetic at the entry-edge perspective.
  _mined = 0; _kinds.clear(); _top.length = 0;

  const mkEnv = (i, auth, kind) => ({
    room_id: i, port_outer: 50000 + i, port_inner: 7000 + i,
    elapsed_ms: 100 * i, stdout_len: 16 * i, ok: 1,
    ts_ms: 1715000000000 + i * 1000, job_seq: i,
    src_pid: `PID-SRC-${i}`,
    dst_pid: `PID-DST-${i}`,
    kind,
    authority: auth,
  });

  const samples = [
    mkEnv(1, [],                                                'meta'),  // no auth
    mkEnv(2, ['fabric'],                                        'pair'),  // 1 bit
    mkEnv(3, ['fabric', 'shannon'],                             'pair'),  // 2 bits
    mkEnv(4, ['op_jesse', 'op_rayssa', 'hermes', 'artemis'],    'cosign'),// 4 bits
    mkEnv(5, AUTHORITY_FIELDS.slice(),                          'cosign'),// 16 bits (max)
  ];

  const r1 = samples.map((s) => mineEdge({ ...s }));
  // Determinism check: second pass on copies should yield identical weights.
  _mined = 0; _kinds.clear(); _top.length = 0;
  const r2 = samples.map((s) => mineEdge({ ...s }));

  const deterministic = r1.every((e, i) =>
    e.weight === r2[i].weight && e.edge_quant === r2[i].edge_quant);

  // Weight ordering: more authority bits should non-decrease weight (auth half monotonic).
  const authNorms = r1.map((_, i) => i === 0 ? 0 : i === 4 ? 1 : (i + 1 - 2) / 16);
  const weightOrderingOk = (
    r1[0].weight <= r1[1].weight &&
    r1[1].weight <= r1[2].weight &&
    r1[2].weight <= r1[3].weight &&
    r1[3].weight <= r1[4].weight
  );

  // Default-closed: empty env → weight === 0.5.
  const empty = mineEdge({});
  const defaultClosed = empty.weight === 0.5;

  const st = state();
  const ok = deterministic && weightOrderingOk && defaultClosed
          && st.mined === 6 /* 5 + 1 empty */
          && st.distinct_kinds >= 3;

  return {
    ok,
    deterministic,
    weight_ordering_ok: weightOrderingOk,
    default_closed: defaultClosed,
    mined: st.mined,
    distinct_kinds: st.distinct_kinds,
    weights: r1.map((e) => e.weight),
    top1: st.top10_edges[0] || null,
  };
}

// Bus wiring — additive subscription; no-op if bus absent.
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('gnn-edge-mining', 'mineEdge', (tuple, _ctx) => {
    const frame = gnnEdgeEmit(tuple);
    if (typeof bus.publish === 'function') {
      try { bus.publish('gnnEdgeMined', { src: tuple && tuple.src_pid, dst: tuple && tuple.dst_pid, frame }); }
      catch (_) { /* swallow */ }
    }
    return frame;
  });
}
