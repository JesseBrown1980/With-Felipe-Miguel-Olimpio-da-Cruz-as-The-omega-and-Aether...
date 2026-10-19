#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyBhIndex } from './token-cube-catalog-binder.mjs';

// ZETA QUANT -- census engine #4, implemented per ZETAQUANTSPEC-2026-06-11
// as patched and signed by liris (27a921c). Number-theoretic ADDRESS quant:
// quantizes an integer address into prime-lane cylinder geometry. NO new
// mathematics -- this wraps the bilaterally sealed math (binder bh_lane mod 3
// + bh_ppow von-Mangoldt classes + the gap-mod-6 forcing law, 9589/9589).
//
// Small-prime exceptions (liris catch #31): 2 and 3 are primes but do not
// live on the mod-6 residues 1/5, and their gaps do not follow the lane map.
// The original 100k sweep already excluded them implicitly (9592 primes - 2
// small = 9590 primes>3 = 9589 pairs); this module makes it explicit.
//
// The forcing validator is NECESSARY, NOT SUFFICIENT: it can catch impossible
// consecutive-prime claims for free, but can never prove consecutiveness.
// Classification is INFORMATIONAL, never gating (v1, same as the binder).

export const ZETA_ID = 'zeta-quant.v1';
export const DOMAIN_MAX = 999999; // matches binder classifyBhIndex domain
export const SWEEP_LIMIT = 100000;

const FORCED = Object.freeze({ 0: 'same-lane', 2: 'lane2-to-1', 4: 'lane1-to-2' });
const INVALID_LANE = Symbol('invalid-lane');

function claimedLane(opts, key, fallback) {
  if (!opts || typeof opts !== 'object' || !Object.prototype.hasOwnProperty.call(opts, key)) return fallback;
  const value = opts[key];
  if (Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^[0-2]$/.test(value)) return Number(value);
  return INVALID_LANE;
}

function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  if (n % 3 === 0) return n === 3;
  for (let f = 5; f * f <= n; f += 6) {
    if (n % f === 0 || n % (f + 2) === 0) return false;
  }
  return true;
}

export function zetaClassify(index) {
  if (!Number.isInteger(index) || index < 0 || index > DOMAIN_MAX || Object.is(index, -0)) {
    return { in_domain: false, lane: 'none', residue6: 'none', ppow: 'none', prime_residence: 'none', cylinder: 'none' };
  }
  const shared = classifyBhIndex(index); // single source of truth: lane + ppow
  const residue6 = index % 6;
  let primeResidence = 'none';
  if (shared.ppow === 'prime') {
    primeResidence = (index === 2 || index === 3) ? 'small-prime-exception' : residue6;
  }
  return {
    in_domain: true,
    lane: shared.lane,
    residue6,
    ppow: shared.ppow,
    prime_residence: primeResidence,
    cylinder: { ring: Math.floor(index / 6), phase: residue6 },
  };
}

// zetaTransition checks the gap-mod-6 forcing. opts.claimedLaneA/claimedLaneB
// supply EXTERNALLY-RECORDED lanes (e.g. from another fabric process's address
// records); when given, the check catches corruption -- a recorded lane that
// contradicts the value's true lane or the gap-forced transition. Without them
// the lanes are recomputed and the result can only CONFIRM consistency (the
// forcing law is a theorem for real primes>3), never flag a violation. This is
// the acer implementation finding: the validator's CATCH power is real only in
// external-lane mode (FORCING_VIOLATION is otherwise unreachable). Verdict is
// NECESSARY-NOT-SUFFICIENT -- it never proves consecutiveness.
export function zetaTransition(a, b, opts = {}) {
  const ca = zetaClassify(a);
  const cb = zetaClassify(b);
  if (!ca.in_domain || !cb.in_domain || b <= a) {
    return { gap: 'none', gap_mod6: 'none', forced_transition: 'none', verdict: 'NOT_APPLICABLE' };
  }
  const gap = b - a;
  const gapMod6 = gap % 6;
  const result = { gap, gap_mod6: gapMod6, forced_transition: FORCED[gapMod6] ?? 'none' };
  if (ca.ppow !== 'prime' || cb.ppow !== 'prime'
    || ca.prime_residence === 'small-prime-exception' || cb.prime_residence === 'small-prime-exception'
    || !(gapMod6 in FORCED)) {
    return { ...result, verdict: 'NOT_APPLICABLE' };
  }
  // lanes under test: external claim if supplied, else the value-true lanes.
  // HBP-parsed external rows carry lanes as strings, so canonical "0".."2"
  // must be honored. A supplied malformed lane is corruption, not absence.
  const laneA = claimedLane(opts, 'claimedLaneA', ca.lane);
  const laneB = claimedLane(opts, 'claimedLaneB', cb.lane);
  const laneTruthful = laneA === ca.lane && laneB === cb.lane;
  const forcedOk = (gapMod6 === 0 && laneA === laneB)
    || (gapMod6 === 2 && laneA === 2 && laneB === 1)
    || (gapMod6 === 4 && laneA === 1 && laneB === 2);
  return { ...result, verdict: (laneTruthful && forcedOk) ? 'FORCED_CONSISTENT' : 'FORCING_VIOLATION' };
}

// The forcing sweep: sieve primes to SWEEP_LIMIT, verify every consecutive
// pair of primes > 3 against the forced lane map, emit byte-matched counts.
// Integer-only, time-free -- this row re-proves the 9589/9589 theorem on
// every pyramid run on both machines.
export function forcingSweep(limit = SWEEP_LIMIT) {
  const sieve = new Uint8Array(limit + 1);
  const primes = [];
  for (let n = 2; n <= limit; n += 1) {
    if (sieve[n]) continue;
    primes.push(n);
    for (let m = n * n; m <= limit; m += n) sieve[m] = 1;
  }
  const gt3 = primes.filter((p) => p > 3);
  let violations = 0;
  const modCounts = { 0: 0, 2: 0, 4: 0 };
  for (let i = 0; i + 1 < gt3.length; i += 1) {
    const t = zetaTransition(gt3[i], gt3[i + 1]);
    if (t.verdict === 'FORCING_VIOLATION') violations += 1;
    if (t.gap_mod6 in modCounts) modCounts[t.gap_mod6] += 1;
  }
  return {
    limit,
    primes: primes.length,
    primes_gt3: gt3.length,
    pairs: gt3.length - 1,
    violations,
    gap_mod6_0: modCounts[0],
    gap_mod6_2: modCounts[2],
    gap_mod6_4: modCounts[4],
  };
}

const PARITY_CASES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 25, 49, 137, 343, 961, 2401, 7919, 994009, 999983, 999999]);
const TRANSITION_CASES = Object.freeze([[2, 3], [3, 5], [5, 7], [7, 11], [11, 13], [23, 29], [89, 97], [113, 127], [4, 6], [5, 5], [7919, 7927]]);

export function emitParityRows() {
  const rows = [`ZETAPARITYHDR|id=${ZETA_ID}|cases=${PARITY_CASES.length}|transitions=${TRANSITION_CASES.length}|clock=none-integer-only|json=0`];
  for (const index of PARITY_CASES) {
    const c = zetaClassify(index);
    rows.push(`ZETACLASSIFY|index=${index}|lane=${c.lane}|residue6=${c.residue6}|ppow=${c.ppow}|prime_residence=${c.prime_residence}|ring=${c.cylinder === 'none' ? 'none' : c.cylinder.ring}|phase=${c.cylinder === 'none' ? 'none' : c.cylinder.phase}|json=0`);
  }
  for (const [a, b] of TRANSITION_CASES) {
    const t = zetaTransition(a, b);
    rows.push(`ZETATRANSITION|a=${a}|b=${b}|gap=${t.gap}|gap_mod6=${t.gap_mod6}|forced=${t.forced_transition}|verdict=${t.verdict}|json=0`);
  }
  const s = forcingSweep();
  rows.push(`ZETAFORCESWEEP|limit=${s.limit}|primes=${s.primes}|primes_gt3=${s.primes_gt3}|pairs=${s.pairs}|violations=${s.violations}|gap_mod6_0=${s.gap_mod6_0}|gap_mod6_2=${s.gap_mod6_2}|gap_mod6_4=${s.gap_mod6_4}|json=0`);
  rows.push(`ZETAPARITYFTR|scope=NECESSARY-NOT-SUFFICIENT|classification=INFORMATIONAL-never-gating|json=0`);
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  add('lane-is-mod-3', zetaClassify(7919).lane === 7919 % 3);
  add('binder-agreement-spot', (() => { const c = zetaClassify(343); const b = classifyBhIndex(343); return c.lane === b.lane && c.ppow === b.ppow; })());
  add('small-prime-2-exception', zetaClassify(2).prime_residence === 'small-prime-exception');
  add('small-prime-3-exception', zetaClassify(3).prime_residence === 'small-prime-exception');
  add('primes-gt3-residence-1-or-5', [5, 7, 11, 13, 7919, 999983].every((p) => [1, 5].includes(zetaClassify(p).prime_residence)));
  add('twin-pair-forced-consistent', zetaTransition(11, 13).verdict === 'FORCED_CONSISTENT');
  add('real-prime-pair-never-violates', [[5, 7], [11, 13], [13, 17], [7919, 7927]].every(([a, b]) => zetaTransition(a, b).verdict !== 'FORCING_VIOLATION'));
  add('small-prime-transition-not-applicable', zetaTransition(3, 5).verdict === 'NOT_APPLICABLE');
  add('non-prime-not-applicable', zetaTransition(4, 6).verdict === 'NOT_APPLICABLE');
  // external-lane mode: a corrupted recorded lane is the only thing the
  // validator can actually CATCH. 11,13 are a true twin (lanes 2->1); claim 13
  // sits on lane 2 and the forcing check fires.
  add('corrupted-external-lane-caught', zetaTransition(11, 13, { claimedLaneB: 2 }).verdict === 'FORCING_VIOLATION');
  add('truthful-external-lane-consistent', zetaTransition(11, 13, { claimedLaneA: 2, claimedLaneB: 1 }).verdict === 'FORCED_CONSISTENT');
  add('hbp-string-external-lanes-honored', zetaTransition(11, 13, { claimedLaneA: '2', claimedLaneB: '2' }).verdict === 'FORCING_VIOLATION'
    && zetaTransition(11, 13, { claimedLaneA: '2', claimedLaneB: '1' }).verdict === 'FORCED_CONSISTENT');
  add('sweep-zero-violations', forcingSweep().violations === 0);
  add('sweep-pair-count-matches-sealed-9589', forcingSweep().pairs === 9589);
  add('out-of-domain-none', zetaClassify(1000000).lane === 'none');
  add('determinism', emitParityRows().join('|') === emitParityRows().join('|'));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === '--parity') {
    process.stdout.write(`${emitParityRows().join('\n')}\n`);
  } else {
    process.stdout.write(`ZETASTATUS|id=${ZETA_ID}|domain=0..${DOMAIN_MAX}|scope=NECESSARY-NOT-SUFFICIENT|classification=INFORMATIONAL-never-gating|json=0\n`);
  }
}
