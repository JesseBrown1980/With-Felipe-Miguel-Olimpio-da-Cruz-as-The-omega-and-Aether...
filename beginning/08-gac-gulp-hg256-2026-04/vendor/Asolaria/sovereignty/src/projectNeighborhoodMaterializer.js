const fs = require("node:fs");
const path = require("node:path");

const {
  collectIndexEntries,
  findPathToTarget,
  normalizeIxRef
} = require("./v21CanonAudit");
const {
  STAGE_SEQUENCE,
  LANGUAGE_FREEZE_CONSTRAINT,
  buildSearchSliceId
} = require("./chainbackLoop");

const PROJECT_FILTERS = Object.freeze({
  universal: Object.freeze({
    key: "universal",
    projectIx: "",
    tags: [],
    keywords: []
  }),
  qdd: Object.freeze({
    key: "qdd",
    projectIx: "IX-368",
    tags: ["qdd", "ebacmap", "charm", "brian", "natalie", "monday", "bitbucket", "novalum", "ez-protect", "sftp", "queue"],
    keywords: ["qdd", "ebacmap", "novalum", "ez protect", "pq bid", "bitbucket"]
  }),
  "ai-healthcare": Object.freeze({
    key: "ai-healthcare",
    projectIx: "IX-369",
    tags: ["ai-healthcare", "healthcare", "hipaa", "soc2", "ocr", "fhir", "portfolio", "cursor", "antigravity", "streamlit"],
    keywords: ["ai healthcare", "healthcare", "fhir", "hipaa", "soc2", "ocr", "portfolio"]
  }),
  asolaria: Object.freeze({
    key: "asolaria",
    projectIx: "IX-367",
    tags: ["asolaria", "sovereignty", "omnispindle", "gaia", "shannon", "falcon", "colony", "selector-catalog"],
    keywords: ["asolaria", "sovereignty", "omnispindle", "shannon", "gaia", "falcon"]
  })
});

const OUTCOME_RANK = Object.freeze({
  project: 0,
  tool: 1,
  skill: 2,
  mistake: 3,
  success: 4,
  task: 5,
  plan: 6,
  rule: 7,
  policy: 8,
  pattern: 9,
  reference: 10,
  other: 11
});

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeNdjson(filePath, rows) {
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(filePath, body ? `${body}\n` : "", "utf8");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function normalizeProjectKey(projectKey) {
  const text = String(projectKey || "universal").trim().toLowerCase();
  return PROJECT_FILTERS[text] ? text : "universal";
}

function getProjectFilter(projectKey) {
  return PROJECT_FILTERS[normalizeProjectKey(projectKey)];
}

function classifyOutcomeClass(entry) {
  const type = String(entry?.type || "").toLowerCase();
  const name = String(entry?.name || "").toLowerCase();
  const tags = new Set((entry?.tags || []).map((tag) => String(tag || "").toLowerCase()));

  if (type === "project") return "project";
  if (type === "tool") return "tool";
  if (type === "skill") return "skill";
  if (type === "mistake") return "mistake";
  if (type === "task") return "task";
  if (type === "plan") return "plan";
  if (type === "rule") return "rule";
  if (type === "policy") return "policy";
  if (type === "pattern") return "pattern";
  if (
    type === "reference"
    || type === "observation"
    || type === "milestone"
    || type === "decision"
  ) {
    if (
      tags.has("milestone")
      || tags.has("code-verified")
      || tags.has("verified")
      || tags.has("success")
      || tags.has("proof")
      || name.includes("proof")
      || name.includes("success")
      || name.includes("verified")
      || name.includes("milestone")
      || name.includes("breakthrough")
      || name.includes("live")
    ) {
      return "success";
    }
    return "reference";
  }
  return "other";
}

function matchesProjectEntry(entry, filter) {
  if (!filter || filter.key === "universal") return true;
  const ix = normalizeIxRef(entry?.ix);
  const name = String(entry?.name || "").toLowerCase();
  const tags = new Set((entry?.tags || []).map((tag) => String(tag || "").toLowerCase()));
  const chain = new Set((entry?.chain || []).map(normalizeIxRef).filter(Boolean));
  if (filter.projectIx && ix === filter.projectIx) return true;
  if (filter.projectIx && chain.has(filter.projectIx)) return true;
  if (filter.tags.some((tag) => tags.has(tag))) return true;
  return filter.keywords.some((keyword) => name.includes(keyword));
}

function bucketLabel(index) {
  const safeIndex = Math.max(0, Number(index) || 0);
  const letterIndex = Math.floor(safeIndex / 10);
  const numberIndex = safeIndex % 10;
  let current = letterIndex;
  let letters = "";
  do {
    const remainder = current % 26;
    letters = `${String.fromCharCode(97 + remainder)}${letters}`;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);
  return `${letters}${String(numberIndex).padStart(2, "0")}`;
}

function sortNeighborhoodEntries(entries) {
  return [...entries].sort((left, right) => {
    const leftRank = OUTCOME_RANK[classifyOutcomeClass(left)] ?? 99;
    const rightRank = OUTCOME_RANK[classifyOutcomeClass(right)] ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return normalizeIxRef(left.ix).localeCompare(normalizeIxRef(right.ix));
  });
}

function findShortestPathToAnyTarget(entryMap, startIx, targets) {
  const start = normalizeIxRef(startIx);
  const targetSet = new Set((targets || []).map(normalizeIxRef).filter(Boolean));
  if (!start || targetSet.size === 0) return null;
  if (targetSet.has(start)) return [start];

  const queue = [[start]];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const currentPath = queue.shift();
    const currentIx = currentPath[currentPath.length - 1];
    const nextRefs = Array.isArray(entryMap.get(currentIx)?.chain) ? entryMap.get(currentIx).chain : [];
    for (const nextIx of nextRefs) {
      if (!nextIx || seen.has(nextIx)) continue;
      const nextPath = [...currentPath, nextIx];
      if (targetSet.has(nextIx)) {
        return nextPath;
      }
      seen.add(nextIx);
      queue.push(nextPath);
    }
  }
  return null;
}

function buildProjectStageSlices(projectKey) {
  return STAGE_SEQUENCE.map((stageSpec, index) => ({
    project: projectKey,
    ordinal: index + 1,
    stage: stageSpec.stage,
    layer: stageSpec.layer,
    searchSlice: buildSearchSliceId(projectKey, stageSpec.stage, stageSpec.layer),
    freezeConstraint: LANGUAGE_FREEZE_CONSTRAINT
  }));
}

function materializeProjectNeighborhood(options = {}) {
  const projectKey = normalizeProjectKey(options.project);
  const filter = getProjectFilter(projectKey);
  const indexRoot = path.resolve(options.indexRoot || path.join(__dirname, "..", "index"));
  const outputDir = path.resolve(
    options.outputDir
      || path.join(process.env.ASOLARIA_INSTANCE_ROOT || process.cwd(), "runtime", "adjacency-neighborhoods", projectKey)
  );
  const inputEntries = Array.isArray(options.entries) ? options.entries : collectIndexEntries(indexRoot);
  const filteredEntries = sortNeighborhoodEntries(inputEntries.filter((entry) => matchesProjectEntry(entry, filter)));

  ensureDir(outputDir);
  ensureDir(path.join(outputDir, "buckets"));

  const entries = filteredEntries.map((entry, index) => ({
    ...entry,
    ix: normalizeIxRef(entry.ix),
    chain: (entry.chain || []).map(normalizeIxRef).filter(Boolean),
    project: projectKey,
    bucket: bucketLabel(index),
    outcomeClass: classifyOutcomeClass(entry)
  }));

  const entryMap = new Map(entries.map((entry) => [entry.ix, entry]));

  for (const entry of entries) {
    const bucketDir = path.join(outputDir, "buckets", entry.bucket);
    ensureDir(bucketDir);
    writeJson(path.join(bucketDir, "entry.json"), {
      project: projectKey,
      bucket: entry.bucket,
      ix: entry.ix,
      type: entry.type,
      outcomeClass: entry.outcomeClass,
      name: entry.name,
      tags: entry.tags,
      chain: entry.chain,
      canonicalPath: entry.path
    });
  }

  const entryRows = entries.map((entry) => ({
    project: projectKey,
    bucket: entry.bucket,
    ix: entry.ix,
    type: entry.type,
    outcome_class: entry.outcomeClass,
    name: entry.name,
    tags: (entry.tags || []).join("|"),
    canonical_path: entry.path
  }));

  const edgeRows = [];
  for (const entry of entries) {
    for (const targetIx of entry.chain) {
      const target = entryMap.get(targetIx);
      edgeRows.push({
        project: projectKey,
        source_ix: entry.ix,
        source_bucket: entry.bucket,
        source_type: entry.type,
        source_class: entry.outcomeClass,
        target_ix: targetIx,
        target_bucket: target?.bucket || "",
        target_type: target?.type || "",
        target_class: target?.outcomeClass || "",
        edge_kind: "chain",
        internal_target: target ? "true" : "false"
      });
    }
  }

  const anchorTargets = [filter.projectIx, "IX-518"].map(normalizeIxRef).filter(Boolean);
  const pathwayRows = entries.map((entry) => {
    const projectPath = filter.projectIx ? findPathToTarget(entryMap, entry.ix, filter.projectIx) : null;
    const anchorPath = projectPath || findShortestPathToAnyTarget(entryMap, entry.ix, anchorTargets);
    const anchorIx = anchorPath ? anchorPath[anchorPath.length - 1] : "";
    return {
      project: projectKey,
      ix: entry.ix,
      bucket: entry.bucket,
      anchor_ix: anchorIx,
      hops: anchorPath ? Math.max(0, anchorPath.length - 1) : "",
      path: anchorPath ? anchorPath.join(" -> ") : "",
      relation: !anchorPath
        ? "unanchored"
        : anchorPath.length === 1
          ? "self"
          : anchorPath.length === 2
            ? "direct"
            : "indirect"
    };
  });

  const targetClasses = new Set(["success", "project"]);
  const relevantClasses = new Set(["tool", "skill", "mistake"]);
  const pathTargets = entries.filter((entry) => targetClasses.has(entry.outcomeClass)).map((entry) => entry.ix);
  const tsmRows = entries
    .filter((entry) => relevantClasses.has(entry.outcomeClass))
    .map((entry) => {
      const pathToOutcome = findShortestPathToAnyTarget(entryMap, entry.ix, pathTargets);
      const targetIx = pathToOutcome ? pathToOutcome[pathToOutcome.length - 1] : "";
      const target = targetIx ? entryMap.get(targetIx) : null;
      return {
        project: projectKey,
        source_ix: entry.ix,
        source_bucket: entry.bucket,
        source_class: entry.outcomeClass,
        target_ix: targetIx,
        target_bucket: target?.bucket || "",
        target_class: target?.outcomeClass || "",
        path: pathToOutcome ? pathToOutcome.join(" -> ") : "",
        hops: pathToOutcome ? Math.max(0, pathToOutcome.length - 1) : "",
        outcome: pathToOutcome ? "anchored" : "open"
      };
    });

  const stageRows = buildProjectStageSlices(projectKey);
  const manifest = {
    ok: true,
    project: projectKey,
    projectIx: filter.projectIx || "",
    generatedAt: new Date().toISOString(),
    counts: {
      entries: entries.length,
      edges: edgeRows.length,
      pathways: pathwayRows.length,
      toolSkillMistakeSuccess: tsmRows.length,
      stageSlices: stageRows.length
    }
  };

  writeJson(path.join(outputDir, "manifest.json"), manifest);
  writeNdjson(path.join(outputDir, "entries.ndjson"), entryRows);
  writeCsv(path.join(outputDir, "entries.csv"), [
    "project",
    "bucket",
    "ix",
    "type",
    "outcome_class",
    "name",
    "tags",
    "canonical_path"
  ], entryRows);
  writeCsv(path.join(outputDir, "edges.csv"), [
    "project",
    "source_ix",
    "source_bucket",
    "source_type",
    "source_class",
    "target_ix",
    "target_bucket",
    "target_type",
    "target_class",
    "edge_kind",
    "internal_target"
  ], edgeRows);
  writeCsv(path.join(outputDir, "pathways.csv"), [
    "project",
    "ix",
    "bucket",
    "anchor_ix",
    "hops",
    "path",
    "relation"
  ], pathwayRows);
  writeCsv(path.join(outputDir, "project_stage_slice.csv"), [
    "project",
    "ordinal",
    "stage",
    "layer",
    "searchSlice",
    "freezeConstraint"
  ], stageRows);
  writeCsv(path.join(outputDir, "tool_skill_mistake_success.csv"), [
    "project",
    "source_ix",
    "source_bucket",
    "source_class",
    "target_ix",
    "target_bucket",
    "target_class",
    "path",
    "hops",
    "outcome"
  ], tsmRows);

  return {
    ...manifest,
    outputDir,
    buckets: entries.map((entry) => entry.bucket),
    entries: entryRows,
    edges: edgeRows,
    pathways: pathwayRows,
    toolSkillMistakeSuccess: tsmRows,
    stageSlices: stageRows
  };
}

module.exports = {
  PROJECT_FILTERS,
  LANGUAGE_FREEZE_CONSTRAINT,
  bucketLabel,
  buildProjectStageSlices,
  classifyOutcomeClass,
  getProjectFilter,
  materializeProjectNeighborhood,
  matchesProjectEntry,
  normalizeProjectKey
};

if (require.main === module) {
  const project = process.argv[2] || "qdd";
  const result = materializeProjectNeighborhood({ project });
  console.log(JSON.stringify({
    ok: result.ok,
    project: result.project,
    outputDir: result.outputDir,
    counts: result.counts
  }, null, 2));
}
