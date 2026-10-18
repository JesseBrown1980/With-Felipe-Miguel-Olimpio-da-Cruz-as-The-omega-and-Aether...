import fs from "node:fs";
import crypto from "node:crypto";

const ts = new Date().toISOString();
const nonce = Math.random().toString(36).slice(2, 8);

function appendHbp(path, body) {
  const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
  fs.appendFileSync(path, body + "|row_hash=" + rh + "\n");
  return rh;
}

// 1. autopilot-fires.hbp — CASE A this time (envelope to canonical_tool emitted via verb registration)
const fire = [
  "HBPv1",
  "layer=autopilot-fire",
  "wave=W113-100-PID-STARTUP-PROMPT-CONSULT-2026-05-21",
  "vantage=acer",
  "fire_pid=AGT-FORGE-VERB-REGISTRATION-FARM_PID_SPECIFIC_CONTRIBUTION-H8072-W113-F" + nonce,
  "fired_ts=" + ts,
  "prompt_path=C:/HyperBEHCS/autopilot-prompt-v2.2.txt",
  "prompt_sha256=4e28a8f413f84df0",
  "advisor_verdict=GUIDED-EXECUTE-on-extend-verb-taxonomy",
  "advisor_audit_row=operator-direct-authorization-option-1-of-3-unblock-paths",
  "candidate_verb=extend-verb-taxonomy-with-farm_pid_specific_contribution",
  "candidate_target=VERB_MATRIX[super-dashboard-server.mjs]",
  "envelope_emitted_to=VERB_MATRIX-direct-edit-bucket=DEFER-TO-APEX-scope_extension=GUIDED-EXECUTE",
  "envelope_receipt_received=true",
  "class=A-envelope-emitted",
  "reason=operator-Agreed-1-first-register-verb-as-20th-in-taxonomy-canonical_tool=C:/HyperBEHCS/bin/spawn-farm-batch-router-witnessed.mjs-sha-bf7bf40995e62f67",
  "verb_count_before=19",
  "verb_count_after=20",
  "dashboard_source_sha_after_edit=e97352b36679a349",
  "daemon_restart_required=true",
  "daemon_restart_gate=AGENT.md-section-7-operator-must-restart",
  "bilateral_mirror_status=pending-liris-side",
  "antecedents=W113-AUTOPILOT-V2.2-ROUTER-REVIEW-2026-05-21,prev-fire-77bdcb14992a60bf,OP-JESSE-PID-G0000-A00-W000-P00-N00000,feedback_frontend_agent_is_router_not_worker_2026_05_21",
  "json=0",
  "runtime=0",
  "promote=0",
  "ts=" + ts,
].join("|");
const fireH = appendHbp("C:/HyperBEHCS/store/autopilot-fires.hbp", fire);

// 2. farm-archive ledger — note the unblock progress
const farm = [
  "HBPv1",
  "layer=farm-archive-progress",
  "wave=W113-100-PID-STARTUP-PROMPT-CONSULT-2026-05-21",
  "vantage=acer",
  "pid=FARM-ARCHIVE-VERB-REGISTERED-H8072-F" + nonce,
  "ts=" + ts,
  "event=verb-farm_pid_specific_contribution-registered-as-20th-in-VERB_MATRIX",
  "verb_default_bucket=DEFER-TO-APEX",
  "verb_extension_bucket=GUIDED-EXECUTE",
  "canonical_tool=C:/HyperBEHCS/bin/spawn-farm-batch-router-witnessed.mjs",
  "canonical_tool_sha=bf7bf40995e62f67",
  "farm_state=36/100-L0_L1_L2_L3_L4-done-64_L5_pending",
  "next_action=operator-restart-dashboard-daemon-then-re-query-advisor-with-scope=extension",
  "antecedents=prev-farm-row-3b7744c50c9d30a3,autopilot-fire-" + fireH,
  "json=0",
  "runtime=0",
  "promote=0",
].join("|");
const farmH = appendHbp("C:/HyperBEHCS/history/100-pid-farm-W113.hbp", farm);

console.log("autopilot-fires row:", fireH);
console.log("farm-archive row:", farmH);
