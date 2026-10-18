const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { resolveDataPath } = require("./runtimePaths");
const { hardenSecret, retrieveSecret, listHardenedKeys } = require("./secretHardening");

const FULL_MEMORY_ROOT = resolveDataPath("private", "full-memory-lane");
const CONVERSATIONS_DIR = path.join(FULL_MEMORY_ROOT, "conversations");
const MANIFEST_PATH = path.join(FULL_MEMORY_ROOT, "manifest.json");
const KEY_NAME = "full_memory_lane_master_key";
const DEFAULT_CHAT_ID = "main";
const DEFAULT_LIST_LIMIT = 40;
const DEFAULT_TURN_LIMIT = 160;
const DEFAULT_SEARCH_LIMIT = 40;
const MAX_LIST_LIMIT = 200;
const MAX_TURN_LIMIT = 2000;
const MAX_SEARCH_LIMIT = 400;

let manifestCache = null;
let manifestCacheMtimeMs = 0;
let keyCache = null;

function ensureDir() {
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  ensureDir();
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function toIsoDate(value, fallback = "") {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) {
    return fallback || new Date().toISOString();
  }
  return date.toISOString();
}

function clip(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function normalizeConversationId(value, fallback = DEFAULT_CHAT_ID) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (normalized) {
    return normalized;
  }
  return String(fallback || DEFAULT_CHAT_ID).trim().toLowerCase() || DEFAULT_CHAT_ID;
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "system";
}

function normalizePathList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, 24);
}

function cloneMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return {};
  }
}

function createInitialManifest() {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    enabled: isFullMemoryLaneEnabled(),
    protection: "",
    totalTurns: 0,
    totalConversations: 0,
    lastCapturedAt: "",
    lastError: "",
    backfill: {
      lastRunAt: "",
      sourceMemoryUpdatedAt: "",
      importedTurns: 0,
      skipped: false,
      reason: ""
    },
    conversations: {}
  };
}

function loadManifest() {
  ensureDir();
  if (manifestCache && fs.existsSync(MANIFEST_PATH)) {
    try {
      const stat = fs.statSync(MANIFEST_PATH);
      if (Number(stat.mtimeMs || 0) <= Number(manifestCacheMtimeMs || 0)) {
        return manifestCache;
      }
    } catch (_error) {
      // Fall through and reload from disk.
    }
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    manifestCache = createInitialManifest();
    manifestCacheMtimeMs = 0;
    writeJsonAtomic(MANIFEST_PATH, manifestCache);
    try {
      manifestCacheMtimeMs = Number(fs.statSync(MANIFEST_PATH).mtimeMs || 0);
    } catch (_error) {
      manifestCacheMtimeMs = 0;
    }
    return manifestCache;
  }
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    manifestCache = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? {
        ...createInitialManifest(),
        ...parsed,
        conversations: parsed.conversations && typeof parsed.conversations === "object" && !Array.isArray(parsed.conversations)
          ? parsed.conversations
          : {}
      }
      : createInitialManifest();
  } catch (_error) {
    manifestCache = createInitialManifest();
  }
  try {
    manifestCacheMtimeMs = Number(fs.statSync(MANIFEST_PATH).mtimeMs || 0);
  } catch (_error) {
    manifestCacheMtimeMs = 0;
  }
  return manifestCache;
}

function saveManifest(manifest) {
  const next = {
    ...createInitialManifest(),
    ...manifest,
    conversations: manifest && typeof manifest.conversations === "object" && !Array.isArray(manifest.conversations)
      ? manifest.conversations
      : {}
  };
  next.updatedAt = new Date().toISOString();
  next.totalConversations = Object.keys(next.conversations).length;
  writeJsonAtomic(MANIFEST_PATH, next);
  manifestCache = next;
  try {
    manifestCacheMtimeMs = Number(fs.statSync(MANIFEST_PATH).mtimeMs || 0);
  } catch (_error) {
    manifestCacheMtimeMs = 0;
  }
  return next;
}

function isFullMemoryLaneEnabled() {
  const raw = String(process.env.ASOLARIA_FULL_MEMORY_ENABLED || "").trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !["0", "false", "off", "no", "disabled"].includes(raw);
}

function resolveProtectionLabel(method) {
  if (!method) return "generated";
  return String(method || "").trim().toLowerCase();
}

function resolveHardenedKeyMethod(name) {
  const rows = Array.isArray(listHardenedKeys()) ? listHardenedKeys() : [];
  const match = rows.find((row) => String(row?.key || "").trim() === String(name || "").trim());
  return resolveProtectionLabel(match?.method || "hardened_secret");
}

function resolveLaneKey() {
  if (keyCache) {
    return keyCache;
  }

  const envKey = String(process.env.ASOLARIA_FULL_MEMORY_MASTER_KEY || "").trim();
  if (envKey) {
    keyCache = {
      key: crypto.createHash("sha256").update(envKey, "utf8").digest(),
      protection: "env_sha256"
    };
    return keyCache;
  }

  const hardened = retrieveSecret(KEY_NAME);
  if (hardened) {
    const decoded = Buffer.from(hardened, "base64");
    if (decoded.length === 32) {
      keyCache = {
        key: decoded,
        protection: resolveHardenedKeyMethod(KEY_NAME)
      };
      return keyCache;
    }
  }

  const generated = crypto.randomBytes(32).toString("base64");
  const hardenedResult = hardenSecret(KEY_NAME, generated);
  keyCache = {
    key: Buffer.from(generated, "base64"),
    protection: resolveProtectionLabel(hardenedResult?.method || "generated")
  };
  return keyCache;
}

function conversationPath(chatId) {
  return path.join(CONVERSATIONS_DIR, `${normalizeConversationId(chatId)}.jsonl`);
}

function encryptPayload(payload, aad) {
  const { key } = resolveLaneKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(String(aad || ""), "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload || {}), "utf8"),
    cipher.final()
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

function decryptPayload(record) {
  const { key } = resolveLaneKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(String(record?.iv || ""), "base64")
  );
  const aad = `${String(record?.chatId || "")}|${String(record?.role || "")}|${String(record?.id || "")}|${String(record?.at || "")}`;
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(String(record?.tag || ""), "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(String(record?.ciphertext || ""), "base64")),
    decipher.final()
  ]);
  return JSON.parse(plain.toString("utf8"));
}

function appendConversationRecord(chatId, record) {
  ensureDir();
  const filePath = conversationPath(chatId);
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
  return filePath;
}

function updateConversationManifest(manifest, input) {
  const chatId = normalizeConversationId(input.chatId, DEFAULT_CHAT_ID);
  const existing = manifest.conversations[chatId] || {
    chatId,
    firstAt: "",
    lastAt: "",
    totalTurns: 0,
    lastRole: "",
    lastSource: "",
    filePath: conversationPath(chatId)
  };
  existing.firstAt = existing.firstAt || input.at;
  existing.lastAt = input.at;
  existing.totalTurns = Number(existing.totalTurns || 0) + 1;
  existing.lastRole = normalizeRole(input.role);
  existing.lastSource = clip(input.source || "", 80);
  existing.filePath = conversationPath(chatId);
  manifest.conversations[chatId] = existing;
  manifest.totalTurns = Number(manifest.totalTurns || 0) + 1;
  manifest.lastCapturedAt = input.at;
  manifest.protection = resolveLaneKey().protection;
  manifest.lastError = "";
  return manifest;
}

function buildStoredRecord(turn) {
  const chatId = normalizeConversationId(
    turn?.chatId
      || turn?.meta?.chatId
      || turn?.meta?.conversationId
      || turn?.meta?.thread
      || "",
    DEFAULT_CHAT_ID
  );
  const at = toIsoDate(turn?.at);
  const role = normalizeRole(turn?.role);
  const id = clip(turn?.id || `full_turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 120);
  const meta = cloneMeta(turn?.meta);
  const payload = {
    text: String(turn?.text ?? ""),
    images: normalizePathList(turn?.images),
    files: normalizePathList(turn?.files),
    meta
  };
  return {
    version: 1,
    id,
    chatId,
    role,
    at,
    source: clip(meta?.source || "", 80),
    ...encryptPayload(payload, `${chatId}|${role}|${id}|${at}`)
  };
}

function captureFullMemoryTurn(turn = {}) {
  if (!isFullMemoryLaneEnabled()) {
    return { ok: false, skipped: true, reason: "disabled" };
  }
  try {
    const record = buildStoredRecord(turn);
    const manifest = loadManifest();
    appendConversationRecord(record.chatId, record);
    updateConversationManifest(manifest, record);
    saveManifest(manifest);
    return {
      ok: true,
      id: record.id,
      chatId: record.chatId,
      at: record.at
    };
  } catch (error) {
    const manifest = loadManifest();
    manifest.lastError = String(error?.message || error).slice(0, 240);
    saveManifest(manifest);
    return {
      ok: false,
      error: manifest.lastError
    };
  }
}

function readConversationRecords(chatId) {
  const filePath = conversationPath(chatId);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!String(raw || "").trim()) {
    return [];
  }
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);
}

function oneLine(text, max = 96) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function deriveConversationTitle(chatId) {
  const rows = readConversationRecords(chatId);
  for (const row of rows) {
    try {
      const payload = decryptPayload(row);
      const candidate = oneLine(payload?.text || "", 88);
      if (candidate) {
        return candidate;
      }
    } catch (_error) {
      // Ignore bad rows during title derivation.
    }
  }
  return "";
}

function getFullMemoryLaneStatus() {
  const manifest = loadManifest();
  const protection = resolveLaneKey().protection;
  return {
    ok: true,
    enabled: isFullMemoryLaneEnabled(),
    rootDir: FULL_MEMORY_ROOT,
    conversationsDir: CONVERSATIONS_DIR,
    manifestPath: MANIFEST_PATH,
    totalTurns: Number(manifest.totalTurns || 0),
    totalConversations: Number(manifest.totalConversations || 0),
    lastCapturedAt: String(manifest.lastCapturedAt || ""),
    updatedAt: String(manifest.updatedAt || ""),
    protection: String(protection || manifest.protection || ""),
    lastError: String(manifest.lastError || ""),
    backfill: manifest.backfill || {}
  };
}

function listFullMemoryConversations(limit = DEFAULT_LIST_LIMIT, options = {}) {
  const manifest = loadManifest();
  const safeLimit = Math.max(1, Math.min(MAX_LIST_LIMIT, Number(limit) || DEFAULT_LIST_LIMIT));
  const includeTitles = Boolean(options.includeTitles);
  const rows = Object.values(manifest.conversations || {})
    .sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")))
    .slice(0, safeLimit)
    .map((row) => ({
      chatId: row.chatId,
      firstAt: row.firstAt || "",
      lastAt: row.lastAt || "",
      totalTurns: Number(row.totalTurns || 0),
      lastRole: row.lastRole || "",
      lastSource: row.lastSource || "",
      title: includeTitles ? deriveConversationTitle(row.chatId) : ""
    }));
  return rows;
}

function getFullMemoryConversation(chatId, limit = DEFAULT_TURN_LIMIT) {
  const safeChatId = normalizeConversationId(chatId, DEFAULT_CHAT_ID);
  const safeLimit = Math.max(1, Math.min(MAX_TURN_LIMIT, Number(limit) || DEFAULT_TURN_LIMIT));
  const rows = readConversationRecords(safeChatId).slice(-safeLimit);
  const turns = rows.map((row) => {
    const payload = decryptPayload(row);
    return {
      id: row.id,
      chatId: row.chatId,
      role: normalizeRole(row.role),
      at: toIsoDate(row.at),
      text: String(payload?.text ?? ""),
      images: normalizePathList(payload?.images),
      files: normalizePathList(payload?.files),
      meta: cloneMeta(payload?.meta)
    };
  });
  return {
    chatId: safeChatId,
    count: turns.length,
    turns
  };
}

function searchFullMemoryLane(query, limit = DEFAULT_SEARCH_LIMIT, options = {}) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Number(limit) || DEFAULT_SEARCH_LIMIT));
  const requestedChatId = String(options.chatId || "").trim();
  const conversations = requestedChatId
    ? [normalizeConversationId(requestedChatId, DEFAULT_CHAT_ID)]
    : Object.keys(loadManifest().conversations || {}).sort();
  const matches = [];
  for (const chatId of conversations) {
    const rows = readConversationRecords(chatId);
    for (const row of rows) {
      let payload;
      try {
        payload = decryptPayload(row);
      } catch (_error) {
        continue;
      }
      const text = String(payload?.text ?? "");
      if (!text.toLowerCase().includes(needle)) {
        continue;
      }
      matches.push({
        chatId,
        id: row.id,
        role: normalizeRole(row.role),
        at: toIsoDate(row.at),
        source: clip(row.source || "", 80),
        excerpt: oneLine(text, 220)
      });
      if (matches.length >= safeLimit) {
        return matches;
      }
    }
  }
  return matches;
}

function backfillFullMemoryFromPublicMemory(memoryState = {}, options = {}) {
  if (!isFullMemoryLaneEnabled()) {
    return { ok: false, skipped: true, reason: "disabled" };
  }
  const manifest = loadManifest();
  const onlyIfEmpty = options.onlyIfEmpty !== false;
  if (onlyIfEmpty && Number(manifest.totalTurns || 0) > 0) {
    manifest.backfill = {
      lastRunAt: new Date().toISOString(),
      sourceMemoryUpdatedAt: String(memoryState?.updatedAt || ""),
      importedTurns: 0,
      skipped: true,
      reason: "lane_not_empty"
    };
    saveManifest(manifest);
    return { ok: true, skipped: true, reason: "lane_not_empty" };
  }

  const turns = Array.isArray(memoryState?.turns) ? memoryState.turns : [];
  let importedTurns = 0;
  for (const turn of turns) {
    const result = captureFullMemoryTurn({
      id: turn?.id,
      role: turn?.role,
      text: turn?.text,
      images: turn?.images,
      files: turn?.files,
      meta: {
        ...cloneMeta(turn?.meta),
        fullMemoryBackfill: true,
        fullMemoryBackfillSource: "public-memory"
      },
      at: turn?.at
    });
    if (result.ok) {
      importedTurns += 1;
    }
  }

  const nextManifest = loadManifest();
  nextManifest.backfill = {
    lastRunAt: new Date().toISOString(),
    sourceMemoryUpdatedAt: String(memoryState?.updatedAt || ""),
    importedTurns,
    skipped: false,
    reason: ""
  };
  saveManifest(nextManifest);
  return {
    ok: true,
    skipped: false,
    importedTurns
  };
}

module.exports = {
  FULL_MEMORY_ROOT,
  CONVERSATIONS_DIR,
  MANIFEST_PATH,
  isFullMemoryLaneEnabled,
  captureFullMemoryTurn,
  getFullMemoryLaneStatus,
  listFullMemoryConversations,
  getFullMemoryConversation,
  searchFullMemoryLane,
  backfillFullMemoryFromPublicMemory
};
