const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("../runtimePaths");
const { resolveToolPaths } = require("./systemPaths");
const { runCodex } = require("./codexConnector");
const { runAnthropicCli } = require("./anthropicCliConnector");
const {
  getAbacusIntegrationStatus,
  getAbacusOperatingStrategy,
  createAbacusWorkPacket
} = require("./abacusConnector");
const {
  getSymphonyIntegrationStatus,
  submitSymphonyWorkItem
} = require("./symphonyConnector");
const { getAugmentContextStatus } = require("./augmentContextConnector");
const { getGeminiApiConfigSummary } = require("./geminiApiConnector");
const {
  createTaskLedgerTask,
  updateTaskLedgerTask,
  addTaskLedgerEvent
} = require("../taskLedgerStore");
const { appendGraphEvent, appendActionManifest } = require("../graphRuntimeStore");
const { getProjectById } = require("../projectStore");

const ROUTER_ROOT = resolveDataPath("integrations", "worker-router");
const ROUTER_DISPATCH_ROOT = path.join(ROUTER_ROOT, "dispatches");
const WORKER_IDS = ["local_codex", "claude_max", "abacus", "symphony"];
const TASK_TYPES = new Set([
  "quick_chore",
  "patch",
  "review",
  "research",
  "orchestration",
  "long_running",
  "issue_execution"
]);
const SENSITIVITY_LEVELS = new Set(["public", "sanitized", "internal", "privileged", "owner_plane"]);
const SIZE_LEVELS = new Set(["small", "medium", "large"]);

function cleanText(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function clipText(value, maxChars = 240) {
  const text = cleanText(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function normalizeSlug(value, fallback = "dispatch") {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function normalizeTaskType(value) {
  const normalized = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  return TASK_TYPES.has(normalized) ? normalized : "quick_chore";
}

function normalizeSensitivity(value) {
  const normalized = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  return SENSITIVITY_LEVELS.has(normalized) ? normalized : "sanitized";
}

function normalizeSize(value) {
  const normalized = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  return SIZE_LEVELS.has(normalized) ? normalized : "medium";
}

function normalizeWorkerId(value) {
  const normalized = cleanText(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "codex" || normalized === "local_codex") return "local_codex";
  if (normalized === "claude" || normalized === "anthropic" || normalized === "claude_max") return "claude_max";
  return WORKER_IDS.includes(normalized) ? normalized : "";
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const lowered = cleanText(value).toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  return fallback;
}

function normalizeTimeoutMs(value, fallback = 240000, min = 15000, max = 1800000) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeList(value, maxItems = 16) {
  if (Array.isArray(value)) {
    return value.map((item) => clipText(item, 260)).filter(Boolean).slice(0, maxItems);
  }
  return cleanText(value)
    .split(/\r?\n|,/)
    .map((item) => clipText(item, 260))
    .filter(Boolean)
    .slice(0, maxItems);
}

function ensureDir(folderPath) {
  fs.mkdirSync(folderPath, { recursive: true });
}

function safeWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function safeWriteText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, String(value || ""), "utf8");
}

function safeReadJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(String(fs.readFileSync(filePath, "utf8") || ""));
  } catch (_error) {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function buildRouterActor() {
  return {
    type: "orchestrator",
    id: "worker-router",
    label: "worker router",
    domain: "local",
    criticality: "medium"
  };
}

function buildWorkerTarget(workerId, criticality = "medium") {
  return {
    type: "worker_lane",
    id: workerId,
    label: workerId.replace(/_/g, " "),
    domain: (workerId === "abacus" || workerId === "claude_max") ? "external" : "local",
    criticality
  };
}

function emitRouterEvent(action, workerId, extra = {}) {
  appendGraphEvent({
    component: "worker-router",
    category: extra.category || "routing",
    action,
    actor: buildRouterActor(),
    target: buildWorkerTarget(workerId, extra.criticality || "medium"),
    context: {
      taskType: extra.taskType || "",
      sensitivity: extra.sensitivity || "",
      size: extra.size || "",
      routeAction: extra.routeAction || "",
      taskId: extra.taskId || "",
      dispatchId: extra.dispatchId || ""
    },
    policy: {
      mode: "loopback_guarded",
      approvalState: extra.approvalState || "not_required",
      autonomous: false
    },
    detail: extra.detail || {},
    status: extra.status || "ok"
  });
}

function emitRouterManifest(action, workerId, status, extra = {}) {
  appendActionManifest({
    component: "worker-router",
    action,
    status,
    actor: buildRouterActor(),
    target: buildWorkerTarget(workerId, extra.criticality || "medium"),
    reason: extra.reason || "",
    context: {
      taskType: extra.taskType || "",
      sensitivity: extra.sensitivity || "",
      size: extra.size || "",
      taskId: extra.taskId || "",
      dispatchId: extra.dispatchId || "",
      routeAction: extra.routeAction || ""
    },
    policy: {
      mode: "loopback_guarded",
      approvalState: extra.approvalState || "not_required",
      autonomous: false
    },
    evidence: extra.evidence || {}
  });
}

function buildLocalCodexProfile() {
  const toolPaths = resolveToolPaths();
  const available = Boolean(toolPaths.codexPath);
  return {
    id: "local_codex",
    title: "Local Codex",
    available,
    dispatchable: available,
    directDispatchSupported: available,
    strengths: [
      "Highest-trust local coding and repo execution lane.",
      "Best fit for privileged or owner-plane scoped work.",
      "Can run immediately under Asolaria control."
    ],
    limitations: [
      "Local runtime only; not ideal for cloud-heavy external research bursts.",
      "Direct runs can consume local provider quota or take longer on bigger tasks."
    ],
    mistakes: [
      "Do not default local Codex to broad external chores when a cheaper bounded worker would do.",
      "Do not send owner-plane tasks to lower-trust external workers just because they look faster."
    ]
  };
}

function buildAbacusProfile() {
  const status = getAbacusIntegrationStatus();
  const strategy = getAbacusOperatingStrategy();
  const browserReady = Boolean(status?.capabilities?.browser?.ready);
  const desktopReady = Boolean(status?.surfaces?.desktop?.installed);
  const dispatchable = Boolean(browserReady || desktopReady);
  return {
    id: "abacus",
    title: "Abacus",
    available: dispatchable,
    dispatchable,
    directDispatchSupported: true,
    workerLane: status?.workerLane?.tier || "unknown",
    strengths: [
      "Strong bounded external worker for quick chores, research, and desktop/cloud-assisted packet work.",
      "Best fit for sanitized tasks that benefit from external surfaces or Abacus workflow tooling."
    ],
    limitations: [
      "CLI is not yet a reliable unattended headless worker on this machine.",
      "Cloud-heavy or deep-agent work should be treated as scarce and usage-aware."
    ],
    mistakes: Array.isArray(strategy?.knownIssues) && strategy.knownIssues.length
      ? strategy.knownIssues.slice(0, 6)
      : [
          "Do not treat Abacus output as source-of-truth until it is imported back into Asolaria.",
          "Do not send owner-plane secrets or broad account context into external Abacus lanes."
        ]
  };
}

function buildClaudeMaxProfile() {
  const toolPaths = resolveToolPaths();
  const available = Boolean(toolPaths.claudePath);
  return {
    id: "claude_max",
    title: "Claude Max Review",
    available,
    dispatchable: available,
    directDispatchSupported: available,
    strengths: [
      "Fast strong review lane for bug-finding, regression detection, and bounded advisory work.",
      "Good fit for read-only code analysis while local Codex remains the primary write lane."
    ],
    limitations: [
      "This lane is review-first and should not be treated as the owner-plane mutation path.",
      "It depends on the authenticated Claude Code subscription path being healthy on this machine."
    ],
    mistakes: [
      "Do not send owner-plane secrets or broad uncontrolled context into the Claude lane.",
      "Do not offload final repo ownership decisions to Claude when Asolaria or local Codex should decide."
    ]
  };
}

function buildSymphonyProfile() {
  const status = getSymphonyIntegrationStatus();
  const running = Boolean(status?.process?.running);
  const configured = Boolean(status?.configured);
  return {
    id: "symphony",
    title: "Symphony",
    available: configured,
    dispatchable: configured,
    directDispatchSupported: configured,
    running,
    strengths: [
      "Best long-running issue/workspace lane when work should land in Linear for Symphony to pick up.",
      "Useful as a persistent managed service under Asolaria with explicit issue tracking."
    ],
    limitations: [
      "Requires valid Linear-backed Symphony configuration and a healthy running service for pickup.",
      "Depends on valid Symphony configuration and healthy Linear-backed setup."
    ],
    mistakes: [
      "Do not route urgent single-shot chores into Symphony when a direct local or Abacus lane is available.",
      "Do not assume issue creation means immediate execution; Symphony still decides pickup from the project queue."
    ]
  };
}

function getWorkerProfiles() {
  return [buildLocalCodexProfile(), buildClaudeMaxProfile(), buildAbacusProfile(), buildSymphonyProfile()];
}

function getWorkerProfile(workerId) {
  return getWorkerProfiles().find((item) => item.id === workerId) || null;
}

function getWorkerRouterStatus() {
  const workers = getWorkerProfiles();
  const abacus = getAbacusIntegrationStatus();
  const symphony = getSymphonyIntegrationStatus();
  const augment = getAugmentContextStatus();
  const geminiApi = getGeminiApiConfigSummary();
  const qddProject = getProjectById("qdd", { includeArchived: true });
  const toolPaths = resolveToolPaths();
  return {
    generatedAt: nowIso(),
    defaultWorker: "claude_max",
    workers,
    integrationSummary: {
      localCodexAvailable: Boolean(toolPaths.codexPath),
      claudeMaxReady: Boolean(toolPaths.claudePath),
      abacusReady: Boolean(abacus?.capabilities?.browser?.ready || abacus?.surfaces?.desktop?.installed),
      symphonyConfigured: Boolean(symphony?.configured),
      symphonyRunning: Boolean(symphony?.process?.running),
      augmentContextReady: Boolean(augment?.configured),
      augmentContextMode: String(augment?.mode || ""),
      geminiApiConfigured: Boolean(geminiApi?.configured),
      qddProjectRegistered: Boolean(qddProject && !qddProject.archived)
    },
    coordinationSurfaces: [
      {
        id: "claude_max",
        role: "review_lane",
        ready: Boolean(toolPaths.claudePath),
        writeCapable: false
      },
      {
        id: "augment_context",
        role: "read_only_sidecar",
        ready: Boolean(augment?.configured),
        writeCapable: false
      },
      {
        id: "gemini_api",
        role: "alternate_brain",
        ready: Boolean(geminiApi?.configured),
        writeCapable: false
      },
      {
        id: "symphony",
        role: "long_running_issue_lane",
        ready: Boolean(symphony?.configured),
        writeCapable: false
      }
    ],
    knownIssues: [
      "Claude Max is a review/advisory lane here, not the owner-plane write authority.",
      "Symphony submission is now wired through Linear, but pickup still depends on Symphony's own project queue logic.",
      "Abacus CLI is still limited here, so Abacus dispatch means packet handoff rather than fully headless autonomy.",
      "Augment remains a read-only sidecar and Gemini API is a coordination surface, not a repo-write worker lane.",
      "Direct local Codex execution can consume local quota and should be used deliberately."
    ]
  };
}

function getDefaultPresetForTaskType(taskType) {
  switch (taskType) {
    case "patch":
      return "claude_code_patch";
    case "review":
      return "claude_code_review";
    case "research":
      return "research_brief";
    case "orchestration":
      return "workflow_studio_job";
    case "long_running":
      return "deep_agent_cloud_job";
    default:
      return "chat_quick_chore";
  }
}

function normalizeRouterInput(input = {}) {
  const title = clipText(input.title || "", 220);
  const objective = clipText(input.objective || input.prompt || input.description || "", 6000);
  if (!title && !objective) {
    throw new Error("Worker routing requires a title or objective.");
  }
  const taskType = normalizeTaskType(input.taskType);
  const sensitivity = normalizeSensitivity(input.sensitivity);
  const size = normalizeSize(input.size);
  const allowedPaths = normalizeList(input.allowedPaths || input.paths, 24);
  const preferredWorker = normalizeWorkerId(input.preferredWorker || input.workerId);
  return {
    title: title || clipText(objective, 140),
    objective,
    taskType,
    sensitivity,
    size,
    allowedPaths,
    preferredWorker,
    requiresRepoWrite: normalizeBool(input.requiresRepoWrite, taskType === "patch"),
    needsCloudWorker: normalizeBool(input.needsCloudWorker, taskType === "research" || taskType === "long_running"),
    needsLongRunning: normalizeBool(input.needsLongRunning, taskType === "long_running" || taskType === "issue_execution"),
    needsInteractiveCanvas: normalizeBool(input.needsInteractiveCanvas, taskType === "orchestration"),
    executeNow: normalizeBool(input.executeNow, false),
    timeoutMs: normalizeTimeoutMs(input.timeoutMs, 240000),
    launchDesktop: normalizeBool(input.launchDesktop, false),
    ensureService: normalizeBool(input.ensureService, true),
    projectScope: normalizeSlug(input.projectScope || "worker-router", "worker-router"),
    instructions: clipText(input.instructions || "", 6000),
    expectedArtifacts: normalizeList(input.expectedArtifacts || input.artifacts, 16),
    presetId: cleanText(input.presetId || ""),
    taskId: cleanText(input.taskId || "")
  };
}

function recommendWorker(input = {}) {
  const normalized = normalizeRouterInput(input);
  const profiles = getWorkerProfiles();
  const byId = new Map(profiles.map((item) => [item.id, item]));
  const reasons = [];
  const warnings = [];
  let recommendedWorkerId = "local_codex";
  let fallbackWorkerId = "abacus";

  if (normalized.preferredWorker && byId.get(normalized.preferredWorker)?.dispatchable) {
    recommendedWorkerId = normalized.preferredWorker;
    reasons.push(`Preferred worker "${normalized.preferredWorker}" is available.`);
  } else if (normalized.sensitivity === "privileged" || normalized.sensitivity === "owner_plane") {
    recommendedWorkerId = "local_codex";
    fallbackWorkerId = byId.get("abacus")?.dispatchable ? "abacus" : "symphony";
    reasons.push("Privileged or owner-plane work should stay on the highest-trust local lane.");
  } else if (normalized.taskType === "review" && byId.get("claude_max")?.dispatchable) {
    recommendedWorkerId = "claude_max";
    fallbackWorkerId = "local_codex";
    reasons.push("Review work benefits from a fast dedicated Claude Max analysis lane while local Codex stays primary for edits.");
  } else if (normalized.needsLongRunning && byId.get("symphony")?.dispatchable) {
    recommendedWorkerId = "symphony";
    fallbackWorkerId = byId.get("local_codex")?.dispatchable ? "local_codex" : "abacus";
    reasons.push("Long-running or issue-like work fits Symphony best when it is configured.");
    warnings.push("Symphony depends on the local Codex app-server lane; if that lane is unhealthy, submitted issues can stall in retry.");
  } else if ((normalized.taskType === "research" || normalized.taskType === "quick_chore" || normalized.needsCloudWorker || normalized.needsInteractiveCanvas) && byId.get("abacus")?.dispatchable) {
    recommendedWorkerId = "abacus";
    fallbackWorkerId = "local_codex";
    reasons.push("This task shape benefits from a bounded external worker surface.");
  } else {
    recommendedWorkerId = "local_codex";
    fallbackWorkerId = byId.get("abacus")?.dispatchable ? "abacus" : "symphony";
    reasons.push("Local Codex is the safest general-purpose default lane.");
  }

  if (normalized.requiresRepoWrite) {
    if (recommendedWorkerId === "abacus") {
      reasons.push("Repo write requested: Abacus will be packet-routed to a coding surface, not granted broad authority.");
    } else {
      reasons.push("Repo mutation favors the local controlled coding lane.");
    }
  }

  if (normalized.size === "large" && recommendedWorkerId === "local_codex" && byId.get("abacus")?.dispatchable) {
    warnings.push("Large tasks on local Codex can take longer; consider Abacus for bounded sanitized subtasks.");
  }

  const recommendedWorker = byId.get(recommendedWorkerId) || buildLocalCodexProfile();
  const fallbackWorker = byId.get(fallbackWorkerId) || null;
  const presetId = normalized.presetId || (recommendedWorkerId === "abacus" ? getDefaultPresetForTaskType(normalized.taskType) : "");
  return {
    generatedAt: nowIso(),
    input: normalized,
    recommendedWorkerId,
    fallbackWorkerId: fallbackWorker?.id || "",
    recommendedWorker,
    fallbackWorker,
    reasons,
    warnings,
    mistakes: recommendedWorker?.mistakes || [],
    limitations: recommendedWorker?.limitations || [],
    directDispatchSupported: Boolean(recommendedWorker?.directDispatchSupported),
    presetId
  };
}

function buildDispatchId(title) {
  return `${nowIso().replace(/[-:TZ.]/g, "").slice(0, 14)}-${normalizeSlug(title, "worker-dispatch")}`;
}

function ensureDispatchFolder(dispatchId) {
  const folderPath = path.join(ROUTER_DISPATCH_ROOT, dispatchId);
  ensureDir(folderPath);
  return folderPath;
}

function buildLocalCodexPrompt(input, recommendation) {
  const sections = [
    `Objective: ${input.objective || input.title}`,
    input.instructions ? `Instructions:\n${input.instructions}` : "",
    input.allowedPaths.length ? `Allowed paths:\n- ${input.allowedPaths.join("\n- ")}` : "",
    `Task type: ${input.taskType}`,
    `Sensitivity: ${input.sensitivity}`,
    `Size: ${input.size}`,
    input.expectedArtifacts.length ? `Expected artifacts:\n- ${input.expectedArtifacts.join("\n- ")}` : "",
    "Mistakes to avoid:",
    "- Do not widen scope beyond the requested objective.",
    "- Do not assume external workers are needed if the task is local and bounded.",
    "- Call out uncertainty or blockers instead of guessing."
  ].filter(Boolean);
  if (recommendation?.warnings?.length) {
    sections.push(`Router warnings:\n- ${recommendation.warnings.join("\n- ")}`);
  }
  return sections.join("\n\n");
}

async function dispatchToAbacus(input, recommendation, dispatchId, task) {
  const packet = createAbacusWorkPacket({
    title: input.title,
    objective: input.objective,
    instructions: input.instructions,
    allowedPaths: input.allowedPaths,
    expectedArtifacts: input.expectedArtifacts,
    workerMode: recommendation.presetId ? undefined : "desktop_packet",
    presetId: recommendation.presetId,
    taskId: task.id
  });
  addTaskLedgerEvent(task.id, {
    type: "worker_routed",
    actor: "worker-router",
    source: "worker-router",
    note: `Routed to Abacus packet ${packet.packet.id}.`,
    detail: {
      workerId: "abacus",
      packetId: packet.packet.id,
      presetId: packet.packet.presetId || recommendation.presetId || ""
    }
  });
  updateTaskLedgerTask(task.id, {
    status: "ready",
    owner: "abacus"
  }, {
    actor: "worker-router",
    source: "worker-router",
    note: "Abacus packet created and ready for execution."
  });
  return {
    workerId: "abacus",
    dispatchMode: "packet",
    packet,
    resultSummary: `Created Abacus packet ${packet.packet.id}.`
  };
}

async function dispatchToSymphony(input, recommendation, dispatchId, dispatchFolder, task) {
  const submission = await submitSymphonyWorkItem({
    title: input.title,
    objective: input.objective,
    instructions: input.instructions,
    allowedPaths: input.allowedPaths,
    expectedArtifacts: input.expectedArtifacts,
    taskType: input.taskType,
    sensitivity: input.sensitivity,
    size: input.size,
    taskId: task.id,
    dispatchId,
    ensureService: input.ensureService
  });

  const handoffPath = path.join(dispatchFolder, "symphony-handoff.md");
  const handoff = [
    `# Symphony Handoff`,
    ``,
    `Dispatch ID: ${dispatchId}`,
    `Task ID: ${task.id}`,
    `Title: ${input.title}`,
    `Task Type: ${input.taskType}`,
    `Sensitivity: ${input.sensitivity}`,
    `Size: ${input.size}`,
    `Linear Issue: ${submission?.issue?.identifier || ""}`,
    submission?.issue?.url ? `Linear URL: ${submission.issue.url}` : "",
    ``,
    `## Objective`,
    input.objective || input.title,
    ``,
    input.instructions ? `## Instructions\n${input.instructions}\n` : "",
    input.allowedPaths.length ? `## Allowed Paths\n- ${input.allowedPaths.join("\n- ")}\n` : "",
    `## Submission`,
    `Asolaria submitted this task into Linear for Symphony pickup. Use the issue URL above to inspect progress.`
  ].filter(Boolean).join("\n");
  safeWriteText(handoffPath, handoff);

  addTaskLedgerEvent(task.id, {
    type: "worker_routed",
    actor: "worker-router",
    source: "worker-router",
    note: `Submitted Symphony issue ${submission?.issue?.identifier || ""} (${submission?.serviceAction || "none"}).`,
    detail: {
      workerId: "symphony",
      serviceAction: submission?.serviceAction || "none",
      handoffPath,
      issueId: submission?.issue?.id || "",
      issueIdentifier: submission?.issue?.identifier || "",
      issueUrl: submission?.issue?.url || ""
    }
  });
  updateTaskLedgerTask(task.id, {
    status: "ready",
    owner: "symphony"
  }, {
    actor: "worker-router",
    source: "worker-router",
    note: `Symphony issue submitted${submission?.issue?.identifier ? ` (${submission.issue.identifier})` : ""}.`
  });
  return {
    workerId: "symphony",
    dispatchMode: "linear_issue",
    handoffPath,
    serviceAction: submission?.serviceAction || "none",
    issue: submission?.issue || null,
    project: submission?.project || null,
    team: submission?.team || null,
    process: submission?.process || null,
    resultSummary: `Submitted Symphony issue ${submission?.issue?.identifier || ""}.`.trim()
  };
}

async function dispatchToLocalCodex(input, recommendation, dispatchId, dispatchFolder, task) {
  const prompt = buildLocalCodexPrompt(input, recommendation);
  const promptPath = path.join(dispatchFolder, "prompt.md");
  safeWriteText(promptPath, prompt);

  const baseResult = {
    workerId: "local_codex",
    dispatchMode: input.executeNow ? "direct_run" : "queued_local",
    promptPath,
    resultSummary: input.executeNow ? "Local Codex run requested." : "Prepared local Codex prompt."
  };

  if (!input.executeNow) {
    addTaskLedgerEvent(task.id, {
      type: "worker_routed",
      actor: "worker-router",
      source: "worker-router",
      note: "Prepared local Codex prompt for manual or deferred execution.",
      detail: {
        workerId: "local_codex",
        promptPath
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "ready",
      owner: "local_codex"
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: "Local Codex prompt prepared."
    });
    return baseResult;
  }

  updateTaskLedgerTask(task.id, {
    status: "in_progress",
    owner: "local_codex",
    progress: 20
  }, {
    actor: "worker-router",
    source: "worker-router",
    note: "Local Codex execution started."
  });

  try {
    const run = await runCodex({
      prompt,
      sandbox: "workspace-write",
      askForApproval: "never",
      approvalMode: "smart",
      approvalPreference: "balanced",
      timeoutMs: 180000
    });
    const responsePath = path.join(dispatchFolder, "response.md");
    safeWriteText(responsePath, String(run.reply || "").trim());
    safeWriteJson(path.join(dispatchFolder, "run.json"), {
      provider: run.provider || "codex",
      approvals: Array.isArray(run.approvals) ? run.approvals : [],
      dispatchId,
      taskId: task.id,
      completedAt: nowIso()
    });
    addTaskLedgerEvent(task.id, {
      type: "worker_completed",
      actor: "worker-router",
      source: "worker-router",
      note: "Local Codex execution completed.",
      detail: {
        workerId: "local_codex",
        responsePath
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "review",
      progress: 90,
      owner: "local_codex"
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: "Local Codex result ready for review."
    });
    return {
      ...baseResult,
      responsePath,
      reply: String(run.reply || "").trim(),
      resultSummary: "Local Codex execution completed."
    };
  } catch (error) {
    addTaskLedgerEvent(task.id, {
      type: "worker_failed",
      actor: "worker-router",
      source: "worker-router",
      note: `Local Codex execution failed: ${clipText(error?.message || error, 240)}`,
      detail: {
        workerId: "local_codex"
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "blocked",
      owner: "local_codex",
      progress: 0
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: `Local Codex failed: ${clipText(error?.message || error, 220)}`
    });
    throw error;
  }
}

function buildClaudeMaxPrompt(input, recommendation) {
  const sections = [
    "You are the Claude Max review lane inside Asolaria super swarm.",
    `Objective: ${input.objective || input.title}`,
    input.instructions ? `Instructions:\n${input.instructions}` : "",
    input.allowedPaths.length ? `Allowed paths:\n- ${input.allowedPaths.join("\n- ")}` : "",
    `Task type: ${input.taskType}`,
    `Sensitivity: ${input.sensitivity}`,
    `Size: ${input.size}`,
    input.expectedArtifacts.length ? `Expected artifacts:\n- ${input.expectedArtifacts.join("\n- ")}` : "",
    "Default lane policy:",
    "- Stay read-only unless the prompt explicitly says edits are allowed.",
    "- Prioritize concrete bugs, regressions, risks, and missing verification.",
    "- Be concise and high-signal.",
    "- If blocked, name the blocker instead of guessing."
  ].filter(Boolean);
  if (recommendation?.warnings?.length) {
    sections.push(`Router warnings:\n- ${recommendation.warnings.join("\n- ")}`);
  }
  return sections.join("\n\n");
}

async function dispatchToClaudeMax(input, recommendation, dispatchId, dispatchFolder, task) {
  const prompt = buildClaudeMaxPrompt(input, recommendation);
  const promptPath = path.join(dispatchFolder, "prompt.md");
  safeWriteText(promptPath, prompt);

  const baseResult = {
    workerId: "claude_max",
    dispatchMode: input.executeNow ? "direct_review" : "queued_review",
    promptPath,
    resultSummary: input.executeNow ? "Claude Max review requested." : "Prepared Claude Max review prompt."
  };

  if (!input.executeNow) {
    addTaskLedgerEvent(task.id, {
      type: "worker_routed",
      actor: "worker-router",
      source: "worker-router",
      note: "Prepared Claude Max review prompt for manual or deferred execution.",
      detail: {
        workerId: "claude_max",
        promptPath
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "ready",
      owner: "claude_max"
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: "Claude Max review prompt prepared."
    });
    return baseResult;
  }

  updateTaskLedgerTask(task.id, {
    status: "in_progress",
    owner: "claude_max",
    progress: 20
  }, {
    actor: "worker-router",
    source: "worker-router",
    note: "Claude Max review started."
  });

  try {
    const run = await runAnthropicCli(prompt, {
      timeoutMs: input.timeoutMs,
      model: "opus",
      permissionMode: "plan"
    });
    const responseFileName = input.taskType === "review" ? "review.md" : "response.md";
    const responsePath = path.join(dispatchFolder, responseFileName);
    safeWriteText(responsePath, String(run.reply || "").trim());
    safeWriteJson(path.join(dispatchFolder, "run.json"), {
      provider: "anthropic_cli",
      model: "opus",
      dispatchId,
      taskId: task.id,
      completedAt: nowIso()
    });
    addTaskLedgerEvent(task.id, {
      type: "worker_completed",
      actor: "worker-router",
      source: "worker-router",
      note: "Claude Max review completed.",
      detail: {
        workerId: "claude_max",
        responsePath
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "review",
      progress: 90,
      owner: "claude_max"
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: "Claude Max result ready for review."
    });
    return {
      ...baseResult,
      responsePath,
      reply: String(run.reply || "").trim(),
      resultSummary: "Claude Max review completed."
    };
  } catch (error) {
    addTaskLedgerEvent(task.id, {
      type: "worker_failed",
      actor: "worker-router",
      source: "worker-router",
      note: `Claude Max review failed: ${clipText(error?.message || error, 240)}`,
      detail: {
        workerId: "claude_max"
      }
    });
    updateTaskLedgerTask(task.id, {
      status: "blocked",
      owner: "claude_max",
      progress: 0
    }, {
      actor: "worker-router",
      source: "worker-router",
      note: `Claude Max failed: ${clipText(error?.message || error, 220)}`
    });
    throw error;
  }
}

async function dispatchWorkerTask(input = {}) {
  const recommendation = recommendWorker(input);
  const workerId = normalizeWorkerId(input.workerId || recommendation.recommendedWorkerId) || recommendation.recommendedWorkerId;
  const worker = getWorkerProfile(workerId);
  if (!worker?.dispatchable) {
    throw new Error(`Worker ${workerId} is not dispatchable on this machine.`);
  }

  const dispatchId = buildDispatchId(input.title || recommendation.input.title);
  const dispatchFolder = ensureDispatchFolder(dispatchId);
  const createdAt = nowIso();
  const taskRecord = createTaskLedgerTask({
    title: recommendation.input.title,
    description: recommendation.input.objective || recommendation.input.title,
    projectScope: recommendation.input.projectScope || "worker-router",
    status: "planned",
    priority: recommendation.input.sensitivity === "owner_plane" ? "high" : "normal",
    owner: workerId,
    source: "worker-router",
    tags: [workerId, recommendation.input.taskType, recommendation.input.sensitivity]
  });
  const task = taskRecord.task;

  emitRouterManifest("worker_dispatch", workerId, "queued", {
    reason: `Worker dispatch requested for ${recommendation.input.taskType}.`,
    taskType: recommendation.input.taskType,
    sensitivity: recommendation.input.sensitivity,
    size: recommendation.input.size,
    taskId: task.id,
    dispatchId,
    routeAction: "dispatch"
  });
  emitRouterEvent("worker_dispatch_requested", workerId, {
    taskType: recommendation.input.taskType,
    sensitivity: recommendation.input.sensitivity,
    size: recommendation.input.size,
    taskId: task.id,
    dispatchId,
    routeAction: "dispatch",
    detail: {
      recommendation: recommendation.recommendedWorkerId,
      executeNow: recommendation.input.executeNow
    }
  });

  safeWriteJson(path.join(dispatchFolder, "dispatch.json"), {
    id: dispatchId,
    createdAt,
    workerId,
    taskId: task.id,
    title: recommendation.input.title,
    recommendation
  });

  try {
    let result;
    if (workerId === "abacus") {
      result = await dispatchToAbacus(recommendation.input, recommendation, dispatchId, task);
    } else if (workerId === "claude_max") {
      result = await dispatchToClaudeMax(recommendation.input, recommendation, dispatchId, dispatchFolder, task);
    } else if (workerId === "symphony") {
      result = await dispatchToSymphony(recommendation.input, recommendation, dispatchId, dispatchFolder, task);
    } else {
      result = await dispatchToLocalCodex(recommendation.input, recommendation, dispatchId, dispatchFolder, task);
    }

    const payload = {
      id: dispatchId,
      createdAt,
      completedAt: nowIso(),
      workerId,
      taskId: task.id,
      title: recommendation.input.title,
      recommendation,
      result
    };
    safeWriteJson(path.join(dispatchFolder, "dispatch.json"), payload);
    emitRouterEvent("worker_dispatch_completed", workerId, {
      status: "ok",
      taskType: recommendation.input.taskType,
      sensitivity: recommendation.input.sensitivity,
      size: recommendation.input.size,
      taskId: task.id,
      dispatchId,
      routeAction: "dispatch",
      detail: {
        dispatchMode: result.dispatchMode || "",
        summary: result.resultSummary || ""
      }
    });
    emitRouterManifest("worker_dispatch", workerId, "completed", {
      reason: result.resultSummary || "Worker dispatch completed.",
      taskType: recommendation.input.taskType,
      sensitivity: recommendation.input.sensitivity,
      size: recommendation.input.size,
      taskId: task.id,
      dispatchId,
      routeAction: "dispatch",
      evidence: {
        dispatchMode: result.dispatchMode || "",
        dispatchFolder
      }
    });
    return payload;
  } catch (error) {
    const message = clipText(error?.message || error, 260);
    const payload = {
      id: dispatchId,
      createdAt,
      failedAt: nowIso(),
      workerId,
      taskId: task.id,
      title: recommendation.input.title,
      recommendation,
      error: message
    };
    safeWriteJson(path.join(dispatchFolder, "dispatch.json"), payload);
    emitRouterEvent("worker_dispatch_failed", workerId, {
      status: "failed",
      taskType: recommendation.input.taskType,
      sensitivity: recommendation.input.sensitivity,
      size: recommendation.input.size,
      taskId: task.id,
      dispatchId,
      routeAction: "dispatch",
      detail: {
        error: message
      }
    });
    emitRouterManifest("worker_dispatch", workerId, "failed", {
      reason: message,
      taskType: recommendation.input.taskType,
      sensitivity: recommendation.input.sensitivity,
      size: recommendation.input.size,
      taskId: task.id,
      dispatchId,
      routeAction: "dispatch",
      evidence: {
        dispatchFolder
      }
    });
    throw error;
  }
}

function listWorkerDispatches(limit = 20) {
  ensureDir(ROUTER_DISPATCH_ROOT);
  return fs.readdirSync(ROUTER_DISPATCH_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => safeReadJson(path.join(ROUTER_DISPATCH_ROOT, entry.name, "dispatch.json"), null))
    .filter(Boolean)
    .sort((a, b) => String(b.completedAt || b.failedAt || b.createdAt || "").localeCompare(String(a.completedAt || a.failedAt || a.createdAt || "")))
    .slice(0, Math.max(1, Math.min(100, Number(limit || 20) || 20)));
}

function getWorkerDispatch(dispatchId) {
  const id = cleanText(dispatchId);
  if (!id) return null;
  return safeReadJson(path.join(ROUTER_DISPATCH_ROOT, id, "dispatch.json"), null);
}

module.exports = {
  getWorkerRouterStatus,
  recommendWorker,
  dispatchWorkerTask,
  listWorkerDispatches,
  getWorkerDispatch
};
