const fs = require("node:fs");
const path = require("node:path");

const TASK_ID = "IX-560";
const DEFAULT_ALIAS = "3d-index-substrate";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function appendNdjson(filePath, value) {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date(value).toISOString();
}

function normalizeOptions(options = {}) {
  const windowMinutes = Number.isFinite(Number(options.windowMinutes)) ? Number(options.windowMinutes) : 45;
  const openedAt = options.openedAt ? new Date(options.openedAt) : new Date();
  const closesAt = new Date(openedAt.getTime() + (windowMinutes * 60 * 1000));
  return {
    alias: String(options.alias || DEFAULT_ALIAS).trim(),
    proposition: String(options.proposition || "").trim(),
    openedAt: toIso(openedAt),
    closesAt: toIso(closesAt),
    windowMinutes,
    options: Array.isArray(options.voteOptions) && options.voteOptions.length > 0
      ? options.voteOptions.map((row, index) => ({
          code: String(row.code || index + 1).trim(),
          label: String(row.label || "").trim(),
          description: String(row.description || "").trim()
        }))
      : [
          { code: "A", label: "approve-with-boundary", description: "Adopt the 3D-connectable substrate direction, but keep canon protected and overlays derived." },
          { code: "B", label: "research-only", description: "Keep the idea as active research and architecture pressure, not law yet." },
          { code: "C", label: "reject-for-now", description: "Current graph/index form is enough; do not elevate the 3D substrate idea yet." }
        ]
  };
}

function buildPacketLines(state) {
  return [
    "@vote DEEP-VOTE-WINDOW",
    `task=${TASK_ID}`,
    "chain=IX-560 IX-557 IX-478 IX-518 IX-523 IX-546 IX-559",
    `alias=${state.alias}`,
    `opened_at=${state.openedAt}`,
    `closes_at=${state.closesAt}`,
    `window_minutes=${state.windowMinutes}`,
    `proposition=${state.proposition}`,
    `options=${state.options.map((row) => `${row.code}:${row.label}`).join(" | ")}`,
    "truth=canon stays sovereign; overlays, simulations, and overrides are derived until proven otherwise."
  ];
}

function tallyVotes(records, optionRows) {
  const counts = Object.fromEntries(optionRows.map((row) => [row.code, 0]));
  for (const record of records) {
    if (counts[record.vote] !== undefined) counts[record.vote] += 1;
  }
  return counts;
}

function readVoteRows(votesPath) {
  if (!fs.existsSync(votesPath)) return [];
  return fs.readFileSync(votesPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => row.type === "vote");
}

function readOptionRows(optionsPath) {
  const optionLines = fs.readFileSync(optionsPath, "utf8").trim().split(/\r?\n/).slice(1);
  return optionLines.map((line) => ({ code: line.split(",")[0] }));
}

function materializeDeepVoteWindow(options = {}) {
  const state = normalizeOptions(options);
  const outputDir = path.resolve(
    options.outputDir
      || path.join(process.env.ASOLARIA_INSTANCE_ROOT || process.cwd(), "runtime", "deep-vote-window", state.alias.replace(/[^a-zA-Z0-9_-]+/g, "-"))
  );
  ensureDir(outputDir);

  const packetLines = buildPacketLines(state);
  const manifest = {
    ok: true,
    taskId: TASK_ID,
    alias: state.alias,
    openedAt: state.openedAt,
    closesAt: state.closesAt,
    windowMinutes: state.windowMinutes,
    propositionLength: state.proposition.length,
    optionCount: state.options.length
  };

  writeJson(path.join(outputDir, "manifest.json"), manifest);
  writeJson(path.join(outputDir, "summary.json"), {
    manifest,
    tally: tallyVotes([], state.options),
    totalVotes: 0
  });
  fs.writeFileSync(path.join(outputDir, "proposition.txt"), `${state.proposition}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "packet.txt"), `${packetLines.join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(outputDir, "votes.ndjson"), "", "utf8");
  writeCsv(path.join(outputDir, "options.csv"), ["code", "label", "description"], state.options);

  appendNdjson(path.join(outputDir, "votes.ndjson"), {
    type: "window_opened",
    ts: state.openedAt,
    alias: state.alias,
    taskId: TASK_ID
  });

  return {
    ok: true,
    outputDir,
    manifest,
    state,
    packetLines
  };
}

function appendVoteRecord(options = {}) {
  const outputDir = path.resolve(options.outputDir);
  const manifestPath = path.join(outputDir, "manifest.json");
  const summaryPath = path.join(outputDir, "summary.json");
  const optionsPath = path.join(outputDir, "options.csv");
  const votesPath = path.join(outputDir, "votes.ndjson");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const optionRows = readOptionRows(optionsPath);
  const validCodes = new Set(optionRows.map((row) => row.code));

  const record = {
    type: "vote",
    ts: toIso(options.ts || new Date()),
    voter: String(options.voter || "unknown").trim(),
    lens: String(options.lens || "general").trim(),
    vote: String(options.vote || "").trim(),
    confidence: String(options.confidence || "").trim(),
    rationale: String(options.rationale || "").trim()
  };

  if (!validCodes.has(record.vote)) {
    throw new Error(`invalid vote code: ${record.vote}`);
  }

  appendNdjson(votesPath, record);
  const records = readVoteRows(votesPath);

  const tally = tallyVotes(records, Array.from(validCodes).map((code) => ({ code })));
  writeJson(summaryPath, {
    manifest,
    tally,
    totalVotes: records.length
  });
}

function setVoteWindowStatus(options = {}) {
  const outputDir = path.resolve(options.outputDir);
  const manifestPath = path.join(outputDir, "manifest.json");
  const optionsPath = path.join(outputDir, "options.csv");
  const votesPath = path.join(outputDir, "votes.ndjson");
  const summaryPath = path.join(outputDir, "summary.json");
  const statusPath = path.join(outputDir, "status.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const optionRows = readOptionRows(optionsPath);
  const records = readVoteRows(votesPath);
  const tally = tallyVotes(records, optionRows);
  const status = {
    taskId: manifest.taskId,
    alias: manifest.alias,
    ts: toIso(options.ts || new Date()),
    stage: String(options.stage || "waiting").trim(),
    detail: String(options.detail || "").trim(),
    pending: Array.isArray(options.pending) ? options.pending.map((row) => String(row).trim()).filter(Boolean) : [],
    tally,
    totalVotes: records.length
  };

  writeJson(statusPath, status);
  appendNdjson(votesPath, {
    type: "window_status",
    ts: status.ts,
    stage: status.stage,
    detail: status.detail,
    pending: status.pending
  });
  writeJson(summaryPath, {
    manifest,
    tally,
    totalVotes: records.length,
    status
  });

  return {
    ok: true,
    outputDir,
    status
  };
}

module.exports = {
  TASK_ID,
  materializeDeepVoteWindow,
  appendVoteRecord,
  setVoteWindowStatus
};
