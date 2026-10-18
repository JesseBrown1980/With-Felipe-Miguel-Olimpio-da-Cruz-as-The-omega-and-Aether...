/**
 * Sovereignty Boot — Unified kernel loader for Asolaria.
 * Reads truth from ASOLARIA_SOVEREIGNTY_ROOT (USB) if available,
 * falls back to local data/ if USB is not connected.
 *
 * Unifies: index kernel, colony registry, selector catalog,
 * transport epochs, and draft promotion policy into one object.
 */
const fs = require("fs");
const path = require("path");
const { projectRoot } = require("./runtimePaths");

const SOVEREIGNTY_ROOT = (process.env.ASOLARIA_SOVEREIGNTY_ROOT || "").trim();

function resolveSovereigntyRoot() {
  if (SOVEREIGNTY_ROOT && fs.existsSync(SOVEREIGNTY_ROOT)) {
    return { root: SOVEREIGNTY_ROOT, source: "usb" };
  }
  return { root: projectRoot, source: "local" };
}

function loadJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {
    return null;
  }
}

function loadRegistry(root, source) {
  const schemaPath = source === "usb"
    ? path.join(root, "config", "colony-registry.schema.json")
    : path.join(root, "config", "colony-memory", "colony-registry.schema.json");
  const dataPath = source === "usb"
    ? path.join(root, "config", "colony-registry.json")
    : path.join(root, "config", "colony-memory", "colony-registry.json");
  const schema = loadJsonSafe(schemaPath);
  const data = loadJsonSafe(dataPath);
  const colonies = Array.isArray(data?.colonies) ? data.colonies : [];
  const colonyMap = {};
  for (const c of colonies) { if (c.colonyId) colonyMap[c.colonyId] = c; }
  return {
    loaded: Boolean(schema) || Boolean(data),
    schemaPath,
    dataPath,
    schema,
    data,
    colonies,
    colonyMap,
    colonyCount: colonies.length,
    getColony(id) { return colonyMap[id] || null; },
    isRegistered(id) { return Boolean(colonyMap[id]); },
    hasAuthority(id, requiredPolicy) {
      const c = colonyMap[id];
      if (!c) return false;
      if (c.status !== "live") return false;
      if (requiredPolicy === "owner_only") return c.authority?.mutationPolicy === "owner_only";
      if (requiredPolicy === "approval_required") return ["owner_only", "approval_required"].includes(c.authority?.mutationPolicy);
      return c.authority?.mutationPolicy !== "disabled";
    }
  };
}

function loadTransport(root, source) {
  const epochPath = source === "usb"
    ? path.join(root, "config", "transport-epoch.schema.json")
    : path.join(root, "config", "colony-memory", "transport-epoch.schema.json");
  const data = loadJsonSafe(epochPath);
  return {
    loaded: Boolean(data),
    path: epochPath,
    schema: data
  };
}

function loadPromotion(root, source) {
  const policyPath = source === "usb"
    ? path.join(root, "config", "draft-promotion-policy.schema.json")
    : path.join(root, "config", "colony-memory", "draft-promotion-policy.schema.json");
  const data = loadJsonSafe(policyPath);
  return {
    loaded: Boolean(data),
    path: policyPath,
    schema: data,
    layers: data?.properties?.layers?.items ? [] : [],
    canonicalSourceKinds: ["live_probe", "code_verified"],
    draftOnlySourceKinds: ["document_claim", "historical_transcript", "derived"]
  };
}

function loadCatalog(root, source) {
  const catalogPath = source === "usb"
    ? path.join(root, "data", "selector-catalog.json")
    : path.join(root, "data", "selector-catalog.json");
  const data = loadJsonSafe(catalogPath);
  const rawCategories = data?.categories || {};
  const categories = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories);
  const selectors = categories.reduce((acc, cat) => acc.concat(cat?.selectors || []), []);
  return {
    loaded: Boolean(data),
    path: catalogPath,
    categories,
    categoryCount: categories.length,
    selectors,
    selectorCount: selectors.length
  };
}

function loadTumbler(root, source) {
  const tumblerPath = source === "usb"
    ? path.join(root, "data", "selector-tumbler-state.json")
    : path.join(root, "data", "selector-tumbler-state.json");
  const data = loadJsonSafe(tumblerPath);
  return {
    loaded: Boolean(data),
    path: tumblerPath,
    state: data,
    classes: data ? Object.keys(data.tumblers || data) : []
  };
}

function loadIndexMetadata(root, source) {
  const catalogPath = source === "usb"
    ? path.join(root, "index", "CATALOG.md")
    : path.join(root, "data", "agent-index", "CATALOG.md");
  const exists = fs.existsSync(catalogPath);
  let entryCount = 0;
  if (exists) {
    try {
      const content = fs.readFileSync(catalogPath, "utf8");
      entryCount = (content.match(/^\| IX-/gm) || []).length;
    } catch (_) {}
  }
  return {
    loaded: exists,
    path: catalogPath,
    entryCount,
    indexRoot: source === "usb"
      ? path.join(root, "index")
      : path.join(root, "data", "agent-index")
  };
}

let _cached = null;

function boot(opts = {}) {
  if (_cached && !opts.force) return _cached;

  const { root, source } = resolveSovereigntyRoot();
  const registry = loadRegistry(root, source);
  const transport = loadTransport(root, source);
  const promotion = loadPromotion(root, source);
  const catalog = loadCatalog(root, source);
  const tumbler = loadTumbler(root, source);
  const index = loadIndexMetadata(root, source);

  _cached = {
    ok: true,
    source,
    root,
    bootedAt: new Date().toISOString(),
    registry,
    transport,
    promotion,
    catalog,
    tumbler,
    index,
    kernel: null // lazy-loaded on first use
  };

  // Lazy kernel accessor
  Object.defineProperty(_cached, "kernel", {
    get() {
      return require(path.join(__dirname, "index-kernel", "aso"));
    },
    configurable: true
  });

  return _cached;
}

function status() {
  const s = boot();
  return {
    ok: s.ok,
    source: s.source,
    root: s.root,
    bootedAt: s.bootedAt,
    registry: { loaded: s.registry.loaded, colonies: s.registry.colonyCount },
    transport: { loaded: s.transport.loaded },
    promotion: { loaded: s.promotion.loaded },
    catalog: { loaded: s.catalog.loaded, categories: s.catalog.categoryCount, selectors: s.catalog.selectorCount },
    tumbler: { loaded: s.tumbler.loaded, classes: s.tumbler.classes },
    index: { loaded: s.index.loaded, entries: s.index.entryCount }
  };
}

function isCanonicalSource(sourceKind) {
  const s = boot();
  if (!s.promotion.loaded) return true; // no policy = permissive
  return s.promotion.canonicalSourceKinds.includes(sourceKind);
}

function isDraftOnly(sourceKind) {
  const s = boot();
  if (!s.promotion.loaded) return false;
  return s.promotion.draftOnlySourceKinds.includes(sourceKind);
}

module.exports = { boot, status, resolveSovereigntyRoot, isCanonicalSource, isDraftOnly };
