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

export const TASK_ID = "HYP-HRM-RUNTIME-GATE";
export const RUN_ID = "hyperbehcs-hrm-runtime-readiness-gate-20260516";

const DEFAULT_HRM_ROOT = "D:\\Asolaria-HRM";
const DEFAULT_ABSORPTION_REPORT = path.join(ROOT, "reports", "hyperbehcs-hrm-d-drive-absorption-latest.json");
const DEFAULT_ROTOR_REPORT = path.join(ROOT, "reports", "hyperbehcs-d-drive-10000-room-rotor-latest.json");

const LOCAL_OUTPUTS = Object.freeze({
  reportJson: path.join(ROOT, "reports", "hyperbehcs-hrm-runtime-readiness-gate-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-hrm-runtime-readiness-gate-latest.md"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-hrm-runtime-readiness-gate-latest.json"),
  gnnEdges: path.join(ROOT, "data", "behcs", "gnn-feeds", "hyperbehcs-hrm-runtime-readiness-gate-edges-latest.ndjson"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-hrm-runtime-readiness-gate-symbols-latest.ndjson")
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

function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--hrm-root") out.hrmRoot = argv[++i];
    if (arg === "--absorption-report") out.absorptionReportPath = argv[++i];
    if (arg === "--rotor-report") out.rotorReportPath = argv[++i];
    if (arg === "--no-write") out.writeFiles = false;
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function normalizeDPath(input, label) {
  const target = path.resolve(input);
  const parsed = path.parse(target);
  if (parsed.root.toUpperCase() !== "D:\\") {
    throw new Error(`${label} must be on D:\\, got ${target}`);
  }
  if (target.toUpperCase() === "D:\\") {
    throw new Error(`Refusing to use D:\\ root as ${label}.`);
  }
  return target;
}

function gateRow(id, passed, evidence, nextStep) {
  const row = {
    schema: "hyperbehcs.hrm_runtime_readiness_gate.row.v1",
    id,
    status: passed ? "pass" : "blocked",
    evidence,
    next_step: passed ? "none" : nextStep,
    descriptor_only: true,
    grants_authority: false,
    ...ZERO_COUNTERS
  };
  return { ...row, fingerprint: sha16(row) };
}

function buildGateRows({ hrmRoot, absorption, rotor }) {
  const requirementsPath = path.join(hrmRoot, "requirements.txt");
  const modelPath = path.join(hrmRoot, "models", "hrm", "hrm_act_v1.py");
  const configPath = path.join(hrmRoot, "config", "arch", "hrm_v1.yaml");
  const venvPath = path.join(hrmRoot, ".venv");
  const venvPythonPath = path.join(venvPath, "Scripts", "python.exe");
  const venvConfigPath = path.join(venvPath, "pyvenv.cfg");
  const dataPath = path.join(hrmRoot, "data");
  const checkpointPath = path.join(hrmRoot, "checkpoints");
  const gitmodulesPath = path.join(hrmRoot, ".gitmodules");
  const submodulesInitialized = [
    path.join(hrmRoot, "dataset", "raw-data", "ConceptARC", ".git"),
    path.join(hrmRoot, "dataset", "raw-data", "ARC-AGI", ".git"),
    path.join(hrmRoot, "dataset", "raw-data", "ARC-AGI-2", ".git")
  ].some((entry) => fs.existsSync(entry));
  const dependencyGateCount = Number(absorption?.counts?.dependency_gates || 0);
  const rotorPlaneIds = Array.isArray(rotor?.plane_binding_summary?.plane_ids) ? rotor.plane_binding_summary.plane_ids : [];
  const moduleMap = Array.isArray(absorption?.module_map) ? absorption.module_map : [];

  return [
    gateRow(
      "d_drive_hrm_source_present",
      fs.existsSync(modelPath) && fs.existsSync(configPath) && fs.existsSync(requirementsPath),
      { model_path: modelPath.replace(/\\/g, "/"), config_path: configPath.replace(/\\/g, "/"), requirements_path: requirementsPath.replace(/\\/g, "/") },
      "clone or restore HRM source under D:/Asolaria-HRM"
    ),
    gateRow(
      "absorption_report_present",
      absorption?.status === "hrm_source_installed_d_drive_absorbed_descriptor_only",
      { status: absorption?.status || "missing", fingerprint: absorption?.fingerprint || "" },
      "run hyperbehcs-hrm-d-drive-absorption"
    ),
    gateRow(
      "source_commit_pinned",
      /^[0-9a-f]{40}$/.test(String(absorption?.source?.git_commit || "")),
      { git_commit: absorption?.source?.git_commit || "" },
      "pin HRM source commit before runtime work"
    ),
    gateRow(
      "rotor_hrm_plane_bound",
      rotorPlaneIds.includes("hrm") && Number(rotor?.counts?.plane_binding_rows || 0) >= 10000,
      { plane_ids: rotorPlaneIds, plane_binding_rows: rotor?.counts?.plane_binding_rows || 0 },
      "re-materialize the 10000-room rotor with the hrm plane"
    ),
    gateRow(
      "asolaria_os_module_map_bound",
      moduleMap.some((row) => row.id === "hrm_high_level_module") &&
        moduleMap.some((row) => row.id === "hrm_low_level_module") &&
        moduleMap.some((row) => row.id === "hrm_halt_gate"),
      { module_count: moduleMap.length },
      "map HRM high/low/carry/halt symbols into Asolaria OS lanes"
    ),
    gateRow(
      "dependency_manifest_known",
      dependencyGateCount >= 10,
      { dependency_gates: dependencyGateCount },
      "capture requirements.txt and submodule dependency gates"
    ),
    gateRow(
      "isolated_python_env_ready",
      fs.existsSync(venvPythonPath) && fs.existsSync(venvConfigPath),
      {
        venv_path: venvPath.replace(/\\/g, "/"),
        python_path: venvPythonPath.replace(/\\/g, "/"),
        pyvenv_cfg_path: venvConfigPath.replace(/\\/g, "/"),
        exists: fs.existsSync(venvPath),
        python_exists: fs.existsSync(venvPythonPath),
        pyvenv_cfg_exists: fs.existsSync(venvConfigPath)
      },
      "create a D:/Asolaria-HRM/.venv and install pinned dependencies only after operator approval"
    ),
    gateRow(
      "torch_runtime_ready",
      false,
      { package: "torch", observed_runtime: "not_imported_or_installed_by_gate" },
      "install and verify a pinned Torch build in the isolated HRM venv"
    ),
    gateRow(
      "cuda_or_cpu_policy_ready",
      false,
      { upstream_requires_cuda_extensions: true, local_runtime_probe: "not_run_by_descriptor_gate" },
      "choose CUDA/FlashAttention runtime or explicit CPU/fallback policy before execution"
    ),
    gateRow(
      "flash_attention_ready",
      false,
      { imports: ["flash_attn_interface", "flash_attn"], source: "models/layers.py" },
      "install compatible FlashAttention or patch a reviewed fallback under hookwall"
    ),
    gateRow(
      "submodule_dataset_sources_ready",
      submodulesInitialized,
      { gitmodules_path: gitmodulesPath.replace(/\\/g, "/"), submodules_initialized: submodulesInitialized },
      "initialize HRM dataset submodules with explicit network approval"
    ),
    gateRow(
      "dataset_or_checkpoint_ready",
      fs.existsSync(dataPath) || fs.existsSync(checkpointPath),
      { data_path: dataPath.replace(/\\/g, "/"), checkpoint_path: checkpointPath.replace(/\\/g, "/") },
      "select checkpoint download, generated dataset, or dry-run fixture before model execution"
    ),
    gateRow(
      "wandb_policy_ready",
      false,
      { upstream_uses_wandb: true, local_policy: "not_configured_by_gate" },
      "set W&B disabled/offline or authenticated tracking policy before training"
    ),
    gateRow(
      "hookwall_runtime_promotion_ready",
      false,
      { live_model_execution_allowed: absorption?.hyperbehcs_binding?.live_model_execution_allowed === true },
      "promote only after dependency, benchmark, rollback, and operator gates pass"
    )
  ];
}

function summarizeGateRows(gateRows) {
  const passed = gateRows.filter((row) => row.status === "pass").length;
  const blocked = gateRows.filter((row) => row.status !== "pass").length;
  return {
    gates_total: gateRows.length,
    gates_passed: passed,
    gates_blocked: blocked,
    runtime_ready: blocked === 0,
    model_execution_allowed: 0,
    training_allowed: 0,
    dependency_install_allowed: 0,
    ...ZERO_COUNTERS
  };
}

function buildGnnEdges({ generatedAt, gateRows }) {
  const edges = [
    ["HRM", TASK_ID, "requires_runtime_readiness_gate"],
    [TASK_ID, "HyperBEHCS", "blocks_runtime_until_gates_pass"],
    [TASK_ID, "Asolaria OS", "reports_hrm_runtime_readiness"],
    [TASK_ID, "hookwall", "requires_promotion_before_execution"],
    [TASK_ID, "gulp", "routes_gate_evidence"],
    [TASK_ID, "gc", "retains_gate_report"]
  ].map(([from, to, relation]) => ({
    schema: "hyperbehcs.hrm_runtime_readiness_gate.edge.v1",
    generated_at: generatedAt,
    from,
    to,
    relation,
    grants_authority: false,
    ...ZERO_COUNTERS
  }));
  for (const row of gateRows) {
    edges.push({
      schema: "hyperbehcs.hrm_runtime_readiness_gate.edge.v1",
      generated_at: generatedAt,
      from: TASK_ID,
      to: row.id,
      relation: row.status === "pass" ? "gate_passed" : "gate_blocked",
      grants_authority: false,
      ...ZERO_COUNTERS
    });
  }
  return edges.map((row) => ({ ...row, fingerprint: sha16(row) }));
}

function shannonSymbols(counts) {
  return [
    ["HRM_GATES_TOTAL", counts.gates_total],
    ["HRM_GATES_PASSED", counts.gates_passed],
    ["HRM_GATES_BLOCKED", counts.gates_blocked],
    ["HRM_RUNTIME_READY", counts.runtime_ready ? 1 : 0],
    ["HRM_MODEL_EXECUTION_ALLOWED", counts.model_execution_allowed],
    ["RUNTIME_AUTHORITY_GRANTS", counts.runtime_authority_grants]
  ].map(([symbol, value]) => ({
    schema: "hyperbehcs.hrm_runtime_readiness_gate.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function markdownReport(report) {
  return [
    "# HyperBEHCS HRM Runtime Readiness Gate",
    "",
    `Verdict: ${report.verdict}`,
    "",
    `Fingerprint: ${report.fingerprint}`,
    "",
    "## Gate Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...Object.entries(report.counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Blocked Gates",
    "",
    ...report.gate_rows.filter((row) => row.status !== "pass").map((row) => `- ${row.id}: ${row.next_step}`),
    "",
    "Boundary: descriptor readiness only; no dependency install, model execution, training, CUDA, provider call, process start, or promotion."
  ].join("\n");
}

export function buildHyperbehcsHrmRuntimeReadinessGate(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const hrmRoot = normalizeDPath(options.hrmRoot || DEFAULT_HRM_ROOT, "HRM root");
  const absorptionPath = options.absorptionReportPath || DEFAULT_ABSORPTION_REPORT;
  const rotorPath = options.rotorReportPath || DEFAULT_ROTOR_REPORT;
  const absorption = readJson(absorptionPath);
  const rotor = readJson(rotorPath);
  const gateRows = buildGateRows({ hrmRoot, absorption, rotor });
  const counts = summarizeGateRows(gateRows);
  const verdict = counts.runtime_ready ? "ready_for_operator_runtime_promotion" : "blocked_runtime_dependencies_not_ready";
  const vector = [counts.gates_total, counts.gates_passed, counts.gates_blocked, counts.runtime_ready ? 1 : 0, counts.model_execution_allowed, counts.training_allowed];
  const quantReceipt = buildQuantizedSubstrateReceipt({
    substrate_id: "storage_d_drive",
    source_layer: "hrm_runtime_readiness_gate",
    vector,
    targetDimension: 4,
    seed: `${TASK_ID}:${absorption.fingerprint || "absorption"}:${rotor.fingerprint || "rotor"}`
  });
  const edges = buildGnnEdges({ generatedAt, gateRows });
  const shannon = shannonSymbols(counts);
  const base = {
    ok: true,
    schema: "hyperbehcs.hrm_runtime_readiness_gate.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: verdict,
    verdict,
    answer: "hrm_runtime_blocked_until_dependency_execution_and_hookwall_gates_pass",
    hrm_root: hrmRoot.replace(/\\/g, "/"),
    absorption_fingerprint: absorption.fingerprint,
    rotor_fingerprint: rotor.fingerprint,
    counts,
    gate_rows: gateRows,
    quant_receipt: quantReceipt,
    gnn_edges: edges,
    shannon_symbols: shannon,
    boundary: {
      descriptor_only: true,
      readiness_gate_only: true,
      dependency_install_allowed: false,
      cuda_install_allowed: false,
      flash_attention_install_allowed: false,
      model_execution_allowed: false,
      training_allowed: false,
      live_agent_spawn_allowed: false,
      runtime_promotion_allowed: false,
      grants_authority: false,
      ...ZERO_COUNTERS
    }
  };
  return { ...base, fingerprint: sha16(base) };
}

export function writeHyperbehcsHrmRuntimeReadinessGate(report) {
  writeJson(LOCAL_OUTPUTS.reportJson, report);
  writeText(LOCAL_OUTPUTS.reportMd, markdownReport(report));
  writeJson(LOCAL_OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.hrm_runtime_readiness_gate.v1",
    task_id: TASK_ID,
    status: report.status,
    verdict: report.verdict,
    fingerprint: report.fingerprint,
    counts: report.counts,
    boundary: report.boundary
  });
  writeNdjson(LOCAL_OUTPUTS.gnnEdges, report.gnn_edges);
  writeNdjson(LOCAL_OUTPUTS.shannonSymbols, report.shannon_symbols);
  const dReport = path.join(report.hrm_root.replace(/\//g, "\\"), "asolaria-integration", "hyperbehcs-hrm-runtime-readiness-gate.v1.json");
  const dReportMd = path.join(report.hrm_root.replace(/\//g, "\\"), "asolaria-integration", "hyperbehcs-hrm-runtime-readiness-gate.md");
  writeJson(dReport, report);
  writeText(dReportMd, markdownReport(report));
  return { ...LOCAL_OUTPUTS, d_report_json: dReport, d_report_md: dReportMd };
}

export function runHyperbehcsHrmRuntimeReadinessGate(options = {}) {
  const report = buildHyperbehcsHrmRuntimeReadinessGate(options);
  const outputs = options.writeFiles === false ? null : writeHyperbehcsHrmRuntimeReadinessGate(report);
  return { report, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs();
  const { report, outputs } = runHyperbehcsHrmRuntimeReadinessGate(args);
  console.log(JSON.stringify({
    ok: report.ok,
    verdict: report.verdict,
    fingerprint: report.fingerprint,
    counts: report.counts,
    blocked_gates: report.gate_rows.filter((row) => row.status !== "pass").map((row) => row.id),
    outputs
  }, null, 2));
}
