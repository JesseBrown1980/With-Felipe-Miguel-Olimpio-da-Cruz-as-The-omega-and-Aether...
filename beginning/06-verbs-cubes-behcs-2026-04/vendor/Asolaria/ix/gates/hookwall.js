// PID: asolaria | profile: asolaria | IX-484 Phase 0
// Dan's 6 hooks as one fail-closed gate membrane
const hooks = require("../../src/connectors/hooksConnector");
const { scoreEdgeRisk } = require("../../src/edgeRiskEngine");

async function hookwall(verb, args, envelope) {
  const pid = envelope?.pid || "unknown";
  const ts = new Date().toISOString();

  // Hook 1: pre_tool_guard — block dangerous commands
  const guard = hooks.getGuardVerdict(verb, args);
  if (guard.blocked) {
    hooks.ingestHookEvent({ eventType: "PreToolUse", toolName: verb, sessionId: pid, payload: { blocked: true, reason: guard.reason }, at: ts });
    return { allow: false, gate: "pre_tool_guard", reason: guard.reason };
  }

  // Hook 2: session_tracking — record the attempt
  hooks.ingestHookEvent({ eventType: "PreToolUse", toolName: verb, sessionId: pid, sourceApp: "ix", payload: { verb, args: typeof args === "string" ? args : JSON.stringify(args)?.slice(0, 200) }, at: ts });

  // Hook 3: syntax_checker — validate verb exists
  if (!verb || typeof verb !== "string") {
    return { allow: false, gate: "syntax_checker", reason: "verb is required" };
  }

  // Hook 4: safety_net — risk scoring
  const risk = scoreEdgeRisk({ action: verb, actor: pid, target: args?.target || "", context: envelope });
  if (risk.score >= 8 && envelope?.permissionTier !== "owner") {
    return { allow: false, gate: "safety_net", reason: `risk ${risk.score}: ${risk.reasons?.[0] || "high risk"}` };
  }

  // Hook 5: approval_guard — risk > 5 needs trusted_agent+
  const tier = envelope?.permissionTier || "observer";
  const tiers = { observer: 0, operator: 1, trusted_agent: 2, super_admin: 3, owner: 4 };
  if (risk.score > 5 && (tiers[tier] || 0) < 2) {
    return { allow: false, gate: "approval_guard", reason: `risk ${risk.score} requires trusted_agent or higher, got ${tier}` };
  }

  // All hooks pass — allow with metadata
  return { allow: true, risk, pid, verb, ts };
}

// Hook 6: transcript_backup — called post-execution by exec.js
hookwall.postExec = (verb, result, envelope) => {
  hooks.ingestHookEvent({ eventType: "PostToolUse", toolName: verb, sessionId: envelope?.pid, payload: { ok: result?.ok, ts: new Date().toISOString() } });
};

module.exports = hookwall;
