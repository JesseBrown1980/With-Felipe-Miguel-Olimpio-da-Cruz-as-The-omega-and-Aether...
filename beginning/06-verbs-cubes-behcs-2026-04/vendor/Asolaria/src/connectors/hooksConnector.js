const { appendHookEvent, queryHookEvents, getHookEventStats, getSessionSummary } = require("../hookEventStore");
const { backupTranscript, listTranscriptBackups, readTranscriptBackup } = require("../transcriptBackupStore");
const { upsertSession, getSession, listActiveSessions, addPromptToSession, incrementToolUse, endSession } = require("../agentSessionStore");
const childProcess = require("child_process");

// ---------- Guard patterns (ported from disler's pre_tool_use.py) ----------

const DANGEROUS_RM_PATTERNS = [
  /\brm\s+.*-[a-z]*r[a-z]*f/i,
  /\brm\s+.*-[a-z]*f[a-z]*r/i,
  /\brm\s+--recursive\s+--force/i,
  /\brm\s+--force\s+--recursive/i,
  /\brm\s+-r\s+.*-f/i,
  /\brm\s+-f\s+.*-r/i
];

const DANGEROUS_PATHS = [
  /^\/$/,
  /^\/\*$/,
  /^~\/?$/,
  /\$HOME/,
  /\.\.\/?/,
  /^\.\s*$/,
  /^\*$/
];

function isDangerousRmCommand(command) {
  const normalized = String(command || "").replace(/\s+/g, " ").trim().toLowerCase();
  for (const pattern of DANGEROUS_RM_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  if (/\brm\s+.*-[a-z]*r/i.test(normalized)) {
    for (const pathPattern of DANGEROUS_PATHS) {
      if (pathPattern.test(normalized)) return true;
    }
  }
  return false;
}

function isEnvFileAccess(toolName, toolInput = {}) {
  if (["Read", "Edit", "MultiEdit", "Write"].includes(toolName)) {
    const filePath = String(toolInput.file_path || "");
    if (/\.env\b/.test(filePath) && !filePath.endsWith(".env.sample")) {
      return true;
    }
  }
  if (toolName === "Bash") {
    const command = String(toolInput.command || "");
    if (/\.env\b(?!\.sample)/i.test(command)) {
      return true;
    }
  }
  return false;
}

function getGuardVerdict(toolName, toolInput = {}) {
  if (isEnvFileAccess(toolName, toolInput)) {
    return {
      blocked: true,
      reason: "Access to .env files containing sensitive data is prohibited. Use .env.sample instead."
    };
  }
  if (toolName === "Bash" && isDangerousRmCommand(toolInput.command)) {
    return {
      blocked: true,
      reason: "Dangerous rm command detected and prevented."
    };
  }
  return { blocked: false };
}

// ---------- Event ingestion with session side-effects ----------

function ingestHookEvent(eventData = {}) {
  const result = appendHookEvent(eventData);
  if (!result.ok) return result;

  const event = result.event;
  const sid = event.sessionId;

  // Session lifecycle side-effects
  if (event.eventType === "SessionStart" && sid) {
    upsertSession({
      sessionId: sid,
      sourceApp: event.sourceApp,
      agentType: event.agentType,
      model: event.modelName
    });
  }

  if (event.eventType === "UserPromptSubmit" && sid && event.payload?.prompt) {
    // Ensure session exists
    upsertSession({ sessionId: sid, sourceApp: event.sourceApp });
    addPromptToSession(sid, event.payload.prompt);
  }

  if ((event.eventType === "PreToolUse" || event.eventType === "PostToolUse") && sid) {
    incrementToolUse(sid);
  }

  if ((event.eventType === "SessionEnd" || event.eventType === "Stop") && sid) {
    endSession(sid, event.reason || event.eventType);
  }

  // Pre-compact: auto-backup transcript
  if (event.eventType === "PreCompact" && event.payload?.transcript_path) {
    backupTranscript(sid, event.payload.transcript_path, event.trigger || "auto");
  }

  return result;
}

// ---------- Dashboard / query ----------

function getHookDashboard() {
  const stats = getHookEventStats();
  const sessions = listActiveSessions();
  const recentEvents = queryHookEvents({ limit: 30 });
  const backups = listTranscriptBackups({ limit: 10 });

  return {
    stats,
    activeSessions: sessions,
    recentEvents,
    recentBackups: backups
  };
}

function getSessionDetail(sessionId) {
  const session = getSession(sessionId);
  const summary = getSessionSummary(sessionId);
  const backups = listTranscriptBackups({ sessionId });

  return {
    session,
    summary,
    backups
  };
}

// ---------- Context injection (replaces session_start.py) ----------

function injectSessionContext(sessionId, source = "startup") {
  const context = [];
  context.push(`Session started at: ${new Date().toISOString()}`);
  context.push(`Session source: ${source}`);

  // Git info
  try {
    const branchResult = childProcess.execSync("git rev-parse --abbrev-ref HEAD", {
      timeout: 5000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    context.push(`Git branch: ${branchResult}`);

    const statusResult = childProcess.execSync("git status --porcelain", {
      timeout: 5000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const changes = statusResult ? statusResult.split("\n").length : 0;
    if (changes > 0) {
      context.push(`Uncommitted changes: ${changes} files`);
    }
  } catch (_err) {
    // Not in a git repo or git not available
  }

  return {
    sessionId,
    source,
    context: context.join("\n")
  };
}

function manifest() {
  return {
    id: "hooks",
    version: "1.0.0",
    description: "Claude Code hooks integration — guards, session tracking, transcript backup, context injection (ported from disler)",
    capabilities: ["pre_tool_guard", "event_ingestion", "session_tracking", "transcript_backup", "context_injection", "dashboard"],
    readScopes: ["hook_events", "sessions", "transcripts"],
    writeScopes: ["hook_events", "sessions", "transcript_backups"],
    approvalRequired: false,
    healthCheck: false,
    retrySemantics: "none",
    timeoutMs: 5000,
    secretRequirements: [],
    sideEffects: ["appends to hook-events.ndjson", "creates transcript backup files", "blocks dangerous tool calls"],
    failureModes: ["event_store_write_failed", "transcript_backup_failed"],
    emittedEvents: ["hook.event_ingested", "hook.guard_blocked", "hook.session_started", "hook.session_ended"]
  };
}

module.exports = {
  getGuardVerdict,
  ingestHookEvent,
  getHookDashboard,
  getSessionDetail,
  injectSessionContext,
  queryHookEvents,
  getHookEventStats,
  listActiveSessions,
  backupTranscript,
  listTranscriptBackups,
  readTranscriptBackup,
  manifest
};
