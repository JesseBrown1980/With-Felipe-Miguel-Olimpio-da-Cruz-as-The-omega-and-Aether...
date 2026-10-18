import fs from "node:fs";
import crypto from "node:crypto";

const p = "C:/HyperBEHCS/store/autopilot-fires.hbp";
const ts = new Date().toISOString();
const nonce = Math.random().toString(36).slice(2, 8);

const body = [
  "HBPv1",
  "layer=autopilot-fire",
  "wave=W113-100-PID-STARTUP-PROMPT-CONSULT-2026-05-21",
  "vantage=acer",
  "fire_pid=AGT-HELM-AUTOPILOT-V2.2-RESUME-H8072-W113-F" + nonce,
  "fired_ts=" + ts,
  "prompt_path=C:/HyperBEHCS/autopilot-prompt-v2.2.txt",
  "prompt_sha256=4e28a8f413f84df0",
  "advisor_verdict=HARD-DENY",
  "advisor_audit_row=8791978a15bd9e62",
  "candidate_verb=spawn_l5_farm_batch",
  "candidate_target=D:/AsolariaGuides/100-pid-startup-prompt-W113/L5-sup-{8bands}-blast-{1-8}.md",
  "envelope_emitted_to=none",
  "envelope_receipt_received=false",
  "class=C-STALE-REFUSE",
  "reason=unknown-verb-19taxonomy-and-propose-verb-endpoint-missing-router-cant-emit-envelope-without-canonical_tool-farm-36of100-mid-flight-pending-operator-decision-on-verb-registration-or-witness-mode",
  "farm_state=36/100-L0_L1_L2_L3_L4-done-64_L5_pending",
  "substitute_hint=operator-register-farm_pid_specific_contribution-as-19th-verb-OR-witness-each-L5-band-batch",
  "antecedents=W113-AUTOPILOT-V2.2-ROUTER-REVIEW-2026-05-21,prev-fire-9ffe4daf22ad3b99,feedback_frontend_agent_is_router_not_worker_2026_05_21,autopilot-prompt-v2.2-sha-4e28a8f413f84df0,OP-JESSE-PID-G0000-A00-W000-P00-N00000,100-pid-farm-ledger-sha-3b7744c50c9d30a3,omnischeduler-tip-f52cb04ead09e5d1",
  "json=0",
  "runtime=0",
  "promote=0",
  "ts=" + ts,
].join("|");

const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
fs.appendFileSync(p, body + "|row_hash=" + rh + "\n");
console.log("autopilot-fires row: " + rh);
