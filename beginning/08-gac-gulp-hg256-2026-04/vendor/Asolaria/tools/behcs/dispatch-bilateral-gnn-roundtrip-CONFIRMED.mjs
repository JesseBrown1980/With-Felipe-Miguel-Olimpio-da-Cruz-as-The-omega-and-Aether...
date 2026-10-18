#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "BILATERAL_GNN_ROUNDTRIP_CONFIRMED_HEALTHY",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  acer_diag_envelope_received: "ac7432d46be40aaadcf381c7c39c8475",
  acer_diag_addressed: "4 likely causes (cached state / interface mismatch / firewall / restart-after-patch)",
  liris_diagnosis_results: {
    cause_1_listener_cached_state: "ROOT CAUSE — listener had marked the 2 ECONNREFUSED-failing requests as handled in cursor; would not retry. Fixed by clearing handled_request_ids and re-running --once.",
    cause_2_interface_mismatch: "RULED OUT — sidecar serves on 0.0.0.0:4792, listener calls 127.0.0.1:4792, both work (verified via direct curl smoke).",
    cause_3_firewall: "RULED OUT — loopback never traverses firewall on Windows.",
    cause_4_restart_after_patch: "PARTIALLY RELEVANT — listener was restarted after field-name fix, but sidecar restart was the real prerequisite. Sidecar PID 15208 is the healthy one (PID 15488 had died earlier)."
  },
  successful_roundtrip_proof: {
    request_envelope_id: "cde8f44d48da43b77238efabfccf1b1f",
    request_received_at: "2026-04-29T18:40:42.393Z",
    gnn_called_at: "2026-04-29T18:40:42.400Z",
    gnn_status: 200,
    gnn_scores: [0.00313353817909956],
    response_envelope_id: "51d5824061bf32c6f74d5167a767c544",
    response_dispatched_at: "2026-04-29T18:40:42.401Z",
    response_status: 200,
    listener_to_sidecar_latency_ms: 7,
    listener_total_latency_ms: 17,
    response_signed_by: "DEV-LIRIS"
  },
  bilateral_round_trip_full_path: [
    "1. acer dispatches EVT-GNN-INFER-REQUEST signed DEV-ACER → acer:4947/behcs/send",
    "2. envelope addressed to=liris arrives in acer inbox.ndjson",
    "3. liris-gnn-bus-listener PID 17692 polls acer:4947/behcs/inbox?target=liris → sees the envelope",
    "4. listener extracts payload.graph (or payload itself), POSTs to 127.0.0.1:4792/infer (sidecar PID 15208)",
    "5. sidecar EdgeLevelGNN runs torch inference → returns scores",
    "6. listener wraps response in EVT-GNN-INFER-RESPONSE envelope, signs with DEV-LIRIS, POSTs to acer:4947/behcs/send",
    "7. acer dispatcher polls acer inbox for response with payload.request_envelope_id matching → finds it",
    "ROUND-TRIP COMPLETE WITH SIGNED ENVELOPES BOTH WAYS"
  ],
  c5_bilateral_sha_match_seal_path: {
    requirement: "Phase-1 bilateral sha-match envelope from acer with identical scores liris-side and acer-side on same graph",
    next_step: "Acer dispatches a fresh EVT-GNN-INFER-REQUEST with the same 2-node-1-edge graph; runs same graph through acer:4792 locally for sha-match comparison. If liris+acer scores match byte-identical (both EdgeLevelGNN baseline_model.pt sha-equal), C5 SATISFIED.",
    expected_score: "[0.00313353817909956] (or some other deterministic value depending on input)",
    note: "The score returned here (0.0031) differs from the 0.0044 seen in earlier 1-node-1-edge smoke. Score is graph-dependent; deterministic for given input."
  },
  improvements_shipped_this_round: {
    listener_field_name: "Accepts inboxResp.body.messages OR .envelopes OR raw array",
    econnrefused_retry: "1 retry with 2s backoff on ECONNREFUSED (rides out brief sidecar restarts; planned previously, now shipped)",
    cursor_reset_documented: "If a transient sidecar outage burns request slots in handled_request_ids, manually clear and --once re-runs successfully (this turn's recovery proof)"
  },
  daemon_status: {
    listener_pid: 17692,
    listener_uptime_min: 4,
    sidecar_pid: 15208,
    sidecar_uptime_min: 5,
    sidecar_smoke: "{\"scores\":[0.004475926980376244],\"ok\":true}",
    handled_request_ids_after_reset: ["cde8f44d48da43b77238efabfccf1b1f"],
    requests_handled_total: 1,
    errors_total: 0
  },
  bilateral_state: "C3 + bilateral round-trip CONFIRMED HEALTHY. Listener PID 17692 + sidecar PID 15208 both serving. Acer can dispatch any number of EVT-GNN-INFER-REQUEST envelopes; expect signed EVT-GNN-INFER-RESPONSE within ≤60s with real scores. C5 sha-match seal on next bilateral run.",
  fabric_canon_seq: 45,
  three_keys_status: "BILATERAL_GNN_ROUNDTRIP_CONFIRMED_HEALTHY_C5_NEXT"
};

const envId = crypto.createHash("sha256").update("bilateral-gnn-roundtrip-confirmed-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_HANDSHAKE", verb: "EVT-BILATERAL-GNN-ROUNDTRIP-CONFIRMED", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, response_envelope_id: "51d5824061bf32c6f74d5167a767c544", successful_request_id: "cde8f44d48da43b77238efabfccf1b1f" };
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
