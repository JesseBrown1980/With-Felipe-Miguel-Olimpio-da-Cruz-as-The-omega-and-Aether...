"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");

(async () => {
  const mod = await import(pathToFileURL(path.join(root, "tools", "behcs", "hyperbehcs-triple-quant-acer-physical-benchmark.mjs")).href);
  const manifest = mod.buildHyperbehcsTripleQuantAcerPhysicalBenchmark({
    generatedAt: "2026-05-15T00:00:00.000Z",
    iterations: 2,
    encodeIterations: 1,
    exactVectorLength: 96,
    sources: [
      {
        id: "processor_local",
        substrate_id: "processor_local",
        source_layer: "acer_cpu_cache_receipt",
        text: "processor local triple quant benchmark fixture ".repeat(128),
        vector_dimension: 96
      },
      {
        id: "leworld_world_model",
        substrate_id: "leworld_world_model",
        source_layer: "leworld_world_model_receipt",
        text: "leworld world model vector fixture ".repeat(128),
        vector_dimension: 96
      }
    ]
  });

  assert.equal(manifest.ok, true);
  assert.equal(manifest.schema, "hyperbehcs.triple_quant_acer_physical_benchmark.v1");
  assert.equal(manifest.task_id, "HYP-255");
  assert.equal(manifest.benchmark_scope.local_physical_device, true);
  assert.equal(manifest.benchmark_scope.cpu_path_used, true);
  assert.equal(manifest.benchmark_scope.gpu_path_used, false);
  assert.equal(manifest.counts.benchmark_rows, 3);
  assert.equal(manifest.counts.rows_with_triple_quant, 3);
  assert.equal(manifest.counts.rows_with_jl, 3);
  assert.equal(manifest.counts.rows_with_polar_quant, 3);
  assert.equal(manifest.counts.rows_with_turbo_quant, 3);
  assert.equal(manifest.counts.receipt_zero_loss_rows, 3);
  assert.equal(manifest.counts.missing_receipts, 0);
  assert.equal(manifest.counts.duplicate_receipts, 0);
  assert.equal(manifest.counts.hash_mismatches, 0);
  assert.equal(manifest.counts.receipt_loss_rate, 0);
  assert.ok(manifest.counts.numeric_zero_loss_rows >= 1);
  assert.ok(manifest.counts.sidecar_hash_lossless_rows >= 1);
  assert.ok(manifest.counts.average_triple_fast_size_ratio > 0);
  assert.ok(manifest.counts.average_triple_fast_size_reduction_percent > 0);
  assert.match(manifest.math_bridge.johnson_lindenstrauss_equation, /\|\|u-v\|\|\^2/);
  assert.match(manifest.math_bridge.triple_quant_form, /radius, theta, phi/);

  const exact = manifest.benchmark_rows.find((row) => row.row_id === "triple_quant_exact_z_axis_control");
  assert.ok(exact);
  assert.equal(exact.numeric_zero_loss, true);
  assert.equal(exact.receipt_zero_loss, true);

  for (const row of manifest.benchmark_rows) {
    assert.equal(row.receipt_zero_loss, true);
    assert.equal(row.payload_hash_preserved, true);
    assert.equal(row.rollback_hash_preserved, true);
    assert.ok(row.raw_round_trip.parse.elapsed_ms >= 0);
    assert.ok(row.triple_fast_round_trip.parse.elapsed_ms >= 0);
  }
  for (const row of manifest.benchmark_rows.filter((entry) => entry.row_id !== "triple_quant_exact_z_axis_control")) {
    assert.ok(row.triple_fast_packet_json_bytes < row.raw_packet_json_bytes);
  }

  assert.ok(manifest.review_rows.some((row) => row.id === "zero_receipt_loss" && row.status === "pass"));
  assert.ok(manifest.gnn_edges.some((row) => row.from === "johnson_lindenstrauss_projection" && row.to === "triple_quant"));
  assert.ok(manifest.gnn_edges.every((row) => row.grants_authority === false));

  for (const key of [
    "hardware_mutations",
    "cpu_affinity_changes",
    "gpu_kernel_launches",
    "gpu_driver_mutations",
    "remote_writes",
    "adb_actions",
    "scrcpy_actions",
    "device_file_writes",
    "route_mutations",
    "provider_calls",
    "mcp_tool_calls",
    "process_starts",
    "executor_executions",
    "cleanup_actions",
    "runtime_authority_grants",
    "production_promotions"
  ]) {
    assert.equal(manifest.counts[key], 0, `${key} must stay zero`);
    assert.equal(manifest.zero_authority_contract[key], 0, `${key} contract must stay zero`);
  }

  console.log(JSON.stringify({ ok: true, test: "hyperbehcs-triple-quant-acer-physical-benchmark" }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
