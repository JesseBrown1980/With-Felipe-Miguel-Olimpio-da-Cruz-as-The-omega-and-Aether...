const fs = require("node:fs");
const path = require("node:path");

function normalizeIxRef(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/(IX)-?(\d{1,4})/i) || text.match(/(\d{1,4})/);
  if (!match) return "";
  const digits = match[2] || match[1];
  return `IX-${String(digits).padStart(3, "0")}`;
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const text = String(value || "").trim();
  if (!text) return [];
  const trimmed = text.startsWith("[") && text.endsWith("]")
    ? text.slice(1, -1)
    : text;
  return trimmed
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => item.replace(/^["']|["']$/g, ""));
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
  const frontMatter = source.slice(3, marker).trim();
  const body = source.slice(marker + 4).trim();
  const attrs = {};
  for (const line of frontMatter.split(/\r?\n/g)) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (!match) continue;
    const key = String(match[1] || "").trim();
    const value = String(match[2] || "").trim();
    if (!key) continue;
    if (["tags", "chain", "agents"].includes(key)) {
      attrs[key] = parseArrayValue(value);
    } else {
      attrs[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { attrs, body };
}

function walkMarkdownFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_error) {
      entries = [];
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && /^IX-\d{3,4}\.md$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function buildEntryFromFile(filePath) {
  const rawText = String(fs.readFileSync(filePath, "utf8") || "");
  const parsed = parseFrontMatter(rawText);
  const ix = normalizeIxRef(parsed.attrs.ix || path.basename(filePath, ".md"));
  return {
    ix,
    name: String(parsed.attrs.name || "").trim(),
    type: String(parsed.attrs.type || "").trim().toLowerCase(),
    tags: parseArrayValue(parsed.attrs.tags || []),
    chain: parseArrayValue(parsed.attrs.chain || []).map(normalizeIxRef).filter(Boolean),
    path: filePath
  };
}

function collectIndexEntries(indexRoot) {
  return walkMarkdownFiles(indexRoot)
    .map(buildEntryFromFile)
    .filter((entry) => entry.ix);
}

function classifyAuditScope(entry) {
  const name = String(entry?.name || "").toLowerCase();
  const type = String(entry?.type || "").toLowerCase();
  const tags = new Set((entry?.tags || []).map((tag) => String(tag || "").toLowerCase()));
  const reasons = [];

  const hasLaw = /^law\b/i.test(String(entry?.name || "")) || tags.has("law");
  const hasUniversal = tags.has("universal") || name.includes("universal");
  const hasConstitution = type === "constitution"
    || tags.has("constitution")
    || tags.has("constitutional")
    || name.includes("constitution")
    || name.includes("constitutional");
  const hasMistake = type === "mistake" || tags.has("mistake") || name.includes("mistake");
  const isGovernanceMistake = hasMistake && (hasLaw || hasConstitution);

  if (hasLaw) reasons.push("law");
  if (hasUniversal) reasons.push("universal");
  if (hasConstitution) reasons.push("constitutional");
  if (hasMistake) reasons.push("mistake");
  if (isGovernanceMistake) reasons.push("governance-mistake");

  return {
    include: reasons.length > 0,
    reasons
  };
}

function findPathToTarget(entryMap, startIx, targetIx) {
  const start = normalizeIxRef(startIx);
  const target = normalizeIxRef(targetIx);
  if (!start || !target) return null;
  if (start === target) return [target];

  const queue = [[start]];
  const seen = new Set([start]);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const currentIx = currentPath[currentPath.length - 1];
    const currentEntry = entryMap.get(currentIx);
    const nextRefs = Array.isArray(currentEntry?.chain) ? currentEntry.chain : [];
    for (const nextIx of nextRefs) {
      if (!nextIx || seen.has(nextIx)) continue;
      const nextPath = [...currentPath, nextIx];
      if (nextIx === target) {
        return nextPath;
      }
      seen.add(nextIx);
      queue.push(nextPath);
    }
  }

  return null;
}

function auditV21Relationships(entries, targetIx = "IX-518") {
  const entryMap = new Map(entries.map((entry) => [normalizeIxRef(entry.ix), {
    ...entry,
    ix: normalizeIxRef(entry.ix),
    chain: (entry.chain || []).map(normalizeIxRef).filter(Boolean)
  }]));

  const target = normalizeIxRef(targetIx);
  const records = [];

  for (const entry of entryMap.values()) {
    const scope = classifyAuditScope(entry);
    if (!scope.include) continue;
    const pathToTarget = findPathToTarget(entryMap, entry.ix, target);
    const relation = !pathToTarget
      ? "missing"
      : pathToTarget.length === 1
        ? "self"
        : pathToTarget.length === 2
          ? "direct"
          : "indirect";
    records.push({
      ix: entry.ix,
      name: entry.name,
      type: entry.type,
      reasons: scope.reasons,
      relation,
      path: pathToTarget || []
    });
  }

  records.sort((left, right) => {
    const rank = { missing: 0, direct: 1, indirect: 2, self: 3 };
    const leftRank = rank[left.relation] ?? 9;
    const rightRank = rank[right.relation] ?? 9;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.ix.localeCompare(right.ix);
  });

  return {
    ok: records.every((record) => record.relation !== "missing"),
    target,
    summary: {
      scopedEntries: records.length,
      direct: records.filter((record) => record.relation === "direct").length,
      indirect: records.filter((record) => record.relation === "indirect").length,
      self: records.filter((record) => record.relation === "self").length,
      missing: records.filter((record) => record.relation === "missing").length
    },
    records
  };
}

function runV21CanonAudit(indexRoot = path.join(__dirname, "..", "index")) {
  return auditV21Relationships(collectIndexEntries(indexRoot));
}

module.exports = {
  normalizeIxRef,
  parseFrontMatter,
  collectIndexEntries,
  classifyAuditScope,
  findPathToTarget,
  auditV21Relationships,
  runV21CanonAudit
};

if (require.main === module) {
  console.log(JSON.stringify(runV21CanonAudit(), null, 2));
}
