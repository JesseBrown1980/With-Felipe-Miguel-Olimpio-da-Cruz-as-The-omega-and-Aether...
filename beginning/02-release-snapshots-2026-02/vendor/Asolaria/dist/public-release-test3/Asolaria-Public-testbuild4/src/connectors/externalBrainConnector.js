const { getSecret, setSecret, deleteSecret } = require("../secureVault");

const PROVIDER_IDS = ["cursor", "antigravity"];
const EXTERNAL_SECRET_PREFIX = "integrations.external.";
const DEFAULT_API_STYLE = "openai_chat_completions";
const SUPPORTED_API_STYLES = new Set(["openai_chat_completions", "openai_responses"]);
const OFFICIAL_OPENAI_HOSTS = new Set(["api.openai.com"]);
const OFFICIAL_OPENAI_HOST_SUFFIXES = [".openai.azure.com"];

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
  return provider;
}

function statusShapeFromConfig(provider) {
  const warning = provider.legacyEnvApiKeyDetected
    ? "Legacy env API key detected but ignored. Store API keys in the encrypted vault only."
    : "";
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

  const effectiveEnabled = normalizeBool(merged.enabled, true);
  const officialApi = isOfficialApiEndpoint(merged.apiBaseUrl, merged.apiStyle);
  if (effectiveEnabled) {
    if (!merged.apiBaseUrl || !merged.model || !merged.apiKey) {
      throw new Error("apiBaseUrl, model, and apiKey are required for enabled providers.");
    }
    if (normalizeBool(merged.requireOfficialApi, defaultRequireOfficialApi(providerId)) && !officialApi) {
      throw new Error("External provider must use an official API endpoint (https://api.openai.com or Azure OpenAI endpoint).");
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

function buildExternalRequestBody(provider, prompt, temperature, maxTokens) {
  if (provider.apiStyle === "openai_responses") {
    return {
      model: provider.model,
      input: prompt,
      temperature,
      max_output_tokens: maxTokens
    };
  }

  return {
    model: provider.model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature,
    max_tokens: maxTokens
  };
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
  if (!prompt) {
    throw new Error("External provider prompt is required.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${provider.apiBaseUrl}${provider.apiPath}`;
    const response = await fetch(url, {
      method: "POST",
      headers: buildExternalRequestHeaders(provider),
      body: JSON.stringify(
        buildExternalRequestBody(provider, prompt, temperature, maxTokens)
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

    return {
      provider: provider.id,
      reply,
      raw: body
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  listConfiguredExternalProviders,
  getExternalProviderStatus,
  getExternalProviderStatusById,
  setExternalProviderConfig,
  getExternalProvider,
  runExternalProvider
};
