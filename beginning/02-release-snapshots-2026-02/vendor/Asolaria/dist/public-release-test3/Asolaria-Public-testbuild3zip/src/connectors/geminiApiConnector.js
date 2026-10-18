const { getSecret, setSecret, deleteSecret } = require("../secureVault");

// Gemini API (AI Studio) uses the Generative Language API endpoint + an API key.
// This is separate from Vertex AI Gemini (which uses GCP service account auth).
const GEMINI_API_SECRET = "integrations.gemini.api_studio";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";
const DEFAULT_API_VERSION = "v1beta";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_OUTPUT_TOKENS = 600;

function normalizeApiKey(value) {
  const key = String(value || "").trim();
  if (!key) return "";
  if (key.length < 30 || key.length > 140) return "";
  if (/\s/.test(key)) return "";
  // GCP API keys commonly start with "AIza".
  if (!/^AIza[0-9A-Za-z_-]+$/.test(key)) return "";
  return key;
}

function normalizeText(value, limit = 220) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, limit);
}

function normalizeModel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(raw)) return "";
  return raw;
}

function normalizeProjectNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^\d{4,20}$/.test(raw)) return "";
  return raw;
}

function normalizeProjectName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^projects\/(\d{4,20})$/i);
  if (match) {
    return `projects/${match[1]}`;
  }
  if (/^\d{4,20}$/.test(raw)) {
    return `projects/${raw}`;
  }
  return "";
}

function maskKey(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 10) return "*".repeat(text.length);
  return `${text.slice(0, 6)}${"*".repeat(Math.max(4, text.length - 10))}${text.slice(-4)}`;
}

function resolveGeminiApiConfig() {
  const envKey = normalizeApiKey(process.env.ASOLARIA_GEMINI_API_KEY || "");
  const envModel = normalizeModel(process.env.ASOLARIA_GEMINI_API_MODEL || "");
  if (envKey) {
    return {
      enabled: true,
      apiKey: envKey,
      defaultModel: envModel || DEFAULT_MODEL,
      name: normalizeText(process.env.ASOLARIA_GEMINI_API_NAME || "Gemini API Key", 120),
      projectNumber: normalizeProjectNumber(process.env.ASOLARIA_GEMINI_API_PROJECT_NUMBER || ""),
      projectName: normalizeProjectName(process.env.ASOLARIA_GEMINI_API_PROJECT_NAME || ""),
      source: "env",
      updatedAt: null
    };
  }

  const secret = getSecret(GEMINI_API_SECRET, { namespace: "owner" });
  const value = secret?.value && typeof secret.value === "object" ? secret.value : {};
  const apiKey = normalizeApiKey(value.apiKey || value.key || value.token || "");
  const defaultModel = normalizeModel(value.defaultModel || value.model || "") || DEFAULT_MODEL;
  return {
    enabled: value.enabled !== false,
    apiKey,
    defaultModel,
    name: normalizeText(value.name || "Gemini API Key", 120) || "Gemini API Key",
    projectNumber: normalizeProjectNumber(value.projectNumber || value.projectId || ""),
    projectName: normalizeProjectName(value.projectName || value.project || value.projectNumber || ""),
    source: apiKey ? "vault" : "none",
    updatedAt: secret?.updatedAt || null
  };
}

function getGeminiApiConfigSummary(policy = {}) {
  const resolved = resolveGeminiApiConfig();
  return {
    enabled: policy.enabled !== false && resolved.enabled !== false,
    configured: Boolean(resolved.apiKey),
    apiKeySource: resolved.source,
    apiKeyHint: maskKey(resolved.apiKey),
    name: resolved.name || "Gemini API Key",
    projectNumber: resolved.projectNumber || "",
    projectName: resolved.projectName || "",
    apiBase: DEFAULT_API_BASE,
    apiVersion: DEFAULT_API_VERSION,
    defaultModel: resolved.defaultModel || DEFAULT_MODEL,
    updatedAt: resolved.updatedAt || null
  };
}

function setGeminiApiConfig(input = {}) {
  if (input?.clear === true) {
    deleteSecret(GEMINI_API_SECRET, { namespace: "owner" });
    return getGeminiApiConfigSummary();
  }

  // Allow partial updates (for example model/name/project metadata) without
  // requiring the key to be re-sent if already stored.
  const current = resolveGeminiApiConfig();
  const apiKey = normalizeApiKey(input.apiKey || input.key || input.token || "") || current.apiKey;
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }

  const payload = {
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    apiKey,
    defaultModel: normalizeModel(input.defaultModel || input.model || "") || current.defaultModel || DEFAULT_MODEL,
    name: normalizeText(input.name || current.name || "Gemini API Key", 120) || "Gemini API Key",
    projectNumber: normalizeProjectNumber(input.projectNumber || input.projectId || "") || current.projectNumber || "",
    projectName: normalizeProjectName(input.projectName || input.project || input.projectNumber || "") || current.projectName || "",
    updatedAt: new Date().toISOString()
  };

  setSecret(
    GEMINI_API_SECRET,
    payload,
    {
      app: "Asolaria",
      component: "gemini-api",
      credentialOwner: "owner",
      actor: "owner",
      updatedBy: "api"
    },
    { namespace: "owner" }
  );

  return getGeminiApiConfigSummary();
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function extractGeminiText(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const parts = candidates && candidates[0] && candidates[0].content ? candidates[0].content.parts : null;
  if (Array.isArray(parts)) {
    const text = parts
      .map((p) => (p && typeof p.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

async function runGeminiApiGenerateContent(input = {}, policy = {}) {
  const status = getGeminiApiConfigSummary(policy);
  if (!status.enabled) {
    throw new Error("Gemini API integration is disabled by policy.");
  }
  if (!status.configured) {
    throw new Error("Gemini API integration is not configured (missing API key).");
  }

  const resolved = resolveGeminiApiConfig();
  const prompt = String(input.prompt || input.message || "").trim();
  if (!prompt) {
    throw new Error("prompt is required.");
  }

  const model = normalizeModel(input.model || "") || resolved.defaultModel || DEFAULT_MODEL;
  const system = String(input.system || "").trim();
  const temperature = input.temperature === undefined ? undefined : Number(input.temperature);
  const maxOutputTokens = input.maxOutputTokens === undefined
    ? undefined
    : clampInt(input.maxOutputTokens, DEFAULT_MAX_OUTPUT_TOKENS, 1, 8192);

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };
  if (system) {
    // Align with Vertex `generateContent` request shape.
    body.systemInstruction = { parts: [{ text: system }] };
  }
  const genConfig = {};
  if (Number.isFinite(temperature)) {
    genConfig.temperature = Math.max(0, Math.min(2, temperature));
  }
  if (maxOutputTokens) {
    genConfig.maxOutputTokens = maxOutputTokens;
  }
  if (Object.keys(genConfig).length) {
    body.generationConfig = genConfig;
  }

  const url = new URL(`/${DEFAULT_API_VERSION}/models/${encodeURIComponent(model)}:generateContent`, DEFAULT_API_BASE);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-goog-api-key": resolved.apiKey
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_error) {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const message = typeof parsed?.error?.message === "string"
      ? parsed.error.message
      : typeof parsed?.message === "string"
        ? parsed.message
        : text;
    throw new Error(`Gemini API generateContent HTTP ${response.status}: ${String(message || "request failed").slice(0, 260)}`);
  }

  const reply = extractGeminiText(parsed);
  if (!reply) {
    throw new Error("Gemini API returned no text output.");
  }

  return {
    model,
    reply,
    raw: parsed
  };
}

module.exports = {
  GEMINI_API_SECRET,
  getGeminiApiConfigSummary,
  setGeminiApiConfig,
  runGeminiApiGenerateContent
};

