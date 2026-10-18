const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");

const memoryPath = resolveDataPath("memory.json");
const maxTurns = Math.max(20, Number(process.env.ASOLARIA_MEMORY_MAX_TURNS || 300));
const BOILERPLATE_ASSISTANT_PATTERNS = [
  /(?:operate|operating)\s+as\s+\*{0,2}asolaria brain\*{0,2}/i,
  /\basolaria brain mode(?:\s+is)?\s+(?:active|enabled)\b/i,
  /\bgive me the first thing you want me to remember or work on\b/i,
  /\bpersistent working memory\b/i
];

let cache = null;

function createInitialMemory() {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    turns: []
  };
}

function ensureDir() {
  fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
}

function loadMemory() {
  if (cache) {
    return cache;
  }

  try {
    if (!fs.existsSync(memoryPath)) {
      cache = createInitialMemory();
      saveMemory(cache);
      return cache;
    }

    const raw = fs.readFileSync(memoryPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.turns)) {
      throw new Error("Invalid memory format.");
    }

    cache = {
      version: 1,
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      turns: parsed.turns.slice(-maxTurns)
    };
    return cache;
  } catch (_error) {
    cache = createInitialMemory();
    saveMemory(cache);
    return cache;
  }
}

function saveMemory(memory) {
  ensureDir();
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), "utf8");
}

function redactSecrets(text) {
  let value = String(text || "");
  if (!value) return value;

  // Private keys (PEM blocks).
  value = value.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    "[REDACTED_PRIVATE_KEY]"
  );

  // Common API key formats (Google API keys start with AIza...).
  value = value.replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[REDACTED_GOOGLE_API_KEY]");

  // JSON-style secret fields.
  value = value.replace(
    /(\"?(?:apiKey|api_key|token|access_token|refresh_token|id_token|client_secret|private_key)\"?\s*[:=]\s*\")([^\"\r\n]{6,})(\")/gi,
    "$1[REDACTED]$3"
  );

  // Headers.
  value = value.replace(/(\bX-goog-api-key\b\s*[:=]\s*)([^\s]+)/gi, "$1[REDACTED]");
  value = value.replace(/(\bAuthorization\b\s*:\s*Bearer\s+)([A-Za-z0-9._-]{10,})/gi, "$1[REDACTED]");

  // Natural-language password patterns.
  value = value.replace(
    /(\bpassword\b(?:\s+for\s+[^\r\n]{0,80})?\s*(?:is|=|:)\s*)([^\s]{4,})/gi,
    "$1[REDACTED_PASSWORD]"
  );

  // Long token-like hex strings.
  value = value.replace(/\b[a-f0-9]{32,}\b/gi, "[REDACTED_HEX]");

  return value;
}

function cleanText(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  return redactSecrets(normalized).trim();
}

function normalizeImagePaths(images) {
  if (!Array.isArray(images)) {
    return [];
  }
  return images
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeFilePaths(files) {
  if (!Array.isArray(files)) {
    return [];
  }
  return files
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeStringList(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

function isBoilerplateAssistantTurn(turn) {
  if (!turn || String(turn.role || "") !== "assistant") {
    return false;
  }
  const text = cleanText(turn.text).toLowerCase();
  if (!text) {
    return false;
  }
  if (BOILERPLATE_ASSISTANT_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  const mentionsBrain = /\basolaria brain\b/i.test(text);
  const mentionsMemoryPledge = /\b(persistent (?:state|memory)|tasks\.md|workspace files?)\b/i.test(text);
  const kickoffPrompt = /\b(send (?:me )?the first (?:task|thing)|share your first priority|give me the first thing)\b/i.test(text);
  return mentionsBrain && (mentionsMemoryPledge || kickoffPrompt);
}

function filterTurns(turns, options = {}) {
  const sourceExclusions = new Set(normalizeStringList(options.excludeSources || []));
  if (options.clean) {
    sourceExclusions.add("startup-automation");
  }
  const hideBoilerplate = Boolean(options.excludeBoilerplate || options.clean);
  return turns.filter((turn) => {
    if (!turn || typeof turn !== "object") {
      return false;
    }
    const source = String(turn.meta?.source || "").trim().toLowerCase();
    if (source && sourceExclusions.has(source)) {
      return false;
    }
    if (hideBoilerplate && isBoilerplateAssistantTurn(turn)) {
      return false;
    }
    return true;
  });
}

function pushTurn(role, text, options = {}) {
  const memory = loadMemory();
  const now = new Date().toISOString();
  const turn = {
    id: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: String(role || "system"),
    text: cleanText(text),
    images: normalizeImagePaths(options.images),
    files: normalizeFilePaths(options.files),
    meta: options.meta || {},
    at: now
  };

  memory.turns.push(turn);
  if (memory.turns.length > maxTurns) {
    memory.turns.splice(0, memory.turns.length - maxTurns);
  }

  memory.updatedAt = now;
  saveMemory(memory);
  return turn;
}

function addUserTurn(text, options = {}) {
  return pushTurn("user", text, options);
}

function addAssistantTurn(text, options = {}) {
  return pushTurn("assistant", text, options);
}

function getRecentTurns(limit = 12, options = {}) {
  const memory = loadMemory();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 12));
  const filtered = filterTurns(memory.turns, options);
  return filtered.slice(-safeLimit);
}

function searchTurns(query, limit = 20, options = {}) {
  const needle = cleanText(query).toLowerCase();
  if (!needle) {
    return [];
  }
  const memory = loadMemory();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
  const filtered = filterTurns(memory.turns, options);
  const matches = filtered.filter((turn) => {
    const text = cleanText(turn?.text).toLowerCase();
    return text.includes(needle);
  });
  return matches.slice(-safeLimit);
}

function summarizeTurn(turn) {
  const text = cleanText(turn.text);
  const clipped = text.length > 420 ? `${text.slice(0, 417)}...` : text;
  const imageLabel = turn.images && turn.images.length > 0
    ? ` | images: ${turn.images.map((p) => path.basename(String(p || ""))).filter(Boolean).join(", ")}`
    : "";
  const fileLabel = turn.files && turn.files.length > 0
    ? ` | files: ${turn.files.map((p) => path.basename(String(p || ""))).filter(Boolean).join(", ")}`
    : "";
  return `[${turn.role}] ${clipped}${imageLabel}${fileLabel}`;
}

function formatRecentTurnsForPrompt(limit = 12, options = {}) {
  const turns = getRecentTurns(limit, options);
  if (turns.length === 0) {
    return "";
  }

  const lines = turns.map((turn) => summarizeTurn(turn));
  return lines.join("\n");
}

function clearMemory() {
  cache = createInitialMemory();
  saveMemory(cache);
  return getMemoryState(20);
}

function getMemoryState(limit = 20, options = {}) {
  const memory = loadMemory();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
  const filtered = filterTurns(memory.turns, options);
  return {
    version: memory.version,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    totalTurns: memory.turns.length,
    filteredTurns: filtered.length,
    turns: filtered.slice(-safeLimit)
  };
}

module.exports = {
  addUserTurn,
  addAssistantTurn,
  getRecentTurns,
  searchTurns,
  formatRecentTurnsForPrompt,
  clearMemory,
  getMemoryState
};
