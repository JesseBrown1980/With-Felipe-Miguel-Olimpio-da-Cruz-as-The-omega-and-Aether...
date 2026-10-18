#!/usr/bin/env node
// gnn-score-gate.mjs — GNN-sidecar score gate in front of gnn-dispatch-bridge.
//
// Per acer W7-10 honest finding: the cascade is a binary anomaly classifier,
// NOT a verb predictor. Heuristic stays for verb generation; GNN gates by score.
//
// Sidecar: services/gnn-sidecar/inference_server.py (POST :4792/infer)
//   payload: { nodes:[[6-dim]...], edges:[[src,dst]...], edge_features:[[3-dim]...] }
//   reply:   { scores:[float...], ok:true }  // sigmoid logits per edge → anomaly prob
//
// ADR-0010 fallback contract: if sidecar unreachable / errors / malformed →
//   log warning, return allow=true, reason="fallback-heuristic-only" (don't halt loop).
//
// named_agent: liris-cascade-W8-2-gnn-sidecar-bridge-wireup

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const SIDECAR_HOST = "127.0.0.1";
const SIDECAR_PORT = 4792;
const SIDECAR_PATH = "/infer";
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_TIMEOUT_MS = 5000;
const LOG_PATH = "C:/Users/rayss/Asolaria/data/behcs/state/gnn-score-gate.log.ndjson";

// ─── feature mapping (heuristic, deterministic) ───────────────────────────
// Map a prediction → 6-dim node feature + 3-dim edge feature.
// Using stable hash of pid + verb so the same prediction always hashes to the
// same vector; sidecar receives a 2-node / 1-edge minimal graph.
function hashTo01(s, salt) {
  // simple FNV-1a 32-bit, normalize to [0,1]
  let h = 0x811c9dc5 ^ (salt | 0);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 10000) / 10000;
}

function predictionToGraph(prediction) {
  const pid = String(prediction.pid ?? "");
  const verb = String(prediction.verb ?? prediction.predicted_verb ?? "");
  const d11 = String(prediction.d11 ?? "ASSUMED");
  const idem = prediction.idempotent === true ? 1.0 : 0.0;
  // 6-dim node 0 (PID-side): hashed PID buckets + d11-encoding
  const nodeA = [
    hashTo01(pid, 1),
    hashTo01(pid, 2),
    hashTo01(pid, 3),
    d11 === "PROVEN" ? 1.0 : d11 === "OBSERVED" ? 0.5 : 0.0,
    idem,
    pid.startsWith("BH.OPERATIONAL.") ? 1.0 : 0.0,
  ];
  // 6-dim node 1 (verb-side): hashed verb buckets + verb-class hints
  const nodeB = [
    hashTo01(verb, 11),
    hashTo01(verb, 12),
    hashTo01(verb, 13),
    verb.includes("WIPE") || verb.includes("FORCE") || verb.includes("SEVER") ? 1.0 : 0.0,
    verb.includes("FABRIC") || verb.includes("QUERY") ? 1.0 : 0.0,
    verb.startsWith("EVT-") ? 1.0 : 0.0,
  ];
  // 3-dim edge feature: pid×verb cross-hash + parity bits
  const edgeF = [
    hashTo01(pid + "→" + verb, 21),
    hashTo01(pid + "→" + verb, 22),
    (idem + (d11 === "PROVEN" ? 1.0 : 0.0)) / 2.0,
  ];
  return { nodes: [nodeA, nodeB], edges: [[0, 1]], edge_features: [edgeF] };
}

function appendLog(row) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch (_) { /* best-effort */ }
}

function postInfer(payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = http.request({
      host: SIDECAR_HOST, port: SIDECAR_PORT, path: SIDECAR_PATH, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: timeoutMs,
    }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try { resolve({ ok: true, status: res.statusCode, body: JSON.parse(buf) }); }
        catch (e) { resolve({ ok: false, status: res.statusCode, error: "json-parse:" + e.message, raw: buf.slice(0, 200) }); }
      });
    });
    req.on("error", (e) => resolve({ ok: false, error: e.code || e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
    req.write(body); req.end();
  });
}

// ─── main API ─────────────────────────────────────────────────────────────
export async function gnnScoreGate(prediction, opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ts = new Date().toISOString();
  let result;
  try {
    const graph = predictionToGraph(prediction);
    const reply = await postInfer(graph, timeoutMs);
    if (!reply.ok) {
      result = { allow: true, score: null, reason: `fallback-heuristic-only:sidecar-${reply.error || "unreachable"}`, fallback: true };
    } else if (!reply.body || reply.body.ok !== true || !Array.isArray(reply.body.scores) || reply.body.scores.length === 0) {
      result = { allow: true, score: null, reason: `fallback-heuristic-only:malformed-reply`, fallback: true, raw: reply.body };
    } else {
      const score = Number(reply.body.scores[0]);
      // sigmoid → anomaly prob; allow when below threshold
      const prob = 1 / (1 + Math.exp(-score));
      result = {
        allow: prob < threshold, score: prob, raw_logit: score, threshold,
        reason: prob < threshold ? "gnn-allow-below-threshold" : "gnn-deny-above-threshold-downgrade-T2",
        fallback: false,
      };
    }
  } catch (e) {
    result = { allow: true, score: null, reason: `fallback-heuristic-only:exception:${e.message}`, fallback: true };
  }
  appendLog({ ts, prediction_pid: prediction.pid ?? null, prediction_verb: prediction.verb ?? null, ...result });
  return result;
}

// ─── CLI smoke-test ──────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("gnn-score-gate.mjs")) {
  const sample = {
    pid: process.argv[2] || "BH.OPERATIONAL.HEARTBEAT.LIRIS.SMOKE",
    verb: process.argv[3] || "EVT-HEARTBEAT-PING",
    d11: "PROVEN", idempotent: true,
  };
  const out = await gnnScoreGate(sample);
  console.log(JSON.stringify({ smoke_input: sample, gate_result: out }, null, 2));
}
