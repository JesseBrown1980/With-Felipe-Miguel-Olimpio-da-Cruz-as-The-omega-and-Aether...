#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SECTORS, WIDTH, registerAgent } from './github-pid-register.mjs';
import { classifyBhIndex } from './token-cube-catalog-binder.mjs';

export const QUANT4_ID = 'quant4-fidelity-spec.v1';
export const DEFAULT_SEED = 0x51554634; // "QUF4" lane seed
export const DEFAULT_SAMPLES = 8192;
export const DEFAULT_DUPLICATES = 512;
export const DEFAULT_MUTATIONS = 1024;
export const ROUTE_SPACE_EFFECTIVE = 3 * WIDTH * SECTORS;

export const DEFINITION_ROWS = Object.freeze([
  'QFSPEC4HDR|id=quant4-fidelity-spec.v1|target=live-QUANT4-sha-tag-PID-address-engine|scope=address-and-evidence-fidelity-not-vector-reconstruction|json=0',
  'QFSPEC4ONTOLOGY|fabric_answer=quants-are-address-and-evidence-classes-not-raw-material|species=vector-quants-compress-continuous-signals+address-quants-classify-integer-hash-PID-addresses|json=0',
  'QFSPEC4LANGBOUND|claim_17_languages=THESIS-NOT-ENUMERATED-AS-17-LIVE-IMPLEMENTED-LANGUAGES|grounded_surfaces=6-core-dialects+2-implemented-translation-pairs+7-D22-verbs+10-planned-fabric-endpoints+7-auto-translate-layers+BEHCS1024-glyph|rule=SPEC4-does-not-assume-17-live-languages|json=0',
  'QFSPEC4PIDPLACE|placement=sha256-preimage-residue-addressing-not-resident-agent-object|fields=tier-A00-A15+role-triad+lane_mod3+quad_mod4+glyph5+glyph1024+sector113+hilbert+cube_bh-BH.sector.lane.glyph1024|three_systems=LOGICAL-WAVE+FROZEN-BRAIN+REAL-FREE|json=0',
  'QFSPEC4PRIMEWHY|rule_of_three=lane_mod3-three-cylinder-partition-for-triad-routing|mod6=primes_gt3-reside-in-1-or-5-phase|von_mangoldt=prime_power_class-address-evidence|p3_collision_reserve=PROPOSAL-not-gating|json=0',
  'QFSPEC4FIREWALL|separate_from=QUANT8-JL-cosine-fidelity-sweep|rule=QUANT4-inherits-neither-QUANT8-pass-nor-QUANT8-fail|metric_cosine=not-applicable-for-hash-tail|json=0',
  'QFSPEC4FIELDS|identity=register_identity_sha16+pid+sha16|route=lane_mod3+quad_mod4+sector113+glyph1024+cube_bh|evidence=bh_ppow+agent_type|json=0',
  'QFSPEC4METRICS|m1=determinism|m2=duplicate-stability|m3=identity-collisions|m4=route-bucket-collisions-expected-finite|m5=lane-quad-sector-glyph-coverage|m6=mutation-identity-separation|json=0',
  'QFSPEC4PASSFAIL|pass_requires=bounds-ok+duplicate-stable+identity-collisions-0+pid-collisions-0+non-catastrophic-route-spread|on_pass=ROUTING_HINT_MEASURED_NOT_GATING|on_fail=QUANT4_REMAINS_UNMEASURED_FOR_PROMOTION|json=0',
  'QFSPEC4SAFETY|mutates=0|no_live_publish=1|no_mint=1|no_cube_mutation=1|no_secret_material=1|rows_time_free=1|json=0',
]);

const sha256 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');
const sha16 = (text) => sha256(text).slice(0, 16);
const pct = (n) => n.toFixed(6);

function safeName(seed, i) {
  const h = sha16(`quant4|${seed}|${i}`);
  return `q4-live-route-${String(i).padStart(6, '0')}-${h}`;
}

export function quant4Address(input, opts = {}) {
  const a = registerAgent({
    runtime: opts.runtime ?? 'opencode',
    name: input,
    role: opts.role ?? 'AGT',
    tier: opts.tier ?? 4,
    kind: opts.kind ?? 'logical',
    prime: opts.prime ?? 0,
    nest: opts.nest ?? 1,
  });
  const sectorClass = classifyBhIndex(a.sector);
  const routeKey = `${a.lane}.${a.quad}.${a.sector}.${a.glyph_1024}`;
  return {
    input_sha16: sha16(input),
    register_identity_sha16: a.register_identity_sha16,
    pid: a.pid,
    agent_type: a.agent_type,
    lane_mod3: a.lane,
    quad_mod4: a.quad,
    sector113: a.sector,
    glyph1024: a.glyph_1024,
    cube_bh: a.cube_bh,
    bh_lane: sectorClass.lane,
    bh_ppow: sectorClass.ppow,
    route_key: routeKey,
    sha16: a.sha16,
  };
}

function countBy(items, keyFn) {
  const m = new Map();
  for (const item of items) {
    const k = keyFn(item);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function denseCounts(map, width) {
  return Array.from({ length: width }, (_, i) => map.get(i) ?? 0);
}

function maxRelativeSkew(counts) {
  const expected = counts.reduce((a, b) => a + b, 0) / counts.length;
  return Math.max(...counts.map((n) => Math.abs(n - expected) / expected));
}

function expectedOccupied(samples, buckets) {
  return buckets * (1 - ((buckets - 1) / buckets) ** samples);
}

function verdictFor(metrics) {
  const minSectorCoverage = Math.floor(expectedOccupied(metrics.samples, SECTORS) * 0.90);
  const minGlyphCoverage = Math.floor(expectedOccupied(metrics.samples, WIDTH) * 0.90);
  const routeUniqueRatio = metrics.route_unique / metrics.samples;
  const pass = metrics.bounds_ok
    && metrics.cube_consistent
    && metrics.duplicate_stable === metrics.duplicates
    && metrics.identity_collisions === 0
    && metrics.pid_collisions === 0
    && metrics.mutation_identity_changed === metrics.mutations
    && metrics.lane_max_skew <= 0.12
    && metrics.quad_max_skew <= 0.12
    && metrics.sector_coverage >= minSectorCoverage
    && metrics.glyph_coverage >= minGlyphCoverage
    && routeUniqueRatio >= 0.96;
  return {
    result: pass ? 'PASS' : 'FAIL',
    grade: pass ? 'ROUTING_HINT_MEASURED_NOT_GATING' : 'QUANT4_REMAINS_UNMEASURED_FOR_PROMOTION',
    minSectorCoverage,
    minGlyphCoverage,
    routeUniqueRatio,
  };
}

export function runQuant4Fidelity(options = {}) {
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const duplicates = options.duplicates ?? DEFAULT_DUPLICATES;
  const mutations = options.mutations ?? DEFAULT_MUTATIONS;
  const seed = options.seed ?? DEFAULT_SEED;
  const names = Array.from({ length: samples }, (_, i) => safeName(seed, i));
  const addresses = names.map((name) => quant4Address(name));

  const duplicateStable = Array.from({ length: duplicates }, (_, i) => {
    const name = names[i % names.length];
    const a = quant4Address(name);
    const b = quant4Address(name);
    return a.register_identity_sha16 === b.register_identity_sha16
      && a.pid === b.pid
      && a.route_key === b.route_key
      && a.cube_bh === b.cube_bh;
  }).filter(Boolean).length;

  let mutationIdentityChanged = 0;
  let mutationRouteChanged = 0;
  for (let i = 0; i < mutations; i += 1) {
    const a = quant4Address(names[i % names.length]);
    const b = quant4Address(`${names[i % names.length]}-mut${i}`);
    if (a.register_identity_sha16 !== b.register_identity_sha16 && a.pid !== b.pid) mutationIdentityChanged += 1;
    if (a.route_key !== b.route_key) mutationRouteChanged += 1;
  }

  const ids = countBy(addresses, (a) => a.register_identity_sha16);
  const pids = countBy(addresses, (a) => a.pid);
  const routes = countBy(addresses, (a) => a.route_key);
  const laneCounts = denseCounts(countBy(addresses, (a) => a.lane_mod3), 3);
  const quadCounts = denseCounts(countBy(addresses, (a) => a.quad_mod4), 4);
  const sectorCounts = countBy(addresses, (a) => a.sector113);
  const glyphCounts = countBy(addresses, (a) => a.glyph1024);

  const metrics = {
    samples,
    duplicates,
    mutations,
    seed,
    bounds_ok: addresses.every((a) => a.lane_mod3 >= 0 && a.lane_mod3 < 3
      && a.quad_mod4 >= 0 && a.quad_mod4 < 4
      && a.sector113 >= 0 && a.sector113 < SECTORS
      && a.glyph1024 >= 0 && a.glyph1024 < WIDTH),
    cube_consistent: addresses.every((a) => a.cube_bh === `BH.${a.sector113}.${a.lane_mod3}.${a.glyph1024}`),
    duplicate_stable: duplicateStable,
    identity_collisions: [...ids.values()].filter((n) => n > 1).length,
    pid_collisions: [...pids.values()].filter((n) => n > 1).length,
    route_unique: routes.size,
    route_collisions: samples - routes.size,
    lane_counts: laneCounts,
    quad_counts: quadCounts,
    lane_max_skew: maxRelativeSkew(laneCounts),
    quad_max_skew: maxRelativeSkew(quadCounts),
    sector_coverage: sectorCounts.size,
    glyph_coverage: glyphCounts.size,
    mutation_identity_changed: mutationIdentityChanged,
    mutation_route_changed: mutationRouteChanged,
    mutation_route_unchanged: mutations - mutationRouteChanged,
    route_space_effective: ROUTE_SPACE_EFFECTIVE,
  };
  return { metrics, verdict: verdictFor(metrics) };
}

export function emitQuant4Rows(options = {}) {
  const { metrics: m, verdict: v } = runQuant4Fidelity(options);
  return [
    ...DEFINITION_ROWS,
    `QF4RUNHDR|samples=${m.samples}|duplicates=${m.duplicates}|mutations=${m.mutations}|seed=0x${m.seed.toString(16)}|route_space_effective=${m.route_space_effective}|json=0`,
    `QF4BOUNDS|bounds_ok=${m.bounds_ok ? 1 : 0}|cube_consistent=${m.cube_consistent ? 1 : 0}|fields=lane_mod3+quad_mod4+sector113+glyph1024+cube_bh|json=0`,
    `QF4DUPLICATE|duplicates=${m.duplicates}|duplicate_stable=${m.duplicate_stable}|identity_collisions=${m.identity_collisions}|pid_collisions=${m.pid_collisions}|json=0`,
    `QF4ROUTE|route_unique=${m.route_unique}|route_collisions=${m.route_collisions}|route_unique_ratio=${pct(v.routeUniqueRatio)}|finite_bucket_collisions=EXPECTED_NOT_IDENTITY_FAILURE|json=0`,
    `QF4DIST|lane_counts=${m.lane_counts.join(',')}|lane_max_skew=${pct(m.lane_max_skew)}|quad_counts=${m.quad_counts.join(',')}|quad_max_skew=${pct(m.quad_max_skew)}|sector_coverage=${m.sector_coverage}|glyph_coverage=${m.glyph_coverage}|json=0`,
    `QF4MUTATION|mutations=${m.mutations}|identity_changed=${m.mutation_identity_changed}|route_changed=${m.mutation_route_changed}|route_unchanged=${m.mutation_route_unchanged}|route_unchanged_meaning=finite-address-bucket-not-identity-collapse|json=0`,
    `QF4VERDICT|result=${v.result}|grade=${v.grade}|min_sector_coverage=${v.minSectorCoverage}|min_glyph_coverage=${v.minGlyphCoverage}|not_semantic_fidelity=1|not_gating=1|json=0`,
  ];
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  const a = quant4Address('spec4-self-test');
  const b = quant4Address('spec4-self-test');
  const c = quant4Address('spec4-self-test-mutated');
  add('deterministic-address', a.pid === b.pid && a.route_key === b.route_key);
  add('mutation-changes-identity', a.register_identity_sha16 !== c.register_identity_sha16 && a.pid !== c.pid);
  add('bounds', a.lane_mod3 >= 0 && a.lane_mod3 < 3 && a.quad_mod4 >= 0 && a.quad_mod4 < 4 && a.sector113 >= 0 && a.sector113 < SECTORS && a.glyph1024 >= 0 && a.glyph1024 < WIDTH);
  add('cube-consistent', a.cube_bh === `BH.${a.sector113}.${a.lane_mod3}.${a.glyph1024}`);
  const run = runQuant4Fidelity({ samples: 1024, duplicates: 64, mutations: 64 });
  add('small-run-pass', run.verdict.result === 'PASS');
  add('rows-hbp-only', emitQuant4Rows({ samples: 128, duplicates: 16, mutations: 16 }).every((row) => row.endsWith('|json=0') && !row.includes('{"')));
  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--pilot';
  if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  }
  if (cmd === '--pilot') {
    process.stdout.write(emitQuant4Rows().join('\n') + '\n');
  } else {
    console.error('usage: quant4-fidelity-spec.mjs --pilot | --self-test');
    process.exit(1);
  }
}
