const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");

const SESSIONS_PATH = resolveDataPath("agent-sessions.json");
const PROMPT_HISTORY_MAX = 50;
const STALE_MS = 4 * 60 * 60 * 1000; // 4 hours

function ensureDir() {
  fs.mkdirSync(path.dirname(SESSIONS_PATH), { recursive: true });
}

function clip(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function writeJsonAtomic(filePath, value) {
  ensureDir();
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function readSessions() {
  if (!fs.existsSync(SESSIONS_PATH)) return {};
  try {
    const raw = fs.readFileSync(SESSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function writeSessions(sessions) {
  writeJsonAtomic(SESSIONS_PATH, sessions);
}

function upsertSession(input = {}) {
  const sessionId = clip(input.sessionId || input.session_id, 80);
  if (!sessionId) return { ok: false, error: "session_id_required" };

  const sessions = readSessions();
  const existing = sessions[sessionId] || {};
  const now = new Date().toISOString();

  sessions[sessionId] = {
    sessionId,
    sourceApp: clip(input.sourceApp || input.source_app || existing.sourceApp || "unknown", 80),
    agentName: clip(input.agentName || input.agent_name || existing.agentName || "", 80),
    agentType: clip(input.agentType || input.agent_type || existing.agentType || "", 60),
    branch: clip(input.branch || existing.branch || "", 120),
    model: clip(input.model || input.model_name || existing.model || "", 60),
    status: clip(input.status || existing.status || "active", 20),
    startedAt: existing.startedAt || now,
    lastActiveAt: now,
    endedAt: existing.endedAt || "",
    endReason: clip(input.endReason || existing.endReason || "", 120),
    promptCount: existing.promptCount || 0,
    toolUseCount: existing.toolUseCount || 0,
    prompts: existing.prompts || []
  };

  writeSessions(sessions);
  return { ok: true, session: sessions[sessionId] };
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const sessions = readSessions();
  return sessions[sessionId] || null;
}

function listActiveSessions() {
  const sessions = readSessions();
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();

  return Object.values(sessions)
    .filter((s) => s.status === "active" || (s.status !== "ended" && s.lastActiveAt > cutoff))
    .sort((a, b) => (b.lastActiveAt || "").localeCompare(a.lastActiveAt || ""));
}

function addPromptToSession(sessionId, prompt) {
  if (!sessionId || !prompt) return { ok: false };
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return { ok: false, error: "session_not_found" };

  session.prompts = session.prompts || [];
  session.prompts.push({
    text: clip(prompt, 400),
    at: new Date().toISOString()
  });
  if (session.prompts.length > PROMPT_HISTORY_MAX) {
    session.prompts = session.prompts.slice(-PROMPT_HISTORY_MAX);
  }
  session.promptCount = (session.promptCount || 0) + 1;
  session.lastActiveAt = new Date().toISOString();

  writeSessions(sessions);
  return { ok: true };
}

function incrementToolUse(sessionId) {
  if (!sessionId) return;
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return;
  session.toolUseCount = (session.toolUseCount || 0) + 1;
  session.lastActiveAt = new Date().toISOString();
  writeSessions(sessions);
}

function endSession(sessionId, reason = "") {
  if (!sessionId) return { ok: false };
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return { ok: false, error: "session_not_found" };

  session.status = "ended";
  session.endedAt = new Date().toISOString();
  session.endReason = clip(reason, 120);

  writeSessions(sessions);
  return { ok: true, session };
}

module.exports = {
  SESSIONS_PATH,
  upsertSession,
  getSession,
  listActiveSessions,
  addPromptToSession,
  incrementToolUse,
  endSession
};
