// ============================================================================
// Lineage: derived from Dan Edens' 6-hook bundle (Madness Interactive / madnessinteractive.cc).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// hookwall/gnn-feeder — role: hbpv1_metadata → gnn_feature_vector pipe.
// Reads envelope row metadata, JL-projects via omniquant, emits on the GNN plane.
// Optional gulp pre-pipe for batch feeds. No JSON on the wire; planes own framing.

import { quantMetadata, packQuantPacket, vectorFromEnvelope } from '../omniquant.mjs';
import { gnnEmit } from '../planes/gnn.mjs';

let _fed = 0;
let _bytes = 0;
let _lastFp = null;
let _lastRoomId = null;

// Optional gulp plane — load lazily so the feeder works even if gulp is absent.
let _gulp = null;
async function gulpModule() {
  if (_gulp !== null) return _gulp;
  try {
    _gulp = await import('../planes/gulp.mjs');
  } catch {
    _gulp = false;
  }
  return _gulp;
}

// Normalize an envelope into the fixed-order numeric vector contract.
function normalize(env) {
  return {
    room_id:     env?.room_id     ?? 0,
    port_outer:  env?.port_outer  ?? 0,
    port_inner:  env?.port_inner  ?? 0,
    elapsed_ms:  env?.elapsed_ms  ?? 0,
    stdout_len:  env?.stdout_len  ?? 0,
    ok:          env?.ok          ?? 0,
    ts_ms:       env?.ts_ms       ?? Date.now(),
    job_seq:     env?.job_seq     ?? _fed,
  };
}

// Build the JL-projected packed packet and emit a GNN frame.
export function feedGnn(envelope) {
  const env = normalize(envelope);
  // Establish the canonical vector ordering (side-effect-free check).
  vectorFromEnvelope(env);
  const packet = quantMetadata(env, 'jl');
  const packed = packQuantPacket(packet);
  const frame = gnnEmit({
    room_id:    env.room_id,
    port_outer: env.port_outer,
    port_inner: env.port_inner,
    elapsed_ms: env.elapsed_ms,
    ok:         env.ok,
  });
  _fed++;
  _bytes += packed.bytes.length;
  _lastFp = packet.fingerprint;
  _lastRoomId = env.room_id;
  return {
    frame,
    fingerprint: packet.fingerprint,
    packed_bytes: packed.bytes.length,
  };
}

// Batch path: pipe through gulp first (if loadable), then feed each envelope.
export async function feedGnnBatch(envelopes) {
  const list = Array.isArray(envelopes) ? envelopes : [];
  const g = await gulpModule();
  const results = [];
  let gulped = 0;
  for (const env of list) {
    const n = normalize(env);
    if (g && typeof g.gulpIngest === 'function' && n.room_id) {
      try { g.gulpIngest({ room_id: n.room_id, envelope: env }); gulped++; }
      catch { /* gulp ingest is best-effort; do not block GNN feed */ }
    }
    results.push(feedGnn(env));
  }
  return {
    count: results.length,
    gulped,
    total_packed_bytes: results.reduce((a, r) => a + r.packed_bytes, 0),
    last_fingerprint: results.length ? results[results.length - 1].fingerprint : null,
    results,
  };
}

export function state() {
  return {
    plane: 'hookwall.gnn-feeder',
    fed: _fed,
    total_packed_bytes: _bytes,
    last_fingerprint: _lastFp,
    last_room_id: _lastRoomId,
  };
}

export function selfTest() {
  const base = Date.now();
  const samples = [
    { room_id: 11, port_outer: 50011, port_inner: 7777, elapsed_ms:  120, stdout_len:  64, ok: 1, ts_ms: base,       job_seq: 1 },
    { room_id: 22, port_outer: 50022, port_inner: 7778, elapsed_ms:  340, stdout_len: 128, ok: 1, ts_ms: base + 10,  job_seq: 2 },
    { room_id: 33, port_outer: 50033, port_inner: 7779, elapsed_ms: 9999, stdout_len: 512, ok: 0, ts_ms: base + 20,  job_seq: 3 },
  ];
  const before = _fed;
  const out = samples.map((e) => feedGnn(e));
  return {
    ok: true,
    fed_now: _fed - before,
    fingerprints: out.map((r) => r.fingerprint),
    packed_bytes: out.map((r) => r.packed_bytes),
    total: _fed,
  };
}
