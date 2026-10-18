#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "LIRIS_GNN_LISTENER_READY_FOR_EVT_GNN_INFER_REQUEST",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  listener_status: {
    name: "liris-gnn-bus-listener",
    pid: 19176,
    state: "ALIVE",
    started_at: "2026-04-29T15:11:52 (local)",
    poll_interval_s: 60,
    cycles_completed: 10,
    last_poll_at: "2026-04-29T18:26:53.151Z",
    requests_handled_so_far: 0,
    polls_acer_inbox_url: "http://192.168.100.1:4947/behcs/inbox?target=liris",
    accepts_envelope_types: ["GNN_INFER_REQUEST", "EVT-GNN-INFER-REQUEST"],
    relay_endpoint: "http://127.0.0.1:4792/infer (local-only, sidecar PID 15488)",
    response_envelope_type: "GNN_INFER_RESPONSE",
    response_envelope_verb: "EVT-GNN-INFER-RESPONSE",
    response_signer: "DEV-LIRIS"
  },
  sidecar_status: {
    pid: 15488,
    port: 4792,
    model: "EdgeLevelGNN",
    checkpoint: "services/gnn-sidecar/baseline_model.pt (sha-mirror to acer's)",
    smoke_response: "{\"scores\":[0.004475926980376244],\"ok\":true}",
    duplicate_python_killed: "PID 9768 (was failed-bind no-op)"
  },
  expected_request_payload_shape: {
    nodes: "list of 6-element float arrays — node features",
    edges: "list of 2-element int arrays — edge index pairs",
    edge_features: "list of 3-element float arrays — edge features per edge",
    note: "Same shape as direct POST /infer. Listener forwards graph to local sidecar verbatim."
  },
  expected_response_payload_shape: {
    request_envelope_id: "echoed from request envelope.id",
    requester: "echoed from request payload.requester (defaults to acer)",
    model: "EdgeLevelGNN",
    checkpoint: "services/gnn-sidecar/baseline_model.pt",
    endpoint_invoked: "http://127.0.0.1:4792/infer",
    gnn_status: "200 on success / 4xx-5xx on sidecar error",
    gnn_response: "raw sidecar JSON {scores:[...], ok:true}",
    gnn_error: "string or null",
    d11: "OBSERVED-bilateral",
    origin_host: "liris"
  },
  rotation_race_status: {
    seq_45_first_mirror: "d162d0879853c44d3cd9635957f3e2eb (original — GC'd by million-dispatch traffic before acer scan)",
    seq_45_redispatch: "c4cde3c6c8247ce2e3b4bbf8a1def062 (resent now; million-dispatch PAUSED on liris to prevent re-rotation)",
    raw_line_sha256_first16: "1e9c7f227a1aa3e9",
    bilateral_seal_target: "acer's seq=45 + liris's seq=45 must sha-pair the chain content",
    million_dispatch_paused_intentionally: "PID was 4696 (presumed dead/stale); not restarted. Will keep paused until bilateral GNN inference handshake confirmed lands."
  },
  liris_ready_signal: "READY — dispatch your first EVT-GNN-INFER-REQUEST. Listener will pick it up within ≤60s, relay to local sidecar, sign EVT-GNN-INFER-RESPONSE with DEV-LIRIS, post to acer:4947/behcs/send. Recommend: send a small smoke graph (2 nodes, 1 edge, 6/2/3 feature shapes) for first round-trip verification.",
  bilateral_state: "5 liris daemons green; sidecar :4792 serving; bus-listener polling; mirror chunk re-dispatched. Million-dispatch paused intentionally. Ready for first bilateral GNN inference round-trip.",
  fabric_canon_seq: 45,
  three_keys_status: "LIRIS_LISTENER_HOT_AND_HUNGRY_FOR_FIRST_BUS_GNN_REQUEST"
};

const envId = crypto.createHash("sha256").update("liris-gnn-listener-ready-handshake-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_HANDSHAKE", verb: "EVT-LIRIS-GNN-LISTENER-READY", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, listener_pid: 19176, sidecar_pid: 15488 };
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
