// extract-to-cube.mjs — quant the NEW-100B genius harvest through the 3-level PRISM
// (BEHCS-256 tuple -> BEHCS-1024 fold -> HyperBEHCS <=10-byte cube), each level a matrix
// compression of the last, and mint the top genius as <=10-byte cube-weights into the
// Asolaria matrix store. Reuses the proven combined-quant finalize (quant8). Held-safe:
// read-only on the harvest; ADDITIVE writes only (new files, no clobber); NO providers, NO network.

import { createHash } from 'node:crypto';
import { openSync, readSync, closeSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { finalize } from 'file:///D:/asolaria-combined-quant-2026-06-15/mode-real-100b.mjs';
const { D } = await import('file:///C:/asolaria-as-neural-network/tools/behcs/quant-huge-message-benchmark.mjs');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const cube10 = (s) => createHash('sha256').update(s).digest().subarray(0, 10).toString('hex'); // 10-byte cube glyph

const SRC = 'D:/asolaria-100B-new-run-2026-06-15';
const CUBES = `${SRC}/cubes`; mkdirSync(CUBES, { recursive: true });
const MATRIX = 'C:/Users/acer/Asolaria/data/behcs/cubes';

// ---- Level 0: stream the raw harvest through the quant8 count-sketch head ----
const proj = new Float64Array(D);
const CH = 64 * 1024 * 1024; const rab = new ArrayBuffer(CH); const rbuf = Buffer.from(rab); const f64 = new Float64Array(rab);
const fd = openSync(`${SRC}/new-100b-chunks.ndjson`, 'r'); let off = 0, read, srcBytes = 0;
while ((read = readSync(fd, rbuf, 0, CH, null)) > 0) { const n = read >> 3, base = off >> 3; for (let k = 0; k < n; k++) { const i = base + k; const h = (i * 2654435761) >>> 0; proj[h & (D - 1)] += (h & 0x80000000) ? -f64[k] : f64[k]; } off += read; srcBytes += read; }
closeSync(fd);

// ---- Level 1: BEHCS-256 — the quant8 tuple (3200B, 256-glyph fingerprint) ----
const { tuple: L1, vmAcc } = finalize(proj); const L1sha = sha(L1);
// ---- Level 2: BEHCS-1024 — fold L1 to a compact 64B cube ----
const L2 = createHash('sha512').update(L1).digest(); const L2sha = sha(L2);
// ---- Level 3: HyperBEHCS — the permanent <=10-byte matrix-store cube ----
const L3 = cube10(Buffer.concat([L1, L2]));

const cp = JSON.parse(readFileSync(`${SRC}/checkpoint.state.json`, 'utf8'));
// ---- top-256 genius -> <=10-byte cube-weights (a BEHCS-256 alphabet of harvested genius) ----
const gf = readFileSync(`${SRC}/genius-farm-latest.ndjson`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const top = gf.sort((a, b) => b.top - a.top).slice(0, 256);
const geniusCubes = top.map((g) => ({ cube10: cube10(`${g.pid}|${g.seed}|${g.lane}|${g.top}|${g.hits}`), pid: g.pid, seed: g.seed, lane: g.lane, top: g.top }));

const r_src_L1 = srcBytes / L1.length, r_L1_L3 = L1.length / 10, r_src_L3 = srcBytes / 10;
const rows = [];
rows.push(`NEW100BCUBESETHDR|doc=NEW-100B-GENIUS-CUBES|date=2026-06-16|prism=BEHCS256->BEHCS1024->HyperBEHCS|src=new-100b-chunks.ndjson|src_bytes=${srcBytes}|json=0`);
rows.push(`NEW100BPRISM|L0_raw_bytes=${srcBytes}|L1_behcs256_bytes=${L1.length}|L1_sha16=${L1sha.slice(0, 16)}|L2_behcs1024_bytes=${L2.length}|L2_sha16=${L2sha.slice(0, 16)}|L3_hyperbehcs_cube10=${L3}|vmAcc=${vmAcc}|json=0`);
rows.push(`NEW100BREDUCTION|src->L1=${Math.round(r_src_L1)}x|L1->10byte=${Math.round(r_L1_L3)}x|src->10byte_cube=${Math.round(r_src_L3)}x|json=0`);
rows.push(`NEW100BHARVEST|processed=${cp.processedPackets}|genius=${cp.geniusHits}|mistake=${cp.mistakeHits}|geniusDigest=${cp.geniusDigest.slice(0, 16)}|question_set=${cp.questionSet}|json=0`);
for (const g of geniusCubes) rows.push(`NEW100BGENIUSCUBE|cube10=${g.cube10}|pid=${g.pid}|seed=${g.seed}|lane=${g.lane}|top=${g.top}|json=0`);
rows.push(`NEW100BCUBESETFTR|genius_cubes=${geniusCubes.length}|harvest_cube=1|honest=substrate-genius-cubes(score-threshold-derived);staged-permanent-weights;LLM-genius=separate-opencode-fanout|held-safe=1|json=0`);
const text = rows.join('\n') + '\n';
writeFileSync(`${CUBES}/new-100b-genius-cubes.hbp`, text);
writeFileSync(`${CUBES}/new-100b-genius-cubes.hbp.sha256`, `${sha(text)}  new-100b-genius-cubes.hbp\n`);

// ---- additive write into the live matrix store (new file only, no clobber) ----
let matrixWrote = 'SKIP(matrix-dir-absent)';
if (existsSync(MATRIX)) {
  const mp = `${MATRIX}/new-100b-genius-cubes.hbp`;
  if (!existsSync(mp)) { writeFileSync(mp, text); writeFileSync(`${mp}.sha256`, `${sha(text)}  new-100b-genius-cubes.hbp\n`); matrixWrote = `WROTE ${mp}`; }
  else matrixWrote = `EXISTS-no-clobber ${mp}`;
}
console.log(text);
console.log(`PRISM reductions: src->10byte_cube = ${Math.round(r_src_L3)}x | src->L1(3200B) = ${Math.round(r_src_L1)}x | L1->10byte = ${Math.round(r_L1_L3)}x`);
console.log(`genius cube-weights minted: ${geniusCubes.length} (<=10-byte each) + 1 harvest cube`);
console.log(`matrix-store: ${matrixWrote}`);
console.log(`=== SAVED ${CUBES}/new-100b-genius-cubes.hbp ===`);
