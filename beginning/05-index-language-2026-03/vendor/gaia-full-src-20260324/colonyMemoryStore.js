const fs = require("fs");
const path = require("path");
const { projectRoot } = require("./runtimePaths");

const colonyMemoryRoot = path.join(projectRoot, "config", "colony-memory");
const DEFAULT_CACHE_TTL_MS = Math.max(
  5 * 1000,
  Math.min(10 * 60 * 1000, Number(process.env.ASOLARIA_COLONY_MEMORY_CACHE_TTL_MS || 45 * 1000))
);
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by", "for", "from", "if", "in", "into",
  "is", "it", "its", "of", "on", "or", "that", "the", "their", "them", "there", "these", "they", "this", "to",
  "was", "we", "were", "with", "you", "your", "memory", "schema", "schemas", "colony", "contracts", "asolaria"
]);

let cache = {
  loadedAt: 0,
  signature: "",
  files: [],
  entries: []
};

function cleanLine(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(text) {
  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .split(/[^a-z0-9_:-]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && token.length <= 48 && !STOPWORDS.has(token))
    )
  ).slice(0, 20);
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
    return source.length <= maxChars
      ? source
      : `${source.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
  }
  const start = Math.max(0, firstIndex - 80);
  const end = Math.min(source.length, firstIndex + maxChars - 40);
  const snippet = source.slice(start, end).trim();
  return snippet.length <= maxChars
    ? snippet
    : `${snippet.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function listContractFiles(root = colonyMemoryRoot, relativePrefix = "") {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      entries.push(...listContractFiles(absolutePath, relativePath));
      continue;
    }
    if (!/\.(json|md)$/i.test(entry.name)) {
      continue;
    }
    const stat = fs.statSync(absolutePath);
    entries.push({
      absolutePath,
      relativePath: relativePath.replace(/\\/g, "/"),
      mtimeMs: Number(stat.mtimeMs || 0),
      size: Number(stat.size || 0)
    });
  }
  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function computeSignature(files) {
  return files.map((file) => `${file.relativePath}:${file.mtimeMs}:${file.size}`).join("|");
}

function safeReadUtf8(filePath) {
  try {
    return String(fs.readFileSync(filePath, "utf8") || "");
  } catch (_error) {
    return "";
  }
}

function summarizeText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/g)
    .map((line) => cleanLine(line))
    .filter(Boolean)
    .filter((line) => !/^#/.test(line));
  return cleanLine(lines.slice(0, 3).join(" "));
}

function detectTitle(source, rawText) {
  const text = String(rawText || "");
  if (/\.json$/i.test(source)) {
    try {
      const parsed = JSON.parse(text);
      return cleanLine(parsed.title || parsed.schemaId || path.basename(source));
    } catch (_error) {
      return path.basename(source);
    }
  }
  const heading = text.split(/\r?\n/g).find((line) => /^#\s+/.test(line));
  if (heading) {
    return cleanLine(heading.replace(/^#\s+/, ""));
  }
  return path.basename(source);
}

function detectKind(source) {
  if (/\/examples\//i.test(`/${source}`)) return "example";
  if (/\.schema\.json$/i.test(source)) return "schema";
  if (/README\.md$/i.test(source)) return "guide";
  return "reference";
}

function loadColonyMemory(options = {}) {
  const force = Boolean(options.force);
  const ttlMs = Math.max(1000, Number(options.cacheTtlMs) || DEFAULT_CACHE_TTL_MS);
  const files = listContractFiles();
  const signature = computeSignature(files);
  const now = Date.now();
  const cacheAgeMs = now - Number(cache.loadedAt || 0);
  const canReuse = !force
    && cache.loadedAt > 0
    && cache.signature === signature
    && cacheAgeMs <= ttlMs;

  if (canReuse) {
    return {
      loadedAt: cache.loadedAt,
      files: cache.files.slice(),
      entries: cache.entries.slice()
    };
  }

  const entries = [];
  for (const file of files) {
    const rawText = safeReadUtf8(file.absolutePath);
    if (!rawText.trim()) continue;
    const source = `config/colony-memory/${file.relativePath}`;
    const title = detectTitle(source, rawText);
    const summary = summarizeText(rawText);
    const searchable = [
      source,
      title,
      detectKind(source),
      summary,
      rawText
    ].filter(Boolean).join("\n");
    entries.push({
      source,
      absolutePath: file.absolutePath,
      title,
      kind: detectKind(source),
      updatedAt: new Date(file.mtimeMs).toISOString(),
      summary,
      body: rawText.trim(),
      searchable,
      searchableLower: searchable.toLowerCase()
    });
  }

  cache = {
    loadedAt: now,
    signature,
    files,
    entries
  };
  return {
    loadedAt: cache.loadedAt,
    files: cache.files.slice(),
    entries: cache.entries.slice()
  };
}

function scoreEntry(entry, query, tokens) {
  const lower = String(entry.searchableLower || "");
  const titleLower = String(entry.title || "").toLowerCase();
  const kindLower = String(entry.kind || "").toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (titleLower.includes(token)) score += 18;
    if (kindLower === token) score += 10;
    if (lower.includes(token)) score += 4;
  }
  if (query && lower.includes(query.toLowerCase())) {
    score += 20;
  }
  return score;
}

function getColonyMemoryStatus(options = {}) {
  const loaded = loadColonyMemory(options);
  const schemaFiles = loaded.entries.filter((entry) => entry.kind === "schema").length;
  const exampleFiles = loaded.entries.filter((entry) => entry.kind === "example").length;
  return {
    ok: true,
    enabled: fs.existsSync(colonyMemoryRoot),
    loadedAt: loaded.loadedAt ? new Date(loaded.loadedAt).toISOString() : "",
    root: colonyMemoryRoot,
    files: loaded.entries.length,
    schemaFiles,
    exampleFiles
  };
}

function searchColonyMemory(query, options = {}) {
  const text = cleanLine(query);
  const loaded = loadColonyMemory(options);
  if (!text) {
    return {
      ok: true,
      enabled: fs.existsSync(colonyMemoryRoot),
      query: "",
      count: 0,
      matches: []
    };
  }
  const tokens = tokenizeQuery(text);
  const safeLimit = Math.max(1, Math.min(30, Number(options.limit) || 6));
  const scored = loaded.entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, text, tokens)
    }))
    .filter((row) => row.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return String(right.entry.updatedAt || "").localeCompare(String(left.entry.updatedAt || ""));
    })
    .slice(0, safeLimit)
    .map((row) => ({
      kind: "colony_memory",
      source: row.entry.source,
      title: row.entry.title,
      type: row.entry.kind,
      line: 1,
      score: row.score,
      snippet: buildSnippet(
        [row.entry.summary, row.entry.body].filter(Boolean).join(" "),
        tokens,
        Math.max(80, Math.min(420, Number(options.maxSnippetChars) || 220))
      ),
      updatedAt: row.entry.updatedAt
    }));

  return {
    ok: true,
    enabled: fs.existsSync(colonyMemoryRoot),
    query: text,
    tokens,
    count: scored.length,
    matches: scored
  };
}

function buildColonyMemoryContextForPrompt(query, options = {}) {
  const costMode = String(options.costMode || "low").toLowerCase();
  const limit = costMode === "quality" ? 4 : costMode === "balanced" ? 3 : 2;
  const result = searchColonyMemory(query, {
    limit,
    maxSnippetChars: costMode === "quality" ? 260 : costMode === "balanced" ? 220 : 180
  });
  if (result.count < 1) {
    return "";
  }
  const lines = result.matches.map((row) => `- ${row.type} "${row.title}" ${row.snippet}`);
  return ["Colony memory contracts:", ...lines].join("\n");
}

function collectColonyMemoryDocuments(limit = 80, options = {}) {
  const safeLimit = Math.max(1, Math.min(400, Number(limit) || 80));
  const loaded = loadColonyMemory(options);
  return loaded.entries.slice(0, safeLimit).map((entry) => ({
    id: `colony-memory:${entry.source}`,
    sourceKind: "colony_memory",
    sourceLabel: entry.source,
    title: `${entry.kind} ${entry.title}`.trim(),
    updatedAt: entry.updatedAt,
    text: [
      `Source: ${entry.source}`,
      `Kind: ${entry.kind}`,
      entry.summary,
      entry.body
    ].filter(Boolean).join("\n"),
    snippet: entry.summary || buildSnippet(entry.body, [], 240),
    hash: `${entry.source}:${entry.updatedAt}:${entry.title}`
  }));
}

module.exports = {
  getColonyMemoryStatus,
  searchColonyMemory,
  buildColonyMemoryContextForPrompt,
  collectColonyMemoryDocuments
};
