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

export const TASK_ID = "HYP-HRM-DESCRIPTOR-ADAPTER";
export const RUN_ID = "hyperbehcs-hrm-descriptor-adapter-20260516";

const DEFAULT_REPORTS = Object.freeze({
  fastPackets: path.join(ROOT, "reports", "hyperbehcs-triple-quant-fast-packet-consumer-latest.json"),
  carryReplay: path.join(ROOT, "reports", "hyperbehcs-carry-state-reflex-replay-latest.json"),
  carryGate: path.join(ROOT, "reports", "hyperbehcs-carry-state-reflex-promotion-gate-latest.json"),
  hrmAbsorption: path.join(ROOT, "reports", "hyperbehcs-hrm-d-drive-absorption-latest.json"),
  hrmRuntimeGate: path.join(ROOT, "reports", "hyperbehcs-hrm-runtime-readiness-gate-latest.json"),
  roomRotor: path.join(ROOT, "reports", "hyperbehcs-d-drive-10000-room-rotor-latest.json")
});

const LOCAL_OUTPUTS = Object.freeze({
  reportJson: path.join(ROOT, "reports", "hyperbehcs-hrm-descriptor-adapter-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-hrm-descriptor-adapter-latest.md"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-hrm-descriptor-adapter-latest.json"),
  gnnEdges: path.join(ROOT, "data", "behcs", "gnn-feeds", "hyperbehcs-hrm-descriptor-adapter-edges-latest.ndjson"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-hrm-descriptor-adapter-symbols-latest.ndjson")
});

const BASE_VOCAB = Object.freeze([
  "<pad>",
  "<ignore>",
  "<bos>",
  "<eos>",
  "quant.accepted",
  "quant.rejected",
  "receipt.zero_loss",
  "receipt.approx_numeric",
  "hrm.input",
  "hrm.label",
  "carry.advantage",
  "carry.no_advantage",
  "hookwall.candidate",
  "hookwall.blocked",
  "runtime.blocked",
  "runtime.ready",
  "lane.coarse",
  "lane.medium",
  "lane.fine",
  "action.answer_fast",
  "action.emit_gnn_edge",
  "action.increase_gulp_review"
]);

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function fileHash(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fast-packets") out.fastPacketsPath = argv[++i];
    if (arg === "--carry-replay") out.carryReplayPath = argv[++i];
    if (arg === "--carry-gate") out.carryGatePath = argv[++i];
    if (arg === "--hrm-absorption") out.hrmAbsorptionPath = argv[++i];
    if (arg === "--hrm-runtime-gate") out.hrmRuntimeGatePath = argv[++i];
    if (arg === "--room-rotor") out.roomRotorPath = argv[++i];
    if (arg === "--no-write") out.writeFiles = false;
  }
  return out;
}

function sourcePaths(options = {}) {
  return {
    fastPackets: options.fastPacketsPath || DEFAULT_REPORTS.fastPackets,
    carryReplay: options.carryReplayPath || DEFAULT_REPORTS.carryReplay,
    carryGate: options.carryGatePath || DEFAULT_REPORTS.carryGate,
    hrmAbsorption: options.hrmAbsorptionPath || DEFAULT_REPORTS.hrmAbsorption,
    hrmRuntimeGate: options.hrmRuntimeGatePath || DEFAULT_REPORTS.hrmRuntimeGate,
    roomRotor: options.roomRotorPath || DEFAULT_REPORTS.roomRotor
  };
}

function tokenId(token, vocab) {
  if (!vocab.has(token)) vocab.set(token, vocab.size);
  return vocab.get(token);
}

function boundedNumber(value, max = 255) {
  const number = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(max, number));
}

function buildVocab(fastPackets, carryReplay, carryGate, hrmRuntimeGate, roomRotor) {
  const vocab = new Map(BASE_VOCAB.map((token, index) => [token, index]));
  for (const row of fastPackets.accepted_rows || []) {
    tokenId(`substrate.${row.substrate_id}`, vocab);
    tokenId(`source_layer.${row.source_layer}`, vocab);
    for (const lane of row.triple_quant_lanes || []) tokenId(`lane.${lane}`, vocab);
  }
  for (const row of carryReplay.replay_rows || []) {
    tokenId(`carry.scope.${row.scope}`, vocab);
    tokenId(`carry.action.${row.action}`, vocab);
    for (const action of row.carry_actions || []) tokenId(`action.${action}`, vocab);
  }
  for (const row of carryGate.gate_rows || []) tokenId(`gate.${row.id}`, vocab);
  for (const row of hrmRuntimeGate.gate_rows || []) tokenId(`hrm_gate.${row.id}`, vocab);
  for (const plane of roomRotor.plane_binding_summary?.plane_ids || []) tokenId(`plane.${plane}`, vocab);
  return Object.fromEntries(Array.from(vocab.entries()).map(([token, id]) => [token, id]));
}

function vocabLookup(vocab) {
  return new Map(Object.entries(vocab).map(([token, id]) => [token, Number(id)]));
}

function padTokens(tokens, seqLen, padId) {
  return tokens.slice(0, seqLen).concat(Array.from({ length: Math.max(0, seqLen - tokens.length) }, () => padId));
}

function buildFastPacketRows({ fastPackets, vocab, seqLen }) {
  const lookup = vocabLookup(vocab);
  const padId = lookup.get("<pad>");
  const rows = [];
  for (const row of fastPackets.accepted_rows || []) {
    const inputTokens = [
      lookup.get("<bos>"),
      lookup.get("quant.accepted"),
      lookup.get(`substrate.${row.substrate_id}`),
      lookup.get(`source_layer.${row.source_layer}`),
      ...(row.triple_quant_lanes || []).map((lane) => lookup.get(`lane.${lane}`)),
      row.receipt_zero_loss ? lookup.get("receipt.zero_loss") : lookup.get("receipt.approx_numeric"),
      lookup.get("hrm.input"),
      boundedNumber(row.vector_dimension),
      boundedNumber(row.triple_fast_size_reduction_percent),
      boundedNumber(row.raw_to_triple_parse_speedup_ratio * 10),
      lookup.get("<eos>")
    ].filter((value) => Number.isInteger(value));
    const labelTokens = [
      lookup.get("<bos>"),
      lookup.get("hookwall.candidate"),
      lookup.get("hrm.label"),
      lookup.get("runtime.blocked"),
      lookup.get("<eos>")
    ];
    const adapterRow = {
      schema: "hyperbehcs.hrm_descriptor_adapter.row.v1",
      source_kind: "hyp256_accepted_fast_packet",
      source_id: row.row_id,
      source_fingerprint: row.benchmark_fingerprint,
      puzzle_identifier: Math.abs(Number.parseInt(sha16(row.row_id), 16)) % 1000000,
      inputs: padTokens(inputTokens, seqLen, padId),
      labels: padTokens(labelTokens, seqLen, lookup.get("<ignore>")),
      descriptor_only: true,
      quant_unchanged: true,
      ...ZERO_COUNTERS
    };
    rows.push({ ...adapterRow, fingerprint: sha16(adapterRow) });
  }
  return rows;
}

function buildCarryRows({ carryReplay, vocab, seqLen }) {
  const lookup = vocabLookup(vocab);
  const padId = lookup.get("<pad>");
  return (carryReplay.replay_rows || []).map((row) => {
    const inputTokens = [
      lookup.get("<bos>"),
      lookup.get(`carry.scope.${row.scope}`),
      lookup.get(`carry.action.${row.action}`),
      row.carry_advantage_observed ? lookup.get("carry.advantage") : lookup.get("carry.no_advantage"),
      ...(row.carry_actions || []).map((action) => lookup.get(`action.${action}`)),
      lookup.get("plane.carry_z"),
      lookup.get("plane.hrm"),
      boundedNumber(row.top_score * 100),
      boundedNumber(row.stability_delta * 100),
      boundedNumber(row.reward_delta * 100),
      lookup.get("<eos>")
    ].filter((value) => Number.isInteger(value));
    const labelTokens = [
      lookup.get("<bos>"),
      row.carry_advantage_observed ? lookup.get("carry.advantage") : lookup.get("carry.no_advantage"),
      lookup.get("hookwall.candidate"),
      lookup.get("runtime.blocked"),
      lookup.get("<eos>")
    ];
    const adapterRow = {
      schema: "hyperbehcs.hrm_descriptor_adapter.row.v1",
      source_kind: "carry_z_replay_row",
      source_id: `${row.scope}:${row.index}`,
      source_fingerprint: row.fingerprint,
      puzzle_identifier: Math.abs(Number.parseInt(sha16(`${row.scope}:${row.index}`), 16)) % 1000000,
      inputs: padTokens(inputTokens, seqLen, padId),
      labels: padTokens(labelTokens, seqLen, lookup.get("<ignore>")),
      descriptor_only: true,
      quant_unchanged: true,
      ...ZERO_COUNTERS
    };
    return { ...adapterRow, fingerprint: sha16(adapterRow) };
  });
}

function buildDatasetContract({ vocab, seqLen, rows }) {
  return {
    schema: "hyperbehcs.hrm_descriptor_adapter.dataset_contract.v1",
    format: "HRM-compatible fixed token descriptor rows; not materialized as numpy dataset yet",
    train_test_split: "not_written_descriptor_only",
    seq_len: seqLen,
    vocab_size: Object.keys(vocab).length,
    pad_id: vocab["<pad>"],
    ignore_label_id: vocab["<ignore>"],
    blank_identifier_id: 0,
    num_puzzle_identifiers: Math.max(1, rows.length),
    required_tensors: ["inputs", "labels", "puzzle_identifiers"],
    numpy_dataset_write_allowed: false,
    model_execution_allowed: false,
    training_allowed: false,
    descriptor_only: true,
    ...ZERO_COUNTERS
  };
}

function buildDecoderContract(vocab) {
  return {
    schema: "hyperbehcs.hrm_descriptor_adapter.decoder_contract.v1",
    logits_to_descriptor_tokens: true,
    halt_logits_to_hookwall_candidate_only: true,
    output_authority: "none",
    allowed_candidate_outputs: [
      "candidate_continue_descriptor",
      "candidate_halt_descriptor",
      "candidate_replay_descriptor",
      "candidate_more_evidence_descriptor",
      "candidate_carry_advantage_descriptor"
    ],
    forbidden_outputs: [
      "process_start",
      "provider_call",
      "route_mutation",
      "runtime_promotion",
      "quant_replacement",
      "production_action"
    ],
    vocab_size: Object.keys(vocab).length,
    descriptor_only: true,
    ...ZERO_COUNTERS
  };
}

function buildQuantGuard(paths, fastPackets) {
  return {
    schema: "hyperbehcs.hrm_descriptor_adapter.quant_guard.v1",
    hyp256_report_path: paths.fastPackets.replace(/\\/g, "/"),
    hyp256_report_sha256: fileHash(paths.fastPackets),
    hyp256_fingerprint: fastPackets.fingerprint,
    source_hyp255_fingerprint: fastPackets.source_hyp255_fingerprint,
    accepted_fast_packet_rows: (fastPackets.accepted_rows || []).length,
    rejected_rows: (fastPackets.rejected_rows || []).length,
    quant_pipeline_mutated: false,
    adapter_position: "after_hyp256_acceptance",
    quant_processing_reduced: false,
    descriptor_only: true,
    ...ZERO_COUNTERS
  };
}

function buildGnnEdges({ generatedAt, rows, fastPackets, carryReplay, hrmRuntimeGate }) {
  const edges = [
    ["HYP-256", TASK_ID, "feeds_accepted_rows_to_descriptor_adapter"],
    [TASK_ID, "HRM", "builds_fixed_token_descriptor_contract"],
    [TASK_ID, "Quant", "preserves_quant_as_primary_receipt_path"],
    [TASK_ID, "Carry-Z", "encodes_replay_rows_as_descriptor_tokens"],
    [TASK_ID, "hookwall", "routes_halt_continue_as_candidate_only"],
    [TASK_ID, "Gulp", "routes_adapter_evidence"],
    [TASK_ID, "GC", "retains_adapter_contract"]
  ].map(([from, to, relation]) => ({
    schema: "hyperbehcs.hrm_descriptor_adapter.edge.v1",
    generated_at: generatedAt,
    from,
    to,
    relation,
    grants_authority: false,
    ...ZERO_COUNTERS
  }));
  for (const row of rows) {
    edges.push({
      schema: "hyperbehcs.hrm_descriptor_adapter.edge.v1",
      generated_at: generatedAt,
      from: row.source_id,
      to: TASK_ID,
      relation: row.source_kind === "hyp256_accepted_fast_packet" ? "encodes_quant_packet" : "encodes_carry_replay",
      grants_authority: false,
      ...ZERO_COUNTERS
    });
  }
  edges.push({
    schema: "hyperbehcs.hrm_descriptor_adapter.edge.v1",
    generated_at: generatedAt,
    from: TASK_ID,
    to: hrmRuntimeGate.verdict || hrmRuntimeGate.status,
    relation: "honors_hrm_runtime_readiness_gate",
    grants_authority: false,
    ...ZERO_COUNTERS
  });
  edges.push({
    schema: "hyperbehcs.hrm_descriptor_adapter.edge.v1",
    generated_at: generatedAt,
    from: fastPackets.fingerprint,
    to: carryReplay.fingerprint,
    relation: "binds_quant_packets_to_carry_evidence",
    grants_authority: false,
    ...ZERO_COUNTERS
  });
  return edges.map((row) => ({ ...row, fingerprint: sha16(row) }));
}

function shannonSymbols(counts) {
  return [
    ["HRM_ADAPTER_ROWS", counts.adapter_rows],
    ["HRM_ADAPTER_FAST_PACKET_ROWS", counts.fast_packet_adapter_rows],
    ["HRM_ADAPTER_CARRY_ROWS", counts.carry_adapter_rows],
    ["HRM_ADAPTER_VOCAB_SIZE", counts.vocab_size],
    ["HRM_ADAPTER_SEQ_LEN", counts.seq_len],
    ["QUANT_PROCESSING_REDUCED", counts.quant_processing_reduced],
    ["MODEL_EXECUTION_ALLOWED", counts.model_execution_allowed],
    ["RUNTIME_AUTHORITY_GRANTS", counts.runtime_authority_grants]
  ].map(([symbol, value]) => ({
    schema: "hyperbehcs.hrm_descriptor_adapter.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function markdownReport(report) {
  return [
    "# HyperBEHCS HRM Descriptor Adapter",
    "",
    `Status: ${report.status}`,
    "",
    `Fingerprint: ${report.fingerprint}`,
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...Object.entries(report.counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Quant Guard",
    "",
    `HYP-256 fingerprint: ${report.quant_guard.hyp256_fingerprint}`,
    "",
    `Quant processing reduced: ${report.quant_guard.quant_processing_reduced}`,
    "",
    "## Boundary",
    "",
    "Descriptor adapter only. It does not import Torch, execute Python, write numpy datasets, run HRM, install dependencies, mutate quant, or grant authority."
  ].join("\n");
}

export function buildHyperbehcsHrmDescriptorAdapter(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const paths = sourcePaths(options);
  const fastPackets = readJson(paths.fastPackets);
  const carryReplay = readJson(paths.carryReplay);
  const carryGate = readJson(paths.carryGate);
  const hrmAbsorption = readJson(paths.hrmAbsorption);
  const hrmRuntimeGate = readJson(paths.hrmRuntimeGate);
  const roomRotor = readJson(paths.roomRotor);
  const seqLen = Math.max(16, Math.min(256, Number(options.seqLen || 64)));
  const vocab = buildVocab(fastPackets, carryReplay, carryGate, hrmRuntimeGate, roomRotor);
  const fastRows = buildFastPacketRows({ fastPackets, vocab, seqLen });
  const carryRows = buildCarryRows({ carryReplay, vocab, seqLen });
  const rows = [...fastRows, ...carryRows];
  const datasetContract = buildDatasetContract({ vocab, seqLen, rows });
  const decoderContract = buildDecoderContract(vocab);
  const quantGuard = buildQuantGuard(paths, fastPackets);
  const counts = {
    adapter_rows: rows.length,
    fast_packet_adapter_rows: fastRows.length,
    carry_adapter_rows: carryRows.length,
    vocab_size: Object.keys(vocab).length,
    seq_len: seqLen,
    hyp256_accepted_rows_preserved: quantGuard.accepted_fast_packet_rows,
    hyp256_rejected_rows_preserved: quantGuard.rejected_rows,
    carry_replay_rows_seen: (carryReplay.replay_rows || []).length,
    hrm_runtime_gates_passed: Number(hrmRuntimeGate.counts?.gates_passed || 0),
    hrm_runtime_gates_blocked: Number(hrmRuntimeGate.counts?.gates_blocked || 0),
    quant_processing_reduced: 0,
    torch_imports: 0,
    python_executions: 0,
    numpy_dataset_writes: 0,
    model_execution_allowed: 0,
    training_allowed: 0,
    ...ZERO_COUNTERS
  };
  const quantReceipt = buildQuantizedSubstrateReceipt({
    substrate_id: "storage_c_drive",
    source_layer: "hrm_descriptor_adapter",
    vector: [
      counts.adapter_rows,
      counts.fast_packet_adapter_rows,
      counts.carry_adapter_rows,
      counts.vocab_size,
      counts.seq_len,
      counts.hrm_runtime_gates_passed,
      counts.hrm_runtime_gates_blocked
    ],
    targetDimension: 4,
    seed: `${TASK_ID}:${fastPackets.fingerprint}:${carryReplay.fingerprint}:${hrmRuntimeGate.fingerprint}`
  });
  const gnnEdges = buildGnnEdges({ generatedAt, rows, fastPackets, carryReplay, hrmRuntimeGate });
  const shannon = shannonSymbols(counts);
  const base = {
    ok: true,
    schema: "hyperbehcs.hrm_descriptor_adapter.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: "hrm_descriptor_adapter_ready_no_runtime_execution",
    answer: "hrm_descriptor_adapter_ready_after_quant_without_reducing_quant_processing",
    hrm_root: hrmAbsorption.hrm_root,
    rotor_root: hrmAbsorption.rotor_root || roomRotor.destination_root,
    sources: {
      hyp256_fingerprint: fastPackets.fingerprint,
      source_hyp255_fingerprint: fastPackets.source_hyp255_fingerprint,
      carry_replay_fingerprint: carryReplay.fingerprint,
      carry_gate_fingerprint: carryGate.fingerprint,
      hrm_absorption_fingerprint: hrmAbsorption.fingerprint,
      hrm_runtime_gate_fingerprint: hrmRuntimeGate.fingerprint,
      room_rotor_fingerprint: roomRotor.fingerprint
    },
    quant_guard: quantGuard,
    adapter_position: "post_hyp256_acceptance_sidecar",
    vocab,
    dataset_contract: datasetContract,
    decoder_contract: decoderContract,
    adapter_rows: rows,
    quant_receipt: quantReceipt,
    counts,
    gnn_edges: gnnEdges,
    shannon_symbols: shannon,
    boundary: {
      descriptor_only: true,
      post_quant_sidecar_only: true,
      quant_pipeline_mutated: false,
      quant_processing_reduced: false,
      torch_import_allowed: false,
      python_execution_allowed: false,
      numpy_dataset_write_allowed: false,
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

export function writeHyperbehcsHrmDescriptorAdapter(report) {
  writeJson(LOCAL_OUTPUTS.reportJson, report);
  writeText(LOCAL_OUTPUTS.reportMd, markdownReport(report));
  writeJson(LOCAL_OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.hrm_descriptor_adapter.v1",
    task_id: TASK_ID,
    status: report.status,
    fingerprint: report.fingerprint,
    counts: report.counts,
    quant_guard: report.quant_guard,
    boundary: report.boundary
  });
  writeNdjson(LOCAL_OUTPUTS.gnnEdges, report.gnn_edges);
  writeNdjson(LOCAL_OUTPUTS.shannonSymbols, report.shannon_symbols);
  const hrmRoot = report.hrm_root || readJson(DEFAULT_REPORTS.hrmAbsorption).hrm_root;
  if (hrmRoot) {
    const dRoot = hrmRoot.replace(/\//g, "\\");
    writeJson(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-descriptor-adapter.v1.json"), report);
    writeText(path.join(dRoot, "asolaria-integration", "hyperbehcs-hrm-descriptor-adapter.md"), markdownReport(report));
  }
  return LOCAL_OUTPUTS;
}

export function runHyperbehcsHrmDescriptorAdapter(options = {}) {
  const report = buildHyperbehcsHrmDescriptorAdapter(options);
  const outputs = options.writeFiles === false ? null : writeHyperbehcsHrmDescriptorAdapter(report);
  return { report, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs();
  const { report, outputs } = runHyperbehcsHrmDescriptorAdapter(args);
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    fingerprint: report.fingerprint,
    counts: report.counts,
    quant_guard: report.quant_guard,
    outputs
  }, null, 2));
}
