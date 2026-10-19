#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { quant8, D } from './quant-huge-message-benchmark.mjs';

// QUANT8 JL fidelity sweep -- implements QUANTFIDELITYSPEC8-2026-06-11.hbp as
// patched by liris (c4be2bd/2b807ea): absolute cosine error (relative is
// ill-defined at rho=0), 50 pairs/cell = PILOT grade only (promotion needs
// >=200), f4 split into same-sign collision (f4a) and opposite-sign
// cancellation (f4b), JL 1/sqrt(D) treated as heuristic reference, all output
// rounded fixed-6 before HBP emission so rows byte-match across machines.
// Metric path is mult-add only (no Math.log2): deterministic cross-machine.
// Triplet construction for ranking preservation is FIXED at mix 0.8 vs 0.5
// for every cell (documented constant; liris contest welcome) with the raw
// cosine margin >= 0.1 qualification filter from the spec. A cell with zero
// qualified triplets is a coverage failure for promotion, not a silent pass.

export const DIMS_SWEEP = Object.freeze([16384, 131072, 1048576]);
export const RHO_LEVELS = Object.freeze([0.0, 0.25, 0.5, 0.75, 0.9, 0.99]);
export const FAMILIES = Object.freeze(['f1-dense', 'f2-sparse16', 'f3-heavytail', 'f4a-collide', 'f4b-cancel']);
export const PILOT_PAIRS = 50;
export const TRIPLETS_PER_CELL = 25;
const RANK_MIX_HI = 0.8;
const RANK_MIX_LO = 0.5;
const F4_BUCKET = 137;

export const DEFINITION_ROWS = Object.freeze([
  'QFSWEEPHDR|tool=quant-fidelity-sweep.mjs|spec=QUANTFIDELITYSPEC8-2026-06-11.hbp(liris-patched)|target=QUANT8-only-QUANT4-inherits-nothing|json=0',
  `QFSWEEPGRID|dims=${DIMS_SWEEP.join('+')}|rho=${RHO_LEVELS.join('+')}|families=${FAMILIES.join('+')}|pilot_pairs=${PILOT_PAIRS}|promotion_min=200|triplets=${TRIPLETS_PER_CELL}-per-cell-mix-${RANK_MIX_HI}-vs-${RANK_MIX_LO}|json=0`,
  'QFSWEEPMETRICS|m1=absolute-cosine-error|m2=dot-abs-plus-relative-when-raw-dot-ge-1e-9|m3=ranking-preservation-margin-0.1|rounding=fixed-6|json=0',
  'QFSWEEPSTATUS|pilot=may-find-failures-cannot-promote|promotion=requires-200-pairs+both-machine-byte-match+thresholds-pass-incl-f4a-f4b+rank-coverage-in-every-cell|json=0',
]);

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function cellSeed(dims, rhoIdx, famIdx, lane) {
  // deterministic, time-free seed mixing -- identical on every machine
  let h = 2166136261 >>> 0;
  for (const v of [dims, rhoIdx, famIdx, lane]) { h = ((h ^ v) * 16777619) >>> 0; }
  return h;
}

function genVector(family, dims, rand) {
  const v = new Float64Array(dims);
  if (family === 'f1-dense') {
    for (let i = 0; i < dims; i += 1) v[i] = rand() * 2 - 1;
  } else if (family === 'f2-sparse16') {
    for (let k = 0; k < 16; k += 1) v[Math.floor(rand() * dims)] = rand() * 2 - 1;
  } else if (family === 'f3-heavytail') {
    for (let i = 0; i < dims; i += 1) {
      const u = rand();
      const amp = Math.min(100, 1 / Math.sqrt(Math.max(u, 1e-6)));
      v[i] = (rand() < 0.5 ? -1 : 1) * amp * 0.01;
    }
  } else { // f4a-collide / f4b-cancel: mass on indices hitting one count-sketch bucket
    const cancel = family === 'f4b-cancel';
    let parity = 0;
    for (let i = 0; i < dims; i += 1) {
      const h = (i * 2654435761) >>> 0;
      if ((h & (D - 1)) === F4_BUCKET) {
        const negSign = (h & 0x80000000) !== 0;
        // contribution to bucket = negSign ? -v[i] : v[i]
        let want = 1; // f4a: every contribution +1 (amplify)
        if (cancel) { want = parity === 0 ? 1 : -1; parity ^= 1; } // f4b: alternate (cancel)
        v[i] = negSign ? -want : want;
      } else {
        v[i] = (rand() * 2 - 1) * 0.01; // small background
      }
    }
  }
  return v;
}

function mix(x, rho, noise) {
  const dims = x.length;
  const y = new Float64Array(dims);
  const w = Math.sqrt(1 - rho * rho);
  for (let i = 0; i < dims; i += 1) y[i] = rho * x[i] + w * noise[i];
  return y;
}

function cosRaw(a, b) {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}

function cosQ(qa, qb) {
  let dot = 0; let na = 0; let nb = 0;
  for (let j = 0; j < D; j += 1) { dot += qa.turbo[j] * qb.turbo[j]; na += qa.turbo[j] * qa.turbo[j]; nb += qb.turbo[j] * qb.turbo[j]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

export function sweepCell(dims, rho, family, pairs = PILOT_PAIRS) {
  const rhoIdx = RHO_LEVELS.indexOf(rho);
  const famIdx = FAMILIES.indexOf(family);
  const cosErrs = [];
  let signAgree = 0;
  for (let p = 0; p < pairs; p += 1) {
    const rx = lcg(cellSeed(dims, rhoIdx, famIdx, p * 2 + 1));
    const rn = lcg(cellSeed(dims, rhoIdx, famIdx, p * 2 + 2));
    const x = genVector(family, dims, rx);
    const y = mix(x, rho, genVector(family, dims, rn));
    const cr = cosRaw(x, y);
    const cq = cosQ(quant8(x), quant8(y));
    cosErrs.push(Math.abs(cq - cr));
    if (Math.sign(cq) === Math.sign(cr) || Math.abs(cr) < 1e-9) signAgree += 1;
  }
  // ranking preservation: x vs a (mix 0.8) vs b (mix 0.5), raw margin >= 0.1
  let rankQualified = 0; let rankPreserved = 0;
  for (let t = 0; t < TRIPLETS_PER_CELL; t += 1) {
    const rx = lcg(cellSeed(dims, rhoIdx, famIdx, 100000 + t * 3));
    const ra = lcg(cellSeed(dims, rhoIdx, famIdx, 100000 + t * 3 + 1));
    const rb = lcg(cellSeed(dims, rhoIdx, famIdx, 100000 + t * 3 + 2));
    const x = genVector(family, dims, rx);
    const a = mix(x, RANK_MIX_HI, genVector(family, dims, ra));
    const b = mix(x, RANK_MIX_LO, genVector(family, dims, rb));
    const crA = cosRaw(x, a); const crB = cosRaw(x, b);
    if (crA - crB < 0.1) continue; // margin qualification per spec
    rankQualified += 1;
    const qx = quant8(x);
    if (cosQ(qx, quant8(a)) > cosQ(qx, quant8(b))) rankPreserved += 1;
  }
  cosErrs.sort((u, v) => u - v);
  const rankRate = rankQualified === 0 ? -1 : rankPreserved / rankQualified;
  return {
    row: [
      'QUANTFIDELITY',
      `cell=${dims}-r${rho.toFixed(2)}-${family}`,
      `pairs=${pairs}`,
      `p50=${pct(cosErrs, 0.5).toFixed(6)}`,
      `p95=${pct(cosErrs, 0.95).toFixed(6)}`,
      `p99=${pct(cosErrs, 0.99).toFixed(6)}`,
      `max=${cosErrs[cosErrs.length - 1].toFixed(6)}`,
      `sign_agree=${(signAgree / pairs).toFixed(6)}`,
      `rank_preserve=${rankRate < 0 ? 'na' : rankRate.toFixed(6)}`,
      `rank_n=${rankQualified}`,
      'json=0',
    ].join('|'),
    p99: pct(cosErrs, 0.99),
    rankRate,
    rankQualified,
  };
}

export function sweep(dimsList = DIMS_SWEEP, pairs = PILOT_PAIRS) {
  const rows = [`QFSWEEPRUNHDR|dims=${dimsList.join('+')}|pairs_per_cell=${pairs}|grade=${pairs >= 200 ? 'PROMOTION' : 'PILOT'}|json=0`];
  let worstP99 = 0; let worstRank = 1; let cells = 0; let rankMissingCells = 0;
  for (const dims of dimsList) {
    for (const rho of RHO_LEVELS) {
      for (const family of FAMILIES) {
        const r = sweepCell(dims, rho, family, pairs);
        rows.push(r.row);
        cells += 1;
        if (r.p99 > worstP99) worstP99 = r.p99;
        if (r.rankQualified === 0) rankMissingCells += 1;
        if (r.rankRate >= 0 && r.rankRate < worstRank) worstRank = r.rankRate;
      }
    }
  }
  const pass = worstP99 <= 0.05 && worstRank >= 0.99 && rankMissingCells === 0;
  rows.push(`QFSWEEPVERDICT|cells=${cells}|worst_p99_cos_err=${worstP99.toFixed(6)}|worst_rank_preserve=${worstRank.toFixed(6)}|rank_missing_cells=${rankMissingCells}|thresholds=p99-leq-0.05-AND-rank-geq-0.99-AND-rank_missing_cells-eq-0|result=${pass ? 'PASS' : 'FAIL'}|grade=${pairs >= 200 ? 'PROMOTION_GRADE' : 'PILOT_CANNOT_PROMOTE'}|json=0`);
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--baseline')) {
    process.stdout.write(`${sweep(DIMS_SWEEP, PILOT_PAIRS).join('\n')}\n`);
  } else if (args.includes('--run')) {
    const dimArg = args.find((a) => a.startsWith('--dims='));
    const pairArg = args.find((a) => a.startsWith('--pairs='));
    const dims = dimArg ? dimArg.slice(7).split(',').map(Number).filter((n) => n > 0) : [16384];
    const pairs = pairArg ? Math.max(1, Number.parseInt(pairArg.slice(8), 10) || PILOT_PAIRS) : PILOT_PAIRS;
    process.stdout.write(`${sweep(dims, pairs).join('\n')}\n`);
  } else {
    process.stdout.write(`${DEFINITION_ROWS.join('\n')}\n`);
  }
}
