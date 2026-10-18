#!/usr/bin/env node
// reassemble-and-byte-verify-gslgnn-v2-checkpoint.mjs
//
// Pulls the 6 chunk envelopes from acer:4947 inbox, decodes b64, concatenates
// in chunk_index order, sha-verifies against acer-reported sha
// 9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c.
// Writes verified bytes to services/gnn-sidecar/gslgnn-trained-2026-04-29.pt
// + dispatches BYTE-VERIFIED ack to acer.

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ACER_INBOX = "http://192.168.100.1:4947/behcs/inbox";
const EXPECTED_SHA = "9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c";
const OUTPUT_PATH = "C:/Users/rayss/Asolaria/services/gnn-sidecar/gslgnn-trained-2026-04-29.pt";
const SCRIPT_OUTPUT = "C:/Users/rayss/Asolaria/services/gnn-sidecar/train_gslgnn_w9_3.py";
const MANIFEST_OUTPUT = "C:/Users/rayss/Asolaria/services/gnn-sidecar/gslgnn-v2-manifest.json";

const httpGet = (url) => new Promise((resolve) => {
  const u = new URL(url);
  const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: "GET", timeout: 30000 },
    (res) => { let b = ""; res.on("data", c => b += c); res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
  req.on("error", e => resolve({ error: e.message }));
  req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
  req.end();
});

const httpPost = (url, body) => new Promise((resolve) => {
  const u = new URL(url);
  const req = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 },
    (res) => { let b = ""; res.on("data", c => b += c); res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, body: b }); } }); });
  req.on("error", e => resolve({ error: e.message }));
  req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
  req.write(body); req.end();
});

console.log("[1/5] querying acer bus for chunk envelopes ...");
const inboxResp = await httpGet(`${ACER_INBOX}?target=liris&limit=200`);
const messages = inboxResp.body?.messages ?? [];
console.log(`  inbox returned ${messages.length} envelopes addressed to liris`);

// Find checkpoint chunks: kind=binary_checkpoint OR verb contains BINARY-CHECKPOINT
const chunks = messages.filter(m => {
  const v = (m.verb || "").toUpperCase();
  const t = (m.type || "").toUpperCase();
  const k = (m.payload?.kind || "").toString().toLowerCase();
  return (v.includes("BINARY") || v.includes("CHECKPOINT") || t.includes("BINARY") || k.includes("binary_checkpoint") || k.includes("binary"))
    && (m.payload?.chunk_index !== undefined || m.payload?.chunk_b64 || m.payload?.b64);
});

console.log(`  found ${chunks.length} candidate checkpoint chunks`);
chunks.forEach(c => console.log(`    ${c.id.slice(0, 16)} chunk_index=${c.payload?.chunk_index} kind=${c.payload?.kind}`));

if (chunks.length < 6) {
  // Search broader: try by sha-prefix in payload
  const broad = messages.filter(m => JSON.stringify(m.payload || {}).includes("9e50723b"));
  console.log(`  broader search: ${broad.length} envelopes mention sha 9e50723b`);
  broad.forEach(c => console.log(`    ${c.id.slice(0, 16)} verb=${c.verb} kind=${c.payload?.kind} chunk_index=${c.payload?.chunk_index}`));
}

if (chunks.length === 0) {
  console.log("[FATAL] no chunk envelopes visible in current inbox. Likely rotated to archives. Asking acer to re-dispatch is the next step.");
  process.exit(1);
}

console.log("\n[2/5] sorting chunks by chunk_index + concatenating ...");
chunks.sort((a, b) => (a.payload.chunk_index || 0) - (b.payload.chunk_index || 0));
const buffers = [];
for (const c of chunks) {
  const b64 = c.payload.chunk_b64 || c.payload.b64 || c.payload.bytes_b64 || c.payload.content_b64;
  if (!b64) { console.log(`  WARN chunk ${c.id.slice(0, 16)} has no b64 field; payload keys: ${Object.keys(c.payload || {}).join(",")}`); continue; }
  buffers.push(Buffer.from(b64, "base64"));
  console.log(`  chunk_${c.payload.chunk_index}: ${buffers[buffers.length - 1].length} bytes`);
}
const reassembled = Buffer.concat(buffers);
console.log(`  total reassembled: ${reassembled.length} bytes`);

console.log("\n[3/5] computing sha256 + comparing ...");
const computedSha = crypto.createHash("sha256").update(reassembled).digest("hex");
console.log(`  expected: ${EXPECTED_SHA}`);
console.log(`  computed: ${computedSha}`);
const shaMatch = computedSha === EXPECTED_SHA;
console.log(`  byte-verified: ${shaMatch ? "YES ✓" : "NO ✗"}`);

if (shaMatch) {
  console.log("\n[4/5] writing verified bytes to disk ...");
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, reassembled);
  console.log(`  wrote ${OUTPUT_PATH} (${reassembled.length} bytes)`);
}

// Find + write the script + manifest if available
const scriptEnv = messages.find(m => (m.payload?.filename || "").includes("train_gslgnn_w9_3"));
const manifestEnv = messages.find(m => (m.payload?.filename || "").includes("manifest") || (m.payload?.kind || "").includes("manifest"));
if (scriptEnv?.payload?.content) {
  fs.writeFileSync(SCRIPT_OUTPUT, scriptEnv.payload.content);
  console.log(`  wrote script ${SCRIPT_OUTPUT} (${scriptEnv.payload.content.length} bytes)`);
}
if (manifestEnv?.payload?.content) {
  fs.writeFileSync(MANIFEST_OUTPUT, typeof manifestEnv.payload.content === "string" ? manifestEnv.payload.content : JSON.stringify(manifestEnv.payload.content, null, 2));
  console.log(`  wrote manifest ${MANIFEST_OUTPUT}`);
}

console.log("\n[5/5] dispatching BYTE-VERIFIED ack to acer ...");
const ts = new Date().toISOString();
const ackPayload = {
  vote_kind: "LIRIS_GSLGNN_V2_CHECKPOINT_BYTE_VERIFIED_ACK",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  expected_sha: EXPECTED_SHA,
  computed_sha: computedSha,
  byte_verified: shaMatch,
  reassembled_bytes: reassembled.length,
  chunks_used: chunks.length,
  chunk_envelope_ids: chunks.map(c => c.id),
  output_path_liris: OUTPUT_PATH,
  next_action_if_match: "Stand up liris gslgnn_inference_server.py at liris:4793 with verified bytes; functional-verify via score-byte-match on identical input graph.",
  fabric_canon_seq: 45,
  three_keys_status: shaMatch ? "GSLGNN_V2_BYTE_VERIFIED_BILATERAL" : "BYTE_VERIFY_FAILED_INVESTIGATE_DRIFT",
};
const envId = crypto.createHash("sha256").update("liris-byte-verify-ack-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_BYTE_VERIFY_ACK", verb: "EVT-LIRIS-GSLGNN-V2-BYTE-VERIFY-ACK", payload: ackPayload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts, from: env.from, to: env.to, type: env.type, verb: env.verb, byte_verified: shaMatch, sha: computedSha };
const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
const body = JSON.stringify({ ...env, body: { signed_envelope } });
const result = await httpPost(ACER_BUS, body);
console.log(`  envelope ${envId} status=${result.status} ${JSON.stringify(result.body).slice(0, 150)}`);
console.log(`\n=== DONE — byte_verified=${shaMatch} ===`);
