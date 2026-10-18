const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STORE_PATH = path.join(__dirname, "..", "data", "standing-directives.json");

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeStore(directives) {
  const tmpPath = STORE_PATH + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(directives, null, 2), "utf8");
  fs.renameSync(tmpPath, STORE_PATH);
}

function newId() {
  return `dir_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function listDirectives({ active } = {}) {
  const all = readStore();
  if (active === true) return all.filter(d => d.active !== false);
  if (active === false) return all.filter(d => d.active === false);
  return all;
}

function getDirective(id) {
  return readStore().find(d => d.id === id) || null;
}

function createDirective({ directive, priority, category, source, expiresAt } = {}) {
  if (!directive || typeof directive !== "string" || !directive.trim()) {
    throw new Error("Directive text is required.");
  }

  const now = nowIso();
  const entry = {
    id: newId(),
    directive: directive.trim(),
    priority: priority || "normal",
    category: category || "general",
    source: source || "operator",
    active: true,
    createdAt: now,
    updatedAt: now,
    expiresAt: expiresAt || null
  };

  const store = readStore();
  store.push(entry);
  writeStore(store);
  return entry;
}

function updateDirective(id, updates = {}) {
  const store = readStore();
  const idx = store.findIndex(d => d.id === id);
  if (idx === -1) return null;

  const allowed = ["directive", "priority", "category", "active", "expiresAt"];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      store[idx][key] = updates[key];
    }
  }
  store[idx].updatedAt = nowIso();
  writeStore(store);
  return store[idx];
}

function deleteDirective(id) {
  const store = readStore();
  const idx = store.findIndex(d => d.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  writeStore(store);
  return true;
}

function getActiveDirectivesText() {
  return listDirectives({ active: true })
    .sort((a, b) => {
      const prio = { critical: 0, high: 1, normal: 2, low: 3 };
      return (prio[a.priority] || 2) - (prio[b.priority] || 2);
    })
    .map(d => `[${d.priority}] ${d.directive}`)
    .join("\n");
}

module.exports = {
  listDirectives,
  getDirective,
  createDirective,
  updateDirective,
  deleteDirective,
  getActiveDirectivesText
};
