/** ASO Language Runtime — Typed ops against stable vocabulary entries.
 * LX chain: LX-153, LX-154, LX-170, LX-015 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { cleanLine, tokenizeQuery, buildSnippet } = require("./textIds");
function getInstanceRoot() { return require("../runtimePaths").instanceRoot; }
function getAsoDataDir() { return path.join(getInstanceRoot(), "data", "aso"); }
function getTablesDir() { return path.join(getAsoDataDir(), "tables"); }
function getOpsLogPath() { return path.join(getAsoDataDir(), "ops-log.ndjson"); }
function getCrosswalkPath() { return path.join(getAsoDataDir(), "crosswalk.json"); }

const VALID_TYPES = [
  "identity", "topic", "skill", "tool", "mistake", "pattern", "rule", "plan"
];
const VALID_VERBS = [
  "fixes", "caused", "requires", "blocks", "evolved",
  "contradicts", "proven_by", "observed_on", "part_of", "same_as", "runs_on"
];
const VALID_TIERS = ["boot", "foundational", "operational", "ephemeral"];
const VALID_STATUSES = ["open", "active", "resolved", "obsolete", "contradicted"];
const VALID_SCOPES = ["global", "gaia-local", "liris-local", "falcon-local"];

// --- ID generation ---
let _nextSeq = 0;
function generateAsoId() {
  _nextSeq += 1;
  const seq = String(_nextSeq).padStart(4, "0");
  const hash = crypto.createHash("sha1")
    .update(`${Date.now()}:${seq}:${process.pid}`, "utf8").digest("hex").slice(0, 6);
  return `ASO-${hash}${seq}`;
}
function generateRowId(prefix) {
  _nextSeq += 1;
  const hash = crypto.createHash("sha1")
    .update(`${prefix}:${Date.now()}:${_nextSeq}:${process.pid}`, "utf8").digest("hex").slice(0, 8);
  return `${prefix}-${hash}`;
}

// --- Atomic file I/O ---
function ensureDir(dirPath) { fs.mkdirSync(dirPath, { recursive: true }); }
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(String(fs.readFileSync(filePath, "utf8") || "{}"));
}
function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
  fs.renameSync(tmp, filePath);
}
function appendNdjson(filePath, record) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
}

// --- Write event emitter (opt-in, zero overhead if no listeners) ---
const _writeListeners = [];

function onWrite(cb) {
  if (typeof cb === "function") _writeListeners.push(cb);
}

function _emitWrite(evt) {
  if (_writeListeners.length === 0) return;
  for (const cb of _writeListeners) {
    try { cb(evt); } catch (_) { /* listener errors never break mutations */ }
  }
}

// --- Ops log ---
function logOp(op, payload, result) {
  appendNdjson(getOpsLogPath(), {
    op,
    at: new Date().toISOString(),
    pid: process.pid,
    payload,
    result: { ok: result.ok, id: result.id || "", error: result.error || "" }
  });
}

// --- Table I/O ---
function tablePath(tableName) {
  return path.join(getTablesDir(), `${tableName}.json`);
}

function readTable(tableName) {
  const data = readJsonFile(tablePath(tableName));
  if (!data || !Array.isArray(data.rows)) {
    return { tableName, rows: [], updatedAt: "" };
  }
  return data;
}

function writeTable(tableName, table) {
  table.updatedAt = new Date().toISOString();
  writeJsonAtomic(tablePath(tableName), table);
  return table;
}

// --- Topics (stable vocabulary) ---
function addTopic(input = {}) {
  const name = String(input.name || "").trim();
  if (!name) {
    return { ok: false, error: "name_required" };
  }
  const type = String(input.type || "topic").toLowerCase();
  if (!VALID_TYPES.includes(type)) {
    return { ok: false, error: `invalid_type:${type}` };
  }
  const tier = String(input.tier || "operational").toLowerCase();
  if (!VALID_TIERS.includes(tier)) {
    return { ok: false, error: `invalid_tier:${tier}` };
  }
  const table = readTable("topics");
  const duplicate = table.rows.find(
    (r) => String(r.name || "").toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: `duplicate_name:${duplicate.asoId}`, existingId: duplicate.asoId };
  }
  const asoId = input.asoId || generateAsoId();
  const row = {
    asoId, name, type,
    domains: Array.isArray(input.domains) ? input.domains.slice() : [],
    legacyIds: Array.isArray(input.legacyIds) ? input.legacyIds.slice() : [],
    tier,
    status: String(input.status || "active").toLowerCase(),
    scope: String(input.scope || "global").toLowerCase(),
    body: String(input.body || ""),
    summary: String(input.summary || ""),
    tags: Array.isArray(input.tags) ? input.tags.slice() : [],
    chain: Array.isArray(input.chain) ? input.chain.slice() : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: String(input.createdBy || process.env.ASOLARIA_AGENT_NAME || "unknown")
  };
  table.rows.push(row);
  writeTable("topics", table);
  if (row.legacyIds.length > 0) {
    const crosswalk = readJsonFile(getCrosswalkPath()) || { mappings: {} };
    for (const legacyId of row.legacyIds) {
      crosswalk.mappings[legacyId] = asoId;
    }
    writeJsonAtomic(getCrosswalkPath(), crosswalk);
  }
  const result = { ok: true, id: asoId, op: "add-topic" };
  logOp("add-topic", { name, type, tier, asoId }, result);
  _emitWrite(result);
  return result;
}

function reviseTopic(input = {}) {
  const asoId = String(input.asoId || "").trim();
  if (!asoId) {
    return { ok: false, error: "asoId_required" };
  }
  const table = readTable("topics");
  const row = table.rows.find((r) => r.asoId === asoId);
  if (!row) {
    return { ok: false, error: `not_found:${asoId}` };
  }
  const updatable = ["name", "type", "domains", "tier", "status", "scope", "body", "summary", "tags", "chain"];
  const changes = {};
  for (const key of updatable) {
    if (key in input && input[key] !== undefined) {
      if (key === "type" && !VALID_TYPES.includes(String(input[key]).toLowerCase())) {
        return { ok: false, error: `invalid_type:${input[key]}` };
      }
      if (key === "tier" && !VALID_TIERS.includes(String(input[key]).toLowerCase())) {
        return { ok: false, error: `invalid_tier:${input[key]}` };
      }
      changes[key] = input[key];
      row[key] = input[key];
    }
  }
  row.updatedAt = new Date().toISOString();
  row.revisedBy = String(input.revisedBy || process.env.ASOLARIA_AGENT_NAME || "unknown");
  writeTable("topics", table);
  const result = { ok: true, id: asoId, op: "revise-topic", changes: Object.keys(changes) };
  logOp("revise-topic", { asoId, changes: Object.keys(changes) }, result);
  _emitWrite(result);
  return result;
}

function getTopic(asoId) {
  const table = readTable("topics");
  return table.rows.find((r) => r.asoId === asoId) || null;
}

function findTopicByLegacyId(legacyId) {
  const crosswalk = readJsonFile(getCrosswalkPath()) || { mappings: {} };
  const asoId = crosswalk.mappings[legacyId];
  if (!asoId) { return null; }
  return getTopic(asoId);
}

function listTopics(filter = {}) {
  const table = readTable("topics");
  let rows = table.rows;
  if (filter.type) { rows = rows.filter((r) => r.type === String(filter.type).toLowerCase()); }
  if (filter.tier) { rows = rows.filter((r) => r.tier === String(filter.tier).toLowerCase()); }
  if (filter.status) { rows = rows.filter((r) => r.status === String(filter.status).toLowerCase()); }
  if (filter.scope) { rows = rows.filter((r) => r.scope === String(filter.scope).toLowerCase()); }
  return rows;
}

// --- Crosswalk (IX/LX -> ASO) ---
function getCrosswalk() {
  return readJsonFile(getCrosswalkPath()) || { mappings: {} };
}

function resolveId(id) {
  const crosswalk = getCrosswalk();
  return crosswalk.mappings[id] || id;
}

// --- Table ops from asoTables.js (factory injection, no circular deps) ---
const createTableOps = require("./asoTables");
const _tableOps = createTableOps({
  readTable, writeTable, generateRowId, logOp,
  getCrosswalk, VALID_VERBS, getAsoDataDir, _emitWrite
});

// --- Search (mirrors query.js scoreDocument pattern for ASO topics) ---
function scoreAsoTopic(row, query, tokens, filters) {
  const lo = (v) => String(v || "").toLowerCase();
  const nameLo = lo(row.name), typeLo = lo(row.type), tierLo = lo(row.tier), scopeLo = lo(row.scope);
  const tagLo = (row.tags || []).map(lo), chainLo = (row.chain || []).map(lo);
  const summLo = lo(row.summary), bodyLo = lo(row.body);
  if (filters.type && typeLo !== lo(filters.type)) { return 0; }
  if (filters.tier && tierLo !== lo(filters.tier)) { return 0; }
  if (filters.scope && scopeLo !== lo(filters.scope)) { return 0; }
  if (filters.tags && filters.tags.length > 0 &&
      !filters.tags.map(lo).some((n) => tagLo.includes(n))) { return 0; }
  let score = 0;
  const qLo = query.toLowerCase();
  if (nameLo === qLo) { score += 48; }
  if (nameLo.includes(qLo)) { score += 24; }
  for (const tk of tokens) {
    if (!tk) { continue; }
    if (nameLo.includes(tk)) { score += 18; }
    if (tagLo.some((v) => v.includes(tk))) { score += 12; }
    if (typeLo === tk) { score += 10; }
    if (chainLo.some((v) => v.includes(tk))) { score += 8; }
    if (summLo.includes(tk)) { score += 6; }
    if (bodyLo.includes(tk)) { score += 4; }
  }
  return score;
}

function searchTopics(query, options = {}) {
  const text = cleanLine(query);
  if (!text) { return { query: "", tokens: [], count: 0, matches: [] }; }
  const tokens = tokenizeQuery(text);
  const filters = { type: options.type || "", tier: options.tier || "",
    scope: options.scope || "", tags: Array.isArray(options.tags) ? options.tags : [] };
  const lim = Math.max(1, Math.min(30, Number(options.limit) || 10));
  const snipMax = Math.max(80, Math.min(420, Number(options.maxSnippetChars) || 220));
  const matches = readTable("topics").rows
    .map((row) => ({ row, score: scoreAsoTopic(row, text, tokens, filters) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score ||
      String(b.row.updatedAt || "").localeCompare(String(a.row.updatedAt || "")))
    .slice(0, lim)
    .map((r) => ({
      kind: "aso-topic", asoId: r.row.asoId, name: r.row.name,
      type: r.row.type, tier: r.row.tier, scope: r.row.scope,
      tags: (r.row.tags || []).slice(0, 12), chain: (r.row.chain || []).slice(0, 8),
      score: r.score, updatedAt: r.row.updatedAt,
      snippet: buildSnippet([r.row.summary, r.row.body].filter(Boolean).join(" "), tokens, snipMax)
    }));
  return { query: text, tokens, count: matches.length, matches };
}

module.exports = {
  onWrite,
  addTopic, reviseTopic, getTopic, findTopicByLegacyId, listTopics,
  searchTopics,
  getCrosswalk, resolveId,
  ..._tableOps,
  VALID_TYPES, VALID_VERBS, VALID_TIERS, VALID_STATUSES, VALID_SCOPES,
  getAsoDataDir
};
