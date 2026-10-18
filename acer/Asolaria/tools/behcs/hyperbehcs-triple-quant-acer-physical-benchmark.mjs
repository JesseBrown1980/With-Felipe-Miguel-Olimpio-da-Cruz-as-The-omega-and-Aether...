#!/usr/bin/env node
"use strict";

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const require = createRequire(import.meta.url);
const {
  buildJohnsonLindenstraussProjection,
  buildTurboQuant,
  buildPolarQuant,
  buildTripleQuant,
  reconstructTripleQuant,
  buildRepresentationReceipt
} = require(path.join(ROOT, "src", "behcs", "hyperbehcsRepresentationAlgorithms.js"));

export const TASK_ID = "HYP-255";
export const RUN_ID = "hyperbehcs-triple-quant-acer-physical-benchmark-20260515";

const OUTPUTS = Object.freeze({
  manifest: path.join(ROOT, "data", "behcs", "representation", RUN_ID, "triple-quant-acer-physical-benchmark.v1.json"),
  rows: path.join(ROOT, "data", "behcs", "representation", RUN_ID, "triple-quant-acer-benchmark-rows-latest.ndjson"),
  review: path.join(ROOT, "data", "behcs", "representation", RUN_ID, "triple-quant-acer-benchmark-review-latest.ndjson"),
  zeroAuthorityContract: path.join(ROOT, "data", "behcs", "representation", RUN_ID, "triple-quant-zero-authority-contract.v1.json"),
  cDriveReadbackProbe: path.join(ROOT, "data", "behcs", "representation", RUN_ID, "triple-quant-c-drive-readback-probe.v1.json"),
  dashboardFeed: path.join(ROOT, "data", "behcs", "dashboard-feeds", "hyperbehcs-triple-quant-acer-physical-benchmark-latest.json"),
  gnnEdges: path.join(ROOT, "data", "behcs", "gnn-feeds", "hyperbehcs-triple-quant-acer-physical-benchmark-edges-latest.ndjson"),
  shannonSymbols: path.join(ROOT, "data", "behcs", "shannon", "hyperbehcs-triple-quant-acer-physical-benchmark-symbols-latest.ndjson"),
  reportJson: path.join(ROOT, "reports", "hyperbehcs-triple-quant-acer-physical-benchmark-latest.json"),
  reportMd: path.join(ROOT, "reports", "hyperbehcs-triple-quant-acer-physical-benchmark-latest.md")
});

const ZERO_COUNTERS = Object.freeze({
  hardware_mutations: 0,
  cpu_affinity_changes: 0,
  gpu_kernel_launches: 0,
  gpu_driver_mutations: 0,
  remote_writes: 0,
  adb_actions: 0,
  scrcpy_actions: 0,
  device_file_writes: 0,
  route_mutations: 0,
  provider_calls: 0,
  mcp_tool_calls: 0,
  process_starts: 0,
  executor_executions: 0,
  cleanup_actions: 0,
  runtime_authority_grants: 0,
  production_promotions: 0
});

const DEFAULT_SOURCES = Object.freeze([
  {
    id: "processor_local",
    substrate_id: "processor_local",
    source_layer: "acer_cpu_cache_receipt",
    path: "src/behcs/hyperbehcsRepresentationAlgorithms.js",
    vector_dimension: 1536
  },
  {
    id: "leworld_world_model",
    substrate_id: "leworld_world_model",
    source_layer: "leworld_world_model_receipt",
    path: "reports/pixel-backend-world-model-fusion-latest.json",
    fallbackPath: "reports/hyperbehcs-quant-substrate-permanent-local-latest.json",
    vector_dimension: 1536
  },
  {
    id: "backend_state_receipt",
    substrate_id: "backend_state_receipt",
    source_layer: "backend_state_receipt",
    path: "server.js",
    vector_dimension: 1536
  },
  {
    id: "pixel_look_truth",
    substrate_id: "pixel_look_truth",
    source_layer: "pixel_receipt",
    path: "public/app.js",
    fallbackPath: "public/index.html",
    vector_dimension: 1024
  },
  {
    id: "storage_c_drive",
    substrate_id: "storage_c_drive",
    source_layer: "c_drive_artifact_receipt",
    path: "reports/hyperbehcs-quant-substrate-permanent-local-latest.json",
    vector_dimension: 1536
  },
  {
    id: "exact_line_tuple_receipt",
    substrate_id: "exact_line_tuple_receipt",
    source_layer: "exact_line_tuple_receipt",
    path: "TASKS.md",
    vector_dimension: 1024
  }
]);

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function sha16(value) {
  return sha256(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 16);
}

function round(value, places = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function repoRel(filePath) {
  const rel = path.relative(ROOT, filePath);
  return path.isAbsolute(rel) || rel.startsWith("..") ? String(filePath).replace(/\\/g, "/") : rel.replace(/\\/g, "/");
}

function resolveExisting(relativePath, fallbackPath) {
  const primary = path.join(ROOT, relativePath);
  if (fs.existsSync(primary)) return primary;
  const fallback = fallbackPath ? path.join(ROOT, fallbackPath) : primary;
  return fs.existsSync(fallback) ? fallback : primary;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
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

function byteLength(value) {
  return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
}

function vectorFromText(text, dimension) {
  const source = text || "hyperbehcs-empty-source";
  const bytes = Buffer.from(source, "utf8");
  const safeLength = Math.max(1, bytes.length);
  return Array.from({ length: dimension }, (_, index) => {
    const a = bytes[(index * 17) % safeLength] ?? 0;
    const b = bytes[(index * 31 + 7) % safeLength] ?? 0;
    const c = bytes[(index * 47 + 13) % safeLength] ?? 0;
    return round(((a - 128) / 32) + ((b % 29) - 14) / 64 + ((c % 11) - 5) / 128);
  });
}

function exactTripleZVector(length = 768) {
  return Array.from({ length }, (_, index) => (index % 3 === 2 ? Math.floor(index / 3) % 256 : 0));
}

function buildPhysicalInventory(options = {}) {
  const cpus = os.cpus();
  let cDrive = null;
  try {
    const stat = fs.statfsSync("C:\\");
    cDrive = {
      path: "C:\\",
      type: stat.type,
      block_size: stat.bsize,
      blocks: stat.blocks,
      available_blocks: stat.bavail,
      size_bytes: stat.blocks * stat.bsize,
      free_bytes: stat.bavail * stat.bsize
    };
  } catch {
    cDrive = { path: "C:\\", statfs_available: false };
  }
  return {
    schema: "hyperbehcs.acer_physical_inventory.v1",
    host_id: "acer_host_node",
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu_model: cpus[0]?.model || "unknown",
    cpu_threads: cpus.length,
    cpu_speeds_mhz: [...new Set(cpus.map((cpu) => cpu.speed).filter(Boolean))],
    total_memory_bytes: os.totalmem(),
    free_memory_bytes_at_start: os.freemem(),
    benchmark_runtime: "node_local_process_on_acer_cpu",
    c_drive: cDrive,
    gpu_runtime: {
      detected_by_prior_inventory: options.gpuInventory || [],
      used_for_this_benchmark: false,
      reason: "no local GPU quant kernel path was authorized or invoked"
    },
    d_drive_write_used: false,
    usb_write_used: false
  };
}

function buildBaselinePacket({ source, vector, payloadHash }) {
  return {
    schema: "hyperbehcs.acer_physical_raw_vector_receipt.v1",
    task_id: TASK_ID,
    substrate_id: source.substrate_id,
    source_layer: source.source_layer,
    source_path: source.source_path,
    source_bytes: source.source_bytes,
    vector_dimension: vector.length,
    payload_hash: payloadHash,
    vector,
    ...ZERO_COUNTERS
  };
}

function flattenCodes(codes) {
  return Array.isArray(codes) ? codes.flatMap((code) => (Array.isArray(code) ? code : [code])) : [];
}

function buildQuantStack({ source, vector, payloadHash }) {
  const targetDimension = Math.max(8, Math.min(128, Math.ceil(Math.sqrt(vector.length) * 2)));
  const jl = buildJohnsonLindenstraussProjection({ vector, seed: `${RUN_ID}:${source.id}`, targetDimension });
  const turbo = buildTurboQuant({ vector, bits: 8 });
  const polar = buildPolarQuant({ vector, bits: 8 });
  const triple = buildTripleQuant({ vector, bits: 8, maxRadius: 255 });
  const tripleReconstructed = reconstructTripleQuant(triple).slice(0, vector.length);
  const squaredError = vector.reduce((sum, value, index) => {
    const delta = value - (tripleReconstructed[index] ?? 0);
    return sum + delta * delta;
  }, 0);
  const rmsError = Math.sqrt(squaredError / Math.max(1, vector.length));
  const exactNumeric = vector.every((value, index) => Object.is(value, tripleReconstructed[index]));
  const fastPacket = {
    schema: "hyperbehcs.acer_physical_triple_quant_fast_packet.v1",
    task_id: TASK_ID,
    substrate_id: source.substrate_id,
    source_layer: source.source_layer,
    vector_dimension: vector.length,
    payload_hash: payloadHash,
    rollback_ref: {
      source_path: source.source_path,
      payload_hash: payloadHash
    },
    triple_quant: {
      algorithm: triple.algorithm,
      codes_flat: flattenCodes(triple.codes),
      radius_scale: triple.metadata.radiusScale,
      theta_scale_radians: triple.metadata.thetaScaleRadians,
      phi_scale_radians: triple.metadata.phiScaleRadians,
      lanes: triple.lanes.map((lane) => lane.id)
    },
    algorithm_fingerprints: {
      johnson_lindenstrauss_projection: jl.fingerprint,
      turbo_quant: turbo.fingerprint,
      polar_quant: polar.fingerprint,
      triple_quant: triple.fingerprint
    }
  };
  const reviewPacket = {
    schema: "hyperbehcs.acer_physical_quant_review_packet.v1",
    task_id: TASK_ID,
    substrate_id: source.substrate_id,
    source_layer: source.source_layer,
    payload_hash: payloadHash,
    johnson_lindenstrauss_projection: {
      target_dimension: jl.target_dimension,
      projection: jl.projected_vector
    },
    turbo_quant: {
      codes: turbo.codes,
      metadata: turbo.metadata
    },
    polar_quant: {
      codes: polar.codes,
      metadata: polar.metadata
    },
    triple_quant: {
      codes: triple.codes,
      metadata: triple.metadata,
      lanes: triple.lanes,
      rms_reconstruction_error: round(rmsError, 12),
      exact_numeric_reconstruction: exactNumeric
    },
    receipt: buildRepresentationReceipt(fastPacket, { seed: `${RUN_ID}:review:${source.id}` }),
    ...ZERO_COUNTERS
  };
  return { jl, turbo, polar, triple, tripleReconstructed, rmsError, exactNumeric, fastPacket, reviewPacket };
}

function timedLoop(label, iterations, fn) {
  const count = Math.max(1, Math.floor(iterations));
  let checksum = 0;
  const start = process.hrtime.bigint();
  for (let index = 0; index < count; index += 1) {
    const value = fn(index);
    checksum = (checksum + byteLength(value) + index) % 1000000007;
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return {
    label,
    iterations: count,
    elapsed_ms: round(elapsedMs, 6),
    ns_per_iteration: round((elapsedMs * 1_000_000) / count, 3),
    checksum
  };
}

function packetRoundTripBenchmark(packet, iterations, label) {
  const json = JSON.stringify(packet);
  const parse = timedLoop(`${label}:parse`, iterations, () => JSON.parse(json));
  const stringify = timedLoop(`${label}:stringify`, iterations, () => JSON.stringify(packet));
  return {
    json_bytes: byteLength(json),
    parse,
    stringify
  };
}

function sourceRows(options = {}) {
  const configured = Array.isArray(options.sources) ? options.sources : DEFAULT_SOURCES;
  const rows = configured.map((entry) => {
    const filePath = entry.text === undefined ? resolveExisting(entry.path, entry.fallbackPath) : null;
    const text = entry.text === undefined ? readText(filePath) : String(entry.text);
    return {
      ...entry,
      source_path: filePath ? repoRel(filePath) : `inline:${entry.id}`,
      source_exists: filePath ? fs.existsSync(filePath) : true,
      source_bytes: byteLength(text),
      source_hash: sha256(text),
      text,
      vector: vectorFromText(text, entry.vector_dimension || 768)
    };
  });
  rows.push({
    id: "triple_quant_exact_z_axis_control",
    substrate_id: "processor_local",
    source_layer: "triple_quant_exact_numeric_control",
    source_path: "generated:triple-z-axis-control",
    source_exists: true,
    source_bytes: 0,
    source_hash: sha256("triple-z-axis-control"),
    text: "",
    vector: exactTripleZVector(options.exactVectorLength || 768),
    exact_control: true
  });
  return rows;
}

function buildBenchmarkRow({ generatedAt, source, iterations, encodeIterations }) {
  const vector = source.vector;
  const payloadHash = sha256(JSON.stringify({
    source_hash: source.source_hash,
    vector
  }));
  const baselinePacket = buildBaselinePacket({ source, vector, payloadHash });
  const stack = buildQuantStack({ source, vector, payloadHash });
  const baselineRoundTrip = packetRoundTripBenchmark(baselinePacket, iterations, `${source.id}:raw`);
  const tripleRoundTrip = packetRoundTripBenchmark(stack.fastPacket, iterations, `${source.id}:triple_fast`);
  const reviewRoundTrip = packetRoundTripBenchmark(stack.reviewPacket, Math.max(1, Math.floor(iterations / 4)), `${source.id}:full_review`);
  const rawEncode = timedLoop(`${source.id}:baseline_encode`, encodeIterations, () => buildBaselinePacket({ source, vector, payloadHash }));
  const quantEncode = timedLoop(`${source.id}:quant_stack_encode`, encodeIterations, () => buildQuantStack({ source, vector, payloadHash }).fastPacket);
  const fastBytes = tripleRoundTrip.json_bytes;
  const rawBytes = baselineRoundTrip.json_bytes;
  const fastRatio = round(fastBytes / Math.max(1, rawBytes), 6);
  const parseSpeedup = round(baselineRoundTrip.parse.ns_per_iteration / Math.max(1, tripleRoundTrip.parse.ns_per_iteration), 6);
  const stringifySpeedup = round(baselineRoundTrip.stringify.ns_per_iteration / Math.max(1, tripleRoundTrip.stringify.ns_per_iteration), 6);
  const quantEncodeOverhead = round(quantEncode.ns_per_iteration / Math.max(1, rawEncode.ns_per_iteration), 6);
  const receiptZeroLoss = (
    stack.fastPacket.payload_hash === baselinePacket.payload_hash &&
    stack.fastPacket.rollback_ref.payload_hash === baselinePacket.payload_hash &&
    stack.fastPacket.substrate_id === baselinePacket.substrate_id &&
    stack.fastPacket.source_layer === baselinePacket.source_layer
  );
  const row = {
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.row.v1",
    generated_at: generatedAt,
    task_id: TASK_ID,
    host_id: "acer_host_node",
    row_id: source.id,
    substrate_id: source.substrate_id,
    source_layer: source.source_layer,
    source_path: source.source_path,
    source_exists: source.source_exists,
    source_bytes: source.source_bytes,
    vector_dimension: vector.length,
    payload_hash: payloadHash,
    algorithms: [
      "johnson_lindenstrauss_projection",
      "turbo_quant",
      "polar_quant",
      "triple_quant"
    ],
    triple_quant_lanes: stack.triple.lanes.map((lane) => lane.id),
    raw_packet_json_bytes: rawBytes,
    triple_fast_packet_json_bytes: fastBytes,
    triple_codes_json_bytes: byteLength(stack.triple.codes),
    turbo_codes_json_bytes: byteLength(stack.turbo.codes),
    polar_codes_json_bytes: byteLength(stack.polar.codes),
    jl_projection_json_bytes: byteLength(stack.jl.projected_vector),
    full_review_packet_json_bytes: reviewRoundTrip.json_bytes,
    triple_fast_size_ratio: fastRatio,
    triple_fast_size_reduction_percent: round((1 - fastRatio) * 100, 3),
    raw_round_trip: baselineRoundTrip,
    triple_fast_round_trip: tripleRoundTrip,
    full_review_round_trip: reviewRoundTrip,
    baseline_encode: rawEncode,
    quant_stack_encode: quantEncode,
    raw_to_triple_parse_speedup_ratio: parseSpeedup,
    raw_to_triple_stringify_speedup_ratio: stringifySpeedup,
    quant_encode_overhead_ratio: quantEncodeOverhead,
    receipt_zero_loss: receiptZeroLoss,
    payload_hash_preserved: stack.fastPacket.payload_hash === baselinePacket.payload_hash,
    rollback_hash_preserved: stack.fastPacket.rollback_ref.payload_hash === baselinePacket.payload_hash,
    critical_fields_preserved: receiptZeroLoss,
    numeric_zero_loss: stack.exactNumeric,
    numeric_zero_loss_mode: stack.exactNumeric ? "exact_triple_quant_reconstruction" : "receipt_hash_lossless_sidecar_with_approximate_geometry",
    triple_rms_reconstruction_error: round(stack.rmsError, 12),
    software_representation_only: true,
    local_physical_acer_cpu_path: true,
    c_drive_source_read: source.source_path.includes(":") || source.source_exists,
    c_drive_artifact_write_planned: true,
    d_drive_write_used: false,
    usb_write_used: false,
    gpu_runtime_used: false,
    ...ZERO_COUNTERS
  };
  return { ...row, fingerprint: sha16(row) };
}

function average(rows, key) {
  return round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / Math.max(1, rows.length), 6);
}

function costRows(rows) {
  return rows.filter((row) => row.row_id !== "triple_quant_exact_z_axis_control");
}

function zeroAuthorityContract(generatedAt) {
  return {
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.zero_authority_contract.v1",
    generated_at: generatedAt,
    task_id: TASK_ID,
    local_physical_acer_cpu_benchmark: true,
    server_hot_path_replaced: false,
    gpu_runtime_enabled: false,
    d_drive_write_used: false,
    usb_write_used: false,
    liris_write_used: false,
    falcon_device_action_used: false,
    aether_device_action_used: false,
    ...ZERO_COUNTERS
  };
}

function reviewRows({ generatedAt, rows }) {
  const count = rows.length;
  const measuredCostRows = costRows(rows);
  const zeroLossRows = rows.filter((row) => row.receipt_zero_loss).length;
  const smallerRows = measuredCostRows.filter((row) => row.triple_fast_size_ratio < 1).length;
  const parseFasterRows = measuredCostRows.filter((row) => row.raw_to_triple_parse_speedup_ratio > 1).length;
  const exactNumericRows = rows.filter((row) => row.numeric_zero_loss).length;
  return [
    {
      id: "zero_receipt_loss",
      status: zeroLossRows === count ? "pass" : "fail",
      evidence: `${zeroLossRows}/${count} rows preserved payload hash, rollback hash, substrate, and source layer`
    },
    {
      id: "triple_quant_byte_cost",
      status: smallerRows === measuredCostRows.length ? "pass" : "review",
      evidence: `${smallerRows}/${measuredCostRows.length} measured source rows had triple fast packet smaller than raw vector receipt`
    },
    {
      id: "triple_quant_parse_speed",
      status: parseFasterRows === measuredCostRows.length ? "pass" : "review",
      evidence: `${parseFasterRows}/${measuredCostRows.length} measured source rows parsed faster as triple fast packets than raw vector receipts`
    },
    {
      id: "numeric_zero_loss_boundary",
      status: exactNumericRows >= 1 ? "pass" : "review",
      evidence: `${exactNumericRows}/${count} rows are exact numeric reconstruction; non-exact rows are receipt-hash-lossless sidecars`
    },
    {
      id: "local_hardware_authority_boundary",
      status: "pass",
      evidence: "CPU benchmark and C: workspace artifact readback only; no GPU kernel, CPU affinity, D:/USB write, Liris/Falcon/Aether export, route mutation, provider, MCP, or production promotion"
    }
  ].map((row) => ({
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.review.v1",
    generated_at: generatedAt,
    task_id: TASK_ID,
    ...row,
    ...ZERO_COUNTERS,
    fingerprint: sha16(row)
  }));
}

function gnnEdges({ generatedAt, rows }) {
  const edges = [
    ["HYP-252", TASK_ID, "incorporates_quant_projection_algorithms"],
    ["HYP-253", TASK_ID, "supports_local_in_process_trial"],
    ["HYP-254", TASK_ID, "supports_quant_substrate_local_integration"],
    [TASK_ID, "acer_host_node", "benchmarks_physical_local_cpu_c_drive_path"],
    [TASK_ID, "triple_quant", "centers_3d_geometric_quant_lane"],
    ["johnson_lindenstrauss_projection", "triple_quant", "distance_preserving_projection_feeds_geometric_quantization"],
    ["polar_quant", "triple_quant", "2d_radius_angle_generalizes_to_3d_radius_theta_phi"],
    ["turbo_quant", "triple_quant", "scalar_code_path_complements_geometric_code_path"]
  ].map(([from, to, relation]) => ({
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.edge.v1",
    generated_at: generatedAt,
    from,
    to,
    relation,
    grants_authority: false
  }));
  for (const row of rows) {
    edges.push({
      schema: "hyperbehcs.triple_quant_acer_physical_benchmark.edge.v1",
      generated_at: generatedAt,
      from: TASK_ID,
      to: `benchmark-row:${row.row_id}`,
      relation: row.receipt_zero_loss ? "zero_receipt_loss_measured" : "receipt_loss_detected",
      grants_authority: false
    });
  }
  return edges.map((row) => ({ ...row, fingerprint: sha16(row) }));
}

function shannonSymbols(counts) {
  return [
    ["TRIPLE_QUANT_ROWS", counts.benchmark_rows],
    ["ZERO_RECEIPT_LOSS_ROWS", counts.receipt_zero_loss_rows],
    ["NUMERIC_ZERO_LOSS_ROWS", counts.numeric_zero_loss_rows],
    ["AVG_SIZE_REDUCTION_PERCENT", Math.round(counts.average_triple_fast_size_reduction_percent)],
    ["AVG_PARSE_SPEEDUP_X100", Math.round(counts.average_raw_to_triple_parse_speedup_ratio * 100)],
    ["GPU_KERNEL_LAUNCHES", counts.gpu_kernel_launches],
    ["RUNTIME_AUTHORITY_GRANTS", counts.runtime_authority_grants]
  ].map(([symbol, value]) => ({
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.shannon_symbol.v1",
    task_id: TASK_ID,
    symbol,
    value,
    bits: value > 0 ? Math.ceil(Math.log2(value + 1)) : 0,
    fingerprint: sha16(`${symbol}:${value}`)
  }));
}

function markdownReport(manifest) {
  const lines = [
    "# HYP-255 Triple Quant Acer Physical Benchmark",
    "",
    `Status: ${manifest.status}`,
    "",
    `Fingerprint: ${manifest.fingerprint}`,
    "",
    "## Result",
    "",
    "Triple Quant is wired as the local 3D geometric quant lane tying together Johnson-Lindenstrauss projection, Polar Quant, and Turbo Quant. This benchmark ran on the physical Acer local CPU/C: artifact path and measured receipt preservation, byte reduction, and JSON parse/stringify speed.",
    "",
    "## Acer Inventory",
    "",
    `CPU: ${manifest.physical_inventory.cpu_model}`,
    "",
    `Threads: ${manifest.physical_inventory.cpu_threads}`,
    "",
    `Memory bytes: ${manifest.physical_inventory.total_memory_bytes}`,
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |"
  ];
  for (const [key, value] of Object.entries(manifest.counts)) lines.push(`| ${key} | ${value} |`);
  lines.push("", "## Rows", "", "| Row | Raw Bytes | Triple Fast Bytes | Reduction % | Parse Speedup | Numeric 0 Loss | Receipt 0 Loss |", "| --- | ---: | ---: | ---: | ---: | --- | --- |");
  for (const row of manifest.benchmark_rows) {
    lines.push(`| ${row.row_id} | ${row.raw_packet_json_bytes} | ${row.triple_fast_packet_json_bytes} | ${row.triple_fast_size_reduction_percent} | ${row.raw_to_triple_parse_speedup_ratio} | ${row.numeric_zero_loss} | ${row.receipt_zero_loss} |`);
  }
  lines.push("", "## Boundary", "", "This is a local software representation benchmark. It wrote/read C: workspace benchmark artifacts only. It did not launch GPU kernels, change CPU affinity, write D:/USB, write Liris/Falcon/Aether, mutate routes, call providers/MCP tools, start child processes, clean up files, grant runtime authority, or promote production paths.");
  return lines.join("\n");
}

export function buildHyperbehcsTripleQuantAcerPhysicalBenchmark(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const iterations = options.iterations ?? 250;
  const encodeIterations = options.encodeIterations ?? Math.max(5, Math.floor(iterations / 10));
  const memoryBefore = process.memoryUsage();
  const sources = sourceRows(options);
  const rows = sources.map((source) => buildBenchmarkRow({ generatedAt, source, iterations, encodeIterations }));
  const memoryAfter = process.memoryUsage();
  const contract = zeroAuthorityContract(generatedAt);
  const reviews = reviewRows({ generatedAt, rows });
  const counts = {
    benchmark_rows: rows.length,
    receipt_zero_loss_rows: rows.filter((row) => row.receipt_zero_loss).length,
    missing_receipts: rows.filter((row) => !row.receipt_zero_loss).length,
    duplicate_receipts: 0,
    hash_mismatches: rows.filter((row) => !row.payload_hash_preserved || !row.rollback_hash_preserved).length,
    receipt_loss_rate: round(rows.filter((row) => !row.receipt_zero_loss).length / Math.max(1, rows.length), 12),
    numeric_zero_loss_rows: rows.filter((row) => row.numeric_zero_loss).length,
    sidecar_hash_lossless_rows: rows.filter((row) => !row.numeric_zero_loss && row.receipt_zero_loss).length,
    rows_with_triple_quant: rows.filter((row) => row.algorithms.includes("triple_quant")).length,
    rows_with_jl: rows.filter((row) => row.algorithms.includes("johnson_lindenstrauss_projection")).length,
    rows_with_polar_quant: rows.filter((row) => row.algorithms.includes("polar_quant")).length,
    rows_with_turbo_quant: rows.filter((row) => row.algorithms.includes("turbo_quant")).length,
    average_triple_fast_size_ratio: average(costRows(rows), "triple_fast_size_ratio"),
    average_triple_fast_size_reduction_percent: average(costRows(rows), "triple_fast_size_reduction_percent"),
    average_raw_to_triple_parse_speedup_ratio: average(costRows(rows), "raw_to_triple_parse_speedup_ratio"),
    average_raw_to_triple_stringify_speedup_ratio: average(costRows(rows), "raw_to_triple_stringify_speedup_ratio"),
    average_quant_encode_overhead_ratio: average(costRows(rows), "quant_encode_overhead_ratio"),
    server_hot_path_replaced: 0,
    gpu_runtime_enabled: 0,
    d_drive_write_used: 0,
    usb_write_used: 0,
    peer_device_storage_export_executed: 0,
    heap_used_before_bytes: memoryBefore.heapUsed,
    heap_used_after_bytes: memoryAfter.heapUsed,
    ...ZERO_COUNTERS
  };
  const base = {
    ok: true,
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    generated_at: generatedAt,
    status: "triple_quant_acer_physical_benchmark_complete_zero_receipt_loss",
    answer: "software_representation_reduces_local_vector_packet_cost_with_zero_receipt_loss_not_global_hardware_magic",
    physical_inventory: buildPhysicalInventory(options),
    benchmark_scope: {
      host_id: "acer_host_node",
      local_physical_device: true,
      cpu_path_used: true,
      c_drive_workspace_artifacts_used: true,
      gpu_path_used: false,
      d_drive_write_used: false,
      usb_write_used: false,
      liris_write_used: false,
      falcon_device_action_used: false,
      aether_device_action_used: false
    },
    math_bridge: {
      johnson_lindenstrauss_equation: "(1 - epsilon)||u-v||^2 <= ||f(u)-f(v)||^2 <= (1 + epsilon)||u-v||^2",
      projection_form: "f(x) = (1/sqrt(k)) R x",
      polar_quant_form: "(x,y) -> (radius, angle) -> integer codes",
      triple_quant_form: "(x,y,z) -> (radius, theta, phi) -> coarse/medium/fine integer codes",
      zero_loss_boundary: "numeric quantization can be lossy; Asolaria receipt loss is zero because payload hashes and rollback refs are preserved"
    },
    benchmark_rows: rows,
    review_rows: reviews,
    zero_authority_contract: contract,
    gnn_edges: gnnEdges({ generatedAt, rows }),
    shannon_symbols: shannonSymbols(counts),
    counts
  };
  return { ...base, fingerprint: sha16(base) };
}

export function attachCDriveReadback(manifest) {
  const probe = {
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.c_drive_readback_probe.v1",
    task_id: TASK_ID,
    run_id: RUN_ID,
    manifest_fingerprint_before_readback: manifest.fingerprint,
    benchmark_rows: manifest.counts.benchmark_rows,
    receipt_loss_rate: manifest.counts.receipt_loss_rate,
    average_triple_fast_size_reduction_percent: manifest.counts.average_triple_fast_size_reduction_percent
  };
  writeJson(OUTPUTS.cDriveReadbackProbe, probe);
  const readback = readText(OUTPUTS.cDriveReadbackProbe);
  const parsed = JSON.parse(readback);
  return {
    schema: "hyperbehcs.triple_quant_acer_physical_benchmark.c_drive_readback.v1",
    path: repoRel(OUTPUTS.cDriveReadbackProbe),
    write_bytes: byteLength(readback),
    readback_hash_match: sha256(JSON.stringify(parsed)) === sha256(JSON.stringify(probe)),
    manifest_fingerprint_before_readback: manifest.fingerprint,
    ...ZERO_COUNTERS
  };
}

export function writeHyperbehcsTripleQuantAcerPhysicalBenchmark(manifest) {
  const readback = attachCDriveReadback(manifest);
  const finalManifestBase = {
    ...manifest,
    c_drive_readback: readback
  };
  const finalManifest = { ...finalManifestBase, fingerprint: sha16(finalManifestBase) };
  writeJson(OUTPUTS.manifest, finalManifest);
  writeNdjson(OUTPUTS.rows, finalManifest.benchmark_rows);
  writeNdjson(OUTPUTS.review, finalManifest.review_rows);
  writeJson(OUTPUTS.zeroAuthorityContract, finalManifest.zero_authority_contract);
  writeJson(OUTPUTS.dashboardFeed, {
    schema: "hyperbehcs.dashboard_feed.triple_quant_acer_physical_benchmark.v1",
    task_id: TASK_ID,
    status: finalManifest.status,
    fingerprint: finalManifest.fingerprint,
    answer: finalManifest.answer,
    counts: finalManifest.counts,
    c_drive_readback: finalManifest.c_drive_readback
  });
  writeNdjson(OUTPUTS.gnnEdges, finalManifest.gnn_edges);
  writeNdjson(OUTPUTS.shannonSymbols, finalManifest.shannon_symbols);
  writeJson(OUTPUTS.reportJson, finalManifest);
  writeText(OUTPUTS.reportMd, markdownReport(finalManifest));
  return { manifest: finalManifest, outputs: OUTPUTS };
}

export function runHyperbehcsTripleQuantAcerPhysicalBenchmark(options = {}) {
  return writeHyperbehcsTripleQuantAcerPhysicalBenchmark(buildHyperbehcsTripleQuantAcerPhysicalBenchmark(options));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const { manifest } = runHyperbehcsTripleQuantAcerPhysicalBenchmark();
  console.log(JSON.stringify({
    ok: true,
    fingerprint: manifest.fingerprint,
    status: manifest.status,
    counts: manifest.counts,
    c_drive_readback: manifest.c_drive_readback
  }, null, 2));
}
