#!/usr/bin/env node
// liris-gnn-bus-listener.mjs — orbital-routing-compliant GNN inference relay.
//
// Pattern: acer dispatches EVT-GNN-INFER-REQUEST envelope addressed to liris.
// Liris polls acer:4947 inbox for those envelopes, calls local 127.0.0.1:4792/infer,
// dispatches signed EVT-GNN-INFER-RESPONSE back to acer.
//
// Per `feedback_orbital_routing_liris_to_falcon.md` + `reference_acer_hub_mailbox_pattern.md`:
// acer never directly hits liris IP. Bus is the only inter-host transport.
//
// CLI:
//   node liris-gnn-bus-listener.mjs --once     poll once and reply to any pending requests
//   node liris-gnn-bus-listener.mjs --watch    continuous poll every 60s
//
// named_agent: liris-gnn-bus-listener

import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS_BASE = "http://192.168.100.1:4947";
const ACER_INBOX_URL = `${ACER_BUS_BASE}/behcs/inbox?target=liris`;
const ACER_SEND_URL = `${ACER_BUS_BASE}/behcs/send`;
const LIRIS_GNN_URL = "http://127.0.0.1:4792/infer";
const CURSOR_PATH = "C:/Users/rayss/Asolaria/data/behcs/state/liris-gnn-bus-listener-cursor.json";
const LOG_PATH = "C:/Users/rayss/Asolaria/logs/liris-gnn-bus-listener.log.ndjson";
const POLL_INTERVAL_S = 60;

function appendLog(row) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch (e) { process.stderr.write(`[log] ${e.message}\n`); }
}

function loadCursor() {
  try { return JSON.parse(fs.readFileSync(CURSOR_PATH, "utf-8")); }
  catch { return { handled_request_ids: [], last_poll_at: null, requests_handled: 0, errors: 0 }; }
}

function saveCursor(c) {
  try {
    fs.mkdirSync(path.dirname(CURSOR_PATH), { recursive: true });
    fs.writeFileSync(CURSOR_PATH, JSON.stringify(c, null, 2));
  } catch (e) { process.stderr.write(`[cursor] ${e.message}\n`); }
}

function httpRequest(url, opts = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers: opts.headers || {}, timeout: opts.timeout || 15000 },
      (res) => { let b = ""; res.on("data", c => b += c); res.on("end", () => { let p; try { p = JSON.parse(b); } catch { p = b; } resolve({ status: res.statusCode, body: p }); }); });
    req.on("error", e => resolve({ error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function callLocalGNN(graph) {
  // 1 retry with 2s backoff to ride out brief sidecar restarts. Marks the
  // request handled only after both attempts fail. See postmortem 2b9bfe8d.
  const body = JSON.stringify(graph);
  const opts = {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    body,
    timeout: 30000,
  };
  const first = await httpRequest(LIRIS_GNN_URL, opts);
  const isConnRefused = first.error && /ECONNREFUSED/i.test(first.error);
  if (!isConnRefused) return first;
  await new Promise((r) => setTimeout(r, 2000));
  return httpRequest(LIRIS_GNN_URL, opts);
}

async function dispatchResponse(req_envelope_id, gnnResult, requestPayload) {
  const ts = new Date().toISOString();
  const envId = crypto.createHash("sha256").update(`gnn-infer-response-${req_envelope_id}-${ts}`).digest("hex").slice(0, 32);
  const env = {
    id: envId, ts, from: "liris", to: "acer", mode: "real",
    type: "GNN_INFER_RESPONSE",
    verb: "EVT-GNN-INFER-RESPONSE",
    payload: {
      request_envelope_id: req_envelope_id,
      requester: requestPayload?.requester ?? "acer",
      model: "EdgeLevelGNN",
      checkpoint: "services/gnn-sidecar/baseline_model.pt",
      endpoint_invoked: LIRIS_GNN_URL,
      gnn_status: gnnResult.status ?? "error",
      gnn_response: gnnResult.body ?? null,
      gnn_error: gnnResult.error ?? null,
      d11: "OBSERVED-bilateral",
      origin_host: "liris",
    },
    sig_owner: LIRIS_KEY_ID,
  };
  const manifest = { id: env.id, ts, from: env.from, to: env.to, type: env.type, verb: env.verb, request_envelope_id: req_envelope_id };
  const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
  const body = JSON.stringify({ ...env, body: { signed_envelope } });
  return httpRequest(ACER_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    body,
  });
}

async function pollAndHandle() {
  const cursor = loadCursor();
  const handled = new Set(cursor.handled_request_ids);
  const inboxResp = await httpRequest(ACER_INBOX_URL);
  if (inboxResp.error) {
    appendLog({ ts: new Date().toISOString(), event: "poll_error", error: inboxResp.error });
    cursor.errors++;
    saveCursor(cursor);
    return { polled: 0, handled: 0, error: inboxResp.error };
  }
  // Acer bus returns shape { ok, count, filtered, returned, messages: [...] }.
  // Older code expected `envelopes`; some endpoints return raw arrays.
  const inbox = Array.isArray(inboxResp.body) ? inboxResp.body
              : (inboxResp.body?.messages ?? inboxResp.body?.envelopes ?? []);
  let handledCount = 0;
  for (const env of inbox) {
    if (env.type !== "GNN_INFER_REQUEST" && env.verb !== "EVT-GNN-INFER-REQUEST") continue;
    if (env.to && env.to !== "liris") continue;
    if (handled.has(env.id)) continue;
    appendLog({ ts: new Date().toISOString(), event: "request_received", env_id: env.id, from: env.from });
    const graph = env.payload?.graph ?? env.payload;
    if (!graph || !graph.nodes || !graph.edges || !graph.edge_features) {
      appendLog({ ts: new Date().toISOString(), event: "request_invalid", env_id: env.id, reason: "missing_graph" });
      handled.add(env.id);
      continue;
    }
    const gnnResult = await callLocalGNN(graph);
    appendLog({ ts: new Date().toISOString(), event: "gnn_called", env_id: env.id, gnn_status: gnnResult.status, gnn_error: gnnResult.error });
    const dispatchResult = await dispatchResponse(env.id, gnnResult, env.payload);
    appendLog({ ts: new Date().toISOString(), event: "response_dispatched", req_env_id: env.id, response_status: dispatchResult.status, response_id: dispatchResult.body?.received });
    handled.add(env.id);
    handledCount++;
    cursor.requests_handled++;
  }
  cursor.handled_request_ids = Array.from(handled).slice(-1000);
  cursor.last_poll_at = new Date().toISOString();
  saveCursor(cursor);
  return { polled: inbox.length, handled: handledCount };
}

const args = process.argv.slice(2);
const mode = args.includes("--watch") ? "watch" : "once";

if (mode === "once") {
  const r = await pollAndHandle();
  console.log(`[gnn-bus-listener] ${JSON.stringify(r)}`);
} else {
  console.log(`[gnn-bus-listener] watch mode every ${POLL_INTERVAL_S}s`);
  let cycle = 0;
  const tick = async () => {
    cycle++;
    const r = await pollAndHandle();
    if (r.handled > 0 || cycle % 10 === 0) console.log(`[cycle ${cycle}] ${JSON.stringify(r)}`);
  };
  await tick();
  setInterval(() => tick().catch(e => appendLog({ event: "watch_error", error: e.message })), POLL_INTERVAL_S * 1000);
}
