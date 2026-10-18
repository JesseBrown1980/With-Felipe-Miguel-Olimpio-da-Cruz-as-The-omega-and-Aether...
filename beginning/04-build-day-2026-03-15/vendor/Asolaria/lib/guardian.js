/**
 * Guardian Evaluation — extracted from server.js (ADR-0001 Phase 3)
 *
 * Evaluates risk for actions and decides whether to block, approve, or alert.
 * Stateful deps (settings, approval store, notifier, brain) passed via init().
 */

const settings = require("./settings");

let _ctx = null;

function init(ctx) {
  _ctx = ctx;
}

async function evaluateGuardianGuard({ message, routed, source }) {
  const s = settings.get();
  const routedAction = String(routed?.action || "none");
  const risk = _ctx.evaluateRisk({ message, action: routedAction });
  const threshold = _ctx.normalizeLevel(s.guardianRiskThreshold || "high", "high");
  const triggered = _ctx.isLevelAtOrAbove(risk.level, threshold);

  if (!triggered) {
    return { triggered: false, blocked: false, risk, decision: null, alert: null };
  }

  const existingApproval = _ctx.consumeApprovedOverride({ action: routedAction, message });
  if (existingApproval) {
    return {
      triggered: true, blocked: false, risk,
      decision: { mode: "owner_override", text: `Owner-approved override (${existingApproval.id}) was consumed.` },
      overrideApprovalId: existingApproval.id, alert: null
    };
  }

  let blocked = false;
  let decisionText = "";
  let decisionRequestedNotify = false;

  if (s.guardianRequireOwnerForCritical && risk.level === "critical" && s.guardianMode !== "off") {
    blocked = true;
    decisionRequestedNotify = true;
    decisionText = "Critical risk escalated to owner approval.";
  } else if (s.guardianMode === "strict") {
    blocked = true;
    decisionText = "Guardian strict mode blocked this high-risk action.";
  } else if (s.guardianMode === "autonomous") {
    try {
      const decision = await _ctx.decideGuardianAction({ message, routed, risk });
      blocked = !decision.allow;
      decisionRequestedNotify = Boolean(decision.notify);
      decisionText = `${decision.reason} (via ${decision.provider})`;
    } catch (error) {
      blocked = true;
      decisionRequestedNotify = true;
      decisionText = `Guardian decision engine failed: ${error.message}`;
    }
  } else if (s.guardianMode === "notify") {
    blocked = false;
    decisionText = "Guardian notify mode allowed action after alert.";
  }

  if (risk.level === "critical" && s.guardianAutoBlockCritical && s.guardianMode !== "off") {
    blocked = true;
    if (!decisionText) decisionText = "Critical risk auto-block policy triggered.";
  }

  const notify = _ctx.shouldNotifyGuardian({ risk, blocked, requestedByDecision: decisionRequestedNotify });

  let alert = null;
  let mobilePush = null;
  let approvalRequest = null;

  if (blocked) {
    const created = _ctx.createApprovalRequest({
      source: source || "unknown", action: routedAction, message, risk, expiresInMinutes: 45
    });
    approvalRequest = { ...created, url: _ctx.buildRemoteApprovalUrl(created.id) };
  }

  if (approvalRequest) {
    decisionText = `${decisionText ? `${decisionText} ` : ""}Pending owner approval ID ${approvalRequest.id}.`;
  }

  if (notify) {
    alert = await _ctx.notifyGuardianContacts({
      at: new Date().toISOString(), source: source || "unknown",
      routeAction: routedAction, messagePreview: _ctx.clipText(message, 320),
      risk, blocked, decisionText, approvalRequest
    });
  }

  if (blocked || notify) {
    mobilePush = await _ctx.sendMobilePushNotification({
      at: new Date().toISOString(), routeAction: routedAction,
      messagePreview: _ctx.clipText(message, 220),
      risk, blocked, decisionText, approvalRequest
    });
  }

  return {
    triggered: true, blocked, risk,
    decision: { mode: s.guardianMode, text: decisionText },
    approvalRequest, alert, mobilePush
  };
}

module.exports = { init, evaluateGuardianGuard };
