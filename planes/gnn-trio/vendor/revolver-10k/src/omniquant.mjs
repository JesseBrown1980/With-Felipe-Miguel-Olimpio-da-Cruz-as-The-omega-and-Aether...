// Omniquant adapter — wraps the existing HyperBEHCS engine at C:\HyperBEHCS\lib\hyperbehcs-core.cjs.
// Provides triple quant (Polar + Turbo + JS Johnson-Lindenstrauss) over numerical vectors.
//
// Usage:
//   import { quantMetadata, packQuantPacket } from './omniquant.mjs';
//   const q = quantMetadata({ room_id: 42, elapsed_ms: 1234, ... }, 'triple');
//   const compact = packQuantPacket(q);  // Buffer-ready compact binary form
//
// Engine is CJS; we use createRequire to interop from ESM.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const ENGINE_PATH = process.env.HYPERBEHCS_CORE || 'C:/HyperBEHCS/lib/hyperbehcs-core.cjs';
let _engine = null;
function engine() {
  if (!_engine) _engine = require(ENGINE_PATH);
  return _engine;
}

// Convert envelope numerical metadata → vector. Ordering is FIXED so consumers can decode.
const META_FIELDS = ['room_id', 'port_outer', 'port_inner', 'elapsed_ms', 'stdout_len', 'ok', 'ts_ms', 'job_seq'];

export function vectorFromEnvelope(env) {
  return META_FIELDS.map((k) => Number(env[k] ?? 0));
}

// Quant a metadata vector using the chosen mode. Returns the engine packet.
//   mode: 'triple' (3D spherical) | 'polar' (2D pair) | 'turbo' (uniform) | 'jl' (Johnson-Lindenstrauss)
export function quantMetadata(env, mode = 'triple', options = {}) {
  const e = engine();
  const vec = vectorFromEnvelope(env);
  switch (mode) {
    case 'triple': return e.tripleQuant(vec, { bits: options.bits || 8, ...options });
    case 'polar':  return e.polarQuant(vec,  { bits: options.bits || 8, ...options });
    case 'turbo':  return e.turboQuant(vec,  { bits: options.bits || 8, ...options });
    case 'jl':     return e.johnsonLindenstrauss(vec, { seed: 'revolver-10k', ...options });
    default: throw new Error(`unknown quant mode: ${mode}`);
  }
}

// Pack a quant packet's codes into compact bytes. For triple/polar quant the codes are
// arrays of small ints (≤ 8 bits each at default bits=8); we lay them out byte-per-component.
// Returns { fingerprint, algorithm, bytes (Buffer) }.
export function packQuantPacket(packet) {
  const { algorithm, codes = [], fingerprint } = packet;
  const flat = [];
  for (const c of codes) {
    if (Array.isArray(c)) flat.push(...c);
    else flat.push(c);
  }
  return { algorithm, fingerprint, bytes: Buffer.from(Uint8Array.from(flat)) };
}

// Hex tag for inclusion in BPI frames: "QT:<algo-short>:<fp16>:<n>"
export function quantTag(packet) {
  const algoShort = packet.algorithm.split('.')[0].replace(/[^a-z0-9]+/g, '').slice(0, 12);
  const fp = (packet.fingerprint || '').slice(0, 8);
  const n = Array.isArray(packet.codes) ? packet.codes.length : 0;
  return `QT:${algoShort}:${fp}:${n}`;
}

// Self-test
export function selfTest() {
  const env = { room_id: 42, port_outer: 50042, port_inner: 7777, elapsed_ms: 1234, stdout_len: 256, ok: 1, ts_ms: Date.now(), job_seq: 99 };
  const triple = quantMetadata(env, 'triple');
  const polar  = quantMetadata(env, 'polar');
  const turbo  = quantMetadata(env, 'turbo');
  const jl     = quantMetadata(env, 'jl');
  const packed = packQuantPacket(triple);
  return {
    ok: true,
    triple_algo: triple.algorithm,
    polar_algo:  polar.algorithm,
    turbo_algo:  turbo.algorithm,
    jl_algo:     jl.algorithm,
    raw_vector_floats: META_FIELDS.length,
    raw_bytes_f64:     META_FIELDS.length * 8,
    packed_bytes:      packed.bytes.length,
    tag:               quantTag(triple),
    fp:                triple.fingerprint,
  };
}
