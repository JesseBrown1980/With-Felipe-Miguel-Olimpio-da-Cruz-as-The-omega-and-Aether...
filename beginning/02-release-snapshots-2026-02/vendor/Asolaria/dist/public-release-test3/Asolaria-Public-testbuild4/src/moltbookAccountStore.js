const crypto = require("crypto");
const { setSecret, getSecret, getVaultStatus } = require("./secureVault");

const MOLTBOOK_SECRET_NAME = "moltbook.account";

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeUsername(value) {
  const raw = normalizeText(value).toLowerCase();
  const safe = raw.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
  if (!safe) return "";
  return safe.slice(0, 40);
}

function randomToken(length = 8) {
  return crypto.randomBytes(Math.max(4, Math.ceil(length / 2))).toString("hex").slice(0, length);
}

function generatePassword(length = 24) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^*_-+=";
  const bytes = crypto.randomBytes(Math.max(24, length));
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += alphabet[bytes[index] % alphabet.length];
  }
  return out;
}

function defaultMoltbookUrl() {
  return normalizeText(process.env.ASOLARIA_MOLTBOOK_URL, "https://moltbook.com/signup");
}

function maskValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 4) return "*".repeat(text.length);
  return `${text.slice(0, 2)}${"*".repeat(Math.max(2, text.length - 4))}${text.slice(-2)}`;
}

function sanitizeForDisplay(account) {
  if (!account) return null;
  return {
    portal: account.portal,
    accountType: account.accountType,
    displayName: account.displayName,
    username: account.username,
    email: account.email,
    usernameMasked: maskValue(account.username),
    emailMasked: maskValue(account.email),
    hasPassword: Boolean(account.password),
    passwordMasked: account.password ? `${"*".repeat(12)} (${String(account.password).length} chars)` : "",
    profileUrl: account.profileUrl,
    status: account.status || "draft",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    registeredAt: account.registeredAt || null
  };
}

function ensureAccountRecord(input = {}) {
  const now = new Date().toISOString();
  const timestamp = Date.now().toString(36);
  const generatedUsername = `asolaria-ai-${timestamp}-${randomToken(4)}`;
  const username = normalizeUsername(input.username) || generatedUsername;
  const email = normalizeText(input.email, `${username}@example.local`);
  const password = normalizeText(input.password, generatePassword(24));
  return {
    portal: "MoltBook",
    accountType: "AI",
    displayName: normalizeText(input.displayName, "Asolaria"),
    username,
    email,
    password,
    profileUrl: normalizeText(input.profileUrl, defaultMoltbookUrl()),
    notes: normalizeText(input.notes, "Autonomous AI account for Asolaria communication."),
    status: normalizeText(input.status, "draft"),
    createdAt: now,
    updatedAt: now,
    registeredAt: input.registeredAt || null
  };
}

function readMoltbookAccount(options = {}) {
  const secret = getSecret(MOLTBOOK_SECRET_NAME, { namespace: "asolaria" });
  if (!secret) return null;
  const account = secret.value || {};
  account.createdAt = account.createdAt || secret.createdAt;
  account.updatedAt = account.updatedAt || secret.updatedAt;
  if (options.reveal === true) {
    return account;
  }
  return sanitizeForDisplay(account);
}

function saveMoltbookAccount(account, meta = {}) {
  const normalized = {
    ...account,
    updatedAt: new Date().toISOString()
  };
  setSecret(MOLTBOOK_SECRET_NAME, normalized, {
    app: "Asolaria",
    portal: "MoltBook",
    credentialOwner: "asolaria",
    actor: "asolaria",
    ...meta
  }, { namespace: "asolaria" });
  return readMoltbookAccount();
}

function bootstrapMoltbookAccount(input = {}) {
  const existing = readMoltbookAccount({ reveal: true });
  if (existing) {
    return sanitizeForDisplay(existing);
  }
  const account = ensureAccountRecord(input);
  setSecret(MOLTBOOK_SECRET_NAME, account, {
    app: "Asolaria",
    portal: "MoltBook",
    credentialOwner: "asolaria",
    actor: "asolaria",
    createdBy: "bootstrap"
  }, { namespace: "asolaria" });
  return sanitizeForDisplay(account);
}

function updateMoltbookAccount(input = {}) {
  const existing = readMoltbookAccount({ reveal: true }) || ensureAccountRecord({});
  const next = {
    ...existing,
    displayName: normalizeText(input.displayName, existing.displayName),
    username: normalizeUsername(input.username) || existing.username,
    email: normalizeText(input.email, existing.email),
    password: normalizeText(input.password, existing.password),
    profileUrl: normalizeText(input.profileUrl, existing.profileUrl || defaultMoltbookUrl()),
    notes: normalizeText(input.notes, existing.notes || ""),
    status: normalizeText(input.status, existing.status || "draft"),
    registeredAt: input.registeredAt === null
      ? null
      : normalizeText(input.registeredAt, existing.registeredAt || null),
    updatedAt: new Date().toISOString()
  };
  return saveMoltbookAccount(next, { updatedBy: "update" });
}

function markMoltbookRegistered(extra = {}) {
  const existing = readMoltbookAccount({ reveal: true }) || ensureAccountRecord({});
  const next = {
    ...existing,
    status: "registered",
    registeredAt: new Date().toISOString(),
    notes: normalizeText(extra.notes, existing.notes || "Registered as AI account."),
    updatedAt: new Date().toISOString()
  };
  return saveMoltbookAccount(next, { updatedBy: "mark-registered" });
}

function revealMoltbookAccount() {
  return readMoltbookAccount({ reveal: true });
}

function getMoltbookAccountSummary() {
  return {
    account: readMoltbookAccount(),
    vault: getVaultStatus({ namespace: "asolaria" })
  };
}

module.exports = {
  MOLTBOOK_SECRET_NAME,
  bootstrapMoltbookAccount,
  updateMoltbookAccount,
  markMoltbookRegistered,
  revealMoltbookAccount,
  readMoltbookAccount,
  getMoltbookAccountSummary
};
