/**
 * NDJSON Log Rotation — Phase 1/2 durability
 *
 * Rotates append-only NDJSON files when they exceed maxLines.
 * Keeps the most recent lines and archives the rest.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_LINES = 5000;

function rotateNdjsonFile(filePath, options = {}) {
  const maxLines = Math.max(100, Number(options.maxLines || DEFAULT_MAX_LINES));
  const keepLines = Math.max(50, Number(options.keepLines || Math.floor(maxLines * 0.6)));

  if (!fs.existsSync(filePath)) return { rotated: false, reason: "file_not_found" };

  let lines;
  try {
    lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  } catch {
    return { rotated: false, reason: "read_error" };
  }

  if (lines.length <= maxLines) {
    return { rotated: false, reason: "under_threshold", lines: lines.length, maxLines };
  }

  // Archive old lines
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  const archivePath = `${base}.archive-${stamp}${ext}`;

  const archiveLines = lines.slice(0, lines.length - keepLines);
  const retainLines = lines.slice(-keepLines);

  try {
    fs.writeFileSync(archivePath, archiveLines.join("\n") + "\n", "utf8");
    const tmp = filePath + ".rotation.tmp";
    fs.writeFileSync(tmp, retainLines.join("\n") + "\n", "utf8");
    fs.renameSync(tmp, filePath);
  } catch (err) {
    return { rotated: false, reason: "write_error", error: err.message };
  }

  return {
    rotated: true,
    originalLines: lines.length,
    archivedLines: archiveLines.length,
    retainedLines: retainLines.length,
    archivePath
  };
}

function rotateAllLogs(dataDir, options = {}) {
  const targets = [
    { file: "gateway-audit.ndjson", maxLines: 5000 },
    { file: "graph-runtime-events.ndjson", maxLines: 10000 },
    { file: "graph-runtime-manifests.ndjson", maxLines: 5000 },
    { file: "job-queue-wal.ndjson", maxLines: 2000 },
    { file: "mistake-ledger.ndjson", maxLines: 5000 },
    { file: "hook-events.ndjson", maxLines: 3000 }
  ];

  const results = {};
  for (const target of targets) {
    const filePath = path.join(dataDir, target.file);
    results[target.file] = rotateNdjsonFile(filePath, {
      maxLines: options.maxLines || target.maxLines,
      keepLines: options.keepLines
    });
  }
  return results;
}

module.exports = { rotateNdjsonFile, rotateAllLogs };
