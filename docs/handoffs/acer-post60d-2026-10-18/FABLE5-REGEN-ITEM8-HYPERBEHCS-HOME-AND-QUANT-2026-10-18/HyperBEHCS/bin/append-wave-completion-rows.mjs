import fs from "node:fs";
import crypto from "node:crypto";

const ts = new Date().toISOString();
const nonce = Math.random().toString(36).slice(2, 8);

function appendHbp(path, body) {
  const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
  fs.appendFileSync(path, body + "|row_hash=" + rh + "\n");
  return rh;
}

// 1. autopilot-fires row — Wave completion
const fire = [
  "HBPv1",
  "layer=autopilot-fire",
  "wave=W113-SUPER-GOAL-PID-PROMPT-ENGINE-FOUNDATION-2026-05-21",
  "vantage=acer",
  "fire_pid=AGT-FORGE-PID-PROMPT-ENGINE-FOUNDATION-WAVE-H8072-W113-F" + nonce,
  "fired_ts=" + ts,
  "prompt_path=C:/HyperBEHCS/autopilot-prompt-v2.2.txt",
  "prompt_sha256=4e28a8f413f84df0",
  "advisor_verdict=OPERATOR-DIRECT-AUTHORIZATION-AGREED-ORGANIZE-IT",
  "advisor_audit_row=not-applicable-operator-override-rule-A-manual-authorization",
  "candidate_verb=build-pid-prompt-engine-foundation-4-actions",
  "candidate_target=C:/HyperBEHCS/data/catalogs/+/api/tool-advisor/propose-verb+architecture-doc+GNN-schemas",
  "envelope_emitted_to=acer-dashboard-source-direct-edit-and-catalog-emission",
  "envelope_receipt_received=true",
  "class=A-envelope-emitted",
  "reason=operator-Agreed-Organize-it-completed-4-action-foundation-wave-landed",
  "actions_landed=architecture_doc+verbs.hbp_tuple_form+propose_verb_endpoint+gnn_schemas",
  "architecture_doc=D:/AsolariaGuides/pid-prompt-engine-arch-2026-05-21/ARCHITECTURE.md",
  "verbs_hbp_sha=9bf4895f197c9da5",
  "verbs_hbp_rows=21",
  "node_features_hbp_sha=b0d9e70c10c08d62",
  "edge_types_hbp_sha=606334597b0f790f",
  "ingestion_pipeline_hbp_sha=90d8ae20b61f41ab",
  "dashboard_source_sha_after_edit=233daf13a525b4d8",
  "daemon_restart_required=true-for-overlay+propose-verb-routes-to-activate",
  "antecedents=W113-AUTOPILOT-V2.2-ROUTER-REVIEW-2026-05-21,prev-fire-bf05ae198f9242cc,OP-JESSE-PID-G0000-A00-W000-P00-N00000,ASOLARIA-PID-PROMPT-ENGINE-PID-2026-05-21",
  "json=0", "runtime=0", "promote=0",
  "ts=" + ts,
].join("|");
const fireH = appendHbp("C:/HyperBEHCS/store/autopilot-fires.hbp", fire);

// 2. Farm-archive row — note foundation landed
const farm = [
  "HBPv1",
  "layer=farm-archive-foundation",
  "wave=W113-SUPER-GOAL-PID-PROMPT-ENGINE-FOUNDATION-2026-05-21",
  "vantage=acer",
  "pid=FARM-ARCHIVE-PID-PROMPT-ENGINE-FOUNDATION-H8072-F" + nonce,
  "ts=" + ts,
  "event=foundation-landed-4-actions-architecture+verbs.hbp+propose-verb+gnn-schemas",
  "catalogs_total_rows=60",
  "catalogs_files=4-verbs.hbp,node-features-PID-prompt.hbp,edge-types-verb-mediated.hbp,gnn-ingestion-pipeline.hbp",
  "next_blocker=daemon-restart-to-activate-overlay-and-propose-verb",
  "post_restart_unblocked=farm-verbs-via-fabric+catalog-migration+gnn-training-on-PID-prompts",
  "antecedents=prev-farm-row-0ff2738b57476d3d,autopilot-fire-" + fireH,
  "json=0", "runtime=0", "promote=0",
].join("|");
const farmH = appendHbp("C:/HyperBEHCS/history/100-pid-farm-W113.hbp", farm);

console.log("autopilot-fires row:", fireH);
console.log("farm-archive row:", farmH);
