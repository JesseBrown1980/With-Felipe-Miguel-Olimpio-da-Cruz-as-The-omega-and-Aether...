const fs = require("fs");
const path = require("path");
const { resolveDataPath } = require("./runtimePaths");
const { getSkillRegistry, listSkillSummaries } = require("./skillRegistry");
const { getSkillActionCatalog } = require("./skillRunner");

const indexPath = resolveDataPath("skills-tools-index.json");
let cache = null;
let cacheAtMs = 0;

function ensureDir() {
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  ensureDir();
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function normalizeExternalProviderRows(rows) {
  const source = Array.isArray(rows) ? rows : [];
  return source.map((row) => {
    const item = row && typeof row === "object" ? row : {};
    return {
      id: String(item.id || "").trim().toLowerCase(),
      enabled: Boolean(item.enabled),
      configured: Boolean(item.configured),
      apiStyle: String(item.apiStyle || "").trim().toLowerCase(),
      mcpEnabled: Boolean(item.mcpEnabled),
      mcpConfigured: Boolean(item.mcpConfigured),
      mcpConfigError: String(item.mcpConfigError || "").trim() || null,
      mcpServerLabel: String(item.mcpServerLabel || "").trim() || null,
      mcpServerUrl: String(item.mcpServerUrl || "").trim() || null,
      mcpConnectorId: String(item.mcpConnectorId || "").trim() || null,
      mcpPreset: String(item.mcpPreset || "").trim() || null,
      mcpApprovalMode: String(item.mcpApprovalMode || "").trim().toLowerCase() || "auto",
      mcpAllowedToolsCount: Number(item.mcpAllowedToolsCount || 0) || 0
    };
  }).filter((row) => row.id);
}

function normalizeMcpCacheStatus(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    providerCatalogCount: Number(source.providerCatalogCount || 0) || 0,
    scopedContextCount: Number(source.scopedContextCount || 0) || 0,
    updatedAt: String(source.updatedAt || "").trim() || ""
  };
}

function buildSkillsToolsIndex(options = {}) {
  const registry = getSkillRegistry({ maxAgeMs: 0 });
  const skills = listSkillSummaries();
  const actions = getSkillActionCatalog();
  const externalProviders = normalizeExternalProviderRows(options.externalProviders);
  const mcpProviders = externalProviders.filter((row) => row.mcpEnabled || row.mcpConfigured || row.mcpServerUrl);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    root: registry.root,
    skills: {
      total: registry.total,
      loadedAt: registry.loadedAt,
      errors: registry.errors,
      items: skills
    },
    tools: {
      totalActions: actions.length,
      actions
    },
    mcp: {
      providers: mcpProviders,
      cache: normalizeMcpCacheStatus(options.mcpCache)
    }
  };
}

function tryReadIndexFromDisk() {
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    if (!String(raw || "").trim()) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function rebuildSkillsToolsIndex(options = {}) {
  const index = buildSkillsToolsIndex(options);
  writeJsonAtomic(indexPath, index);
  cache = index;
  cacheAtMs = Date.now();
  return index;
}

function readSkillsToolsIndex(options = {}) {
  const force = Boolean(options.force);
  const maxAgeMs = Math.max(250, Math.min(300000, Number(options.maxAgeMs || 60000)));
  const now = Date.now();
  if (!force && cache && now - cacheAtMs <= maxAgeMs) {
    return cache;
  }
  if (!force) {
    const disk = tryReadIndexFromDisk();
    if (disk) {
      cache = disk;
      cacheAtMs = now;
      return disk;
    }
  }
  return rebuildSkillsToolsIndex(options);
}

module.exports = {
  getSkillsToolsIndexPath: () => indexPath,
  readSkillsToolsIndex,
  rebuildSkillsToolsIndex,
  buildSkillsToolsIndex
};

