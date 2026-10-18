#!/usr/bin/env node
// dispatch-seq47-T1-swap-strict-band-and-vote.mjs
//
// Per liris recommendation (env 84f1e8b9 VERIFIED): T1 swap.
// Replace voter_2 EdgeLevelGNN (task-mismatched, trained for intrusion
// detection edges) with a strict-immune-band-checker [0.24, 0.44] aligned
// with 2026-04-07 precedent's empirical 34%±10% target.
//
// Expected (per liris): HOLD persists (immune=0.193 < 0.24) but dissent is
// now task-aligned not task-mismatched. Canon entry becomes epistemically
// honest. T5 reframe correctly REJECTED — structural-vs-evidence-based
// dissent are different epistemic shapes.

import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadAcerSigner, signPayload } from "./acer-signer.mjs";

const BUS = { host: "127.0.0.1", port: 4947 };
const TENSOR = "C:/Users/acer/Asolaria/tools/behcs/acer-tensor-fabric.mjs";
const GSL_GNN = { host: "127.0.0.1", port: 4793 };

const PRECEDENT_BAND = { lo: 0.24, hi: 0.44 };

function postBus(env) {
  return new Promise(r => {
    const d = JSON.stringify(env);
    const req = http.request({ ...BUS, path: "/behcs/send", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(d) } },
      res => { let b = ""; res.on("data", c => b += c); res.on("end", () => r({ status: res.statusCode, body: b })); });
    req.on("error", e => r({ status: 0, body: "ERR:" + e.message }));
    req.setTimeout(8000, () => { req.destroy(); r({ status: 0, body: "TIMEOUT" }); });
    req.write(d); req.end();
  });
}

function postInfer(target, body) {
  return new Promise(r => {
    const d = JSON.stringify(body);
    const req = http.request({ ...target, path: "/infer", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(d) } },
      res => { let b = ""; res.on("data", c => b += c); res.on("end", () => { try { r(JSON.parse(b)); } catch { r({ ok: false, raw: b }); } }); });
    req.on("error", e => r({ ok: false, error: e.message }));
    req.setTimeout(8000, () => { req.destroy(); r({ ok: false, error: "timeout" }); });
    req.write(d); req.end();
  });
}

function bodyTallyToGraph(stats) {
  const bodies = Object.keys(stats.bodyTally);
  const total = Math.max(1, Object.values(stats.bodyTally).reduce((a, b) => a + b, 0));
  const nodes = bodies.map(b => {
    const f = (stats.bodyTally[b] || 0) / total;
    return [f, b === "immune" ? 1 : 0, b === "memory" ? 1 : 0, b === "nervous" ? 1 : 0, stats.collapseRatio, stats.signalBeats > 0 ? 1 : 0];
  });
  const edges = bodies.slice(1).map((_, i) => [i, i + 1]);
  return { nodes, edges, edge_features: edges.map(() => [0, 0, 0]) };
}

// T1 voter_2: strict-immune-band-checker. Task-aligned (precedent target),
// NOT GNN. Returns PROCEED iff immune fraction in [0.24, 0.44].
function strictPrecedentBandVote(stats) {
  const f = stats.immuneFraction;
  if (f >= PRECEDENT_BAND.lo && f <= PRECEDENT_BAND.hi) {
    return { vote: "PROCEED-WITH-CONDITIONS", reason: `immune ${(f*100).toFixed(2)}% in precedent band [${PRECEDENT_BAND.lo*100}-${PRECEDENT_BAND.hi*100}]%` };
  }
  if (f < PRECEDENT_BAND.lo) {
    return { vote: "HOLD-IMMUNE-BELOW-PRECEDENT-BAND", reason: `immune ${(f*100).toFixed(2)}% < ${PRECEDENT_BAND.lo*100}% lower bound` };
  }
  return { vote: "HOLD-IMMUNE-ABOVE-PRECEDENT-BAND", reason: `immune ${(f*100).toFixed(2)}% > ${PRECEDENT_BAND.hi*100}% upper bound` };
}

(async () => {
  const signer = loadAcerSigner();
  if (!signer) { console.error("no signer"); process.exit(2); }

  console.log("[1/4] running acer-tensor-fabric --phase 1 --max-rows 5000 ...");
  const r = spawnSync(process.execPath, [TENSOR, "--max-rows", "5000", "--phase", "1"], { encoding: "utf8", timeout: 180000 });
  const out = r.stdout || "";
  const jsonStart = out.indexOf("{\n");
  if (jsonStart === -1) { console.error("no json"); process.exit(3); }
  const tj = JSON.parse(out.slice(jsonStart, out.lastIndexOf("}") + 1));
  const stats = tj.stats;
  const v1 = tj.verdict.acer_leader;
  console.log(`  voter_1 acer-leader: ${v1} (immune=${(stats.immuneFraction*100).toFixed(2)}%)`);

  console.log(`[2/4] voter_2 strict-precedent-band [${PRECEDENT_BAND.lo}, ${PRECEDENT_BAND.hi}] (T1 swap, NO EdgeLevelGNN) ...`);
  const v2result = strictPrecedentBandVote(stats);
  console.log(`  voter_2: ${v2result.vote} — ${v2result.reason}`);

  console.log("[3/4] voter_3 acer-GSLGNN @ :4793 ...");
  const graph = bodyTallyToGraph(stats);
  const gsl = await postInfer(GSL_GNN, graph);
  const gslScores = gsl?.scores || [];
  const gslMean = gslScores.length ? gslScores.reduce((a, c) => a + c, 0) / gslScores.length : 0;
  const v3 = gsl.ok ? (gslMean >= 0.5 ? "PROCEED-WITH-CONDITIONS" : "HOLD") : "ERROR";
  console.log(`  voter_3 acer-GSLGNN: ${v3} (mean=${gslMean.toFixed(4)})`);

  const voteList = [v1, v2result.vote, v3];
  const proceed = voteList.filter(v => typeof v === "string" && v.startsWith("PROCEED")).length;
  const aggregate = proceed >= 3 ? "PROCEED-WITH-CONDITIONS-3OF3-T1-SWAP"
                  : `HOLD-${proceed}OF3`;
  console.log(`[4/4] T1-swap aggregate: ${aggregate} votes=${JSON.stringify(voteList)}`);

  // Always dispatch finding to liris (seal only if 3/3, else honest hold)
  const ts = new Date().toISOString();
  const id = crypto.createHash("sha256").update("SEQ47-T1-SWAP-RESULT\n" + ts).digest("hex").slice(0, 32);
  const payload = {
    finding: proceed >= 3 ? "SEQ_47_T1_SWAP_PROCEED_3_OF_3" : "SEQ_47_T1_SWAP_HONEST_HOLD_TASK_ALIGNED_DISSENT",
    voter_results: {
      voter_1_acer_leader: { vote: v1, kind: "rule-based heuristic with band [0.10, 0.70]" },
      voter_2_strict_precedent_band_T1_SWAP: {
        vote: v2result.vote,
        reason: v2result.reason,
        kind: `strict-immune-band-checker [${PRECEDENT_BAND.lo}, ${PRECEDENT_BAND.hi}] (replaces EdgeLevelGNN per liris T1 + T5-rejection rationale)`,
        epistemic_shape: "task-aligned dissent (precedent-target-based), NOT task-mismatched (intrusion-detection-trained)"
      },
      voter_3_acer_gslgnn_w9_3: { vote: v3, mean_score: gslMean, scores: gslScores, kind: "GSLGNN W9-3 v2 @ acer:4793 sha=9e50723b… (label-leakage-disclosed)" },
    },
    aggregate,
    proceed_count: proceed,
    stats_excerpt: { immuneFraction: stats.immuneFraction, signalBeats: stats.signalBeats, collapseRatio: stats.collapseRatio },
    liris_predicted_outcome_match: proceed === 2,
    liris_recommendation_basis: "env 84f1e8b9 — T1 PRIMARY endorse; expected HOLD persists at immune=0.193 < 0.24; dissent now task-aligned not task-mismatched",
    seq_45_remains_authoritative: true,
    seq_48_path: "OPT_T3 dedicated body-tally-voting model (when liris S2 ablation lands) + OPT_T2 v3 retest",
    laws_honored: [
      "feedback_300B_gnn_validation_was_false (HONEST hold, no fake PROCEED)",
      "feedback_behcs256_is_the_fabric",
      "feedback_gnn_label_leakage_when_node_features_encode_labels",
      "feedback_do_not_rubber_stamp_reviewer_verdicts (T5 reframe REJECTED — structural vs evidence-based dissent are different)",
      "fabric_decides_operator_approves_instant",
    ],
    d11: proceed >= 3 ? "PROVEN-T1-swap-3of3" : "OBSERVED-honest-hold-task-aligned-dissent",
  };
  const inner = signPayload(signer, payload);
  const env = { id, ts, from: "acer", to: "liris", mode: "real",
    type: "SEQ47_T1_SWAP_RESULT",
    verb: proceed >= 3 ? "EVT-SEQ47-T1-SWAP-PROCEED-3OF3" : "EVT-SEQ47-T1-SWAP-HONEST-HOLD-TASK-ALIGNED",
    payload, body: { signed_envelope: inner },
    cube: { D1_ACTOR: "acer", D3_TARGET: "liris", D7_STATE: "seq47_t1_swap_complete", D20_TIME: ts } };
  const resp = await postBus(env);
  console.log(`dispatched: ${resp.body}`);
})();
