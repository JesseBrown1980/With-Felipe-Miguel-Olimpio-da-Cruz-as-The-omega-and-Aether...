// Fabric thinker — the LIGHTWEIGHT inference path.
//
// Spec: project_asolaria_fabric_already_built_use_existing.md
//       operator-directive 2026-05-25 "Should be USING OUR models and
//       supervisors not the heavy stuff"
//
// Uses:
//   - OUR PID supervisor index (Asolaria PID fabric)
//   - Descriptor-style inference (deterministic from PID+query, no LLM)
//   - Brown-Hilbert 3D coord per outcome
//   - durableNotify combo (cosign log + redis notify) for outcome routing
//
// Throughput target: matches old-system 380k logical thoughts/sec via
//   PID routing + hookwall + GNN, NOT via heavy LLM calls.
//
// Pure functions where possible; HTTP-IO only at the explicit "fire" call.

import crypto from 'node:crypto';
import fs from 'node:fs';
import { hilbertEncode } from './hilbert.mjs';

// === Default supervisor PID index location (acer-vantage) =================
// Empirical 2026-05-25: /c/Users/acer/Asolaria/data/behcs/pid-fabric/index/
// contains supervisor-pid-indicator-index-latest.json (~163KB).

const DEFAULT_PID_INDEX_PATH = 'C:/Users/acer/Asolaria/data/behcs/pid-fabric/index/supervisor-pid-indicator-index-latest.json';

// === Pure: PID supervisor list parsing ====================================

export function parsePidIndex(jsonText) {
  let raw;
  try { raw = JSON.parse(jsonText); }
  catch (e) { throw new SyntaxError(`fabric-thinker.parsePidIndex: parse fail - ${e.message}`); }
  // Accept either array shape or {records:[...]} or {pids:[...]} or {indicators:[...]}
  const list =
    Array.isArray(raw) ? raw :
    Array.isArray(raw.records) ? raw.records :
    Array.isArray(raw.pids) ? raw.pids :
    Array.isArray(raw.indicators) ? raw.indicators :
    Object.values(raw).find((v) => Array.isArray(v)) ?? [];
  return list.map(normalizePidEntry).filter(Boolean);
}

function normalizePidEntry(entry) {
  if (typeof entry === 'string') return { pid: entry, role: 'supervisor' };
  if (!entry || typeof entry !== 'object') return null;
  // Accept explicit pid/id/name/indicator, OR setId (meta-index shape from
  // supervisor-pid-indicator-index where each set represents a supervisor family).
  const pid = entry.pid ?? entry.id ?? entry.name ?? entry.indicator ?? entry.setId ?? null;
  if (!pid) return null;
  return {
    pid: String(pid),
    role: entry.role ?? entry.type ?? (entry.setId ? 'supervisor_set' : 'supervisor'),
    cube: entry.cube ?? null,
    glyph: entry.glyph ?? null,
    tuple_key: entry.tupleKey ?? entry.tuple_key ?? null,
    layer: entry.layer ?? entry.L ?? null,
    supervisor_count: entry.supervisorCount ?? null,
    source_file: entry.sourceFile ?? null,
  };
}

export function loadPidIndex(path) {
  const p = path ?? DEFAULT_PID_INDEX_PATH;
  if (!fs.existsSync(p)) {
    return { ok: false, reason: 'pid_index_missing', path: p };
  }
  const txt = fs.readFileSync(p, 'utf8');
  const list = parsePidIndex(txt);
  return { ok: true, path: p, count: list.length, supervisors: list };
}

// === Pure: descriptor inference (deterministic, no LLM) ==================

export function descriptorInfer(pid, query, opts = {}) {
  if (typeof pid !== 'string' || !pid) {
    throw new TypeError('fabric-thinker.descriptorInfer: pid must be non-empty string');
  }
  if (typeof query !== 'string') {
    throw new TypeError('fabric-thinker.descriptorInfer: query must be string');
  }
  const seed = crypto.createHash('sha256').update(`${pid}|${query}`).digest();
  // Confidence derived from sha — deterministic, bounded [0, 1].
  const confidence = seed.readUInt32BE(0) / 0xffffffff;
  // BH 3D coord — derive cp from sha, clamp [2, 1023], map via hilbertEncode
  const cp = 2 + (seed.readUInt16BE(4) % 1022);
  const bh3d = hilbertEncode(
    [(cp >> 0) & 0xf, (cp >> 4) & 0xf, (cp >> 8) & 0x3],
    { dimensions: 3, bits: 4 }
  );
  // Verdict glyph (16-hex)
  const verdict = seed.toString('hex').slice(0, 16);
  return {
    algorithm: 'fabric-thinker-descriptor.v1',
    pid,
    query_sha8: crypto.createHash('sha256').update(query).digest('hex').slice(0, 8),
    confidence,
    cp,
    bh_3d_idx: bh3d,
    verdict_glyph: verdict,
    path: confidence >= 0.5 ? 'HIT' : 'FALLBACK',
    descriptor_only: true,
    ts_iso: opts.ts_iso ?? new Date().toISOString(),
  };
}

// === Pure: batch helpers ==================================================

export function thinkBatch(pidList, queryFn, opts = {}) {
  if (!Array.isArray(pidList)) {
    throw new TypeError('fabric-thinker.thinkBatch: pidList must be array');
  }
  if (typeof queryFn !== 'function') {
    throw new TypeError('fabric-thinker.thinkBatch: queryFn must be function (pid, i) => string');
  }
  const t0 = Date.now();
  const outcomes = pidList.map((entry, i) => {
    const pid = typeof entry === 'string' ? entry : entry.pid;
    const query = queryFn(entry, i);
    return descriptorInfer(pid, query, opts);
  });
  const elapsed_ms = Date.now() - t0;
  const hits = outcomes.filter((o) => o.path === 'HIT').length;
  return {
    algorithm: 'fabric-thinker-batch.v1',
    count: outcomes.length,
    hits,
    hit_rate: outcomes.length > 0 ? hits / outcomes.length : 0,
    elapsed_ms,
    ops_per_sec: outcomes.length > 0 ? outcomes.length / (elapsed_ms / 1000) : 0,
    outcomes,
  };
}

// === IO: fire batch via durableNotify combo ==============================

export async function fireBatch(pidList, queryFn, redisBridge, durableNotifyFn, opts = {}) {
  if (!redisBridge || typeof redisBridge.publish !== 'function') {
    throw new TypeError('fabric-thinker.fireBatch: redisBridge must expose publish');
  }
  if (typeof durableNotifyFn !== 'function') {
    throw new TypeError('fabric-thinker.fireBatch: durableNotifyFn must be cosign-bridge.durableNotify');
  }
  const channel = opts.channel ?? 'omni-asolaria/acer/fabric/thinker';
  const batch = thinkBatch(pidList, queryFn, opts);
  const seals = [];
  let fails = 0;
  for (const outcome of batch.outcomes) {
    try {
      const r = await durableNotifyFn(channel, {
        event: 'fabric-think',
        vantage: 'acer',
        pid: outcome.pid,
        confidence: outcome.confidence,
        cp: outcome.cp,
        bh_3d_idx: outcome.bh_3d_idx,
        verdict: outcome.verdict_glyph,
        path: outcome.path,
      }, redisBridge);
      seals.push({ pid: outcome.pid, cosign_seq: r.cosign.seq, subscribers: r.publish.subscribers });
    } catch (e) {
      fails++;
      seals.push({ pid: outcome.pid, error: String(e?.message || e) });
    }
  }
  return {
    algorithm: 'fabric-thinker-fire-batch.v1',
    batch_stats: { count: batch.count, hits: batch.hits, hit_rate: batch.hit_rate, descriptor_elapsed_ms: batch.elapsed_ms },
    seals,
    fail_count: fails,
    fail_rate: batch.count > 0 ? fails / batch.count : 0,
  };
}

// === Status / honest gaps ================================================

export const STATUS = Object.freeze({
  schema: 'fabric-thinker.v1',
  primary_path: true,
  uses: ['Asolaria PID supervisor index', 'descriptor inference (deterministic)', 'Brown-Hilbert 3D coord', 'durableNotify (cosign + redis)'],
  does_not_use: ['heavy external LLM', 'Gemma 4B inference per call', 'subprocess spawn per PID'],
  default_pid_index_path: DEFAULT_PID_INDEX_PATH,
  honest_gaps: [
    'Descriptor confidence is sha-derived, not real model output. Top-K accuracy is tautological with the seed.',
    'No verifier pass (drafter+verifier shim would be future work).',
    'For real model inference: see deferred gemma-bridge.mjs (operator-witness gate).',
    'BH 3D coord uses bits=4 dimensions=3 → max idx 4095. CP space is [2, 1023] so coord uses lower bits well.',
  ],
});
