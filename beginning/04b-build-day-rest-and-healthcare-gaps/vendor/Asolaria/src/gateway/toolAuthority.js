const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { appendGraphEvent, appendActionManifest } = require("../graphRuntimeStore");

const localOpsConnector = require("../connectors/localOpsConnector");
const screenshotConnector = require("../connectors/screenshotConnector");
const githubConnector = require("../connectors/githubConnector");

function toError(message, status = 400, code = "bad_request", details = null) {
  const err = new Error(String(message || "request_failed"));
  err.status = status;
  err.code = code;
  if (details !== null && details !== undefined) {
    err.details = details;
  }
  return err;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function splitList(value) {
  return String(value || "")
    .split(/[;,]/g)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function parseListEnv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) {
    return Array.from(new Set((Array.isArray(fallback) ? fallback : []).filter(Boolean)));
  }
  return Array.from(new Set(splitList(raw)));
}

function parseJsonEnv(name, fallback = {}) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return fallback;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPattern(value, pattern) {
  const rawPattern = String(pattern || "").trim();
  if (!rawPattern) return false;
  if (rawPattern === "*") return true;
  const regexBody = rawPattern.split("*").map((part) => escapeRegex(part)).join(".*");
  const re = new RegExp(`^${regexBody}$`);
  return re.test(String(value || "").trim());
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${pairs.join(",")}}`;
}

function hashObject(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function redactPreview(value) {
  const blockedKeys = new Set([
    "token",
    "secret",
    "password",
    "private_key",
    "apikey",
    "api_key",
    "authorization",
    "cookie"
  ]);

  function walk(input) {
    if (input === null || input === undefined) return input;
    if (typeof input !== "object") return input;
    if (Array.isArray(input)) return input.map((item) => walk(item));
    const out = {};
    for (const [key, child] of Object.entries(input)) {
      if (blockedKeys.has(String(key || "").toLowerCase())) {
        out[key] = "***REDACTED***";
      } else {
        out[key] = walk(child);
      }
    }
    return out;
  }

  const preview = walk(value);
  const serialized = stableStringify(preview);
  if (serialized.length <= 1800) {
    return preview;
  }
  return { truncated: true, preview: serialized.slice(0, 1800) };
}

function ensureApprovalStore(storePath) {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify({ approvals: [] }, null, 2), "utf8");
  }
}

function readApprovalStore(storePath) {
  ensureApprovalStore(storePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (parsed && Array.isArray(parsed.approvals)) {
      return parsed;
    }
  } catch {}
  return { approvals: [] };
}

function writeApprovalStore(storePath, doc) {
  ensureApprovalStore(storePath);
  const safe = {
    approvals: Array.isArray(doc?.approvals) ? doc.approvals.slice(-1000) : []
  };
  fs.writeFileSync(storePath, JSON.stringify(safe, null, 2), "utf8");
}

function parseApprovalTtlMs(config) {
  return clampInt(config?.tools?.approvals?.ttlMs, 15 * 60 * 1000, 60 * 1000, 24 * 60 * 60 * 1000);
}

function expirePendingApprovals(doc, nowIso) {
  let changed = false;
  const nowMs = Date.parse(nowIso);
  for (const item of doc.approvals) {
    if (item.status !== "pending") continue;
    const expiryMs = Date.parse(String(item.expiresAt || ""));
    if (Number.isFinite(expiryMs) && nowMs > expiryMs) {
      item.status = "expired";
      item.decidedAt = nowIso;
      item.updatedAt = nowIso;
      item.decisionBy = "system";
      item.decisionReason = "expired";
      changed = true;
    }
  }
  return changed;
}

function toPolicy(config, repoRoot) {
  const allowPatterns = Array.isArray(config?.tools?.allow) ? config.tools.allow.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const requireApprovalPatterns = Array.isArray(config?.tools?.requireApproval)
    ? config.tools.requireApproval.map((item) => String(item || "").trim()).filter(Boolean)
    : ["localops.run", "sandbox.execute"];
  const toolsEnabled = parseBoolean(config?.tools?.enabled, true);

  const fallbackLocalRoots = [
    repoRoot,
    path.resolve(repoRoot, "..", "ai_healthcare_project"),
    path.resolve(repoRoot, "..", "source")
  ];
  const localOpsPolicy = {
    enabled: parseBoolean(process.env.ASOLARIA_LOCAL_OPS_ENABLED, true),
    allowedRoots: parseListEnv("ASOLARIA_LOCAL_OPS_ALLOWED_ROOTS", fallbackLocalRoots),
    aliases: {
      asolaria: repoRoot,
      ...parseJsonEnv("ASOLARIA_LOCAL_OPS_ALIASES", {})
    },
    defaultTimeoutMs: clampInt(process.env.ASOLARIA_LOCAL_OPS_TIMEOUT_MS, 15 * 60 * 1000, 10 * 1000, 30 * 60 * 1000),
    maxTimeoutMs: clampInt(process.env.ASOLARIA_LOCAL_OPS_MAX_TIMEOUT_MS, 30 * 60 * 1000, 10 * 1000, 60 * 60 * 1000),
    defaultMaxOutputChars: clampInt(process.env.ASOLARIA_LOCAL_OPS_MAX_OUTPUT_CHARS, 120000, 4000, 500000)
  };

  const browserPolicy = {
    enabled: parseBoolean(process.env.ASOLARIA_BROWSER_TASKS_ENABLED, true),
    allowLoopback: parseBoolean(process.env.ASOLARIA_BROWSER_TASKS_ALLOW_LOOPBACK, true),
    allowPrivateNetwork: parseBoolean(process.env.ASOLARIA_BROWSER_TASKS_ALLOW_PRIVATE_NETWORK, false),
    allowedHosts: parseListEnv("ASOLARIA_BROWSER_TASKS_ALLOWED_HOSTS", []),
    maxSteps: clampInt(process.env.ASOLARIA_BROWSER_TASKS_MAX_STEPS, 20, 1, 80),
    actionTimeoutMs: clampInt(process.env.ASOLARIA_BROWSER_TASKS_ACTION_TIMEOUT_MS, 12000, 1000, 60000)
  };

  const githubEnabled = parseBoolean(process.env.ASOLARIA_GITHUB_ENABLED, true);
  const sandboxBaseUrlRaw = String(config?.sandbox?.baseUrl || "").trim();
  const sandboxBaseUrl = sandboxBaseUrlRaw ? sandboxBaseUrlRaw.replace(/\/+$/, "") : "";

  return {
    toolsEnabled,
    allowPatterns,
    requireApprovalPatterns,
    approvalTtlMs: parseApprovalTtlMs(config),
    approvalStorePath: path.resolve(repoRoot, String(config?.tools?.approvals?.storeFile || "data/gateway-approvals.json")),
    localOpsPolicy,
    browserPolicy,
    githubEnabled,
    sandboxBaseUrl
  };
}

function createToolAuthority(input = {}) {
  const repoRoot = String(input.repoRoot || "").trim();
  if (!repoRoot) throw new Error("repoRoot is required.");
  const config = input.config || {};
  const onEvent = typeof input.onEvent === "function" ? input.onEvent : null;
  const authorityMode = input.authorityMode || null;
  const policy = toPolicy(config, repoRoot);

  const handlers = {
    "github.status": async () => githubConnector.getGithubIntegrationStatus({ enabled: policy.githubEnabled }),
    "github.repos": async ({ payload }) => githubConnector.listGithubRepos(payload || {}, { enabled: policy.githubEnabled }),
    "browser.task": async ({ payload }) => {
      if (!policy.browserPolicy.enabled) {
        throw toError("Browser tasks are disabled by policy.", 403, "tool_disabled");
      }
      return screenshotConnector.runBrowserTask({
        ...(payload || {}),
        allowLoopback: policy.browserPolicy.allowLoopback,
        allowPrivateNetwork: policy.browserPolicy.allowPrivateNetwork,
        allowedHosts: policy.browserPolicy.allowedHosts,
        maxSteps: policy.browserPolicy.maxSteps,
        actionTimeoutMs: policy.browserPolicy.actionTimeoutMs
      });
    },
    "localops.run": async ({ payload }) => {
      if (!policy.localOpsPolicy.enabled) {
        throw toError("Local ops are disabled by policy.", 403, "tool_disabled");
      }
      return localOpsConnector.runLocalProjectTask(payload || {}, policy.localOpsPolicy);
    },
    "sandbox.execute": async ({ payload }) => {
      const base = policy.sandboxBaseUrl;
      if (!base) {
        throw toError(
          "Sandbox endpoint is not configured.",
          503,
          "sandbox_not_configured"
        );
      }
      const res = await fetch(`${base}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload || {})
      });
      const text = await res.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { raw: text };
      }
      if (!res.ok) {
        throw toError(
          `Sandbox execute failed (HTTP ${res.status}).`,
          502,
          "sandbox_execute_failed",
          parsed
        );
      }
      return parsed;
    }
  };

  function emit(type, payload) {
    if (!onEvent) return;
    try {
      onEvent(type, payload);
    } catch {}
  }

  function isToolAllowed(tool) {
    if (!policy.toolsEnabled) return false;
    if (!policy.allowPatterns.length) return false;
    return policy.allowPatterns.some((pattern) => matchesPattern(tool, pattern));
  }

  function isApprovalRequired(tool) {
    return policy.requireApprovalPatterns.some((pattern) => matchesPattern(tool, pattern));
  }

  function loadDoc() {
    const doc = readApprovalStore(policy.approvalStorePath);
    const nowIso = new Date().toISOString();
    const changed = expirePendingApprovals(doc, nowIso);
    if (changed) writeApprovalStore(policy.approvalStorePath, doc);
    return doc;
  }

  function listApprovals(options = {}) {
    const doc = loadDoc();
    const status = String(options.status || "").trim().toLowerCase();
    const limit = clampInt(options.limit, 50, 1, 500);
    let rows = doc.approvals.slice().reverse();
    if (status) {
      rows = rows.filter((item) => String(item.status || "").toLowerCase() === status);
    }
    return rows.slice(0, limit);
  }

  function createApproval({ tool, payload, actor }) {
    const doc = loadDoc();
    const now = new Date();
    const nowIso = now.toISOString();
    const inputHash = hashObject(payload || {});
    const duplicate = doc.approvals.find((item) => (
      item.status === "pending"
      && item.tool === tool
      && item.inputHash === inputHash
    ));
    if (duplicate) {
      return duplicate;
    }
    const id = `gwapr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(now.getTime() + policy.approvalTtlMs).toISOString();
    const approval = {
      id,
      tool,
      status: "pending",
      actor: String(actor || "unknown").slice(0, 120),
      inputHash,
      inputPreview: redactPreview(payload || {}),
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt,
      decisionBy: "",
      decisionReason: "",
      decidedAt: "",
      usedAt: ""
    };
    doc.approvals.push(approval);
    writeApprovalStore(policy.approvalStorePath, doc);
    emit("approval.created", { approval });
    appendGraphEvent({
      component: "gateway-tool-authority",
      category: "gateway_approval",
      action: "approval_created",
      actor: {
        type: "gateway_actor",
        id: String(actor || "unknown").slice(0, 120)
      },
      target: {
        type: "gateway_tool",
        id: tool,
        criticality: isApprovalRequired(tool) ? "high" : "medium"
      },
      context: {
        tool,
        approvalId: approval.id
      },
      policy: {
        approvalState: "pending",
        mode: "gateway"
      }
    });
    appendActionManifest({
      component: "gateway-tool-authority",
      action: tool,
      status: "approval_required",
      actor: {
        type: "gateway_actor",
        id: String(actor || "unknown").slice(0, 120)
      },
      target: {
        type: "gateway_tool",
        id: tool,
        criticality: isApprovalRequired(tool) ? "high" : "medium"
      },
      reason: `Gateway tool "${tool}" requires approval before execution.`,
      context: {
        tool,
        approvalId: approval.id
      },
      policy: {
        approvalState: "pending",
        mode: "gateway",
        rollbackRequired: true
      },
      evidence: {
        inputPreview: JSON.stringify(redactPreview(payload || {})).slice(0, 320)
      }
    });
    return approval;
  }

  function decideApproval(inputDecision = {}) {
    const id = String(inputDecision.id || "").trim();
    const decisionRaw = String(inputDecision.decision || "").trim().toLowerCase();
    const reason = String(inputDecision.reason || "").trim().slice(0, 260);
    const actor = String(inputDecision.actor || "manual").trim().slice(0, 120);
    if (!id) throw toError("Approval id is required.", 400, "approval_id_required");
    const decision = decisionRaw === "approve" ? "approved" : decisionRaw === "deny" || decisionRaw === "reject" ? "denied" : "";
    if (!decision) throw toError("Decision must be approve or deny.", 400, "approval_decision_invalid");

    const doc = loadDoc();
    const nowIso = new Date().toISOString();
    const approval = doc.approvals.find((item) => item.id === id);
    if (!approval) throw toError("Approval not found.", 404, "approval_not_found");
    if (approval.status !== "pending") {
      return approval;
    }
    approval.status = decision;
    approval.updatedAt = nowIso;
    approval.decidedAt = nowIso;
    approval.decisionBy = actor;
    approval.decisionReason = reason || (decision === "approved" ? "approved" : "denied");
    writeApprovalStore(policy.approvalStorePath, doc);
    emit("approval.decided", { approval });
    appendGraphEvent({
      component: "gateway-tool-authority",
      category: "gateway_approval",
      action: `approval_${decision}`,
      actor: {
        type: "gateway_actor",
        id: actor
      },
      target: {
        type: "gateway_tool",
        id: approval.tool,
        criticality: isApprovalRequired(approval.tool) ? "high" : "medium"
      },
      context: {
        tool: approval.tool,
        approvalId: approval.id
      },
      policy: {
        approvalState: decision,
        mode: "gateway"
      },
      detail: {
        reason: approval.decisionReason || ""
      }
    });
    return approval;
  }

  function consumeApproval(approvalId, tool, payload, actor) {
    const wanted = String(approvalId || "").trim();
    if (!wanted) throw toError("approvalId is required for this tool.", 403, "approval_id_required");
    const inputHash = hashObject(payload || {});
    const doc = loadDoc();
    const nowIso = new Date().toISOString();
    const approval = doc.approvals.find((item) => item.id === wanted);
    if (!approval) throw toError("Approval not found.", 404, "approval_not_found");
    if (approval.status !== "approved") throw toError(`Approval is ${approval.status}.`, 403, "approval_not_approved");
    if (approval.usedAt) throw toError("Approval already used.", 409, "approval_already_used");
    if (approval.tool !== tool || approval.inputHash !== inputHash) {
      throw toError("Approval does not match this tool invocation.", 403, "approval_mismatch");
    }
    approval.usedAt = nowIso;
    approval.updatedAt = nowIso;
    approval.usedBy = String(actor || "unknown").slice(0, 120);
    writeApprovalStore(policy.approvalStorePath, doc);
    emit("approval.used", { approval });
    appendGraphEvent({
      component: "gateway-tool-authority",
      category: "gateway_approval",
      action: "approval_used",
      actor: {
        type: "gateway_actor",
        id: String(actor || "unknown").slice(0, 120)
      },
      target: {
        type: "gateway_tool",
        id: tool,
        criticality: isApprovalRequired(tool) ? "high" : "medium"
      },
      context: {
        tool,
        approvalId: approval.id
      },
      policy: {
        approvalState: "approved",
        mode: "gateway"
      }
    });
    return approval;
  }

  function getSummary() {
    const doc = loadDoc();
    const counts = {
      pending: 0,
      approved: 0,
      denied: 0,
      expired: 0,
      used: 0
    };
    for (const item of doc.approvals) {
      const status = String(item.status || "").toLowerCase();
      if (status in counts) counts[status] += 1;
      if (item.usedAt) counts.used += 1;
    }
    return {
      storePath: policy.approvalStorePath,
      total: doc.approvals.length,
      counts
    };
  }

  async function invoke(inputInvoke = {}) {
    const tool = String(inputInvoke.tool || "").trim();
    const actor = String(inputInvoke.actor || "unknown").trim().slice(0, 120);
    const payload = inputInvoke.payload && typeof inputInvoke.payload === "object" ? inputInvoke.payload : {};
    const approvalId = String(inputInvoke.approvalId || "").trim();

    if (!tool) throw toError("Tool is required.", 400, "tool_required");
    if (!isToolAllowed(tool)) throw toError(`Tool "${tool}" is not allowed by gateway policy.`, 403, "tool_not_allowed");
    const handler = handlers[tool];
    if (!handler) throw toError(`Unsupported tool "${tool}".`, 404, "tool_not_supported");

    let authorityGate = {
      allowed: true,
      mode: "operator_primary",
      autonomous: false
    };
    if (authorityMode && typeof authorityMode.evaluateInvocation === "function") {
      authorityGate = authorityMode.evaluateInvocation({ actor, tool, payload }) || authorityGate;
      if (!authorityGate.allowed) {
        throw toError(
          authorityGate.reason || `Authority mode blocked actor "${actor}" for tool "${tool}".`,
          403,
          "authority_mode_blocked",
          authorityGate
        );
      }
    }

    if (isApprovalRequired(tool)) {
      if (!approvalId) {
        const approval = createApproval({ tool, payload, actor });
        throw toError(
          `Tool "${tool}" requires approval.`,
          403,
          "approval_required",
          {
            approval
          }
        );
      }
      consumeApproval(approvalId, tool, payload, actor);
    }

    appendActionManifest({
      component: "gateway-tool-authority",
      action: tool,
      status: "requested",
      actor: {
        type: "gateway_actor",
        id: actor
      },
      target: {
        type: "gateway_tool",
        id: tool,
        criticality: isApprovalRequired(tool) ? "high" : "medium"
      },
      reason: `Gateway invoke requested for tool "${tool}".`,
      context: {
        tool
      },
      policy: {
        approvalState: isApprovalRequired(tool) ? (approvalId ? "approved" : "required") : "not_required",
        mode: authorityGate.mode || "",
        autonomous: Boolean(authorityGate.autonomous),
        rollbackRequired: isApprovalRequired(tool)
      },
      evidence: {
        inputPreview: JSON.stringify(redactPreview(payload || {})).slice(0, 320)
      }
    });

    try {
      const result = await handler({ tool, payload, actor });
      emit("tool.invoked", {
        tool,
        actor,
        mode: authorityGate.mode || "",
        ok: true,
        at: new Date().toISOString()
      });
      appendGraphEvent({
        component: "gateway-tool-authority",
        category: "gateway_invoke",
        action: "tool_invoked",
        status: "ok",
        actor: {
          type: "gateway_actor",
          id: actor
        },
        target: {
          type: "gateway_tool",
          id: tool,
          criticality: isApprovalRequired(tool) ? "high" : "medium"
        },
        context: {
          tool,
          mode: authorityGate.mode || ""
        },
        policy: {
          approvalState: isApprovalRequired(tool) ? "approved" : "not_required",
          mode: authorityGate.mode || "",
          autonomous: Boolean(authorityGate.autonomous)
        }
      });
      return {
        tool,
        actor,
        mode: authorityGate.mode || "",
        autonomous: Boolean(authorityGate.autonomous),
        result
      };
    } catch (error) {
      emit("tool.invoked", {
        tool,
        actor,
        mode: authorityGate.mode || "",
        ok: false,
        error: String(error?.message || error || "invoke_failed"),
        at: new Date().toISOString()
      });
      appendGraphEvent({
        component: "gateway-tool-authority",
        category: "gateway_invoke",
        action: "tool_failed",
        status: "failed",
        actor: {
          type: "gateway_actor",
          id: actor
        },
        target: {
          type: "gateway_tool",
          id: tool,
          criticality: isApprovalRequired(tool) ? "high" : "medium"
        },
        context: {
          tool,
          mode: authorityGate.mode || ""
        },
        policy: {
          approvalState: isApprovalRequired(tool) ? (approvalId ? "approved" : "required") : "not_required",
          mode: authorityGate.mode || "",
          autonomous: Boolean(authorityGate.autonomous)
        },
        detail: {
          error: String(error?.message || error || "invoke_failed").slice(0, 220)
        }
      });
      if (error && error.status) throw error;
      throw toError(String(error?.message || error || "invoke_failed"), 500, "tool_invoke_failed");
    }
  }

  return {
    invoke,
    listApprovals,
    decideApproval,
    getSummary,
    getPolicy: () => ({
      toolsEnabled: policy.toolsEnabled,
      allowPatterns: policy.allowPatterns,
      requireApprovalPatterns: policy.requireApprovalPatterns,
      supportedTools: Object.keys(handlers).sort(),
      authorityMode: authorityMode && typeof authorityMode.getMode === "function"
        ? authorityMode.getMode()
        : ""
    })
  };
}

module.exports = {
  createToolAuthority,
  toError
};
