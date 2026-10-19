// ============================================================================
// Lineage: GNN architecture descendant of Dan Edens' 6-hook bundle
// (Madness Interactive / madnessinteractive.cc / Omnispindle MCP).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// glsm plane — role: latent_state_machine.
// AGT-G4-GLSM-PLANE-PID-2026-05-19, supervisor `livefree` (atlas cp 899).
//
// Closes the OmniMythos GA-SVM / GLSM gap. GLSM holds the latent state across
// emit cycles of the GNN trio (G1 edge-mining, G2 forward-genius, G3 reverse-
// gain) and emits ONE deterministic latent-state transition per cycle.
//
// Transition rule (default-closed — requires all three inputs):
//   prev=DESCRIBED        + edge_weight>0           → EDGE_MINED
//   prev=EDGE_MINED       + path_confidence>=tau_p  → PATH_FOUND
//   prev=PATH_FOUND       + reverse_gain<0          → MISTAKE_FLAGGED   (negative correction)
//   prev=PATH_FOUND       + reverse_gain>=tau_g     → CONVERGED         (positive ratification)
//   prev=MISTAKE_FLAGGED  + path_confidence>=tau_p  → PATH_FOUND        (re-mine on retry)
//   prev=CONVERGED        + any                     → CONVERGED         (absorbing)
//   else                                            → prev              (stay)
//
// Append-only emit. One HBPv1 row per transition. Antecedents carry the
// row-ids of the G1/G2/G3 frames that fed this transition.

import { encodeFrame } from '../bpi-codec.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

export const LATENT_STATES = Object.freeze([
  'DESCRIBED',
  'EDGE_MINED',
  'PATH_FOUND',
  'MISTAKE_FLAGGED',
  'CONVERGED',
]);

// Thresholds — small, deterministic, overridable per call.
const TAU_PATH = 0.5;   // path_confidence ratification cutoff
const TAU_GAIN = 0.5;   // reverse_gain ratification cutoff (positive side)

let _current = 'DESCRIBED';
let _transitions = 0;
let _lastEmitTs = null;
let _emitted = 0;

function isFiniteNum(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

// Pure transition function. No side effects.
export function transition(prev_state, { edge_weight, path_confidence, reverse_gain } = {}) {
  // Default-closed: refuse to transition unless all three inputs are finite numbers.
  if (!LATENT_STATES.includes(prev_state)) return 'DESCRIBED';
  if (!isFiniteNum(edge_weight) || !isFiniteNum(path_confidence) || !isFiniteNum(reverse_gain)) {
    return prev_state;
  }
  if (prev_state === 'CONVERGED') return 'CONVERGED'; // absorbing

  if (prev_state === 'DESCRIBED') {
    return edge_weight > 0 ? 'EDGE_MINED' : 'DESCRIBED';
  }
  if (prev_state === 'EDGE_MINED') {
    return path_confidence >= TAU_PATH ? 'PATH_FOUND' : 'EDGE_MINED';
  }
  if (prev_state === 'PATH_FOUND') {
    if (reverse_gain < 0) return 'MISTAKE_FLAGGED';
    if (reverse_gain >= TAU_GAIN) return 'CONVERGED';
    return 'PATH_FOUND';
  }
  if (prev_state === 'MISTAKE_FLAGGED') {
    return path_confidence >= TAU_PATH ? 'PATH_FOUND' : 'MISTAKE_FLAGGED';
  }
  return prev_state;
}

// Emit one HBPv1 row carrying the transition + antecedent row-ids.
// inputs: { edge_weight, path_confidence, reverse_gain, g1_row, g2_row, g3_row, room_id? }
export function glsmEmit(inputs = {}) {
  const { edge_weight, path_confidence, reverse_gain, g1_row, g2_row, g3_row, room_id } = inputs;
  // Default-closed on antecedents — refuse to emit without all three G1/G2/G3 rows.
  if (g1_row == null || g2_row == null || g3_row == null) {
    return null;
  }
  const prev = _current;
  const next = transition(prev, { edge_weight, path_confidence, reverse_gain });
  // No-op transitions still emit a row (audit trail of the decision) only when
  // state actually changes — append-only chain stays compact and meaningful.
  if (next === prev) {
    return null;
  }

  const env = {
    room_id: room_id == null ? 0 : room_id,
    port_outer: 0,
    port_inner: 0,
    elapsed_ms: 0,
    stdout_len: 0,
    ok: 1,
    ts_ms: Date.now(),
    job_seq: _emitted,
    proof: [String(g1_row), String(g2_row), String(g3_row)],
    authority: ['fabric'],
  };
  enrichEnvelope(env);

  const antecedents = [String(g1_row), String(g2_row), String(g3_row)].join(',');
  const frame = encodeFrame('GLSM', [
    prev,
    next,
    String(edge_weight),
    String(path_confidence),
    String(reverse_gain),
    antecedents,
    env.js_quant,
    env.evidence_quant,
    env.authority_quant,
  ]);

  _current = next;
  _transitions++;
  _lastEmitTs = env.ts_ms;
  _emitted++;
  return frame;
}

export function state() {
  return {
    plane: 'glsm',
    current: _current,
    transitions: _transitions,
    last_emit_ts: _lastEmitTs,
  };
}

// Reset — test-only convenience; not used by the conductor.
export function _reset() {
  _current = 'DESCRIBED';
  _transitions = 0;
  _lastEmitTs = null;
  _emitted = 0;
}

// 5-state canonical walk: DESCRIBED → EDGE_MINED → PATH_FOUND → MISTAKE_FLAGGED → PATH_FOUND → CONVERGED.
export function selfTest() {
  _reset();
  const walk = [
    // (1) DESCRIBED → EDGE_MINED via positive edge weight
    { edge_weight: 0.8, path_confidence: 0.1, reverse_gain: 0.0, expect: 'EDGE_MINED' },
    // (2) EDGE_MINED → PATH_FOUND via path_confidence ≥ tau
    { edge_weight: 0.8, path_confidence: 0.7, reverse_gain: 0.0, expect: 'PATH_FOUND' },
    // (3) PATH_FOUND → MISTAKE_FLAGGED via negative reverse_gain
    { edge_weight: 0.8, path_confidence: 0.7, reverse_gain: -0.3, expect: 'MISTAKE_FLAGGED' },
    // (4) MISTAKE_FLAGGED → PATH_FOUND on re-mine with strong confidence
    { edge_weight: 0.9, path_confidence: 0.9, reverse_gain: 0.1, expect: 'PATH_FOUND' },
    // (5) PATH_FOUND → CONVERGED via positive reverse_gain ≥ tau
    { edge_weight: 0.9, path_confidence: 0.9, reverse_gain: 0.8, expect: 'CONVERGED' },
  ];

  const frames = [];
  const trace = [];
  let row = 1000;
  let ok = true;
  for (const step of walk) {
    const before = _current;
    const f = glsmEmit({
      edge_weight: step.edge_weight,
      path_confidence: step.path_confidence,
      reverse_gain: step.reverse_gain,
      g1_row: row++, g2_row: row++, g3_row: row++,
      room_id: 42,
    });
    const after = _current;
    trace.push({ before, after, expect: step.expect });
    if (after !== step.expect) ok = false;
    if (!f) ok = false;
    frames.push(f);
  }

  // Default-closed assertion: missing antecedent → null emit, no transition.
  _reset();
  const blocked = glsmEmit({ edge_weight: 0.9, path_confidence: 0.9, reverse_gain: 0.9 });
  if (blocked !== null) ok = false;
  if (_current !== 'DESCRIBED') ok = false;

  return {
    ok,
    transitions: trace.length,
    final_state: trace[trace.length - 1].after,
    trace,
    default_closed: blocked === null,
    frame_lens: frames.map((f) => (f ? f.length : 0)),
  };
}

// Bus wiring — defensive no-op if bus is missing register().
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('glsm', 'glsmEmit', (tuple, _ctx) => {
    const frame = glsmEmit(tuple);
    if (frame && typeof bus.publish === 'function') {
      try { bus.publish('glsmTransition', { current: _current, frame }); } catch (_) { /* swallow */ }
    }
    return frame;
  });
}
