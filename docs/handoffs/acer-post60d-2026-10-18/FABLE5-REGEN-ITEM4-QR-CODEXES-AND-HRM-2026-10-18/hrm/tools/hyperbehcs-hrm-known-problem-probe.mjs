#!/usr/bin/env node
"use strict";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const require = createRequire(import.meta.url);
const {
  ZERO_COUNTERS,
  buildQuantizedSubstrateReceipt
} = require(path.join(ROOT, "src", "behcs", "hyperbehcsQuantSubstrate.js"));

export const TASK_ID = "HYP-HRM-KNOWN-PROBLEM-PROBE";
export const RUN_ID = "hyperbehcs-hrm-known-problem-probe-20260516";

const DEFAULT_REPORTS = Object.freeze({
  descriptorAdapter: path.join(ROOT, "reports", "hyperbehcs-hrm-descriptor-adapter-latest.json"),
  runtimeGate: path.join(ROOT, "reports", "hyperbehcs-hrm-runtime-readiness-gate-latest.json")
});

const LOCAL_OUTPUTS = Object.freeze({
  reportJson: path.join(ROOT, "reports", "hyperbehcs-hrm-known-problem-probe-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-hrm-known-problem-probe-latest.md"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-hrm-known-problem-probe-latest.json"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-hrm-known-problem-probe-symbols-latest.ndjson")
});

const KNOWN_MAZE = Object.freeze({
  id: "maze_5x5_shortest_path_known_001",
  domain: "maze_shortest_path",
  source: "local_known_probe_in_hrm_advertised_domain",
  grid: [
    "S..#.",
    "##.#.",
    "...#.",
    ".###.",
    "....G"
  ],
  expected_shortest_path_length: 12,
  expected_path: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [2, 1],
    [2, 0],
    [3, 0],
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4]
  ]
});

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 16);
}

function puzzleIdentifier(value) {
  return Number(BigInt(`0x${sha16(value)}`) % 1000000n);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeText(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function writeJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function writeNdjson(filePath, rows) {
  writeText(filePath, rows.map((row) => JSON.stringify(row)).join("\n"));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--descriptor-adapter") out.descriptorAdapterPath = argv[++i];
    if (arg === "--runtime-gate") out.runtimeGatePath = argv[++i];
    if (arg === "--no-write") out.writeFiles = false;
  }
  return out;
}

function sourcePaths(options = {}) {
  return {
    descriptorAdapter: options.descriptorAdapterPath || DEFAULT_REPORTS.descriptorAdapter,
    runtimeGate: options.runtimeGatePath || DEFAULT_REPORTS.runtimeGate
  };
}

function findCell(grid, value) {
  for (let row = 0; row < grid.length; row += 1) {
    const col = grid[row].indexOf(value);
    if (col !== -1) return [row, col];
  }
  return null;
}

function solveMazeShortestPath(problem = KNOWN_MAZE) {
  const grid = problem.grid;
  const start = findCell(grid, "S");
  const goal = findCell(grid, "G");
  if (!start || !goal) {
    return { solved: false, reason: "missing_start_or_goal", path: [], shortest_path_length: null };
  }
  const queue = [{ cell: start, path: [start] }];
  const seen = new Set([start.join(",")]);
  const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const current = queue.shift();
    const [row, col] = current.cell;
    if (row === goal[0] && col === goal[1]) {
      return {
        solved: true,
        reason: "bfs_shortest_path_found",
        path: current.path,
        shortest_path_length: current.path.length - 1
      };
    }
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nc < 0 || nr >= grid.length || nc >= grid[nr].length) continue;
      if (grid[nr][nc] === "#") continue;
      const key = `${nr},${nc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ cell: [nr, nc], path: current.path.concat([[nr, nc]]) });
    }
  }
  return { solved: false, reason: "no_path_found", path: [], shortest_path_length: null };
}

function encodeKnownMazeDescriptor(problem, solution, seqLen = 64) {
  const tokenMap = {
    "<pad>": 0,
    "<bos>": 1,
    "<eos>": 2,
    "maze": 3,
    "S": 4,
    ".": 5,
    "#": 6,
    "G": 7,
    "path": 8,
    "no_path": 9
  };
  const inputTokens = [tokenMap["<bos>"], tokenMap.maze];
  for (const row of problem.grid) {
    for (const cell of row) inputTokens.push(tokenMap[cell]);
  }
  inputTokens.push(tokenMap["<eos>"]);
  const pathCells = new Set(solution.path.map((cell) => cell.join(",")));
  const labelTokens = [tokenMap["<bos>"], solution.solved ? tokenMap.path : tokenMap.no_path];
  for (let row = 0; row < problem.grid.length; row += 1) {
    for (let col = 0; col < problem.grid[row].length; col += 1) {
      labelTokens.push(pathCells.has(`${row},${col}`) ? tokenMap.path : tokenMap["."]);
    }
  }
  labelTokens.push(tokenMap["<eos>"]);
  const pad = (tokens) => tokens.slice(0, seqLen).concat(Array.from({ length: Math.max(0, seqLen - tokens.length) }, () => tokenMap["<pad>"]));
  const row = {
    schema: "hyperbehcs.hrm_known_problem_probe.row.v1",
    problem_id: problem.id,
    domain: problem.domain,
    puzzle_identifier: puzzleIdentifier(problem.id),
    inputs: pad(inputTokens),
    labels: pad(labelTokens),
    descriptor_only: true,
    quant_unchanged: true,
    ...ZERO_COUNTERS
  };
  return {
    ...row,
    input_length: row.inputs.length,
    label_length: row.labels.length,
    fingerprint: sha16(row)
  };
}

function shannonSymbols(report) {
  const rows = [
    ["KNOWN_PROBLEM_ROWS", report.counts.problem_rows],
    ["DESCRIPTOR_ENCODED", report.counts.descriptor_encoded],
    ["BASELINE_SOLVED", report.counts.baseline_solved],
    ["HRM_MODEL_ATTEMPTED", report.counts.hrm_model_attempted],
    ["HRM_MODEL_SOLVED", report.counts.hrm_model_solved],
    ["RUNTIME_READY", report.counts.runtime_ready],
    ["MODEL_EXECUTION_ALLOWED", report.counts.model_execution_allowed],
    ["QUANT_PROCESSING_REDUCED", report.counts.quant_processing_reduced]
  ];
  return rows.map(([symbol, value]) => ({
    schema: "hyperbehcs.hrm_known_problem_probe.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function markdownReport(report) {
  return [
    "# HyperBEHCS HRM Known Problem Probe",
    "",
    `Status: ${report.status}`,
    "",
    `Fingerprint: ${report.fingerprint}`,
    "",
    "## Problem",
    "",
    `Domain: ${report.problem.domain}`,
    "",
    "```text",
    ...report.problem.grid,
    "```",
    "",
    `Expected shortest path length: ${report.problem.expected_shortest_path_length}`,
    "",
    "## Result",
    "",
    `Baseline checker solved: ${report.baseline_checker.solved}`,
    "",
    `HRM model attempted: ${report.hrm_attempt.attempted}`,
    "",
    `HRM model solved: ${report.hrm_attempt.solved}`,
    "",
    `Reason: ${report.hrm_attempt.reason}`,
    "",
    "## Boundary",
    "",
    "This probe encodes a known HRM-domain problem and checks it locally. It does not import Torch, execute the HRM model, load a checkpoint, train, mutate Quant, or grant authority."
  ].join("\n");
}

export function buildHyperbehcsHrmKnownProblemProbe(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const paths = sourcePaths(options);
  const descriptorAdapter = readJson(paths.descriptorAdapter);
  const runtimeGate = readJson(paths.runtimeGate);
  const problem = options.problem || KNOWN_MAZE;
  const solution = solveMazeShortestPath(problem);
  const descriptorRow = encodeKnownMazeDescriptor(problem, solution, Number(options.seqLen || 64));
  const runtimeReady = Boolean(runtimeGate.counts?.runtime_ready);
  const modelExecutionAllowed = Boolean(
    descriptorAdapter.boundary?.model_execution_allowed &&
    runtimeGate.boundary?.model_execution_allowed
  );
  const hrmAttempted = runtimeReady && modelExecutionAllowed;
  const hrmSolved = false;
  const expectedLengthMatches = solution.shortest_path_length === problem.expected_shortest_path_length;
  const expectedPathMatches = JSON.stringify(solution.path) === JSON.stringify(problem.expected_path);
  const counts = {
    problem_rows: 1,
    descriptor_encoded: 1,
    baseline_solved: solution.solved && expectedLengthMatches && expectedPathMatches ? 1 : 0,
    hrm_model_attempted: hrmAttempted ? 1 : 0,
    hrm_model_solved: hrmSolved ? 1 : 0,
    runtime_ready: runtimeReady ? 1 : 0,
    model_execution_allowed: modelExecutionAllowed ? 1 : 0,
    quant_processing_reduced: 0,
    ...ZERO_COUNTERS
  };
  const quantReceipt = buildQuantizedSubstrateReceipt({
    substrate_id: "storage_c_drive",
    source_layer: "hrm_known_problem_probe",
    vector: [
      counts.problem_rows,
      counts.descriptor_encoded,
      counts.baseline_solved,
      counts.hrm_model_attempted,
      counts.hrm_model_solved,
      solution.shortest_path_length || 0
    ],
    targetDimension: 4,
    seed: `${TASK_ID}:${descriptorAdapter.fingerprint}:${runtimeGate.fingerprint}:${problem.id}`
  });
  const base = {
    ok: true,
    schema: "hyperbehcs.hrm_known_problem_probe.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: hrmAttempted ? "hrm_runtime_attempt_unavailable_in_probe" : "known_problem_encoded_hrm_runtime_blocked",
    answer: hrmAttempted ? "hrm_runtime_path_not_executed_by_probe" : "not_solved_by_hrm_model_runtime_blocked_baseline_checker_solved_known_maze",
    sources: {
      descriptor_adapter_fingerprint: descriptorAdapter.fingerprint,
      hrm_runtime_gate_fingerprint: runtimeGate.fingerprint,
      hrm_root: descriptorAdapter.hrm_root,
      runtime_gate_verdict: runtimeGate.verdict || runtimeGate.status
    },
    problem,
    descriptor_row: descriptorRow,
    baseline_checker: {
      solver: "local_bfs_shortest_path_checker",
      solved: solution.solved && expectedLengthMatches && expectedPathMatches,
      shortest_path_length: solution.shortest_path_length,
      path: solution.path,
      expected_length_matches: expectedLengthMatches,
      expected_path_matches: expectedPathMatches,
      descriptor_only: true
    },
    hrm_attempt: {
      attempted: hrmAttempted,
      solved: hrmSolved,
      runtime_ready: runtimeReady,
      model_execution_allowed: modelExecutionAllowed,
      reason: hrmAttempted
        ? "probe_does_not_execute_model_even_if_gates_change"
        : "hrm_runtime_gate_blocks_model_execution_no_torch_checkpoint_or_runtime_promotion",
      descriptor_adapter_status: descriptorAdapter.status,
      runtime_gate_verdict: runtimeGate.verdict || runtimeGate.status,
      descriptor_only: true
    },
    quant_receipt: quantReceipt,
    counts,
    boundary: {
      descriptor_only: true,
      known_problem_probe_only: true,
      quant_pipeline_mutated: false,
      quant_processing_reduced: false,
      torch_import_allowed: false,
      python_execution_allowed: false,
      checkpoint_load_allowed: false,
      model_execution_allowed: false,
      training_allowed: false,
      live_agent_spawn_allowed: false,
      runtime_promotion_allowed: false,
      grants_authority: false,
      ...ZERO_COUNTERS
    }
  };
  return {
    ...base,
    shannon_symbols: shannonSymbols(base),
    fingerprint: sha16(base)
  };
}

export function writeHyperbehcsHrmKnownProblemProbe(report) {
  writeJson(LOCAL_OUTPUTS.reportJson, report);
  writeText(LOCAL_OUTPUTS.reportMd, markdownReport(report));
  writeJson(LOCAL_OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.hrm_known_problem_probe.v1",
    task_id: TASK_ID,
    status: report.status,
    answer: report.answer,
    fingerprint: report.fingerprint,
    counts: report.counts,
    baseline_checker: report.baseline_checker,
    hrm_attempt: report.hrm_attempt,
    boundary: report.boundary
  });
  writeNdjson(LOCAL_OUTPUTS.shannonSymbols, report.shannon_symbols);
  const hrmRoot = report.sources?.hrm_root;
  if (hrmRoot) {
    const dRoot = hrmRoot.replace(/\//g, "\\");
    writeJson(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-known-problem-probe.v1.json"), report);
    writeText(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-known-problem-probe.md"), markdownReport(report));
  }
  return LOCAL_OUTPUTS;
}

export function runHyperbehcsHrmKnownProblemProbe(options = {}) {
  const report = buildHyperbehcsHrmKnownProblemProbe(options);
  const outputs = options.writeFiles === false ? null : writeHyperbehcsHrmKnownProblemProbe(report);
  return { report, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs();
  const { report, outputs } = runHyperbehcsHrmKnownProblemProbe(args);
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    answer: report.answer,
    fingerprint: report.fingerprint,
    problem: {
      id: report.problem.id,
      domain: report.problem.domain,
      expected_shortest_path_length: report.problem.expected_shortest_path_length
    },
    baseline_checker: report.baseline_checker,
    hrm_attempt: report.hrm_attempt,
    counts: report.counts,
    outputs
  }, null, 2));
}
