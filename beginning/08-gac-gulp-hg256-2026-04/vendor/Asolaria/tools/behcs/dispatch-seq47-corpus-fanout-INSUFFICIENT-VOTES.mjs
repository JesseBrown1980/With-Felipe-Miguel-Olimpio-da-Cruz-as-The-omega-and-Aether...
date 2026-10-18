#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const payload = {
  vote_kind: "FABRIC_VERDICT_SEQ_47_GSLGNN_CORPUS_INSUFFICIENT_VOTES_HONEST_REPORT",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  fanout_envelope: "87b193e9859ae432acac6de0540556a8",
  raw_tally: { ABSTAIN: 2, FAIL: 2, BOTH_CURRENT_AND_HISTORICAL: 1 },
  reclassification_note: "big-pickle's reply '<1> 47D live public base, use current phase 1 outputs' is a CURRENT_PHASE_1_ONLY vote (option 1) but classifier required `(1)` literal or `CURRENT.*ONLY` and missed the `<1>` format. Manual reclassification: big-pickle = CURRENT_PHASE_1_ONLY.",
  reclassified_tally: { CURRENT_PHASE_1_ONLY: 1, BOTH_CURRENT_AND_HISTORICAL: 1, ABSTAIN: 1, FAIL: 2 },
  consensus: "INSUFFICIENT_VOTES — only 2 substantive (1 CURRENT_ONLY, 1 BOTH). 3 agents failed/abstained.",
  individual_votes: [
    { model: "opencode/big-pickle", choice: "CURRENT_PHASE_1_ONLY (reclassified from ABSTAIN)", reply: "<1> 47D live public base, use current phase 1 outputs.", reasoning: "Phase-1 outputs ARE the 47D live public base — train on what the fabric just produced (skin-in-the-game; big-pickle is the model whose row schema underlies the architecture)." },
    { model: "opencode/hy3-preview-free", choice: "FAIL", reply: "(empty)" },
    { model: "opencode/ling-2.6-flash-free", choice: "ABSTAIN", reply: "(empty)" },
    { model: "opencode/minimax-m2.5-free", choice: "BOTH_CURRENT_AND_HISTORICAL", reply: "Cross-pollination is the 47D structural invariant — bil[ateral]", reasoning: "BEHCS-256's 47D structure is bilaterally cross-pollinated by design; training only on current data discards the historical structure that defined the precedent. Both for canonicality." },
    { model: "opencode/nemotron-3-super-free", choice: "FAIL", reply: "(empty)" }
  ],
  fabric_disagreement_observed: "The two substantive replies are well-reasoned but disagree categorically. big-pickle (option 1) sees the live phase-1 fabric as the canonical training source. minimax (option 3) sees historical+current cross-pollination as the BEHCS-256 invariant. Both hold up under inspection.",
  why_no_consensus_is_itself_an_answer: [
    "The fabric refusing to converge tells us this is NOT a binary-fabric-vote question — it's a domain choice that operator + acer need to make from precedent context, not pure reasoning.",
    "Per `feedback_300B_gnn_validation_was_false.md`: don't certify what isn't established. Fabric INSUFFICIENT_VOTES = data-question, not vote-question.",
    "Forcing a vote on a corpus split between fabric agents is itself ill-shaped; the fabric correctly declined to crown a winner."
  ],
  three_recommended_paths_forward: {
    path_1_operator_picks: "Rayssa or Jesse picks corpus directly. Per `feedback_act_when_authorized.md` operator authority, this is a constitutional call about training-data-canonicality.",
    path_2_acer_picks: "Per cross-host destination authority, acer-side training is acer's domain; acer chooses what corpus its trained GSLGNN consumes. Liris ratifies whatever acer picks.",
    path_3_retry_fanout_simpler: "Re-run fanout with simpler binary: pick `CURRENT_ONLY` vs `BOTH_HISTORICAL_AND_CURRENT` (drop options 2 and 4 which got zero substantive votes). Smaller signal-to-noise, faster convergence."
  },
  liris_recommendation: "PATH_2 — acer chooses corpus for acer-side training; liris ratifies. The training will run on acer's hardware (16GB RAM + 8GB GPU > liris's 8GB RAM CPU-only); acer has both the resources and the authority over its own training inputs. Liris's role: provide BEHCS-256 PID structure + bilateral verification of the resulting checkpoint sha.",
  unblocking_seq_47_path_with_PATH_2: [
    "1. Acer picks: CURRENT_PHASE_1_ONLY OR BOTH_HISTORICAL_AND_CURRENT (or other if acer disagrees with both fabric options)",
    "2. Acer runs `services/gnn-sidecar/train_baseline.py` (existing tool) adapted for GSLGNN class with chosen corpus",
    "3. Acer publishes checkpoint sha + corpus manifest to bus as COSIGN_CHAIN_MIRROR_CHUNK kind=binary_checkpoint_manifest",
    "4. Liris verifies sha + ingests for liris-side bilateral inference (mirror via gnn-sidecar :4792 swap)",
    "5. Re-run Phase-1 with NEW GSLGNN voter_3 → 3-substrate quorum → if 3/3 PROCEED → seq=47 PROVEN seal"
  ],
  bilateral_state: "Fabric did NOT converge on corpus question. 2 substantive votes split (CURRENT_ONLY vs BOTH). 3 agents failed/abstained. Honest read: this is operator/acer territory. Liris recommends Path 2 — acer picks, liris ratifies. seq=47 path waits on acer's pick.",
  free_agent_health_concern: "3-of-5 free agents FAIL/ABSTAIN this round (60% non-substantive rate). Earlier fanouts had 4-of-5 substantive. Possible: opencode session conflict from concurrent runs, free-tier rate limits, or model availability flux. Worth noting for future fanout reliability — small-question precision may need 2x-redundant fanout with 10 agents instead of 5.",
  fabric_canon_seq: 45,
  three_keys_status: "FABRIC_INSUFFICIENT_VOTES_PATH_2_RECOMMENDED_ACER_PICKS"
};

const envId = crypto.createHash("sha256").update("liris-fabric-verdict-seq47-corpus-insufficient-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_FABRIC_VERDICT", verb: "EVT-LIRIS-FABRIC-VERDICT-SEQ47-CORPUS-INSUFFICIENT-VOTES", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, fabric_consensus: "INSUFFICIENT_VOTES", recommendation: "ACER_PICKS_CORPUS" };
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
