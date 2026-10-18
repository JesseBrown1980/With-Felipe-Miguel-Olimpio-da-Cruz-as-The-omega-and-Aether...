#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, openSync, writeSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

// 8-quant huge-message benchmark: measures the HEAD tax (encode) against the
// TAIL gains (hash / store / compare on the constant-size tuple). The stages
// are FAITHFUL-TO-DOCTRINE implementations of the 8 quant engines (Polar,
// Turbo, JL, Zeta, Triple, Quadruple, JS-histogram, von-Mangoldt), NOT the
// fabric's shipped engine bindings -- the live fabric derives scalar quants
// per PID from hashes, a different and cheaper path. Fidelity is UNSWEPT:
// JL theory bounds compare distortion, but no distortion sweep has been
// sealed, so no gate may trust quant-space similarity yet.

export const D = 1024; // JL output dimensionality -- fixes tuple size ~3.1KB

export const CALIBRATION_ROWS = Object.freeze([
  'QUANTBENCHHDR|tool=quant-huge-message-benchmark.mjs|purpose=measure-head-tax-vs-tail-gains-of-8-stage-quant-on-large-messages|default=definition-rows-only-no-allocation-no-disk|json=0',
  'QUANTBENCHSCOPE|stages=JL+Turbo+Polar+Zeta+Triple+Quadruple+JS-histogram+von-Mangoldt|status=FAITHFUL_TO_DOCTRINE_NOT_FABRIC_ENGINE_BINDING|fidelity=UNSWEPT|json=0',
  'QUANTBENCHRESULT|message=1MB|head_ms=1.3|sha_gain=62x|write_gain=2x|compare_gain=8x|payload=3.1KB|host=acer|node=v24.13.1|json=0',
  'QUANTBENCHRESULT|message=64MB|head_ms=25.2|sha_gain=4774x|write_gain=158x|compare_gain=166x|payload=3.1KB|host=acer|node=v24.13.1|json=0',
  'QUANTBENCHRESULT|message=256MB|head_ms=123|sha_gain=10239x|write_gain=637x|compare_gain=210x|e2e_gain=8.1x|host=acer|node=v24.13.1|json=0',
  'QUANTBENCHRESULT|message=1024MB|head_ms=574|sha_gain=66158x|write_gain=2881x|compare_gain=1781x|e2e_gain=6.8x|host=acer|node=v24.13.1|json=0',
  'QUANTBENCHRESULT|message=2048MB|head_ms=1062|sha_gain=79303x|write_gain=4662x|compare_gain=1698x|e2e_gain=7.2x|ingest=1928MBps|host=acer|node=v24.13.1|json=0',
  'QUANTBENCHHEADRATE|encode_flat=1.8-to-2.1GBps-from-256MB-to-2GB|meaning=head-tax-is-exactly-linear-never-degrades|json=0',
  'QUANTBENCHAPILIMIT|finding=raw-2GB-message-breaks-node-single-shot-sha256(ERR_OUT_OF_RANGE-2^31-limit)|quant-tuple=never-hits-API-limits|json=0',
  'QUANTBENCHRETENTION|raw=7-messages-of-2GB-fit-16GB-RAM|quant=~5M-tuples-of-3.1KB-fit-16GB-RAM|meaning=GC-envelope-economics-at-message-layer|json=0',
  'QUANTLAW_DRAFT|head=O(size)-paid-once|tail=O(1)-per-consumer|rule=quant-converts-size-tail-cost-to-constant-tuple-cost|status=DRAFT_UNTIL_LIRIS_RERUN_AND_FIDELITY_SWEEP|json=0',
  'QUANTBENCHFTR|rule=probe-overrules-frame|live_run=pass---run-to-measure-current-machine|json=0',
]);

// precomputed von-Mangoldt class table for bucket indices
const PPOW = (() => {
  const t = new Uint8Array(D);
  const isP = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false; return true; };
  for (let n = 2; n < D; n += 1) {
    if (isP(n)) { t[n] = 1; continue; }
    for (let p = 2; p * p <= n; p += 1) {
      if (!isP(p)) continue;
      let m = n; let k = 0;
      while (m % p === 0) { m /= p; k += 1; }
      if (m === 1) { t[n] = k > 3 ? 5 : k + 1; break; }
    }
  }
  return t;
})();

export function quant8(msg) {
  const proj = new Float64Array(D);
  for (let i = 0; i < msg.length; i += 1) {              // JL count-sketch O(N)
    const h = (i * 2654435761) >>> 0;
    proj[h & (D - 1)] += (h & 0x80000000) ? -msg[i] : msg[i];
  }
  let max = 1e-12;
  for (let j = 0; j < D; j += 1) { const a = Math.abs(proj[j]); if (a > max) max = a; }
  const turbo = new Int8Array(D);
  const signs = new Uint8Array(D >> 3);
  const zeta = new Uint8Array(D);
  const triple = new Int8Array(D);
  const quad = new Uint8Array(D);
  const hist = new Uint32Array(256);
  let vmAcc = 0;
  for (let j = 0; j < D; j += 1) {
    const v = proj[j] / max;
    const q = Math.round(v * 127);
    turbo[j] = q;                                                        // Turbo int8
    if (v < 0) signs[j >> 3] |= (1 << (j & 7));                          // Polar sign
    const a = Math.abs(v);
    zeta[j] = a < 1e-9 ? 15 : Math.min(15, -Math.log2(a) | 0);           // Zeta log bucket
    triple[j] = v > 0.33 ? 1 : (v < -0.33 ? -1 : 0);                     // Triple
    quad[j] = v > 0.5 ? 3 : v > 0 ? 2 : v > -0.5 ? 1 : 0;                // Quadruple
    hist[(q + 128) & 255] += 1;                                          // JS histogram
    if (q !== 0) vmAcc += PPOW[j];                                       // von-Mangoldt
  }
  return { turbo, signs, zeta, triple, quad, hist, vmAcc, scale: max };
}

export function tupleBuffer(q) {
  return Buffer.concat([
    Buffer.from(q.turbo.buffer), Buffer.from(q.signs.buffer),
    Buffer.from(q.zeta.buffer), Buffer.from(q.hist.buffer),
  ]);
}

function dotRaw(a, b) { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s; }
function dotQ(qa, qb) { let s = 0; for (let j = 0; j < D; j += 1) s += qa.turbo[j] * qb.turbo[j]; return s * qa.scale * qb.scale / 16129; }
function ms(f) { const t = performance.now(); f(); return performance.now() - t; }
function fill(arr, seed) { let s = seed >>> 0; for (let i = 0; i < arr.length; i += 1) { s = (s * 1664525 + 1013904223) >>> 0; arr[i] = (s / 2147483648) - 1; } }

const CHUNK = 1 << 28; // raw paths above 2GB are FORCED into chunking by Node API limits
function shaChunked(buf) { const h = createHash('sha256'); for (let o = 0; o < buf.length; o += CHUNK) h.update(buf.subarray(o, Math.min(o + CHUNK, buf.length))); return h.digest(); }
function writeChunked(file, buf) { const fd = openSync(file, 'w'); for (let o = 0; o < buf.length; o += CHUNK) writeSync(fd, buf.subarray(o, Math.min(o + CHUNK, buf.length))); closeSync(fd); }

export function runLiveBenchmark(options = {}) {
  const sizesMB = options.sizesMB ?? [64];
  const disk = options.disk ?? false;
  const rows = [`QUANTBENCHLIVEHDR|sizes_mb=${sizesMB.join('+')}|disk=${disk ? 1 : 0}|D=${D}|json=0`];
  const tmp = disk ? mkdtempSync(join(tmpdir(), 'quant-bench-')) : null;
  for (const mb of sizesMB) {
    const dims = Math.floor(mb * 1048576 / 8);
    const msg = new Float64Array(dims); fill(msg, 12345);
    const ref = new Float64Array(dims); fill(ref, 99999);
    let q; let qr;
    const head = ms(() => { q = quant8(msg); qr = quant8(ref); }) / 2;
    const rawBuf = Buffer.from(msg.buffer);
    const qBuf = tupleBuffer(q);
    const hashRaw = ms(() => shaChunked(rawBuf));
    const hashQ = ms(() => createHash('sha256').update(qBuf).digest());
    let wRaw = 0; let wQ = 0;
    if (disk) {
      const f1 = join(tmp, 'raw.bin'); const f2 = join(tmp, 'q.bin');
      wRaw = ms(() => writeChunked(f1, rawBuf));
      wQ = ms(() => writeFileSync(f2, qBuf));
      rmSync(f1, { force: true }); rmSync(f2, { force: true });
    }
    const cmpRaw = ms(() => dotRaw(msg, ref));
    const cmpQ = ms(() => dotQ(q, qr));
    rows.push(`QUANTBENCHLIVE|message_mb=${mb}|head_ms=${head.toFixed(1)}|sha_raw_ms=${hashRaw.toFixed(1)}|sha_q_ms=${hashQ.toFixed(3)}|write_raw_ms=${wRaw.toFixed(1)}|write_q_ms=${wQ.toFixed(3)}|cmp_raw_ms=${cmpRaw.toFixed(1)}|cmp_q_ms=${cmpQ.toFixed(3)}|payload_kb=${(qBuf.length / 1024).toFixed(1)}|json=0`);
  }
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  rows.push('QUANTBENCHLIVEFTR|note=live-rates-are-machine-and-load-dependent-seal-output-in-a-receipt-before-claim-upgrade|json=0');
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--run')) {
    const sizeArg = args.find((a) => a.startsWith('--sizes='));
    const sizesMB = sizeArg ? sizeArg.slice(8).split(',').map(Number).filter((n) => n > 0) : [64];
    process.stdout.write(`${runLiveBenchmark({ sizesMB, disk: args.includes('--disk') }).join('\n')}\n`);
  } else {
    process.stdout.write(`${CALIBRATION_ROWS.join('\n')}\n`);
  }
}
