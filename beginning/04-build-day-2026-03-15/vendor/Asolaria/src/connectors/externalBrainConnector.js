const { getSecret, setSecret, deleteSecret } = require("../secureVault");

const PROVIDER_IDS = ["openai", "cursor", "antigravity"];
const EXTERNAL_SECRET_PREFIX = "integrations.external.";
const DEFAULT_API_STYLE = "openai_chat_completions";
const SUPPORTED_API_STYLES = new Set(["openai_chat_completions", "openai_responses"]);
const OFFICIAL_OPENAI_HOSTS = new Set(["api.openai.com"]);
const OFFICIAL_OPENAI_HOST_SUFFIXES = [".openai.azure.com"];
const MAX_MCP_ALLOWED_TOOLS = 64;
const DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX = 5;
const DEFAULT_MCP_CONTEXT_TTL_SECONDS = 30 * 60;
const MAX_MCP_CONTEXT_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_MCP_TOKEN_REDUCTION_PROFILE = "balanced";
const DEFAULT_MCP_PROMPT_TOKEN_LIMIT = 1600;
const MIN_MCP_PROMPT_TOKEN_LIMIT = 240;
const MAX_MCP_PROMPT_TOKEN_LIMIT = 12000;
const DEFAULT_MCP_TOOL_SCHEMA_MODE = "compact";
const MCP_TOOL_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const API_MODEL_FALLBACKS = Object.freeze({
  "gpt-5.3-codex": "gpt-5.2-codex",
  "gpt-5.3-codex-spark": "gpt-5.2-codex"
});
const mcpToolCatalogByProvider = new Map();
const mcpResponseContextByKey = new Map();
const READLIKE_VERBS = /\b(read|get|list|search|lookup|find|show|status|inspect|fetch|query|describe|summarize)\b/i;
const WRITELIKE_VERBS = /\b(write|edit|update|delete|create|send|post|upload|insert|replace|patch|remove|run|execute|deploy|restart|shutdown|approve|grant)\b/i;
const MCP_POLICY_PRESETS = Object.freeze({
  read_only: Object.freeze({
    approvalMode: "never",
    dynamicAllowlistMax: 12
  }),
  balanced: Object.freeze({
    approvalMode: "auto",
    dynamicAllowlistMax: 8
  }),
  write_guarded: Object.freeze({
    approvalMode: "always",
    dynamicAllowlistMax: 6
  })
});
const MCP_TOKEN_REDUCTION_PROFILES = Object.freeze({
  off: Object.freeze({
    promptTokenLimit: 0,
    toolSchemaMode: "full",
    dynamicAllowlistCap: MAX_MCP_ALLOWED_TOOLS
  }),
  balanced: Object.freeze({
    promptTokenLimit: 1600,
    toolSchemaMode: "compact",
    dynamicAllowlistCap: 8
  }),
  aggressive: Object.freeze({
    promptTokenLimit: 900,
    toolSchemaMode: "pointer",
    dynamicAllowlistCap: 5
  })
});

function normalizeProviderId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!PROVIDER_IDS.includes(id)) {
    return "";
  }
  return id;
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function normalizeApiPath(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function normalizeApiStyle(value, fallback = DEFAULT_API_STYLE) {
  const style = String(value || "").trim().toLowerCase();
  if (SUPPORTED_API_STYLES.has(style)) {
    return style;
  }
  return fallback;
}

function normalizeApiKey(value) {
  const key = String(value || "").trim();
  if (!key) return "";
  if (key.length < 16) return "";
  if (/\s/.test(key)) return "";
  return key;
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

function asNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizeText(value, maxLen = 240) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLen);
}

function normalizeList(value, maxItems = 64, maxItemLen = 120) {
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
    if (/[\r\n\t]/.test(item)) continue;
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

function normalizeMcpApprovalMode(value, fallback = "auto") {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "always" || mode === "never") {
    return mode;
  }
  if (mode === "auto" || mode === "smart" || mode === "default") {
    return "auto";
  }
  return fallback;
}

function normalizeMcpDynamicAllowlistMax(value, fallback = DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.min(MAX_MCP_ALLOWED_TOOLS, Number(fallback || DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX)));
  }
  return Math.max(0, Math.min(MAX_MCP_ALLOWED_TOOLS, Math.round(parsed)));
}

function normalizeMcpContextTtlSeconds(value, fallback = DEFAULT_MCP_CONTEXT_TTL_SECONDS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(60, Math.min(MAX_MCP_CONTEXT_TTL_SECONDS, Math.round(Number(fallback || DEFAULT_MCP_CONTEXT_TTL_SECONDS))));
  }
  return Math.max(60, Math.min(MAX_MCP_CONTEXT_TTL_SECONDS, Math.round(parsed)));
}

function normalizeMcpTokenReductionProfile(value, fallback = DEFAULT_MCP_TOKEN_REDUCTION_PROFILE) {
  const profile = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (MCP_TOKEN_REDUCTION_PROFILES[profile]) {
    return profile;
  }
  const fallbackKey = String(fallback || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (MCP_TOKEN_REDUCTION_PROFILES[fallbackKey]) {
    return fallbackKey;
  }
  return DEFAULT_MCP_TOKEN_REDUCTION_PROFILE;
}

function normalizeMcpPromptTokenLimit(value, fallback = DEFAULT_MCP_PROMPT_TOKEN_LIMIT) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(
      0,
      Math.min(MAX_MCP_PROMPT_TOKEN_LIMIT, Math.round(Number(fallback || DEFAULT_MCP_PROMPT_TOKEN_LIMIT)))
    );
  }
  return Math.max(0, Math.min(MAX_MCP_PROMPT_TOKEN_LIMIT, Math.round(parsed)));
}

function normalizeMcpToolSchemaMode(value, fallback = DEFAULT_MCP_TOOL_SCHEMA_MODE) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "full" || mode === "compact" || mode === "pointer") {
    return mode;
  }
  const fallbackMode = String(fallback || "").trim().toLowerCase();
  if (fallbackMode === "full" || fallbackMode === "compact" || fallbackMode === "pointer") {
    return fallbackMode;
  }
  return DEFAULT_MCP_TOOL_SCHEMA_MODE;
}

function normalizeMcpPresetName(value, fallback = "") {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (MCP_POLICY_PRESETS[raw]) {
    return raw;
  }
  const safeFallback = String(fallback || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (MCP_POLICY_PRESETS[safeFallback]) {
    return safeFallback;
  }
  return "";
}

function getExternalMcpPolicyPresets() {
  return MCP_POLICY_PRESETS;
}

function getExternalMcpTokenReductionProfiles() {
  return MCP_TOKEN_REDUCTION_PROFILES;
}

function defaultPathForStyle(apiStyle) {
  return apiStyle === "openai_responses" ? "/v1/responses" : "/v1/chat/completions";
}

function providerSecretName(providerId) {
  return `${EXTERNAL_SECRET_PREFIX}${providerId}`;
}

function defaultRequireOfficialApi(providerId) {
  return providerId === "antigravity";
}

function readProviderEnv(providerId) {
  const prefix = providerId.toUpperCase();
  return {
    enabled: normalizeBool(process.env[`ASOLARIA_${prefix}_ENABLED`], true),
    apiBaseUrl: normalizeBaseUrl(
      process.env[`ASOLARIA_${prefix}_API_URL`]
      || process.env[`ASOLARIA_${prefix}_API_BASE`]
      || ""
    ),
    apiPath: String(process.env[`ASOLARIA_${prefix}_API_PATH`] || "").trim(),
    apiStyle: normalizeApiStyle(process.env[`ASOLARIA_${prefix}_API_STYLE`] || "", DEFAULT_API_STYLE),
    model: String(process.env[`ASOLARIA_${prefix}_MODEL`] || "").trim(),
    organization: String(process.env[`ASOLARIA_${prefix}_ORGANIZATION`] || "").trim(),
    apiKey: normalizeApiKey(process.env[`ASOLARIA_${prefix}_API_KEY`] || "")
  };
}

function isOfficialApiEndpoint(baseUrl, apiStyle) {
  if (!baseUrl) {
    return false;
  }
  if (!SUPPORTED_API_STYLES.has(apiStyle)) {
    return false;
  }

  try {
    const parsed = new URL(baseUrl);
    const host = String(parsed.hostname || "").toLowerCase();
    if (parsed.protocol !== "https:") {
      return false;
    }
    if (OFFICIAL_OPENAI_HOSTS.has(host)) {
      return true;
    }
    return OFFICIAL_OPENAI_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch (_error) {
    return false;
  }
}

function resolveApiModelForRequest(provider, requestedModel) {
  const requested = String(requestedModel || provider?.model || "").trim();
  if (!requested) {
    return { model: "", fallbackFrom: "" };
  }

  const normalizedRequested = requested.toLowerCase();
  const mappedFallback = API_MODEL_FALLBACKS[normalizedRequested] || "";
  const allowGpt53ViaApi = normalizeBool(process.env.ASOLARIA_ALLOW_GPT53_CODEX_API, false);
  const shouldFallback = (
    !allowGpt53ViaApi
    && provider?.apiStyle === "openai_responses"
    && Boolean(provider?.officialApi)
    && Boolean(mappedFallback)
  );

  if (shouldFallback) {
    return {
      model: mappedFallback,
      fallbackFrom: requested
    };
  }

  return {
    model: requested,
    fallbackFrom: ""
  };
}

function extractTextFromResponse(body) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const openaiChoiceText = body?.choices?.[0]?.message?.content;
  if (typeof openaiChoiceText === "string" && openaiChoiceText.trim()) {
    return openaiChoiceText.trim();
  }
  if (Array.isArray(openaiChoiceText)) {
    const joined = openaiChoiceText
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  const responseApiText = body?.output_text;
  if (typeof responseApiText === "string" && responseApiText.trim()) {
    return responseApiText.trim();
  }

  const outputs = Array.isArray(body?.output) ? body.output : [];
  for (const item of outputs) {
    const contentParts = Array.isArray(item?.content) ? item.content : [];
    const text = contentParts
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n")
      .trim();
    if (text) {
      return text;
    }
  }

  const nestedText = body?.output?.[0]?.content?.[0]?.text;
  if (typeof nestedText === "string" && nestedText.trim()) {
    return nestedText.trim();
  }

  return "";
}

function pickFirst(source, keys, fallbackSource, fallbackKeys = keys, defaultValue = undefined) {
  if (source && typeof source === "object") {
    for (const key of keys) {
      if (hasOwn(source, key)) {
        return source[key];
      }
    }
  }
  if (fallbackSource && typeof fallbackSource === "object") {
    for (const key of fallbackKeys) {
      if (hasOwn(fallbackSource, key)) {
        return fallbackSource[key];
      }
    }
  }
  return defaultValue;
}

function normalizeAllowedTools(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Array.isArray(value.tool_names)) {
      return normalizeList(value.tool_names, MAX_MCP_ALLOWED_TOOLS, 120);
    }
    if (Array.isArray(value.names)) {
      return normalizeList(value.names, MAX_MCP_ALLOWED_TOOLS, 120);
    }
  }
  return normalizeList(value, MAX_MCP_ALLOWED_TOOLS, 120);
}

function normalizeMcpConfig(sourceValue = {}, fallbackValue = {}) {
  const source = sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)
    ? sourceValue
    : {};
  const fallback = fallbackValue && typeof fallbackValue === "object" && !Array.isArray(fallbackValue)
    ? fallbackValue
    : {};
  const rawPreset = normalizeText(
    pickFirst(
      source,
      ["preset", "policyPreset", "policy_preset", "presetName"],
      fallback,
      ["preset", "policyPreset", "policy_preset", "presetName"],
      ""
    ),
    48
  ).toLowerCase();
  const preset = normalizeMcpPresetName(rawPreset, fallback.preset);
  const presetInvalid = Boolean((rawPreset && !preset) || source.presetInvalid === true);
  const presetPolicy = preset ? MCP_POLICY_PRESETS[preset] : null;
  const enabled = normalizeBool(
    pickFirst(source, ["enabled"], fallback, ["enabled"], false),
    normalizeBool(fallback.enabled, false)
  );
  const serverLabel = normalizeText(
    pickFirst(
      source,
      ["serverLabel", "server_label", "label"],
      fallback,
      ["serverLabel", "server_label", "label"],
      ""
    ),
    80
  );
  const serverUrl = normalizeBaseUrl(
    pickFirst(
      source,
      ["serverUrl", "server_url", "url"],
      fallback,
      ["serverUrl", "server_url", "url"],
      ""
    )
  );
  const connectorId = normalizeText(
    pickFirst(
      source,
      ["connectorId", "connector_id"],
      fallback,
      ["connectorId", "connector_id"],
      ""
    ),
    180
  );
  const authorization = normalizeText(
    pickFirst(source, ["authorization", "auth"], fallback, ["authorization", "auth"], ""),
    400
  );
  const headers = normalizeHeaderMap(
    pickFirst(source, ["headers"], fallback, ["headers"], {})
  );
  const allowedTools = normalizeAllowedTools(
    pickFirst(
      source,
      ["allowedTools", "allowed_tools", "tool_names", "tools"],
      fallback,
      ["allowedTools", "allowed_tools", "tool_names", "tools"],
      []
    )
  );
  const approvalModeProvided = hasOwn(source, "approvalMode")
    || hasOwn(source, "requireApproval")
    || hasOwn(source, "require_approval");
  let approvalMode = normalizeMcpApprovalMode(
    pickFirst(
      source,
      ["approvalMode", "requireApproval", "require_approval"],
      fallback,
      ["approvalMode", "requireApproval", "require_approval"],
      "auto"
    ),
    "auto"
  );
  const dynamicAllowlistProvided = hasOwn(source, "dynamicAllowlistMax")
    || hasOwn(source, "dynamic_allowlist_max");
  let dynamicAllowlistMax = normalizeMcpDynamicAllowlistMax(
    pickFirst(
      source,
      ["dynamicAllowlistMax", "dynamic_allowlist_max"],
      fallback,
      ["dynamicAllowlistMax", "dynamic_allowlist_max"],
      DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX
    ),
    DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX
  );
  if (presetPolicy) {
    if (!approvalModeProvided) {
      approvalMode = normalizeMcpApprovalMode(presetPolicy.approvalMode, approvalMode);
    }
    if (!dynamicAllowlistProvided) {
      dynamicAllowlistMax = normalizeMcpDynamicAllowlistMax(
        presetPolicy.dynamicAllowlistMax,
        dynamicAllowlistMax
      );
    }
  }
  let tokenReductionProfile = normalizeMcpTokenReductionProfile(
    pickFirst(
      source,
      ["tokenReductionProfile", "token_reduction_profile"],
      fallback,
      ["tokenReductionProfile", "token_reduction_profile"],
      DEFAULT_MCP_TOKEN_REDUCTION_PROFILE
    ),
    DEFAULT_MCP_TOKEN_REDUCTION_PROFILE
  );
  const tokenReductionPolicy = MCP_TOKEN_REDUCTION_PROFILES[tokenReductionProfile] || MCP_TOKEN_REDUCTION_PROFILES[DEFAULT_MCP_TOKEN_REDUCTION_PROFILE];
  const promptTokenLimitProvided = hasOwn(source, "promptTokenLimit")
    || hasOwn(source, "prompt_token_limit");
  let promptTokenLimit = normalizeMcpPromptTokenLimit(
    pickFirst(
      source,
      ["promptTokenLimit", "prompt_token_limit"],
      fallback,
      ["promptTokenLimit", "prompt_token_limit"],
      DEFAULT_MCP_PROMPT_TOKEN_LIMIT
    ),
    DEFAULT_MCP_PROMPT_TOKEN_LIMIT
  );
  if (!promptTokenLimitProvided && tokenReductionPolicy) {
    promptTokenLimit = normalizeMcpPromptTokenLimit(
      tokenReductionPolicy.promptTokenLimit,
      promptTokenLimit
    );
  }
  const toolSchemaModeProvided = hasOwn(source, "toolSchemaMode")
    || hasOwn(source, "tool_schema_mode");
  let toolSchemaMode = normalizeMcpToolSchemaMode(
    pickFirst(
      source,
      ["toolSchemaMode", "tool_schema_mode"],
      fallback,
      ["toolSchemaMode", "tool_schema_mode"],
      DEFAULT_MCP_TOOL_SCHEMA_MODE
    ),
    DEFAULT_MCP_TOOL_SCHEMA_MODE
  );
  if (!toolSchemaModeProvided && tokenReductionPolicy) {
    toolSchemaMode = normalizeMcpToolSchemaMode(tokenReductionPolicy.toolSchemaMode, toolSchemaMode);
  }
  if (tokenReductionPolicy) {
    dynamicAllowlistMax = Math.min(
      dynamicAllowlistMax,
      normalizeMcpDynamicAllowlistMax(tokenReductionPolicy.dynamicAllowlistCap, dynamicAllowlistMax)
    );
  }
  const skillHints = normalizeList(
    pickFirst(
      source,
      ["skillHints", "skill_hints"],
      fallback,
      ["skillHints", "skill_hints"],
      []
    ),
    24,
    72
  );
  const webMcpHints = normalizeList(
    pickFirst(
      source,
      ["webMcpHints", "web_mcp_hints", "webHints", "web_hints"],
      fallback,
      ["webMcpHints", "web_mcp_hints", "webHints", "web_hints"],
      []
    ),
    24,
    72
  );
  const contextTtlSeconds = normalizeMcpContextTtlSeconds(
    pickFirst(
      source,
      ["contextTtlSeconds", "context_ttl_seconds"],
      fallback,
      ["contextTtlSeconds", "context_ttl_seconds"],
      DEFAULT_MCP_CONTEXT_TTL_SECONDS
    ),
    DEFAULT_MCP_CONTEXT_TTL_SECONDS
  );
  const configured = Boolean(serverLabel && (serverUrl || connectorId));
  const configError = enabled && !configured ? "missing_mcp_server_config" : "";

  return {
    enabled,
    configured,
    configError,
    serverLabel,
    serverUrl,
    connectorId,
    authorization,
    headers,
    allowedTools,
    approvalMode,
    dynamicAllowlistMax,
    tokenReductionProfile,
    promptTokenLimit,
    toolSchemaMode,
    skillHints,
    webMcpHints,
    contextTtlSeconds,
    preset,
    presetInvalid
  };
}

function buildMcpConfigPatch(input = {}) {
  const body = input && typeof input === "object" ? input : {};
  const hasDefined = (key) => hasOwn(body, key) && body[key] !== undefined;
  const nested = body.mcp && typeof body.mcp === "object" && !Array.isArray(body.mcp)
    ? body.mcp
    : null;
  const clear = normalizeBool(
    nested && hasOwn(nested, "clear")
      ? nested.clear
      : pickFirst(body, ["mcpClear", "clearMcp"], null, null, false),
    false
  );
  const hasAny = Boolean(
    nested
    || hasDefined("mcpEnabled")
    || hasDefined("mcpServerLabel")
    || hasDefined("mcpServerUrl")
    || hasDefined("mcpConnectorId")
    || hasDefined("mcpAuthorization")
    || hasDefined("mcpHeaders")
    || hasDefined("mcpAllowedTools")
    || hasDefined("mcpApprovalMode")
    || hasDefined("mcpDynamicAllowlistMax")
    || hasDefined("mcpContextTtlSeconds")
    || hasDefined("mcpTokenReductionProfile")
    || hasDefined("mcpPromptTokenLimit")
    || hasDefined("mcpToolSchemaMode")
    || hasDefined("mcpSkillHints")
    || hasDefined("mcpWebMcpHints")
    || hasDefined("mcpPreset")
    || hasDefined("mcpPolicyPreset")
    || clear
  );
  if (!hasAny) {
    return { hasPatch: false, clear: false, value: {} };
  }

  const raw = {};
  if (nested) {
    Object.assign(raw, nested);
  }
  if (hasDefined("mcpEnabled")) raw.enabled = body.mcpEnabled;
  if (hasDefined("mcpServerLabel")) raw.serverLabel = body.mcpServerLabel;
  if (hasDefined("mcpServerUrl")) raw.serverUrl = body.mcpServerUrl;
  if (hasDefined("mcpConnectorId")) raw.connectorId = body.mcpConnectorId;
  if (hasDefined("mcpAuthorization")) raw.authorization = body.mcpAuthorization;
  if (hasDefined("mcpHeaders")) raw.headers = body.mcpHeaders;
  if (hasDefined("mcpAllowedTools")) raw.allowedTools = body.mcpAllowedTools;
  if (hasDefined("mcpApprovalMode")) raw.approvalMode = body.mcpApprovalMode;
  if (hasDefined("mcpDynamicAllowlistMax")) raw.dynamicAllowlistMax = body.mcpDynamicAllowlistMax;
  if (hasDefined("mcpContextTtlSeconds")) raw.contextTtlSeconds = body.mcpContextTtlSeconds;
  if (hasDefined("mcpTokenReductionProfile")) raw.tokenReductionProfile = body.mcpTokenReductionProfile;
  if (hasDefined("mcpPromptTokenLimit")) raw.promptTokenLimit = body.mcpPromptTokenLimit;
  if (hasDefined("mcpToolSchemaMode")) raw.toolSchemaMode = body.mcpToolSchemaMode;
  if (hasDefined("mcpSkillHints")) raw.skillHints = body.mcpSkillHints;
  if (hasDefined("mcpWebMcpHints")) raw.webMcpHints = body.mcpWebMcpHints;
  if (hasDefined("mcpPreset")) raw.preset = body.mcpPreset;
  if (hasDefined("mcpPolicyPreset")) raw.preset = body.mcpPolicyPreset;

  return {
    hasPatch: true,
    clear,
    value: raw
  };
}

function buildMcpContextKey(providerId, contextKey) {
  const safeProviderId = String(providerId || "").trim().toLowerCase();
  const safeContextKey = normalizeText(contextKey, 180);
  if (!safeProviderId || !safeContextKey) {
    return "";
  }
  return `${safeProviderId}:${safeContextKey}`;
}

function pruneMcpCaches(nowMs = Date.now()) {
  for (const [key, value] of mcpToolCatalogByProvider.entries()) {
    const updatedAt = Number(value?.updatedAt || 0);
    if (!updatedAt || nowMs - updatedAt > MCP_TOOL_LIST_CACHE_TTL_MS) {
      mcpToolCatalogByProvider.delete(key);
    }
  }
  for (const [key, value] of mcpResponseContextByKey.entries()) {
    const expiresAt = Number(value?.expiresAt || 0);
    if (!expiresAt || nowMs >= expiresAt) {
      mcpResponseContextByKey.delete(key);
    }
  }
}

function cacheMcpToolNames(providerId, names = []) {
  const provider = String(providerId || "").trim().toLowerCase();
  const toolNames = normalizeAllowedTools(names);
  if (!provider || toolNames.length < 1) {
    return;
  }
  mcpToolCatalogByProvider.set(provider, {
    toolNames,
    updatedAt: Date.now()
  });
}

function getCachedMcpToolNames(providerId, contextKey = "") {
  pruneMcpCaches();
  const provider = String(providerId || "").trim().toLowerCase();
  if (!provider) {
    return [];
  }
  const names = [];
  const seen = new Set();

  const scopedKey = buildMcpContextKey(provider, contextKey);
  if (scopedKey) {
    const scoped = mcpResponseContextByKey.get(scopedKey);
    const scopedTools = Array.isArray(scoped?.toolNames) ? scoped.toolNames : [];
    for (const item of scopedTools) {
      const key = String(item || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      names.push(item);
      if (names.length >= MAX_MCP_ALLOWED_TOOLS) {
        return names;
      }
    }
  }

  const catalog = mcpToolCatalogByProvider.get(provider);
  const catalogTools = Array.isArray(catalog?.toolNames) ? catalog.toolNames : [];
  for (const item of catalogTools) {
    const key = String(item || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(item);
    if (names.length >= MAX_MCP_ALLOWED_TOOLS) {
      break;
    }
  }
  return names;
}

function getCachedPreviousResponseId(providerId, contextKey = "") {
  pruneMcpCaches();
  const scopedKey = buildMcpContextKey(providerId, contextKey);
  if (!scopedKey) {
    return "";
  }
  const entry = mcpResponseContextByKey.get(scopedKey);
  return normalizeText(entry?.previousResponseId || "", 220);
}

function cachePreviousResponse(providerId, contextKey, previousResponseId, ttlSeconds) {
  const scopedKey = buildMcpContextKey(providerId, contextKey);
  const responseId = normalizeText(previousResponseId, 220);
  if (!scopedKey || !responseId) {
    return;
  }
  const ttlMs = normalizeMcpContextTtlSeconds(ttlSeconds, DEFAULT_MCP_CONTEXT_TTL_SECONDS) * 1000;
  const previous = mcpResponseContextByKey.get(scopedKey);
  mcpResponseContextByKey.set(scopedKey, {
    ...previous,
    previousResponseId: responseId,
    updatedAt: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
}

function cacheScopedToolNames(providerId, contextKey, names, ttlSeconds) {
  const scopedKey = buildMcpContextKey(providerId, contextKey);
  const toolNames = normalizeAllowedTools(names);
  if (!scopedKey || toolNames.length < 1) {
    return;
  }
  const ttlMs = normalizeMcpContextTtlSeconds(ttlSeconds, DEFAULT_MCP_CONTEXT_TTL_SECONDS) * 1000;
  const previous = mcpResponseContextByKey.get(scopedKey);
  mcpResponseContextByKey.set(scopedKey, {
    ...previous,
    toolNames,
    updatedAt: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
}

function summarizeMcpResponseContextEntry(key, value) {
  const rawKey = String(key || "");
  const splitAt = rawKey.indexOf(":");
  const provider = splitAt > 0 ? rawKey.slice(0, splitAt) : rawKey;
  const toolNames = normalizeAllowedTools(value?.toolNames || []);
  const hasPreviousResponseId = Boolean(normalizeText(value?.previousResponseId || "", 220));
  const updatedAt = Number(value?.updatedAt || 0);
  const expiresAt = Number(value?.expiresAt || 0);
  const ttlSecondsRemaining = expiresAt > 0
    ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    : 0;
  return {
    provider: normalizeProviderId(provider) || provider,
    toolCount: toolNames.length,
    hasPreviousResponseId,
    updatedAt: updatedAt > 0 ? new Date(updatedAt).toISOString() : null,
    expiresAt: expiresAt > 0 ? new Date(expiresAt).toISOString() : null,
    ttlSecondsRemaining
  };
}

function getExternalMcpCacheStatus() {
  pruneMcpCaches();
  const providerCatalog = [];
  for (const [provider, value] of mcpToolCatalogByProvider.entries()) {
    const toolNames = normalizeAllowedTools(value?.toolNames || []);
    providerCatalog.push({
      provider,
      toolCount: toolNames.length,
      updatedAt: Number(value?.updatedAt || 0) > 0
        ? new Date(Number(value.updatedAt)).toISOString()
        : null
    });
  }
  providerCatalog.sort((a, b) => a.provider.localeCompare(b.provider));

  const scopedContexts = [];
  for (const [key, value] of mcpResponseContextByKey.entries()) {
    scopedContexts.push(summarizeMcpResponseContextEntry(key, value));
  }
  scopedContexts.sort((a, b) => {
    if (a.provider !== b.provider) {
      return String(a.provider || "").localeCompare(String(b.provider || ""));
    }
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  return {
    providerCatalogCount: providerCatalog.length,
    scopedContextCount: scopedContexts.length,
    providerCatalog,
    scopedContexts
  };
}

function clearExternalMcpCache(options = {}) {
  pruneMcpCaches();
  const provider = normalizeProviderId(options.provider || options.providerId || "");
  const contextKey = normalizeText(options.contextKey || options.mcpContextKey || "", 180);
  let removedProviderCatalog = 0;
  let removedContexts = 0;

  if (!provider && !contextKey) {
    removedProviderCatalog = mcpToolCatalogByProvider.size;
    removedContexts = mcpResponseContextByKey.size;
    mcpToolCatalogByProvider.clear();
    mcpResponseContextByKey.clear();
    return {
      scope: "all",
      removedProviderCatalog,
      removedContexts
    };
  }

  if (provider) {
    if (mcpToolCatalogByProvider.delete(provider)) {
      removedProviderCatalog += 1;
    }
  }

  if (provider && contextKey) {
    const scopedKey = buildMcpContextKey(provider, contextKey);
    if (scopedKey && mcpResponseContextByKey.delete(scopedKey)) {
      removedContexts += 1;
    }
  } else if (provider) {
    for (const key of Array.from(mcpResponseContextByKey.keys())) {
      if (!String(key || "").startsWith(`${provider}:`)) continue;
      mcpResponseContextByKey.delete(key);
      removedContexts += 1;
    }
  } else if (contextKey) {
    for (const key of Array.from(mcpResponseContextByKey.keys())) {
      const splitAt = String(key || "").indexOf(":");
      const suffix = splitAt >= 0 ? String(key).slice(splitAt + 1) : "";
      if (suffix !== contextKey) continue;
      mcpResponseContextByKey.delete(key);
      removedContexts += 1;
    }
  }

  return {
    scope: provider && contextKey
      ? "provider_context"
      : provider
        ? "provider"
        : "context",
    provider: provider || null,
    contextKey: contextKey || null,
    removedProviderCatalog,
    removedContexts
  };
}

function collectMcpToolNamesDeep(node, out, seen) {
  if (!node) return;
  if (typeof node !== "object") return;
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      collectMcpToolNamesDeep(item, out, seen);
      if (out.size >= MAX_MCP_ALLOWED_TOOLS) {
        return;
      }
    }
    return;
  }

  const maybeToolArrays = [];
  if (Array.isArray(node.tools)) maybeToolArrays.push(node.tools);
  if (Array.isArray(node.available_tools)) maybeToolArrays.push(node.available_tools);
  if (Array.isArray(node.tool_names)) maybeToolArrays.push(node.tool_names);
  if (Array.isArray(node.result?.tools)) maybeToolArrays.push(node.result.tools);
  if (Array.isArray(node.result?.available_tools)) maybeToolArrays.push(node.result.available_tools);
  if (Array.isArray(node.content?.tools)) maybeToolArrays.push(node.content.tools);

  for (const list of maybeToolArrays) {
    for (const item of list) {
      let name = "";
      if (typeof item === "string") {
        name = item;
      } else if (item && typeof item === "object") {
        name = item.name || item.tool_name || item.id || "";
      }
      const normalized = normalizeText(name, 120);
      if (!normalized) continue;
      out.add(normalized);
      if (out.size >= MAX_MCP_ALLOWED_TOOLS) {
        return;
      }
    }
  }

  for (const value of Object.values(node)) {
    if (!value || typeof value !== "object") continue;
    collectMcpToolNamesDeep(value, out, seen);
    if (out.size >= MAX_MCP_ALLOWED_TOOLS) {
      return;
    }
  }
}

function extractMcpToolNamesFromResponse(body) {
  const found = new Set();
  collectMcpToolNamesDeep(body, found, new Set());
  return normalizeAllowedTools(Array.from(found));
}

function selectDynamicAllowedTools(prompt, availableTools = [], maxItems = DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX, options = {}) {
  const tools = normalizeAllowedTools(availableTools);
  const limit = normalizeMcpDynamicAllowlistMax(maxItems, DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX);
  if (tools.length < 1 || limit < 1) {
    return [];
  }
  if (tools.length <= limit) {
    return tools;
  }

  const promptText = String(prompt || "");
  const skillHints = normalizeList(options.skillHints, 24, 72);
  const webMcpHints = normalizeList(options.webMcpHints, 24, 72);
  const queryText = [promptText, ...skillHints, ...webMcpHints].filter(Boolean).join(" ");
  const queryTokens = queryText
    .toLowerCase()
    .match(/[a-z0-9_:-]{3,}/g) || [];
  const uniqueQueryTokens = Array.from(new Set(queryTokens)).slice(0, 60);

  const scored = tools.map((name) => {
    const lower = String(name || "").toLowerCase();
    let score = 0;
    for (const token of uniqueQueryTokens) {
      if (!token) continue;
      if (lower === token) score += 20;
      else if (lower.startsWith(token)) score += 8;
      else if (lower.includes(token)) score += 4;
    }
    if (READLIKE_VERBS.test(lower) && READLIKE_VERBS.test(queryText)) score += 2;
    if (WRITELIKE_VERBS.test(lower) && WRITELIKE_VERBS.test(queryText)) score += 5;
    return { name, score };
  });

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  const selected = scored
    .slice(0, limit)
    .map((item) => item.name);
  return normalizeAllowedTools(selected);
}

function inferMcpRequireApproval(prompt = "", allowedTools = []) {
  const intentText = `${String(prompt || "")}\n${normalizeAllowedTools(allowedTools).join(" ")}`;
  const wantsWrite = WRITELIKE_VERBS.test(intentText);
  const wantsRead = READLIKE_VERBS.test(intentText);
  if (wantsWrite && wantsRead) {
    const writeTools = normalizeAllowedTools(allowedTools).filter((name) => WRITELIKE_VERBS.test(name));
    const readTools = normalizeAllowedTools(allowedTools).filter((name) => !WRITELIKE_VERBS.test(name));
    if (writeTools.length > 0 && readTools.length > 0) {
      return {
        always: { tool_names: writeTools },
        never: { tool_names: readTools }
      };
    }
    return "always";
  }
  if (wantsWrite) {
    return "always";
  }
  return "never";
}

function buildMcpRuntime(provider, payload = {}, prompt = "") {
  if (!provider || provider.apiStyle !== "openai_responses") {
    return null;
  }

  const providerMcp = normalizeMcpConfig(provider.mcp || {}, {});
  const patch = buildMcpConfigPatch(payload);
  const runtimeMcp = patch.hasPatch
    ? normalizeMcpConfig(patch.value, providerMcp)
    : providerMcp;
  if (runtimeMcp.presetInvalid) {
    throw new Error(`Invalid MCP preset override. Allowed: ${Object.keys(MCP_POLICY_PRESETS).join(", ")}.`);
  }
  const enabled = patch.hasPatch && patch.clear ? false : runtimeMcp.enabled;
  if (!enabled) {
    return null;
  }
  if (!runtimeMcp.configured) {
    throw new Error(`${provider.id} MCP is enabled but missing server_label and server_url/connector_id.`);
  }

  const contextKey = normalizeText(
    pickFirst(
      payload,
      ["mcpContextKey", "mcp_context_key", "contextKey", "context_key"],
      payload?.mcp,
      ["contextKey", "context_key"],
      ""
    ),
    180
  );
  const explicitAllowedTools = normalizeAllowedTools(
    pickFirst(
      payload,
      ["mcpAllowedTools", "allowedTools", "allowed_tools", "tool_names"],
      payload?.mcp,
      ["allowedTools", "allowed_tools", "tool_names"],
      runtimeMcp.allowedTools
    )
  );
  const dynamicAllowlistMax = normalizeMcpDynamicAllowlistMax(
    pickFirst(
      payload,
      ["mcpDynamicAllowlistMax", "dynamicAllowlistMax", "dynamic_allowlist_max"],
      payload?.mcp,
      ["dynamicAllowlistMax", "dynamic_allowlist_max"],
      runtimeMcp.dynamicAllowlistMax
    ),
    runtimeMcp.dynamicAllowlistMax
  );
  const tokenReductionProfile = normalizeMcpTokenReductionProfile(
    pickFirst(
      payload,
      ["mcpTokenReductionProfile", "tokenReductionProfile", "token_reduction_profile"],
      payload?.mcp,
      ["tokenReductionProfile", "token_reduction_profile"],
      runtimeMcp.tokenReductionProfile
    ),
    runtimeMcp.tokenReductionProfile
  );
  const tokenReductionPolicy = MCP_TOKEN_REDUCTION_PROFILES[tokenReductionProfile] || MCP_TOKEN_REDUCTION_PROFILES[DEFAULT_MCP_TOKEN_REDUCTION_PROFILE];
  const promptTokenLimit = normalizeMcpPromptTokenLimit(
    pickFirst(
      payload,
      ["mcpPromptTokenLimit", "promptTokenLimit", "prompt_token_limit"],
      payload?.mcp,
      ["promptTokenLimit", "prompt_token_limit"],
      runtimeMcp.promptTokenLimit
    ),
    runtimeMcp.promptTokenLimit
  );
  const toolSchemaMode = normalizeMcpToolSchemaMode(
    pickFirst(
      payload,
      ["mcpToolSchemaMode", "toolSchemaMode", "tool_schema_mode"],
      payload?.mcp,
      ["toolSchemaMode", "tool_schema_mode"],
      runtimeMcp.toolSchemaMode
    ),
    runtimeMcp.toolSchemaMode
  );
  const skillHints = normalizeList(
    pickFirst(
      payload,
      ["mcpSkillHints", "skillHints", "skill_hints"],
      payload?.mcp,
      ["skillHints", "skill_hints"],
      runtimeMcp.skillHints
    ),
    24,
    72
  );
  const webMcpHints = normalizeList(
    pickFirst(
      payload,
      ["mcpWebMcpHints", "webMcpHints", "web_mcp_hints", "webHints", "web_hints"],
      payload?.mcp,
      ["webMcpHints", "web_mcp_hints", "webHints", "web_hints"],
      runtimeMcp.webMcpHints
    ),
    24,
    72
  );
  const effectiveDynamicAllowlistMax = Math.min(
    dynamicAllowlistMax,
    normalizeMcpDynamicAllowlistMax(tokenReductionPolicy.dynamicAllowlistCap, dynamicAllowlistMax)
  );

  let allowedTools = explicitAllowedTools;
  if (allowedTools.length < 1 && effectiveDynamicAllowlistMax > 0) {
    const catalog = getCachedMcpToolNames(provider.id, contextKey);
    allowedTools = selectDynamicAllowedTools(prompt, catalog, effectiveDynamicAllowlistMax, {
      skillHints,
      webMcpHints
    });
  }

  const approvalMode = normalizeMcpApprovalMode(
    pickFirst(
      payload,
      ["mcpApprovalMode", "mcpRequireApproval", "requireApproval", "require_approval"],
      payload?.mcp,
      ["approvalMode", "requireApproval", "require_approval"],
      runtimeMcp.approvalMode
    ),
    runtimeMcp.approvalMode
  );
  const requireApproval = approvalMode === "auto"
    ? inferMcpRequireApproval(prompt, allowedTools)
    : approvalMode;

  const previousResponseId = contextKey
    ? getCachedPreviousResponseId(provider.id, contextKey)
    : "";

  return {
    enabled: true,
    serverLabel: runtimeMcp.serverLabel,
    serverUrl: runtimeMcp.serverUrl,
    connectorId: runtimeMcp.connectorId,
    authorization: runtimeMcp.authorization,
    headers: runtimeMcp.headers,
    allowedTools,
    requireApproval,
    contextKey,
    preset: runtimeMcp.preset || "",
    tokenReductionProfile,
    promptTokenLimit,
    toolSchemaMode,
    skillHints,
    webMcpHints,
    contextTtlSeconds: runtimeMcp.contextTtlSeconds,
    previousResponseId
  };
}

function persistMcpResponseState(provider, mcpRuntime, body) {
  if (!provider || !mcpRuntime || !body || typeof body !== "object") {
    return;
  }
  const responseId = normalizeText(body.id || body.response?.id || "", 220);
  if (mcpRuntime.contextKey && responseId) {
    cachePreviousResponse(provider.id, mcpRuntime.contextKey, responseId, mcpRuntime.contextTtlSeconds);
  }

  const discoveredTools = extractMcpToolNamesFromResponse(body);
  if (discoveredTools.length > 0) {
    cacheMcpToolNames(provider.id, discoveredTools);
    if (mcpRuntime.contextKey) {
      cacheScopedToolNames(
        provider.id,
        mcpRuntime.contextKey,
        discoveredTools,
        mcpRuntime.contextTtlSeconds
      );
    }
  }
}

function providerConfig(id) {
  const providerId = normalizeProviderId(id);
  if (!providerId) return null;

  const env = readProviderEnv(providerId);
  const secret = getSecret(providerSecretName(providerId), { namespace: "owner" });
  const secretValue = secret?.value && typeof secret.value === "object" ? secret.value : {};

  const apiStyle = normalizeApiStyle(
    secretValue.apiStyle || secretValue.mode || secretValue.format || env.apiStyle,
    DEFAULT_API_STYLE
  );
  const apiPath = normalizeApiPath(
    secretValue.apiPath || secretValue.path || env.apiPath,
    defaultPathForStyle(apiStyle)
  );
  const apiBaseUrl = normalizeBaseUrl(
    secretValue.apiBaseUrl || secretValue.baseUrl || secretValue.apiUrl || env.apiBaseUrl
  );
  const model = String(secretValue.model || env.model || "").trim();
  const apiKey = normalizeApiKey(
    secretValue.apiKey || secretValue.token || secretValue.key || ""
  );
  const enabled = normalizeBool(secretValue.enabled, env.enabled);
  const organization = String(secretValue.organization || env.organization || "").trim();
  const requireOfficialApi = normalizeBool(
    secretValue.requireOfficialApi,
    defaultRequireOfficialApi(providerId)
  );
  const mcp = normalizeMcpConfig(
    secretValue.mcp || {
      enabled: secretValue.mcpEnabled,
      serverLabel: secretValue.mcpServerLabel,
      serverUrl: secretValue.mcpServerUrl,
      connectorId: secretValue.mcpConnectorId,
      authorization: secretValue.mcpAuthorization,
      headers: secretValue.mcpHeaders,
      allowedTools: secretValue.mcpAllowedTools,
      approvalMode: secretValue.mcpApprovalMode,
      dynamicAllowlistMax: secretValue.mcpDynamicAllowlistMax,
      contextTtlSeconds: secretValue.mcpContextTtlSeconds,
      tokenReductionProfile: secretValue.mcpTokenReductionProfile,
      promptTokenLimit: secretValue.mcpPromptTokenLimit,
      toolSchemaMode: secretValue.mcpToolSchemaMode,
      skillHints: secretValue.mcpSkillHints,
      webMcpHints: secretValue.mcpWebMcpHints
    },
    {}
  );
  const mcpUnsupportedStyle = mcp.enabled && apiStyle !== "openai_responses";
  const mcpConfigError = mcp.presetInvalid
    ? "invalid_mcp_preset"
    : !mcp.enabled
      ? ""
      : mcpUnsupportedStyle
        ? "mcp_requires_openai_responses"
        : mcp.configError || "";
  const officialApi = isOfficialApiEndpoint(apiBaseUrl, apiStyle);
  const configured = Boolean(apiBaseUrl && apiKey && model && (!requireOfficialApi || officialApi));
  const configError = !apiBaseUrl || !apiKey || !model
    ? "missing_config"
    : requireOfficialApi && !officialApi
      ? "non_official_api_endpoint"
      : "";

  return {
    id: providerId,
    enabled,
    configured,
    source: secret ? "vault" : "none",
    updatedAt: secret?.updatedAt || null,
    apiStyle,
    apiBaseUrl,
    apiPath,
    baseUrl: apiBaseUrl,
    path: apiPath,
    model,
    apiKey,
    organization,
    requireOfficialApi,
    officialApi,
    configError,
    mcp: {
      ...mcp,
      configError: mcpConfigError
    },
    legacyEnvApiKeyDetected: Boolean(env.apiKey)
  };
}

function listConfiguredExternalProviders() {
  return PROVIDER_IDS
    .map((id) => providerConfig(id))
    .filter((provider) => provider && provider.enabled && provider.configured);
}

function findProviderById(id) {
  const requested = normalizeProviderId(id);
  if (!requested) {
    return null;
  }
  return providerConfig(requested);
}

function getExternalProvider(id) {
  const provider = findProviderById(id);
  if (!provider) {
    throw new Error(`Unsupported external provider: ${id}`);
  }
  if (!provider.enabled) {
    throw new Error(`${provider.id} provider is disabled.`);
  }
  if (!provider.apiBaseUrl || !provider.apiKey || !provider.model) {
    throw new Error(`${provider.id} provider is not configured.`);
  }
  if (provider.requireOfficialApi && !provider.officialApi) {
    throw new Error(`${provider.id} provider must use an official API endpoint.`);
  }
  if (provider.mcp?.enabled && provider.mcp?.configError) {
    throw new Error(`${provider.id} MCP config error: ${provider.mcp.configError}`);
  }
  return provider;
}

function statusShapeFromConfig(provider) {
  const warning = provider.legacyEnvApiKeyDetected
    ? "Legacy env API key detected but ignored. Store API keys in the encrypted vault only."
    : "";
  const mcp = provider.mcp && typeof provider.mcp === "object" ? provider.mcp : {};
  return {
    id: provider.id,
    configured: Boolean(provider.configured),
    enabled: Boolean(provider.enabled),
    model: provider.model || null,
    baseUrl: provider.apiBaseUrl || null,
    apiPath: provider.apiPath || null,
    organization: provider.organization || null,
    apiStyle: provider.apiStyle || DEFAULT_API_STYLE,
    officialApi: Boolean(provider.officialApi),
    requireOfficialApi: Boolean(provider.requireOfficialApi),
    source: provider.source || "none",
    updatedAt: provider.updatedAt || null,
    configError: provider.configError || null,
    mcpEnabled: Boolean(mcp.enabled),
    mcpConfigured: Boolean(mcp.configured),
    mcpConfigError: mcp.configError || null,
    mcpServerLabel: mcp.serverLabel || null,
    mcpServerUrl: mcp.serverUrl || null,
    mcpConnectorId: mcp.connectorId || null,
    mcpAllowedToolsCount: Array.isArray(mcp.allowedTools) ? mcp.allowedTools.length : 0,
    mcpPreset: mcp.preset || null,
    mcpApprovalMode: mcp.approvalMode || "auto",
    mcpDynamicAllowlistMax: normalizeMcpDynamicAllowlistMax(mcp.dynamicAllowlistMax, DEFAULT_MCP_DYNAMIC_ALLOWLIST_MAX),
    mcpContextTtlSeconds: normalizeMcpContextTtlSeconds(mcp.contextTtlSeconds, DEFAULT_MCP_CONTEXT_TTL_SECONDS),
    mcpTokenReductionProfile: normalizeMcpTokenReductionProfile(
      mcp.tokenReductionProfile,
      DEFAULT_MCP_TOKEN_REDUCTION_PROFILE
    ),
    mcpPromptTokenLimit: normalizeMcpPromptTokenLimit(
      mcp.promptTokenLimit,
      DEFAULT_MCP_PROMPT_TOKEN_LIMIT
    ),
    mcpToolSchemaMode: normalizeMcpToolSchemaMode(
      mcp.toolSchemaMode,
      DEFAULT_MCP_TOOL_SCHEMA_MODE
    ),
    mcpSkillHintsCount: Array.isArray(mcp.skillHints) ? mcp.skillHints.length : 0,
    mcpWebMcpHintsCount: Array.isArray(mcp.webMcpHints) ? mcp.webMcpHints.length : 0,
    warning: warning || null
  };
}

function getExternalProviderStatus() {
  return PROVIDER_IDS
    .map((id) => providerConfig(id))
    .filter(Boolean)
    .map((provider) => statusShapeFromConfig(provider));
}

function getExternalProviderStatusById(id) {
  const wanted = normalizeProviderId(id);
  if (!wanted) {
    return null;
  }
  return getExternalProviderStatus().find((item) => item.id === wanted) || null;
}

function setExternalProviderConfig(input = {}) {
  const providerId = normalizeProviderId(input.provider || input.id);
  if (!providerId) {
    throw new Error("provider is required (cursor or antigravity).");
  }

  const clear = normalizeBool(input.clear, false);
  if (clear) {
    deleteSecret(providerSecretName(providerId), { namespace: "owner" });
    return getExternalProviderStatusById(providerId);
  }

  const secret = getSecret(providerSecretName(providerId), { namespace: "owner" });
  const previous = secret?.value && typeof secret.value === "object" ? secret.value : {};
  const merged = {
    ...previous
  };

  if (input.enabled !== undefined) {
    merged.enabled = normalizeBool(input.enabled, true);
  } else if (merged.enabled === undefined) {
    merged.enabled = true;
  }

  if (input.apiStyle !== undefined || input.style !== undefined || input.mode !== undefined) {
    merged.apiStyle = normalizeApiStyle(input.apiStyle || input.style || input.mode, DEFAULT_API_STYLE);
  } else {
    merged.apiStyle = normalizeApiStyle(merged.apiStyle, DEFAULT_API_STYLE);
  }

  if (input.apiBaseUrl !== undefined || input.baseUrl !== undefined || input.apiUrl !== undefined || input.url !== undefined) {
    const nextUrl = normalizeBaseUrl(input.apiBaseUrl || input.baseUrl || input.apiUrl || input.url);
    if (!nextUrl) {
      throw new Error("apiBaseUrl is required when updating external provider config.");
    }
    merged.apiBaseUrl = nextUrl;
  } else {
    merged.apiBaseUrl = normalizeBaseUrl(merged.apiBaseUrl || merged.baseUrl || merged.apiUrl || "");
  }

  if (input.apiPath !== undefined || input.path !== undefined) {
    merged.apiPath = normalizeApiPath(input.apiPath || input.path, defaultPathForStyle(merged.apiStyle));
  } else {
    merged.apiPath = normalizeApiPath(merged.apiPath || merged.path, defaultPathForStyle(merged.apiStyle));
  }

  if (input.model !== undefined) {
    const model = String(input.model || "").trim();
    if (!model) {
      throw new Error("model is required.");
    }
    merged.model = model;
  } else {
    merged.model = String(merged.model || "").trim();
  }

  if (input.organization !== undefined) {
    merged.organization = String(input.organization || "").trim();
  } else {
    merged.organization = String(merged.organization || "").trim();
  }

  if (input.requireOfficialApi !== undefined) {
    merged.requireOfficialApi = normalizeBool(input.requireOfficialApi, defaultRequireOfficialApi(providerId));
  } else if (merged.requireOfficialApi === undefined) {
    merged.requireOfficialApi = defaultRequireOfficialApi(providerId);
  } else {
    merged.requireOfficialApi = normalizeBool(merged.requireOfficialApi, defaultRequireOfficialApi(providerId));
  }

  const providedApiKey = input.apiKey !== undefined || input.token !== undefined || input.key !== undefined;
  if (providedApiKey) {
    const apiKey = normalizeApiKey(input.apiKey || input.token || input.key);
    if (!apiKey) {
      throw new Error("A valid API key is required.");
    }
    merged.apiKey = apiKey;
  } else {
    merged.apiKey = normalizeApiKey(merged.apiKey || merged.token || merged.key || "");
  }

  const previousMcp = normalizeMcpConfig(
    previous.mcp || {
      enabled: previous.mcpEnabled,
      serverLabel: previous.mcpServerLabel,
      serverUrl: previous.mcpServerUrl,
      connectorId: previous.mcpConnectorId,
      authorization: previous.mcpAuthorization,
      headers: previous.mcpHeaders,
      allowedTools: previous.mcpAllowedTools,
      approvalMode: previous.mcpApprovalMode,
      dynamicAllowlistMax: previous.mcpDynamicAllowlistMax,
      contextTtlSeconds: previous.mcpContextTtlSeconds,
      tokenReductionProfile: previous.mcpTokenReductionProfile,
      promptTokenLimit: previous.mcpPromptTokenLimit,
      toolSchemaMode: previous.mcpToolSchemaMode,
      skillHints: previous.mcpSkillHints,
      webMcpHints: previous.mcpWebMcpHints
    },
    {}
  );
  const mcpPatch = buildMcpConfigPatch(input);
  if (mcpPatch.hasPatch && mcpPatch.clear) {
    merged.mcp = normalizeMcpConfig({}, {});
  } else if (mcpPatch.hasPatch) {
    merged.mcp = normalizeMcpConfig(mcpPatch.value, previousMcp);
  } else {
    merged.mcp = previousMcp;
  }
  const normalizedMcp = normalizeMcpConfig(merged.mcp || {}, {});
  if (normalizedMcp.presetInvalid) {
    throw new Error(`Unsupported MCP preset. Allowed: ${Object.keys(MCP_POLICY_PRESETS).join(", ")}.`);
  }

  const effectiveEnabled = normalizeBool(merged.enabled, true);
  const officialApi = isOfficialApiEndpoint(merged.apiBaseUrl, merged.apiStyle);
  if (effectiveEnabled) {
    if (!merged.apiBaseUrl || !merged.model || !merged.apiKey) {
      throw new Error("apiBaseUrl, model, and apiKey are required for enabled providers.");
    }
    if (normalizeBool(merged.requireOfficialApi, defaultRequireOfficialApi(providerId)) && !officialApi) {
      throw new Error("External provider must use an official API endpoint (https://api.openai.com or Azure OpenAI endpoint).");
    }
    if (normalizedMcp.enabled && normalizeApiStyle(merged.apiStyle, DEFAULT_API_STYLE) !== "openai_responses") {
      throw new Error("MCP requires apiStyle=openai_responses.");
    }
    if (normalizedMcp.enabled && !normalizedMcp.configured) {
      throw new Error("MCP is enabled but missing server_label and server_url/connector_id.");
    }
  }

  const payload = {
    provider: providerId,
    enabled: effectiveEnabled,
    apiStyle: normalizeApiStyle(merged.apiStyle, DEFAULT_API_STYLE),
    apiBaseUrl: normalizeBaseUrl(merged.apiBaseUrl),
    apiPath: normalizeApiPath(merged.apiPath, defaultPathForStyle(merged.apiStyle)),
    model: String(merged.model || "").trim(),
    organization: String(merged.organization || "").trim(),
    requireOfficialApi: normalizeBool(merged.requireOfficialApi, defaultRequireOfficialApi(providerId)),
    apiKey: normalizeApiKey(merged.apiKey || ""),
    mcp: normalizedMcp,
    updatedAt: new Date().toISOString()
  };

  setSecret(
    providerSecretName(providerId),
    payload,
    {
      app: "Asolaria",
      component: "external-provider",
      provider: providerId,
      credentialOwner: "owner",
      actor: "owner",
      updatedBy: "api"
    },
    { namespace: "owner" }
  );

  return getExternalProviderStatusById(providerId);
}

function estimateTokenCount(text = "") {
  const raw = String(text || "");
  if (!raw) return 0;
  return Math.max(1, Math.ceil(raw.length / 4));
}

function compactPromptForTokenBudget(prompt = "", maxTokens = 0) {
  const input = String(prompt || "").replace(/\r/g, "").trim();
  const budget = normalizeMcpPromptTokenLimit(maxTokens, DEFAULT_MCP_PROMPT_TOKEN_LIMIT);
  if (!input || budget < 1) {
    return {
      text: input,
      compacted: false,
      omitted: false
    };
  }

  const lines = input
    .split(/\n+/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const deduped = [];
  const seenTail = new Set();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seenTail.has(key)) continue;
    seenTail.add(key);
    deduped.push(line);
  }
  const normalized = deduped.join("\n").trim();
  const tokenCount = estimateTokenCount(normalized);
  if (tokenCount <= budget) {
    return {
      text: normalized,
      compacted: normalized !== input,
      omitted: false
    };
  }

  const approxBudgetChars = Math.max(280, budget * 4);
  const marker = "\n\n[Asolaria token reduction: middle context omitted]\n\n";
  const headChars = Math.max(120, Math.floor(approxBudgetChars * 0.58));
  const tailChars = Math.max(120, approxBudgetChars - headChars);
  let head = normalized.slice(0, headChars).trimEnd();
  let tail = normalized.slice(Math.max(0, normalized.length - tailChars)).trimStart();
  if (head && !/[.!?:;\]\)]$/.test(head)) {
    head += "...";
  }
  if (tail && !/^[\[(A-Za-z0-9]/.test(tail)) {
    tail = tail.replace(/^[^\w\[(]+/, "");
  }
  const compacted = [head, tail].filter(Boolean).join(marker).trim();
  return {
    text: compacted || normalized,
    compacted: true,
    omitted: true
  };
}

function applyPromptTokenReduction(prompt = "", mcpRuntime = null) {
  const rawPrompt = String(prompt || "").trim();
  const beforeTokens = estimateTokenCount(rawPrompt);
  if (!rawPrompt || !mcpRuntime) {
    return {
      prompt: rawPrompt,
      profile: "off",
      beforeTokens,
      afterTokens: beforeTokens,
      compacted: false,
      omitted: false,
      promptTokenLimit: 0
    };
  }

  const profile = normalizeMcpTokenReductionProfile(
    mcpRuntime.tokenReductionProfile,
    DEFAULT_MCP_TOKEN_REDUCTION_PROFILE
  );
  const policy = MCP_TOKEN_REDUCTION_PROFILES[profile] || MCP_TOKEN_REDUCTION_PROFILES[DEFAULT_MCP_TOKEN_REDUCTION_PROFILE];
  const effectivePromptTokenLimit = normalizeMcpPromptTokenLimit(
    mcpRuntime.promptTokenLimit,
    policy.promptTokenLimit
  );
  if (profile === "off" || effectivePromptTokenLimit < 1) {
    return {
      prompt: rawPrompt,
      profile,
      beforeTokens,
      afterTokens: beforeTokens,
      compacted: false,
      omitted: false,
      promptTokenLimit: effectivePromptTokenLimit
    };
  }

  const compacted = compactPromptForTokenBudget(rawPrompt, effectivePromptTokenLimit);
  const reducedPrompt = String(compacted.text || rawPrompt).trim();
  return {
    prompt: reducedPrompt,
    profile,
    beforeTokens,
    afterTokens: estimateTokenCount(reducedPrompt),
    compacted: Boolean(compacted.compacted),
    omitted: Boolean(compacted.omitted),
    promptTokenLimit: effectivePromptTokenLimit
  };
}

function buildMcpToolDefinition(mcpRuntime) {
  if (!mcpRuntime) {
    return null;
  }
  const schemaMode = normalizeMcpToolSchemaMode(
    mcpRuntime.toolSchemaMode,
    DEFAULT_MCP_TOOL_SCHEMA_MODE
  );
  const tool = {
    type: "mcp",
    server_label: mcpRuntime.serverLabel
  };
  if (schemaMode === "pointer") {
    if (mcpRuntime.connectorId) {
      tool.connector_id = mcpRuntime.connectorId;
    } else if (mcpRuntime.serverUrl) {
      tool.server_url = mcpRuntime.serverUrl;
    }
  } else {
    if (mcpRuntime.serverUrl) {
      tool.server_url = mcpRuntime.serverUrl;
    }
    if (mcpRuntime.connectorId) {
      tool.connector_id = mcpRuntime.connectorId;
    }
    if (schemaMode === "full") {
      if (mcpRuntime.authorization) {
        tool.authorization = mcpRuntime.authorization;
      }
      if (mcpRuntime.headers && Object.keys(mcpRuntime.headers).length > 0) {
        tool.headers = mcpRuntime.headers;
      }
    }
  }
  if (Array.isArray(mcpRuntime.allowedTools) && mcpRuntime.allowedTools.length > 0) {
    tool.allowed_tools = mcpRuntime.allowedTools;
  }
  if (mcpRuntime.requireApproval) {
    tool.require_approval = mcpRuntime.requireApproval;
  }
  return tool;
}

function supportsTemperatureParameter(model = "") {
  const normalized = String(model || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (normalized.includes("codex")) {
    return false;
  }
  return !/^gpt-5([.-]|$)/i.test(normalized);
}

function buildExternalRequestBody(provider, prompt, temperature, maxTokens, modelOverride = "", options = {}) {
  const model = String(modelOverride || provider.model || "").trim();
  const mcpRuntime = options.mcpRuntime || null;
  const includeTemperature = Number.isFinite(temperature) && supportsTemperatureParameter(model);
  if (provider.apiStyle === "openai_responses") {
    const body = {
      model,
      input: prompt,
      max_output_tokens: maxTokens
    };
    if (includeTemperature) {
      body.temperature = temperature;
    }
    if (mcpRuntime) {
      const mcpTool = buildMcpToolDefinition(mcpRuntime);
      if (mcpTool) {
        body.tools = [mcpTool];
      }
      if (mcpRuntime.previousResponseId) {
        body.previous_response_id = mcpRuntime.previousResponseId;
      }
    }
    return body;
  }

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: maxTokens
  };
  if (includeTemperature) {
    body.temperature = temperature;
  }
  return body;
}

function buildExternalRequestHeaders(provider) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
    "User-Agent": "Asolaria/0.1"
  };
  if (provider.organization) {
    headers["OpenAI-Organization"] = provider.organization;
  }
  return headers;
}

async function runExternalProvider(provider, payload = {}) {
  const timeoutMs = Math.max(15000, Number(payload.timeoutMs || 90000));
  const maxTokens = Math.max(100, Math.min(1800, Math.round(asNumber(payload.maxTokens, 700))));
  const temperature = Math.max(0, Math.min(1, asNumber(payload.temperature, 0.2)));
  const prompt = String(payload.prompt || "").trim();
  const requestedModel = String(payload.model || provider.model || "").trim();
  const modelResolution = resolveApiModelForRequest(provider, requestedModel);
  const model = String(modelResolution.model || provider.model || "").trim();
  if (!prompt) {
    throw new Error("External provider prompt is required.");
  }
  const mcpRuntime = buildMcpRuntime(provider, payload, prompt);
  const reductionRuntime = applyPromptTokenReduction(prompt, mcpRuntime);
  const reducedPrompt = String(reductionRuntime.prompt || prompt).trim() || prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${provider.apiBaseUrl}${provider.apiPath}`;
    const response = await fetch(url, {
      method: "POST",
      headers: buildExternalRequestHeaders(provider),
      body: JSON.stringify(
        buildExternalRequestBody(provider, reducedPrompt, temperature, maxTokens, model, { mcpRuntime })
      ),
      signal: controller.signal
    });

    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch (_error) {
      body = { raw: bodyText };
    }

    if (!response.ok) {
      const summary = typeof body?.error?.message === "string"
        ? body.error.message
        : bodyText;
      throw new Error(`${provider.id} API ${response.status}: ${String(summary || "request failed").slice(0, 300)}`);
    }

    const reply = extractTextFromResponse(body);
    if (!reply) {
      throw new Error(`${provider.id} API returned no assistant text.`);
    }

    persistMcpResponseState(provider, mcpRuntime, body);

    return {
      provider: provider.id,
      model: model || provider.model,
      requestedModel: requestedModel || provider.model,
      modelFallback: modelResolution.fallbackFrom
        ? {
          from: modelResolution.fallbackFrom,
          to: model || provider.model,
          bypassEnv: "ASOLARIA_ALLOW_GPT53_CODEX_API=true"
        }
        : null,
      reply,
      tokenReduction: {
        profile: reductionRuntime.profile,
        promptTokenLimit: reductionRuntime.promptTokenLimit,
        beforePromptTokens: reductionRuntime.beforeTokens,
        afterPromptTokens: reductionRuntime.afterTokens,
        compacted: reductionRuntime.compacted,
        omittedMiddleContext: reductionRuntime.omitted,
        schemaMode: mcpRuntime?.toolSchemaMode || null,
        usedPreviousResponseId: Boolean(mcpRuntime?.previousResponseId),
        allowedToolsCount: Array.isArray(mcpRuntime?.allowedTools) ? mcpRuntime.allowedTools.length : 0
      },
      mcp: mcpRuntime
        ? {
          enabled: true,
          serverLabel: mcpRuntime.serverLabel,
          usedPreviousResponseId: Boolean(mcpRuntime.previousResponseId),
          contextKey: mcpRuntime.contextKey || "",
          allowedTools: mcpRuntime.allowedTools || [],
          preset: mcpRuntime.preset || "",
          requireApproval: mcpRuntime.requireApproval,
          tokenReductionProfile: mcpRuntime.tokenReductionProfile || DEFAULT_MCP_TOKEN_REDUCTION_PROFILE,
          promptTokenLimit: mcpRuntime.promptTokenLimit || 0,
          toolSchemaMode: mcpRuntime.toolSchemaMode || DEFAULT_MCP_TOOL_SCHEMA_MODE,
          skillHints: mcpRuntime.skillHints || [],
          webMcpHints: mcpRuntime.webMcpHints || []
        }
        : null,
      raw: body
    };
  } finally {
    clearTimeout(timer);
  }
}

function manifest() {
  return {
    id: "external_brain",
    version: "1.0.0",
    description: "External AI provider connector — OpenAI/Cursor/Antigravity chat completions and responses API with MCP tool integration, dynamic allowlist, token reduction, and model fallback",
    capabilities: ["run_prompt", "provider_status", "mcp_tool_integration", "dynamic_allowlist", "token_reduction", "model_fallback", "multi_provider", "policy_presets"],
    readScopes: ["external_provider_config", "mcp_tool_catalog", "mcp_cache_status"],
    writeScopes: ["external_provider_config", "mcp_tool_cache"],
    approvalRequired: false,
    healthCheck: false,
    retrySemantics: "model_fallback_chain",
    timeoutMs: 180000,
    secretRequirements: ["integrations.external.openai (API key)", "integrations.external.cursor (API key)", "integrations.external.antigravity (API key)"],
    sideEffects: ["calls external AI APIs (OpenAI, Cursor, Antigravity)", "caches MCP tool catalogs in memory", "stores provider configs in vault"],
    failureModes: ["provider_not_configured", "api_key_missing", "model_not_available", "api_request_failed", "mcp_tool_call_failed", "token_limit_exceeded", "all_models_failed"],
    emittedEvents: ["external_brain.prompt_completed", "external_brain.mcp_tool_invoked", "external_brain.model_fallback", "external_brain.config_updated"]
  };
}

module.exports = {
  listConfiguredExternalProviders,
  getExternalProviderStatus,
  getExternalProviderStatusById,
  getExternalMcpCacheStatus,
  clearExternalMcpCache,
  getExternalMcpPolicyPresets,
  getExternalMcpTokenReductionProfiles,
  setExternalProviderConfig,
  getExternalProvider,
  runExternalProvider,
  manifest
};
