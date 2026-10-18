#!/usr/bin/env node
// big-pickle-row-schema.mjs — C4 deliverable.
//
// Per operator 2026-04-29: "big pickle got it down to less than 1k per node".
// This module defines the canonical binary row format for acer-tensor-fabric.mjs
// scaling work, plus reader/writer/smoke-test.
//
// TARGET: < 1024 bytes per row.
// ACTUAL: 148 bytes per row. 22M rows × 148B = 3.25 GB in-memory. Fits 8GB RAM.
//
// Schema layout (little-endian throughout):
//
//   offset  bytes  field
//   ------  -----  -----
//   0       4      magic       "BP1\x00" — Big-Pickle version 1
//   4       4      length      uint32 — total record length in bytes
//   8       47     pid         BEHCS-256 47-byte PID (1 glyph per dim, D1-D47)
//   55      1      d11         uint8 — 0=ASSUMED, 1=OBSERVED, 2=PROVEN, 3=RETRACTED
//   56      4      supervisor  uint32 — index into supervisor catalog
//   60      6×4    node_feats  6 × float32 — node feature vector
//   84      2×4    edge_idx    2 × int32 — (source, target) node indices
//   92      3×4    edge_feats  3 × float32 — edge feature vector
//   104     8      ts_ms       int64 — Unix epoch milliseconds (BigInt)
//   112     4      score       float32 — model prediction score
//   116     16     reserved    16 zero bytes — future expansion
//   132     16     sig_prefix  first 16 bytes of ed25519 sig over preceding 132 bytes
//   --------------
//   total: 148 bytes (well under the 1024-byte cap)
//
// named_agent: liris-big-pickle-row-schema-c4-deliverable

import { createSign, createPrivateKey } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

export const MAGIC = Buffer.from("BP1\x00", "latin1");
export const ROW_SIZE = 148;
export const PID_SIZE = 47;
export const RESERVED_SIZE = 16;
export const SIG_PREFIX_SIZE = 16;

export const D11 = { ASSUMED: 0, OBSERVED: 1, PROVEN: 2, RETRACTED: 3 };
export const D11_NAMES = ["ASSUMED", "OBSERVED", "PROVEN", "RETRACTED"];

// ---------- writer ----------

export function writeRow(row, signerKeyId = null) {
  const buf = Buffer.alloc(ROW_SIZE);
  MAGIC.copy(buf, 0);
  buf.writeUInt32LE(ROW_SIZE, 4);

  if (!Buffer.isBuffer(row.pid) || row.pid.length !== PID_SIZE) {
    throw new Error(`pid must be ${PID_SIZE}-byte Buffer, got ${row.pid?.length}`);
  }
  row.pid.copy(buf, 8);

  buf.writeUInt8(row.d11 & 0xff, 55);
  buf.writeUInt32LE(row.supervisor >>> 0, 56);

  if (!Array.isArray(row.node_feats) || row.node_feats.length !== 6) throw new Error("node_feats must be float[6]");
  for (let i = 0; i < 6; i++) buf.writeFloatLE(row.node_feats[i], 60 + i * 4);

  if (!Array.isArray(row.edge_idx) || row.edge_idx.length !== 2) throw new Error("edge_idx must be int[2]");
  buf.writeInt32LE(row.edge_idx[0] | 0, 84);
  buf.writeInt32LE(row.edge_idx[1] | 0, 88);

  if (!Array.isArray(row.edge_feats) || row.edge_feats.length !== 3) throw new Error("edge_feats must be float[3]");
  for (let i = 0; i < 3; i++) buf.writeFloatLE(row.edge_feats[i], 92 + i * 4);

  const tsMs = typeof row.ts_ms === "bigint" ? row.ts_ms : BigInt(row.ts_ms);
  buf.writeBigInt64LE(tsMs, 104);
  buf.writeFloatLE(row.score, 112);
  // reserved[16] left as zero
  // sig_prefix[16] computed last

  if (signerKeyId) {
    const sig = signRowPrefix(buf.subarray(0, 132), signerKeyId);
    sig.subarray(0, SIG_PREFIX_SIZE).copy(buf, 132);
  }
  return buf;
}

// ---------- reader ----------

export function readRow(buf, offset = 0) {
  if (buf.length - offset < ROW_SIZE) throw new Error(`buffer too small at offset ${offset}: need ${ROW_SIZE}, have ${buf.length - offset}`);
  const magic = buf.subarray(offset, offset + 4);
  if (!magic.equals(MAGIC)) throw new Error(`bad magic at offset ${offset}: ${magic.toString("hex")}`);
  const length = buf.readUInt32LE(offset + 4);
  if (length !== ROW_SIZE) throw new Error(`bad length at offset ${offset}: ${length}`);

  return {
    pid: Buffer.from(buf.subarray(offset + 8, offset + 8 + PID_SIZE)),
    d11: buf.readUInt8(offset + 55),
    d11_name: D11_NAMES[buf.readUInt8(offset + 55)] ?? "?",
    supervisor: buf.readUInt32LE(offset + 56),
    node_feats: Array.from({ length: 6 }, (_, i) => buf.readFloatLE(offset + 60 + i * 4)),
    edge_idx: [buf.readInt32LE(offset + 84), buf.readInt32LE(offset + 88)],
    edge_feats: Array.from({ length: 3 }, (_, i) => buf.readFloatLE(offset + 92 + i * 4)),
    ts_ms: buf.readBigInt64LE(offset + 104),
    score: buf.readFloatLE(offset + 112),
    sig_prefix: Buffer.from(buf.subarray(offset + 132, offset + 132 + SIG_PREFIX_SIZE)),
  };
}

// ---------- ed25519 sig over first 132 bytes ----------

const PKCS8_SEED_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function signRowPrefix(prefixBuf, keyId) {
  const seedPath = join(homedir(), ".asolaria-workers", "ed25519-vault", `${keyId}.private.b64`);
  if (!existsSync(seedPath)) throw new Error(`signer seed not found: ${seedPath}`);
  const seed = Buffer.from(readFileSync(seedPath, "utf-8").trim(), "base64");
  const pkcs8 = Buffer.concat([PKCS8_SEED_PREFIX, seed]);
  const priv = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  const { sign } = require("node:crypto");
  return sign(null, prefixBuf, priv);
}

// ---------- batch helpers ----------

export function writeBatch(rows, signerKeyId = null) {
  const out = Buffer.alloc(rows.length * ROW_SIZE);
  for (let i = 0; i < rows.length; i++) {
    const row = writeRow(rows[i], signerKeyId);
    row.copy(out, i * ROW_SIZE);
  }
  return out;
}

export function readBatch(buf) {
  if (buf.length % ROW_SIZE !== 0) throw new Error(`batch length ${buf.length} not multiple of ${ROW_SIZE}`);
  const count = buf.length / ROW_SIZE;
  const rows = new Array(count);
  for (let i = 0; i < count; i++) rows[i] = readRow(buf, i * ROW_SIZE);
  return rows;
}

// ---------- PID helpers (47-byte Brown-Hilbert encoding) ----------

export function makePid(dimensions) {
  // dimensions: int[47] of glyph indices in [0, 255]
  if (!Array.isArray(dimensions) || dimensions.length !== 47) throw new Error("PID dimensions must be int[47]");
  const buf = Buffer.alloc(PID_SIZE);
  for (let i = 0; i < PID_SIZE; i++) buf[i] = dimensions[i] & 0xff;
  return buf;
}

export function pidToHex(pid) { return pid.toString("hex"); }

// ---------- smoke test ----------

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const sample = {
    pid: makePid(Array.from({ length: 47 }, (_, i) => (i * 7 + 23) & 0xff)),
    d11: D11.PROVEN,
    supervisor: 42,
    node_feats: [0.1, 0.0, 0.0, 0.0, 0.0, 0.0],
    edge_idx: [0, 1],
    edge_feats: [0.5, 0.5, 0.5],
    ts_ms: BigInt(Date.now()),
    score: 0.00313353817909956,
  };
  console.log("=== Big-Pickle <1KB row schema smoke ===");
  console.log(`ROW_SIZE = ${ROW_SIZE} bytes (cap: 1024)`);
  console.log(`Sample input: pid=${pidToHex(sample.pid).slice(0,16)}... supervisor=${sample.supervisor} score=${sample.score}`);

  const written = writeRow(sample);
  console.log(`Written buffer length: ${written.length} bytes`);
  console.log(`First 16 bytes hex: ${written.subarray(0, 16).toString("hex")}`);

  const round = readRow(written);
  const rt = {
    pid_match: round.pid.equals(sample.pid),
    d11_match: round.d11 === sample.d11,
    supervisor_match: round.supervisor === sample.supervisor,
    node_feats_match: round.node_feats.every((v, i) => Math.abs(v - sample.node_feats[i]) < 1e-6),
    edge_idx_match: round.edge_idx[0] === sample.edge_idx[0] && round.edge_idx[1] === sample.edge_idx[1],
    edge_feats_match: round.edge_feats.every((v, i) => Math.abs(v - sample.edge_feats[i]) < 1e-6),
    ts_ms_match: round.ts_ms === sample.ts_ms,
    score_match: Math.abs(round.score - sample.score) < 1e-9,
  };
  const allMatch = Object.values(rt).every(Boolean);
  console.log("Round-trip checks:", JSON.stringify(rt, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
  console.log(`Round-trip overall: ${allMatch ? "PASS" : "FAIL"}`);

  // Batch perf smoke: 100K rows
  const N = 100000;
  const t0 = Date.now();
  const rows = Array.from({ length: N }, (_, i) => ({ ...sample, supervisor: i }));
  const batch = writeBatch(rows);
  const t1 = Date.now();
  const decoded = readBatch(batch);
  const t2 = Date.now();
  console.log(`\nBatch ${N} rows:`);
  console.log(`  bytes total: ${batch.length} (${(batch.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  bytes per row: ${batch.length / N}`);
  console.log(`  write ms: ${t1 - t0}`);
  console.log(`  read ms: ${t2 - t1}`);
  console.log(`  decoded count: ${decoded.length} (expected ${N})`);
  console.log(`  22M-row extrapolation: ${(22_000_000 * ROW_SIZE / 1024 / 1024 / 1024).toFixed(2)} GB total in-memory`);
  process.exit(allMatch ? 0 : 1);
}
