const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const { getSecret, setSecret, deleteSecret } = require("../secureVault");
const { projectRoot, resolveDataPath, resolveLogPath } = require("../runtimePaths");
const { resolveToolPaths } = require("./systemPaths");
const { appendGraphEvent, appendActionManifest } = require("../graphRuntimeStore");

const SYMPHONY_SECRET_NAME = "integrations.symphony";
const SYMPHONY_PID_FILE = resolveLogPath("symphony.pid");
const SYMPHONY_STATE_FILE = resolveDataPath("symphony-state.json");
const SYMPHONY_STDOUT_LOG = resolveLogPath("symphony.out.log");
const SYMPHONY_STDERR_LOG = resolveLogPath("symphony.err.log");
const SYMPHONY_TEMPLATE_PATH = path.join(projectRoot, "config", "symphony", "WORKFLOW.example.md");
const DEFAULT_SYMPHONY_PORT = 4792;
let lastSuccessfulSymphonyLiveState = null;
const DEFAULT_RUNTIME_KIND = "elixir_reference";
const DEFAULT_LOGS_ROOT = resolveLogPath("symphony-service");
const DEFAULT_SOURCE_REPO_URL = "https://github.com/openai/symphony.git";
const VALID_RUNTIME_KINDS = new Set(["elixir_reference", "custom"]);

function buildSymphonyActorRef() {
  return {
    type: "service_manager",
    id: "symphony-manager",
    label: "symphony manager",
    domain: "local"
  };
}

function buildSymphonySubjectRef(config = {}) {
  return {
    type: "integration",
    id: "symphony",
    label: "symphony",
    domain: "local",
    criticality: config.enabled ? "high" : "medium"
  };
}

function buildSymphonyTargetRef(config = {}, mode = "service") {
  if (mode === "workflow") {
    const workflowPath = normalizePath(config.workflowPath);
    const workflowName = workflowPath ? path.basename(workflowPath) : "workflow";
    return {
      type: "workflow",
      id: workflowPath || workflowName,
      label: workflowName,
      criticality: "medium"
    };
  }
  const port = Number(config.port || DEFAULT_SYMPHONY_PORT) || DEFAULT_SYMPHONY_PORT;
  return {
    type: "service_endpoint",
    id: `symphony:${port}`,
    label: `symphony:${port}`,
    domain: "local",
    criticality: "high"
  };
}

function emitSymphonyEvent(action, config = {}, extra = {}) {
  appendGraphEvent({
    component: "symphony-integration",
    category: extra.category || "service_lifecycle",
    action,
    actor: buildSymphonyActorRef(),
    subject: buildSymphonySubjectRef(config),
    target: extra.target || buildSymphonyTargetRef(config, extra.targetMode || "service"),
    context: {
      runtime: config.runtime || DEFAULT_RUNTIME_KIND,
      port: Number(config.port || DEFAULT_SYMPHONY_PORT) || DEFAULT_SYMPHONY_PORT,
      repoRoot: config.repoRoot || "",
      workflowPath: config.workflowPath || "",
      workspaceRoot: config.workspaceRoot || "",
      linearProjectSlug: config.linearProjectSlug || "",
      ...((extra.context && typeof extra.context === "object") ? extra.context : {})
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

function emitSymphonyManifest(action, status, config = {}, extra = {}) {
  appendActionManifest({
    component: "symphony-integration",
    action,
    status,
    actor: buildSymphonyActorRef(),
    target: extra.target || buildSymphonyTargetRef(config, extra.targetMode || "service"),
    reason: extra.reason || "",
    context: {
      runtime: config.runtime || DEFAULT_RUNTIME_KIND,
      port: Number(config.port || DEFAULT_SYMPHONY_PORT) || DEFAULT_SYMPHONY_PORT,
      repoRoot: config.repoRoot || "",
      workflowPath: config.workflowPath || "",
      workspaceRoot: config.workspaceRoot || "",
      linearProjectSlug: config.linearProjectSlug || "",
      ...((extra.context && typeof extra.context === "object") ? extra.context : {})
    },
    policy: {
      mode: "loopback_guarded",
      approvalState: extra.approvalState || "not_required",
      autonomous: false
    },
    evidence: extra.evidence || {}
  });
}

function normalizeText(value, maxLen = 600) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLen);
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const lowered = String(value).trim().toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;
  return fallback;
}

function normalizeInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function expandUserHome(inputPath) {
  const raw = normalizeText(inputPath, 1200);
  if (!raw) return "";
  if (raw === "~") {
    return process.env.USERPROFILE || process.env.HOME || raw;
  }
  if (raw.startsWith("~/") || raw.startsWith("~\\")) {
    return path.join(process.env.USERPROFILE || process.env.HOME || "", raw.slice(2));
  }
  return raw;
}

function normalizePath(inputPath) {
  const expanded = expandUserHome(inputPath);
  if (!expanded) return "";
  try {
    return path.resolve(expanded);
  } catch (_error) {
    return "";
  }
}

function normalizeRuntimeKind(value) {
  const runtime = normalizeText(value, 80).toLowerCase();
  if (!runtime) return DEFAULT_RUNTIME_KIND;
  if (VALID_RUNTIME_KINDS.has(runtime)) {
    return runtime;
  }
  return DEFAULT_RUNTIME_KIND;
}

function normalizeApiKey(value) {
  const raw = normalizeText(value, 400);
  if (!raw) return "";
  if (raw.length < 16) return "";
  if (/\s/.test(raw)) return "";
  return raw;
}

function maskToken(value) {
  const token = String(value || "");
  if (!token) return "";
  if (token.length <= 10) {
    return "*".repeat(token.length);
  }
  return `${token.slice(0, 4)}${"*".repeat(Math.max(4, token.length - 8))}${token.slice(-4)}`;
}

function ensureDirExists(folderPath) {
  if (!folderPath) return;
  fs.mkdirSync(folderPath, { recursive: true });
}

function fileExists(targetPath) {
  try {
    return Boolean(targetPath) && fs.existsSync(targetPath);
  } catch (_error) {
    return false;
  }
}

function quoteForPosixShell(value) {
  const text = String(value ?? "");
  if (!text) return "''";
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function escapeYamlDoubleQuoted(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJsonSafe(filePath, payload) {
  ensureDirExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function readPidFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const parsed = Number(String(fs.readFileSync(filePath, "utf8") || "").trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  } catch (_error) {
    return 0;
  }
}

function writePidFile(filePath, pid) {
  ensureDirExists(path.dirname(filePath));
  fs.writeFileSync(filePath, `${Number(pid || 0) || 0}\n`, "utf8");
}

function removeFileQuietly(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_error) {
    // ignore
  }
}

function isPidRunning(pid) {
  const value = Number(pid || 0);
  if (!Number.isFinite(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function commandExists(name) {
  const command = normalizeText(name, 120);
  if (!command) return "";
  try {
    const result = childProcess.spawnSync("where", [command], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 5000
    });
    if (result.status !== 0) return "";
    return String(result.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";
  } catch (_error) {
    return "";
  }
}

function quoteForCmd(value) {
  return `"${String(value || "").replace(/"/g, "\"\"")}"`;
}

function resolveMisePath() {
  const envCandidates = [
    process.env.ASOLARIA_SYMPHONY_MISE_PATH,
    process.env.MISE_PATH,
    process.env.MISE_BIN
  ]
    .map((candidate) => normalizePath(candidate))
    .filter(Boolean);

  for (const candidate of envCandidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  for (const candidate of [commandExists("mise"), commandExists("mise.exe")]) {
    if (candidate) {
      return candidate;
    }
  }

  const localAppData = normalizePath(process.env.LOCALAPPDATA || "");
  if (!localAppData) {
    return "";
  }

  const winGetPackagesRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  try {
    if (fs.existsSync(winGetPackagesRoot)) {
      const packageDir = fs.readdirSync(winGetPackagesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^jdx\.mise_/i.test(entry.name))
        .map((entry) => path.join(winGetPackagesRoot, entry.name, "mise", "bin", "mise.exe"))
        .find((candidate) => fileExists(candidate));
      if (packageDir) {
        return packageDir;
      }
    }
  } catch (_error) {
    // ignore
  }

  const fallback = path.join(localAppData, "Programs", "mise", "bin", "mise.exe");
  if (fileExists(fallback)) {
    return fallback;
  }

  return "";
}

function resolveCodexCommand(command, codexPath) {
  const raw = normalizeText(command, 500) || "codex app-server";
  const resolvedCodexPath = normalizePath(codexPath);
  if (!resolvedCodexPath) {
    return raw;
  }
  if (/^codex(?:\.cmd|\.exe)?(?:\s|$)/i.test(raw)) {
    const suffix = raw.replace(/^codex(?:\.cmd|\.exe)?/i, "");
    if (process.platform === "win32") {
      const codexDir = path.dirname(resolvedCodexPath);
      const nodeExePath = path.join(codexDir, "node.exe");
      const codexJsPath = path.join(codexDir, "node_modules", "@openai", "codex", "bin", "codex.js");
      if (fileExists(nodeExePath) && fileExists(codexJsPath)) {
        const wslNodeExePath = nodeExePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_m, drive) => `/mnt/${String(drive).toLowerCase()}`);
        return `${quoteForPosixShell(wslNodeExePath)} ${quoteForPosixShell(codexJsPath)}${suffix}`;
      }
      return raw;
    }
    return `${quoteForCmd(resolvedCodexPath)}${suffix}`;
  }
  return raw;
}

function collectWindowsShellPathEntries(gitPath) {
  if (process.platform !== "win32") return [];
  const normalizedGitPath = normalizePath(gitPath);
  if (!normalizedGitPath) return [];
  const gitRoot = path.dirname(path.dirname(normalizedGitPath));
  const candidates = [
    path.join(gitRoot, "bin"),
    path.join(gitRoot, "usr", "bin")
  ];
  return candidates.filter((candidate) => fileExists(candidate));
}

function buildSymphonyRunCommand(misePath, workflowPath, logsRoot, port) {
  const runner = process.platform === "win32"
    ? `${quoteForCmd(misePath)} exec -- escript ./bin/symphony`
    : `${quoteForCmd(misePath)} exec -- ./bin/symphony`;
  const command = [
    runner,
    "--i-understand-that-this-will-be-running-without-the-usual-guardrails",
    `"${workflowPath}"`,
    `--logs-root "${logsRoot}"`
  ];
  if (Number(port || 0) > 0) {
    command.push(`--port ${Number(port)}`);
  }
  return command.join(" ");
}

function buildSymphonyRunArgs(workflowPath, logsRoot, port) {
  const args = ["exec", "--"];
  if (process.platform === "win32") {
    args.push("escript", "./bin/symphony");
  } else {
    args.push("./bin/symphony");
  }
  args.push(
    "--i-understand-that-this-will-be-running-without-the-usual-guardrails",
    workflowPath,
    "--logs-root",
    logsRoot
  );
  if (Number(port || 0) > 0) {
    args.push("--port", String(Number(port)));
  }
  return args;
}

function syncWorkflowCodexCommand(workflowPath, codexCommand) {
  const normalizedWorkflowPath = normalizePath(workflowPath);
  const normalizedCommand = normalizeText(codexCommand, 4000);
  if (!normalizedWorkflowPath || !normalizedCommand || !fileExists(normalizedWorkflowPath)) {
    return false;
  }
  const original = String(fs.readFileSync(normalizedWorkflowPath, "utf8") || "");
  if (!original) {
    return false;
  }
  const desiredLine = `  command: "${escapeYamlDoubleQuoted(normalizedCommand)}"`;
  let updated = original.replace(/^\s*command:\s*.*$/m, desiredLine);
  if (updated === original && /^codex:\s*$/m.test(original)) {
    updated = original.replace(/^codex:\s*$/m, `codex:\n${desiredLine}`);
  }
  if (updated === original) {
    return false;
  }
  fs.writeFileSync(normalizedWorkflowPath, updated, "utf8");
  return true;
}

function readState() {
  return readJsonSafe(SYMPHONY_STATE_FILE, {
    lastStartedAt: "",
    lastStoppedAt: "",
    lastError: "",
    lastLaunchCommand: "",
    lastLaunchCwd: "",
    lastPid: 0,
    lastResolvedCodexCommand: ""
  });
}

function writeState(next) {
  const current = readState();
  writeJsonSafe(SYMPHONY_STATE_FILE, {
    ...current,
    ...(next && typeof next === "object" ? next : {})
  });
}

function resolveSymphonyConfig() {
  const envEnabled = process.env.ASOLARIA_SYMPHONY_ENABLED;
  const envRepoRoot = process.env.ASOLARIA_SYMPHONY_REPO_ROOT || "";
  const envWorkflowPath = process.env.ASOLARIA_SYMPHONY_WORKFLOW_PATH || "";
  const envLogsRoot = process.env.ASOLARIA_SYMPHONY_LOGS_ROOT || "";
  const envRuntime = process.env.ASOLARIA_SYMPHONY_RUNTIME || "";
  const envPort = process.env.ASOLARIA_SYMPHONY_PORT || "";
  const envCommand = process.env.ASOLARIA_SYMPHONY_COMMAND || "";
  const envWorkingDirectory = process.env.ASOLARIA_SYMPHONY_WORKDIR || process.env.ASOLARIA_SYMPHONY_WORKING_DIRECTORY || "";
  const envProjectSlug = process.env.ASOLARIA_SYMPHONY_LINEAR_PROJECT_SLUG || "";
  const envLinearApiKey = process.env.LINEAR_API_KEY || process.env.ASOLARIA_SYMPHONY_LINEAR_API_KEY || "";
  const envSourceRepoUrl = process.env.ASOLARIA_SYMPHONY_SOURCE_REPO_URL || "";
  const envWorkspaceRoot = process.env.ASOLARIA_SYMPHONY_WORKSPACE_ROOT || "";
  const envCodexCommand = process.env.ASOLARIA_SYMPHONY_CODEX_COMMAND || "";

  if (normalizeText(envRepoRoot) || normalizeApiKey(envLinearApiKey) || normalizeText(envCommand)) {
    return {
      enabled: normalizeBool(envEnabled, true),
      source: "env",
      updatedAt: null,
      repoRoot: normalizePath(envRepoRoot),
      workflowPath: normalizePath(envWorkflowPath),
      logsRoot: normalizePath(envLogsRoot) || DEFAULT_LOGS_ROOT,
      runtime: normalizeRuntimeKind(envRuntime),
      port: normalizeInt(envPort, DEFAULT_SYMPHONY_PORT, 0, 65535),
      command: normalizeText(envCommand, 1000),
      workingDirectory: normalizePath(envWorkingDirectory),
      linearProjectSlug: normalizeText(envProjectSlug, 160),
      linearApiKey: normalizeApiKey(envLinearApiKey),
      sourceRepoUrl: normalizeText(envSourceRepoUrl, 400) || DEFAULT_SOURCE_REPO_URL,
      workspaceRoot: normalizePath(envWorkspaceRoot),
      codexCommand: normalizeText(envCodexCommand, 500) || "codex app-server"
    };
  }

  const secret = getSecret(SYMPHONY_SECRET_NAME, { namespace: "owner" });
  const value = secret?.value || {};
  return {
    enabled: normalizeBool(value.enabled, false),
    source: secret ? "vault" : "none",
    updatedAt: secret?.updatedAt || null,
    repoRoot: normalizePath(value.repoRoot),
    workflowPath: normalizePath(value.workflowPath),
    logsRoot: normalizePath(value.logsRoot) || DEFAULT_LOGS_ROOT,
    runtime: normalizeRuntimeKind(value.runtime),
    port: normalizeInt(value.port, DEFAULT_SYMPHONY_PORT, 0, 65535),
    command: normalizeText(value.command, 1000),
    workingDirectory: normalizePath(value.workingDirectory),
    linearProjectSlug: normalizeText(value.linearProjectSlug, 160),
    linearApiKey: normalizeApiKey(value.linearApiKey),
    sourceRepoUrl: normalizeText(value.sourceRepoUrl, 400) || DEFAULT_SOURCE_REPO_URL,
    workspaceRoot: normalizePath(value.workspaceRoot),
    codexCommand: normalizeText(value.codexCommand, 500) || "codex app-server"
  };
}

function summarizeConfig(config) {
  return {
    enabled: Boolean(config.enabled),
    configured: Boolean(config.repoRoot && config.workflowPath && config.linearProjectSlug && config.linearApiKey),
    source: config.source,
    updatedAt: config.updatedAt || null,
    runtime: config.runtime,
    port: Number(config.port || 0) || 0,
    repoRoot: config.repoRoot || "",
    workflowPath: config.workflowPath || "",
    logsRoot: config.logsRoot || "",
    command: config.command || "",
    workingDirectory: config.workingDirectory || "",
    linearProjectSlug: config.linearProjectSlug || "",
    linearApiKeyConfigured: Boolean(config.linearApiKey),
    linearApiKeyHint: maskToken(config.linearApiKey),
    sourceRepoUrl: config.sourceRepoUrl || "",
    workspaceRoot: config.workspaceRoot || "",
    codexCommand: config.codexCommand || "codex app-server",
    templateWorkflowPath: SYMPHONY_TEMPLATE_PATH
  };
}

function resolveElixirProject(repoRoot) {
  const root = normalizePath(repoRoot);
  const empty = {
    root: "",
    mixProjectPath: "",
    binaryPath: "",
    cliEntrypointPath: "",
    miseConfigPath: "",
    hasProject: false,
    hasBuiltBinary: false,
    hasCliEntrypoint: false,
    hasMiseConfig: false
  };
  if (!root) return empty;

  for (const candidate of [root, path.join(root, "elixir")]) {
    const mixProjectPath = path.join(candidate, "mix.exs");
    if (!fileExists(mixProjectPath)) {
      continue;
    }
    const binaryPath = path.join(candidate, "bin", "symphony");
    const cliEntrypointPath = path.join(candidate, "lib", "symphony_elixir", "cli.ex");
    const miseConfigPath = path.join(candidate, "mise.toml");
    return {
      root: candidate,
      mixProjectPath,
      binaryPath,
      cliEntrypointPath,
      miseConfigPath,
      hasProject: true,
      hasBuiltBinary: fileExists(binaryPath),
      hasCliEntrypoint: fileExists(cliEntrypointPath),
      hasMiseConfig: fileExists(miseConfigPath)
    };
  }
  return empty;
}

function buildLaunchPlan(config) {
  const toolPaths = resolveToolPaths();
  const gitPath = commandExists("git");
  const misePath = resolveMisePath();
  const elixirPath = commandExists("elixir");
  const mixPath = commandExists("mix");
  const wslPath = toolPaths.wslPath || commandExists("wsl");
  const elixirProject = resolveElixirProject(config.repoRoot);
  const plan = {
    mode: "",
    cwd: "",
    command: "",
    executable: "",
    args: [],
    launchable: false,
    bootstrapOnStart: false,
    reasons: [],
    prerequisites: {
      codexPath: toolPaths.codexPath || "",
      gitPath,
      misePath,
      elixirPath,
      mixPath,
      wslPath,
      repoExists: Boolean(config.repoRoot && fileExists(config.repoRoot)),
      workflowExists: Boolean(config.workflowPath && fileExists(config.workflowPath)),
      templateExists: fileExists(SYMPHONY_TEMPLATE_PATH),
      elixirRoot: elixirProject.root,
      elixirMixProjectExists: elixirProject.hasProject,
      elixirCliEntrypointExists: elixirProject.hasCliEntrypoint,
      elixirBinaryExists: elixirProject.hasBuiltBinary,
      elixirMiseConfigExists: elixirProject.hasMiseConfig
    }
  };

  if (!config.enabled) {
    plan.reasons.push("Symphony integration is disabled.");
  }
  if (!config.repoRoot) {
    plan.reasons.push("repoRoot is not configured.");
  } else if (!plan.prerequisites.repoExists) {
    plan.reasons.push("Configured Symphony repoRoot does not exist.");
  }
  if (!config.workflowPath) {
    plan.reasons.push("workflowPath is not configured.");
  } else if (!plan.prerequisites.workflowExists) {
    plan.reasons.push("Configured Symphony workflowPath does not exist.");
  }
  if (!config.linearProjectSlug) {
    plan.reasons.push("linearProjectSlug is not configured.");
  }
  if (!config.linearApiKey) {
    plan.reasons.push("LINEAR_API_KEY is not configured.");
  }
  if (!toolPaths.codexPath) {
    plan.reasons.push("Codex CLI is not available on this machine.");
  }

  if (config.command) {
    plan.mode = "custom";
    plan.cwd = config.workingDirectory || config.repoRoot || projectRoot;
    plan.command = config.command;
    plan.executable = process.env.ComSpec || "cmd.exe";
    plan.args = ["/d", "/s", "/c", config.command];
  } else {
    plan.mode = config.runtime === "custom" ? "custom" : "elixir_reference";
    if (!elixirProject.hasProject) {
      plan.reasons.push("Reference Symphony Elixir project was not found under repoRoot (expected mix.exs in repoRoot or repoRoot\\elixir).");
    }
    if (!misePath) {
      plan.reasons.push("mise is not installed, so the Elixir reference implementation cannot be launched automatically.");
    }
    if (elixirProject.hasProject && config.workflowPath && misePath) {
      plan.cwd = elixirProject.root;
      plan.command = buildSymphonyRunCommand(
        misePath,
        config.workflowPath,
        config.logsRoot || DEFAULT_LOGS_ROOT,
        config.port
      );

      if (!elixirProject.hasBuiltBinary) {
        const commandParts = [];
        plan.bootstrapOnStart = true;
        commandParts.push(`${quoteForCmd(misePath)} trust`);
        commandParts.push(`${quoteForCmd(misePath)} install`);
        commandParts.push(`${quoteForCmd(misePath)} exec -- mix setup`);
        commandParts.push(`${quoteForCmd(misePath)} exec -- mix build`);
        commandParts.push(plan.command);
        plan.command = commandParts.join(" && ");
        plan.executable = process.env.ComSpec || "cmd.exe";
        plan.args = ["/d", "/s", "/c", plan.command];
      } else {
        plan.executable = misePath;
        plan.args = buildSymphonyRunArgs(
          config.workflowPath,
          config.logsRoot || DEFAULT_LOGS_ROOT,
          config.port
        );
      }
    }
  }

  plan.launchable = plan.reasons.length === 0 && Boolean(plan.executable && plan.args.length > 0);
  return plan;
}

function getProcessStatus() {
  const pid = readPidFile(SYMPHONY_PID_FILE);
  const running = isPidRunning(pid);
  if (!running && pid > 0) {
    removeFileQuietly(SYMPHONY_PID_FILE);
  }
  return {
    running,
    pid: running ? pid : 0,
    pidFile: SYMPHONY_PID_FILE,
    stdoutLog: SYMPHONY_STDOUT_LOG,
    stderrLog: SYMPHONY_STDERR_LOG
  };
}

async function linearGraphqlRequest(config, query, variables = {}) {
  const apiKey = normalizeApiKey(config?.linearApiKey);
  if (!apiKey) {
    throw new Error("Symphony Linear API key is not configured.");
  }
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey
    },
    body: JSON.stringify({
      query: String(query || ""),
      variables: variables && typeof variables === "object" ? variables : {}
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(json?.errors) && json.errors.length
      ? json.errors.map((item) => item?.message || "request_failed").join("; ")
      : `Linear request failed (${response.status})`;
    throw new Error(message);
  }
  if (Array.isArray(json?.errors) && json.errors.length) {
    throw new Error(json.errors.map((item) => item?.message || "request_failed").join("; "));
  }
  return json?.data || {};
}

function slugifyLinearText(value) {
  return normalizeText(value, 240)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractLinearProjectSlugCandidates(value) {
  const raw = normalizeText(value, 240);
  if (!raw) return [];
  const normalized = raw.replace(/^https?:\/\/[^/]+\//i, "").trim();
  const candidates = new Set();
  candidates.add(raw.toLowerCase());
  candidates.add(normalized.toLowerCase());
  const slugMatch = normalized.match(/project\/([^/?#]+)/i);
  if (slugMatch && slugMatch[1]) {
    candidates.add(String(slugMatch[1]).toLowerCase());
  }
  const tail = raw.split("/").filter(Boolean).pop() || "";
  if (tail) {
    candidates.add(tail.toLowerCase());
  }
  const suffixMatch = raw.match(/([a-z0-9]{8,})$/i);
  if (suffixMatch && suffixMatch[1]) {
    candidates.add(String(suffixMatch[1]).toLowerCase());
  }
  return Array.from(candidates).filter(Boolean);
}

function pickLinearTodoState(states = []) {
  if (!Array.isArray(states) || !states.length) return null;
  return states.find((item) => String(item?.type || "").toLowerCase() === "unstarted")
    || states.find((item) => String(item?.name || "").toLowerCase() === "todo")
    || states.find((item) => String(item?.type || "").toLowerCase() === "backlog")
    || states[0]
    || null;
}

async function resolveLinearProjectContext(config) {
  const slugCandidates = extractLinearProjectSlugCandidates(config?.linearProjectSlug);
  if (!slugCandidates.length) {
    throw new Error("Symphony Linear project slug is not configured.");
  }
  const teamData = await linearGraphqlRequest(
    config,
    `
      query SymphonyLinearTeams {
        teams {
          nodes {
            id
            name
            key
            states {
              nodes {
                id
                name
                type
              }
            }
          }
        }
      }
    `
  );
  const projectData = await linearGraphqlRequest(
    config,
    `
      query SymphonyLinearProjects {
        projects(first: 100) {
          nodes {
            id
            name
            slugId
            url
            teams {
              nodes {
                id
                name
                key
              }
            }
          }
        }
      }
    `
  );
  const projects = Array.isArray(projectData?.projects?.nodes) ? projectData.projects.nodes : [];
  const teams = Array.isArray(teamData?.teams?.nodes) ? teamData.teams.nodes : [];
  const project = projects.find((item) => {
    const url = String(item?.url || "").toLowerCase();
    const slugId = String(item?.slugId || "").toLowerCase();
    const nameSlug = slugifyLinearText(item?.name || "");
    return slugCandidates.some((candidate) =>
      candidate === slugId
      || candidate === nameSlug
      || url.includes(candidate)
    );
  });
  if (!project) {
    throw new Error(`Linear project not found for configured slug "${config.linearProjectSlug}".`);
  }
  const projectTeams = Array.isArray(project?.teams?.nodes) ? project.teams.nodes : [];
  const primaryProjectTeamId = String(projectTeams[0]?.id || "");
  const team = teams.find((item) => String(item?.id || "") === primaryProjectTeamId)
    || projectTeams.find((candidate) => candidate?.id && teams.some((item) => item?.id === candidate.id))
    || teams[0]
    || null;
  if (!team?.id) {
    throw new Error(`Linear team not found for project "${project.name || config.linearProjectSlug}".`);
  }
  const states = Array.isArray(team?.states?.nodes) ? team.states.nodes : [];
  const todoState = pickLinearTodoState(states);
  return {
    project: {
      id: String(project.id || ""),
      name: String(project.name || ""),
      slugId: String(project.slugId || ""),
      url: String(project.url || "")
    },
    team: {
      id: String(team.id || ""),
      name: String(team.name || ""),
      key: String(team.key || "")
    },
    todoState: todoState
      ? {
          id: String(todoState.id || ""),
          name: String(todoState.name || ""),
          type: String(todoState.type || "")
        }
      : null
  };
}

function buildSymphonyIssueDescription(input = {}, config = {}, context = {}) {
  const lines = [
    "## Asolaria Symphony Work Item",
    "",
    `Objective: ${normalizeText(input.objective || input.title || "", 4000) || "(missing objective)"}`,
    "",
    "### Routing Context",
    `- taskType: ${normalizeText(input.taskType, 80) || "long_running"}`,
    `- sensitivity: ${normalizeText(input.sensitivity, 80) || "internal"}`,
    `- size: ${normalizeText(input.size, 80) || "medium"}`,
    input.taskId ? `- asolariaTaskId: ${normalizeText(input.taskId, 120)}` : "",
    input.dispatchId ? `- dispatchId: ${normalizeText(input.dispatchId, 120)}` : "",
    config.workflowPath ? `- workflowPath: ${normalizeText(config.workflowPath, 600)}` : "",
    context?.project?.url ? `- linearProject: ${normalizeText(context.project.url, 600)}` : "",
    "",
    input.instructions ? "### Instructions" : "",
    input.instructions ? normalizeText(input.instructions, 12000) : "",
    "",
    Array.isArray(input.allowedPaths) && input.allowedPaths.length ? "### Allowed Paths" : "",
    Array.isArray(input.allowedPaths) && input.allowedPaths.length
      ? input.allowedPaths.map((item) => `- ${normalizeText(item, 600)}`).join("\n")
      : "",
    "",
    Array.isArray(input.expectedArtifacts) && input.expectedArtifacts.length ? "### Expected Artifacts" : "",
    Array.isArray(input.expectedArtifacts) && input.expectedArtifacts.length
      ? input.expectedArtifacts.map((item) => `- ${normalizeText(item, 600)}`).join("\n")
      : "",
    "",
    "### Mistakes To Avoid",
    "- Do not widen scope beyond the objective.",
    "- Do not assume unapproved secrets, accounts, or repos are allowed.",
    "- Call out blockers explicitly instead of guessing.",
    "- Return concrete artifacts or status, not just acknowledgements."
  ].filter(Boolean);
  return lines.join("\n");
}

function mapSymphonyPriority(input = {}) {
  const sensitivity = normalizeText(input.sensitivity, 80).toLowerCase();
  const size = normalizeText(input.size, 80).toLowerCase();
  if (sensitivity === "owner_plane") return 3;
  if (sensitivity === "privileged") return 2;
  if (size === "large") return 2;
  return 1;
}

async function submitSymphonyWorkItem(input = {}) {
  const config = resolveSymphonyConfig();
  const summary = summarizeConfig(config);
  if (!config.enabled) {
    throw new Error("Symphony integration is disabled.");
  }
  if (!summary.configured) {
    throw new Error("Symphony integration is not fully configured.");
  }

  let processInfo = getProcessStatus();
  let serviceAction = "none";
  if (normalizeBool(input.ensureService, true) && !processInfo.running) {
    startSymphonyService();
    processInfo = getProcessStatus();
    serviceAction = processInfo.running ? "started" : "start_requested";
  }

  const context = await resolveLinearProjectContext(config);
  const title = normalizeText(input.title || input.objective || "", 240);
  if (!title) {
    throw new Error("Symphony work item requires a title or objective.");
  }
  const description = buildSymphonyIssueDescription(input, config, context);
  const issueInput = {
    title,
    description,
    teamId: context.team.id,
    projectId: context.project.id,
    stateId: context.todoState?.id || undefined,
    priority: mapSymphonyPriority(input)
  };
  const data = await linearGraphqlRequest(
    config,
    `
      mutation SymphonyIssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            priority
            state {
              id
              name
              type
            }
            team {
              id
              key
              name
            }
            project {
              id
              name
              url
            }
          }
        }
      }
    `,
    { input: issueInput }
  );
  const payload = data?.issueCreate || {};
  if (!payload?.success || !payload?.issue?.id) {
    throw new Error("Linear issue creation did not return an issue.");
  }
  const issue = payload.issue;
  emitSymphonyEvent("symphony_issue_created", config, {
    category: "work_submission",
    target: {
      type: "linear_issue",
      id: String(issue.id || ""),
      label: String(issue.identifier || issue.title || "linear issue"),
      domain: "external",
      criticality: "medium"
    },
    context: {
      issueId: String(issue.id || ""),
      issueIdentifier: String(issue.identifier || ""),
      issueUrl: String(issue.url || ""),
      teamId: context.team.id,
      projectId: context.project.id,
      stateId: context.todoState?.id || "",
      taskType: normalizeText(input.taskType, 80),
      sensitivity: normalizeText(input.sensitivity, 80),
      size: normalizeText(input.size, 80)
    },
    detail: {
      serviceAction,
      state: issue.state || null
    }
  });
  emitSymphonyManifest("symphony_issue_submit", "completed", config, {
    reason: `Created Linear issue ${String(issue.identifier || "").trim() || "for Symphony"}.`,
    target: {
      type: "linear_issue",
      id: String(issue.id || ""),
      label: String(issue.identifier || issue.title || "linear issue"),
      domain: "external",
      criticality: "medium"
    },
    context: {
      issueId: String(issue.id || ""),
      issueIdentifier: String(issue.identifier || ""),
      issueUrl: String(issue.url || ""),
      taskType: normalizeText(input.taskType, 80),
      sensitivity: normalizeText(input.sensitivity, 80),
      size: normalizeText(input.size, 80)
    },
    evidence: {
      issue: {
        id: String(issue.id || ""),
        identifier: String(issue.identifier || ""),
        title: String(issue.title || ""),
        url: String(issue.url || "")
      },
      serviceAction,
      team: context.team,
      project: context.project,
      state: issue.state || context.todoState || null
    }
  });
  return {
    submittedAt: new Date().toISOString(),
    serviceAction,
    issue,
    team: context.team,
    project: context.project,
    targetState: context.todoState || null,
    process: processInfo
  };
}

function getSymphonyIntegrationStatus() {
  const config = resolveSymphonyConfig();
  const state = readState();
  const processInfo = getProcessStatus();
  const launchPlan = buildLaunchPlan(config);
  return {
    ...summarizeConfig(config),
    process: processInfo,
    launch: {
      mode: launchPlan.mode,
      cwd: launchPlan.cwd,
      commandPreview: launchPlan.command,
      launchable: launchPlan.launchable,
      bootstrapOnStart: Boolean(launchPlan.bootstrapOnStart),
      reasons: launchPlan.reasons,
      prerequisites: launchPlan.prerequisites
    },
    state: {
      lastStartedAt: state.lastStartedAt || "",
      lastStoppedAt: state.lastStoppedAt || "",
      lastError: state.lastError || "",
      lastLaunchCommand: state.lastLaunchCommand || "",
      lastLaunchCwd: state.lastLaunchCwd || "",
      lastPid: Number(state.lastPid || 0) || 0,
      lastResolvedCodexCommand: state.lastResolvedCodexCommand || ""
    }
  };
}

async function fetchSymphonyLiveState(options = {}) {
  const status = options && typeof options === "object" && options.status
    ? options.status
    : getSymphonyIntegrationStatus();
  const port = Number(status?.port || status?.launch?.port || DEFAULT_SYMPHONY_PORT) || DEFAULT_SYMPHONY_PORT;
  const running = Boolean(status?.process?.running);
  const url = `http://127.0.0.1:${port}/api/v1/state`;

  if (!running) {
    return {
      ok: false,
      available: false,
      running: false,
      port,
      url,
      fetchedAt: new Date().toISOString(),
      reason: "service_not_running",
      state: null,
      summary: {
        running: 0,
        retrying: 0,
        issueIdentifiers: []
      }
    };
  }

  const timeoutMs = Math.max(1600, Math.min(10000, Number(options.timeoutMs || 5000) || 5000));
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch (_error) {
          // ignore
        }
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller ? controller.signal : undefined
    });
    const json = await response.json().catch(() => ({}));
    const runningItems = Array.isArray(json?.running) ? json.running : [];
    const retryingItems = Array.isArray(json?.retrying) ? json.retrying : [];
    const payload = {
      ok: response.ok,
      available: true,
      running: true,
      port,
      url,
      fetchedAt: new Date().toISOString(),
      state: json,
      summary: {
        running: Number(json?.counts?.running || runningItems.length || 0) || 0,
        retrying: Number(json?.counts?.retrying || retryingItems.length || 0) || 0,
        issueIdentifiers: runningItems
          .map((item) => normalizeText(item?.issue_identifier || item?.issue_id || "", 120))
          .filter(Boolean)
          .slice(0, 12),
        totalTokens: Number(json?.codex_totals?.total_tokens || 0) || 0
      }
    };
    if (response.ok) {
      lastSuccessfulSymphonyLiveState = payload;
    }
    return payload;
  } catch (error) {
    const message = normalizeText(error?.message || error || "live_state_fetch_failed", 240);
    const cached = lastSuccessfulSymphonyLiveState
      && lastSuccessfulSymphonyLiveState.port === port
      && lastSuccessfulSymphonyLiveState.url === url
      ? lastSuccessfulSymphonyLiveState
      : null;
    if (cached) {
      return {
        ...cached,
        available: true,
        running: true,
        fetchedAt: new Date().toISOString(),
        fresh: false,
        staleFromCache: true,
        error: message
      };
    }
    return {
      ok: false,
      available: true,
      running: true,
      port,
      url,
      fetchedAt: new Date().toISOString(),
      error: message,
      state: null,
      summary: {
        running: 0,
        retrying: 0,
        issueIdentifiers: []
      }
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function setSymphonyConfig(input = {}) {
  if (input?.clear === true) {
    const previous = resolveSymphonyConfig();
    deleteSecret(SYMPHONY_SECRET_NAME, { namespace: "owner" });
    writeState({
      lastError: ""
    });
    emitSymphonyManifest("symphony_config", "cleared", previous, {
      reason: "Symphony integration settings cleared."
    });
    emitSymphonyEvent("symphony_config_cleared", previous, {
      detail: {
        repoRoot: previous.repoRoot || "",
        workflowPath: previous.workflowPath || ""
      }
    });
    return getSymphonyIntegrationStatus();
  }

  const previous = resolveSymphonyConfig();
  const payload = {
    enabled: input.enabled === undefined ? previous.enabled : normalizeBool(input.enabled, previous.enabled),
    repoRoot: input.repoRoot === undefined ? previous.repoRoot : normalizePath(input.repoRoot),
    workflowPath: input.workflowPath === undefined ? previous.workflowPath : normalizePath(input.workflowPath),
    logsRoot: input.logsRoot === undefined ? previous.logsRoot : (normalizePath(input.logsRoot) || DEFAULT_LOGS_ROOT),
    runtime: input.runtime === undefined ? previous.runtime : normalizeRuntimeKind(input.runtime),
    port: input.port === undefined ? previous.port : normalizeInt(input.port, previous.port || DEFAULT_SYMPHONY_PORT, 0, 65535),
    command: input.command === undefined ? previous.command : normalizeText(input.command, 1000),
    workingDirectory: input.workingDirectory === undefined ? previous.workingDirectory : normalizePath(input.workingDirectory),
    linearProjectSlug: input.linearProjectSlug === undefined ? previous.linearProjectSlug : normalizeText(input.linearProjectSlug, 160),
    linearApiKey: input.linearApiKey === undefined ? previous.linearApiKey : normalizeApiKey(input.linearApiKey),
    sourceRepoUrl: input.sourceRepoUrl === undefined ? previous.sourceRepoUrl : (normalizeText(input.sourceRepoUrl, 400) || DEFAULT_SOURCE_REPO_URL),
    workspaceRoot: input.workspaceRoot === undefined ? previous.workspaceRoot : normalizePath(input.workspaceRoot),
    codexCommand: input.codexCommand === undefined ? previous.codexCommand : (normalizeText(input.codexCommand, 500) || "codex app-server"),
    updatedAt: new Date().toISOString()
  };

  setSecret(
    SYMPHONY_SECRET_NAME,
    payload,
    {
      app: "Asolaria",
      component: "symphony-integration",
      credentialOwner: "owner",
      actor: "owner",
      updatedBy: "api"
    },
    { namespace: "owner" }
  );

  emitSymphonyManifest("symphony_config", "queued", payload, {
    reason: "Symphony integration settings updated."
  });
  emitSymphonyEvent("symphony_config_saved", payload, {
    detail: {
      repoRoot: payload.repoRoot || "",
      workflowPath: payload.workflowPath || "",
      workspaceRoot: payload.workspaceRoot || ""
    }
  });

  return getSymphonyIntegrationStatus();
}

function startSymphonyService() {
  const current = getProcessStatus();
  const config = resolveSymphonyConfig();
  if (current.running) {
    emitSymphonyEvent("symphony_start_skipped", config, {
      status: "ok",
      detail: {
        pid: Number(current.pid || 0) || 0,
        reason: "already_running"
      }
    });
    emitSymphonyManifest("symphony_start", "skipped", config, {
      reason: "Symphony service is already running.",
      evidence: {
        pid: Number(current.pid || 0) || 0
      }
    });
    return getSymphonyIntegrationStatus();
  }

  const plan = buildLaunchPlan(config);
  if (!plan.launchable) {
    const message = plan.reasons.join(" ");
    writeState({
      lastError: message
    });
    emitSymphonyEvent("symphony_start_blocked", config, {
      status: "blocked",
      detail: {
        reasons: plan.reasons,
        prerequisites: plan.prerequisites
      }
    });
    emitSymphonyManifest("symphony_start", "failed", config, {
      reason: message || "Symphony launch plan is not runnable.",
      evidence: {
        reasons: plan.reasons,
        prerequisites: plan.prerequisites
      }
    });
    throw new Error(message || "Symphony launch plan is not runnable.");
  }

  ensureDirExists(path.dirname(SYMPHONY_STDOUT_LOG));
  ensureDirExists(path.dirname(SYMPHONY_STDERR_LOG));
  ensureDirExists(config.logsRoot || DEFAULT_LOGS_ROOT);

  const stdoutFd = fs.openSync(SYMPHONY_STDOUT_LOG, "a");
  const stderrFd = fs.openSync(SYMPHONY_STDERR_LOG, "a");
  const codexPath = resolveToolPaths().codexPath || process.env.CODEX_BIN || "codex";
  const gitPath = resolveToolPaths().gitPath || process.env.GIT_BIN || "";
  const codexCommand = resolveCodexCommand(
    config.codexCommand || process.env.CODEX_COMMAND || "",
    codexPath
  );
  const pathEntries = [
    ...collectWindowsShellPathEntries(gitPath),
    ...(String(process.env.PATH || "").split(path.delimiter).filter(Boolean))
  ];
  const mergedPath = Array.from(new Set(pathEntries)).join(path.delimiter);
  const env = {
    ...process.env,
    PATH: mergedPath,
    LINEAR_API_KEY: config.linearApiKey || process.env.LINEAR_API_KEY || "",
    SYMPHONY_WORKSPACE_ROOT: config.workspaceRoot || process.env.SYMPHONY_WORKSPACE_ROOT || "",
    SOURCE_REPO_URL: config.sourceRepoUrl || process.env.SOURCE_REPO_URL || "",
    CODEX_BIN: codexPath,
    CODEX_COMMAND: codexCommand
  };

  syncWorkflowCodexCommand(config.workflowPath, codexCommand);

  const child = childProcess.spawn(plan.executable, plan.args, {
    cwd: plan.cwd || process.cwd(),
    env,
    windowsHide: true,
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd]
  });

  child.unref();
  writePidFile(SYMPHONY_PID_FILE, child.pid);
  writeState({
    lastStartedAt: new Date().toISOString(),
    lastStoppedAt: "",
    lastError: "",
    lastLaunchCommand: plan.command,
    lastLaunchCwd: plan.cwd || process.cwd(),
    lastPid: Number(child.pid || 0) || 0,
    lastResolvedCodexCommand: codexCommand
  });

  emitSymphonyEvent("symphony_started", config, {
    detail: {
      pid: Number(child.pid || 0) || 0,
      executable: plan.executable,
      args: plan.args,
      cwd: plan.cwd || process.cwd()
    }
  });
  emitSymphonyManifest("symphony_start", "completed", config, {
    reason: "Symphony service launched.",
    evidence: {
      pid: Number(child.pid || 0) || 0,
      command: plan.command,
      cwd: plan.cwd || process.cwd()
    }
  });

  return getSymphonyIntegrationStatus();
}

function stopSymphonyService() {
  const processInfo = getProcessStatus();
  const config = resolveSymphonyConfig();
  if (!processInfo.running || !processInfo.pid) {
    removeFileQuietly(SYMPHONY_PID_FILE);
    writeState({
      lastStoppedAt: new Date().toISOString(),
      lastPid: 0
    });
    emitSymphonyEvent("symphony_stop_skipped", config, {
      detail: {
        reason: "not_running"
      }
    });
    emitSymphonyManifest("symphony_stop", "skipped", config, {
      reason: "Symphony service is not running."
    });
    return getSymphonyIntegrationStatus();
  }

  try {
    childProcess.spawnSync("taskkill", ["/PID", String(processInfo.pid), "/T", "/F"], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 15000
    });
  } catch (_error) {
    try {
      process.kill(processInfo.pid);
    } catch (__error) {
      // ignore
    }
  }

  removeFileQuietly(SYMPHONY_PID_FILE);
  writeState({
    lastStoppedAt: new Date().toISOString(),
    lastPid: 0
  });
  emitSymphonyEvent("symphony_stopped", config, {
    detail: {
      pid: Number(processInfo.pid || 0) || 0
    }
  });
  emitSymphonyManifest("symphony_stop", "completed", config, {
    reason: "Symphony service stopped.",
    evidence: {
      pid: Number(processInfo.pid || 0) || 0
    }
  });
  return getSymphonyIntegrationStatus();
}

function restartSymphonyService() {
  const config = resolveSymphonyConfig();
  emitSymphonyManifest("symphony_restart", "queued", config, {
    reason: "Symphony service restart requested."
  });
  emitSymphonyEvent("symphony_restart_requested", config, {
    detail: {
      port: Number(config.port || DEFAULT_SYMPHONY_PORT) || DEFAULT_SYMPHONY_PORT
    }
  });
  stopSymphonyService();
  const status = startSymphonyService();
  emitSymphonyManifest("symphony_restart", "completed", config, {
    reason: "Symphony service restarted."
  });
  emitSymphonyEvent("symphony_restarted", resolveSymphonyConfig(), {
    detail: {
      running: Boolean(status?.process?.running),
      pid: Number(status?.process?.pid || 0) || 0
    }
  });
  return status;
}

module.exports = {
  getSymphonyIntegrationStatus,
  fetchSymphonyLiveState,
  setSymphonyConfig,
  startSymphonyService,
  stopSymphonyService,
  restartSymphonyService,
  submitSymphonyWorkItem
};
