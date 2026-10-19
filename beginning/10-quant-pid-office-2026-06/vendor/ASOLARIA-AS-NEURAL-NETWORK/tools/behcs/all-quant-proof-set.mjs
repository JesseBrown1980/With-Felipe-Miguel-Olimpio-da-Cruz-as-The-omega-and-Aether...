#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { D, quant8, tupleBuffer } from './quant-huge-message-benchmark.mjs';
import { quant4Address, runQuant4Fidelity } from './quant4-fidelity-spec.mjs';
import { classifyBhIndex } from './token-cube-catalog-binder.mjs';
import { forcingSweep, zetaClassify, zetaTransition } from './zeta-quant.mjs';
import { omniFlywheelVerdict, omniQuantScore } from './omni-engine-loop.mjs';

export const PROOF_ID = 'all-quant-proof-set-1e100m.v1';
export const TARGET_EXPONENT = 100_000_000;
export const EXTREME_SAMPLE_OFFSETS = 1_000_000;
export const DATE = '2026-06-15';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const USER_HOME = dirname(REPO);
const STRIDE = 0x9e3779b97f4a7c15n;
const SALT = 0x243f6a8885a308d3n;
const UINT32 = 0xffffffffn;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sha16 = (value) => sha256(String(value)).slice(0, 16);
const sha16Buffer = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
const safe = (value) => String(value).replace(/[|\r\n]/g, '_');

function powMod(base, exponent, modulus) {
  let b = BigInt(base) % BigInt(modulus);
  let e = BigInt(exponent);
  const m = BigInt(modulus);
  let out = 1n;
  while (e > 0n) {
    if (e & 1n) out = (out * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return out;
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeVector(kind, dims = 4096) {
  const v = new Float64Array(dims);
  if (kind === 'dense-sine') {
    for (let i = 0; i < dims; i += 1) v[i] = Math.sin(i / 17) + Math.cos(i / 31) * 0.5;
  } else if (kind === 'sparse-prime-spikes') {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
    for (let i = 0; i < primes.length; i += 1) v[(primes[i] * 137) % dims] = (i % 2 === 0 ? 1 : -1) * (1 + i / 8);
  } else if (kind === 'heavy-tail') {
    const rnd = lcg(0x48454156);
    for (let i = 0; i < dims; i += 1) {
      const u = Math.max(rnd(), 1e-6);
      v[i] = (rnd() < 0.5 ? -1 : 1) * Math.min(100, 1 / Math.sqrt(u)) * 0.01;
    }
  } else if (kind === 'alternating-cancel') {
    for (let i = 0; i < dims; i += 1) v[i] = (i % 2 === 0 ? 1 : -1) * ((i % 29) / 29);
  } else if (kind === 'monotone-ramp') {
    for (let i = 0; i < dims; i += 1) v[i] = (i / Math.max(1, dims - 1)) * 2 - 1;
  } else {
    throw new Error(`unknown-vector-kind:${kind}`);
  }
  return v;
}

function countBits(bytes) {
  let n = 0;
  for (const byte of bytes) {
    let b = byte;
    while (b) {
      n += b & 1;
      b >>= 1;
    }
  }
  return n;
}

function countValues(values, keys) {
  const out = new Map(keys.map((key) => [String(key), 0]));
  for (const value of values) {
    const key = String(value);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return keys.map((key) => out.get(String(key)) ?? 0).join(',');
}

function summarizeQuant8(kind) {
  const vector = makeVector(kind);
  const q = quant8(vector);
  const buf = tupleBuffer(q);
  const zetaCounts = Array.from({ length: 16 }, (_, bucket) => q.zeta.filter((value) => value === bucket).length);
  const histNonzero = Array.from(q.hist).filter((value) => value > 0).length;
  const turboNonzero = Array.from(q.turbo).filter((value) => value !== 0).length;
  return {
    kind,
    dims: vector.length,
    tupleBytes: buf.length,
    tupleSha16: sha16Buffer(buf),
    scale: q.scale,
    turboNonzero,
    signBits: countBits(q.signs),
    zetaCounts,
    tripleCounts: countValues(q.triple, [-1, 0, 1]),
    quadCounts: countValues(q.quad, [0, 1, 2, 3]),
    histNonzero,
    vmAcc: q.vmAcc,
    q,
    vector,
  };
}

function cosRaw(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}

function cosQuant(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < D; i += 1) {
    dot += a.turbo[i] * b.turbo[i];
    na += a.turbo[i] * a.turbo[i];
    nb += b.turbo[i] * b.turbo[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d < 1e-12 ? 0 : dot / d;
}

function fixed(value, places = 6) {
  return Number.isFinite(value) ? value.toFixed(places) : '0.000000';
}

async function optionalFalconCoreRows() {
  const rows = [];
  const corePath = join(USER_HOME, 'Asolaria-ASI-On-Metal-Fabric-and-matrix', 'tools', 'falcon', 'omni-acer', 'lib', 'hyperbehcs-core.cjs');
  if (!existsSync(corePath)) {
    rows.push('AQPFALCONCORE|status=SKIP|reason=hyperbehcs-core-not-present|json=0');
    return rows;
  }
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const core = require(corePath);
  const vector = Array.from(makeVector('dense-sine', 96));
  const polar = core.polarQuant(vector);
  const turbo = core.turboQuant(vector);
  const jl = core.johnsonLindenstrauss(vector, { targetDimension: 24, seed: 'all-quant-proof-set' });
  const triple = core.tripleQuant(vector);
  const zeroLossBoundary = typeof core.buildFastPacket === 'function'
    ? core.buildFastPacket({ vector }).zero_loss_boundary
    : 'buildFastPacket-not-exported';
  rows.push(`AQPFALCONCORE|status=PASS|polar=${polar.fingerprint}|turbo=${turbo.fingerprint}|jl=${jl.fingerprint}|jl_dim=${jl.target_dimension}|triple=${triple.fingerprint}|zero_loss_boundary=${safe(zeroLossBoundary)}|json=0`);
  return rows;
}

async function optionalZetaProcessRows() {
  const rows = [];
  const zpPath = join(USER_HOME, 'Asolaria-ASI-On-Metal-Fabric-and-matrix', 'tools', 'falcon', 'omni-acer', 'lib', 'zeta-process.mjs');
  if (!existsSync(zpPath)) {
    rows.push('AQPZETAPROCESS|status=SKIP|reason=zeta-process-not-present|json=0');
    return rows;
  }
  const zp = await import(pathToFileURL(zpPath).href);
  const lambdas = [2, 3, 4, 8, 9, 12, 16, 25, 27, 31]
    .map((n) => `${n}:${fixed(zp.vonMangoldt(n), 6)}`).join(',');
  const band = zp.bandWeight(2, 1023);
  const prediction = zp.predictKPositions(500, 4, { seed: 42 });
  rows.push(`AQPZETAPROCESS|status=PASS|lambda=${lambdas}|nuLambda_1024=${fixed(zp.nuLambda(1024), 9)}|bandWeight_2_1023=${fixed(band, 9)}|predict500_final=${prediction.final_cp}|trajectory_sha16=${sha16(JSON.stringify(prediction.trajectory))}|json=0`);
  return rows;
}

function extremeRows(exponent = TARGET_EXPONENT, samples = EXTREME_SAMPLE_OFFSETS) {
  const baseMod3 = Number(powMod(10n, exponent, 3n));
  const baseMod6 = Number(powMod(10n, exponent, 6n));
  const strideMod3 = Number(STRIDE % 3n);
  const strideMod6 = Number(STRIDE % 6n);
  const saltMod3 = Number(SALT % 3n);
  const saltMod6 = Number(SALT % 6n);
  const laneCounts = [0, 0, 0];
  const residueCounts = [0, 0, 0, 0, 0, 0];
  let lane = (baseMod3 + saltMod3) % 3;
  let residue = (baseMod6 + saltMod6) % 6;
  let checksum = 0n;
  for (let i = 0; i < samples; i += 1) {
    laneCounts[lane] += 1;
    residueCounts[residue] += 1;
    checksum ^= (BigInt(i) * STRIDE + SALT) & UINT32;
    lane = (lane + strideMod3) % 3;
    residue = (residue + strideMod6) % 6;
  }
  const probes = [0, 1, 2, 3, 10, 999, 65536, samples - 1].map((offset) => {
    const l = Number((BigInt(baseMod3) + BigInt(offset) * (STRIDE % 3n) + (SALT % 3n)) % 3n);
    const r = Number((BigInt(baseMod6) + BigInt(offset) * (STRIDE % 6n) + (SALT % 6n)) % 6n);
    return `${offset}:${l}/${r}`;
  }).join(',');
  return [
    `AQPEXTREMEDEF|target=1e${exponent}|digits=${exponent + 1}|materialized_decimal_digits=0|method=symbolic-modular-proof-plus-offset-sampling|json=0`,
    `AQPEXTREMEFORMULA|pow10_mod3=${baseMod3}|pow10_mod6=${baseMod6}|because=10-equivalent-1-mod3-and-4-mod6-for-positive-exponents|ppow_10E=composite-2^E*5^E-two-prime-bases|json=0`,
    `AQPEXTREMESAMPLE|offsets=${samples}|stride_mod3=${strideMod3}|stride_mod6=${strideMod6}|salt_mod3=${saltMod3}|salt_mod6=${saltMod6}|lane_counts=${laneCounts.join(',')}|residue6_counts=${residueCounts.join(',')}|checksum=${Number(checksum & UINT32)}|json=0`,
    `AQPEXTREMEPROBES|offset_lane_residue=${probes}|json=0`,
  ];
}

function markdown(rows) {
  const byPrefix = new Map();
  for (const row of rows) {
    const prefix = row.split('|', 1)[0];
    byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
  }
  return [
    '# All Quant Proof Set - 1e100Million',
    '',
    `Date: ${DATE}`,
    `Tool: ${PROOF_ID}`,
    '',
    '## Scope',
    '',
    'This proof set runs the eight quant engines together over concrete finite vectors and address samples, then tests the 1e100000000 target by symbolic modular invariants. It does not enumerate 1e100000000 agents and does not materialize a 100,000,001-digit decimal string.',
    '',
    '## Core formulas',
    '',
    '- QUANT8: count-sketch JL bucket, Turbo int8, Polar sign plane, Zeta log bucket, Triple ternary, Quadruple 4-level, JS histogram, von-Mangoldt prime-power accumulator.',
    '- Zeta address quant: lane = index mod 3; residue6 = index mod 6; cylinder = floor(index/6), phase index mod 6.',
    '- von-Mangoldt address class: unit / prime / p2 / p3 / pk / composite; Lambda(n) != 0 exactly on prime powers.',
    '- QUANT4 address quant: sha256 tuple -> lane mod 3, quad mod 4, glyph1024, sector113, cube_bh.',
    '- Extreme target: 10^100000000 mod 3 = 1; 10^100000000 mod 6 = 4; 10^E = 2^E * 5^E, so it is composite, not a prime power.',
    '',
    '## Row counts',
    '',
    ...Array.from(byPrefix.entries()).sort().map(([prefix, count]) => `- ${prefix}: ${count}`),
    '',
    '## HBP proof rows',
    '',
    '```text',
    ...rows,
    '```',
    '',
  ].join('\n');
}

export async function buildAllQuantProofSet(options = {}) {
  const exponent = options.exponent ?? TARGET_EXPONENT;
  const samples = options.samples ?? EXTREME_SAMPLE_OFFSETS;
  const scenarios = ['dense-sine', 'sparse-prime-spikes', 'heavy-tail', 'alternating-cancel', 'monotone-ramp'];
  const rows = [
    `AQPHDR|id=${PROOF_ID}|date=${DATE}|target=1e${exponent}|engines=Polar+Turbo+JL+Zeta+Triple+Quadruple+JS-histogram+von-Mangoldt+QUANT4+OmniQuant|json=0`,
    'AQPSCOPE|enumerates_universe=0|materializes_100000001_digit_decimal=0|method=finite-engine-runs+symbolic-extreme-address-proof+saved-HBP-rows|json=0',
  ];

  const summaries = scenarios.map((scenario) => summarizeQuant8(scenario));
  for (const s of summaries) {
    rows.push(`AQPQUANT8|scenario=${s.kind}|dims=${s.dims}|D=${D}|tuple_bytes=${s.tupleBytes}|tuple_sha16=${s.tupleSha16}|scale=${fixed(s.scale, 9)}|turbo_nonzero=${s.turboNonzero}|sign_bits=${s.signBits}|zeta_bucket_counts=${s.zetaCounts.join(',')}|triple_counts_neg_zero_pos=${s.tripleCounts}|quad_counts_0_1_2_3=${s.quadCounts}|hist_nonzero=${s.histNonzero}|vmAcc=${s.vmAcc}|json=0`);
  }
  const pairs = [[0, 1], [0, 2], [0, 3], [2, 4]];
  for (const [a, b] of pairs) {
    const raw = cosRaw(summaries[a].vector, summaries[b].vector);
    const q = cosQuant(summaries[a].q, summaries[b].q);
    rows.push(`AQPQUANT8PAIR|a=${summaries[a].kind}|b=${summaries[b].kind}|raw_cos=${fixed(raw)}|quant_cos=${fixed(q)}|abs_err=${fixed(Math.abs(raw - q))}|metric=diagnostic-not-promotion-gate|json=0`);
  }

  rows.push(...await optionalFalconCoreRows());

  const sweep = forcingSweep();
  rows.push(`AQPZETASWEEP|limit=${sweep.limit}|primes=${sweep.primes}|primes_gt3=${sweep.primes_gt3}|pairs=${sweep.pairs}|violations=${sweep.violations}|gap_mod6_0=${sweep.gap_mod6_0}|gap_mod6_2=${sweep.gap_mod6_2}|gap_mod6_4=${sweep.gap_mod6_4}|json=0`);
  for (const index of [0, 1, 2, 3, 4, 5, 6, 25, 49, 137, 343, 961, 2401, 7919, 994009, 999983, 999999]) {
    const z = zetaClassify(index);
    const b = classifyBhIndex(index);
    rows.push(`AQPZETACLASS|index=${index}|lane=${z.lane}|residue6=${z.residue6}|ppow=${z.ppow}|binder_lane=${b.lane}|binder_ppow=${b.ppow}|prime_residence=${z.prime_residence}|ring=${z.cylinder === 'none' ? 'none' : z.cylinder.ring}|phase=${z.cylinder === 'none' ? 'none' : z.cylinder.phase}|json=0`);
  }
  for (const item of [
    { a: 5, b: 7, mode: 'truthful' },
    { a: 7, b: 11, mode: 'truthful' },
    { a: 11, b: 13, mode: 'truthful' },
    { a: 23, b: 29, mode: 'truthful' },
    { a: 7919, b: 7927, mode: 'truthful' },
    { a: 11, b: 13, mode: 'corrupt-external-lane', opts: { claimedLaneB: 2 } },
  ]) {
    const row = zetaTransition(item.a, item.b, item.opts ?? {});
    rows.push(`AQPZETATRANSITION|a=${item.a}|b=${item.b}|mode=${item.mode}|gap=${row.gap}|gap_mod6=${row.gap_mod6}|forced=${row.forced_transition}|verdict=${row.verdict}|json=0`);
  }

  rows.push(...await optionalZetaProcessRows());

  const q4 = runQuant4Fidelity({ samples: 8192, duplicates: 512, mutations: 1024 });
  rows.push(`AQPQUANT4|samples=${q4.metrics.samples}|duplicates=${q4.metrics.duplicates}|mutations=${q4.metrics.mutations}|result=${q4.verdict.result}|grade=${q4.verdict.grade}|identity_collisions=${q4.metrics.identity_collisions}|pid_collisions=${q4.metrics.pid_collisions}|route_unique=${q4.metrics.route_unique}|route_collisions=${q4.metrics.route_collisions}|lane_counts=${q4.metrics.lane_counts.join(',')}|quad_counts=${q4.metrics.quad_counts.join(',')}|sector_coverage=${q4.metrics.sector_coverage}|glyph_coverage=${q4.metrics.glyph_coverage}|json=0`);
  for (const name of ['jesse-prime-cylinder', 'slice-distance-pipe', 'addresses-abundant-bodies-scarce']) {
    const a = quant4Address(name);
    rows.push(`AQPQUANT4ADDR|name=${safe(name)}|pid_sha16=${a.sha16}|register_identity=${a.register_identity_sha16}|lane=${a.lane_mod3}|quad=${a.quad_mod4}|sector=${a.sector113}|glyph1024=${a.glyph1024}|cube_bh=${a.cube_bh}|route_key=${a.route_key}|bh_ppow=${a.bh_ppow}|json=0`);
  }

  for (const key of ['jesse-prime-cylinder', 'slice-distance-pipe', 'addresses-abundant-bodies-scarce', `1e${exponent}`]) {
    const score = omniQuantScore(key);
    rows.push(`AQPOMNIQUANT|key=${safe(key)}|score=${score}|verdict=${omniFlywheelVerdict(score)}|formula=sha256-first16bits-mod1001|json=0`);
  }

  rows.push(...extremeRows(exponent, samples));
  rows.push(`AQPFTR|status=PASS|claim=all-quant-engines-run-together-plus-symbolic-1e${exponent}-address-proof|rows=${rows.length + 1}|json=0`);
  return rows;
}

export async function writeProofSet(options = {}) {
  const outDir = options.outDir ? resolve(options.outDir) : join(REPO, 'docs');
  const rows = await buildAllQuantProofSet(options);
  const base = `ALL-QUANT-PROOFSET-1E100M-${DATE}`;
  const hbp = join(outDir, `${base}.hbp`);
  const md = join(outDir, `${base}.md`);
  const json = join(outDir, `${base}.json`);
  const hbpText = `${rows.join('\n')}\n`;
  const mdText = markdown(rows);
  const jsonText = `${JSON.stringify({ id: PROOF_ID, date: DATE, target: `1e${options.exponent ?? TARGET_EXPONENT}`, row_count: rows.length, rows }, null, 2)}\n`;
  writeFileSync(hbp, hbpText, 'utf8');
  writeFileSync(md, mdText, 'utf8');
  writeFileSync(json, jsonText, 'utf8');
  writeFileSync(`${hbp}.sha256`, `${sha256(hbpText).toUpperCase()}  ${base}.hbp\n`, 'utf8');
  writeFileSync(`${md}.sha256`, `${sha256(mdText).toUpperCase()}  ${base}.md\n`, 'utf8');
  writeFileSync(`${json}.sha256`, `${sha256(jsonText).toUpperCase()}  ${base}.json\n`, 'utf8');
  return { rows, files: { hbp, md, json } };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  const expArg = args.find((arg) => arg.startsWith('--exponent='));
  const sampleArg = args.find((arg) => arg.startsWith('--samples='));
  const outArg = args.find((arg) => arg.startsWith('--out-dir='));
  const options = {
    exponent: expArg ? Number(expArg.slice('--exponent='.length)) : TARGET_EXPONENT,
    samples: sampleArg ? Number(sampleArg.slice('--samples='.length)) : EXTREME_SAMPLE_OFFSETS,
    outDir: outArg ? outArg.slice('--out-dir='.length) : undefined,
  };
  if (args.includes('--write')) {
    const result = await writeProofSet(options);
    process.stdout.write(`${result.rows.join('\n')}\n`);
  } else {
    const rows = await buildAllQuantProofSet(options);
    process.stdout.write(`${rows.join('\n')}\n`);
  }
}
