#!/usr/bin/env node
"use strict";

const path = require("path");
const fileIndex = require("../lib/hyperbehcs-file-index.cjs");

function usage() {
  return {
    ok: true,
    command: "hyperbehcs-file-index",
    description: "Safely ingest a file or bounded directory into HyperBEHCS fast packets.",
    options: {
      "--target <path>": "Required file or directory to read.",
      "--max-files <n>": `Maximum files to index. Default: ${fileIndex.DEFAULTS.maxFiles}.`,
      "--max-bytes <n>": `Maximum bytes to read per file. Default: ${fileIndex.DEFAULTS.maxBytes}.`,
      "--sidecar": "Opt in to writing <file>.hyperbehcs.json next to each indexed file.",
      "--include-binary": "Include common binary extensions that are skipped by default.",
      "--dimension <n>": `Packet vector dimension. Default: ${fileIndex.DEFAULTS.dimension}.`
    },
    examples: [
      "C:\\HyperBEHCS\\bin\\hyperbehcs-file-index.cmd --target C:\\HyperBEHCS\\README.md",
      "C:\\HyperBEHCS\\bin\\hyperbehcs-file-index.cmd --target C:\\HyperBEHCS --max-files 25 --max-bytes 1048576"
    ]
  };
}

function takeValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--target") {
      options.target = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--max-files") {
      options.maxFiles = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--max-bytes") {
      options.maxBytes = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--dimension") {
      options.dimension = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--sidecar") {
      options.sidecar = true;
      continue;
    }
    if (arg === "--include-binary") {
      options.includeBinary = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function summary(result) {
  const report = result.report;
  return {
    ok: true,
    schema: "hyperbehcs.file_index_cli_summary.v1",
    target: report.target,
    report_path: result.report_path,
    files_indexed: report.summary.files_indexed,
    skipped: report.summary.skipped,
    total_bytes_read: report.summary.total_bytes_read,
    total_packet_bytes: report.summary.total_packet_bytes,
    size_reduction_percent: report.summary.size_reduction_percent,
    sidecars_written: report.summary.sidecars_written,
    fingerprint: report.fingerprint,
    report_name: path.basename(result.report_path)
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(JSON.stringify(usage(), null, 2));
    return;
  }
  const result = fileIndex.ingestPath(args);
  console.log(JSON.stringify(summary(result), null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: String(error && error.message ? error.message : error),
    usage: usage()
  }, null, 2));
  process.exitCode = 1;
}
