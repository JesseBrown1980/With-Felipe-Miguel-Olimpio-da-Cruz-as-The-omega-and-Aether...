#!/usr/bin/env node
"use strict";

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
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

export const TASK_ID = "HYP-HRM-CPU-RUNTIME-KNOWN-PROBLEM";
export const RUN_ID = "hyperbehcs-hrm-cpu-runtime-known-problem-20260516";

const DEFAULT_HRM_ROOT = "D:\\Asolaria-HRM";
const DEFAULT_REPORTS = Object.freeze({
  descriptorAdapter: path.join(ROOT, "reports", "hyperbehcs-hrm-descriptor-adapter-latest.json"),
  runtimeGate: path.join(ROOT, "reports", "hyperbehcs-hrm-runtime-readiness-gate-latest.json")
});
const PROBE_SCRIPT = path.join(ROOT, "tools", "behcs", "hyperbehcs_hrm_cpu_known_problem_probe.py");

const LOCAL_OUTPUTS = Object.freeze({
  reportJson: path.join(ROOT, "reports", "hyperbehcs-hrm-cpu-runtime-known-problem-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-hrm-cpu-runtime-known-problem-latest.md"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-hrm-cpu-runtime-known-problem-latest.json"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-hrm-cpu-runtime-known-problem-symbols-latest.ndjson")
});

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 16);
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
    if (arg === "--hrm-root") out.hrmRoot = argv[++i];
    if (arg === "--steps") out.steps = Number(argv[++i]);
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

function runPythonProbe({ hrmRoot, steps }) {
  const python = path.join(hrmRoot, ".venv", "Scripts", "python.exe");
  const result = spawnSync(python, [
    PROBE_SCRIPT,
    "--hrm-root",
    hrmRoot,
    "--steps",
    String(steps)
  ], {
    cwd: hrmRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONPATH: hrmRoot,
      WANDB_MODE: "disabled",
      CUDA_VISIBLE_DEVICES: ""
    },
    timeout: 300000
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`HRM CPU probe failed with code ${result.status}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(String(result.stdout || "{}").replace(/^\uFEFF/, ""));
}

function shannonSymbols(counts) {
  return [
    ["HRM_CPU_PROBE_ROWS", counts.problem_rows],
    ["HRM_MODEL_ATTEMPTED", counts.hrm_model_attempted],
    ["HRM_MODEL_SOLVED", counts.hrm_model_solved],
    ["BOUNDED_CPU_TRAINING_RUNS", counts.bounded_cpu_training_runs],
    ["OFFICIAL_CHECKPOINT_LOADS", counts.official_checkpoint_loads],
    ["QUANT_PROCESSING_REDUCED", counts.quant_processing_reduced],
    ["RUNTIME_AUTHORITY_GRANTS", counts.runtime_authority_grants]
  ].map(([symbol, value]) => ({
    schema: "hyperbehcs.hrm_cpu_runtime_known_problem.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function markdownReport(report) {
  return [
    "# HyperBEHCS HRM CPU Runtime Known Problem",
    "",
    `Status: ${report.status}`,
    "",
    `Fingerprint: ${report.fingerprint}`,
    "",
    "## Problem",
    "",
    "```text",
    ...report.problem.grid,
    "```",
    "",
    `Expected path length: ${report.problem.expected_shortest_path_length}`,
    "",
    "## Result",
    "",
    `HRM model attempted: ${report.hrm_runtime_result.hrm_model_attempted}`,
    "",
    `HRM model solved: ${report.hrm_runtime_result.hrm_model_solved}`,
    "",
    `Predicted path length: ${report.hrm_runtime_result.predicted_shortest_path_length}`,
    "",
    `Tiny model parameters: ${report.model.parameter_count}`,
    "",
    "## Boundary",
    "",
    "This is a bounded local CPU smoke run using a tiny HRM configuration and CPU attention shim. It is not an official checkpoint result, not production runtime promotion, and it does not mutate Quant."
  ].join("\n");
}

export function buildHyperbehcsHrmCpuRuntimeKnownProblem(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const hrmRoot = options.hrmRoot || DEFAULT_HRM_ROOT;
  const steps = Math.max(40, Math.min(1000, Number(options.steps || 260)));
  const paths = sourcePaths(options);
  const descriptorAdapter = readJson(paths.descriptorAdapter);
  const runtimeGate = readJson(paths.runtimeGate);
  const pythonResult = options.pythonResult || runPythonProbe({ hrmRoot, steps });
  const solved = Boolean(pythonResult.result?.hrm_model_solved);
  const attempted = Boolean(pythonResult.result?.hrm_model_attempted);
  const counts = {
    problem_rows: 1,
    python_executions: 1,
    process_starts: 1,
    torch_imports: 1,
    hrm_model_attempted: attempted ? 1 : 0,
    hrm_model_solved: solved ? 1 : 0,
    bounded_cpu_training_runs: 1,
    bounded_cpu_training_steps: Number(pythonResult.training?.steps_requested || steps),
    official_checkpoint_loads: pythonResult.runtime?.official_checkpoint_loaded ? 1 : 0,
    external_dataset_downloads: pythonResult.runtime?.external_dataset_downloaded ? 1 : 0,
    cuda_used: pythonResult.runtime?.cuda_available && pythonResult.runtime?.device !== "cpu" ? 1 : 0,
    quant_processing_reduced: 0,
    runtime_authority_grants: 0,
    production_promotions: 0,
    provider_calls: 0,
    mcp_tool_calls: 0,
    route_mutations: 0,
    cleanup_actions: 0,
    hardware_mutations: 0,
    gpu_kernel_launches: 0,
    gpu_driver_mutations: 0,
    remote_writes: 0,
    adb_actions: 0,
    scrcpy_actions: 0,
    device_file_writes: 0
  };
  const quantReceipt = buildQuantizedSubstrateReceipt({
    substrate_id: "storage_d_drive",
    source_layer: "hrm_cpu_runtime_known_problem",
    vector: [
      counts.problem_rows,
      counts.hrm_model_attempted,
      counts.hrm_model_solved,
      counts.bounded_cpu_training_steps,
      pythonResult.model?.parameter_count || 0,
      counts.official_checkpoint_loads,
      counts.quant_processing_reduced
    ],
    targetDimension: 4,
    seed: `${TASK_ID}:${descriptorAdapter.fingerprint}:${runtimeGate.fingerprint}:${pythonResult.problem?.id}`
  });
  const base = {
    ok: true,
    schema: "hyperbehcs.hrm_cpu_runtime_known_problem.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: solved ? "hrm_cpu_known_problem_solved_bounded_smoke" : "hrm_cpu_known_problem_not_solved",
    answer: solved
      ? "tiny_hrm_cpu_runtime_solved_known_maze_after_bounded_local_training"
      : "tiny_hrm_cpu_runtime_attempted_known_maze_but_did_not_solve",
    sources: {
      descriptor_adapter_fingerprint: descriptorAdapter.fingerprint,
      hrm_runtime_gate_fingerprint: runtimeGate.fingerprint,
      hrm_runtime_gate_verdict: runtimeGate.verdict || runtimeGate.status,
      hrm_root: hrmRoot.replace(/\\/g, "/")
    },
    problem: pythonResult.problem,
    runtime: pythonResult.runtime,
    model: pythonResult.model,
    training: pythonResult.training,
    hrm_runtime_result: pythonResult.result,
    elapsed_ms: pythonResult.elapsed_ms,
    quant_receipt: quantReceipt,
    counts,
    boundary: {
      descriptor_only: false,
      bounded_local_cpu_smoke_only: true,
      official_checkpoint_result: false,
      production_runtime_promotion_allowed: false,
      quant_pipeline_mutated: false,
      quant_processing_reduced: false,
      hookwall_candidate_only: true,
      grants_authority: false,
      ...ZERO_COUNTERS,
      process_starts: 1,
      runtime_authority_grants: 0,
      production_promotions: 0
    }
  };
  return {
    ...base,
    shannon_symbols: shannonSymbols(counts),
    fingerprint: sha16(base)
  };
}

export function writeHyperbehcsHrmCpuRuntimeKnownProblem(report) {
  writeJson(LOCAL_OUTPUTS.reportJson, report);
  writeText(LOCAL_OUTPUTS.reportMd, markdownReport(report));
  writeJson(LOCAL_OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.hrm_cpu_runtime_known_problem.v1",
    task_id: TASK_ID,
    status: report.status,
    answer: report.answer,
    fingerprint: report.fingerprint,
    counts: report.counts,
    hrm_runtime_result: report.hrm_runtime_result,
    boundary: report.boundary
  });
  writeNdjson(LOCAL_OUTPUTS.shannonSymbols, report.shannon_symbols);
  const hrmRoot = report.sources?.hrm_root;
  if (hrmRoot) {
    const dRoot = hrmRoot.replace(/\//g, "\\");
    writeJson(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-cpu-runtime-known-problem.v1.json"), report);
    writeText(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-cpu-runtime-known-problem.md"), markdownReport(report));
  }
  return LOCAL_OUTPUTS;
}

export function runHyperbehcsHrmCpuRuntimeKnownProblem(options = {}) {
  const report = buildHyperbehcsHrmCpuRuntimeKnownProblem(options);
  const outputs = options.writeFiles === false ? null : writeHyperbehcsHrmCpuRuntimeKnownProblem(report);
  return { report, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs();
  const { report, outputs } = runHyperbehcsHrmCpuRuntimeKnownProblem(args);
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
    runtime: report.runtime,
    model: {
      kind: report.model.kind,
      parameter_count: report.model.parameter_count
    },
    training: {
      bounded_local_training: report.training.bounded_local_training,
      steps_requested: report.training.steps_requested,
      solved_at_step: report.training.solved_at_step
    },
    hrm_runtime_result: {
      hrm_model_attempted: report.hrm_runtime_result.hrm_model_attempted,
      hrm_model_solved: report.hrm_runtime_result.hrm_model_solved,
      predicted_shortest_path_length: report.hrm_runtime_result.predicted_shortest_path_length,
      expected_path_mask_matches: report.hrm_runtime_result.expected_path_mask_matches,
      expected_path_cell_set_matches: report.hrm_runtime_result.expected_path_cell_set_matches
    },
    counts: report.counts,
    outputs
  }, null, 2));
}
