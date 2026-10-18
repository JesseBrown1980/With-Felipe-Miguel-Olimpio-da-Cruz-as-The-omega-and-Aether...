const fs = require("node:fs");
const path = require("node:path");

const { runChainbackLoop } = require("./chainbackLoop");
const {
  PROJECT_FILTERS,
  materializeProjectNeighborhood,
  normalizeProjectKey
} = require("./projectNeighborhoodMaterializer");
const { sculptProjectLanguage } = require("./languageSculptor");

const DEFAULT_PROJECTS = Object.freeze(["qdd", "ai-healthcare", "asolaria"]);

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

function normalizeProjects(projects) {
  const source = Array.isArray(projects) && projects.length > 0 ? projects : DEFAULT_PROJECTS;
  const seen = new Set();
  const normalized = [];
  for (const project of source) {
    const key = normalizeProjectKey(project);
    if (seen.has(key)) continue;
    if (!PROJECT_FILTERS[key]) continue;
    seen.add(key);
    normalized.push(key);
  }
  return normalized;
}

function buildSummaryRow(taskId, chain, projectKey, loopResult, neighborhoodResult, sculptResult) {
  const anchoredPathways = neighborhoodResult.pathways.filter((row) => row.relation !== "unanchored").length;
  const openPaths = neighborhoodResult.toolSkillMistakeSuccess.filter((row) => row.outcome === "open").length;
  return {
    task_id: taskId,
    chain: chain.join(" -> "),
    project: projectKey,
    stage_count: loopResult.stageCount,
    message_count: loopResult.messages.length,
    relay_count: loopResult.relays.length,
    entry_count: neighborhoodResult.counts.entries,
    edge_count: neighborhoodResult.counts.edges,
    pathway_count: neighborhoodResult.counts.pathways,
    anchored_pathways: anchoredPathways,
    open_tool_skill_paths: openPaths,
    lexicon_count: sculptResult.counts.entries,
    link_count: sculptResult.counts.links,
    stage_matrix_rows: sculptResult.counts.stageRows,
    anchor_rate: neighborhoodResult.counts.pathways > 0
      ? (anchoredPathways / neighborhoodResult.counts.pathways).toFixed(4)
      : "0.0000"
  };
}

function runProjectMatrix(options = {}) {
  const taskId = String(options.taskId || "IX-528").trim();
  const patternId = String(options.patternId || "IX-523").trim();
  const planId = String(options.planId || "IX-524").trim();
  const projects = normalizeProjects(options.projects);
  const outputDir = path.resolve(
    options.outputDir
      || path.join(process.env.ASOLARIA_INSTANCE_ROOT || process.cwd(), "runtime", "project-matrix")
  );
  const matrixChain = Array.isArray(options.chain) && options.chain.length > 0
    ? options.chain.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [planId, patternId, taskId, "IX-518"];

  ensureDir(outputDir);
  ensureDir(path.join(outputDir, "chainback"));
  ensureDir(path.join(outputDir, "neighborhoods"));
  ensureDir(path.join(outputDir, "language"));

  const summaryRows = [];
  const stageRows = [];
  const searchSliceRows = [];

  for (const projectKey of projects) {
    const loopResult = runChainbackLoop({
      outputDir: path.join(outputDir, "chainback", projectKey),
      taskId,
      patternId,
      project: projectKey,
      chain: matrixChain
    });
    const neighborhoodResult = materializeProjectNeighborhood({
      project: projectKey,
      outputDir: path.join(outputDir, "neighborhoods", projectKey),
      indexRoot: options.indexRoot,
      entries: options.entries
    });
    const sculptResult = sculptProjectLanguage({
      project: projectKey,
      outputDir: path.join(outputDir, "language", projectKey),
      indexRoot: options.indexRoot,
      entries: options.entries
    });

    summaryRows.push(buildSummaryRow(taskId, matrixChain, projectKey, loopResult, neighborhoodResult, sculptResult));

    for (const connectivity of loopResult.connectivity) {
      stageRows.push({
        project: projectKey,
        source: "chainback",
        stage_hint: connectivity.stage,
        layer_hint: connectivity.layer,
        bucket: "lifecycle",
        count: 1
      });
    }

    for (const stageRow of sculptResult.stageMatrix) {
      stageRows.push({
        project: projectKey,
        source: "language",
        stage_hint: stageRow.stage_hint,
        layer_hint: stageRow.layer_hint,
        bucket: stageRow.outcome_class,
        count: stageRow.entry_count
      });
    }

    const seenSlices = new Set();
    for (const message of loopResult.messages) {
      const key = `${projectKey}|${message.searchSlice}|chainback`;
      if (seenSlices.has(key)) continue;
      seenSlices.add(key);
      searchSliceRows.push({
        project: projectKey,
        source: "chainback",
        search_slice: message.searchSlice,
        stage_hint: message.stage,
        layer_hint: message.layer
      });
    }
    for (const lexiconRow of sculptResult.lexicon) {
      const key = `${projectKey}|${lexiconRow.search_slice}|language`;
      if (seenSlices.has(key)) continue;
      seenSlices.add(key);
      searchSliceRows.push({
        project: projectKey,
        source: "language",
        search_slice: lexiconRow.search_slice,
        stage_hint: lexiconRow.stage_hint,
        layer_hint: lexiconRow.layer_hint
      });
    }
  }

  const manifest = {
    ok: true,
    taskId,
    patternId,
    planId,
    generatedAt: new Date().toISOString(),
    projects,
    counts: {
      projects: projects.length,
      summaries: summaryRows.length,
      stageRows: stageRows.length,
      searchSlices: searchSliceRows.length
    }
  };

  writeJson(path.join(outputDir, "manifest.json"), manifest);
  writeCsv(path.join(outputDir, "project-summary.csv"), [
    "task_id",
    "chain",
    "project",
    "stage_count",
    "message_count",
    "relay_count",
    "entry_count",
    "edge_count",
    "pathway_count",
    "anchored_pathways",
    "open_tool_skill_paths",
    "lexicon_count",
    "link_count",
    "stage_matrix_rows",
    "anchor_rate"
  ], summaryRows);
  writeCsv(path.join(outputDir, "stage-summary.csv"), [
    "project",
    "source",
    "stage_hint",
    "layer_hint",
    "bucket",
    "count"
  ], stageRows);
  writeNdjson(path.join(outputDir, "search-slices.ndjson"), searchSliceRows);

  return {
    ...manifest,
    outputDir,
    summaries: summaryRows,
    stageRows,
    searchSlices: searchSliceRows
  };
}

module.exports = {
  DEFAULT_PROJECTS,
  normalizeProjects,
  runProjectMatrix
};

if (require.main === module) {
  const result = runProjectMatrix();
  console.log(JSON.stringify({
    ok: result.ok,
    outputDir: result.outputDir,
    projects: result.projects,
    counts: result.counts
  }, null, 2));
}
