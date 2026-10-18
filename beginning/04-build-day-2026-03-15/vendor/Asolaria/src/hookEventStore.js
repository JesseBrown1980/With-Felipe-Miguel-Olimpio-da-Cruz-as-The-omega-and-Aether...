const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");
const { appendGraphEvent } = require("./graphRuntimeStore");
const { appendMistakeLedger } = require("./mistakeLedgerStore");

const HOOK_EVENTS_PATH = resolveDataPath("hook-events.ndjson");
const TEXT_MAX = 320;
const VALID_EVENT_TYPES = new Set([
  "SessionStart", "SessionEnd", "UserPromptSubmit", "PreToolUse",
  "PostToolUse", "PostToolUseFailure", "PermissionRequest",
  "Notification", "SubagentStart", "SubagentStop", "Stop", "PreCompact"
]);

function ensureDir() {
  fs.mkdirSync(path.dirname(HOOK_EVENTS_PATH), { recursive: true });
}

function clip(value, max = TEXT_MAX) {
  return String(value || "").trim().slice(0, Math.max(1, Number(max) || TEXT_MAX));
}

function makeId() {
  return `hevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeHookEvent(input = {}) {
  const now = new Date().toISOString();
  const eventType = VALID_EVENT_TYPES.has(input.event_type || input.hook_event_type)
    ? (input.event_type || input.hook_event_type)
    : "Unknown";
  return {
    id: clip(input.id || makeId(), 80),
    at: clip(input.at || input.timestamp || now, 40),
    eventType,
    sessionId: clip(input.session_id || "", 80),
    sourceApp: clip(input.source_app || "unknown", 80),
    toolName: clip(input.tool_name || (input.payload && input.payload.tool_name) || "", 120),
    toolUseId: clip(input.tool_use_id || "", 120),
    agentId: clip(input.agent_id || "", 120),
    agentType: clip(input.agent_type || "", 60),
    modelName: clip(input.model_name || "", 60),
    summary: clip(input.summary || "", TEXT_MAX),
    error: clip(input.error || (input.payload && input.payload.error) || "", TEXT_MAX),
    stopHookActive: Boolean(input.stop_hook_active),
    trigger: clip(input.trigger || "", 40),
    source: clip(input.source || "", 40),
    reason: clip(input.reason || "", TEXT_MAX),
    payload: input.payload && typeof input.payload === "object" ? input.payload : {}
  };
}

function appendHookEvent(input = {}) {
  const event = normalizeHookEvent(input);
  try {
    ensureDir();
    fs.appendFileSync(HOOK_EVENTS_PATH, `${JSON.stringify(event)}\n`, "utf8");
  } catch (error) {
    console.warn("[hook-event-store] append failed:", error?.message || error);
    return { ok: false, error: error?.message || "append_failed" };
  }

  // Cross-link: emit to graph runtime
  try {
    appendGraphEvent({
      component: "hooks-connector",
      category: "agent_hook",
      action: event.eventType.toLowerCase().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(),
      actor: {
        type: "ai_agent",
        id: event.sessionId || event.agentId || "unknown",
        label: event.sourceApp,
        domain: "local",
        criticality: "medium"
      },
      target: {
        type: "hook_event",
        id: event.id,
        label: event.eventType,
        domain: "local"
      },
      context: {
        eventType: event.eventType,
        toolName: event.toolName,
        sourceApp: event.sourceApp,
        sessionId: event.sessionId
      },
      status: event.error ? "error" : "ok"
    });
  } catch (_err) {
    // Best effort graph integration
  }

  // Cross-link: PostToolUseFailure -> mistake ledger
  if (event.eventType === "PostToolUseFailure" && event.error) {
    try {
      appendMistakeLedger({
        feature: "hook_tool_use",
        operation: event.toolName || "unknown_tool",
        type: "tool_failure",
        severity: "medium",
        actor: event.sourceApp,
        laneId: event.sessionId,
        message: event.error || "Tool use failed",
        toolId: event.toolName,
        context: {
          sessionId: event.sessionId,
          toolUseId: event.toolUseId,
          agentId: event.agentId
        }
      });
    } catch (_err) {
      // Best effort mistake ledger integration
    }
  }

  return { ok: true, event };
}

function readAllEvents() {
  if (!fs.existsSync(HOOK_EVENTS_PATH)) return [];
  try {
    const raw = fs.readFileSync(HOOK_EVENTS_PATH, "utf8");
    return raw.split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch (_) { return null; }
    }).filter(Boolean);
  } catch (_err) {
    return [];
  }
}

function queryHookEvents(options = {}) {
  const { sessionId, eventType, since, limit = 200 } = options;
  let events = readAllEvents();

  if (sessionId) {
    events = events.filter((e) => e.sessionId === sessionId);
  }
  if (eventType) {
    events = events.filter((e) => e.eventType === eventType);
  }
  if (since) {
    const sinceDate = new Date(since);
    if (Number.isFinite(sinceDate.getTime())) {
      events = events.filter((e) => new Date(e.at) >= sinceDate);
    }
  }

  // Most recent first, capped
  events.reverse();
  if (limit > 0) {
    events = events.slice(0, Math.min(limit, 2000));
  }

  return events;
}

function getHookEventStats() {
  const events = readAllEvents();
  const byType = {};
  const uniqueSessions = new Set();
  let lastAt = "";

  for (const event of events) {
    byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    if (event.sessionId) uniqueSessions.add(event.sessionId);
    if (event.at > lastAt) lastAt = event.at;
  }

  return {
    totalEvents: events.length,
    byType,
    totalSessions: uniqueSessions.size,
    lastEventAt: lastAt
  };
}

function getSessionSummary(sessionId) {
  if (!sessionId) return null;
  const events = readAllEvents().filter((e) => e.sessionId === sessionId);
  if (events.length === 0) return null;

  const toolCounts = {};
  const prompts = [];
  let startedAt = "";
  let endedAt = "";
  let sourceApp = "";
  let modelName = "";
  let agentType = "";

  for (const event of events) {
    if (!sourceApp && event.sourceApp) sourceApp = event.sourceApp;
    if (!modelName && event.modelName) modelName = event.modelName;
    if (!agentType && event.agentType) agentType = event.agentType;
    if (event.eventType === "SessionStart") startedAt = event.at;
    if (event.eventType === "SessionEnd" || event.eventType === "Stop") endedAt = event.at;
    if (event.toolName) {
      toolCounts[event.toolName] = (toolCounts[event.toolName] || 0) + 1;
    }
    if (event.eventType === "UserPromptSubmit" && event.payload?.prompt) {
      prompts.push(clip(event.payload.prompt, 200));
    }
  }

  return {
    sessionId,
    sourceApp,
    modelName,
    agentType,
    startedAt,
    endedAt,
    eventCount: events.length,
    toolCounts,
    prompts: prompts.slice(-20),
    events: events.slice(-100)
  };
}

module.exports = {
  HOOK_EVENTS_PATH,
  appendHookEvent,
  queryHookEvents,
  getHookEventStats,
  getSessionSummary
};
