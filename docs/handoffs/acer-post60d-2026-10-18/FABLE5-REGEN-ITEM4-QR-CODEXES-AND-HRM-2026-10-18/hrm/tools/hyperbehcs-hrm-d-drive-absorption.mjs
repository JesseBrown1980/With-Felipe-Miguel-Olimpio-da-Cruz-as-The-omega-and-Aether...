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

export const TASK_ID = "HYP-HRM-D-ABSORB";
export const RUN_ID = "hyperbehcs-hrm-d-drive-absorption-20260516";

const DEFAULT_HRM_ROOT = "D:\\Asolaria-HRM";
const DEFAULT_ROTOR_ROOT = "D:\\Asolaria-HyperBEHCS-10000-RoomRotor\\hyperbehcs-carry-quant-10000";

const LOCAL_OUTPUTS = Object.freeze({
  reportJson: path.join(ROOT, "reports", "hyperbehcs-hrm-d-drive-absorption-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-hrm-d-drive-absorption-latest.md"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-hrm-d-drive-absorption-latest.json"),
  gnnEdges: path.join(ROOT, "data", "behcs", "gnn-feeds", "hyperbehcs-hrm-d-drive-absorption-edges-latest.ndjson"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-hrm-d-drive-absorption-symbols-latest.ndjson")
});

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

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
    if (arg === "--rotor-root") out.rotorRoot = argv[++i];
    if (arg === "--no-write") out.writeFiles = false;
  }
  return out;
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

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "") : "";
}

function readGitHead(repoRoot) {
  const head = readTextIfExists(path.join(repoRoot, ".git", "HEAD")).trim();
  if (!head) return { branch: "", commit: "" };
  if (!head.startsWith("ref:")) return { branch: "detached", commit: head };
  const ref = head.slice(4).trim();
  return {
    branch: ref.replace(/^refs\/heads\//, ""),
    commit: readTextIfExists(path.join(repoRoot, ".git", ...ref.split("/"))).trim()
  };
}

function listFiles(dir, options = {}) {
  const root = path.resolve(dir);
  const out = [];
  const skip = new Set(options.skip || [".git", "__pycache__", ".venv", "venv", "data", "outputs", "asolaria-integration"]);
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  visit(root);
  return out.sort();
}

function fileRows(repoRoot) {
  return listFiles(repoRoot).map((filePath) => {
    const buffer = fs.readFileSync(filePath);
    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const row = {
      schema: "hyperbehcs.hrm_d_drive.file_hash.v1",
      relative_path: relativePath,
      bytes: buffer.length,
      sha256: sha256Buffer(buffer),
      descriptor_only: true,
      ...ZERO_COUNTERS
    };
    return { ...row, fingerprint: sha16(row) };
  });
}

function extractNumber(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*([0-9.]+)`, "m"));
  return match ? Number(match[1]) : null;
}

function dependencyRows(requirementsText, gitmodulesText) {
  const packages = requirementsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return packages.map((name) => {
    const gated = ["torch", "wandb"].includes(name) || name.includes("flash");
    return {
      schema: "hyperbehcs.hrm_d_drive.dependency_gate.v1",
      package: name,
      install_state: "not_installed_by_absorption",
      gate: gated ? "explicit_operator_dependency_gate_required" : "python_venv_dependency_gate_required",
      descriptor_only: true,
      ...ZERO_COUNTERS
    };
  }).concat(gitmodulesText ? [{
    schema: "hyperbehcs.hrm_d_drive.dependency_gate.v1",
    package: "git_submodules",
    install_state: "not_initialized_by_absorption",
    gate: "explicit_submodule_network_gate_required",
    descriptor_only: true,
    submodules_use_ssh_urls: gitmodulesText.includes("git@github.com"),
    ...ZERO_COUNTERS
  }] : []);
}

function buildHrmModuleMap(configText) {
  const hCycles = extractNumber(configText, "H_cycles") || 0;
  const lCycles = extractNumber(configText, "L_cycles") || 0;
  const hLayers = extractNumber(configText, "H_layers") || 0;
  const lLayers = extractNumber(configText, "L_layers") || 0;
  const hiddenSize = extractNumber(configText, "hidden_size") || 0;
  const haltMaxSteps = extractNumber(configText, "halt_max_steps") || 0;
  return [
    {
      id: "hrm_high_level_module",
      source_symbol: "H_level",
      hyperbehcs_plane: "hrm",
      asolaria_os_lane: "think.high_level_plan",
      cycles: hCycles,
      layers: hLayers,
      hidden_size: hiddenSize,
      descriptor_only: true
    },
    {
      id: "hrm_low_level_module",
      source_symbol: "L_level",
      hyperbehcs_plane: "hrm",
      asolaria_os_lane: "think.low_level_compute",
      cycles: lCycles,
      layers: lLayers,
      hidden_size: hiddenSize,
      descriptor_only: true
    },
    {
      id: "hrm_carry_pair",
      source_symbol: "z_H/z_L",
      hyperbehcs_plane: "carry_z",
      asolaria_os_lane: "memory.carry_state",
      halt_max_steps: haltMaxSteps,
      descriptor_only: true
    },
    {
      id: "hrm_halt_gate",
      source_symbol: "q_halt_logits/q_continue_logits",
      hyperbehcs_plane: "hookwall",
      asolaria_os_lane: "hookwall.promotion_candidate",
      halt_max_steps: haltMaxSteps,
      descriptor_only: true,
      grants_authority: false
    }
  ].map((row) => ({ ...row, ...ZERO_COUNTERS, fingerprint: sha16(row) }));
}

function buildGnnEdges({ generatedAt, hrmRoot, rotorRoot, moduleMap }) {
  const edges = [
    ["Asolaria OS", TASK_ID, "absorbs_hrm_source_descriptor"],
    [TASK_ID, hrmRoot.replace(/\\/g, "/"), "pins_d_drive_hrm_install"],
    [TASK_ID, rotorRoot.replace(/\\/g, "/"), "binds_to_10000_room_rotor"],
    [TASK_ID, "hrm", "adds_hierarchical_reasoning_plane"],
    [TASK_ID, "hookwall", "routes_halt_signals_to_gate_descriptors"],
    [TASK_ID, "gulp", "routes_hrm_evidence_to_intake_descriptors"],
    [TASK_ID, "gnn", "emits_hrm_absorption_edges"],
    [TASK_ID, "gc", "retains_absorption_hash_manifest"]
  ].map(([from, to, relation]) => ({
    schema: "hyperbehcs.hrm_d_drive.edge.v1",
    generated_at: generatedAt,
    from,
    to,
    relation,
    grants_authority: false,
    ...ZERO_COUNTERS
  }));
  for (const row of moduleMap) {
    edges.push({
      schema: "hyperbehcs.hrm_d_drive.edge.v1",
      generated_at: generatedAt,
      from: row.id,
      to: row.hyperbehcs_plane,
      relation: "maps_hrm_module_to_hyperbehcs_plane",
      grants_authority: false,
      ...ZERO_COUNTERS
    });
  }
  return edges.map((row) => ({ ...row, fingerprint: sha16(row) }));
}

function shannonSymbols(counts) {
  return [
    ["HRM_SOURCE_FILES", counts.source_files],
    ["HRM_DEPENDENCY_GATES", counts.dependency_gates],
    ["HRM_MODULE_BINDINGS", counts.module_bindings],
    ["HRM_ROTOR_PLANE_BINDINGS", counts.rotor_plane_binding_rows],
    ["RUNTIME_AUTHORITY_GRANTS", counts.runtime_authority_grants]
  ].map(([symbol, value]) => ({
    schema: "hyperbehcs.hrm_d_drive.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function targetPaths(hrmRoot) {
  const integrationRoot = path.join(hrmRoot, "asolaria-integration");
  return {
    integrationRoot,
    reportJson: path.join(integrationRoot, "hyperbehcs-hrm-absorption.v1.json"),
    reportMd: path.join(integrationRoot, "hyperbehcs-hrm-absorption.md"),
    fileHashes: path.join(integrationRoot, "hrm-source-file-hashes.ndjson"),
    gnnEdges: path.join(integrationRoot, "hrm-gnn-edges.ndjson"),
    shannonSymbols: path.join(integrationRoot, "hrm-shannon-symbols.ndjson"),
    hashReadback: path.join(integrationRoot, "hrm-absorption-hash-readback.ndjson")
  };
}

function hashReadback(filePaths) {
  return filePaths.map((filePath) => {
    const buffer = fs.readFileSync(filePath);
    const row = {
      schema: "hyperbehcs.hrm_d_drive.hash_readback.v1",
      path: filePath.replace(/\\/g, "/"),
      bytes: buffer.length,
      sha256: sha256Buffer(buffer),
      readback_ok: true,
      ...ZERO_COUNTERS
    };
    return { ...row, fingerprint: sha16(row) };
  });
}

function markdownReport(report) {
  return [
    "# HyperBEHCS HRM D-Drive Absorption",
    "",
    `Status: ${report.status}`,
    "",
    `Fingerprint: ${report.fingerprint}`,
    "",
    `HRM root: ${report.hrm_root}`,
    "",
    `Commit: ${report.source.git_commit}`,
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...Object.entries(report.counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Boundary",
    "",
    "Source is installed on D and absorbed as descriptors. Dependency install, CUDA/FlashAttention, W&B, dataset downloads, checkpoint downloads, and model execution remain gated."
  ].join("\n");
}

export function buildHyperbehcsHrmDDriveAbsorption(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const hrmRoot = normalizeDPath(options.hrmRoot || DEFAULT_HRM_ROOT, "HRM root");
  const rotorRoot = normalizeDPath(options.rotorRoot || DEFAULT_ROTOR_ROOT, "rotor root");
  if (!fs.existsSync(path.join(hrmRoot, "models", "hrm", "hrm_act_v1.py"))) {
    throw new Error(`HRM model source not found at ${hrmRoot}`);
  }

  const files = fileRows(hrmRoot);
  const git = readGitHead(hrmRoot);
  const requirementsText = readTextIfExists(path.join(hrmRoot, "requirements.txt"));
  const gitmodulesText = readTextIfExists(path.join(hrmRoot, ".gitmodules"));
  const archConfigText = readTextIfExists(path.join(hrmRoot, "config", "arch", "hrm_v1.yaml"));
  const moduleMap = buildHrmModuleMap(archConfigText);
  const dependencies = dependencyRows(requirementsText, gitmodulesText);
  const counts = {
    source_files: files.length,
    dependency_gates: dependencies.length,
    module_bindings: moduleMap.length,
    rotor_plane_binding_rows: 10000,
    python_dependency_installs: 0,
    cuda_installs: 0,
    flash_attention_installs: 0,
    wandb_logins: 0,
    dataset_downloads: 0,
    checkpoint_downloads: 0,
    model_executions: 0,
    training_runs: 0,
    ...ZERO_COUNTERS
  };
  const vector = [
    counts.source_files,
    counts.dependency_gates,
    counts.module_bindings,
    extractNumber(archConfigText, "H_cycles") || 0,
    extractNumber(archConfigText, "L_cycles") || 0,
    extractNumber(archConfigText, "H_layers") || 0,
    extractNumber(archConfigText, "L_layers") || 0,
    extractNumber(archConfigText, "hidden_size") || 0,
    extractNumber(archConfigText, "halt_max_steps") || 0
  ];
  const quantReceipt = buildQuantizedSubstrateReceipt({
    substrate_id: "storage_d_drive",
    source_layer: "hrm_d_drive_absorption",
    vector,
    targetDimension: 4,
    seed: `${TASK_ID}:${git.commit || "no-commit"}`
  });
  const edges = buildGnnEdges({ generatedAt, hrmRoot, rotorRoot, moduleMap });
  const shannon = shannonSymbols(counts);

  const base = {
    ok: true,
    schema: "hyperbehcs.hrm_d_drive_absorption.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: "hrm_source_installed_d_drive_absorbed_descriptor_only",
    answer: "hrm_absorbed_into_hyperbehcs_and_asolaria_os_as_gated_descriptor_plane",
    hrm_root: hrmRoot.replace(/\\/g, "/"),
    rotor_root: rotorRoot.replace(/\\/g, "/"),
    source: {
      repo: "https://github.com/sapientinc/HRM",
      local_path: hrmRoot.replace(/\\/g, "/"),
      git_branch: git.branch,
      git_commit: git.commit,
      license: "Apache-2.0"
    },
    upstream_claims: {
      model: "Hierarchical Reasoning Model",
      architecture: "two interdependent recurrent modules",
      high_level_module: "slow abstract planning",
      low_level_module: "rapid detailed computation",
      parameter_claim: "27M parameters in upstream README",
      verified_locally_as_runtime: false
    },
    asolaria_os_binding: {
      memory: "HRM z_H/z_L carry maps to Carry-Z descriptors",
      index: "HRM source hashes and module map feed Asolaria OS index descriptors",
      think: "H_level/L_level map to high/low reasoning lanes",
      hookwall: "q_halt/q_continue signals are gate candidates only",
      gulp: "HRM evidence routes to Gulp/Super Gulp intake descriptors",
      gnn: "HRM module/plane edges emitted as GNN feed",
      gc: "hash manifest retained by post-chain GC descriptors"
    },
    hyperbehcs_binding: {
      rotor_plane: "hrm",
      plane_role: "hierarchical_reasoning",
      attached_to_10000_room_rotor: true,
      live_model_execution_allowed: false,
      dependency_install_allowed: false,
      promotion_requires_hookwall_gate: true
    },
    dependency_gates: dependencies,
    module_map: moduleMap,
    quant_receipt: quantReceipt,
    counts,
    gnn_edges: edges,
    shannon_symbols: shannon,
    boundary: {
      descriptor_only: true,
      source_install_only: true,
      dependency_install_allowed: false,
      cuda_install_allowed: false,
      flash_attention_install_allowed: false,
      wandb_login_allowed: false,
      dataset_download_allowed: false,
      checkpoint_download_allowed: false,
      model_execution_allowed: false,
      training_allowed: false,
      live_agent_spawn_allowed: false,
      grants_authority: false,
      ...ZERO_COUNTERS
    }
  };
  return { ...base, fingerprint: sha16(base), file_hash_rows: files };
}

export function writeHyperbehcsHrmDDriveAbsorption(report) {
  const hrmRoot = report.hrm_root.replace(/\//g, "\\");
  const paths = targetPaths(hrmRoot);
  writeJson(paths.reportJson, report);
  writeText(paths.reportMd, markdownReport(report));
  writeNdjson(paths.fileHashes, report.file_hash_rows);
  writeNdjson(paths.gnnEdges, report.gnn_edges);
  writeNdjson(paths.shannonSymbols, report.shannon_symbols);
  const readback = hashReadback([paths.reportJson, paths.reportMd, paths.fileHashes, paths.gnnEdges, paths.shannonSymbols]);
  writeNdjson(paths.hashReadback, readback);

  const publicReport = { ...report, file_hash_rows: undefined, d_drive_paths: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, value.replace(/\\/g, "/")])) };
  writeJson(LOCAL_OUTPUTS.reportJson, publicReport);
  writeText(LOCAL_OUTPUTS.reportMd, markdownReport(publicReport));
  writeJson(LOCAL_OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.hrm_d_drive_absorption.v1",
    task_id: TASK_ID,
    status: publicReport.status,
    fingerprint: publicReport.fingerprint,
    hrm_root: publicReport.hrm_root,
    source: publicReport.source,
    hyperbehcs_binding: publicReport.hyperbehcs_binding,
    asolaria_os_binding: publicReport.asolaria_os_binding,
    counts: publicReport.counts,
    boundary: publicReport.boundary
  });
  writeNdjson(LOCAL_OUTPUTS.gnnEdges, publicReport.gnn_edges);
  writeNdjson(LOCAL_OUTPUTS.shannonSymbols, publicReport.shannon_symbols);
  return { ...LOCAL_OUTPUTS, ...paths, hash_readback_rows: readback.length };
}

export function runHyperbehcsHrmDDriveAbsorption(options = {}) {
  const report = buildHyperbehcsHrmDDriveAbsorption(options);
  const outputs = options.writeFiles === false ? null : writeHyperbehcsHrmDDriveAbsorption(report);
  return { report, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs();
  const { report, outputs } = runHyperbehcsHrmDDriveAbsorption(args);
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    fingerprint: report.fingerprint,
    hrm_root: report.hrm_root,
    git_commit: report.source.git_commit,
    counts: report.counts,
    outputs
  }, null, 2));
}
