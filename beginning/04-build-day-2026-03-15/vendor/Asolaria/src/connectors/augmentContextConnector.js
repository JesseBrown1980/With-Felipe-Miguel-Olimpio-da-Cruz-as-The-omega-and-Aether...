const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const { getSecret, setSecret, deleteSecret } = require("../secureVault");
const { projectRoot } = require("../runtimePaths");
const { resolveToolPaths } = require("./systemPaths");

const AUGMENT_CONTEXT_SECRET_NAME = "integrations.augment_context";
const DEFAULT_MODE = "local_cli";
const DEFAULT_SERVER_LABEL = "augment-context";
const DEFAULT_ALLOWED_TOOLS = Object.freeze(["codebase-retrieval"]);
const SAFE_ALLOWED_TOOLS = new Set(DEFAULT_ALLOWED_TOOLS);
const DEFAULT_TOKEN_REDUCTION_PROFILE = "aggressive";
const DEFAULT_CONTEXT_TTL_SECONDS = 30 * 60;
const DEFAULT_PRESET = "read_only";
const DEFAULT_APPROVAL_MODE = "never";
const VALID_MODES = new Set(["local_cli", "remote_mcp"]);
const VALID_TOKEN_REDUCTION_PROFILES = new Set(["off", "balanced", "aggressive"]);
const VALID_TOOL_SCHEMA_MODES = new Set(["pointer", "compact", "full"]);
const AUGMENT_BRIDGE_STATUS_FILE = path.join(projectRoot, "logs", "augment-mcp-bridge-status.json");
const AUGMENT_BRIDGE_TOKEN_FILE = path.join(projectRoot, "logs", "augment-mcp-bridge-token.txt");
const AUGMENT_BRIDGE_URL_FILE = path.join(projectRoot, "logs", "augment-mcp-bridge-url.txt");

function normalizeText(value, maxLen = 400) {
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

function normalizeBaseUrl(value) {
  const raw = normalizeText(value, 800);
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function normalizeMode(value, fallback = DEFAULT_MODE) {
  const mode = normalizeText(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_MODES.has(mode)) {
    return mode;
  }
  return fallback;
}

function normalizeTokenReductionProfile(value, fallback = DEFAULT_TOKEN_REDUCTION_PROFILE) {
  const profile = normalizeText(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_TOKEN_REDUCTION_PROFILES.has(profile)) {
    return profile;
  }
  return fallback;
}

function normalizeToolSchemaMode(value) {
  const mode = normalizeText(value, 40).toLowerCase();
  if (VALID_TOOL_SCHEMA_MODES.has(mode)) {
    return mode;
  }
  return "";
}

function normalizeList(value, maxItems = 16, maxItemLen = 120) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];
  const out = [];
  const seen = new Set();
  for (const rawItem of source) {
    const item = normalizeText(rawItem, maxItemLen);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= maxItems) {
      break;
    }
  }
  return out;
}

function normalizeAllowedTools(value) {
  const tools = normalizeList(value, 8, 120);
  if (tools.length < 1) {
    return DEFAULT_ALLOWED_TOOLS.slice();
  }
  const invalid = tools.filter((item) => !SAFE_ALLOWED_TOOLS.has(String(item || "").trim().toLowerCase()));
  if (invalid.length) {
    throw new Error(`Unsupported Augment MCP tool(s): ${invalid.join(", ")}. Allowed: ${Array.from(SAFE_ALLOWED_TOOLS).join(", ")}.`);
  }
  return tools;
}

function normalizeHeaderMap(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  const out = {};
  const keys = Object.keys(source).slice(0, 20);
  for (const key of keys) {
    const header = String(key || "").trim();
    if (!header) continue;
    if (!/^[A-Za-z0-9-]{1,80}$/.test(header)) continue;
    const headerValue = normalizeText(source[key], 400);
    if (!headerValue) continue;
    out[header] = headerValue;
  }
  return out;
}

function parseJsonObject(value) {
  const raw = normalizeText(value, 4000);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return normalizeHeaderMap(parsed);
  } catch (_error) {
    return {};
  }
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function hasDefined(obj, key) {
  return hasOwn(obj, key) && obj[key] !== undefined;
}

function fileExists(targetPath) {
  try {
    return Boolean(targetPath) && fs.existsSync(targetPath);
  } catch (_error) {
    return false;
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

function maskToken(value) {
  const token = String(value || "");
  if (!token) return "";
  if (token.length <= 10) {
    return "*".repeat(token.length);
  }
  return `${token.slice(0, 4)}${"*".repeat(Math.max(4, token.length - 8))}${token.slice(-4)}`;
}

function maskHeaderMap(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[String(key)] = maskToken(value);
  }
  return out;
}

function redactAugmentContextProviderPatch(patch = null) {
  if (!patch || typeof patch !== "object") {
    return patch;
  }
  const redacted = {
    ...patch
  };
  if (redacted.mcpAuthorization) {
    redacted.mcpAuthorization = maskToken(redacted.mcpAuthorization);
  }
  if (redacted.mcpHeaders && typeof redacted.mcpHeaders === "object") {
    redacted.mcpHeaders = maskHeaderMap(redacted.mcpHeaders);
  }
  return redacted;
}

function readEnvConfig() {
  const envHeaders = parseJsonObject(process.env.ASOLARIA_AUGMENT_CONTEXT_HEADERS_JSON || process.env.ASOLARIA_AUGMENT_HEADERS_JSON || "");
  const configuredPath = normalizePath(
    process.env.ASOLARIA_AUGMENT_CONTEXT_AUGGIE_PATH
    || process.env.ASOLARIA_AUGMENT_AUGGIE_PATH
    || ""
  );
  const workspaceRoot = normalizePath(
    process.env.ASOLARIA_AUGMENT_CONTEXT_WORKSPACE_ROOT
    || process.env.ASOLARIA_AUGMENT_WORKSPACE_ROOT
    || projectRoot
  );
  const modeRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_MODE || process.env.ASOLARIA_AUGMENT_MODE || "";
  const serverLabelRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_SERVER_LABEL || process.env.ASOLARIA_AUGMENT_SERVER_LABEL || "";
  const serverUrlRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_SERVER_URL || process.env.ASOLARIA_AUGMENT_SERVER_URL || "";
  const connectorIdRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_CONNECTOR_ID || process.env.ASOLARIA_AUGMENT_CONNECTOR_ID || "";
  const authorizationRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_AUTHORIZATION || process.env.ASOLARIA_AUGMENT_AUTHORIZATION || "";
  const allowedToolsRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_ALLOWED_TOOLS || process.env.ASOLARIA_AUGMENT_ALLOWED_TOOLS || "";
  const tokenReductionProfileRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_TOKEN_REDUCTION_PROFILE || process.env.ASOLARIA_AUGMENT_TOKEN_REDUCTION_PROFILE || "";
  const toolSchemaModeRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_TOOL_SCHEMA_MODE || process.env.ASOLARIA_AUGMENT_TOOL_SCHEMA_MODE || "";
  const contextTtlRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_CONTEXT_TTL_SECONDS || process.env.ASOLARIA_AUGMENT_CONTEXT_TTL_SECONDS || "";
  const wslDistroRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_WSL_DISTRO || process.env.ASOLARIA_AUGMENT_WSL_DISTRO || "";
  const enabledRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_ENABLED || process.env.ASOLARIA_AUGMENT_ENABLED || "";
  const useWslRaw = process.env.ASOLARIA_AUGMENT_CONTEXT_USE_WSL || process.env.ASOLARIA_AUGMENT_USE_WSL || "";

  const hasAny = Boolean(
    modeRaw
    || serverLabelRaw
    || serverUrlRaw
    || connectorIdRaw
    || authorizationRaw
    || allowedToolsRaw
    || tokenReductionProfileRaw
    || toolSchemaModeRaw
    || contextTtlRaw
    || wslDistroRaw
    || enabledRaw
    || useWslRaw
    || configuredPath
    || Object.keys(envHeaders).length > 0
    || workspaceRoot !== projectRoot
  );

  return {
    hasAny,
    value: {
      enabled: enabledRaw ? normalizeBool(enabledRaw, true) : undefined,
      mode: modeRaw ? normalizeMode(modeRaw, DEFAULT_MODE) : undefined,
      serverLabel: serverLabelRaw ? normalizeText(serverLabelRaw, 80) : undefined,
      serverUrl: serverUrlRaw ? normalizeBaseUrl(serverUrlRaw) : undefined,
      connectorId: connectorIdRaw ? normalizeText(connectorIdRaw, 220) : undefined,
      authorization: authorizationRaw ? normalizeText(authorizationRaw, 400) : undefined,
      headers: Object.keys(envHeaders).length > 0 ? envHeaders : undefined,
      allowedTools: allowedToolsRaw ? normalizeAllowedTools(allowedToolsRaw) : undefined,
      tokenReductionProfile: tokenReductionProfileRaw
        ? normalizeTokenReductionProfile(tokenReductionProfileRaw, DEFAULT_TOKEN_REDUCTION_PROFILE)
        : undefined,
      toolSchemaMode: toolSchemaModeRaw ? normalizeToolSchemaMode(toolSchemaModeRaw) : undefined,
      contextTtlSeconds: contextTtlRaw
        ? normalizeInt(contextTtlRaw, DEFAULT_CONTEXT_TTL_SECONDS, 60, 24 * 60 * 60)
        : undefined,
      workspaceRoot,
      useWsl: useWslRaw ? normalizeBool(useWslRaw, false) : undefined,
      wslDistro: wslDistroRaw ? normalizeText(wslDistroRaw, 120) : undefined,
      auggiePath: configuredPath || undefined
    }
  };
}

function readVaultConfig() {
  const secret = getSecret(AUGMENT_CONTEXT_SECRET_NAME, { namespace: "owner" });
  const value = secret?.value && typeof secret.value === "object" ? secret.value : {};
  return {
    value,
    updatedAt: secret?.updatedAt || null,
    configured: Boolean(secret)
  };
}

function readJsonFile(targetPath) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function readTextFile(targetPath) {
  try {
    return fs.readFileSync(targetPath, "utf8");
  } catch (_error) {
    return "";
  }
}

function getLocalBridgeRuntime() {
  const status = readJsonFile(AUGMENT_BRIDGE_STATUS_FILE);
  const localUrl = normalizeBaseUrl(status?.localUrl || "");
  const publicBaseUrl = normalizeBaseUrl(readTextFile(AUGMENT_BRIDGE_URL_FILE).trim());
  const publicMcpUrl = publicBaseUrl ? `${publicBaseUrl}/mcp` : "";
  const tokenFile = fileExists(AUGMENT_BRIDGE_TOKEN_FILE) ? AUGMENT_BRIDGE_TOKEN_FILE : "";
  return {
    available: Boolean(status?.ok && status?.upstream?.ready && localUrl),
    localUrl: localUrl || "",
    publicMcpUrl,
    tokenFile,
    mode: normalizeText(status?.upstream?.mode || "", 80) || "",
    note: normalizeText(status?.upstream?.note || "", 240) || "",
    startedAt: normalizeText(status?.startedAt || "", 80) || "",
    toolName: normalizeText(status?.upstream?.toolName || DEFAULT_ALLOWED_TOOLS[0], 120) || DEFAULT_ALLOWED_TOOLS[0]
  };
}

function resolveAuggiePath(configuredPath = "") {
  const explicit = normalizePath(configuredPath);
  if (fileExists(explicit)) {
    return explicit;
  }

  const tools = resolveToolPaths();
  const appData = process.env.APPDATA || "";
  const localAppData = tools.localAppData || process.env.LOCALAPPDATA || "";
  const candidates = [
    commandExists("auggie"),
    commandExists("auggie.cmd"),
    commandExists("auggie.exe"),
    appData ? path.join(appData, "npm", "auggie.cmd") : "",
    localAppData ? path.join(localAppData, "Programs", "auggie", "auggie.exe") : "",
    "C:\\nvm4w\\nodejs\\auggie.cmd"
  ]
    .map((candidate) => normalizePath(candidate))
    .filter(Boolean);

  return candidates.find((candidate) => fileExists(candidate)) || "";
}

function listWslDistros() {
  const tools = resolveToolPaths();
  if (!tools.wslPath || !fileExists(tools.wslPath)) {
    return {
      available: false,
      distros: [],
      defaultDistro: ""
    };
  }
  try {
    const result = childProcess.spawnSync(tools.wslPath, ["-l", "-q"], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 5000
    });
    const distros = String(result.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\0/g, "").trim())
      .filter(Boolean);
    return {
      available: true,
      distros,
      defaultDistro: distros[0] || ""
    };
  } catch (_error) {
    return {
      available: true,
      distros: [],
      defaultDistro: ""
    };
  }
}

function chooseToolSchemaMode(rawMode, config = {}) {
  const requested = normalizeToolSchemaMode(rawMode);
  if (requested) {
    return requested;
  }
  const hasSecrets = Boolean(config.authorization) || Object.keys(config.headers || {}).length > 0;
  if (hasSecrets) {
    return "full";
  }
  if (config.connectorId || config.serverUrl) {
    return "pointer";
  }
  return "compact";
}

function normalizeConfigValue(source = {}) {
  const raw = source && typeof source === "object" ? source : {};
  return {
    enabled: normalizeBool(raw.enabled, false),
    mode: normalizeMode(raw.mode, DEFAULT_MODE),
    serverLabel: normalizeText(raw.serverLabel || DEFAULT_SERVER_LABEL, 80) || DEFAULT_SERVER_LABEL,
    serverUrl: normalizeBaseUrl(raw.serverUrl || raw.url || ""),
    connectorId: normalizeText(raw.connectorId || "", 220),
    authorization: normalizeText(raw.authorization || raw.auth || "", 400),
    headers: normalizeHeaderMap(raw.headers),
    allowedTools: normalizeAllowedTools(raw.allowedTools),
    tokenReductionProfile: normalizeTokenReductionProfile(
      raw.tokenReductionProfile,
      DEFAULT_TOKEN_REDUCTION_PROFILE
    ),
    toolSchemaMode: normalizeToolSchemaMode(raw.toolSchemaMode),
    contextTtlSeconds: normalizeInt(
      raw.contextTtlSeconds,
      DEFAULT_CONTEXT_TTL_SECONDS,
      60,
      24 * 60 * 60
    ),
    workspaceRoot: normalizePath(raw.workspaceRoot || raw.workspacePath || projectRoot) || projectRoot,
    useWsl: normalizeBool(raw.useWsl, false),
    wslDistro: normalizeText(raw.wslDistro || "", 120),
    auggiePath: normalizePath(raw.auggiePath || "")
  };
}

function resolveAugmentContextConfig() {
  const vault = readVaultConfig();
  const env = readEnvConfig();
  const mergedRaw = {
    ...normalizeConfigValue(vault.value || {}),
    ...(env.hasAny ? Object.fromEntries(
      Object.entries(env.value || {}).filter(([, value]) => value !== undefined)
    ) : {})
  };
  const normalized = normalizeConfigValue(mergedRaw);
  const wsl = listWslDistros();
  if (normalized.useWsl && !normalized.wslDistro && wsl.defaultDistro) {
    normalized.wslDistro = wsl.defaultDistro;
  }
  normalized.auggiePath = resolveAuggiePath(normalized.auggiePath);
  normalized.toolSchemaMode = chooseToolSchemaMode(normalized.toolSchemaMode, normalized);
  return {
    ...normalized,
    source: env.hasAny ? "env" : vault.configured ? "vault" : "default",
    updatedAt: vault.updatedAt || null
  };
}

function buildAugmentContextProviderPatch(input = {}) {
  const overrides = input && typeof input === "object"
    ? Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
    : {};
  const resolved = {
    ...resolveAugmentContextConfig(),
    ...overrides
  };
  const mode = normalizeMode(resolved.mode, DEFAULT_MODE);
  if (mode !== "remote_mcp") {
    throw new Error("Augment apply requires mode=remote_mcp because the current external-provider runtime only supports remote MCP servers.");
  }
  const serverLabel = normalizeText(resolved.serverLabel || DEFAULT_SERVER_LABEL, 80) || DEFAULT_SERVER_LABEL;
  const serverUrl = normalizeBaseUrl(resolved.serverUrl || "");
  const connectorId = normalizeText(resolved.connectorId || "", 220);
  if (!serverUrl && !connectorId) {
    throw new Error("Augment remote MCP config requires serverUrl or connectorId.");
  }
  const headers = normalizeHeaderMap(resolved.headers);
  const authorization = normalizeText(resolved.authorization || "", 400);
  return {
    mode,
    mcpEnabled: normalizeBool(resolved.enabled, true),
    mcpServerLabel: serverLabel,
    mcpServerUrl: serverUrl || undefined,
    mcpConnectorId: connectorId || undefined,
    mcpAuthorization: authorization || undefined,
    mcpHeaders: Object.keys(headers).length ? headers : undefined,
    mcpAllowedTools: normalizeAllowedTools(resolved.allowedTools),
    mcpPreset: DEFAULT_PRESET,
    mcpApprovalMode: DEFAULT_APPROVAL_MODE,
    mcpDynamicAllowlistMax: 1,
    mcpContextTtlSeconds: normalizeInt(
      resolved.contextTtlSeconds,
      DEFAULT_CONTEXT_TTL_SECONDS,
      60,
      24 * 60 * 60
    ),
    mcpTokenReductionProfile: normalizeTokenReductionProfile(
      resolved.tokenReductionProfile,
      DEFAULT_TOKEN_REDUCTION_PROFILE
    ),
    mcpToolSchemaMode: chooseToolSchemaMode(resolved.toolSchemaMode, resolved)
  };
}

function buildLocalMcpInstructions(config) {
  const workspaceRoot = normalizePath(config.workspaceRoot || projectRoot) || projectRoot;
  const bridge = getLocalBridgeRuntime();
  if (bridge.available && bridge.localUrl) {
    return {
      recommended: "Use the local Asolaria MCP bridge. It is the owned runtime on this machine and does not require Auggie.",
      codexAddCommand: `codex mcp add augment-context --transport http \"${bridge.localUrl}\" --header \"Authorization: Bearer <bridge token>\"`,
      workspaceRoot,
      localUrl: bridge.localUrl,
      publicMcpUrl: bridge.publicMcpUrl || null,
      tokenFile: bridge.tokenFile || null,
      mode: bridge.mode || "local_workspace_search"
    };
  }
  const auggiePath = resolveAuggiePath(config.auggiePath || "");
  const executable = auggiePath || "auggie";
  const command = `codex mcp add augment-context -- \"${executable}\" --mcp --mcp-auto-workspace`;
  return {
    recommended: "Run Auggie locally as a sidecar for Codex sessions on the machine that owns the checked-out workspace.",
    codexAddCommand: command,
    workspaceRoot
  };
}

function getAugmentContextStatus() {
  const resolved = resolveAugmentContextConfig();
  const wsl = listWslDistros();
  const bridgeRuntime = getLocalBridgeRuntime();
  const workspaceRoot = normalizePath(resolved.workspaceRoot || projectRoot) || projectRoot;
  const workspaceExists = fileExists(workspaceRoot);
  const workspaceHasAugmentIgnore = fileExists(path.join(workspaceRoot, ".augmentignore"));
  const remoteConfigured = Boolean(resolved.serverLabel && (resolved.serverUrl || resolved.connectorId));
  const localRuntimeAvailable = Boolean(bridgeRuntime.available) || Boolean(resolved.auggiePath) || (resolved.useWsl && wsl.available);
  const warnings = [];

  if (resolved.mode === "remote_mcp" && !remoteConfigured) {
    warnings.push("Remote MCP mode is enabled but serverUrl/connectorId is missing.");
  }
  if (resolved.mode === "local_cli" && !localRuntimeAvailable) {
    warnings.push("Local bridge or Auggie runtime was not detected on this machine. Start the Asolaria bridge or switch to remote_mcp.");
  }
  if (resolved.mode === "local_cli") {
    warnings.push("Asolaria can surface the local read-only sidecar, but direct external-provider MCP apply currently requires remote_mcp.");
  }
  if (resolved.useWsl && !wsl.available) {
    warnings.push("useWsl is enabled but WSL was not detected.");
  }
  if (!workspaceExists) {
    warnings.push("workspaceRoot does not exist.");
  }
  if (workspaceExists && !workspaceHasAugmentIgnore) {
    warnings.push("workspaceRoot is missing .augmentignore. Indexing may include runtime or private state.");
  }

  let providerPatch = null;
  let applyReady = false;
  try {
    providerPatch = buildAugmentContextProviderPatch(resolved);
    applyReady = true;
  } catch (_error) {
    providerPatch = null;
    applyReady = false;
  }

  return {
    enabled: Boolean(resolved.enabled),
    configured: resolved.mode === "remote_mcp" ? remoteConfigured : localRuntimeAvailable,
    mode: resolved.mode,
    source: resolved.source,
    updatedAt: resolved.updatedAt || null,
    serverLabel: resolved.serverLabel || DEFAULT_SERVER_LABEL,
    serverUrl: resolved.serverUrl || null,
    connectorId: resolved.connectorId || null,
    authorizationHint: maskToken(resolved.authorization),
    headersConfigured: Object.keys(resolved.headers || {}).length > 0,
    allowedTools: normalizeAllowedTools(resolved.allowedTools),
    preset: DEFAULT_PRESET,
    approvalMode: DEFAULT_APPROVAL_MODE,
    tokenReductionProfile: normalizeTokenReductionProfile(
      resolved.tokenReductionProfile,
      DEFAULT_TOKEN_REDUCTION_PROFILE
    ),
    toolSchemaMode: chooseToolSchemaMode(resolved.toolSchemaMode, resolved),
    contextTtlSeconds: normalizeInt(
      resolved.contextTtlSeconds,
      DEFAULT_CONTEXT_TTL_SECONDS,
      60,
      24 * 60 * 60
    ),
    workspaceRoot,
    workspaceExists,
    workspaceHasAugmentIgnore,
    localRuntime: {
      available: localRuntimeAvailable,
      bridge: bridgeRuntime,
      auggiePath: resolved.auggiePath || null,
      useWsl: Boolean(resolved.useWsl),
      wslAvailable: Boolean(wsl.available),
      wslDistro: resolved.wslDistro || null,
      wslKnownDistros: wsl.distros
    },
    providerApplyReady: applyReady,
    providerPatch: redactAugmentContextProviderPatch(providerPatch),
    localMcp: buildLocalMcpInstructions(resolved),
    warnings
  };
}

function setAugmentContextConfig(input = {}) {
  if (input?.clear === true) {
    deleteSecret(AUGMENT_CONTEXT_SECRET_NAME, { namespace: "owner" });
    return getAugmentContextStatus();
  }

  const secret = getSecret(AUGMENT_CONTEXT_SECRET_NAME, { namespace: "owner" });
  const previous = secret?.value && typeof secret.value === "object" ? secret.value : {};
  const merged = {
    ...previous
  };

  if (hasDefined(input, "enabled")) {
    merged.enabled = normalizeBool(input.enabled, true);
  } else if (!hasOwn(merged, "enabled")) {
    merged.enabled = true;
  }
  if (hasDefined(input, "mode")) {
    merged.mode = normalizeMode(input.mode, DEFAULT_MODE);
  } else if (!hasOwn(merged, "mode")) {
    merged.mode = DEFAULT_MODE;
  }
  if (hasDefined(input, "serverLabel")) {
    merged.serverLabel = normalizeText(input.serverLabel || DEFAULT_SERVER_LABEL, 80) || DEFAULT_SERVER_LABEL;
  } else if (!hasOwn(merged, "serverLabel")) {
    merged.serverLabel = DEFAULT_SERVER_LABEL;
  }
  if (hasDefined(input, "serverUrl")) {
    merged.serverUrl = normalizeBaseUrl(input.serverUrl || input.url || "");
  }
  if (hasDefined(input, "connectorId")) {
    merged.connectorId = normalizeText(input.connectorId || "", 220);
  }
  if (hasDefined(input, "authorization")) {
    merged.authorization = normalizeText(input.authorization || input.auth || "", 400);
  }
  if (hasDefined(input, "headers")) {
    merged.headers = normalizeHeaderMap(input.headers);
  }
  if (hasDefined(input, "allowedTools")) {
    merged.allowedTools = normalizeAllowedTools(input.allowedTools);
  } else if (!hasOwn(merged, "allowedTools")) {
    merged.allowedTools = DEFAULT_ALLOWED_TOOLS.slice();
  }
  if (hasDefined(input, "tokenReductionProfile")) {
    merged.tokenReductionProfile = normalizeTokenReductionProfile(
      input.tokenReductionProfile,
      DEFAULT_TOKEN_REDUCTION_PROFILE
    );
  } else if (!hasOwn(merged, "tokenReductionProfile")) {
    merged.tokenReductionProfile = DEFAULT_TOKEN_REDUCTION_PROFILE;
  }
  if (hasDefined(input, "toolSchemaMode")) {
    merged.toolSchemaMode = normalizeToolSchemaMode(input.toolSchemaMode);
  }
  if (hasDefined(input, "contextTtlSeconds")) {
    merged.contextTtlSeconds = normalizeInt(
      input.contextTtlSeconds,
      DEFAULT_CONTEXT_TTL_SECONDS,
      60,
      24 * 60 * 60
    );
  } else if (!hasOwn(merged, "contextTtlSeconds")) {
    merged.contextTtlSeconds = DEFAULT_CONTEXT_TTL_SECONDS;
  }
  if (hasDefined(input, "workspaceRoot") || hasDefined(input, "workspacePath")) {
    merged.workspaceRoot = normalizePath(input.workspaceRoot || input.workspacePath || projectRoot) || projectRoot;
  } else if (!hasOwn(merged, "workspaceRoot")) {
    merged.workspaceRoot = projectRoot;
  }
  if (hasDefined(input, "useWsl")) {
    merged.useWsl = normalizeBool(input.useWsl, false);
  } else if (!hasOwn(merged, "useWsl")) {
    merged.useWsl = false;
  }
  if (hasDefined(input, "wslDistro")) {
    merged.wslDistro = normalizeText(input.wslDistro || "", 120);
  }
  if (hasDefined(input, "auggiePath")) {
    merged.auggiePath = normalizePath(input.auggiePath || "");
  }

  const payload = {
    enabled: normalizeBool(merged.enabled, true),
    mode: normalizeMode(merged.mode, DEFAULT_MODE),
    serverLabel: normalizeText(merged.serverLabel || DEFAULT_SERVER_LABEL, 80) || DEFAULT_SERVER_LABEL,
    serverUrl: normalizeBaseUrl(merged.serverUrl || ""),
    connectorId: normalizeText(merged.connectorId || "", 220),
    authorization: normalizeText(merged.authorization || "", 400),
    headers: normalizeHeaderMap(merged.headers),
    allowedTools: normalizeAllowedTools(merged.allowedTools),
    tokenReductionProfile: normalizeTokenReductionProfile(
      merged.tokenReductionProfile,
      DEFAULT_TOKEN_REDUCTION_PROFILE
    ),
    toolSchemaMode: normalizeToolSchemaMode(merged.toolSchemaMode),
    contextTtlSeconds: normalizeInt(
      merged.contextTtlSeconds,
      DEFAULT_CONTEXT_TTL_SECONDS,
      60,
      24 * 60 * 60
    ),
    workspaceRoot: normalizePath(merged.workspaceRoot || projectRoot) || projectRoot,
    useWsl: normalizeBool(merged.useWsl, false),
    wslDistro: normalizeText(merged.wslDistro || "", 120),
    auggiePath: normalizePath(merged.auggiePath || ""),
    updatedAt: new Date().toISOString()
  };

  setSecret(
    AUGMENT_CONTEXT_SECRET_NAME,
    payload,
    {
      app: "Asolaria",
      component: "augment-context",
      credentialOwner: "owner",
      actor: "owner",
      updatedBy: "api"
    },
    { namespace: "owner" }
  );

  return getAugmentContextStatus();
}

function manifest() {
  return {
    id: "augmentContext",
    version: "1.0.0",
    description: "Augment read-only context indexing sidecar — MCP bridge, context patching",
    capabilities: ["context_indexing", "mcp_bridge", "provider_patching", "status"],
    readScopes: ["codebase_index", "augment_status"],
    writeScopes: [],
    approvalRequired: false,
    healthCheck: true,
    retrySemantics: "none",
    timeoutMs: 15000,
    secretRequirements: ["augment MCP tunnel URL and token"],
    sideEffects: ["patches provider config for MCP routing"],
    failureModes: ["tunnel_unreachable", "mcp_handshake_failed", "context_stale"],
    emittedEvents: ["augment.connected", "augment.context_applied"]
  };
}

module.exports = {
  resolveAugmentContextConfig,
  buildAugmentContextProviderPatch,
  redactAugmentContextProviderPatch,
  getAugmentContextStatus,
  setAugmentContextConfig,
  manifest
};
