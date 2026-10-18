const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const Ajv = require("ajv");
const { createToolAuthority } = require("./toolAuthority");
const { createAuthorityModeManager } = require("./authorityMode");
const { createAuditLogManager } = require("./auditLog");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultConfigPath = path.join(repoRoot, "config", "asolaria.gateway.json");
const configPath = path.resolve(process.env.ASOLARIA_GATEWAY_CONFIG || defaultConfigPath);

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readUtf8Trim(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Gateway config not found: ${configPath}`);
  }
  return readJsonFile(configPath);
}

function buildTokenPath(cfg) {
  const relative = String(cfg?.gateway?.auth?.tokenFile || "data/vault/owner/gateway/gateway.token.txt").trim();
  return path.resolve(repoRoot, relative);
}

function loadGatewayToken(cfg) {
  const envToken = String(process.env.ASOLARIA_GATEWAY_TOKEN || "").trim();
  if (envToken) {
    return envToken;
  }
  const tokenPath = buildTokenPath(cfg);
  return readUtf8Trim(tokenPath);
}

function redactPayload(payload, redactKeys) {
  const keys = new Set((Array.isArray(redactKeys) ? redactKeys : []).map((item) => String(item || "").toLowerCase()));
  const seen = new WeakSet();

  function walk(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    const out = {};
    for (const [rawKey, child] of Object.entries(value)) {
      const key = String(rawKey || "");
      if (keys.has(key.toLowerCase())) {
        out[key] = "***REDACTED***";
      } else {
        out[key] = walk(child);
      }
    }
    return out;
  }

  return walk(payload);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function parseDateMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function parseField(expr, min, max) {
  const value = String(expr || "").trim();
  if (value === "*") {
    return () => true;
  }
  if (/^\d+$/.test(value)) {
    const wanted = Number(value);
    return (current) => current === wanted;
  }
  const stepMatch = value.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = Math.max(1, Number(stepMatch[1]));
    return (current) => current >= min && current <= max && ((current - min) % step === 0);
  }
  return () => false;
}

function cronMatches(expr, date) {
  const parts = String(expr || "").trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }
  const minuteFn = parseField(parts[0], 0, 59);
  const hourFn = parseField(parts[1], 0, 23);
  const domFn = parseField(parts[2], 1, 31);
  const monthFn = parseField(parts[3], 1, 12);
  const dowFn = parseField(parts[4], 0, 6);
  return minuteFn(date.getMinutes())
    && hourFn(date.getHours())
    && domFn(date.getDate())
    && monthFn(date.getMonth() + 1)
    && dowFn(date.getDay());
}

async function probeJson(url) {
  function summarizeProbeJson(json) {
    if (!json || typeof json !== "object") return null;
    const summary = {};
    const scalarKeys = ["ok", "status", "service", "bind", "port", "time", "startedAt"];
    for (const key of scalarKeys) {
      const value = json[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "object") continue;
      summary[key] = value;
    }
    if (json.authority && typeof json.authority === "object") {
      const mode = json.authority.mode;
      if (mode !== null && mode !== undefined && typeof mode !== "object") {
        summary.authorityMode = mode;
      }
    }
    if (json.audit && typeof json.audit === "object") {
      const gateLocked = json.audit.gateLocked;
      if (gateLocked !== null && gateLocked !== undefined && typeof gateLocked !== "object") {
        summary.auditGateLocked = gateLocked;
      }
    }
    if (json.heartbeat && typeof json.heartbeat === "object") {
      const heartbeat = json.heartbeat;
      const keys = ["lastRunAt", "lastOkAt", "consecutiveFailures", "nextDelayMs"];
      for (const key of keys) {
        const value = heartbeat[key];
        if (value === null || value === undefined) continue;
        if (typeof value === "object") continue;
        summary[`heartbeat_${key}`] = value;
      }
      const ack = heartbeat?.lastResult?.ack;
      if (ack !== null && ack !== undefined && typeof ack !== "object") {
        summary.heartbeatAck = ack;
      }
    }
    return Object.keys(summary).length > 0 ? summary : null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      url,
      summary: summarizeProbeJson(json)
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: String(error && error.message ? error.message : error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function listToolManifests() {
  const manifestsRoot = path.join(repoRoot, "tools-manifests");
  if (!fs.existsSync(manifestsRoot)) {
    return [];
  }
  const connectors = fs.readdirSync(manifestsRoot, { withFileTypes: true }).filter((item) => item.isDirectory());
  const out = [];
  for (const connector of connectors) {
    const connectorPath = path.join(manifestsRoot, connector.name);
    const files = fs.readdirSync(connectorPath, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".schema.json")) {
        continue;
      }
      out.push({
        connector: connector.name,
        file: file.name,
        path: path.relative(repoRoot, path.join(connectorPath, file.name)).replace(/\\/g, "/")
      });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function compileMessageSchema() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile({
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", minLength: 1 },
      id: { type: "string" },
      payload: { type: "object" }
    },
    required: ["type"]
  });
}

function authFromRequest(req) {
  const authHeader = String(req.headers.authorization || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

function wsTokenFromRequest(req) {
  try {
    const url = new URL(req.url || "", "http://localhost");
    const token = String(url.searchParams.get("token") || "").trim();
    if (token) {
      return token;
    }
  } catch {
    return "";
  }
  return "";
}

function originAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.length) {
    return false;
  }
  return allowedOrigins.includes(origin);
}

function createServer() {
  const config = loadConfig();
  const gatewayToken = loadGatewayToken(config);
  if (!gatewayToken) {
    const tokenPath = buildTokenPath(config);
    throw new Error(
      `Gateway token is empty. Set ASOLARIA_GATEWAY_TOKEN or create ${tokenPath}`
    );
  }

  const bind = String(config?.gateway?.bind || "127.0.0.1").trim();
  const port = Number(config?.gateway?.port || 4791);
  const redactKeys = config?.tools?.logging?.redact || [];
  const messageValidator = compileMessageSchema();
  const auditPolicy = {
    enabled: config?.audit?.enabled !== false,
    verifyEveryMs: clampInt(
      Number(config?.audit?.verifyEveryMinutes || 10) * 60_000,
      10 * 60_000,
      30_000,
      24 * 60 * 60 * 1000
    ),
    gateControlWritesOnFailure: config?.audit?.gateControlWritesOnFailure !== false
  };
  const handoverGuardPolicy = {
    enabled: config?.authority?.handoverGuards?.enabled !== false,
    enforceForAsolariaPrimary: config?.authority?.handoverGuards?.enforceForAsolariaPrimary !== false,
    requireAuditIntegrity: config?.authority?.handoverGuards?.requireAuditIntegrity !== false,
    requireAuditGateOpen: config?.authority?.handoverGuards?.requireAuditGateOpen !== false,
    requireRecentHeartbeatOk: config?.authority?.handoverGuards?.requireRecentHeartbeatOk !== false,
    maxHeartbeatAgeMs: clampInt(
      Number(config?.authority?.handoverGuards?.maxHeartbeatAgeMinutes || 30) * 60_000,
      30 * 60_000,
      60_000,
      24 * 60 * 60 * 1000
    ),
    requireNoPendingApprovals: config?.authority?.handoverGuards?.requireNoPendingApprovals === true,
    maxPendingApprovals: clampInt(
      Number(config?.authority?.handoverGuards?.maxPendingApprovals || 0),
      0,
      0,
      1000
    )
  };

  const state = {
    startedAt: new Date().toISOString(),
    heartbeat: {
      lastRunAt: "",
      lastOkAt: "",
      consecutiveFailures: 0,
      nextDelayMs: Math.max(60_000, Number(config?.scheduler?.heartbeatEveryMinutes || 15) * 60_000),
      lastResult: null
    },
    cron: {
      lastTickAt: "",
      executions: []
    },
    authority: {
      events: []
    },
    audit: {
      lastError: "",
      gateLocked: false,
      gateReason: "",
      lastVerifyAt: "",
      lastVerifyTrigger: "",
      lastVerifyOk: true,
      lastVerifyErrorCount: 0,
      verifyCount: 0
    }
  };

  const auditLog = createAuditLogManager({
    repoRoot,
    config
  });

  let broadcast = () => {};
  function runtimeAuditStatus() {
    const auditStatus = auditLog.getStatus();
    return {
      ...auditStatus,
      lastError: state.audit.lastError || auditStatus.lastError || "",
      gateLocked: state.audit.gateLocked,
      gateReason: state.audit.gateReason || "",
      gateControlWritesOnFailure: auditPolicy.gateControlWritesOnFailure,
      verifyEveryMs: auditPolicy.verifyEveryMs,
      lastVerifyAt: state.audit.lastVerifyAt,
      lastVerifyTrigger: state.audit.lastVerifyTrigger,
      lastVerifyOk: state.audit.lastVerifyOk,
      lastVerifyErrorCount: state.audit.lastVerifyErrorCount,
      verifyCount: state.audit.verifyCount
    };
  }

  function refreshAuditIntegrity(trigger = "manual") {
    const nowIso = new Date().toISOString();
    const result = auditLog.verify();
    state.audit.lastVerifyAt = nowIso;
    state.audit.lastVerifyTrigger = String(trigger || "manual").slice(0, 120);
    state.audit.lastVerifyOk = Boolean(result?.ok);
    state.audit.lastVerifyErrorCount = Number(result?.errorCount || 0);
    state.audit.verifyCount += 1;
    const shouldLock = Boolean(auditPolicy.gateControlWritesOnFailure && !result?.ok);
    const priorLocked = Boolean(state.audit.gateLocked);
    state.audit.gateLocked = shouldLock;
    state.audit.gateReason = shouldLock
      ? String(result?.firstError || "audit_integrity_failed").slice(0, 240)
      : "";
    if (!priorLocked && shouldLock) {
      broadcast({
        type: "audit.locked",
        payload: {
          at: nowIso,
          trigger: state.audit.lastVerifyTrigger,
          reason: state.audit.gateReason,
          errorCount: state.audit.lastVerifyErrorCount
        }
      });
    } else if (priorLocked && !shouldLock) {
      broadcast({
        type: "audit.unlocked",
        payload: {
          at: nowIso,
          trigger: state.audit.lastVerifyTrigger
        }
      });
    }
    return result;
  }

  function assertAuditGate(scope) {
    if (!auditPolicy.gateControlWritesOnFailure) return;
    if (!state.audit.gateLocked) return;
    const error = new Error(
      `Audit integrity gate is locked (${state.audit.gateReason || "verify_failed"}).`
    );
    error.status = 503;
    error.code = "audit_integrity_locked";
    error.details = {
      scope: String(scope || "").slice(0, 100),
      gateReason: state.audit.gateReason || "verify_failed",
      lastVerifyAt: state.audit.lastVerifyAt || "",
      lastVerifyTrigger: state.audit.lastVerifyTrigger || "",
      lastVerifyErrorCount: state.audit.lastVerifyErrorCount || 0
    };
    throw error;
  }

  function computeAuthorityReadiness(targetModeRaw = "asolaria_primary") {
    const targetMode = String(targetModeRaw || "asolaria_primary").trim().toLowerCase() || "asolaria_primary";
    const nowIso = new Date().toISOString();
    const nowMs = parseDateMs(nowIso);
    const auditStatus = runtimeAuditStatus();
    const approvalsSummary = toolAuthority.getSummary();
    const checks = [];

    if (handoverGuardPolicy.requireAuditIntegrity) {
      const ok = Boolean(auditStatus?.integrity?.ok);
      checks.push({
        id: "audit_integrity_ok",
        ok,
        required: true,
        reason: ok ? "" : "Audit integrity verify is failing."
      });
    }
    if (handoverGuardPolicy.requireAuditGateOpen) {
      const ok = !Boolean(auditStatus?.gateLocked);
      checks.push({
        id: "audit_gate_open",
        ok,
        required: true,
        reason: ok ? "" : `Audit gate is locked (${String(auditStatus?.gateReason || "locked")}).`
      });
    }
    if (handoverGuardPolicy.requireRecentHeartbeatOk) {
      const lastOkAt = String(state.heartbeat.lastOkAt || "").trim();
      const lastOkMs = parseDateMs(lastOkAt);
      const ageMs = lastOkMs > 0 ? Math.max(0, nowMs - lastOkMs) : Number.POSITIVE_INFINITY;
      const ok = lastOkMs > 0 && ageMs <= handoverGuardPolicy.maxHeartbeatAgeMs;
      checks.push({
        id: "recent_heartbeat_ok",
        ok,
        required: true,
        maxAgeMs: handoverGuardPolicy.maxHeartbeatAgeMs,
        ageMs: Number.isFinite(ageMs) ? ageMs : -1,
        lastOkAt: lastOkAt || "",
        reason: ok ? "" : "Recent HEARTBEAT_OK is required before handover."
      });
    }
    if (handoverGuardPolicy.requireNoPendingApprovals) {
      const pending = Number(approvalsSummary?.counts?.pending || 0);
      const ok = pending <= handoverGuardPolicy.maxPendingApprovals;
      checks.push({
        id: "pending_approvals_guard",
        ok,
        required: true,
        pending,
        maxPending: handoverGuardPolicy.maxPendingApprovals,
        reason: ok ? "" : `Pending approvals (${pending}) exceed limit (${handoverGuardPolicy.maxPendingApprovals}).`
      });
    }

    const enforce = Boolean(
      handoverGuardPolicy.enabled
      && (!handoverGuardPolicy.enforceForAsolariaPrimary || targetMode === "asolaria_primary")
    );
    const blocking = checks.filter((item) => !item.ok);
    return {
      checkedAt: nowIso,
      targetMode,
      enforce,
      ok: enforce ? blocking.length === 0 : true,
      checks,
      blockingReasons: blocking.map((item) => String(item.reason || item.id || "guard_failed"))
    };
  }

  function assertHandoverGuards(targetModeRaw, scope) {
    const readiness = computeAuthorityReadiness(targetModeRaw);
    if (!readiness.enforce || readiness.ok) {
      return readiness;
    }
    const error = new Error(
      `Handover guard blocked transition to "${readiness.targetMode}". ${readiness.blockingReasons.join(" ")}`
    );
    error.status = 403;
    error.code = "authority_handover_guard_failed";
    error.details = {
      scope: String(scope || "").slice(0, 100),
      readiness
    };
    throw error;
  }

  function buildDrillRecommendedActions(input = {}) {
    const hints = [];
    const addHint = (text) => {
      const value = String(text || "").trim();
      if (!value) return;
      if (hints.includes(value)) return;
      hints.push(value);
    };

    const auditVerify = input.auditVerify || {};
    const auditStatus = input.auditStatus || {};
    const heartbeat = input.heartbeatResult || {};
    const readiness = input.readiness || {};

    if (!auditVerify.ok) {
      addHint("Audit verify failed. Inspect `data/gateway-audit.ndjson` for tamper or corruption.");
      addHint("After fixing audit data, run `POST /audit/verify` to clear the integrity gate.");
    }
    if (auditStatus.gateLocked) {
      const reason = String(auditStatus.gateReason || "audit_integrity_failed").trim();
      addHint(`Audit gate is locked (${reason}). Resolve audit integrity before handover.`);
    }

    const failedChecks = Array.isArray(heartbeat.checks)
      ? heartbeat.checks.filter((item) => !item?.ok)
      : [];
    for (const check of failedChecks) {
      const url = String(check?.url || "").trim();
      const lower = url.toLowerCase();
      if (lower.includes(":5443/health")) {
        addHint("Start sandbox manager (`services/sandbox-manager`) and re-run readiness drill.");
      } else if (lower.includes(":5444/health")) {
        addHint("Legacy memory-indexer is down. It is lexical only; main semantic retrieval lives under `/api/workspace-knowledge` on Asolaria.");
      } else if (lower.includes(":4791/health")) {
        addHint("Gateway health check failed. Restart gateway and re-run readiness drill.");
      } else {
        addHint(`Fix heartbeat dependency failure for ${url || "unknown target"} before handover.`);
      }
    }
    if (!heartbeat.ok) {
      addHint("Run `POST /heartbeat/run` (or Readiness Drill) after dependencies recover.");
    }

    const blockingReasons = Array.isArray(readiness.blockingReasons) ? readiness.blockingReasons : [];
    for (const reason of blockingReasons) {
      const text = String(reason || "").trim();
      const lower = text.toLowerCase();
      if (!text) continue;
      if (lower.includes("recent heartbeat_ok")) {
        addHint("A recent HEARTBEAT_OK is required. Ensure dependencies are healthy, then run the drill again.");
      } else if (lower.includes("pending approvals")) {
        addHint("Resolve pending approvals via `GET /approvals` and `POST /approvals/:id/decide`.");
      } else if (lower.includes("audit gate is locked")) {
        addHint("Audit gate must be open. Fix integrity and verify audit chain.");
      }
    }

    if (hints.length < 1) {
      addHint("No remediation needed. Readiness checks are passing.");
    }
    return hints.slice(0, 12);
  }

  async function runAuthorityReadinessDrill(targetModeRaw = "asolaria_primary", trigger = "http.readiness_drill") {
    const targetMode = String(targetModeRaw || "asolaria_primary").trim().toLowerCase() || "asolaria_primary";
    const startedAt = new Date().toISOString();
    const auditVerify = refreshAuditIntegrity(`${trigger}.audit_verify`);
    const heartbeatResult = await runHeartbeat(`${trigger}.heartbeat`);
    const readiness = computeAuthorityReadiness(targetMode);
    const auditStatus = runtimeAuditStatus();
    const heartbeatOk = Boolean(heartbeatResult?.ok);
    const auditOk = Boolean(auditVerify?.ok);
    const ok = Boolean(readiness?.ok) && heartbeatOk && auditOk;
    const recommendedActions = buildDrillRecommendedActions({
      auditVerify,
      auditStatus,
      heartbeatResult,
      readiness
    });
    return {
      ok,
      targetMode,
      startedAt,
      finishedAt: new Date().toISOString(),
      steps: [
        {
          id: "audit_verify",
          ok: auditOk,
          errorCount: Number(auditVerify?.errorCount || 0),
          firstError: String(auditVerify?.firstError || "")
        },
        {
          id: "heartbeat_run",
          ok: heartbeatOk,
          ack: String(heartbeatResult?.ack || ""),
          failedChecks: Array.isArray(heartbeatResult?.checks)
            ? heartbeatResult.checks.filter((item) => !item?.ok).map((item) => ({
              url: String(item?.url || ""),
              status: Number(item?.status || 0),
              error: String(item?.error || "")
            }))
            : []
        },
        {
          id: "authority_readiness",
          ok: Boolean(readiness?.ok),
          blockingReasons: Array.isArray(readiness?.blockingReasons) ? readiness.blockingReasons : []
        }
      ],
      recommendedActions,
      readiness,
      audit: auditStatus,
      heartbeat: state.heartbeat.lastResult || null
    };
  }

  function resolvePendingTransitionTargetMode(transitionIdRaw) {
    const transitionId = String(transitionIdRaw || "").trim();
    if (!transitionId) return "";
    const status = authorityModes.getStatus();
    const pending = Array.isArray(status?.pendingTransitions) ? status.pendingTransitions : [];
    const match = pending.find((item) => String(item?.id || "").trim() === transitionId);
    return String(match?.targetMode || "").trim().toLowerCase();
  }

  function recordAuthorityEvent(type, payload) {
    const actorHint = String(
      payload?.actor
      || payload?.approval?.actor
      || payload?.approval?.decisionBy
      || payload?.transition?.requestedBy
      || payload?.transition?.decisionBy
      || ""
    ).slice(0, 120);
    const event = {
      type,
      at: new Date().toISOString(),
      actor: actorHint,
      payload: payload || {}
    };
    const appended = auditLog.append(event);
    if (!appended.ok) {
      state.audit.lastError = String(appended.error || "audit_append_failed");
      if (auditPolicy.gateControlWritesOnFailure) {
        state.audit.gateLocked = true;
        state.audit.gateReason = "audit_append_failed";
      }
    } else {
      state.audit.lastError = "";
    }
    state.authority.events.push(event);
    if (state.authority.events.length > 250) {
      state.authority.events = state.authority.events.slice(-250);
    }
    broadcast({
      type: `authority.${type}`,
      payload: event
    });
  }

  const authorityModes = createAuthorityModeManager({
    repoRoot,
    config,
    onEvent: recordAuthorityEvent
  });

  const toolAuthority = createToolAuthority({
    repoRoot,
    config,
    authorityMode: authorityModes,
    onEvent: recordAuthorityEvent
  });

  recordAuthorityEvent("server.started", {
    actor: "system",
    bind,
    port,
    pid: process.pid
  });
  refreshAuditIntegrity("startup");

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  function requireToken(req, res, next) {
    const token = authFromRequest(req);
    if (!token || token !== gatewayToken) {
      return res.status(401).json({ ok: false, error: "Unauthorized." });
    }
    return next();
  }

  function sendHttpError(res, error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({
      ok: false,
      error: String(error?.message || "request_failed"),
      code: String(error?.code || "request_failed"),
      details: error?.details || null
    });
  }

  app.get("/health", (_req, res) => {
    const authorityStatus = authorityModes.getStatus();
    const readiness = computeAuthorityReadiness("asolaria_primary");
    const auditStatus = runtimeAuditStatus();
    res.json({
      ok: true,
      service: "asolaria-gateway",
      bind,
      port,
      startedAt: state.startedAt,
      heartbeat: state.heartbeat,
      cron: {
        lastTickAt: state.cron.lastTickAt,
        executions: state.cron.executions.slice(-20)
      },
      authority: {
        policy: toolAuthority.getPolicy(),
        mode: authorityStatus.mode,
        modeUpdatedAt: authorityStatus.updatedAt,
        modeUpdatedBy: authorityStatus.updatedBy,
        pendingTransitions: authorityStatus.pendingTransitions.length,
        approvals: toolAuthority.getSummary(),
        readiness,
        events: state.authority.events.slice(-30)
      },
      audit: {
        ...auditStatus
      }
    });
  });

  app.get("/tools", requireToken, (_req, res) => {
    const manifests = listToolManifests();
    res.json({
      ok: true,
      count: manifests.length,
      tools: manifests,
      policy: toolAuthority.getPolicy()
    });
  });

  app.get("/tools/policy", requireToken, (_req, res) => {
    res.json({
      ok: true,
      policy: toolAuthority.getPolicy(),
      authority: authorityModes.getStatus(),
      readiness: computeAuthorityReadiness("asolaria_primary")
    });
  });

  app.get("/authority/status", requireToken, (req, res) => {
    const targetMode = String(req.query?.targetMode || "asolaria_primary").trim().toLowerCase();
    res.json({
      ok: true,
      authority: authorityModes.getStatus(),
      readiness: computeAuthorityReadiness(targetMode)
    });
  });

  app.get("/authority/readiness", requireToken, (req, res) => {
    const targetMode = String(req.query?.targetMode || "asolaria_primary").trim().toLowerCase();
    res.json({
      ok: true,
      readiness: computeAuthorityReadiness(targetMode)
    });
  });

  app.post("/authority/readiness/drill", requireToken, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const targetMode = String(body.targetMode || "asolaria_primary").trim().toLowerCase();
      const drill = await runAuthorityReadinessDrill(targetMode, "http.readiness_drill");
      return res.json({
        ok: true,
        drill
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post("/heartbeat/run", requireToken, async (_req, res) => {
    try {
      const result = await runHeartbeat("http.manual");
      return res.json({
        ok: true,
        result,
        heartbeat: state.heartbeat
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.get("/audit/status", requireToken, (_req, res) => {
    res.json({
      ok: true,
      audit: runtimeAuditStatus()
    });
  });

  app.get("/audit/events", requireToken, (req, res) => {
    try {
      const events = auditLog.list({
        type: String(req.query?.type || "").trim(),
        since: String(req.query?.since || "").trim(),
        limit: Number(req.query?.limit || 100)
      });
      return res.json({
        ok: true,
        count: events.length,
        events
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.get("/audit/verify", requireToken, (_req, res) => {
    const result = refreshAuditIntegrity("http.verify.get");
    res.json({
      ok: true,
      result,
      audit: runtimeAuditStatus()
    });
  });

  app.post("/audit/verify", requireToken, (_req, res) => {
    const result = refreshAuditIntegrity("http.verify.post");
    res.json({
      ok: true,
      result,
      audit: runtimeAuditStatus()
    });
  });

  app.post("/authority/mode/request", requireToken, (req, res) => {
    try {
      assertAuditGate("http:authority.mode.request");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const readiness = assertHandoverGuards(body.targetMode, "http:authority.mode.request");
      const result = authorityModes.requestTransition({
        targetMode: body.targetMode,
        actor: body.actor || String(req.headers["x-actor"] || "").trim() || "api",
        reason: body.reason,
        ttlMs: body.ttlMs
      });
      return res.json({
        ok: true,
        ...result,
        readiness
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post("/authority/mode/confirm", requireToken, (req, res) => {
    try {
      assertAuditGate("http:authority.mode.confirm");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const targetModeHint = resolvePendingTransitionTargetMode(body.id);
      const readiness = targetModeHint
        ? assertHandoverGuards(targetModeHint, "http:authority.mode.confirm")
        : computeAuthorityReadiness("operator_primary");
      const result = authorityModes.confirmTransition({
        id: body.id,
        confirmText: body.confirmText,
        actor: body.actor || String(req.headers["x-actor"] || "").trim() || "api",
        reason: body.reason
      });
      return res.json({
        ok: true,
        ...result,
        readiness
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post("/authority/mode/rollback", requireToken, (req, res) => {
    try {
      assertAuditGate("http:authority.mode.rollback");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = authorityModes.rollback({
        actor: body.actor || String(req.headers["x-actor"] || "").trim() || "api",
        reason: body.reason
      });
      return res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.get("/cron", requireToken, (_req, res) => {
    res.json({
      ok: true,
      jobs: config?.scheduler?.jobs || {},
      executions: state.cron.executions.slice(-50)
    });
  });

  app.post("/invoke", requireToken, async (req, res) => {
    try {
      assertAuditGate("http:invoke");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const invoked = await toolAuthority.invoke({
        tool: body.tool,
        payload: body.payload,
        approvalId: body.approvalId,
        actor: body.actor || String(req.headers["x-actor"] || "").trim() || "api"
      });
      return res.json({
        ok: true,
        ...invoked
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.get("/approvals", requireToken, (req, res) => {
    try {
      const approvals = toolAuthority.listApprovals({
        status: String(req.query?.status || "").trim(),
        limit: Number(req.query?.limit || 50)
      });
      return res.json({
        ok: true,
        count: approvals.length,
        approvals
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  app.post("/approvals/:id/decide", requireToken, (req, res) => {
    try {
      assertAuditGate("http:approval.decide");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const approval = toolAuthority.decideApproval({
        id: req.params.id,
        decision: body.decision,
        reason: body.reason,
        actor: body.actor || String(req.headers["x-actor"] || "").trim() || "api"
      });
      return res.json({
        ok: true,
        approval
      });
    } catch (error) {
      return sendHttpError(res, error);
    }
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });
  const clients = new Set();

  broadcast = function broadcastToClients(message) {
    const text = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  };

  async function runHeartbeat(trigger = "timer") {
    const checks = [];
    checks.push(await probeJson(`http://${bind}:${port}/health`));
    const sandboxUrl = String(config?.sandbox?.baseUrl || "").trim();
    if (sandboxUrl) {
      checks.push(await probeJson(`${sandboxUrl.replace(/\/$/, "")}/health`));
    }
    const memoryIndexerUrl = String(config?.memory?.indexerUrl || "").trim();
    if (memoryIndexerUrl) {
      checks.push(await probeJson(`${memoryIndexerUrl.replace(/\/$/, "")}/health`));
    }

    const now = new Date().toISOString();
    const failedChecks = checks.filter((check) => !check.ok);
    const ok = failedChecks.length === 0;
    const baseDelay = Math.max(60_000, Number(config?.scheduler?.heartbeatEveryMinutes || 15) * 60_000);
    const maxMultiplier = Math.max(1, Number(config?.scheduler?.heartbeatRetryBackoff?.maxMultiplier || 8));

    state.heartbeat.lastRunAt = now;
    if (ok) {
      state.heartbeat.lastOkAt = now;
      state.heartbeat.consecutiveFailures = 0;
      state.heartbeat.nextDelayMs = baseDelay;
    } else {
      state.heartbeat.consecutiveFailures += 1;
      state.heartbeat.nextDelayMs = Math.min(
        baseDelay * Math.pow(2, state.heartbeat.consecutiveFailures),
        baseDelay * maxMultiplier
      );
    }

    state.heartbeat.lastResult = {
      trigger,
      at: now,
      ok,
      ack: ok ? "HEARTBEAT_OK" : "HEARTBEAT_DEGRADED",
      checks
    };
    broadcast({
      type: "heartbeat.result",
      payload: state.heartbeat.lastResult
    });
    return state.heartbeat.lastResult;
  }

  function cronActionName(jobName) {
    const lower = String(jobName || "").toLowerCase();
    if (lower.includes("health")) return "heartbeat";
    if (lower.includes("router")) return "router_check";
    if (lower.includes("security")) return "security_audit";
    return "noop";
  }

  async function runCronJob(jobName, reason) {
    const action = cronActionName(jobName);
    const startedAt = new Date().toISOString();
    let result = null;
    let ok = true;
    try {
      if (action === "heartbeat") {
        result = await runHeartbeat(`cron:${jobName}`);
        ok = Boolean(result?.ok);
      } else if (action === "security_audit") {
        const verify = refreshAuditIntegrity(`cron:${jobName}`);
        result = {
          ok: Boolean(verify?.ok),
          verify
        };
        ok = Boolean(verify?.ok);
      } else {
        result = { ok: true, note: `Scaffold job ${jobName} executed.` };
      }
    } catch (error) {
      ok = false;
      result = {
        ok: false,
        error: String(error && error.message ? error.message : error)
      };
    }

    const record = {
      job: jobName,
      reason,
      action,
      at: startedAt,
      ok,
      result
    };
    state.cron.executions.push(record);
    if (state.cron.executions.length > 200) {
      state.cron.executions = state.cron.executions.slice(-200);
    }
    broadcast({
      type: "cron.executed",
      payload: record
    });
    return record;
  }

  function startCronTicker() {
    const jobs = config?.scheduler?.jobs || {};
    const lastRunByJobMinute = new Map();

    setInterval(() => {
      const now = new Date();
      state.cron.lastTickAt = now.toISOString();
      const minuteKey = now.toISOString().slice(0, 16);
      for (const [jobName, expression] of Object.entries(jobs)) {
        if (!cronMatches(expression, now)) {
          continue;
        }
        const prior = lastRunByJobMinute.get(jobName);
        if (prior === minuteKey) {
          continue;
        }
        lastRunByJobMinute.set(jobName, minuteKey);
        void runCronJob(jobName, "schedule");
      }
    }, 15_000);
  }

  function scheduleHeartbeatLoop(initialDelayMs = 8_000) {
    setTimeout(async () => {
      try {
        await runHeartbeat("timer");
      } finally {
        scheduleHeartbeatLoop(state.heartbeat.nextDelayMs);
      }
    }, Math.max(1_000, Number(initialDelayMs || 8_000)));
  }

  function scheduleAuditVerifyLoop(initialDelayMs = 12_000) {
    if (!auditPolicy.enabled) {
      return;
    }
    setTimeout(() => {
      try {
        refreshAuditIntegrity("timer");
      } finally {
        scheduleAuditVerifyLoop(auditPolicy.verifyEveryMs);
      }
    }, Math.max(1_000, Number(initialDelayMs || 12_000)));
  }

  function sendWsError(ws, id, error) {
    ws.send(JSON.stringify({
      type: "error",
      id: id || "",
      error: String(error?.message || "request_failed"),
      code: String(error?.code || "request_failed"),
      details: error?.details || null
    }));
  }

  function routeWsMessage(ws, msg) {
    const type = String(msg.type || "").trim().toLowerCase();
    if (type === "ping") {
      ws.send(JSON.stringify({ type: "pong", at: new Date().toISOString(), id: msg.id || "" }));
      return;
    }
    if (type === "registry.list") {
      ws.send(JSON.stringify({
        type: "registry.list.result",
        id: msg.id || "",
        payload: { tools: listToolManifests() }
      }));
      return;
    }
    if (type === "health.get") {
      const authorityStatus = authorityModes.getStatus();
      const readiness = computeAuthorityReadiness("asolaria_primary");
      const auditStatus = runtimeAuditStatus();
      ws.send(JSON.stringify({
        type: "health.get.result",
        id: msg.id || "",
        payload: {
          ok: true,
          heartbeat: state.heartbeat,
          cron: { lastTickAt: state.cron.lastTickAt },
          authority: {
            policy: toolAuthority.getPolicy(),
            mode: authorityStatus.mode,
            modeUpdatedAt: authorityStatus.updatedAt,
            modeUpdatedBy: authorityStatus.updatedBy,
            pendingTransitions: authorityStatus.pendingTransitions.length,
            approvals: toolAuthority.getSummary(),
            readiness
          },
          audit: {
            enabled: auditStatus.enabled,
            totalEvents: auditStatus.totalEvents,
            lastHash: auditStatus.lastHash,
            lastEventAt: auditStatus.lastEventAt,
            integrity: auditStatus.integrity,
            gateLocked: auditStatus.gateLocked,
            gateReason: auditStatus.gateReason,
            lastVerifyAt: auditStatus.lastVerifyAt,
            lastVerifyTrigger: auditStatus.lastVerifyTrigger
          },
          auditLastError: auditStatus.lastError || ""
        }
      }));
      return;
    }
    if (type === "heartbeat.run") {
      void runHeartbeat("ws").then((result) => {
        ws.send(JSON.stringify({
          type: "heartbeat.run.result",
          id: msg.id || "",
          payload: result
        }));
      });
      return;
    }
    if (type === "cron.list") {
      ws.send(JSON.stringify({
        type: "cron.list.result",
        id: msg.id || "",
        payload: {
          jobs: config?.scheduler?.jobs || {},
          executions: state.cron.executions.slice(-30)
        }
      }));
      return;
    }
    if (type === "cron.run") {
      const jobName = String(msg?.payload?.name || "").trim();
      if (!jobName || !Object.prototype.hasOwnProperty.call(config?.scheduler?.jobs || {}, jobName)) {
        ws.send(JSON.stringify({
          type: "error",
          id: msg.id || "",
          error: "Unknown cron job name."
        }));
        return;
      }
      void runCronJob(jobName, "manual").then((record) => {
        ws.send(JSON.stringify({
          type: "cron.run.result",
          id: msg.id || "",
          payload: record
        }));
      });
      return;
    }
    if (type === "tools.policy") {
      ws.send(JSON.stringify({
        type: "tools.policy.result",
        id: msg.id || "",
        payload: {
          policy: toolAuthority.getPolicy(),
          authority: authorityModes.getStatus()
        }
      }));
      return;
    }
    if (type === "authority.status") {
      const targetMode = String(msg?.payload?.targetMode || "asolaria_primary").trim().toLowerCase();
      ws.send(JSON.stringify({
        type: "authority.status.result",
        id: msg.id || "",
        payload: {
          authority: authorityModes.getStatus(),
          readiness: computeAuthorityReadiness(targetMode)
        }
      }));
      return;
    }
    if (type === "authority.readiness") {
      const targetMode = String(msg?.payload?.targetMode || "asolaria_primary").trim().toLowerCase();
      ws.send(JSON.stringify({
        type: "authority.readiness.result",
        id: msg.id || "",
        payload: {
          readiness: computeAuthorityReadiness(targetMode)
        }
      }));
      return;
    }
    if (type === "authority.readiness.drill") {
      const targetMode = String(msg?.payload?.targetMode || "asolaria_primary").trim().toLowerCase();
      void runAuthorityReadinessDrill(targetMode, "ws.readiness_drill").then((drill) => {
        ws.send(JSON.stringify({
          type: "authority.readiness.drill.result",
          id: msg.id || "",
          payload: {
            drill
          }
        }));
      }).catch((error) => {
        sendWsError(ws, msg.id || "", error);
      });
      return;
    }
    if (type === "authority.mode.request") {
      try {
        assertAuditGate("ws:authority.mode.request");
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const readiness = assertHandoverGuards(payload.targetMode, "ws:authority.mode.request");
        const result = authorityModes.requestTransition({
          targetMode: payload.targetMode,
          reason: payload.reason,
          ttlMs: payload.ttlMs,
          actor: payload.actor || "ws"
        });
        ws.send(JSON.stringify({
          type: "authority.mode.request.result",
          id: msg.id || "",
          payload: {
            ...result,
            readiness
          }
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    if (type === "authority.mode.confirm") {
      try {
        assertAuditGate("ws:authority.mode.confirm");
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const targetModeHint = resolvePendingTransitionTargetMode(payload.id);
        const readiness = targetModeHint
          ? assertHandoverGuards(targetModeHint, "ws:authority.mode.confirm")
          : computeAuthorityReadiness("operator_primary");
        const result = authorityModes.confirmTransition({
          id: payload.id,
          confirmText: payload.confirmText,
          reason: payload.reason,
          actor: payload.actor || "ws"
        });
        ws.send(JSON.stringify({
          type: "authority.mode.confirm.result",
          id: msg.id || "",
          payload: {
            ...result,
            readiness
          }
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    if (type === "authority.mode.rollback") {
      try {
        assertAuditGate("ws:authority.mode.rollback");
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const result = authorityModes.rollback({
          reason: payload.reason,
          actor: payload.actor || "ws"
        });
        ws.send(JSON.stringify({
          type: "authority.mode.rollback.result",
          id: msg.id || "",
          payload: result
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    if (type === "audit.status") {
      ws.send(JSON.stringify({
        type: "audit.status.result",
        id: msg.id || "",
        payload: {
          audit: runtimeAuditStatus()
        }
      }));
      return;
    }
    if (type === "audit.list") {
      try {
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const events = auditLog.list({
          type: payload.type,
          since: payload.since,
          limit: payload.limit
        });
        ws.send(JSON.stringify({
          type: "audit.list.result",
          id: msg.id || "",
          payload: {
            count: events.length,
            events
          }
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    if (type === "audit.verify") {
      const result = refreshAuditIntegrity("ws.verify");
      ws.send(JSON.stringify({
        type: "audit.verify.result",
        id: msg.id || "",
        payload: {
          result,
          audit: runtimeAuditStatus()
        }
      }));
      return;
    }
    if (type === "tool.invoke") {
      try {
        assertAuditGate("ws:tool.invoke");
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
        return;
      }
      const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
      void toolAuthority.invoke({
        tool: payload.tool,
        payload: payload.payload,
        approvalId: payload.approvalId,
        actor: payload.actor || "ws"
      }).then((invoked) => {
        ws.send(JSON.stringify({
          type: "tool.invoke.result",
          id: msg.id || "",
          payload: invoked
        }));
      }).catch((error) => {
        sendWsError(ws, msg.id || "", error);
      });
      return;
    }
    if (type === "approvals.list") {
      try {
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const approvals = toolAuthority.listApprovals({
          status: payload.status,
          limit: payload.limit
        });
        ws.send(JSON.stringify({
          type: "approvals.list.result",
          id: msg.id || "",
          payload: {
            approvals,
            count: approvals.length
          }
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    if (type === "approval.decide") {
      try {
        assertAuditGate("ws:approval.decide");
        const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {};
        const approval = toolAuthority.decideApproval({
          id: payload.id,
          decision: payload.decision,
          reason: payload.reason,
          actor: payload.actor || "ws"
        });
        ws.send(JSON.stringify({
          type: "approval.decide.result",
          id: msg.id || "",
          payload: {
            approval
          }
        }));
      } catch (error) {
        sendWsError(ws, msg.id || "", error);
      }
      return;
    }
    ws.send(JSON.stringify({ type: "error", id: msg.id || "", error: `Unsupported message type: ${type}` }));
  }

  wss.on("connection", (ws, req) => {
    const origin = String(req.headers.origin || "").trim();
    const allowedOrigins = config?.gateway?.controlUi?.allowedOrigins || [];
    if (!originAllowed(origin, allowedOrigins)) {
      ws.close(1008, "origin_not_allowed");
      return;
    }

    const token = wsTokenFromRequest(req);
    if (!token || token !== gatewayToken) {
      ws.close(1008, "unauthorized");
      return;
    }

    clients.add(ws);
    ws.send(JSON.stringify({
      type: "hello",
      payload: {
        ok: true,
        service: "asolaria-gateway",
        at: new Date().toISOString()
      }
    }));

    ws.on("message", (raw) => {
      let parsed = null;
      try {
        parsed = JSON.parse(String(raw || ""));
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Invalid JSON payload." }));
        return;
      }

      if (!messageValidator(parsed)) {
        ws.send(JSON.stringify({
          type: "error",
          error: "Invalid message schema.",
          details: messageValidator.errors || []
        }));
        return;
      }
      const sanitized = redactPayload(parsed, redactKeys);
      routeWsMessage(ws, sanitized);
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  startCronTicker();
  scheduleHeartbeatLoop();
  scheduleAuditVerifyLoop();

  httpServer.listen(port, bind, () => {
    console.log(`Asolaria gateway is listening on http://${bind}:${port}`);
    console.log(`WS control plane: ws://${bind}:${port}/ws?token=***`);
  });
}

createServer();
