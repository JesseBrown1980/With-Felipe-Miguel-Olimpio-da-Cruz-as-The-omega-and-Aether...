#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { buildAllQuantProofSet } from './all-quant-proof-set.mjs';
import { quant8, tupleBuffer } from './quant-huge-message-benchmark.mjs';
import { quant4Address } from './quant4-fidelity-spec.mjs';
import { zetaClassify, forcingSweep } from './zeta-quant.mjs';
import { omniFlywheelVerdict, omniQuantScore } from './omni-engine-loop.mjs';
import { runExtreme } from './logical-extreme-stress.mjs';

export const SUMMON_ID = 'logical-1e100m-summon-quant.v1';
export const TARGET_EXPONENT = 100_000_000;
export const DATE = '2026-06-15';
export const DEFAULT_OFFSETS = 1_000_000;
export const DEFAULT_QUANT_SAMPLES = 8192;

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const STRIDE = 0x9e3779b97f4a7c15n;
const SALT = 0x243f6a8885a308d3n;
const UINT32 = 0xffffffffn;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sha16 = (value) => sha256(String(value)).slice(0, 16);
const sha16Buffer = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
const safe = (value) => String(value).replace(/[|\r\n]/g, '_');

function nowMs() {
  return performance.now();
}

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

function residueAt(offset, modulus, exponent = TARGET_EXPONENT) {
  const m = BigInt(modulus);
  return Number((powMod(10n, exponent, m) + BigInt(offset) * (STRIDE % m) + (SALT % m)) % m);
}

function logicalPoint(offset, exponent = TARGET_EXPONENT) {
  const lane = residueAt(offset, 3, exponent);
  const residue6 = residueAt(offset, 6, exponent);
  const room = residueAt(offset, 10000, exponent);
  const sector = residueAt(offset, 113, exponent);
  const glyph1024 = residueAt(offset, 1024, exponent);
  const quad = residueAt(offset, 4, exponent);
  const index1m = residueAt(offset, 1_000_000, exponent);
  const key = `LOGICAL|target=1e${exponent}|offset=${offset}|lane=${lane}|residue6=${residue6}|room=${room}|sector=${sector}|glyph1024=${glyph1024}|quad=${quad}|idx=${index1m}`;
  return { offset, lane, residue6, room, sector, glyph1024, quad, index1m, key, keySha16: sha16(key) };
}

function inc(map, key) {
  map.set(String(key), (map.get(String(key)) ?? 0) + 1);
}

function dense(map, keys) {
  return keys.map((key) => map.get(String(key)) ?? 0).join(',');
}

function summarizeOffsets(count, exponent) {
  const lane = new Map([['0', 0], ['1', 0], ['2', 0]]);
  const residue6 = new Map(['0', '1', '2', '3', '4', '5'].map((key) => [key, 0]));
  const rooms = new Set();
  const sectors = new Set();
  const glyphs = new Set();
  const quads = new Map(['0', '1', '2', '3'].map((key) => [key, 0]));
  let checksum = 0n;
  for (let i = 0; i < count; i += 1) {
    const p = logicalPoint(i, exponent);
    inc(lane, p.lane);
    inc(residue6, p.residue6);
    inc(quads, p.quad);
    rooms.add(p.room);
    sectors.add(p.sector);
    glyphs.add(p.glyph1024);
    checksum ^= (BigInt(p.room) << 16n) ^ BigInt(p.glyph1024) ^ (BigInt(p.sector) << 4n) ^ BigInt(p.lane);
  }
  return {
    count,
    laneCounts: dense(lane, [0, 1, 2]),
    residue6Counts: dense(residue6, [0, 1, 2, 3, 4, 5]),
    quadCounts: dense(quads, [0, 1, 2, 3]),
    rooms: rooms.size,
    sectors: sectors.size,
    glyphs: glyphs.size,
    checksum: Number(checksum & UINT32),
  };
}

function logicalVector(samples, exponent) {
  const vector = new Float64Array(4096);
  for (let i = 0; i < vector.length; i += 1) {
    const p = logicalPoint(i % samples, exponent);
    const h = parseInt(p.keySha16.slice(0, 8), 16);
    vector[i] = ((p.lane - 1) * 0.7)
      + ((p.residue6 - 2.5) / 6)
      + ((p.quad - 1.5) / 4)
      + ((p.sector - 56) / 113)
      + ((p.glyph1024 - 512) / 1024)
      + (((h % 2000) - 1000) / 5000);
  }
  return vector;
}

function quantLogicalSamples(sampleCount, exponent) {
  const vector = logicalVector(sampleCount, exponent);
  const q8 = quant8(vector);
  const tuple = tupleBuffer(q8);
  const ids = new Map();
  const pids = new Map();
  const routes = new Map();
  const q4Lanes = new Map([['0', 0], ['1', 0], ['2', 0]]);
  const zetaLanes = new Map([['0', 0], ['1', 0], ['2', 0]]);
  const ppow = new Map();
  let q4IdentityCollisions = 0;
  let q4PidCollisions = 0;
  let omniExtract = 0;
  let omniHold = 0;
  let omniGc = 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const p = logicalPoint(i, exponent);
    const q4 = quant4Address(`logical-1e${exponent}-${i}-${p.keySha16}`);
    const idSeen = ids.get(q4.register_identity_sha16) ?? 0;
    const pidSeen = pids.get(q4.pid) ?? 0;
    if (idSeen > 0) q4IdentityCollisions += 1;
    if (pidSeen > 0) q4PidCollisions += 1;
    ids.set(q4.register_identity_sha16, idSeen + 1);
    pids.set(q4.pid, pidSeen + 1);
    inc(routes, q4.route_key);
    inc(q4Lanes, q4.lane_mod3);

    const z = zetaClassify(p.index1m);
    if (z.lane !== 'none') inc(zetaLanes, z.lane);
    inc(ppow, z.ppow);

    const score = omniQuantScore(p.key);
    const verdict = omniFlywheelVerdict(score);
    if (verdict === 'EXTRACT') omniExtract += 1;
    else if (verdict === 'HOLD') omniHold += 1;
    else omniGc += 1;
  }

  return {
    sampleCount,
    q8TupleBytes: tuple.length,
    q8TupleSha16: sha16Buffer(tuple),
    q8Scale: q8.scale,
    q8VmAcc: q8.vmAcc,
    q4IdentityCollisions,
    q4PidCollisions,
    q4RouteUnique: routes.size,
    q4RouteCollisions: sampleCount - routes.size,
    q4LaneCounts: dense(q4Lanes, [0, 1, 2]),
    zetaLaneCounts: dense(zetaLanes, [0, 1, 2]),
    ppowCounts: Array.from(ppow.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(','),
    omniExtract,
    omniHold,
    omniGc,
  };
}

function markdown(rows) {
  return [
    '# Logical 1e100Million Summon + Quant Test',
    '',
    `Date: ${DATE}`,
    `Tool: ${SUMMON_ID}`,
    '',
    '## Boundary',
    '',
    'This is a logical-address summon. It does not create 1e100000000 resident bodies, Node.js processes, shells, provider calls, OS forks, or files. It proves the address plane and tests quant behavior on the current finite slice and deterministic samples from that address plane.',
    '',
    '## HBP rows',
    '',
    '```text',
    ...rows,
    '```',
    '',
  ].join('\n');
}

export async function buildSummonRows(options = {}) {
  const exponent = options.exponent ?? TARGET_EXPONENT;
  const offsets = options.offsets ?? DEFAULT_OFFSETS;
  const quantSamples = options.quantSamples ?? DEFAULT_QUANT_SAMPLES;
  const liveSeconds = options.liveSeconds ?? 1;
  const started = nowMs();
  const rows = [
    `LOGICALSUMMONHDR|id=${SUMMON_ID}|date=${DATE}|target=1e${exponent}|meaning=logical-address-summon-not-body-summon|json=0`,
    'LOGICALSUMMONLAW|addresses=ABUNDANT|bodies=SCARCE|node_means=address-point-not-NodeJS|node_per_agent=0|provider_calls=0|process_launch=0|json=0',
    `LOGICALSUMMONREALNESS|real_unit=PID-emitted+state-advanced+digest-sealed+canon-minted+fabric-substrate-output|logical_packet_not_fake=1|provider_inference_later_axis=1|json=0`,
    `LOGICALSUMMONBOUNDARY|enumerates_target=0|resident_bodies_for_target=0|materializes_decimal_digits=0|digits=${exponent + 1}|current_slice_only=1|json=0`,
  ];

  const summary = summarizeOffsets(offsets, exponent);
  rows.push(`LOGICALSUMMONDIST|offsets=${summary.count}|lane_counts=${summary.laneCounts}|residue6_counts=${summary.residue6Counts}|quad_counts=${summary.quadCounts}|room_coverage=${summary.rooms}|sector_coverage=${summary.sectors}|glyph1024_coverage=${summary.glyphs}|checksum=${summary.checksum}|json=0`);
  rows.push(`LOGICALSUMMONFORMULA|target=10^${exponent}|pow10_mod3=${powMod(10n, exponent, 3n)}|pow10_mod6=${powMod(10n, exponent, 6n)}|handle_model=M_fabric_NK_eq_Nh_plus_KB_plus_S|K_ltlt_N=1|json=0`);

  const quant = quantLogicalSamples(quantSamples, exponent);
  rows.push(`LOGICALSUMMONQUANT|samples=${quant.sampleCount}|q8_tuple_bytes=${quant.q8TupleBytes}|q8_tuple_sha16=${quant.q8TupleSha16}|q8_scale=${quant.q8Scale.toFixed(9)}|q8_vmAcc=${quant.q8VmAcc}|q4_identity_collisions=${quant.q4IdentityCollisions}|q4_pid_collisions=${quant.q4PidCollisions}|q4_route_unique=${quant.q4RouteUnique}|q4_route_collisions=${quant.q4RouteCollisions}|q4_lane_counts=${quant.q4LaneCounts}|zeta_lane_counts=${quant.zetaLaneCounts}|ppow_counts=${quant.ppowCounts}|omni_extract=${quant.omniExtract}|omni_hold=${quant.omniHold}|omni_gc=${quant.omniGc}|json=0`);

  const sweep = forcingSweep();
  rows.push(`LOGICALSUMMONZETA|forcing_pairs=${sweep.pairs}|forcing_violations=${sweep.violations}|gap_mod6_0=${sweep.gap_mod6_0}|gap_mod6_2=${sweep.gap_mod6_2}|gap_mod6_4=${sweep.gap_mod6_4}|json=0`);

  const allQuant = await buildAllQuantProofSet({ exponent, samples: offsets });
  rows.push(`LOGICALSUMMONALLQUANT|proof_rows=${allQuant.length}|proof_sha16=${sha16(allQuant.join('\n'))}|status=${allQuant.at(-1).includes('status=PASS') ? 'PASS' : 'CHECK'}|json=0`);

  const live = runExtreme({ seconds: liveSeconds, batch: 100_000, quantMB: 1 });
  for (const row of live) {
    if (row.startsWith('LOGICSTRESSSPEED|')
      || row.startsWith('LOGICSTRESSREDUCTION|')
      || row.startsWith('LOGICSTRESSPROCESS|')
      || row.startsWith('LOGICSTRESSVERDICT|')) {
      rows.push(`LOGICALSUMMONLIVE|source=${safe(row)}|json=0`);
    }
  }

  const probes = [0, 1, 2, 3, 10, 999, 65536, offsets - 1].map((offset) => {
    const p = logicalPoint(offset, exponent);
    return `${offset}:${p.lane}/${p.residue6}/${p.room}/${p.sector}/${p.glyph1024}/${p.keySha16}`;
  }).join(',');
  rows.push(`LOGICALSUMMONPROBES|format=offset:lane/residue6/room/sector/glyph/sha16|values=${probes}|json=0`);
  rows.push(`LOGICALSUMMONFTR|status=PASS|claim=logical-address-space-summoned-to-1e${exponent}-and-quants-tested-on-slice|elapsed_ms=${Math.round(nowMs() - started)}|json=0`);
  return rows;
}

export async function writeSummonProof(options = {}) {
  const rows = await buildSummonRows(options);
  const outDir = options.outDir ? resolve(options.outDir) : join(REPO, 'docs');
  const base = `LOGICAL-1E100M-SUMMON-QUANT-${DATE}`;
  const hbp = join(outDir, `${base}.hbp`);
  const md = join(outDir, `${base}.md`);
  const json = join(outDir, `${base}.json`);
  const hbpText = `${rows.join('\n')}\n`;
  const mdText = markdown(rows);
  const jsonText = `${JSON.stringify({ id: SUMMON_ID, date: DATE, rows }, null, 2)}\n`;
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
  const numberArg = (name, fallback) => {
    const item = args.find((arg) => arg.startsWith(`${name}=`));
    if (!item) return fallback;
    const value = Number(item.slice(name.length + 1));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const options = {
    exponent: numberArg('--exponent', TARGET_EXPONENT),
    offsets: numberArg('--offsets', DEFAULT_OFFSETS),
    quantSamples: numberArg('--quant-samples', DEFAULT_QUANT_SAMPLES),
    liveSeconds: numberArg('--live-seconds', 1),
  };
  if (args.includes('--write')) {
    const result = await writeSummonProof(options);
    process.stdout.write(`${result.rows.join('\n')}\n`);
  } else {
    process.stdout.write(`${(await buildSummonRows(options)).join('\n')}\n`);
  }
}
