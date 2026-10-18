// PID: asolaria | IX-484 Phase 0 | gnn-contract-v1
const { appendGraphEvent } = require("../../src/graphRuntimeStore");
const { scoreEdgeRisk } = require("../../src/edgeRiskEngine");
let watcher = null;
try { watcher = require("../../src/gnnConstructionWatcher"); } catch (_) {}
const LEVELS = ["low", "low", "low", "medium", "medium", "high", "high", "high", "critical", "critical"];

async function gnnGate(verb, args, envelope = {}) {
  const pid = envelope.pid || "unknown", target = args?.target || args?.channel || "";
  const eventId = `gevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const recorded = !!appendGraphEvent({ id: eventId, component: "ix-exec", category: "verb-dispatch", action: verb,
      actor: { id: pid, domain: envelope.host || "local" }, target: { id: target || verb, domain: "ix" },
      context: { args: typeof args === "string" ? args : JSON.stringify(args)?.slice(0, 200), permissionTier: envelope.permissionTier, pipelineStage: envelope.pipelineStage },
      policy: { approvalState: envelope.approvalState || "auto", autonomous: envelope.autonomous === true }, status: "dispatched" });
    const score = Math.max(0, Math.min(9, Math.trunc(scoreEdgeRisk({
      action: verb, actor: pid, target,
      context: { permissionTier: envelope.permissionTier, pipelineStage: envelope.pipelineStage },
      policy: { approvalState: envelope.approvalState || "auto" }
    }).score || 0)));
    try { watcher?.recordRoutingEdge?.(pid, verb, target); } catch (_) {}
    let p = null; try { p = watcher?.predictConstruction?.(verb) || null; } catch (_) {}
    const prediction = { nextVerb: String(p?.nextVerb || ""), confidence: Number(p?.confidence || 0), constructionId: String(p?.constructionId || "") };
    const out = { ok: true, allow: !(score >= 9 && prediction.confidence > 0.8), score, level: LEVELS[score], prediction, edge: { recorded, eventId } };
    Object.defineProperty(out, "risk", { value: { score, level: LEVELS[score] } });
    return out;
  } catch (err) {
    return { ok: false, allow: true, degraded: true, reason: err?.message || "gnn failed" };
  }
}

module.exports = gnnGate;
