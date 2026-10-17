// ZETA process — von Mangoldt chain for K-step predictive position on the
// Brown-Hilbert lattice. Layer 2 of the prediction-capable federation stack.
//
// Spec: project_apex_wave_burst_fire + project_w20qq_zeta_canon_ready_2026_05_25 +
//       operator amendment 2026-05-25 (Quadruple-Quant: Polar + Turbo + JL + ZETA)
//
// Math source (operator-asserted, L2-unverified post-cutoff):
//   Tao 2026-05 Erdős #1196 — primitive sets sum bound via von-Mangoldt-weighted
//   Markov chains. arxiv 2605.00301 + terrytao.wordpress.com 2026-05-03.
//
// von Mangoldt function Λ(n):
//   Λ(n) = log(p)   if n = p^a for prime p, a ≥ 1
//   Λ(n) = 0        otherwise
//
// ν_Λ(cp) ≈ 1/(cp · log cp) — invariant measure, replaces 234-stub CONVERGE.
//
// Pure functions. No hidden state. No side effects. Codex-resistant by design.

import { PRIMES } from './primes.mjs';

const PRIME_SET = new Set(PRIMES);

// === von Mangoldt function ================================================

export function vonMangoldt(n) {
  if (!Number.isInteger(n) || n < 2) return 0;
  if (PRIME_SET.has(n)) return Math.log(n);
  // n = p^a check
  for (const p of PRIMES) {
    if (p > n) break;
    if (n % p !== 0) continue;
    let m = n;
    while (m % p === 0) m = m / p;
    return m === 1 ? Math.log(p) : 0;
  }
  return 0;
}

// === Divisors of n (small n only; BEHCS-1024 max) =========================

function divisors(n) {
  if (!Number.isInteger(n) || n < 1) return [];
  const out = [];
  const sqrt = Math.floor(Math.sqrt(n));
  for (let d = 1; d <= sqrt; d++) {
    if (n % d === 0) {
      out.push(d);
      if (d !== n / d) out.push(n / d);
    }
  }
  return out.sort((a, b) => a - b);
}

// === Invariant measure ν_Λ ================================================

export function nuLambda(cp) {
  const x = Number(cp);
  if (!Number.isFinite(x) || x < 2) return 0;
  return 1 / (x * Math.log(x));
}

export function nuLambdaTable(maxCp = 1023) {
  const table = new Array(maxCp + 1).fill(0);
  for (let cp = 2; cp <= maxCp; cp++) table[cp] = nuLambda(cp);
  return table;
}

export function bandWeight(cpStart, cpEnd) {
  let sum = 0;
  for (let cp = cpStart; cp <= cpEnd; cp++) sum += nuLambda(cp);
  return sum;
}

// === Deterministic seeded sampler =========================================
// Deterministic from (seed, step) so trajectories are reproducible — matches
// the white-room discipline (oracle-diff.mjs can compare two runs by sha).

function deterministicUnit(seed, step) {
  // Mulberry32 over (seed + step) — pure function, no Math.random()
  let a = ((seed >>> 0) + (step >>> 0) * 0x6d2b79f5) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

// === F1: vonMangoldtNext + predictKPositions ==============================

export function vonMangoldtNext(cp, opts = {}) {
  if (!Number.isInteger(cp) || cp < 2) {
    return { next: 2, divisor: 1, weight: 0, reason: 'cp < 2 → reset to 2' };
  }
  const seed = (opts.seed ?? 0) >>> 0;
  const step = (opts.step ?? 0) >>> 0;
  const divs = divisors(cp).filter((q) => q > 1);
  if (divs.length === 0) {
    return { next: cp, divisor: 1, weight: 0, reason: 'no proper divisor' };
  }
  const weights = divs.map((q) => vonMangoldt(q) / Math.log(cp));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) {
    return { next: cp, divisor: 1, weight: 0, reason: 'all weights zero (cp not prime-power-rich)' };
  }
  const u = deterministicUnit(seed ^ cp, step) * totalWeight;
  let acc = 0;
  for (let i = 0; i < divs.length; i++) {
    acc += weights[i];
    if (u <= acc) {
      const q = divs[i];
      const next = Math.max(2, Math.round(cp / q));
      return { next, divisor: q, weight: weights[i], reason: `Λ(${q})/log(${cp})` };
    }
  }
  const q = divs[divs.length - 1];
  return { next: Math.max(2, Math.round(cp / q)), divisor: q, weight: weights[divs.length - 1], reason: 'tail-pick' };
}

export function predictKPositions(cp0, k, opts = {}) {
  if (!Number.isInteger(k) || k < 1) throw new RangeError('predictKPositions: k must be >= 1');
  const seed = opts.seed ?? 0;
  const trajectory = [];
  let current = cp0;
  for (let step = 0; step < k; step++) {
    const sample = vonMangoldtNext(current, { seed, step });
    trajectory.push({ step, from: current, ...sample });
    current = sample.next;
  }
  return {
    algorithm: 'zeta-process-von-mangoldt-chain.v1',
    cp_start: cp0,
    k,
    trajectory,
    final_cp: current,
    seed,
  };
}

// === F3: Chain/antichain duality citation =================================
// Tao Proposition 7: uniform upper bound on aggregate over antichain PIDs
// ↔ existence of distribution μ over chains hitting each PID with mass ≥ 1/N.
// Federation application: revolver chambers ARE the constructive answer.

export function chainAntichainBound(nConcurrent) {
  if (!Number.isInteger(nConcurrent) || nConcurrent < 1) {
    throw new RangeError('chainAntichainBound: nConcurrent must be >= 1');
  }
  return {
    theorem: 'tao-proposition-7-chain-antichain-duality',
    n_concurrent: nConcurrent,
    required_mass_per_pid: 1 / nConcurrent,
    constructive_answer: 'revolver-chambers (pid-chain-revolver.mjs)',
    citation: 'arxiv 2605.00301 (operator-asserted, L2-unverified post-cutoff)',
  };
}

// === Honest gaps ==========================================================

export const HONEST_GAPS = Object.freeze([
  'Tao bound is for integers ≤ x with fixed alphabet; BEHCS-1024 small-N edge cases need numerical verification',
  'Prediction accuracy unproven empirically — need fixture of 50-100 real PID transitions to measure hit rate',
  'von Mangoldt chain has O(1/log x) error term; at x≈1024 → ~14% prediction noise expected',
  'Tao 2026-05 Erdős #1196 is post-cutoff for L2 agent; operator-asserted only',
  'cp=2 is an absorbing sink: vonMangoldtNext(2) → next=2 (only divisor>1 is 2, cp/2=1→max(2,1)=2). Empirical 2026-05-25 via revolver-MTP wire: cp0=2 collapses all K heads; cp0=500 depth=1 diverges cleanly (4/4 unique); cp0=500 depth=4 also collapses to cp=2. Stay in middle band cp∈[~50,~900] with depth≤2 for healthy K-head divergence.',
]);
