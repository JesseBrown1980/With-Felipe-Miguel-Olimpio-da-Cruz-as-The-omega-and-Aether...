"use strict";

const fs = require("fs");
const path = require("path");
const core = require("./hyperbehcs-core.cjs");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");

const DEFAULTS = Object.freeze({
  maxFiles: 100,
  maxBytes: 1024 * 1024,
  dimension: 1536,
  includeBinary: false,
  sidecar: false
});

const SKIP_DIR_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules"
]);

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".a",
  ".avi",
  ".bin",
  ".bmp",
  ".class",
  ".dll",
  ".dmg",
  ".doc",
  ".docx",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".iso",
  ".jar",
  ".jpeg",
  ".jpg",
  ".lib",
  ".mov",
  ".mp3",
  ".mp4",
  ".msi",
  ".o",
  ".obj",
  ".otf",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".pyc",
  ".rar",
  ".so",
  ".sqlite",
  ".tar",
  ".tgz",
  ".ttf",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip"
]);

function round(value, places = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function finitePositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.floor(number));
}

function normalizeOptions(options = {}) {
  return {
    target: options.target ? path.resolve(String(options.target)) : "",
    maxFiles: finitePositiveInteger(options.maxFiles, DEFAULTS.maxFiles),
    maxBytes: finitePositiveInteger(options.maxBytes, DEFAULTS.maxBytes),
    sidecar: Boolean(options.sidecar),
    includeBinary: Boolean(options.includeBinary),
    dimension: finitePositiveInteger(options.dimension, DEFAULTS.dimension)
  };
}

function safeError(error) {
  return String(error && error.message ? error.message : error);
}

function isSkippableBinary(filePath) {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function readPrefix(filePath, maxBytes) {
  const handle = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.allocUnsafe(maxBytes);
    const bytesRead = fs.readSync(handle, buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(handle);
  }
}

function filePayloadText(buffer) {
  return buffer.toString("base64");
}

function makePacket(filePath, buffer, options) {
  const input = {
    text: filePayloadText(buffer),
    source_path: filePath,
    source_encoding: "base64",
    bytes_read: buffer.length
  };
  return core.buildFastPacket(input, { dimension: options.dimension });
}

function makeFileEntry(filePath, bytesRead, packet) {
  const packetBytes = Buffer.byteLength(JSON.stringify(packet), "utf8");
  return {
    path: filePath,
    bytes_read: bytesRead,
    packet_bytes: packetBytes,
    size_reduction_percent: round((1 - packetBytes / Math.max(1, bytesRead)) * 100),
    receipt_zero_loss: Boolean(packet.receipt_zero_loss),
    fingerprint: packet.fingerprint
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeSidecar(filePath, entry, packet) {
  const sidecarPath = `${filePath}.hyperbehcs.json`;
  writeJson(sidecarPath, {
    schema: "hyperbehcs.file_sidecar.v1",
    generated_at: new Date().toISOString(),
    entry,
    packet
  });
  return sidecarPath;
}

function maybePushSkipped(skipped, item) {
  skipped.push(item);
}

function enqueueDirectoryFiles(dirPath, queue, skipped) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    maybePushSkipped(skipped, {
      path: dirPath,
      reason: "read_directory_failed",
      error: safeError(error)
    });
    return;
  }

  entries
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((entry) => {
      const childPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name.toLowerCase())) {
          maybePushSkipped(skipped, {
            path: childPath,
            reason: "skipped_directory"
          });
          return;
        }
        queue.push(childPath);
        return;
      }
      if (entry.isFile()) {
        queue.push(childPath);
        return;
      }
      maybePushSkipped(skipped, {
        path: childPath,
        reason: "unsupported_file_type"
      });
    });
}

function collectFilePaths(target, options, skipped) {
  const files = [];
  const queue = [target];

  while (queue.length > 0 && files.length < options.maxFiles) {
    const current = queue.shift();
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      maybePushSkipped(skipped, {
        path: current,
        reason: "stat_failed",
        error: safeError(error)
      });
      continue;
    }

    if (stats.isSymbolicLink()) {
      maybePushSkipped(skipped, {
        path: current,
        reason: "symbolic_link_skipped"
      });
      continue;
    }

    if (stats.isDirectory()) {
      const name = path.basename(current).toLowerCase();
      if (SKIP_DIR_NAMES.has(name)) {
        maybePushSkipped(skipped, {
          path: current,
          reason: "skipped_directory"
        });
        continue;
      }
      enqueueDirectoryFiles(current, queue, skipped);
      continue;
    }

    if (!stats.isFile()) {
      maybePushSkipped(skipped, {
        path: current,
        reason: "unsupported_file_type"
      });
      continue;
    }

    if (!options.includeBinary && isSkippableBinary(current)) {
      maybePushSkipped(skipped, {
        path: current,
        reason: "binary_extension_skipped"
      });
      continue;
    }

    files.push(current);
  }

  return files;
}

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function reportFileName(startedAt) {
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  return `file-index-${stamp}.json`;
}

function ingestPath(options = {}) {
  const normalized = normalizeOptions(options);
  if (!normalized.target) {
    throw new Error("Missing required target path. Pass --target <path>.");
  }

  let targetStats;
  try {
    targetStats = fs.lstatSync(normalized.target);
  } catch (error) {
    throw new Error(`Target is not readable: ${normalized.target} (${safeError(error)})`);
  }
  if (targetStats.isSymbolicLink()) {
    throw new Error(`Target is a symbolic link and was not followed: ${normalized.target}`);
  }
  if (!targetStats.isFile() && !targetStats.isDirectory()) {
    throw new Error(`Target is not a regular file or directory: ${normalized.target}`);
  }

  const startedAt = new Date();
  const skipped = [];
  const files = collectFilePaths(normalized.target, normalized, skipped);
  const entries = [];
  const sidecars = [];

  files.forEach((filePath) => {
    let buffer;
    try {
      buffer = readPrefix(filePath, normalized.maxBytes);
    } catch (error) {
      maybePushSkipped(skipped, {
        path: filePath,
        reason: "read_file_failed",
        error: safeError(error)
      });
      return;
    }

    const packet = makePacket(filePath, buffer, normalized);
    const entry = makeFileEntry(filePath, buffer.length, packet);
    entries.push(entry);

    if (normalized.sidecar) {
      try {
        sidecars.push(writeSidecar(filePath, entry, packet));
      } catch (error) {
        maybePushSkipped(skipped, {
          path: filePath,
          reason: "write_sidecar_failed",
          error: safeError(error)
        });
      }
    }
  });

  const completedAt = new Date();
  const report = {
    schema: "hyperbehcs.file_index_report.v1",
    runtime: ROOT,
    target: normalized.target,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    options: {
      max_files: normalized.maxFiles,
      max_bytes: normalized.maxBytes,
      sidecar: normalized.sidecar,
      include_binary: normalized.includeBinary,
      dimension: normalized.dimension
    },
    summary: {
      files_indexed: entries.length,
      files_considered: files.length,
      skipped: skipped.length,
      sidecars_written: sidecars.length,
      total_bytes_read: entries.reduce((sum, entry) => sum + entry.bytes_read, 0),
      total_packet_bytes: entries.reduce((sum, entry) => sum + entry.packet_bytes, 0)
    },
    files: entries,
    skipped
  };

  report.summary.size_reduction_percent = round(
    (1 - report.summary.total_packet_bytes / Math.max(1, report.summary.total_bytes_read)) * 100
  );
  report.fingerprint = core.sha16(report);

  ensureReportsDir();
  const reportPath = path.join(REPORTS_DIR, reportFileName(startedAt));
  writeJson(reportPath, report);

  return {
    ok: true,
    report_path: reportPath,
    report,
    sidecars
  };
}

module.exports = {
  DEFAULTS,
  BINARY_EXTENSIONS,
  SKIP_DIR_NAMES,
  normalizeOptions,
  ingestPath
};
