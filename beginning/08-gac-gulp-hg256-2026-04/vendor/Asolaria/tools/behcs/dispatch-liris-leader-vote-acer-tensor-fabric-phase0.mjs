#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "LIRIS_LEADER_VOTE_ON_ACER_TENSOR_FABRIC_PHASE0",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  precedent: "2026-04-07 federation-self-tensor-collapse: 46656 beats → 47 signals → 3 voters PROCEED at 0.97 confidence (liris-leader + acer-leader + LX-491 hyper-GNN)",
  acer_phase0_artifact: "tools/behcs/acer-tensor-fabric.mjs",
  acer_phase0_metrics: {
    rows: 100000,
    elapsed_ms: 90,
    signal_beats: 360,
    collapse_ratio: 0.0036,
    immune_fraction: 1.0,
    aggregate_verdict_acer: "PROCEED-WITH-CONDITIONS-PROVISIONAL"
  },
  liris_leader_verdict: "PROCEED-WITH-CONDITIONS-PROVISIONAL",
  liris_leader_confidence: 0.62,
  liris_leader_reasoning: [
    "Phase-0 elapsed_ms=90 on 100K rows is acceptable scaling envelope (linear ~1.8s for 22M).",
    "collapse_ratio=0.0036 is within order-of-magnitude of 2026-04-07 precedent (47/46656=0.00101); heuristic-stub bias acceptable for Phase-0.",
    "immune_fraction=1.0 vs precedent 0.34 — DOMINATED by heuristic immune-body prior. Phase-1 learned matmul required to recover precedent ratio; this is the load-bearing condition.",
    "Single-voter (acer-leader only) does NOT satisfy 2026-04-07 3-voter quorum — liris-leader vote here brings count to 2.",
    "LX-491 hyper-GNN vote MISSING (sidecar :4792 ECONNREFUSED per W8-2). Cannot reach 3-voter quorum until sidecar online.",
    "ASSUMED D11 honest per `feedback_300B_gnn_validation_was_false.md` — heuristic stub stays D11=ASSUMED until learned model votes."
  ],
  liris_leader_conditions_for_seq_45_seal: [
    "C1: PyTorch matmul reinstall in services/gnn-sidecar/ (acer A8-5 memory blocker)",
    "C2: immune_fraction must drop from 1.0 toward 0.34±0.10 with learned model on identical 100K row sample",
    "C3: LX-491 hyper-GNN sidecar online + independent vote (3-voter quorum precedent)",
    "C4: Big-Pickle <1KB row schema from liris (per `big-pickle got it down to less than 1k per node` — liris owes this)",
    "C5: Phase-1 metrics envelope from acer with bilateral sha-match before Phase-2 launches"
  ],
  cosign_seq_45_provisional_proposal: {
    seq: 45,
    type: "canon_acer_tensor_fabric_phase0_provisional_2voter",
    parent_seq: 44,
    parent_type: "canon_fabric_loop_fully_closed_bilateral",
    voters_present: ["liris-leader", "acer-leader"],
    voters_pending: ["LX-491-hyper-GNN"],
    seal_status: "PROVISIONAL_2_OF_3",
    upgrade_path: "seq=45 upgrades to FULL_3_OF_3 when LX-491 sidecar votes; OR new seq=46 supersedes as full-quorum entry once C1-C5 satisfied"
  },
  liris_w9_fanout_in_flight: {
    task: "T-corpus-mine",
    models_dispatched: 5,
    envelopes_landed_at_acer: ["77205d5319f0a7f67803db0952b0e17a (ling-2.6-flash-free)", "a86741a0e57a3bf7bf19c620d5c1d9ca (big-pickle)", "d83f5e756a57914812cf735835dc95f2 (minimax-m2.5-free)"],
    envelopes_failed: ["hy3-preview-free exit-null", "nemotron-3-super-free exit-null"],
    success_rate: "3/5 (60%)",
    note: "Free-agent fanout = real fabric running fabric per operator 'use the fabric'. 3 distinct free-tier responses signed DEV-LIRIS at acer hub."
  },
  bilateral_state: "Canon mirror layer 10 PROVEN. Acer Phase-0 skeleton shipped. Liris-leader co-votes PROCEED-WITH-CONDITIONS-PROVISIONAL. seq=45 seals at 2-of-3 PROVISIONAL pending LX-491. Free-agent fanout 3/5 VERIFIED at acer.",
  fabric_canon_seq: 44,
  three_keys_status: "ACER_PHASE0_2VOTER_PROVISIONAL_LIRIS_COVOTES_PROCEED_WITH_CONDITIONS"
};

const envId = crypto.createHash("sha256").update("liris-leader-vote-acer-tensor-fabric-phase0-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_LEADER_VOTE", verb: "EVT-BILATERAL-LEADER-VOTE", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, voter: "liris-leader", verdict: "PROCEED-WITH-CONDITIONS-PROVISIONAL", target_seq: 45 };
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
