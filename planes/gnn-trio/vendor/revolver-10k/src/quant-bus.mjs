// quant-bus.mjs — central quant-enrichment helper for revolver-10k planes.
// AGT-W5-B1-QUANT-BUS-PID-2026-05-19
//
// Wraps omniquant.mjs to attach 6 deterministic quant fields to any envelope
// flowing through B2/B3/B4 planes. Default-closed: if no metadata vector,
// all 4 quant fields are empty strings. evidence_quant/authority_quant are
// new under the Hermes/ARTEMIS amendment (already part of hbp-row schema).
//
// Required fields on enriched envelopes:
//   polar_quant       fp16 sha-tail of polar codes
//   turbo_quant       fp16 sha-tail of turbo codes
//   js_quant          fp16 sha-tail of JL projection
//   triple_quant      fp16 sha-tail of triple-spherical codes
//   evidence_quant    fp16 sha-tail of env.proof (empty if no proof chain)
//   authority_quant   bitmask string over AUTHORITY_FIELDS (default zeros)
//
// All outputs are HBPv1-compatible strings (no JSON-on-wire on output).

import { createHash } from 'node:crypto';
import { quantMetadata, packQuantPacket, vectorFromEnvelope } from './omniquant.mjs';

// Authority bitmask field order — fixed for cross-plane determinism.
// Matches hbp-row v1 schema: 16 slots, default '0000000000000000'.
export const AUTHORITY_FIELDS = [
  'op_jesse',     // 0
  'op_rayssa',    // 1
  'shannon',     // 2
  'hermes',      // 3
  'artemis',     // 4
  'big_pickle',  // 5
  'omniflywheel',// 6
  'omnispindle', // 7
  'connor',      // 8
  'pi',          // 9
  'opencode',    // 10
  'space_deck',  // 11
  'space_agent', // 12
  'foundation',  // 13 (Foundation v1/v2 LAW)
  'quintuple',   // 14 (Jesse+Rayssa+Amy+Dan+Felipe)
  'fabric',      // 15 (delegated fabric authority)
];

const EMPTY_AUTHORITY = '0'.repeat(AUTHORITY_FIELDS.length);

// fp16: 16-hex-char (64-bit) sha256 prefix — a "fp16" tail compatible with
// existing omniquant.fingerprint slicing (which already uses 16 hex chars).
function sha16(input) {
  if (input == null) return '';
  const buf = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(String(input), 'utf8');
  return createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

// Pack a quant packet to bytes and sha16-tail it. Returns '' if packet missing codes.
function quantSha16(packet) {
  if (!packet || !Array.isArray(packet.codes) || packet.codes.length === 0) return '';
  // packQuantPacket handles both nested arrays (triple/polar) and flat arrays (turbo).
  const { bytes } = packQuantPacket(packet);
  return sha16(bytes);
}

// Special case for JL: codes may be absent (projection is the payload).
function jlSha16(packet) {
  if (!packet) return '';
  // engine returns projection as Float32Array/number[]; sha over its byte view.
  const proj = packet.projection || packet.codes;
  if (!proj || (Array.isArray(proj) && proj.length === 0)) return '';
  const arr = proj instanceof Float32Array ? proj : Float32Array.from(proj);
  return sha16(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
}

// Does the envelope carry a usable metadata vector?
// We treat it as "no vector" iff every standard meta field is missing/zero.
function hasMetadataVector(env) {
  if (!env || typeof env !== 'object') return false;
  const vec = vectorFromEnvelope(env);
  return vec.some((x) => Number.isFinite(x) && x !== 0);
}

// Build evidence_quant from env.proof chain.
// Accepts: string | array | object — sha16 of canonical byte view.
function evidenceQuant(env) {
  const proof = env && env.proof;
  if (proof == null) return '';
  if (typeof proof === 'string') return proof.length === 0 ? '' : sha16(proof);
  if (Buffer.isBuffer(proof) || proof instanceof Uint8Array) return sha16(proof);
  // Array of receipts or object — stable stringify (sorted keys, no JSON-on-wire output
  // since the result is only a sha tail, not the JSON itself).
  return sha16(stableStringify(proof));
}

// Build authority_quant bitmask from env.authority (object or array).
function authorityQuant(env) {
  const auth = env && env.authority;
  if (!auth) return EMPTY_AUTHORITY;
  const bits = new Array(AUTHORITY_FIELDS.length).fill('0');
  if (Array.isArray(auth)) {
    for (const name of auth) {
      const i = AUTHORITY_FIELDS.indexOf(String(name));
      if (i >= 0) bits[i] = '1';
    }
  } else if (typeof auth === 'object') {
    for (let i = 0; i < AUTHORITY_FIELDS.length; i++) {
      if (auth[AUTHORITY_FIELDS[i]]) bits[i] = '1';
    }
  }
  return bits.join('');
}

// Deterministic stable stringify (sorted keys). Used ONLY for sha-input, never on wire.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

// ─── GNN trio + GLSM lazy module cache ───────────────────────────────────────
// Lazy-loaded to avoid circular-import races (G1/G2/G4 import enrichEnvelope
// from this file). Modules are resolved on first opt-in call only.
let _gnnTrioModules = null;
let _gnnTrioLoadAttempted = false;
async function _loadGnnTrio() {
  if (_gnnTrioModules || _gnnTrioLoadAttempted) return _gnnTrioModules;
  _gnnTrioLoadAttempted = true;
  const out = { g1: null, g2: null, g3: null, g4: null };
  try { out.g1 = await import('./planes/gnn-edge-mining.mjs'); } catch (_) { /* default-closed */ }
  try { out.g2 = await import('./planes/gnn-forward-genius.mjs'); } catch (_) { /* default-closed */ }
  try { out.g3 = await import('./planes/gnn-reverse-gain.mjs'); } catch (_) { /* default-closed */ }
  try { out.g4 = await import('./planes/glsm.mjs'); } catch (_) { /* default-closed */ }
  _gnnTrioModules = out;
  return out;
}

// Synchronous-context cache for already-resolved modules so the trio path can
// stay sync once warmed (kicked by warmGnnTrio() ahead of selfTest / hot loop).
export async function warmGnnTrio() { return _loadGnnTrio(); }

// Attach the 4 GNN-trio + GLSM fields, default-closed on any failure.
// Uses module cache already warmed via warmGnnTrio() (sync best-effort).
function _enrichGnnTrioSync(env) {
  env.gnn_edge_quant    = '';
  env.gnn_forward_quant = '';
  env.gnn_reverse_quant = '';
  env.glsm_state        = '';
  const mods = _gnnTrioModules;
  if (!mods) return env; // not warmed — default-closed
  // G1: edge_weight (also exposes edge_quant tail)
  let edge_weight = null;
  if (mods.g1 && typeof mods.g1.mineEdge === 'function') {
    try {
      const e = mods.g1.mineEdge(env);
      if (e && typeof e.weight === 'number' && Number.isFinite(e.weight)) {
        edge_weight = e.weight;
        env.gnn_edge_quant = e.edge_quant
          ? sha16(`${e.weight.toFixed(6)}|${e.edge_quant}`)
          : sha16(e.weight.toFixed(6));
      }
    } catch (_) { /* default-closed */ }
  }
  // G2: path_score (mean of single-element path)
  let path_score = null;
  if (mods.g2 && typeof mods.g2.mineForward === 'function') {
    try {
      const r = mods.g2.mineForward([env]);
      if (r && Array.isArray(r.paths) && r.paths.length > 0) {
        const top = r.paths[0];
        if (typeof top.score === 'number' && Number.isFinite(top.score)) {
          path_score = top.score;
          env.gnn_forward_quant = r.genius_quant && /^[0-9a-f]{16}$/.test(r.genius_quant)
            ? r.genius_quant
            : sha16(top.score.toFixed(6));
        }
      }
    } catch (_) { /* default-closed */ }
  }
  // G3: reverse_gain (sign * jl_distance)
  let reverse_gain = null;
  if (mods.g3 && typeof mods.g3.mineReverseGain === 'function') {
    try {
      const r = mods.g3.mineReverseGain(env);
      if (r && typeof r.score === 'number' && Number.isFinite(r.score)) {
        reverse_gain = r.score;
        env.gnn_reverse_quant = sha16(`${r.sign}|${r.score.toFixed(6)}|${r.glyph || ''}`);
      }
    } catch (_) { /* default-closed */ }
  }
  // G4: transition from env.glsm_prev_state (default DESCRIBED)
  if (mods.g4 && typeof mods.g4.transition === 'function') {
    try {
      const prev = typeof env.glsm_prev_state === 'string' && env.glsm_prev_state
        ? env.glsm_prev_state
        : 'DESCRIBED';
      // Pure transition — only fires when all three inputs finite; else returns prev.
      const next = mods.g4.transition(prev, {
        edge_weight:    edge_weight    == null ? NaN : edge_weight,
        path_confidence: path_score    == null ? NaN : path_score,
        reverse_gain:   reverse_gain   == null ? NaN : reverse_gain,
      });
      if (typeof next === 'string' && next.length > 0) env.glsm_state = next;
    } catch (_) { /* default-closed */ }
  }
  return env;
}

// Main export: enrich an envelope in-place-ish (returns same object, mutated).
// opts.gnn_trio=true → ADDITIVELY attaches gnn_edge_quant / gnn_forward_quant /
// gnn_reverse_quant / glsm_state. Default false = no behavior change.
export function enrichEnvelope(env, opts) {
  if (!env || typeof env !== 'object') {
    throw new TypeError('enrichEnvelope: env must be an object');
  }
  const hasVec = hasMetadataVector(env);
  if (hasVec) {
    try {
      const polar  = quantMetadata(env, 'polar');
      const turbo  = quantMetadata(env, 'turbo');
      const jl     = quantMetadata(env, 'jl');
      const triple = quantMetadata(env, 'triple');
      env.polar_quant  = quantSha16(polar);
      env.turbo_quant  = quantSha16(turbo);
      env.js_quant     = jlSha16(jl);
      env.triple_quant = quantSha16(triple);
    } catch (_err) {
      // Default-closed on engine failure too.
      env.polar_quant  = '';
      env.turbo_quant  = '';
      env.js_quant     = '';
      env.triple_quant = '';
    }
  } else {
    env.polar_quant  = '';
    env.turbo_quant  = '';
    env.js_quant     = '';
    env.triple_quant = '';
  }
  env.evidence_quant  = evidenceQuant(env);
  env.authority_quant = authorityQuant(env);
  if (opts && opts.gnn_trio === true) {
    _enrichGnnTrioSync(env);
  }
  // 5th-quant pass-through: if env.mtp_tokens is present (already produced by the
  // mtp plane via geometricQuant), attach a deterministic sha16 tail as mtp_quant.
  // Default-closed: missing/empty tokens → ''.
  if (Array.isArray(env.mtp_tokens) && env.mtp_tokens.length > 0) {
    env.mtp_quant = sha16(env.mtp_tokens.join('|'));
  } else {
    env.mtp_quant = '';
  }
  return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test: 3 sample envelopes, assert deterministic + roundtrip + default-closed.
// opts.gnn_trio=true → additionally exercises G1/G2/G3/G4 wiring path.
export async function selfTest(opts = {}) {
  if (opts && opts.gnn_trio === true) {
    await warmGnnTrio();
  }
  const sampleA = {
    room_id: 42, port_outer: 50042, port_inner: 7777,
    elapsed_ms: 1234, stdout_len: 256, ok: 1, ts_ms: 1715000000000, job_seq: 99,
    proof: ['receipt-A', 'cosign-row-126'],
    authority: { op_jesse: true, shannon: true, hermes: true },
  };
  const sampleB = {
    room_id: 7, port_outer: 50007, port_inner: 7000,
    elapsed_ms: 50, stdout_len: 8, ok: 1, ts_ms: 1715000001000, job_seq: 100,
    // No proof, no authority — exercises defaults on those two fields only.
  };
  const sampleC = {
    // Truly empty metadata — default-closed path on all 4 quant fields.
    proof: '',
    authority: ['quintuple', 'fabric'],
  };

  const a1 = enrichEnvelope({ ...sampleA }, opts);
  const a2 = enrichEnvelope({ ...sampleA }, opts);
  const b1 = enrichEnvelope({ ...sampleB }, opts);
  const c1 = enrichEnvelope({ ...sampleC }, opts);

  const determinism = (
    a1.polar_quant === a2.polar_quant &&
    a1.turbo_quant === a2.turbo_quant &&
    a1.js_quant === a2.js_quant &&
    a1.triple_quant === a2.triple_quant &&
    a1.evidence_quant === a2.evidence_quant &&
    a1.authority_quant === a2.authority_quant
  );

  // Roundtrip: enriching the already-enriched object again must yield identical fields.
  const a3 = enrichEnvelope({ ...a1 }, opts);
  const roundtrip = (
    a3.polar_quant === a1.polar_quant &&
    a3.turbo_quant === a1.turbo_quant &&
    a3.js_quant === a1.js_quant &&
    a3.triple_quant === a1.triple_quant &&
    a3.evidence_quant === a1.evidence_quant &&
    a3.authority_quant === a1.authority_quant
  );

  // Default-closed assertions on sampleC (no vector).
  const defaultClosed = (
    c1.polar_quant === '' &&
    c1.turbo_quant === '' &&
    c1.js_quant === '' &&
    c1.triple_quant === '' &&
    c1.evidence_quant === '' &&     // empty-string proof → empty
    c1.authority_quant !== EMPTY_AUTHORITY  // ['quintuple','fabric'] set
  );

  // sampleB has vector but no proof/authority → quant fields populated, evidence='', authority=zeros.
  const partialDefaults = (
    b1.polar_quant !== '' &&
    b1.evidence_quant === '' &&
    b1.authority_quant === EMPTY_AUTHORITY
  );

  // Format checks: fp16 = 16 hex chars; authority = AUTHORITY_FIELDS.length chars of 0/1.
  const formatOk = (
    /^[0-9a-f]{16}$/.test(a1.polar_quant) &&
    /^[0-9a-f]{16}$/.test(a1.turbo_quant) &&
    /^[0-9a-f]{16}$/.test(a1.js_quant) &&
    /^[0-9a-f]{16}$/.test(a1.triple_quant) &&
    /^[0-9a-f]{16}$/.test(a1.evidence_quant) &&
    new RegExp(`^[01]{${AUTHORITY_FIELDS.length}}$`).test(a1.authority_quant)
  );

  // GNN-trio assertions (only when opts.gnn_trio=true).
  let gnnTrioOk = true;
  let gnnTrioFields = null;
  if (opts && opts.gnn_trio === true) {
    gnnTrioFields = {
      gnn_edge_quant:    a1.gnn_edge_quant,
      gnn_forward_quant: a1.gnn_forward_quant,
      gnn_reverse_quant: a1.gnn_reverse_quant,
      glsm_state:        a1.glsm_state,
    };
    // All 4 fields must be present on a1 (vector-bearing sample).
    gnnTrioOk = (
      typeof a1.gnn_edge_quant === 'string' && a1.gnn_edge_quant.length > 0 &&
      typeof a1.gnn_forward_quant === 'string' && a1.gnn_forward_quant.length > 0 &&
      typeof a1.gnn_reverse_quant === 'string' && a1.gnn_reverse_quant.length > 0 &&
      typeof a1.glsm_state === 'string' && a1.glsm_state.length > 0
    );
  } else {
    // Backward-compat: without opt-in, gnn_* fields must NOT be attached.
    gnnTrioOk = (
      a1.gnn_edge_quant === undefined &&
      a1.gnn_forward_quant === undefined &&
      a1.gnn_reverse_quant === undefined &&
      a1.glsm_state === undefined
    );
  }

  return {
    ok: determinism && roundtrip && defaultClosed && partialDefaults && formatOk && gnnTrioOk,
    determinism,
    roundtrip,
    default_closed: defaultClosed,
    partial_defaults: partialDefaults,
    format_ok: formatOk,
    gnn_trio_ok: gnnTrioOk,
    gnn_trio_fields: gnnTrioFields,
    samples: {
      A: {
        polar_quant: a1.polar_quant,
        turbo_quant: a1.turbo_quant,
        js_quant: a1.js_quant,
        triple_quant: a1.triple_quant,
        evidence_quant: a1.evidence_quant,
        authority_quant: a1.authority_quant,
      },
      B: {
        polar_quant: b1.polar_quant,
        evidence_quant: b1.evidence_quant,
        authority_quant: b1.authority_quant,
      },
      C: {
        polar_quant: c1.polar_quant,
        evidence_quant: c1.evidence_quant,
        authority_quant: c1.authority_quant,
      },
    },
  };
}
