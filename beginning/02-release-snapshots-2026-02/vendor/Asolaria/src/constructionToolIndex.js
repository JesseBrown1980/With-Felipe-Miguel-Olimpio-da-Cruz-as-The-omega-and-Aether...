/**
 * Construction Tool Index — Numbered Fast-Load Index System
 *
 * Instead of loading full tool/skill definitions into every instant agent,
 * each construction maintains a numbered index. An instant agent loads only
 * the index (lightweight numbers + labels), and when it needs a specific
 * tool, it requests it by number from the index which resolves to the full
 * definition on demand.
 *
 * This is the "minimal instant agent with linked structures ready to load"
 * pattern Jesse described — the agent stays light, the index stays fast,
 * and full definitions are loaded only when needed.
 *
 * Index Structure:
 *   #001 → { type: "skill", id: "codebase-review-*", label: "Code Review", weight: 3 }
 *   #002 → { type: "tool", id: "typescript", label: "TypeScript Compiler", weight: 2 }
 *   #003 → { type: "mistake", id: "wrong-repo-target", label: "Wrong repo target", weight: 5 }
 *   #004 → { type: "pattern", id: "permission-enforcement", label: "Permission gate pattern", weight: 4 }
 *   #005 → { type: "context", id: "EzProtectEvent.ts", label: "Domain model file", weight: 1 }
 *
 * Weight determines load priority: higher weight = loaded first if capacity is limited.
 */

const fs = require("fs");
const path = require("path");

const INDEX_DATA_DIR = path.join(__dirname, "..", "data", "constructions", "indexes");

// ── Index Entry ──

class IndexEntry {
  constructor(number, spec = {}) {
    this.number = number; // e.g., 1, 2, 3...
    this.type = String(spec.type || "unknown").trim(); // skill | tool | mistake | pattern | context | domain_model
    this.id = String(spec.id || "").trim();
    this.label = String(spec.label || spec.id || "").trim().slice(0, 120);
    this.weight = Math.max(0, Math.min(10, Number(spec.weight || 1)));
    this.fullDefinition = spec.fullDefinition || null; // lazy-loaded
    this.loadedAt = null;
    this.accessCount = 0;
  }

  /**
   * Return the lightweight index reference (what agents see initially).
   */
  toRef() {
    return {
      n: this.number,
      type: this.type,
      id: this.id,
      label: this.label,
      weight: this.weight,
      loaded: Boolean(this.fullDefinition)
    };
  }

  /**
   * Load the full definition (if not already loaded).
   */
  load(definition) {
    this.fullDefinition = definition;
    this.loadedAt = new Date().toISOString();
    this.accessCount += 1;
    return this;
  }

  /**
   * Unload to free memory — return to index-only state.
   */
  unload() {
    this.fullDefinition = null;
    this.loadedAt = null;
    return this;
  }
}

// ── Construction Tool Index ──

class ConstructionToolIndex {
  constructor(constructionId) {
    this.constructionId = constructionId;
    this.entries = new Map(); // number → IndexEntry
    this.nextNumber = 1;
    this.createdAt = new Date().toISOString();
    this.lastAccessAt = "";
  }

  /**
   * Add an entry to the index.
   */
  add(spec = {}) {
    const entry = new IndexEntry(this.nextNumber, spec);
    this.entries.set(this.nextNumber, entry);
    this.nextNumber += 1;
    return entry;
  }

  /**
   * Add multiple entries at once from a construction profile.
   */
  addFromProfile(profile = {}) {
    const added = [];

    // Skills
    for (const skill of (profile.skills || [])) {
      added.push(this.add({ type: "skill", id: skill, label: skill, weight: 3 }));
    }

    // Tools
    for (const tool of (profile.tools || [])) {
      added.push(this.add({ type: "tool", id: tool, label: tool, weight: 2 }));
    }

    // Mistakes (high weight — must always be loaded)
    for (const mistake of (profile.mistakes || [])) {
      const parts = String(mistake).split(":");
      added.push(this.add({
        type: "mistake",
        id: parts[0]?.trim() || mistake,
        label: mistake,
        weight: 5,
        fullDefinition: mistake
      }));
    }

    // Patterns
    for (const pattern of (profile.patterns || [])) {
      const parts = String(pattern).split(":");
      added.push(this.add({
        type: "pattern",
        id: parts[0]?.trim() || pattern,
        label: pattern,
        weight: 4,
        fullDefinition: pattern
      }));
    }

    // Context files
    for (const file of (profile.contextFiles || [])) {
      const basename = path.basename(file);
      added.push(this.add({
        type: "context",
        id: basename,
        label: `Context: ${basename}`,
        weight: 1,
        fullDefinition: { path: file }
      }));
    }

    // Domain model (if present)
    if (profile.domainModel) {
      added.push(this.add({
        type: "domain_model",
        id: "domain-model",
        label: `Domain Model: ${profile.domainModel.entity || "model"}`,
        weight: 6,
        fullDefinition: profile.domainModel
      }));
    }

    return added;
  }

  /**
   * Get the lightweight index — what an instant agent loads immediately.
   * Returns only references, not full definitions.
   * Sorted by weight (highest first) for priority loading.
   */
  getIndex() {
    this.lastAccessAt = new Date().toISOString();
    return Array.from(this.entries.values())
      .sort((a, b) => b.weight - a.weight)
      .map(e => e.toRef());
  }

  /**
   * Get a specific entry by number, loading its full definition.
   */
  getByNumber(number) {
    const entry = this.entries.get(number);
    if (!entry) return null;
    entry.accessCount += 1;
    this.lastAccessAt = new Date().toISOString();
    return entry;
  }

  /**
   * Get entries by type.
   */
  getByType(type) {
    return Array.from(this.entries.values()).filter(e => e.type === type);
  }

  /**
   * Get the top N entries by weight (for instant agent minimal load).
   */
  getTopN(n = 5) {
    return Array.from(this.entries.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  }

  /**
   * Build the instant agent's minimal load packet — the essentials it must know.
   * Includes: all mistakes (always), all patterns (always), domain model (if exists),
   * plus the index for everything else.
   */
  buildInstantLoadPacket() {
    const mustLoad = []; // entries that are always loaded
    const indexOnly = []; // entries available by number request

    for (const entry of this.entries.values()) {
      if (entry.type === "mistake" || entry.type === "pattern" || entry.type === "domain_model") {
        mustLoad.push({
          n: entry.number,
          type: entry.type,
          id: entry.id,
          label: entry.label,
          definition: entry.fullDefinition
        });
      } else {
        indexOnly.push(entry.toRef());
      }
    }

    return {
      constructionId: this.constructionId,
      mustLoad, // Always included in agent prompt
      indexOnly, // Available on-demand by number
      totalEntries: this.entries.size,
      loadedAt: new Date().toISOString()
    };
  }

  /**
   * Record a mistake discovered during processing and add to index.
   */
  recordMistake(mistake) {
    const id = String(mistake.id || `mistake-${Date.now()}`).slice(0, 60);
    const label = String(mistake.description || mistake.label || id).slice(0, 200);

    // Check if this mistake already exists
    for (const entry of this.entries.values()) {
      if (entry.type === "mistake" && entry.id === id) {
        entry.accessCount += 1; // bump weight through access
        return entry;
      }
    }

    return this.add({
      type: "mistake",
      id,
      label,
      weight: 5,
      fullDefinition: {
        id,
        description: label,
        discoveredAt: new Date().toISOString(),
        discoveredBy: mistake.agentId || "unknown",
        context: mistake.context || {}
      }
    });
  }

  /**
   * Record a new pattern discovered during processing.
   */
  recordPattern(pattern) {
    const id = String(pattern.id || `pattern-${Date.now()}`).slice(0, 60);
    const label = String(pattern.description || pattern.label || id).slice(0, 200);

    for (const entry of this.entries.values()) {
      if (entry.type === "pattern" && entry.id === id) {
        entry.accessCount += 1;
        return entry;
      }
    }

    return this.add({
      type: "pattern",
      id,
      label,
      weight: 4,
      fullDefinition: {
        id,
        description: label,
        discoveredAt: new Date().toISOString(),
        discoveredBy: pattern.agentId || "unknown"
      }
    });
  }

  toJSON() {
    return {
      constructionId: this.constructionId,
      entryCount: this.entries.size,
      byType: {
        skill: this.getByType("skill").length,
        tool: this.getByType("tool").length,
        mistake: this.getByType("mistake").length,
        pattern: this.getByType("pattern").length,
        context: this.getByType("context").length,
        domain_model: this.getByType("domain_model").length
      },
      topEntries: this.getTopN(8).map(e => e.toRef()),
      createdAt: this.createdAt,
      lastAccessAt: this.lastAccessAt
    };
  }
}

// ── Index Registry ──

const _indexes = new Map();

/**
 * Get or create a tool index for a construction.
 */
function getOrCreateIndex(constructionId, profile = null) {
  if (_indexes.has(constructionId)) {
    return _indexes.get(constructionId);
  }
  const index = new ConstructionToolIndex(constructionId);
  if (profile) {
    index.addFromProfile(profile);
  }
  _indexes.set(constructionId, index);
  return index;
}

function getIndex(constructionId) {
  return _indexes.get(constructionId) || null;
}

function getAllIndexes() {
  return Array.from(_indexes.values());
}

/**
 * Initialize indexes for all QDD constructions.
 */
function initializeQddIndexes() {
  const { QDD_CONSTRUCTIONS } = require("./constructionIndex");
  for (const [id, spec] of Object.entries(QDD_CONSTRUCTIONS)) {
    getOrCreateIndex(id, spec);
  }
}

/**
 * Save all indexes to disk.
 */
function saveIndexes() {
  try {
    fs.mkdirSync(INDEX_DATA_DIR, { recursive: true });
    for (const [id, index] of _indexes) {
      const entries = [];
      for (const entry of index.entries.values()) {
        entries.push({
          number: entry.number,
          type: entry.type,
          id: entry.id,
          label: entry.label,
          weight: entry.weight,
          accessCount: entry.accessCount,
          fullDefinition: entry.fullDefinition
        });
      }
      fs.writeFileSync(
        path.join(INDEX_DATA_DIR, `${id}.json`),
        JSON.stringify({ constructionId: id, nextNumber: index.nextNumber, entries }, null, 2),
        "utf8"
      );
    }
    return true;
  } catch (err) {
    console.warn("[construction-tool-index] save failed:", err?.message || err);
    return false;
  }
}

/**
 * Load indexes from disk.
 */
function loadIndexes() {
  try {
    if (!fs.existsSync(INDEX_DATA_DIR)) return false;
    const files = fs.readdirSync(INDEX_DATA_DIR).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(INDEX_DATA_DIR, file), "utf8"));
      const index = new ConstructionToolIndex(raw.constructionId);
      index.nextNumber = raw.nextNumber || 1;
      for (const entry of (raw.entries || [])) {
        const ie = new IndexEntry(entry.number, entry);
        ie.accessCount = entry.accessCount || 0;
        index.entries.set(entry.number, ie);
        if (entry.number >= index.nextNumber) index.nextNumber = entry.number + 1;
      }
      _indexes.set(raw.constructionId, index);
    }
    return true;
  } catch (err) {
    console.warn("[construction-tool-index] load failed:", err?.message || err);
    return false;
  }
}

module.exports = {
  IndexEntry,
  ConstructionToolIndex,
  getOrCreateIndex,
  getIndex,
  getAllIndexes,
  initializeQddIndexes,
  saveIndexes,
  loadIndexes
};
