const fs = require("fs");
const path = require("path");

const MODES = ["operator_primary", "shared_control", "asolaria_primary"];

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeMode(value, fallback = "operator_primary") {
  const raw = String(value || "").trim().toLowerCase();
  return MODES.includes(raw) ? raw : fallback;
}

function parseList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
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

function buildPolicy(config = {}, repoRoot = "") {
  const authority = config?.authority || {};
  return {
    defaultMode: normalizeMode(authority.defaultMode, "operator_primary"),
    storePath: path.resolve(repoRoot, String(authority.storeFile || "data/gateway-authority-state.json")),
    transitionTtlMs: clampInt(authority.transitionTtlMs, 10 * 60 * 1000, 60 * 1000, 7 * 24 * 60 * 60 * 1000),
    confirmationPhrase: String(authority.confirmationPhrase || "ASSUME_COMMAND").trim() || "ASSUME_COMMAND",
    sharedControlAllowTools: parseList(authority.sharedControlAllowTools || ["github.status", "github.repos", "browser.task"]),
    asolariaActorPatterns: parseList(authority.asolariaActorPatterns || ["asolaria*", "scheduler*", "auto*"]),
    maxHistory: clampInt(authority.maxHistory, 500, 50, 5000),
    maxTransitions: clampInt(authority.maxTransitions, 500, 50, 5000)
  };
}

function ensureStore(storePath, defaultMode) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) {
    const now = new Date().toISOString();
    const fresh = {
      version: 1,
      mode: defaultMode,
      updatedAt: now,
      updatedBy: "bootstrap",
      history: [
        {
          id: `ev_${Date.now()}_bootstrap`,
          type: "bootstrap",
          from: "",
          to: defaultMode,
          actor: "bootstrap",
          reason: "initialized",
          at: now
        }
      ],
      transitions: []
    };
    fs.writeFileSync(storePath, JSON.stringify(fresh, null, 2), "utf8");
  }
}

function readStore(storePath, defaultMode) {
  ensureStore(storePath, defaultMode);
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (parsed && typeof parsed === "object") {
      return {
        version: 1,
        mode: normalizeMode(parsed.mode, defaultMode),
        updatedAt: String(parsed.updatedAt || ""),
        updatedBy: String(parsed.updatedBy || ""),
        history: Array.isArray(parsed.history) ? parsed.history : [],
        transitions: Array.isArray(parsed.transitions) ? parsed.transitions : []
      };
    }
  } catch {}
  return {
    version: 1,
    mode: defaultMode,
    updatedAt: "",
    updatedBy: "",
    history: [],
    transitions: []
  };
}

function writeStore(storePath, doc, policy) {
  const safe = {
    version: 1,
    mode: normalizeMode(doc?.mode, policy.defaultMode),
    updatedAt: String(doc?.updatedAt || ""),
    updatedBy: String(doc?.updatedBy || ""),
    history: Array.isArray(doc?.history) ? doc.history.slice(-policy.maxHistory) : [],
    transitions: Array.isArray(doc?.transitions) ? doc.transitions.slice(-policy.maxTransitions) : []
  };
  fs.writeFileSync(storePath, JSON.stringify(safe, null, 2), "utf8");
}

function isAsolariaActor(actor, patterns) {
  const value = String(actor || "").trim().toLowerCase();
  if (!value) return false;
  return patterns.some((pattern) => matchesPattern(value, String(pattern || "").trim().toLowerCase()));
}

function createAuthorityModeManager(input = {}) {
  const repoRoot = String(input.repoRoot || "").trim();
  if (!repoRoot) throw new Error("repoRoot is required.");
  const config = input.config || {};
  const onEvent = typeof input.onEvent === "function" ? input.onEvent : null;
  const policy = buildPolicy(config, repoRoot);

  function emit(type, payload) {
    if (!onEvent) return;
    try {
      onEvent(type, payload);
    } catch {}
  }

  function loadDoc() {
    const doc = readStore(policy.storePath, policy.defaultMode);
    const nowIso = new Date().toISOString();
    let changed = false;
    for (const transition of doc.transitions) {
      if (String(transition.status || "") !== "pending") continue;
      const expiresAtMs = Date.parse(String(transition.expiresAt || ""));
      if (Number.isFinite(expiresAtMs) && Date.parse(nowIso) > expiresAtMs) {
        transition.status = "expired";
        transition.updatedAt = nowIso;
        transition.decidedAt = nowIso;
        transition.decisionBy = "system";
        transition.decisionReason = "expired";
        changed = true;
      }
    }
    if (changed) {
      writeStore(policy.storePath, doc, policy);
    }
    return doc;
  }

  function pushHistory(doc, item) {
    doc.history.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item
    });
  }

  function requestTransition(inputRequest = {}) {
    const targetMode = normalizeMode(inputRequest.targetMode, "");
    if (!targetMode) {
      const err = new Error("targetMode must be operator_primary, shared_control, or asolaria_primary.");
      err.status = 400;
      err.code = "authority_target_mode_invalid";
      throw err;
    }
    const actor = String(inputRequest.actor || "api").trim().slice(0, 120);
    const reason = String(inputRequest.reason || "").trim().slice(0, 260);
    const ttlMs = clampInt(inputRequest.ttlMs, policy.transitionTtlMs, 60 * 1000, 24 * 60 * 60 * 1000);
    const doc = loadDoc();
    if (doc.mode === targetMode) {
      const err = new Error(`Mode is already "${targetMode}".`);
      err.status = 409;
      err.code = "authority_mode_already_active";
      throw err;
    }

    const inputFingerprint = `${targetMode}|${actor}|${reason}`;
    const existing = doc.transitions.find((item) => (
      item.status === "pending"
      && `${item.targetMode}|${item.requestedBy}|${item.reason || ""}` === inputFingerprint
    ));
    if (existing) {
      return {
        mode: doc.mode,
        transition: existing,
        confirmationPhraseRequired: policy.confirmationPhrase
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const transition = {
      id: `amreq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      targetMode,
      requestedBy: actor,
      reason,
      requestedAt: nowIso,
      updatedAt: nowIso,
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      confirmationPhraseHint: policy.confirmationPhrase.slice(0, 2) + "***",
      decisionBy: "",
      decisionReason: "",
      decidedAt: ""
    };
    doc.transitions.push(transition);
    writeStore(policy.storePath, doc, policy);
    emit("authority.transition_requested", { transition, mode: doc.mode });
    return {
      mode: doc.mode,
      transition,
      confirmationPhraseRequired: policy.confirmationPhrase
    };
  }

  function confirmTransition(inputConfirm = {}) {
    const id = String(inputConfirm.id || "").trim();
    const actor = String(inputConfirm.actor || "api").trim().slice(0, 120);
    const reason = String(inputConfirm.reason || "").trim().slice(0, 260);
    const confirmText = String(inputConfirm.confirmText || "").trim();
    if (!id) {
      const err = new Error("Transition id is required.");
      err.status = 400;
      err.code = "authority_transition_id_required";
      throw err;
    }
    if (confirmText !== policy.confirmationPhrase) {
      const err = new Error(`Confirmation phrase mismatch. Expected "${policy.confirmationPhrase}".`);
      err.status = 400;
      err.code = "authority_confirmation_mismatch";
      throw err;
    }

    const doc = loadDoc();
    const nowIso = new Date().toISOString();
    const transition = doc.transitions.find((item) => item.id === id);
    if (!transition) {
      const err = new Error("Transition request not found.");
      err.status = 404;
      err.code = "authority_transition_not_found";
      throw err;
    }
    if (transition.status !== "pending") {
      return {
        mode: doc.mode,
        transition
      };
    }
    if (Date.parse(String(transition.expiresAt || "")) < Date.parse(nowIso)) {
      transition.status = "expired";
      transition.updatedAt = nowIso;
      transition.decidedAt = nowIso;
      transition.decisionBy = "system";
      transition.decisionReason = "expired";
      writeStore(policy.storePath, doc, policy);
      const err = new Error("Transition request expired.");
      err.status = 409;
      err.code = "authority_transition_expired";
      throw err;
    }

    const fromMode = doc.mode;
    doc.mode = normalizeMode(transition.targetMode, doc.mode);
    doc.updatedAt = nowIso;
    doc.updatedBy = actor;
    transition.status = "confirmed";
    transition.updatedAt = nowIso;
    transition.decidedAt = nowIso;
    transition.decisionBy = actor;
    transition.decisionReason = reason || "confirmed";
    pushHistory(doc, {
      type: "mode_confirmed",
      from: fromMode,
      to: doc.mode,
      actor,
      reason: transition.decisionReason,
      at: nowIso,
      transitionId: transition.id
    });
    writeStore(policy.storePath, doc, policy);
    emit("authority.mode_changed", { from: fromMode, to: doc.mode, actor, transition });
    return {
      mode: doc.mode,
      transition
    };
  }

  function rollback(inputRollback = {}) {
    const actor = String(inputRollback.actor || "api").trim().slice(0, 120);
    const reason = String(inputRollback.reason || "manual rollback").trim().slice(0, 260);
    const doc = loadDoc();
    const nowIso = new Date().toISOString();
    const fromMode = doc.mode;
    if (fromMode === "operator_primary") {
      return {
        mode: doc.mode,
        changed: false
      };
    }
    doc.mode = "operator_primary";
    doc.updatedAt = nowIso;
    doc.updatedBy = actor;
    pushHistory(doc, {
      type: "mode_rollback",
      from: fromMode,
      to: doc.mode,
      actor,
      reason,
      at: nowIso
    });
    writeStore(policy.storePath, doc, policy);
    emit("authority.mode_changed", { from: fromMode, to: doc.mode, actor, reason, rollback: true });
    return {
      mode: doc.mode,
      changed: true
    };
  }

  function getStatus() {
    const doc = loadDoc();
    const pending = doc.transitions.filter((item) => item.status === "pending").slice(-20).reverse();
    const history = doc.history.slice(-50).reverse();
    return {
      mode: doc.mode,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
      confirmationPhrase: policy.confirmationPhrase,
      pendingTransitions: pending,
      history,
      policy: {
        sharedControlAllowTools: policy.sharedControlAllowTools,
        asolariaActorPatterns: policy.asolariaActorPatterns
      }
    };
  }

  function evaluateInvocation(inputInvoke = {}) {
    const doc = loadDoc();
    const mode = doc.mode;
    const actor = String(inputInvoke.actor || "").trim();
    const tool = String(inputInvoke.tool || "").trim();
    const autonomous = isAsolariaActor(actor, policy.asolariaActorPatterns);

    if (!autonomous) {
      return {
        allowed: true,
        mode,
        autonomous: false
      };
    }

    if (mode === "operator_primary") {
      return {
        allowed: false,
        mode,
        autonomous: true,
        reason: "Autonomous actors are blocked in operator_primary mode."
      };
    }

    if (mode === "shared_control") {
      const allowed = policy.sharedControlAllowTools.some((pattern) => matchesPattern(tool, pattern));
      if (!allowed) {
        return {
          allowed: false,
          mode,
          autonomous: true,
          reason: `Tool "${tool}" is not allowed for autonomous actor in shared_control mode.`,
          allowedTools: policy.sharedControlAllowTools
        };
      }
    }

    return {
      allowed: true,
      mode,
      autonomous: true
    };
  }

  function getMode() {
    const doc = loadDoc();
    return doc.mode;
  }

  function getPolicySummary() {
    return {
      defaultMode: policy.defaultMode,
      transitionTtlMs: policy.transitionTtlMs,
      confirmationPhrase: policy.confirmationPhrase,
      sharedControlAllowTools: policy.sharedControlAllowTools,
      asolariaActorPatterns: policy.asolariaActorPatterns
    };
  }

  return {
    requestTransition,
    confirmTransition,
    rollback,
    getStatus,
    evaluateInvocation,
    getMode,
    getPolicySummary
  };
}

module.exports = {
  MODES,
  createAuthorityModeManager
};
