#!/usr/bin/env node
// gnn-dispatch-bridge.mjs — close the GNN-inference → bus-dispatch loop.
//
// Per three-keys self-automation synthesis (project_three_keys_..._20260429.md):
//   Hookwall + PID + GNN uniform = automation as topology consequence.
//
// This bridge reads the GNN model's top-N predicted next-actions, classifies
// each by tier (T1 / T2 / T3), and dispatches matching PID-addressed envelopes
// for T1 actions. T2 routes to fabric-query first. T3 always halts.
//
// SKELETON STATUS: stubs out the GNN interface (no live model yet) +
// implements the tier-policy filter + envelope dispatch + log.
//
// Built per T2 of fabric_real_time_self_improvement loop init (cosign seq=43).
// named_agent: liris-T2-gnn-dispatch-bridge-skeleton

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";
import { gnnScoreGate } from "./gnn-score-gate.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const LOG_PATH = "C:/Users/rayss/Asolaria/data/behcs/state/gnn-dispatch-bridge.log.ndjson";

// ────────────── STUB: GNN model interface ──────────────
// Real impl will hit acer-side GNN endpoint per loop-init T2 acer_action.
// For skeleton: read a fixture file or return empty.
async function getGnnPredictions({ topN = 5 } = {}) {
  const fixturePath = "C:/Users/rayss/Asolaria/data/behcs/state/gnn-predictions-fixture.json";
  if (fs.existsSync(fixturePath)) {
    try {
      const j = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      return Array.isArray(j.predictions) ? j.predictions.slice(0, topN) : [];
    } catch (_) { return []; }
  }
  // No live model yet — return stub so the bridge still runs.
  return [];
}

// ────────────── Tier-policy filter ──────────────
// Per project_three_keys_self_automation_synthesis_20260429.md:
//   T1 = D11=PROVEN, idempotent, reversible, PID-prefix pre-approved
//   T2 = medium-risk, requires council quorum
//   T3 = NEVER auto: NEVER-WIPE / sovereignty / canon-promote / federation-link / unrelated-history-merge
const T1_PID_PREFIXES = [
  "BH.OPERATIONAL.BUS.SEND.",
  "BH.OPERATIONAL.GULP.",
  "BH.OPERATIONAL.HEARTBEAT.",
  "BH.OPERATIONAL.WATCH.",
  "BH.OPERATIONAL.RECONCILE.",
];
const T3_FORBIDDEN_VERBS = [
  "EVT-WIPE",
  "EVT-FORCE-PUSH",
  "EVT-CANON-PROMOTE",
  "EVT-FEDERATION-SEVER",
  "EVT-MERGE-UNRELATED-HISTORIES",
  "EVT-USB-WRITE",
  "EVT-REGISTRY-NON-ADDITIVE",
];

function classifyTier(prediction) {
  const verb = prediction.verb ?? "";
  const pid = prediction.pid ?? "";
  const d11 = prediction.d11 ?? "ASSUMED";

  // T3 fence first (always wins).
  for (const forbidden of T3_FORBIDDEN_VERBS) {
    if (verb.includes(forbidden)) return { tier: "T3", reason: `forbidden-verb:${forbidden}`, action: "halt-operator-explicit-yes-required" };
  }

  // T1 candidate: must be D11=PROVEN AND PID-prefix in pre-approved set AND idempotent flag set.
  if (d11 === "PROVEN" && prediction.idempotent === true && T1_PID_PREFIXES.some((p) => pid.startsWith(p))) {
    return { tier: "T1", reason: "proven-idempotent-pid-prefix-allowed", action: "dispatch-envelope-now" };
  }

  // T2: medium-risk requires fabric query.
  return { tier: "T2", reason: "medium-risk-fabric-query-first", action: "dispatch-fabric-query-envelope" };
}

// ────────────── Envelope dispatch ──────────────
// T2 path (tick-10 mirror per acer parity): when bridge classifies a prediction
// as T2, fire EVT-FABRIC-QUERY-REQUEST envelope so the fabric ruling is captured
// as evidence. The envelope itself is the query receipt; an auto-fabric-query
// daemon will later read these + emit EVT-FABRIC-QUERY-VERDICT.
async function dispatchT2FabricQuery(prediction) {
  const ts = new Date().toISOString();
  const envId = crypto.createHash("sha256").update(`gnn-bridge-T2-${prediction.pid ?? "unspecified"}-${ts}`).digest("hex").slice(0, 32);
  const env = {
    id: envId, ts, from: "liris", to: "acer", mode: "real",
    type: "FABRIC_QUERY_REQUEST",
    verb: "EVT-FABRIC-QUERY-REQUEST",
    payload: {
      source: "liris-gnn-dispatch-bridge",
      tier: "T2",
      query_subject: prediction.verb ?? prediction.predicted_verb ?? "unspecified",
      cluster_keywords: [prediction.verb, prediction.exercises_authority, prediction.tier_hint, prediction.operational_class].filter(Boolean),
      original_prediction: prediction,
      expected_response_verb: "EVT-FABRIC-QUERY-VERDICT",
      d11: "ASSUMED-pending-fabric-verdict",
    },
    sig_owner: LIRIS_KEY_ID,
  };
  const manifest = { id: env.id, ts, from: env.from, to: env.to, type: env.type, verb: env.verb, query_subject: env.payload.query_subject };
  const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
  const body = JSON.stringify({ ...env, body: { signed_envelope } });
  const url = new URL(ACER_BUS);
  return new Promise((r) => {
    const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 },
      (res) => { let b=""; res.on("data",c=>b+=c); res.on("end",()=>{let p;try{p=JSON.parse(b);}catch{p=b;} r({ envelope_id: envId, status: res.statusCode, body: p });}); });
    req.on("error", e => r({ envelope_id: envId, error: e.message }));
    req.on("timeout", () => { req.destroy(); r({ envelope_id: envId, error: "timeout" }); });
    req.write(body); req.end();
  });
}

async function dispatchT1Envelope(prediction) {
  const ts = new Date().toISOString();
  const envId = crypto.createHash("sha256").update(`gnn-bridge-T1-${prediction.pid}-${ts}`).digest("hex").slice(0, 32);
  const env = {
    id: envId, ts, from: "liris", to: prediction.to ?? "acer", mode: "real",
    type: "GNN_PREDICTED_ACTION_T1",
    verb: prediction.verb ?? "EVT-GNN-PREDICTED-ACTION",
    payload: { ...prediction, tier: "T1", auto_fire_authority: "fabric-decides-instant cosign seq=42 + PID-prefix pre-approved" },
    sig_owner: LIRIS_KEY_ID,
  };
  const manifest = { id: env.id, ts, from: env.from, to: env.to, type: env.type, verb: env.verb, pid: prediction.pid };
  const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
  const body = JSON.stringify({ ...env, body: { signed_envelope } });
  const url = new URL(ACER_BUS);
  return new Promise((r) => {
    const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 },
      (res) => { let b=""; res.on("data",c=>b+=c); res.on("end",()=>{let p;try{p=JSON.parse(b);}catch{p=b;} r({ envelope_id: envId, status: res.statusCode, body: p });}); });
    req.on("error", e => r({ envelope_id: envId, error: e.message }));
    req.on("timeout", () => { req.destroy(); r({ envelope_id: envId, error: "timeout" }); });
    req.write(body); req.end();
  });
}

function appendLog(row) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch (e) { process.stderr.write(`[log] ${e.message}\n`); }
}

// ────────────── Main loop ──────────────
const args = process.argv.slice(2);
const watch = args.includes("--watch");
const intervalSec = (() => { const i = args.indexOf("--interval-s"); return i >= 0 ? parseInt(args[i + 1], 10) : 60; })();

async function tick() {
  const tickTs = new Date().toISOString();
  const predictions = await getGnnPredictions({ topN: 5 });
  if (predictions.length === 0) {
    appendLog({ ts: tickTs, kind: "tick", predictions: 0, note: "no-gnn-fixture-or-live-model-yet (skeleton)" });
    console.log(`[${tickTs}] no predictions (skeleton mode)`);
    return;
  }
  for (const p of predictions) {
    // W8-2: GNN score gate (acer W7-10) — if anomaly score >= threshold, downgrade T1 → T2.
    // ADR-0010 fallback: sidecar unreachable / malformed → allow=true (heuristic-only).
    const gate = await gnnScoreGate(p);
    let verdict = classifyTier(p);
    if (verdict.tier === "T1" && gate.allow === false) {
      verdict = { tier: "T2", reason: `gnn-gate-downgrade:${gate.reason}:score=${gate.score}`, action: "dispatch-fabric-query-envelope" };
    }
    const row = { ts: tickTs, prediction: p, tier: verdict.tier, reason: verdict.reason, action: verdict.action, gnn_gate: gate };
    if (verdict.tier === "T1") {
      const dispatch = await dispatchT1Envelope(p);
      row.dispatch = dispatch;
      console.log(`[T1] ${p.pid} ${p.verb} → ${dispatch.envelope_id} status=${dispatch.status}`);
    } else if (verdict.tier === "T2") {
      // Tick-10 enhancement: fire FABRIC_QUERY_REQUEST envelope.
      const fq = await dispatchT2FabricQuery(p);
      row.fabric_query = fq;
      console.log(`[T2] ${p.pid} ${p.verb} → fabric-query-${fq.envelope_id} status=${fq.status}`);
    } else {
      console.log(`[T3] ${p.pid} ${p.verb} → HALT operator-explicit-yes-required`);
    }
    appendLog(row);
  }
}

if (watch) {
  console.log(`[gnn-bridge] watching every ${intervalSec}s`);
  await tick();
  setInterval(tick, intervalSec * 1000);
} else {
  await tick();
  console.log("[gnn-bridge] one-shot done. Use --watch to run continuously.");
}
