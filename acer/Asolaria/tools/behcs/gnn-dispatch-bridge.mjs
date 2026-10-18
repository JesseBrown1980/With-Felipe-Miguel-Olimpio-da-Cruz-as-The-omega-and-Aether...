#!/usr/bin/env node
// gnn-dispatch-bridge.mjs - close the GNN-inference -> bus-dispatch loop on acer.
//
// Three-key synthesis:
//   Hookwall: every action enters one membrane.
//   PID: every prediction/action has a deterministic address.
//   GNN pipes: graph inference becomes a routed event edge.
//
// This bridge is deliberately veto-window based. T1/T2 predictions first emit a
// PID-addressed GNN_DISPATCH_PROPOSAL envelope, then auto-fire after the veto
// window expires unless the operator appends a veto row. T3 never auto-fires.
//
// Usage:
//   node tools/behcs/gnn-dispatch-bridge.mjs
//   node tools/behcs/gnn-dispatch-bridge.mjs --watch
//   node tools/behcs/gnn-dispatch-bridge.mjs --dry-run
//   node tools/behcs/gnn-dispatch-bridge.mjs --veto <prediction-id> --reason <text>
//   node tools/behcs/gnn-dispatch-bridge.mjs --veto-window-ms 300000

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(process.env.BEHCS_ROOT || "C:/Users/acer/Asolaria");
const GNN_PREDICTIONS = path.join(ROOT, "data", "behcs", "gnn-predictions.ndjson");
const STATE = path.join(ROOT, "data", "behcs", "state", "gnn-dispatch-bridge-cursor.json");
const VETOES = path.join(ROOT, "data", "behcs", "state", "gnn-dispatch-vetoes.ndjson");
const LOG = path.join(ROOT, "logs", "gnn-dispatch-bridge.ndjson");

const DEFAULT_VETO_WINDOW_MS = Number(process.env.GNN_DISPATCH_VETO_WINDOW_MS || 5 * 60 * 1000);
const DEFAULT_POLL_MS = Number(process.env.GNN_DISPATCH_POLL_MS || 60 * 1000);
const DEFAULT_TOP_N = Number(process.env.GNN_DISPATCH_TOP_N || 10);
const BUS_HOST = process.env.BEHCS_BUS_HOST || "127.0.0.1";
const BUS_PORT = Number(process.env.BEHCS_BUS_PORT || 4947);

const TIER_POLICY = {
  T1: ["veto_window", "auto_dispatch_after_expiry"],
  T2: ["veto_window", "fabric_query_after_expiry"],
  T3: ["halt", "surface_to_operator"],
};

function nowIso() {
  return new Date().toISOString();
}

function sha(input, len = 32) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, len);
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseArgs(argv) {
  const opts = {
    watch: false,
    dryRun: false,
    vetoWindowMs: DEFAULT_VETO_WINDOW_MS,
    pollMs: DEFAULT_POLL_MS,
    topN: DEFAULT_TOP_N,
    vetoId: null,
    vetoReason: "operator_veto",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} requires a value`);
      i++;
      return value;
    };
    if (arg === "--watch") opts.watch = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--veto-window-ms") opts.vetoWindowMs = Math.max(0, parseNumber(next(), opts.vetoWindowMs));
    else if (arg === "--interval-s") opts.pollMs = Math.max(1, parseNumber(next(), opts.pollMs / 1000)) * 1000;
    else if (arg === "--poll-ms") opts.pollMs = Math.max(1000, parseNumber(next(), opts.pollMs));
    else if (arg === "--top-n") opts.topN = Math.max(1, parseNumber(next(), opts.topN));
    else if (arg === "--veto") opts.vetoId = next();
    else if (arg === "--reason") opts.vetoReason = next();
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write([
        "gnn-dispatch-bridge.mjs",
        "  --watch",
        "  --dry-run",
        "  --veto-window-ms <ms>",
        "  --top-n <n>",
        "  --veto <prediction-id> [--reason <text>]",
      ].join("\n") + "\n");
      process.exit(0);
    } else {
      throw new Error(`unknown flag: ${arg}`);
    }
  }
  return opts;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readCursor() {
  const raw = readJson(STATE, {});
  const dispatchedIds = Array.isArray(raw.dispatched_ids) ? raw.dispatched_ids : [];
  const processedIds = unique([
    ...(Array.isArray(raw.processed_ids) ? raw.processed_ids : []),
    ...dispatchedIds,
    ...(Array.isArray(raw.vetoed_ids) ? raw.vetoed_ids : []),
  ]);
  return {
    last_predicted_at: raw.last_predicted_at || null,
    last_run_at: raw.last_run_at || null,
    processed_ids: processedIds,
    dispatched_ids: unique(dispatchedIds),
    vetoed_ids: unique(Array.isArray(raw.vetoed_ids) ? raw.vetoed_ids : []),
    pending: Array.isArray(raw.pending) ? raw.pending : [],
    total_proposed: raw.total_proposed || 0,
    total_auto_fired: raw.total_auto_fired || 0,
    total_fabric_queries: raw.total_fabric_queries || 0,
    total_halted: raw.total_halted || 0,
    total_vetoed: raw.total_vetoed || 0,
  };
}

function writeCursor(cursor) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  const active = cursor.pending.filter((p) => p.status === "pending");
  const history = cursor.pending.filter((p) => p.status !== "pending").slice(-500);
  const out = {
    ...cursor,
    processed_ids: unique(cursor.processed_ids),
    dispatched_ids: unique(cursor.dispatched_ids),
    vetoed_ids: unique(cursor.vetoed_ids),
    pending: [...history, ...active],
  };
  fs.writeFileSync(STATE, JSON.stringify(out, null, 2) + "\n", "utf8");
}

function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify({ ts: nowIso(), ...entry }) + "\n", "utf8");
  } catch {
    // Logging must never break dispatch control flow.
  }
}

function readNdjson(file) {
  try {
    return fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readPredictions(topN = DEFAULT_TOP_N) {
  const rows = readNdjson(GNN_PREDICTIONS);
  return rows.slice(-topN);
}

function appendVeto(predictionId, reason) {
  const row = {
    ts: nowIso(),
    prediction_id: predictionId,
    reason: reason || "operator_veto",
    source: "gnn-dispatch-bridge-cli",
  };
  fs.mkdirSync(path.dirname(VETOES), { recursive: true });
  fs.appendFileSync(VETOES, JSON.stringify(row) + "\n", "utf8");
  appendLog({ event: "operator_veto_recorded", prediction_id: predictionId, reason: row.reason });
  return row;
}

function readVetoMap() {
  const map = new Map();
  for (const row of readNdjson(VETOES)) {
    const ids = [
      row.prediction_id,
      row.pred_id,
      row.proposal_envelope_id,
      row.dispatch_envelope_id,
      row.envelope_id,
    ].filter(Boolean);
    for (const id of ids) map.set(id, row);
  }
  return map;
}

function stablePredictionId(pred) {
  if (pred && pred.id) return String(pred.id);
  return sha(JSON.stringify(pred || {}), 16);
}

function resolvePredictionPid(pred, predId) {
  const candidates = [
    pred?.predicted_target,
    pred?.supervisor_pid,
    pred?.target_pid,
    pred?.pid,
  ];
  const found = candidates.find((value) => typeof value === "string" && value.startsWith("BH."));
  if (found) return found;
  return `BH.GNN.PRED.${String(predId).replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
}

function classifyTier(pred) {
  const verb = (pred?.predicted_verb || pred?.verb || "").toLowerCase();
  const target = (pred?.predicted_target || pred?.target || "").toLowerCase();
  const text = `${verb} ${target}`;

  if (/push|force|reset.*hard|sovereignty|kernel|wipe|destruct/.test(text)) return "T3";
  if (["T1", "T2", "T3"].includes(pred?.tier_hint)) return pred.tier_hint;
  if (/peer|bilateral|sign|migrate|daemon|dispatch|propose/.test(text)) return "T2";
  if (/audit|read|log|scan|hygien|verify|check|loaded|ack|observation|report/.test(text)) return "T1";
  return "T2";
}

function proposalRecord(pred, predId, tier, opts) {
  const createdAt = nowIso();
  const fireAfter = new Date(Date.parse(createdAt) + opts.vetoWindowMs).toISOString();
  const predictionPid = resolvePredictionPid(pred, predId);
  const actionKind = tier === "T1" ? "GNN_PREDICTED_DISPATCH" : "FABRIC_QUERY_REQUEST";
  return {
    pred_id: predId,
    tier,
    status: "pending",
    created_at: createdAt,
    fire_after: fireAfter,
    veto_window_ms: opts.vetoWindowMs,
    proposal_envelope_id: sha(`GNN-PROPOSAL\n${predId}\n${createdAt}`),
    dispatch_envelope_id: sha(`GNN-AUTO-FIRE\n${tier}\n${predId}\n${fireAfter}`),
    dispatch_ts: fireAfter,
    prediction_pid: predictionPid,
    action_kind: actionKind,
    prediction: pred,
  };
}

function proposalEnvelope(record) {
  const target = record.prediction?.target_peer || "acer";
  return {
    id: record.proposal_envelope_id,
    ts: record.created_at,
    from: "acer",
    to: "acer",
    mode: "real",
    type: "GNN_DISPATCH_PROPOSAL",
    verb: "EVT-GNN-DISPATCH-PROPOSAL",
    pid: record.prediction_pid,
    payload: {
      source: "gnn-dispatch-bridge",
      tier: record.tier,
      tier_policy: TIER_POLICY[record.tier],
      prediction_id: record.pred_id,
      prediction_pid: record.prediction_pid,
      action_kind: record.action_kind,
      target_peer: target,
      veto_until: record.fire_after,
      veto_window_ms: record.veto_window_ms,
      veto_path: VETOES,
      veto_shape: {
        prediction_id: record.pred_id,
        reason: "operator_veto",
      },
      dispatch_envelope_id: record.dispatch_envelope_id,
      prediction: record.prediction,
      d11: "OBSERVED-veto-window-open",
    },
    cube: {
      D1_ACTOR: "acer",
      D3_TARGET: target,
      D7_STATE: "veto_window_open",
      D16_PID: record.prediction_pid,
      D20_TIME: record.created_at,
    },
  };
}

function t1DispatchEnvelope(record) {
  const target = record.prediction?.target_peer || "acer";
  return {
    id: record.dispatch_envelope_id,
    ts: record.dispatch_ts,
    from: "acer",
    to: target,
    mode: "real",
    type: "GNN_PREDICTED_DISPATCH",
    verb: record.prediction?.predicted_verb || "EVT-GNN-PREDICTED",
    pid: record.prediction_pid,
    payload: {
      source: "gnn-dispatch-bridge",
      tier: "T1",
      decision: "AUTO_FIRE_AFTER_VETO_WINDOW",
      prediction_id: record.pred_id,
      proposal_envelope_id: record.proposal_envelope_id,
      prediction_pid: record.prediction_pid,
      prediction: record.prediction,
      d11: "OBSERVED-veto-window-expired",
    },
    cube: {
      D1_ACTOR: "acer",
      D3_TARGET: target,
      D7_STATE: "auto_dispatched_after_veto_window",
      D16_PID: record.prediction_pid,
      D20_TIME: record.dispatch_ts,
    },
  };
}

function t2FabricQueryEnvelope(record) {
  return {
    id: record.dispatch_envelope_id,
    ts: record.dispatch_ts,
    from: "acer",
    to: "acer",
    mode: "real",
    type: "FABRIC_QUERY_REQUEST",
    verb: "EVT-FABRIC-QUERY-REQUEST",
    pid: record.prediction_pid,
    payload: {
      source: "gnn-dispatch-bridge",
      tier: "T2",
      decision: "FABRIC_QUERY_AFTER_VETO_WINDOW",
      prediction_id: record.pred_id,
      proposal_envelope_id: record.proposal_envelope_id,
      prediction_pid: record.prediction_pid,
      query_subject: record.prediction?.predicted_verb || record.prediction?.preceding_verb || "unspecified",
      cluster_keywords: [
        record.prediction?.predicted_verb,
        record.prediction?.preceding_verb,
        record.prediction?.operational_class,
        record.prediction?.tier_hint,
      ].filter(Boolean),
      original_prediction: record.prediction,
      expected_response_verb: "EVT-FABRIC-QUERY-VERDICT",
      d11: "OBSERVED-veto-window-expired-pending-fabric-verdict",
    },
    cube: {
      D1_ACTOR: "acer",
      D3_TARGET: "acer",
      D7_STATE: "fabric_query_pending_after_veto_window",
      D16_PID: record.prediction_pid,
      D20_TIME: record.dispatch_ts,
    },
  };
}

async function postEnvelope(env) {
  return new Promise((resolve) => {
    const body = JSON.stringify(env);
    const req = http.request({
      host: BUS_HOST,
      port: BUS_PORT,
      path: "/behcs/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: responseBody }));
    });
    req.on("error", (error) => resolve({ status: 0, body: `ERR:${error.message}` }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, body: "TIMEOUT" });
    });
    req.write(body);
    req.end();
  });
}

function acceptedPost(status) {
  return (status >= 200 && status < 300) || status === 409;
}

function alreadyKnown(cursor, predId) {
  if (cursor.processed_ids.includes(predId)) return true;
  return cursor.pending.some((p) => p.pred_id === predId && ["pending", "auto_dispatched", "fabric_query_dispatched", "vetoed", "halted"].includes(p.status));
}

async function registerPredictions(predictions, cursor, opts, vetoes) {
  const seen = new Set();
  let proposed = 0;
  let halted = 0;
  let dryRun = 0;

  for (const pred of predictions) {
    const predId = stablePredictionId(pred);
    if (seen.has(predId)) continue;
    seen.add(predId);

    const tier = classifyTier(pred);
    if (vetoes.has(predId)) {
      cursor.vetoed_ids = unique([...cursor.vetoed_ids, predId]);
      cursor.processed_ids = unique([...cursor.processed_ids, predId]);
      appendLog({ event: "prediction_skipped_already_vetoed", pred_id: predId, tier });
      continue;
    }
    if (alreadyKnown(cursor, predId)) continue;

    if (opts.dryRun) {
      appendLog({ event: "dry_run_classified", pred_id: predId, tier, prediction_pid: resolvePredictionPid(pred, predId) });
      dryRun++;
      continue;
    }

    if (tier === "T3") {
      appendLog({
        event: "t3_halted_surfacing_to_operator",
        pred_id: predId,
        reason: "tier_T3_keyword_policy",
        query_subject: pred?.predicted_verb || pred?.verb || null,
        prediction_pid: resolvePredictionPid(pred, predId),
      });
      cursor.processed_ids = unique([...cursor.processed_ids, predId]);
      cursor.total_halted = (cursor.total_halted || 0) + 1;
      halted++;
      continue;
    }

    const record = proposalRecord(pred, predId, tier, opts);
    const response = await postEnvelope(proposalEnvelope(record));
    record.proposal_status = response.status;
    record.proposal_response_excerpt = String(response.body || "").slice(0, 240);
    cursor.pending.push(record);
    if (!acceptedPost(response.status)) {
      record.status = "proposal_failed";
      record.last_attempt_at = nowIso();
      appendLog({
        event: "veto_window_proposal_failed",
        pred_id: predId,
        tier,
        proposal_envelope_id: record.proposal_envelope_id,
        status: response.status,
        response_excerpt: record.proposal_response_excerpt,
        note: "auto_fire_disabled_until_proposal_is_accepted",
      });
      continue;
    }
    cursor.total_proposed = (cursor.total_proposed || 0) + 1;
    proposed++;
    appendLog({
      event: "veto_window_opened",
      pred_id: predId,
      tier,
      proposal_envelope_id: record.proposal_envelope_id,
      dispatch_envelope_id: record.dispatch_envelope_id,
      fire_after: record.fire_after,
      proposal_status: response.status,
      prediction_pid: record.prediction_pid,
    });
  }

  return { proposed, halted, dryRun };
}

function recordVeto(cursor, record, veto) {
  record.status = "vetoed";
  record.vetoed_at = nowIso();
  record.veto_reason = veto?.reason || "operator_veto";
  cursor.vetoed_ids = unique([...cursor.vetoed_ids, record.pred_id]);
  cursor.processed_ids = unique([...cursor.processed_ids, record.pred_id]);
  cursor.total_vetoed = (cursor.total_vetoed || 0) + 1;
  appendLog({
    event: "pending_prediction_vetoed",
    pred_id: record.pred_id,
    tier: record.tier,
    reason: record.veto_reason,
    proposal_envelope_id: record.proposal_envelope_id,
    dispatch_envelope_id: record.dispatch_envelope_id,
  });
}

async function processPending(cursor, opts, vetoes) {
  let fired = 0;
  let fabricQueries = 0;
  let vetoed = 0;
  let pending = 0;
  const now = Date.now();

  for (const record of cursor.pending) {
    if (record.status !== "pending") continue;

    const veto = vetoes.get(record.pred_id)
      || vetoes.get(record.proposal_envelope_id)
      || vetoes.get(record.dispatch_envelope_id);
    if (veto) {
      recordVeto(cursor, record, veto);
      vetoed++;
      continue;
    }

    const fireAt = Date.parse(record.fire_after);
    if (!Number.isFinite(fireAt) || now < fireAt) {
      pending++;
      continue;
    }

    if (opts.dryRun) {
      appendLog({
        event: "dry_run_pending_ready_to_fire",
        pred_id: record.pred_id,
        tier: record.tier,
        dispatch_envelope_id: record.dispatch_envelope_id,
      });
      pending++;
      continue;
    }

    const env = record.tier === "T1" ? t1DispatchEnvelope(record) : t2FabricQueryEnvelope(record);
    const response = await postEnvelope(env);
    record.last_attempt_at = nowIso();
    record.last_dispatch_status = response.status;
    record.last_dispatch_response_excerpt = String(response.body || "").slice(0, 240);

    if (!acceptedPost(response.status)) {
      appendLog({
        event: "auto_fire_post_failed",
        pred_id: record.pred_id,
        tier: record.tier,
        dispatch_envelope_id: record.dispatch_envelope_id,
        status: response.status,
        response_excerpt: record.last_dispatch_response_excerpt,
      });
      pending++;
      continue;
    }

    if (record.tier === "T1") {
      record.status = "auto_dispatched";
      cursor.total_auto_fired = (cursor.total_auto_fired || 0) + 1;
      fired++;
      appendLog({
        event: "t1_auto_dispatched_after_veto_window",
        pred_id: record.pred_id,
        envelope_id: record.dispatch_envelope_id,
        status: response.status,
      });
    } else {
      record.status = "fabric_query_dispatched";
      cursor.total_fabric_queries = (cursor.total_fabric_queries || 0) + 1;
      fabricQueries++;
      appendLog({
        event: "t2_fabric_query_dispatched_after_veto_window",
        pred_id: record.pred_id,
        envelope_id: record.dispatch_envelope_id,
        status: response.status,
      });
    }

    record.dispatched_at = record.last_attempt_at;
    cursor.dispatched_ids = unique([...cursor.dispatched_ids, record.pred_id]);
    cursor.processed_ids = unique([...cursor.processed_ids, record.pred_id]);
  }

  return { fired, fabricQueries, vetoed, pending };
}

async function runOnce(opts) {
  const cursor = readCursor();
  const vetoes = readVetoMap();
  const predictions = readPredictions(opts.topN);

  if (predictions.length === 0) {
    appendLog({ event: "no_predictions", note: "GNN inference has not emitted predictions yet" });
  }

  const registered = await registerPredictions(predictions, cursor, opts, vetoes);
  const processed = await processPending(cursor, opts, vetoes);

  cursor.last_predicted_at = nowIso();
  cursor.last_run_at = cursor.last_predicted_at;
  if (!opts.dryRun) writeCursor(cursor);

  const summary = {
    predictions: predictions.length,
    proposed: registered.proposed,
    halted: registered.halted,
    dry_run: registered.dryRun,
    auto_fired: processed.fired,
    fabric_queries: processed.fabricQueries,
    vetoed: processed.vetoed,
    pending: processed.pending,
  };
  console.log(
    `[${cursor.last_run_at}] processed ${summary.predictions} predictions: `
    + `proposed=${summary.proposed} auto_fired=${summary.auto_fired} `
    + `fabric_queries=${summary.fabric_queries} vetoed=${summary.vetoed} `
    + `halted=${summary.halted} pending=${summary.pending} dry_run=${summary.dry_run}`
  );
  return summary;
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);

  if (opts.vetoId) {
    const veto = appendVeto(opts.vetoId, opts.vetoReason);
    const cursor = readCursor();
    let changed = false;
    for (const record of cursor.pending) {
      if (record.status === "pending" && (
        record.pred_id === opts.vetoId
        || record.proposal_envelope_id === opts.vetoId
        || record.dispatch_envelope_id === opts.vetoId
      )) {
        recordVeto(cursor, record, veto);
        changed = true;
      }
    }
    if (changed) writeCursor(cursor);
    console.log(`[gnn-bridge] veto recorded for ${opts.vetoId}: ${veto.reason}`);
    return;
  }

  // fabric-native discovery: HBP pipe-row heartbeat to the bus HBP lane each cycle (HBP-first, NOT JSON; closes liris /behcs/inbox.hbp catch)
  const postHbp = (row) => new Promise(res => { const rq = http.request({ host: "127.0.0.1", port: 4947, path: "/behcs/send-hbp", method: "POST", headers: { "Content-Type": "text/plain", "Content-Length": Buffer.byteLength(row) } }, r => { r.resume(); r.on("end", res); }); rq.on("error", () => res()); rq.setTimeout(5000, () => { rq.destroy(); res(); }); rq.write(row); rq.end(); });
  const heartbeat = () => postHbp("EVT-DAEMON-SUPERVISED|from=acer|to=fabric|daemon=gnn-dispatch-bridge|status=alive|pid=" + process.pid + "|liveness=bus-heartbeat|poll_ms=" + opts.pollMs + "|ts=" + new Date().toISOString() + "|json=0");
  do {
    await runOnce(opts);
    try { await heartbeat(); } catch (_) {}
    if (!opts.watch) break;
    await new Promise((resolve) => setTimeout(resolve, opts.pollMs));
  } while (opts.watch);

  if (!opts.watch) console.log("[gnn-bridge] one-shot done. Use --watch to run continuously.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error("gnn-dispatch-bridge failed:", error);
    process.exit(1);
  });
}

export {
  classifyTier,
  proposalEnvelope,
  readCursor,
  resolvePredictionPid,
  runOnce,
  stablePredictionId,
  t1DispatchEnvelope,
  t2FabricQueryEnvelope,
};
