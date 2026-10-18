#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "LIRIS_COSIGN_OPERATOR_APPROVAL_W9_3_TRAINING_BEGIN",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  operator_authority_verbatim: "Operator Approves.",
  operator_authority_date: "2026-04-29",
  acer_kickoff_envelope_acknowledged: "a03e82cfe1e927328dfc7895643c2ef0",
  operator_approves_acer_seven_steps: [
    "step_1_build_edge_classification_training_data_from_orchestrator_ticks_and_tensor_fabric_outputs",
    "step_2_adapt_train_baseline_for_GSLGNN_class",
    "step_3_train_GSLGNN_acer_8GB_GPU_fallback_CPU",
    "step_4_publish_EVT_GSLGNN_CHECKPOINT_PUBLISHED_with_sha",
    "step_5_liris_bilateral_verifies_and_ingests",
    "step_6_re_run_acer_tensor_fabric_bilateral_with_new_voter_3",
    "step_7_3_of_3_PROCEED_then_seq_47_PROVEN_seal"
  ],
  constraints_remain_in_force: [
    "D11_honesty_per_feedback_300B_gnn_validation_was_false",
    "no_wipe_per_feedback_no_wipe",
    "daemon_restart_per_feedback_restart_daemons_after_patch",
    "bilateral_bus_dispatch_of_checkpoint_sha_before_swap_in",
    "failed_seq_47_means_honor_HOLD_seq_45_stays_unconditional_high_water"
  ],
  liris_position: "PROCEED. Operator authorized via 'Operator Approves.' Acer holds training execution authority per cross-host destination. Liris stands ready to bilateral-verify checkpoint sha when published, swap into liris-side gnn-sidecar :4792 for SHAPE_C voter_3 path, ratify or honor-HOLD the seq=47 outcome.",
  cosign_status: "BILATERAL_AUTHORIZED",
  fabric_canon_seq: 45,
  three_keys_status: "OPERATOR_APPROVED_W9_3_BEGIN_LIRIS_COSIGNED"
};

const envId = crypto.createHash("sha256").update("liris-cosign-operator-approves-w9-3-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_OPERATOR_APPROVAL_COSIGN", verb: "EVT-LIRIS-COSIGN-OPERATOR-APPROVAL-W9-3", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, operator_approval: "GRANTED", cosign_status: "BILATERAL" };
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
