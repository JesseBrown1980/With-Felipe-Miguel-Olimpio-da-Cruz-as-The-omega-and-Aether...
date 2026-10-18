const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const Ajv = require("ajv");
const { createToolAuthority } = require("./toolAuthority");

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
      json
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
    }
  };

  let broadcast = () => {};
  function recordAuthorityEvent(type, payload) {
    const event = {
      type,
      at: new Date().toISOString(),
      payload: payload || {}
    };
    state.authority.events.push(event);
    if (state.authority.events.length > 250) {
      state.authority.events = state.authority.events.slice(-250);
    }
    broadcast({
      type: `authority.${type}`,
      payload: event
    });
  }

  const toolAuthority = createToolAuthority({
    repoRoot,
    config,
    onEvent: recordAuthorityEvent
  });

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
        approvals: toolAuthority.getSummary(),
        events: state.authority.events.slice(-30)
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
      policy: toolAuthority.getPolicy()
    });
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
      ws.send(JSON.stringify({
        type: "health.get.result",
        id: msg.id || "",
        payload: {
          ok: true,
          heartbeat: state.heartbeat,
          cron: { lastTickAt: state.cron.lastTickAt },
          authority: {
            policy: toolAuthority.getPolicy(),
            approvals: toolAuthority.getSummary()
          }
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
          policy: toolAuthority.getPolicy()
        }
      }));
      return;
    }
    if (type === "tool.invoke") {
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

  httpServer.listen(port, bind, () => {
    console.log(`Asolaria gateway is listening on http://${bind}:${port}`);
    console.log(`WS control plane: ws://${bind}:${port}/ws?token=***`);
  });
}

createServer();
