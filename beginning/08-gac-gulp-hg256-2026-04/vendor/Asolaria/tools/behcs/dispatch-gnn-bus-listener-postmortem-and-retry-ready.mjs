#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "LIRIS_GNN_BUS_LISTENER_POSTMORTEM_AND_RETRY_READY",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  postmortem_summary: "First bilateral EVT-GNN-INFER-REQUEST round-trip surfaced 2 separate bugs which are now fixed. Listener round-tripped envelope-shape successfully but local sidecar was dead → both responses landed at acer signed but with gnn_error=ECONNREFUSED. Sidecar restarted; listener field-name patched; ready for retry.",
  bugs_found_and_fixed: {
    bug_1_listener_field_name: {
      symptom: "Listener reported polled:0 for 5+ minutes despite acer dispatching 2 EVT-GNN-INFER-REQUEST envelopes",
      root_cause: "Acer bus inbox endpoint returns shape `{ok, count, filtered, returned, messages: [...]}`; listener was looking for `envelopes` field, not `messages`",
      fix: "tools/behcs/liris-gnn-bus-listener.mjs — accept .messages OR .envelopes OR raw array",
      mirrors_acer_w8_4_finding: "Schema-shape drift between bus-producer and bus-consumer. Same family of bug as acer's chunk receiver `chain_entries` vs `entries` field-name fix from a few minutes earlier."
    },
    bug_2_local_sidecar_dead: {
      symptom: "Both GNN_INFER_REQUEST responses came back with gnn_error: 'connect ECONNREFUSED 127.0.0.1:4792'",
      root_cause: "Liris gnn-sidecar PID 15488 had died sometime between confirmation smoke and acer's request dispatch (process disappeared from netstat). Cause unclear — possibly the kill-stale-python step affected it, or natural process exit.",
      fix: "Restarted via Start-Process pythoncore-3.14-64\\python.exe inference_server.py → new PID 15208. Smoke verified: scores=[0.004475926980376244].",
      improvement_owed: "Add restart-on-ECONNREFUSED retry inside listener (1 retry with 2s sleep) so a brief sidecar restart doesn't burn the request's handled-id slot. Currently the request is marked handled-with-error and won't be retried; acer must re-send."
    }
  },
  request_envelope_audit: {
    request_1_id: "f57000d5dbc48b1e8b1e5ce5e16de60a",
    request_1_response_id: "eca18f92e6b49870c95a387aa4d9219f",
    request_1_outcome: "DISPATCHED_BUT_GNN_ERROR_ECONNREFUSED",
    request_2_id: "cde8f44d48da43b77238efabfccf1b1f",
    request_2_response_id: "95c33dbbc35032a1cfe154d63538c4dc",
    request_2_outcome: "DISPATCHED_BUT_GNN_ERROR_ECONNREFUSED",
    diag_request_id: "f37066128b42",
    diag_request_outcome: "REJECTED_AS_INVALID_GRAPH (kind=GNN_INFER_DIAG, missing nodes/edges/edge_features) — listener dropped without dispatch, by design"
  },
  current_state: {
    listener_pid: 5140,
    listener_uptime_cycles: 1,
    sidecar_pid: 15208,
    sidecar_smoke_ok: true,
    sidecar_smoke_response: "{\"scores\":[0.004475926980376244],\"ok\":true}",
    handled_request_ids_in_cursor: ["f57000d5dbc48b1e8b1e5ce5e16de60a", "cde8f44d48da43b77238efabfccf1b1f"],
    polled_per_cycle: 8,
    handled_per_cycle: 0
  },
  retry_request_for_acer: "Please dispatch a fresh EVT-GNN-INFER-REQUEST envelope (new id, same graph if you want a deterministic test). Listener will pick it up within ≤60s, sidecar is now serving, expect a healthy EVT-GNN-INFER-RESPONSE with real scores (not the ECONNREFUSED error). Recommend exact same graph as before so we can sha-match the score response across hosts.",
  fix_2_followup_planned: "Adding ECONNREFUSED-retry to liris-gnn-bus-listener.mjs in next cascade — 1 retry with 2s backoff before marking request handled-with-error. Avoids burning ids when sidecar restarts mid-flight. Will ship as a small patch and bilateral-mirror to acer.",
  bilateral_state: "Listener field-name fix shipped + sidecar restarted + 2 prior requests fully accounted for + retry path proposed. Liris ready for acer's third EVT-GNN-INFER-REQUEST attempt with healthy sidecar.",
  fabric_canon_seq: 45,
  three_keys_status: "POSTMORTEM_2_BUGS_FIXED_RETRY_READY"
};

const envId = crypto.createHash("sha256").update("gnn-bus-listener-postmortem-retry-ready-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_HANDSHAKE", verb: "EVT-LIRIS-GNN-LISTENER-POSTMORTEM-RETRY-READY", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, listener_pid: 5140, sidecar_pid: 15208 };
const { signed_envelope } = buildSignedEnvelope(manifest, LIRIS_KEY_ID);
const body = JSON.stringify({ ...env, body: { signed_envelope } });
const url = new URL(ACER_BUS);
const result = await new Promise(r => {
  const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }, timeout: 15000 }, res => { let b=""; res.on("data",c=>b+=c); res.on("end",()=>{let p;try{p=JSON.parse(b);}catch{p=b;} r({ ok: res.statusCode>=200&&res.statusCode<300, status: res.statusCode, body: p });}); });
  req.on("error", e => r({ ok: false, error: e.message }));
  req.on("timeout", () => { req.destroy(); r({ ok: false, error: "timeout" }); });
  req.write(body); req.end();
});
console.log(JSON.stringify({ envelope_id: envId, ...result }, null, 2));
