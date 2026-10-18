const { getSkillDefinition } = require("./skillRegistry");
const { evaluateRisk } = require("./riskEngine");
const { resolveToolPaths } = require("./connectors/systemPaths");
const { getGoogleIntegrationStatus } = require("./connectors/googleConnector");
const { getGcpConfigSummary, listEnabledServices } = require("./connectors/gcpConnector");
const { getVertexConfigSummary, getVertexBudgetStatus } = require("./connectors/vertexConnector");
const { getGeminiApiConfigSummary } = require("./connectors/geminiApiConnector");
const { invokeDesktopInput } = require("./connectors/desktopControlConnector");
const { captureDesktopSnapshot, safeDesktopFileName } = require("./connectors/desktopCaptureConnector");
const {
  getCapturesPolicy,
  collectCapturesStats,
  pruneDesktopAutoCaptures,
  pruneImportantCaptures,
  pruneTrashCaptures,
  markCaptureImportant
} = require("./connectors/capturesConnector");

function normalizeStepPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (Array.isArray(payload)) return {};
  return payload;
}

function normalizeStepAction(action) {
  const value = String(action || "").trim().toLowerCase();
  if (!value) return "";
  if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/.test(value)) return "";
  return value;
}

function normalizeInput(input) {
  if (input === undefined || input === null) return {};
  if (typeof input === "string") return { text: input };
  if (typeof input === "number" || typeof input === "boolean") return { value: input };
  if (typeof input === "object" && !Array.isArray(input)) return input;
  return { value: input };
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function clampFloat(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeDesktopPoint(payload = {}) {
  const xNormRaw = Number(payload.xNorm);
  const yNormRaw = Number(payload.yNorm);
  const hasNorm = Number.isFinite(xNormRaw) && Number.isFinite(yNormRaw);
  if (hasNorm) {
    return {
      xNorm: clampFloat(xNormRaw, 0.5, 0, 1),
      yNorm: clampFloat(yNormRaw, 0.5, 0, 1)
    };
  }

  const xRaw = Number(payload.x);
  const yRaw = Number(payload.y);
  const hasAbsolute = Number.isFinite(xRaw) && Number.isFinite(yRaw);
  if (hasAbsolute) {
    return {
      x: clampInt(xRaw, 0, 0, 32767),
      y: clampInt(yRaw, 0, 0, 32767)
    };
  }

  return {};
}

function defaultGcpProject(policies = {}) {
  try {
    const summary = getGcpConfigSummary(policies.gcp || {});
    return summary.defaultProject || summary.projectId || "";
  } catch (_error) {
    return "";
  }
}

async function runStep(action, payload, context) {
  const policies = context?.policies || {};
  const settings = context?.settings || {};

  switch (action) {
    case "tools_status": {
      return {
        toolPaths: resolveToolPaths(),
        openclawMode: String(settings.openclawMode || "")
      };
    }
    case "google_status": {
      return getGoogleIntegrationStatus(policies.google || {});
    }
    case "gcp_status": {
      return getGcpConfigSummary(policies.gcp || {});
    }
    case "gcp_services_enabled": {
      const project = String(payload.project || payload.projectId || payload.projectNumber || "").trim()
        || defaultGcpProject(policies);
      return listEnabledServices({
        project,
        pageSize: payload.pageSize
      }, policies.gcp || {});
    }
    case "vertex_status": {
      return getVertexConfigSummary(policies.vertex || {});
    }
    case "vertex_budget_status": {
      return getVertexBudgetStatus(policies.vertex || {});
    }
    case "gemini_api_status": {
      return getGeminiApiConfigSummary(policies.geminiApi || {});
    }
    case "captures_stats": {
      const policy = getCapturesPolicy();
      return {
        policy,
        stats: collectCapturesStats(policy)
      };
    }
    case "captures_prune": {
      const keep = clampInt(payload.keep, undefined, 0, 50000);
      const minAgeMinutes = clampInt(payload.minAgeMinutes, undefined, 0, 24 * 60);
      const pruneMode = String(payload.pruneMode || "").trim().toLowerCase();
      const dryRun = Boolean(payload.dryRun);
      const protectedAbsPaths = Array.isArray(payload.protectedAbsPaths)
        ? payload.protectedAbsPaths.map((p) => String(p || "")).filter(Boolean).slice(0, 24)
        : [];

      const desktop = pruneDesktopAutoCaptures({
        keep: Number.isFinite(Number(payload.keep)) ? keep : undefined,
        minAgeMinutes: Number.isFinite(Number(payload.minAgeMinutes)) ? minAgeMinutes : undefined,
        pruneMode: pruneMode === "trash" ? "trash" : pruneMode === "delete" ? "delete" : undefined,
        dryRun,
        protectedAbsPaths
      });
      const important = pruneImportantCaptures({ dryRun });
      const trash = pruneTrashCaptures({ dryRun });
      return {
        ok: Boolean(desktop.ok && important.ok && trash.ok),
        desktop,
        important,
        trash
      };
    }
    case "captures_mark_important": {
      const capturePath = String(payload.capturePath || payload.path || "").trim();
      if (!capturePath) {
        throw new Error("captures_mark_important requires capturePath.");
      }
      return markCaptureImportant({
        capturePath,
        note: payload.note,
        sensitive: Boolean(payload.sensitive)
      });
    }
    case "desktop_window_list": {
      const limit = clampInt(payload.limit, 16, 1, 80);
      const timeoutMs = clampInt(payload.timeoutMs, 9000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      return invokeDesktopInput({
        action: "window_list",
        limit,
        timeoutMs,
        displayIndex
      });
    }
    case "desktop_window_active": {
      const timeoutMs = clampInt(payload.timeoutMs, 9000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      return invokeDesktopInput({
        action: "window_active",
        timeoutMs,
        displayIndex
      });
    }
    case "desktop_window_focus": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const windowId = clampInt(payload.windowId, 0, 0, 2000000000);
      const windowTitle = String(payload.windowTitle || "").trim().slice(0, 240);
      if (!windowId && !windowTitle) {
        throw new Error("desktop_window_focus requires windowId or windowTitle.");
      }
      return invokeDesktopInput({
        action: "window_focus",
        timeoutMs,
        windowId,
        windowTitle
      });
    }
    case "desktop_click": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      const button = String(payload.button || "left").trim().toLowerCase();
      const point = normalizeDesktopPoint(payload);
      if (!Object.keys(point).length) {
        throw new Error("desktop_click requires xNorm/yNorm or x/y.");
      }
      return invokeDesktopInput({
        action: "click",
        timeoutMs,
        displayIndex,
        button,
        ...point
      });
    }
    case "desktop_double_click": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      const button = String(payload.button || "left").trim().toLowerCase();
      const point = normalizeDesktopPoint(payload);
      if (!Object.keys(point).length) {
        throw new Error("desktop_double_click requires xNorm/yNorm or x/y.");
      }
      return invokeDesktopInput({
        action: "double_click",
        timeoutMs,
        displayIndex,
        button,
        ...point
      });
    }
    case "desktop_scroll": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      const wheelDelta = clampInt(payload.wheelDelta, -360, -2400, 2400);
      const point = normalizeDesktopPoint(payload);
      return invokeDesktopInput({
        action: "scroll",
        timeoutMs,
        displayIndex,
        wheelDelta,
        ...point
      });
    }
    case "desktop_type": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const text = String(payload.text || "").slice(0, 2400);
      if (!text) {
        throw new Error("desktop_type requires text.");
      }
      return invokeDesktopInput({
        action: "type",
        timeoutMs,
        text
      });
    }
    case "desktop_key": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const key = String(payload.key || "").trim().slice(0, 80);
      if (!key) {
        throw new Error("desktop_key requires key.");
      }
      return invokeDesktopInput({
        action: "key",
        timeoutMs,
        key
      });
    }
    case "desktop_move": {
      const timeoutMs = clampInt(payload.timeoutMs, 12000, 2500, 30000);
      const displayIndex = clampInt(payload.displayIndex, -1, -1, 16);
      const point = normalizeDesktopPoint(payload);
      if (!Object.keys(point).length) {
        throw new Error("desktop_move requires xNorm/yNorm or x/y.");
      }
      return invokeDesktopInput({
        action: "move",
        timeoutMs,
        displayIndex,
        ...point
      });
    }
    case "desktop_capture": {
      const timeoutMs = clampInt(payload.timeoutMs, 25000, 5000, 120000);
      const screenIndex = clampInt(payload.screenIndex, -1, -1, 16);
      const captureAll = Boolean(payload.captureAll);
      const fileName = safeDesktopFileName(String(payload.fileName || "").trim(), "desktop");
      return captureDesktopSnapshot({
        fileName,
        timeoutMs,
        screenIndex,
        captureAll
      });
    }
    default: {
      throw new Error(`Unsupported skill step action: ${action}`);
    }
  }
}

function compareRiskLevels(left, right) {
  const order = ["low", "medium", "high", "critical"];
  const l = order.indexOf(String(left || "low"));
  const r = order.indexOf(String(right || "low"));
  return Math.max(0, l) >= Math.max(0, r) ? left : right;
}

async function runSkill(skillId, input, context) {
  const skill = getSkillDefinition(skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${String(skillId || "").trim() || "(missing id)"}`);
  }

  const startedAt = new Date();
  const safeInput = normalizeInput(input);
  const results = [];
  let maxRiskLevel = "low";
  const hooks = context?.hooks && typeof context.hooks === "object" ? context.hooks : {};

  for (let index = 0; index < skill.steps.length; index += 1) {
    const step = skill.steps[index];
    const action = normalizeStepAction(step.action);
    if (!action) {
      throw new Error(`Invalid skill step action at index ${index}.`);
    }
    const payload = normalizeStepPayload(step.payload);
    const permissions = Array.isArray(step.permissions) ? step.permissions.slice(0, 24) : [];
    const requiresApproval = Boolean(step.requiresApproval);
    const risk = evaluateRisk({
      action,
      message: step.note || ""
    });
    if (risk.level && ["low", "medium", "high", "critical"].includes(risk.level)) {
      maxRiskLevel = compareRiskLevels(maxRiskLevel, risk.level);
    }

    const stepStartedAt = new Date();
    if (typeof hooks.beforeStep === "function") {
      await hooks.beforeStep({
        skill,
        step,
        index,
        total: skill.steps.length,
        action,
        note: String(step.note || "").trim(),
        payload,
        permissions,
        requiresApproval,
        risk,
        input: safeInput
      });
    }
    const output = await runStep(action, payload, {
      ...context,
      input: safeInput
    });
    const stepFinishedAt = new Date();
    if (typeof hooks.afterStep === "function") {
      await hooks.afterStep({
        skill,
        step,
        index,
        total: skill.steps.length,
        action,
        note: String(step.note || "").trim(),
        payload,
        permissions,
        requiresApproval,
        risk,
        input: safeInput,
        output
      });
    }
    results.push({
      index,
      action,
      note: String(step.note || "").trim(),
      permissions,
      requiresApproval,
      risk,
      startedAt: stepStartedAt.toISOString(),
      finishedAt: stepFinishedAt.toISOString(),
      elapsedMs: stepFinishedAt.getTime() - stepStartedAt.getTime(),
      output
    });
  }

  const finishedAt = new Date();
  return {
    skill: {
      id: skill.id,
      title: skill.title,
      version: skill.version,
      risk: skill.risk,
      tags: skill.tags,
      permissions: Array.isArray(skill.permissions) ? skill.permissions.slice(0, 24) : []
    },
    input: safeInput,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    maxRiskLevel,
    steps: results
  };
}

module.exports = {
  runSkill
};
