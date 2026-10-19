import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { simulateInterferometer } from './qprism-simulator.mjs';
import { classicalSchedule, randomSchedule } from './qprism-control-policy.mjs';

export const QUANT_TUPLE_DIM = 1024;
export const QUANT_TUPLE_BYTES = 3200;
export const DEFAULT_OUT_DIR = 'D:/qprism-data/spanishbcbl-quant-probe';
export const ASOLARIA_QUANT_ANCHOR = Object.freeze({
  tool: 'ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant-huge-message-benchmark.mjs',
  tupleDim: 1024,
  tupleBytes: 3200,
  law: 'head-O(size)-paid-once_tail-O(1)-per-consumer',
  boundary: 'referential_control_tuple_not_raw_reconstruction_not_gate_proof',
  evidence: 'MEASURED_LOCAL_ARTIFACT_PLUS_FRESH_LIRIS_BOUNDED_RERUN',
});

export const SPANISHBCBL_CARD_FACTS = Object.freeze({
  dataset: 'bcbl190626/SpanishBCBL',
  title: 'DECOMEG - Brain Activity During Typing (MEG & EEG)',
  license: 'CC-BY-NC-4.0',
  task: 'read -> wait -> type Spanish sentences from memory',
  participants_total: 35,
  meg_unique_participants_after_merge_excluding_s23: 19,
  repeated_meg_subjects: [['S1', 'S18'], ['S4', 'S14'], ['S5', 'S10', 'S21']],
  excluded_meg_subject: 'S23',
  sentences_per_session: 128,
  sentence_words: '5-8',
  meg_sentences_approx: 5100,
  meg_characters_approx: 193000,
  eeg_sentences_approx: 4000,
  eeg_characters_approx: 146000,
  meg_total_typing_hours_approx: 21.5,
  eeg_total_typing_hours_approx: 17.7,
  meg_channels: 306,
  eeg_channels: 64,
  sampling_hz: 1000,
  public_size_gb_card: 262,
  public_size_gb_hf_display: 280,
  raw_in_repo: 0,
  derived_only: 1,
});

const PPOW = (() => {
  const t = new Uint8Array(QUANT_TUPLE_DIM);
  const isPrime = (n) => {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
    return true;
  };
  for (let n = 2; n < QUANT_TUPLE_DIM; n += 1) {
    if (isPrime(n)) {
      t[n] = 1;
      continue;
    }
    for (let p = 2; p * p <= n; p += 1) {
      if (!isPrime(p)) continue;
      let m = n;
      let k = 0;
      while (m % p === 0) {
        m /= p;
        k += 1;
      }
      if (m === 1) {
        t[n] = k > 3 ? 5 : k + 1;
        break;
      }
    }
  }
  return t;
})();

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function canonicalMetadataText(extra = {}) {
  const facts = { ...SPANISHBCBL_CARD_FACTS, ...extra };
  const rows = [
    'QPRISM_SPANISHBCBL_SOURCE|schema=qprism.spanishbcbl.source.v1',
    ...Object.entries(facts).map(([key, value]) => `${key}=${Array.isArray(value) ? JSON.stringify(value) : value}`),
    'boundary=metadata_card_probe_not_raw_neural_data',
    'raw_in_repo=0',
    'json=0',
  ];
  return rows.join('|');
}

export function quant8Bytes(bytes) {
  const proj = new Float64Array(QUANT_TUPLE_DIM);
  for (let i = 0; i < bytes.length; i += 1) {
    const h = (i * 2654435761) >>> 0;
    proj[h & (QUANT_TUPLE_DIM - 1)] += (h & 0x80000000) ? -bytes[i] : bytes[i];
  }
  let max = 1e-12;
  for (let j = 0; j < QUANT_TUPLE_DIM; j += 1) {
    const a = Math.abs(proj[j]);
    if (a > max) max = a;
  }
  const turbo = new Int8Array(QUANT_TUPLE_DIM);
  const signs = new Uint8Array(QUANT_TUPLE_DIM >> 3);
  const zeta = new Uint8Array(QUANT_TUPLE_DIM);
  const hist = new Uint32Array(256);
  let vmAcc = 0;
  for (let j = 0; j < QUANT_TUPLE_DIM; j += 1) {
    const v = proj[j] / max;
    const q = Math.round(v * 127);
    turbo[j] = q;
    if (v < 0) signs[j >> 3] |= (1 << (j & 7));
    const a = Math.abs(v);
    zeta[j] = a < 1e-9 ? 15 : Math.min(15, -Math.log2(a) | 0);
    hist[(q + 128) & 255] += 1;
    if (q !== 0) vmAcc += PPOW[j];
  }
  return { turbo, signs, zeta, hist, vmAcc, scale: max };
}

export function tupleBuffer(q) {
  return Buffer.concat([
    Buffer.from(q.turbo.buffer),
    Buffer.from(q.signs.buffer),
    Buffer.from(q.zeta.buffer),
    Buffer.from(q.hist.buffer),
  ]);
}

export function scheduleFromTuple(tuple, steps = 32) {
  return Array.from({ length: steps }, (_, step) => {
    const base = (step * 11) % (tuple.length - 2);
    const c0 = centeredUnit(tuple, base);
    const c1 = centeredUnit(tuple, base + 2);
    const c2 = centeredUnit(tuple, base + 4);
    const u0 = unit(tuple, base + 6);
    const u1 = unit(tuple, base + 8);
    return {
      step,
      p2Mw: clamp(15.2 + c0 * 5.5, 1, 60),
      velocityCenterMps: clamp(160 + c1 * 26, 70, 250),
      velocityHalfWidthMps: clamp(7 + u0 * 24, 3, 90),
      massCenterKDa: clamp(172 + c2 * 18, 118, 226),
      massHalfWidthKDa: clamp(5 + u1 * 18, 2, 54),
      analysisWindow: clamp(0.62 + unit(tuple, base + 10) * 0.18, 0.35, 0.95),
    };
  });
}

export function buildProbe(extra = {}) {
  const sourceText = canonicalMetadataText(extra);
  const sourceBytes = Buffer.from(sourceText, 'utf8');
  const quant = quant8Bytes(sourceBytes);
  const tuple = tupleBuffer(quant);
  const schedule = scheduleFromTuple(tuple, 32);
  const derived = simulateInterferometer({}, schedule);
  const classical = simulateInterferometer({}, classicalSchedule(32));
  const random = simulateInterferometer({}, randomSchedule('spanishbcbl-quant-probe', 32));
  const tupleHash = sha256(tuple);
  const sourceHash = sha256(sourceBytes);
  const ledgerRow = [
    'QPRISM_SPANISHBCBL_QUANT_PROBE',
    'schema=qprism.spanishbcbl.quant_probe.v1',
    'source=hf-card-metadata-operator-provided-through-asolaria-quant-tail-probe',
    'quant_anchor=ASOLARIA_QUANT8_HUGE_MESSAGE_BENCH',
    `quant_law=${ASOLARIA_QUANT_ANCHOR.law}`,
    `quant_boundary=${ASOLARIA_QUANT_ANCHOR.boundary}`,
    `source_sha256=${sourceHash}`,
    `tuple_sha256=${tupleHash}`,
    `payload_bytes=${sourceBytes.length}`,
    `tuple_bytes=${tuple.length}`,
    `tuple_dim=${QUANT_TUPLE_DIM}`,
    `score_quant=${round(derived.score)}`,
    `score_classical=${round(classical.score)}`,
    `score_random=${round(random.score)}`,
    `quant_minus_classical=${round(derived.score - classical.score)}`,
    'raw_in_repo=0',
    'derived_only=1',
    'license=CC-BY-NC-4.0',
    'claim=metadata_prior_not_neural_decode',
    'evidence=MEASURED_LOCAL_DERIVED',
    'json=0',
  ].join('|');
  return { sourceText, sourceBytes, quant, tuple, schedule, derived, classical, random, ledgerRow, sourceHash, tupleHash };
}

export function writeProbe(outDir = DEFAULT_OUT_DIR, extra = {}) {
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  const probe = buildProbe(extra);
  writeFileSync(join(out, 'spanishbcbl-source-metadata.hbp'), `${probe.sourceText}\n`);
  writeFileSync(join(out, 'spanishbcbl-quant-tuple.bin'), probe.tuple);
  writeFileSync(join(out, 'spanishbcbl-quant-receipt.hbp'), `${probe.ledgerRow}\n`);
  writeFileSync(join(out, 'spanishbcbl-quant-schedule.hbp'), scheduleRows(probe).join('\n') + '\n');
  return { outDir: out, ...probe };
}

function scheduleRows(probe) {
  const rows = [
    `QPRISM_SPANISHBCBL_SCHEDULE_HDR|steps=${probe.schedule.length}|tuple_sha256=${probe.tupleHash}|raw_in_repo=0|json=0`,
  ];
  for (const s of probe.schedule.slice(0, 8)) {
    rows.push(`QPRISM_SPANISHBCBL_SCHEDULE|step=${s.step}|p2Mw=${round(s.p2Mw)}|velocityCenterMps=${round(s.velocityCenterMps)}|velocityHalfWidthMps=${round(s.velocityHalfWidthMps)}|massCenterKDa=${round(s.massCenterKDa)}|massHalfWidthKDa=${round(s.massHalfWidthKDa)}|analysisWindow=${round(s.analysisWindow)}|json=0`);
  }
  rows.push('QPRISM_SPANISHBCBL_SCHEDULE_FTR|shown_steps=8|full_schedule_reproducible_from_tuple=1|json=0');
  return rows;
}

function unit(tuple, offset) {
  const i = offset % (tuple.length - 1);
  return tuple.readUInt16LE(i) / 65535;
}

function centeredUnit(tuple, offset) {
  return unit(tuple, offset) * 2 - 1;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v) {
  return Math.round(v * 1_000_000) / 1_000_000;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const outArg = process.argv.find((arg) => arg.startsWith('--out='));
  const outDir = outArg ? outArg.slice('--out='.length) : DEFAULT_OUT_DIR;
  const probe = writeProbe(outDir);
  console.log(probe.ledgerRow);
  console.log(`QPRISM_SPANISHBCBL_QUANT_FILES|out=${probe.outDir}|tuple_bytes=${probe.tuple.length}|receipt=spanishbcbl-quant-receipt.hbp|json=0`);
}
