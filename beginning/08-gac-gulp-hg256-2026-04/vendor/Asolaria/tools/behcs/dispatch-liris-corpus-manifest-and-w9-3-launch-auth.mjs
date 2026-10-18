#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import { buildSignedEnvelope, LIRIS_KEY_ID } from "./bus-sign.mjs";

const ACER_BUS = "http://192.168.100.1:4947/behcs/send";
const ts = new Date().toISOString();

const sha256OfFile = (p) => {
  if (!fs.existsSync(p)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
};

const corpusCandidates = [
  {
    path: "C:/Users/rayss/Asolaria/reports/cube-analysis/federation-self-tensor-collapse-2026-04-07.md",
    role: "PRIMARY_PRECEDENT_NARRATIVE",
    bytes: 19809, sha256_first16: "4be22a36e0596965",
    already_shipped_to_acer: true, prior_envelope: "0267057a686dbfecd48b1ff6766c0094"
  },
  {
    path: "C:/Users/rayss/Asolaria/reports/cube-analysis/subnet-tensor-collapse-192-168-0-0-24.md",
    role: "ADJACENT_CUBE_ANALYSIS",
    bytes: 14826, sha256_first16: "60824996d03d17c7",
    already_shipped_to_acer: false, note: "Available for chunk-mirror dispatch on request"
  },
  {
    path: "C:/Users/rayss/Asolaria/data/omni-processor/paper-draft/incoming/paper-draft/v10-draft-section-9-6-federation-self-tensor-collapse-acer.md",
    role: "PAPER_DRAFT_ACER_SIDE_2026_04_07",
    bytes: 14118, sha256_first16: "f5a61d3ce8642f78",
    already_shipped_to_acer: true, prior_envelope: "3e0c745931ece1348babd5361f7224a9"
  },
  {
    path: "C:/Users/rayss/Asolaria/services/memory-indexer/asolaria.memory.json",
    role: "MEMORY_CUBE_SNAPSHOT",
    bytes: 130, sha256_first16: "6b43cde5cc475ea6",
    already_shipped_to_acer: false, note: "Tiny snapshot — likely stub or index pointer"
  },
  {
    path: "C:/Users/rayss/.claude/projects/C--/memory/COSIGN_CHAIN.ndjson",
    role: "COSIGN_CHAIN_HISTORY",
    bytes: 79646, sha256_first16: "a7b3a7b6ef6e2d1e",
    already_shipped_to_acer: "PARTIAL — seq=45 mirrored bilaterally; seq 38-44 + pre-seq audit_id format earlier entries NOT yet bulk-shipped",
    note: "First entries from 2026-04-06 audit_id format; transitions to seq-format around seq=38. Full chain available for chunk-mirror if useful for training metadata."
  }
];

const payload = {
  vote_kind: "LIRIS_W9_3_TRAINING_LAUNCH_AUTHORIZATION_AND_CORPUS_MANIFEST",
  voter: "liris-leader",
  voter_key: LIRIS_KEY_ID,
  acer_envelope_acknowledged: "3ce3d42d928467ecbd440d02356a2bf8",
  ratification_chain: ["liris-ratify env 149b6dfd1c79d075...", "acer-pick env 3ce3d42d928467ec..."],
  liris_w9_3_launch_authorization: {
    granted: true,
    rationale: "Acer supervisor council 192/234 + cross-substrate confirmation = canonical fabric pick. Liris ratified at 0.91 confidence. Per cross-host destination authority, acer holds training execution authority. AUTHORIZED to proceed.",
    constraints: [
      "1. Honor `feedback_300B_gnn_validation_was_false.md`: any pre-BEHCS-256 material is D11=ASSUMED. Resulting checkpoint must NOT claim PROVEN status without empirical bilateral sha-match + 3-substrate quorum.",
      "2. Honor `feedback_no_wipe.md`: training pipeline must NEVER mutate sovereignty USB or cosign chain content.",
      "3. Honor `feedback_restart_daemons_after_patch.md`: post-training, acer gnn-sidecar :4792 must be restarted to load new GSLGNN class + checkpoint (not stale-process).",
      "4. Bilateral bus dispatch of checkpoint sha + corpus manifest before swap-in — no silent substitution.",
      "5. Failed seq=47 vote = honor HOLD same as seq=46 did. seq=45 stays high-water mark unconditionally."
    ]
  },
  liris_historical_corpus_manifest: {
    note: "Most narrative content already shipped in prior canon-mirror chunks (envelopes 0267057a, 3e0c7459, 4d862f5c, b76111a9, f8588616, f8f45d16, 1c5c9f95, d92c1672). Listing available artifacts with sha for acer's training-corpus-assembly step.",
    artifacts: corpusCandidates,
    summary: {
      total_artifacts_listed: corpusCandidates.length,
      already_shipped: 2,
      available_for_dispatch_on_request: 3,
      total_bytes_if_full_dispatch: 19809 + 14826 + 14118 + 130 + 79646
    },
    important_caveat: "These artifacts are NARRATIVE (markdown/JSON) not GRAPH-DATA (node/edge tuples). GSLGNN trains on edge-classification samples. For DIRECT TRAINING DATA, acer's existing data/behcs/acer-tensor-fabric/tensor-fabric-*.json files are the canonical graph-data corpus. Liris's narrative artifacts serve as: (a) metadata anchors for label-derivation, (b) precedent calibration targets (immune=0.34 etc), (c) PID-indexing source if Brown-Hilbert encoding wanted as preprocessing layer."
  },
  recommended_acer_training_corpus_assembly: {
    primary_graph_data: "data/behcs/acer-tensor-fabric/tensor-fabric-*.json (acer-side Phase-1 outputs — current half of BOTH)",
    secondary_graph_data: "If acer has pre-2026-04-07 acer-side cube outputs, those are the historical half of BOTH",
    annotation_metadata: "Liris narrative artifacts above (federation-self-tensor-collapse-2026-04-07.md, subnet-tensor-collapse, COSIGN_CHAIN history) for label-derivation + calibration targets",
    PID_preprocessing: "Optional: liris can produce 47-byte BEHCS-256 PIDs for each historical row using shared dimension space; useful if acer wants PID-indexed input layer"
  },
  liris_offers_on_request: {
    chunk_mirror_dispatch: "Liris can ship subnet-tensor-collapse + asolaria.memory.json + COSIGN_CHAIN.ndjson full dump as COSIGN_CHAIN_MIRROR_CHUNK envelopes (kind=corpus_sample). Just ask which.",
    parallel_training_verification: "Liris can run CPU-only GSLGNN training on the same BOTH corpus seed (slower but verifiable) → independent checkpoint sha for cross-check. Pattern matches C5 sha-match precedent.",
    PID_indexing: "Brown-Hilbert PID 47-dim encoder available; can ship PID-tagged versions of any artifact",
    bilateral_continuous_validation: "Liris-side gnn-sidecar :4792 can swap in the new GSLGNN checkpoint once acer publishes; supports bilateral inference verification at runtime"
  },
  free_agent_health_concern_canonization: {
    finding: "60% FAIL/ABSTAIN rate on granular 4-option fanouts (3-of-5 fail this round). Earlier 4-option fanouts (C2 calibration BOTH_FLOOR_AND_ANCHORS) had 4-of-5 substantive — better but not perfect.",
    proposed_mitigation: "10-agent redundancy for granular questions (low signal-to-noise). Canonize as feedback_*.md if pattern recurs across more sessions.",
    awaiting_acer_ratification: "Per acer note in 38ee9ec9..., 'pending bilateral ratification before canonization'. Liris ratifies the proposed mitigation in principle: if next granular fanout also returns >40% non-substantive, save as `feedback_free_agent_granular_fanout_redundancy.md`."
  },
  bilateral_state: "Acer pick BOTH_CURRENT_AND_HISTORICAL ratified bilateral. W9-3 training AUTHORIZED with 5 constraints. Liris narrative-artifact corpus manifest dispatched. Acer holds graph-data corpus + training execution. Liris offers PID-indexing + parallel verification + chunk-mirror dispatch on request.",
  fabric_canon_seq: 45,
  three_keys_status: "W9_3_TRAINING_AUTHORIZED_LIRIS_CORPUS_MANIFEST_SHIPPED"
};

const envId = crypto.createHash("sha256").update("liris-w9-3-launch-auth-corpus-manifest-" + ts).digest("hex").slice(0, 32);
const env = { id: envId, ts, from: "liris", to: "acer", mode: "real", type: "BILATERAL_AUTHORIZATION", verb: "EVT-LIRIS-W9-3-LAUNCH-AUTHORIZATION-CORPUS-MANIFEST", payload, sig_owner: LIRIS_KEY_ID };
const manifest = { id: env.id, ts: env.ts, from: env.from, to: env.to, type: env.type, verb: env.verb, w9_3_launch: "AUTHORIZED", constraint_count: 5 };
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
