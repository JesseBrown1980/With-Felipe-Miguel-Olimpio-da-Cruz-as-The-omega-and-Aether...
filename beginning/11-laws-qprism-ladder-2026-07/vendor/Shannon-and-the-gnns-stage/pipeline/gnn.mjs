// gnn plane — role: graph_feed.
// Emits GNN feature vectors per room via Johnson-Lindenstrauss projection
// (graph-feature compression) over the standard envelope metadata vector.

import { createHash } from 'node:crypto';
import { encodeFrame } from '../bpi-codec.mjs';
import { quantMetadata, packQuantPacket, quantTag, vectorFromEnvelope } from '../omniquant.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

let _emitted = 0;
let _lastRoomId = null;

// EWMA-learned routing weights per (plane|kind) edge.
// Key: `${plane}|${kind}` -> { ewma: number in [0,1], updates: int }
// EWMA alpha = 0.3 (responsive but smoothed). Bootstrap prior = 0.5.
const _routingWeights = new Map();
const EWMA_ALPHA = 0.3;
const PRIOR_WEIGHT = 0.5;

// gnnScore: returns learned routing weight in [0,1] for an edge.
// _sha unused at present (deterministic-hash-bound seed slot for future
// per-payload modulation). plane+kind keys the EWMA map. Default-closed:
// unseen edges → PRIOR_WEIGHT (0.5, neutral).
export function gnnScore(_sha, plane, kind) {
  const key = `${plane}|${kind}`;
  const w = _routingWeights.get(key);
  return w && Number.isFinite(w.ewma) ? w.ewma : PRIOR_WEIGHT;
}

// gnnLearn: incorporate an observation (reward in [0,1]) into the EWMA.
// Called by bus.emit() after each dispatch with ok? 1 : 0 (default-closed
// reward = success). Also accepts a continuous reward (e.g. JL similarity).
export function gnnLearn(plane, kind, reward) {
  const key = `${plane}|${kind}`;
  const r = Math.max(0, Math.min(1, Number(reward) || 0));
  const cur = _routingWeights.get(key);
  if (!cur) {
    _routingWeights.set(key, { ewma: PRIOR_WEIGHT * (1 - EWMA_ALPHA) + r * EWMA_ALPHA, updates: 1 });
    return;
  }
  cur.ewma = cur.ewma * (1 - EWMA_ALPHA) + r * EWMA_ALPHA;
  cur.updates++;
}

export function listWeights() {
  const out = {};
  for (const [k, v] of _routingWeights) out[k] = { ewma: Number(v.ewma.toFixed(6)), updates: v.updates };
  return out;
}

export function _resetWeightsForTest() { _routingWeights.clear(); }

export function gnnEmit({ room_id, port_outer, port_inner, elapsed_ms, ok }) {
  const env = {
    room_id,
    port_outer,
    port_inner,
    elapsed_ms,
    stdout_len: 0,
    ok,
    ts_ms: Date.now(),
    job_seq: _emitted,
  };
  // Build vector (fixed-order metadata projection).
  vectorFromEnvelope(env);
  const packet = quantMetadata(env, 'jl');
  const packed = packQuantPacket(packet);
  // Additive quant-bus enrichment (default-closed on empty envelope).
  // NOTE: gnn already projects via JL on the same env; quant-bus should derive
  // identical js_quant if seed canonization holds. Composes additively.
  enrichEnvelope(env);
  const frame = encodeFrame('GNN', [
    room_id,
    packed.bytes.toString('hex'),
    quantTag(packet),
    env.js_quant,
    env.authority_quant,
  ]);
  _emitted++;
  _lastRoomId = room_id;
  return frame;
}

export function state() {
  return {
    plane: 'gnn',
    emitted: _emitted,
    last_room_id: _lastRoomId,
  };
}

export function selfTest() {
  const frame = gnnEmit({
    room_id: 42,
    port_outer: 50042,
    port_inner: 7777,
    elapsed_ms: 1234,
    ok: 1,
  });
  return { ok: true, frame_len: frame.length, emitted: _emitted };
}

// wire(bus): self-register subscriptions when conductor loads this plane.
// Subscribes: gnnEmit. Emits: gnnNeighbor (published on bus when register supports it).
// Defensive no-op if bus is missing or lacks a register() method.
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('gnn', 'gnnEmit', (tuple, _ctx) => {
    const frame = gnnEmit(tuple);
    if (typeof bus.publish === 'function') {
      try { bus.publish('gnnNeighbor', { room_id: tuple && tuple.room_id, frame }); } catch (_) { /* swallow */ }
    }
    return frame;
  });
}
