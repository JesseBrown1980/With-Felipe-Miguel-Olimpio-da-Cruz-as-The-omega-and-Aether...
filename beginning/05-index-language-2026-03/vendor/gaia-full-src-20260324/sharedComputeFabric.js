const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const { resolveDataPath } = require("./runtimePaths");
const remoteNodeRegistry = require("./remoteNodeRegistry");
const {
  initializePhoneWorkers,
  getAllPhoneWorkers,
  getPhoneWorker,
  dispatchPhoneToConstruction
} = require("./phoneConstructionBridge");
const { runPhoneEdgeCompute } = require("./connectors/phoneTermuxConnector");

const SHARED_COMPUTE_ROOT = resolveDataPath("shared-compute");
const SHARED_COMPUTE_JOBS_ROOT = path.join(SHARED_COMPUTE_ROOT, "jobs");
const MAX_LIST_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 240000;
const DEFAULT_MAX_OUTPUT_CHARS = 16000;
const ALLOWED_TARGET_TYPES = new Set(["phone", "node"]);
const ALLOWED_STATES = new Set(["queued", "dispatched", "running", "completed", "failed"]);
const ALLOWED_EXECUTORS = Object.freeze([
  "node",
  "python",
  "python3",
  "npm",
  "npx",
  "pnpm",
  "pytest",
  "jest",
  "tsc",
  "rg",
  "git"
]);
const WINDOWS_CMD_EXECUTORS = new Set(["npm", "npx", "pnpm"]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value, maxLen = 400) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLen);
}

function clipText(value, maxChars = DEFAULT_MAX_OUTPUT_CHARS) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function clampInt(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeArray(value, maxItems = 24, itemMaxLen = 320) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, itemMaxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function ensureDir(folderPath) {
  fs.mkdirSync(folderPath, { recursive: true });
}

function safeReadJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(String(fs.readFileSync(filePath, "utf8") || ""));
  } catch (_error) {
    return fallback;
  }
}

function safeWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeFederatedNodeId(value) {
  return normalizeText(value, 80).toLowerCase().replace(/[^a-z0-9._-]/g, "_");
}

function normalizeTopicPath(value) {
  return normalizeText(value, 240)
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function getFederatedNodeIdFromBaseTopic(baseTopic = "") {
  const normalized = normalizeTopicPath(baseTopic);
  const match = /^asolaria\/nodes\/([^/]+)$/.exec(normalized);
  return match ? normalizeFederatedNodeId(match[1]) : "";
}

function normalizeWorkingDirectory(value) {
  const workingDirectory = normalizeText(value, 420);
  if (!workingDirectory) return "";
  const absolute = path.isAbsolute(workingDirectory)
    || /^[a-zA-Z]:[\\/]/.test(workingDirectory)
    || workingDirectory.startsWith("/");
  if (!absolute) {
    throw new Error("shared_compute_workdir_must_be_absolute");
  }
  return workingDirectory;
}

function normalizeExecutor(value) {
  const executor = normalizeText(value, 40).toLowerCase();
  if (!ALLOWED_EXECUTORS.includes(executor)) {
    throw new Error(`shared_compute_executor_not_allowed:${executor || "unknown"}`);
  }
  return executor;
}

function validateExecutorArgs(executor, args = []) {
  const lowered = args.map((item) => String(item || "").trim().toLowerCase());
  if (executor === "node" && lowered.some((item) => item === "-e" || item === "--eval" || item === "-p" || item === "--print")) {
    throw new Error("shared_compute_node_inline_eval_blocked");
  }
  if ((executor === "python" || executor === "python3") && lowered.includes("-c")) {
    throw new Error("shared_compute_python_inline_eval_blocked");
  }
}

function normalizeJobInput(input = {}) {
  const targetType = normalizeText(input.targetType || input.kind || "", 32).toLowerCase();
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    throw new Error("shared_compute_target_type_invalid");
  }
  const targetId = targetType === "node"
    ? normalizeFederatedNodeId(input.targetId || input.nodeId || "")
    : normalizeText(input.targetId || input.phoneId || "phone:falcon", 80);
  if (!targetId) {
    throw new Error("shared_compute_target_id_required");
  }
  const executor = normalizeExecutor(input.executor);
  const args = normalizeArray(input.args, 32, 320);
  validateExecutorArgs(executor, args);
  return {
    title: normalizeText(input.title || "", 200) || clipText([executor, ...args].join(" "), 200),
    targetType,
    targetId,
    executor,
    args,
    workingDirectory: normalizeWorkingDirectory(input.workingDirectory || input.cwd || ""),
    timeoutMs: clampInt(input.timeoutMs, DEFAULT_TIMEOUT_MS, 3000, 15 * 60 * 1000),
    maxOutputChars: clampInt(input.maxOutputChars, DEFAULT_MAX_OUTPUT_CHARS, 256, 100000),
    constructionId: normalizeText(input.constructionId || "", 120),
    returnToIdle: input.returnToIdle === undefined ? true : Boolean(input.returnToIdle),
    requestedBy: normalizeText(input.requestedBy || "sovereign", 120),
    metadata: input.metadata && typeof input.metadata === "object" ? JSON.parse(JSON.stringify(input.metadata)) : {}
  };
}

function makeJobId() {
  return `sc-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function buildCommandPreview(spec = {}) {
  const cwdPrefix = spec.workingDirectory ? `cd ${spec.workingDirectory} && ` : "";
  return clipText(`${cwdPrefix}${[spec.executor, ...(Array.isArray(spec.args) ? spec.args : [])].join(" ")}`, 320);
}

function buildJobPath(jobId) {
  return path.join(SHARED_COMPUTE_JOBS_ROOT, `${normalizeText(jobId, 120)}.json`);
}

function buildJobRecord(spec = {}) {
  return {
    id: makeJobId(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    state: "queued",
    title: spec.title,
    target: {
      type: spec.targetType,
      id: spec.targetId
    },
    requestedBy: spec.requestedBy,
    spec: {
      executor: spec.executor,
      args: spec.args,
      workingDirectory: spec.workingDirectory,
      timeoutMs: spec.timeoutMs,
      maxOutputChars: spec.maxOutputChars,
      commandPreview: buildCommandPreview(spec)
    },
    dispatch: null,
    result: null,
    metadata: spec.metadata || {}
  };
}

function saveJob(job) {
  if (!job || !job.id) {
    throw new Error("shared_compute_job_invalid");
  }
  if (!ALLOWED_STATES.has(String(job.state || ""))) {
    throw new Error(`shared_compute_state_invalid:${job.state || ""}`);
  }
  job.updatedAt = nowIso();
  safeWriteJson(buildJobPath(job.id), job);
  return job;
}

function getSharedComputeJob(jobId) {
  const id = normalizeText(jobId, 120);
  if (!id) return null;
  return safeReadJson(buildJobPath(id), null);
}

function listSharedComputeJobs(limit = 20) {
  ensureDir(SHARED_COMPUTE_JOBS_ROOT);
  return fs.readdirSync(SHARED_COMPUTE_JOBS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => safeReadJson(path.join(SHARED_COMPUTE_JOBS_ROOT, entry.name), null))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
    .slice(0, clampInt(limit, 20, 1, MAX_LIST_LIMIT));
}

function shellQuote(value) {
  return `'${String(value || "").replace(/'/g, `'\"'\"'`)}'`;
}

function buildPhoneCommand(spec = {}) {
  const command = [spec.executor, ...(Array.isArray(spec.args) ? spec.args : [])]
    .map((part) => shellQuote(part))
    .join(" ");
  if (!spec.workingDirectory) {
    return command;
  }
  return `cd ${shellQuote(spec.workingDirectory)} && ${command}`;
}

function resolveSpawnExecutable(executor) {
  if (process.platform === "win32" && WINDOWS_CMD_EXECUTORS.has(executor)) {
    return `${executor}.cmd`;
  }
  return executor;
}

async function runLocalProcess(spec = {}) {
  const startedAt = nowIso();
  const startedAtMs = Date.now();
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(resolveSpawnExecutable(spec.executor), Array.isArray(spec.args) ? spec.args : [], {
      cwd: spec.workingDirectory || undefined,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        child.kill("SIGTERM");
      } catch (_error) {
        // ignore
      }
      reject(new Error(`shared_compute_timeout_${spec.timeoutMs || DEFAULT_TIMEOUT_MS}ms`));
    }, spec.timeoutMs || DEFAULT_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const finishedAtMs = Date.now();
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      resolve({
        ok: Number(code || 0) === 0,
        startedAt,
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs: finishedAtMs - startedAtMs,
        exitCode: Number(code || 0),
        executor: spec.executor,
        args: Array.isArray(spec.args) ? [...spec.args] : [],
        workingDirectory: spec.workingDirectory || "",
        commandPreview: buildCommandPreview(spec),
        stdout: clipText(stdout, spec.maxOutputChars || DEFAULT_MAX_OUTPUT_CHARS),
        stderr: clipText(stderr, spec.maxOutputChars || DEFAULT_MAX_OUTPUT_CHARS)
      });
    });
  });
}

async function runPhoneJob(job, spec, options = {}) {
  initializePhoneWorkers();
  const worker = getPhoneWorker(spec.targetId);
  if (!worker) {
    throw new Error(`shared_compute_phone_not_found:${spec.targetId}`);
  }
  if (!Array.isArray(worker.capabilities) || !worker.capabilities.includes("edge_compute")) {
    throw new Error(`shared_compute_phone_not_capable:${spec.targetId}`);
  }
  if (spec.constructionId) {
    if (!worker.currentConstructionId) {
      const dispatch = dispatchPhoneToConstruction(spec.targetId, spec.constructionId, buildCommandPreview(spec));
      if (!dispatch?.ok) {
        throw new Error(dispatch?.error || "shared_compute_phone_dispatch_failed");
      }
    } else if (worker.currentConstructionId !== spec.constructionId) {
      throw new Error(`shared_compute_phone_busy:${worker.currentConstructionId}`);
    }
  }

  job.state = "running";
  job.dispatch = {
    transport: "phone_termux",
    workerId: spec.targetId,
    deviceId: normalizeText(options.deviceId || worker.deviceId || "", 120),
    startedAt: nowIso(),
    commandPreview: buildCommandPreview(spec)
  };
  saveJob(job);

  worker.status = "working";
  const phoneRunner = typeof options.phoneRunner === "function" ? options.phoneRunner : runPhoneEdgeCompute;
  const compute = await phoneRunner({
    deviceId: options.deviceId || worker.deviceId || "",
    command: buildPhoneCommand(spec),
    timeoutMs: spec.timeoutMs,
    maxOutputChars: spec.maxOutputChars
  });
  const resultEntry = worker.reportResults({
    summary: `phone edge compute exit=${compute.exitCode} device=${compute.deviceId}`,
    success: compute.ok,
    data: {
      exitCode: compute.exitCode,
      durationMs: compute.durationMs,
      deviceId: compute.deviceId,
      commandPreview: compute.commandPreview,
      stdout: compute.stdout,
      stderr: compute.stderr
    }
  });
  if (spec.returnToIdle) {
    worker.returnToIdle();
  }

  job.state = compute.ok ? "completed" : "failed";
  job.result = {
    ok: compute.ok,
    transport: "phone_termux",
    finishedAt: compute.finishedAt,
    durationMs: compute.durationMs,
    deviceId: compute.deviceId,
    exitCode: compute.exitCode,
    commandPreview: compute.commandPreview,
    stdout: compute.stdout,
    stderr: compute.stderr,
    workerResult: resultEntry
  };
  saveJob(job);
  return job;
}

async function dispatchFederatedNodeJob(job, spec, options = {}) {
  if (typeof options.publishMqttMessage !== "function") {
    throw new Error("shared_compute_publish_required");
  }
  const node = remoteNodeRegistry.getRemoteNode(spec.targetId);
  if (!node) {
    throw new Error(`shared_compute_node_not_found:${spec.targetId}`);
  }
  if (String(node.status || "").toLowerCase() !== "online") {
    throw new Error(`shared_compute_node_offline:${spec.targetId}`);
  }
  if (!node.compute || node.compute.computeWorkerReady !== true) {
    throw new Error(`shared_compute_node_not_ready:${spec.targetId}`);
  }
  const topic = `asolaria/nodes/${spec.targetId}/compute/request`;
  const payload = {
    action: "compute.execute",
    jobId: job.id,
    title: job.title,
    requestedAt: nowIso(),
    requestedBy: spec.requestedBy,
    originHost: os.hostname(),
    spec: {
      executor: spec.executor,
      args: spec.args,
      workingDirectory: spec.workingDirectory,
      timeoutMs: spec.timeoutMs,
      maxOutputChars: spec.maxOutputChars
    },
    metadata: spec.metadata || {}
  };
  await options.publishMqttMessage({
    topic,
    payload,
    retain: false,
    qos: 1
  });
  job.state = "dispatched";
  job.dispatch = {
    transport: "mqtt_federation",
    nodeId: spec.targetId,
    topic,
    publishedAt: nowIso(),
    commandPreview: buildCommandPreview(spec)
  };
  saveJob(job);
  return job;
}

function updateNodeComputeSnapshot(nodeId, payload, metadata = {}) {
  if (typeof remoteNodeRegistry.updateNodeCompute !== "function") {
    return null;
  }
  return remoteNodeRegistry.updateNodeCompute(nodeId, payload, metadata);
}

function getLocalComputeCapabilities(baseTopic = "") {
  const nodeId = getFederatedNodeIdFromBaseTopic(baseTopic);
  return {
    nodeId,
    computeWorkerReady: Boolean(nodeId),
    executors: [...ALLOWED_EXECUTORS],
    platform: process.platform,
    hostname: os.hostname(),
    maxTimeoutMs: 15 * 60 * 1000
  };
}

function buildComputeCapabilitiesPacket(baseTopic = "") {
  const capabilities = getLocalComputeCapabilities(baseTopic);
  if (!capabilities.computeWorkerReady || !capabilities.nodeId) {
    return null;
  }
  return {
    topic: `${normalizeTopicPath(baseTopic)}/compute/capabilities`,
    payload: {
      at: nowIso(),
      ...capabilities
    }
  };
}

async function dispatchSharedComputeJob(input = {}, options = {}) {
  const spec = normalizeJobInput(input);
  const job = buildJobRecord(spec);
  saveJob(job);
  if (spec.targetType === "phone") {
    return runPhoneJob(job, spec, options);
  }
  return dispatchFederatedNodeJob(job, spec, options);
}

function buildFederatedExecutionRecord(payload, spec) {
  const requestedAt = normalizeText(payload?.requestedAt || nowIso(), 80);
  return {
    id: normalizeText(payload?.jobId || "", 120) || makeJobId(),
    createdAt: requestedAt,
    updatedAt: requestedAt,
    state: "running",
    title: normalizeText(payload?.title || "", 200) || buildCommandPreview(spec),
    target: {
      type: "node",
      id: getFederatedNodeIdFromBaseTopic(spec.baseTopic || "")
    },
    requestedBy: normalizeText(payload?.requestedBy || "federation", 120),
    spec: {
      executor: spec.executor,
      args: spec.args,
      workingDirectory: spec.workingDirectory,
      timeoutMs: spec.timeoutMs,
      maxOutputChars: spec.maxOutputChars,
      commandPreview: buildCommandPreview(spec)
    },
    dispatch: {
      transport: "mqtt_federation",
      inboundTopic: normalizeText(payload?.topic || "", 320),
      startedAt: nowIso()
    },
    result: null,
    metadata: payload?.metadata && typeof payload.metadata === "object"
      ? JSON.parse(JSON.stringify(payload.metadata))
      : {}
  };
}

async function executeFederatedComputeRequest(payload = {}, options = {}) {
  const rawSpec = payload && typeof payload.spec === "object" ? payload.spec : {};
  const spec = normalizeJobInput({
    targetType: "node",
    targetId: getFederatedNodeIdFromBaseTopic(options.baseTopic || ""),
    title: payload?.title || "",
    executor: rawSpec.executor,
    args: rawSpec.args,
    workingDirectory: rawSpec.workingDirectory,
    timeoutMs: rawSpec.timeoutMs,
    maxOutputChars: rawSpec.maxOutputChars,
    requestedBy: payload?.requestedBy || "federation",
    metadata: payload?.metadata || {}
  });
  spec.baseTopic = normalizeTopicPath(options.baseTopic || "");
  const job = buildFederatedExecutionRecord(payload, spec);
  saveJob(job);
  const localRunner = typeof options.runLocalProcess === "function" ? options.runLocalProcess : runLocalProcess;
  try {
    const result = await localRunner(spec);
    job.state = result.ok ? "completed" : "failed";
    job.result = {
      ...result,
      transport: "mqtt_federation"
    };
    saveJob(job);
    return {
      job,
      topic: `${spec.baseTopic}/compute/result`,
      payload: {
        jobId: job.id,
        ok: result.ok,
        title: job.title,
        at: nowIso(),
        executor: spec.executor,
        args: spec.args,
        workingDirectory: spec.workingDirectory,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        commandPreview: result.commandPreview,
        worker: getLocalComputeCapabilities(spec.baseTopic)
      }
    };
  } catch (error) {
    job.state = "failed";
    job.result = {
      ok: false,
      at: nowIso(),
      error: normalizeText(error?.message || error || "shared_compute_execution_failed", 240),
      transport: "mqtt_federation"
    };
    saveJob(job);
    return {
      job,
      topic: `${spec.baseTopic}/compute/result`,
      payload: {
        jobId: job.id,
        ok: false,
        title: job.title,
        at: nowIso(),
        executor: spec.executor,
        args: spec.args,
        workingDirectory: spec.workingDirectory,
        error: normalizeText(error?.message || error || "shared_compute_execution_failed", 240),
        worker: getLocalComputeCapabilities(spec.baseTopic)
      }
    };
  }
}

function recordFederatedComputeCapabilities(nodeId, payload = {}, metadata = {}) {
  const normalizedNodeId = normalizeFederatedNodeId(nodeId);
  if (!normalizedNodeId) return null;
  const snapshot = {
    capabilities: Array.isArray(payload.executors) ? payload.executors.map((item) => normalizeText(item, 40)).filter(Boolean) : [],
    hostname: normalizeText(payload.hostname || "", 120),
    platform: normalizeText(payload.platform || "", 40),
    computeWorkerReady: Boolean(payload.computeWorkerReady || payload.ready),
    maxTimeoutMs: clampInt(payload.maxTimeoutMs, 0, 0, 24 * 60 * 60 * 1000),
    updatedAt: normalizeText(payload.at || metadata.received_at || nowIso(), 80)
  };
  return updateNodeComputeSnapshot(normalizedNodeId, snapshot, metadata);
}

function recordFederatedComputeResult(nodeId, payload = {}, metadata = {}) {
  const normalizedNodeId = normalizeFederatedNodeId(nodeId);
  if (!normalizedNodeId) return null;
  const jobId = normalizeText(payload.jobId || "", 120);
  if (!jobId) return null;
  const job = getSharedComputeJob(jobId);
  if (job) {
    job.state = payload.ok === false ? "failed" : "completed";
    job.result = {
      ok: payload.ok !== false,
      transport: "mqtt_federation",
      nodeId: normalizedNodeId,
      receivedAt: normalizeText(metadata.received_at || nowIso(), 80),
      executor: normalizeText(payload.executor || "", 40),
      args: normalizeArray(payload.args, 32, 320),
      workingDirectory: normalizeText(payload.workingDirectory || "", 420),
      startedAt: normalizeText(payload.startedAt || "", 80),
      finishedAt: normalizeText(payload.finishedAt || payload.at || "", 80),
      durationMs: clampInt(payload.durationMs, 0, 0, 24 * 60 * 60 * 1000),
      exitCode: Number.isFinite(Number(payload.exitCode)) ? Number(payload.exitCode) : null,
      stdout: clipText(payload.stdout || "", DEFAULT_MAX_OUTPUT_CHARS),
      stderr: clipText(payload.stderr || "", DEFAULT_MAX_OUTPUT_CHARS),
      error: normalizeText(payload.error || "", 240),
      commandPreview: normalizeText(payload.commandPreview || "", 320)
    };
    saveJob(job);
  }
  const computeSnapshot = {
    lastJobId: jobId,
    lastResultOk: payload.ok !== false,
    lastExitCode: Number.isFinite(Number(payload.exitCode)) ? Number(payload.exitCode) : null,
    lastFinishedAt: normalizeText(payload.finishedAt || payload.at || metadata.received_at || nowIso(), 80),
    lastCommandPreview: normalizeText(payload.commandPreview || "", 320)
  };
  if (payload.worker && typeof payload.worker === "object") {
    computeSnapshot.capabilities = Array.isArray(payload.worker.executors)
      ? payload.worker.executors.map((item) => normalizeText(item, 40)).filter(Boolean)
      : [];
    computeSnapshot.hostname = normalizeText(payload.worker.hostname || "", 120);
    computeSnapshot.platform = normalizeText(payload.worker.platform || "", 40);
    computeSnapshot.computeWorkerReady = Boolean(payload.worker.computeWorkerReady);
  }
  updateNodeComputeSnapshot(normalizedNodeId, computeSnapshot, metadata);
  return job;
}

function getSharedComputeWorkers(options = {}) {
  initializePhoneWorkers();
  const phoneWorkers = getAllPhoneWorkers().map((worker) => ({
    id: worker.id,
    kind: "phone",
    label: worker.label,
    owner: worker.owner,
    ready: Array.isArray(worker.capabilities) && worker.capabilities.includes("edge_compute"),
    status: worker.status,
    deviceId: worker.deviceId,
    executors: [...ALLOWED_EXECUTORS],
    capabilities: Array.isArray(worker.capabilities) ? [...worker.capabilities] : [],
    currentConstructionId: worker.currentConstructionId || "",
    latestEdgeComputeAt: worker.edgeComputeResults?.length ? worker.edgeComputeResults[worker.edgeComputeResults.length - 1]?.at || "" : ""
  }));
  const remoteNodes = remoteNodeRegistry.getRemoteNodesSummary().nodes.map((node) => ({
    id: `node:${node.nodeId}`,
    kind: "federation_node",
    nodeId: node.nodeId,
    ready: Boolean(node.status === "online" && node.compute?.computeWorkerReady === true),
    status: node.status,
    lastSeenAt: node.lastSeenAt,
    executors: Array.isArray(node.compute?.capabilities) ? [...node.compute.capabilities] : [],
    computeReady: Boolean(node.compute?.computeWorkerReady),
    hostname: normalizeText(node.compute?.hostname || "", 120),
    platform: normalizeText(node.compute?.platform || "", 40),
    lastJobId: normalizeText(node.compute?.lastJobId || "", 120),
    lastComputeStatus: node.compute?.lastResultOk === false ? "failed" : (node.compute?.lastResultOk === true ? "completed" : "")
  }));
  const localWorker = getLocalComputeCapabilities(options.baseTopic || "");
  return {
    allowedExecutors: [...ALLOWED_EXECUTORS],
    localWorker,
    workers: [...phoneWorkers, ...remoteNodes]
  };
}

function getSharedComputeStatus(options = {}) {
  const workers = getSharedComputeWorkers(options);
  const recentJobs = listSharedComputeJobs(10);
  return {
    generatedAt: nowIso(),
    localWorker: workers.localWorker,
    allowedExecutors: workers.allowedExecutors,
    workerCount: workers.workers.length,
    readyWorkerCount: workers.workers.filter((item) => item.ready).length,
    workers: workers.workers,
    recentJobs
  };
}

module.exports = {
  ALLOWED_EXECUTORS,
  getFederatedNodeIdFromBaseTopic,
  getLocalComputeCapabilities,
  buildComputeCapabilitiesPacket,
  getSharedComputeStatus,
  getSharedComputeWorkers,
  dispatchSharedComputeJob,
  listSharedComputeJobs,
  getSharedComputeJob,
  executeFederatedComputeRequest,
  recordFederatedComputeCapabilities,
  recordFederatedComputeResult,
  normalizeJobInput,
  runLocalProcess
};
