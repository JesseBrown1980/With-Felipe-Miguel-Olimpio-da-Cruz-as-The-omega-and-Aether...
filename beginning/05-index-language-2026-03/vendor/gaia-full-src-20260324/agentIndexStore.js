const fs = require("fs");
const path = require("path");
const { projectRoot } = require("./runtimePaths");

const agentIndexRoot = path.join(projectRoot, "data", "agent-index");
const catalogPath = path.join(agentIndexRoot, "CATALOG.md");
const TYPE_SUBDIRS = ["skills", "patterns", "mistakes", "tools", "plans", "references", "rules", "policies", "tasks", "projects"];
const DEFAULT_CACHE_TTL_MS = Math.max(
  5 * 1000,
  Math.min(10 * 60 * 1000, Number(process.env.ASOLARIA_AGENT_INDEX_CACHE_TTL_MS || 45 * 1000))
);
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by", "for", "from", "if", "in", "into",
  "is", "it", "its", "of", "on", "or", "that", "the", "their", "them", "there", "these", "they", "this", "to",
  "was", "we", "were", "with", "you", "your", "task", "tasks", "note", "notes", "workspace", "asolaria",
  "ix", "agent"
]);

let cache = {
  loadedAt: 0,
  signature: "",
  catalogRows: [],
  entries: []
};

function normalizeIxId(value) {
  const match = String(value || "").match(/(\d{1,4})/);
  if (!match) return "";
  return `IX-${String(match[1]).padStart(3, "0")}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const text = String(value || "").trim();
  if (!text) return [];
  const cleaned = text.startsWith("[") && text.endsWith("]")
    ? text.slice(1, -1)
    : text;
  return cleaned
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => item.replace(/^["']|["']$/g, ""));
}

function cleanLine(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontMatter(rawText) {
  const source = String(rawText || "");
  if (!source.startsWith("---")) {
    return { attrs: {}, body: source };
  }
  const marker = source.indexOf("\n---", 3);
  if (marker < 0) {
    return { attrs: {}, body: source };
  }
  const frontmatter = source.slice(3, marker).trim();
  const body = source.slice(marker + 4).trim();
  const attrs = {};
  for (const line of frontmatter.split(/\r?\n/g)) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (!match) continue;
    const key = String(match[1] || "").trim();
    const value = String(match[2] || "").trim();
    if (!key) continue;
    if (["tags", "chain", "agents"].includes(key)) {
      attrs[key] = normalizeArray(value);
    } else {
      attrs[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { attrs, body };
}

function parseCatalogRows(rawText) {
  const rows = [];
  for (const line of String(rawText || "").split(/\r?\n/g)) {
    const match = line.match(/^\|\s*(\d{1,4})\s*\|/);
    if (!match) continue;
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 8) continue;
    rows.push({
      ix: normalizeIxId(match[1]),
      name: String(parts[2] || "").trim(),
      type: String(parts[3] || "").trim(),
      tags: normalizeArray(parts[4]),
      chain: normalizeArray(String(parts[5] || "").replace(/\u2192/g, ",")),
      agents: normalizeArray(parts[6])
    });
  }
  return rows;
}

function buildSummaryFromBody(body) {
  const lines = String(body || "")
    .split(/\r?\n/g)
    .map((line) => cleanLine(line))
    .filter(Boolean)
    .filter((line) => !/^#/.test(line));
  if (lines.length < 1) {
    return "";
  }
  return cleanLine(lines.slice(0, 3).join(" "));
}

function buildSnippet(text, terms, maxChars = 220) {
  const source = cleanLine(text);
  if (!source) return "";
  const lower = source.toLowerCase();
  let firstIndex = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && (firstIndex < 0 || idx < firstIndex)) {
      firstIndex = idx;
    }
  }
  if (firstIndex < 0) {
    if (source.length <= maxChars) return source;
    return `${source.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
  }
  const start = Math.max(0, firstIndex - 80);
  const end = Math.min(source.length, firstIndex + maxChars - 40);
  const snippet = source.slice(start, end).trim();
  return snippet.length <= maxChars
    ? snippet
    : `${snippet.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function tokenizeQuery(text) {
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && token.length <= 40 && !STOPWORDS.has(token))
    )
  ).slice(0, 20);
}

function extractIxRefs(text) {
  const refs = new Set();
  const source = String(text || "");
  const regex = /\bix[-_\s]?(\d{1,4})\b/gi;
  let match = regex.exec(source);
  while (match) {
    refs.add(normalizeIxId(match[1]));
    match = regex.exec(source);
  }
  return Array.from(refs);
}

function computeSignature(catalogStat, ixFiles) {
  const payload = [
    `${catalogPath}:${Number(catalogStat?.mtimeMs || 0)}:${Number(catalogStat?.size || 0)}`,
    ...ixFiles.map((row) => `${row.path}:${row.mtimeMs}:${row.size}`)
  ];
  return payload.join("|");
}

function listIxFiles() {
  if (!fs.existsSync(agentIndexRoot)) {
    return [];
  }
  const seen = new Map(); // filename -> {path, mtimeMs, size}
  const ixPattern = /^IX-\d{3,4}\.md$/i;

  // Scan type subdirectories first (preferred source)
  for (const subdir of TYPE_SUBDIRS) {
    const subdirPath = path.join(agentIndexRoot, subdir);
    if (!fs.existsSync(subdirPath)) continue;
    try {
      const entries = fs.readdirSync(subdirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !ixPattern.test(entry.name)) continue;
        const fullPath = path.join(subdirPath, entry.name);
        const stat = fs.statSync(fullPath);
        seen.set(entry.name, {
          path: fullPath,
          mtimeMs: Number(stat.mtimeMs || 0),
          size: Number(stat.size || 0)
        });
      }
    } catch (_error) { /* skip unreadable subdirs */ }
  }

  // Scan root for any IX files not yet in type folders (backward compat)
  try {
    const rootEntries = fs.readdirSync(agentIndexRoot, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (!entry.isFile() || !ixPattern.test(entry.name)) continue;
      if (seen.has(entry.name)) continue; // type folder wins
      const fullPath = path.join(agentIndexRoot, entry.name);
      const stat = fs.statSync(fullPath);
      seen.set(entry.name, {
        path: fullPath,
        mtimeMs: Number(stat.mtimeMs || 0),
        size: Number(stat.size || 0)
      });
    }
  } catch (_error) { /* skip */ }

  return Array.from(seen.values())
    .sort((a, b) => a.path.localeCompare(b.path));
}

function loadAgentIndex(options = {}) {
  const force = Boolean(options.force);
  const ttlMs = Math.max(1000, Number(options.cacheTtlMs) || DEFAULT_CACHE_TTL_MS);
  if (!fs.existsSync(catalogPath)) {
    return {
      loadedAt: 0,
      catalogRows: [],
      entries: []
    };
  }

  const catalogStat = fs.statSync(catalogPath);
  const ixFiles = listIxFiles();
  const signature = computeSignature(catalogStat, ixFiles);
  const now = Date.now();
  const cacheAgeMs = now - Number(cache.loadedAt || 0);
  const canReuse = !force
    && cache.loadedAt > 0
    && cache.signature === signature
    && cacheAgeMs <= ttlMs;

  if (canReuse) {
    return {
      loadedAt: cache.loadedAt,
      catalogRows: cache.catalogRows.slice(),
      entries: cache.entries.slice()
    };
  }

  const catalogRaw = String(fs.readFileSync(catalogPath, "utf8") || "");
  const catalogRows = parseCatalogRows(catalogRaw);
  const catalogMap = new Map(catalogRows.map((row) => [row.ix, row]));
  const entries = [];
  for (const file of ixFiles) {
    let rawText = "";
    try {
      rawText = String(fs.readFileSync(file.path, "utf8") || "");
    } catch (_error) {
      rawText = "";
    }
    if (!rawText.trim()) {
      continue;
    }
    const parsed = parseFrontMatter(rawText);
    const ix = normalizeIxId(parsed.attrs.ix || path.basename(file.path));
    const catalogRow = catalogMap.get(ix) || {};
    const body = String(parsed.body || "").trim();
    const summary = buildSummaryFromBody(body);
    const title = cleanLine(parsed.attrs.name || catalogRow.name || ix);
    const type = cleanLine(parsed.attrs.type || catalogRow.type || "reference");
    const tags = normalizeArray(parsed.attrs.tags || catalogRow.tags || []);
    const chain = normalizeArray(parsed.attrs.chain || catalogRow.chain || []);
    const source = path.relative(projectRoot, file.path).replace(/\\/g, "/");
    const searchable = [
      ix,
      title,
      type,
      tags.join(" "),
      chain.join(" "),
      summary,
      body
    ].filter(Boolean).join("\n");
    entries.push({
      ix,
      title,
      type,
      tags,
      chain,
      source,
      absolutePath: file.path,
      updatedAt: new Date(file.mtimeMs).toISOString(),
      summary,
      body,
      searchable,
      searchableLower: searchable.toLowerCase()
    });
  }

  cache = {
    loadedAt: now,
    signature,
    catalogRows,
    entries
  };
  return {
    loadedAt: cache.loadedAt,
    catalogRows: cache.catalogRows.slice(),
    entries: cache.entries.slice()
  };
}

function scoreEntry(entry, query, tokens, ixRefs) {
  const lower = String(entry.searchableLower || "");
  const titleLower = String(entry.title || "").toLowerCase();
  const tagLower = entry.tags.map((item) => String(item || "").toLowerCase());
  const chainLower = entry.chain.map((item) => String(item || "").toLowerCase());
  let score = 0;

  for (const ixRef of ixRefs) {
    if (!ixRef) continue;
    if (entry.ix === ixRef) {
      score += 240;
    }
    if (chainLower.includes(ixRef.toLowerCase())) {
      score += 30;
    }
  }

  for (const token of tokens) {
    if (!token) continue;
    if (titleLower.includes(token)) {
      score += 18;
    }
    if (tagLower.some((value) => value.includes(token))) {
      score += 12;
    }
    if (String(entry.type || "").toLowerCase() === token) {
      score += 10;
    }
    if (chainLower.some((value) => value.includes(token))) {
      score += 8;
    }
    if (lower.includes(token)) {
      score += 4;
    }
  }

  if (query && lower.includes(query.toLowerCase())) {
    score += 24;
  }

  return score;
}

function getAgentIndexStatus(options = {}) {
  const loaded = loadAgentIndex(options);
  return {
    ok: true,
    enabled: fs.existsSync(catalogPath),
    loadedAt: loaded.loadedAt ? new Date(loaded.loadedAt).toISOString() : "",
    root: agentIndexRoot,
    catalogPath,
    catalogEntries: loaded.catalogRows.length,
    ixFiles: loaded.entries.length
  };
}

function searchAgentIndex(query, options = {}) {
  const text = cleanLine(query);
  const loaded = loadAgentIndex(options);
  if (!text) {
    return {
      ok: true,
      enabled: fs.existsSync(catalogPath),
      query: "",
      count: 0,
      matches: []
    };
  }
  const tokens = tokenizeQuery(text);
  const ixRefs = extractIxRefs(text);
  const safeLimit = Math.max(1, Math.min(30, Number(options.limit) || 6));
  const scored = loaded.entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, text, tokens, ixRefs)
    }))
    .filter((row) => row.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return String(right.entry.updatedAt || "").localeCompare(String(left.entry.updatedAt || ""));
    })
    .slice(0, safeLimit)
    .map((row) => ({
      kind: "index",
      ix: row.entry.ix,
      source: row.entry.source,
      title: row.entry.title,
      type: row.entry.type,
      tags: row.entry.tags.slice(0, 12),
      chain: row.entry.chain.slice(0, 8),
      line: 1,
      score: row.score,
      snippet: buildSnippet(
        [row.entry.summary, row.entry.body].filter(Boolean).join(" "),
        tokens.concat(ixRefs.map((value) => value.toLowerCase())),
        Math.max(80, Math.min(420, Number(options.maxSnippetChars) || 220))
      ),
      updatedAt: row.entry.updatedAt
    }));

  return {
    ok: true,
    enabled: fs.existsSync(catalogPath),
    query: text,
    tokens,
    ixRefs,
    count: scored.length,
    matches: scored
  };
}

function buildAgentIndexContextForPrompt(query, options = {}) {
  const costMode = String(options.costMode || "low").toLowerCase();
  const limit = costMode === "quality" ? 4 : costMode === "balanced" ? 3 : 2;
  const result = searchAgentIndex(query, {
    limit,
    maxSnippetChars: costMode === "quality" ? 260 : costMode === "balanced" ? 220 : 180
  });
  if (result.count < 1) {
    return "";
  }
  const lines = result.matches.map((row) => {
    const tagText = row.tags.length > 0 ? ` [${row.tags.join(", ")}]` : "";
    return `- ${row.ix} ${row.type} "${row.title}"${tagText} ${row.snippet}`;
  });
  return ["Agent index:", ...lines].join("\n");
}

function collectAgentIndexDocuments(limit = 120, options = {}) {
  const safeLimit = Math.max(1, Math.min(800, Number(limit) || 120));
  const loaded = loadAgentIndex(options);
  return loaded.entries.slice(0, safeLimit).map((entry) => ({
    id: `agent-index:${entry.ix}`,
    sourceKind: "agent_index",
    sourceLabel: entry.source,
    title: `${entry.ix} ${entry.title}`.trim(),
    updatedAt: entry.updatedAt,
    text: [
      entry.ix,
      `Name: ${entry.title}`,
      `Type: ${entry.type}`,
      entry.tags.length > 0 ? `Tags: ${entry.tags.join(", ")}` : "",
      entry.chain.length > 0 ? `Chain: ${entry.chain.join(", ")}` : "",
      entry.summary,
      entry.body
    ].filter(Boolean).join("\n"),
    snippet: entry.summary || buildSnippet(entry.body, [], 240),
    hash: `${entry.ix}:${entry.updatedAt}:${entry.title}`
  }));
}

// Semantic search — lazy require to avoid circular dependency
// (semanticKnowledgeStore requires agentIndexStore → circle)
let semanticKnowledgeStore = null;
function getSemanticStore() {
  if (semanticKnowledgeStore === null) {
    try { semanticKnowledgeStore = require("./semanticKnowledgeStore"); } catch (_) { semanticKnowledgeStore = false; }
  }
  return semanticKnowledgeStore || null;
}

/**
 * Hybrid search: semantic-first via Google Embedding 2, keyword fallback.
 * Returns a Promise. Callers wanting sync-only should use searchAgentIndex directly.
 * options.keywordOnly — bypass semantic search entirely
 * options.semanticTimeoutMs — max ms to wait for semantic (default 2000)
 */
async function searchAgentIndexHybrid(query, options = {}) {
  const text = cleanLine(query);
  if (!text || options.keywordOnly) {
    return searchAgentIndex(query, options);
  }

  // Try semantic search with timeout guard
  const semStore = getSemanticStore();
  if (semStore && typeof semStore.searchSemanticKnowledge === "function") {
    try {
      const timeoutMs = Math.max(500, Math.min(5000, Number(options.semanticTimeoutMs) || 2000));
      const semanticPromise = semStore.searchSemanticKnowledge(text, {
        limit: Math.max(1, Math.min(30, Number(options.limit) || 6)),
        minScore: options.minScore
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("semantic_timeout")), timeoutMs)
      );
      const result = await Promise.race([semanticPromise, timeoutPromise]);

      if (result && result.ok && Array.isArray(result.matches) && result.matches.length > 0) {
        const matches = result.matches.map((m) => ({
          ...m,
          semantic: true
        }));
        return {
          ok: true,
          enabled: true,
          query: text,
          count: matches.length,
          matches,
          searchMode: "semantic"
        };
      }
      // Semantic returned empty — fall through to keyword
    } catch (_) { /* semantic failed or timed out — fall through to keyword */ }
  }

  const keywordResult = searchAgentIndex(query, options);
  keywordResult.searchMode = "keyword_fallback";
  return keywordResult;
}

// Remote catalog search — optional dependency (not all nodes have indexCatalogSync)
let indexCatalogSync = null;
try { indexCatalogSync = require("./indexCatalogSync"); } catch (_) { /* not available on this node */ }

function searchWithRemote(query, options = {}) {
  const local = searchAgentIndex(query, options);
  const localMatches = local.matches || [];

  let remoteMatches = [];
  if (indexCatalogSync && typeof indexCatalogSync.searchRemoteCatalogs === "function") {
    try {
      const raw = indexCatalogSync.searchRemoteCatalogs(query);
      remoteMatches = (Array.isArray(raw) ? raw : []).map(hit => ({
        kind: "remote_catalog",
        nodeId: hit.nodeId,
        catalogPath: hit.catalogPath,
        entries: hit.entries,
        entryIds: (hit.entryIds || []).slice(0, 20),
        lastModified: hit.lastModified || "",
        remote: true
      }));
    } catch (_) { /* remote search failed — degrade gracefully */ }
  }

  const matches = [...localMatches, ...remoteMatches];
  return {
    ok: true,
    query: local.query || cleanLine(query),
    matches,
    localCount: localMatches.length,
    remoteCount: remoteMatches.length,
    totalCount: matches.length
  };
}

/**
 * Era-gated sub-catalog reader (IX-375 speed optimization #4).
 * Splits a sub-catalog's rows into eras of 100 IX numbers each
 * (1-99 = era 1, 100-199 = era 2, 200-299 = era 3, etc.).
 * Returns only the LATEST era by default — agents load older eras only when chaining.
 *
 * @param {string} subCatalogPath — absolute path to a CATALOG-*.md file
 * @param {object} [options]
 * @param {boolean} [options.allEras] — return all rows ungated
 * @param {number}  [options.era]    — return a specific era (1-based)
 * @returns {{ era: number, totalEras: number, rows: object[], allRows: number }}
 */
function eraGateSubCatalog(subCatalogPath, options = {}) {
  let raw = "";
  try { raw = fs.readFileSync(subCatalogPath, "utf8"); } catch (_) { /* missing file */ }
  const allRows = parseCatalogRows(raw);
  if (options.allEras) {
    return { era: 0, totalEras: 0, rows: allRows, allRows: allRows.length };
  }

  // Bucket rows by era (every 100 IX numbers)
  const buckets = new Map(); // era number → row[]
  for (const row of allRows) {
    const num = parseInt(String(row.ix).replace(/\D/g, ""), 10) || 0;
    const eraN = Math.floor(num / 100) + 1;
    if (!buckets.has(eraN)) buckets.set(eraN, []);
    buckets.get(eraN).push(row);
  }

  const eraKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const totalEras = eraKeys.length;
  if (totalEras === 0) {
    return { era: 0, totalEras: 0, rows: [], allRows: 0 };
  }

  const requestedEra = options.era != null
    ? Math.max(1, Math.min(Number(options.era) || 1, eraKeys[eraKeys.length - 1]))
    : eraKeys[eraKeys.length - 1]; // latest era

  return {
    era: requestedEra,
    totalEras,
    rows: buckets.get(requestedEra) || [],
    allRows: allRows.length
  };
}

module.exports = {
  getAgentIndexStatus,
  searchAgentIndex,
  searchAgentIndexHybrid,
  searchWithRemote,
  buildAgentIndexContextForPrompt,
  collectAgentIndexDocuments,
  normalizeIxId,
  eraGateSubCatalog
};
