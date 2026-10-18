"use strict";

const fs = require("fs");

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

const DEFAULT_POLICY = Object.freeze({
  min_size_reduction_percent: 1,
  min_parse_speedup_ratio: 1,
  require_receipt_zero_loss: true,
  require_triple_quant: true,
  allow_live_hot_path_replacement: false,
  allow_gpu_runtime: false,
  allow_external_export: false
});

function round(value, places = 6) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** places;
  return Math.round(number * factor) / factor;
}

function rowsFromReport(report = {}) {
  return Array.isArray(report.benchmark_rows) ? report.benchmark_rows : [];
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function evaluateRow(row = {}, policy = DEFAULT_POLICY) {
  const reasons = [];
  const hasTripleQuant = Array.isArray(row.algorithms) && row.algorithms.includes("triple_quant");
  if (policy.require_receipt_zero_loss && row.receipt_zero_loss !== true) reasons.push("receipt_zero_loss_required");
  if (policy.require_triple_quant && !hasTripleQuant) reasons.push("triple_quant_required");
  if (Number(row.triple_fast_size_reduction_percent || 0) < policy.min_size_reduction_percent) reasons.push("size_reduction_below_policy");
  if (Number(row.raw_to_triple_parse_speedup_ratio || 0) < policy.min_parse_speedup_ratio) reasons.push("parse_speedup_below_policy");
  if (row.gpu_runtime_used === true) reasons.push("gpu_runtime_not_allowed");
  if (row.d_drive_write_used === true || row.usb_write_used === true) reasons.push("external_storage_write_not_allowed");
  return {
    accepted: reasons.length === 0,
    reasons
  };
}

function consumerRow(row = {}, policy = DEFAULT_POLICY) {
  const evaluation = evaluateRow(row, policy);
  const packet = {
    schema: "hyperbehcs.triple_quant_fast_packet_consumer.row.v1",
    row_id: row.row_id,
    substrate_id: row.substrate_id,
    source_layer: row.source_layer,
    source_path: row.source_path,
    payload_hash: row.payload_hash,
    benchmark_fingerprint: row.fingerprint || null,
    vector_dimension: Number(row.vector_dimension || 0),
    triple_quant_lanes: Array.isArray(row.triple_quant_lanes) ? row.triple_quant_lanes : [],
    raw_packet_json_bytes: Number(row.raw_packet_json_bytes || 0),
    triple_fast_packet_json_bytes: Number(row.triple_fast_packet_json_bytes || 0),
    triple_fast_size_reduction_percent: round(row.triple_fast_size_reduction_percent),
    raw_to_triple_parse_speedup_ratio: round(row.raw_to_triple_parse_speedup_ratio),
    raw_to_triple_stringify_speedup_ratio: round(row.raw_to_triple_stringify_speedup_ratio),
    receipt_zero_loss: row.receipt_zero_loss === true,
    numeric_zero_loss: row.numeric_zero_loss === true,
    numeric_zero_loss_mode: row.numeric_zero_loss_mode || "unknown",
    consumer_decision: evaluation.accepted ? "accepted_read_only_fast_packet" : "rejected_for_fast_packet",
    rejection_reasons: evaluation.reasons,
    read_only_consumer: true,
    live_hot_path_replacement: false,
    gpu_runtime_used: false,
    external_export_used: false,
    ...ZERO_COUNTERS
  };
  return packet;
}

function average(rows, key) {
  if (!rows.length) return 0;
  return round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length);
}

function buildTripleQuantFastPacketConsumerStatus(report = {}, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const generatedAt = options.generatedAt || new Date().toISOString();
  const rows = rowsFromReport(report).map((row) => consumerRow(row, policy));
  const accepted = rows.filter((row) => row.consumer_decision === "accepted_read_only_fast_packet");
  const rejected = rows.filter((row) => row.consumer_decision === "rejected_for_fast_packet");
  const counts = {
    source_benchmark_rows: rows.length,
    accepted_fast_packet_rows: accepted.length,
    rejected_rows: rejected.length,
    accepted_receipt_zero_loss_rows: accepted.filter((row) => row.receipt_zero_loss).length,
    accepted_numeric_zero_loss_rows: accepted.filter((row) => row.numeric_zero_loss).length,
    accepted_hash_lossless_sidecar_rows: accepted.filter((row) => row.receipt_zero_loss && !row.numeric_zero_loss).length,
    average_accepted_size_reduction_percent: average(accepted, "triple_fast_size_reduction_percent"),
    average_accepted_parse_speedup_ratio: average(accepted, "raw_to_triple_parse_speedup_ratio"),
    average_accepted_stringify_speedup_ratio: average(accepted, "raw_to_triple_stringify_speedup_ratio"),
    server_hot_path_replaced: 0,
    gpu_runtime_enabled: 0,
    external_exports_used: 0,
    ...ZERO_COUNTERS
  };
  const ok = accepted.length > 0 && accepted.every((row) => row.receipt_zero_loss);
  return {
    ok,
    schema: "hyperbehcs.triple_quant_fast_packet_consumer.status.v1",
    generated_at: generatedAt,
    source_task_id: report.task_id || "HYP-255",
    source_fingerprint: report.fingerprint || null,
    source_status: report.status || null,
    policy,
    status: ok ? "read_only_fast_packet_consumer_ready" : "read_only_fast_packet_consumer_blocked",
    accepted_rows: accepted,
    rejected_rows: rejected,
    counts,
    boundary: {
      read_only_consumer: true,
      live_hot_path_replacement: false,
      gpu_runtime_enabled: false,
      d_drive_write_used: false,
      usb_write_used: false,
      liris_write_used: false,
      falcon_device_action_used: false,
      aether_device_action_used: false,
      ...ZERO_COUNTERS
    }
  };
}

function loadTripleQuantFastPacketConsumerStatus(filePath, options = {}) {
  return buildTripleQuantFastPacketConsumerStatus(loadJson(filePath), options);
}

module.exports = {
  ZERO_COUNTERS,
  DEFAULT_POLICY,
  evaluateRow,
  consumerRow,
  buildTripleQuantFastPacketConsumerStatus,
  loadTripleQuantFastPacketConsumerStatus
};
