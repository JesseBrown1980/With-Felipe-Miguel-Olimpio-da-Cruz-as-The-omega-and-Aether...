"use strict";

const {
  buildJohnsonLindenstraussProjection,
  buildTurboQuant,
  buildPolarQuant,
  buildTripleQuant,
  buildRepresentationReceipt,
  buildRepresentationAlgorithmCatalog
} = require("./hyperbehcsRepresentationAlgorithms");

const FEATURE_FLAG = "ASOLARIA_HYPERBEHCS_QUANT_RECEIPTS_ENABLED";

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

const DEFAULT_SUBSTRATES = Object.freeze([
  {
    id: "pixel_look_truth",
    kind: "pixel_receipt",
    algorithms: ["turbo_quant", "polar_quant"],
    readiness: "ready_for_descriptor_receipts"
  },
  {
    id: "leworld_world_model",
    kind: "world_model_receipt",
    algorithms: ["johnson_lindenstrauss_projection", "triple_quant"],
    readiness: "ready_for_descriptor_receipts"
  },
  {
    id: "backend_state_receipt",
    kind: "backend_receipt",
    algorithms: ["turbo_quant", "triple_quant"],
    readiness: "ready_for_descriptor_receipts"
  },
  {
    id: "exact_line_tuple_receipt",
    kind: "tuple_receipt",
    algorithms: ["turbo_quant"],
    readiness: "ready_for_descriptor_receipts"
  },
  {
    id: "processor_local",
    kind: "processor",
    algorithms: ["johnson_lindenstrauss_projection", "turbo_quant", "polar_quant", "triple_quant"],
    readiness: "ready_for_local_in_process_receipts"
  },
  {
    id: "gpu_local",
    kind: "gpu",
    algorithms: ["johnson_lindenstrauss_projection", "turbo_quant"],
    readiness: "planning_only_until_gpu_benchmark_and_kernel_authority"
  },
  {
    id: "storage_c_drive",
    kind: "storage",
    algorithms: ["turbo_quant"],
    readiness: "ready_for_repo_artifact_receipts"
  },
  {
    id: "storage_d_drive",
    kind: "storage",
    algorithms: ["turbo_quant"],
    readiness: "target_observed_export_requires_explicit_write_and_hash_readback"
  },
  {
    id: "usb_sovlinux",
    kind: "usb",
    algorithms: ["turbo_quant"],
    readiness: "target_observed_export_requires_explicit_write_and_hash_readback"
  },
  {
    id: "liris_peer_node",
    kind: "peer_node",
    algorithms: ["turbo_quant"],
    readiness: "receipt_target_only_no_remote_write"
  },
  {
    id: "falcon_mobile_node",
    kind: "mobile_node",
    algorithms: ["turbo_quant"],
    readiness: "receipt_target_only_no_adb_no_shell_no_scrcpy"
  },
  {
    id: "aether_mobile_node",
    kind: "mobile_node",
    algorithms: ["turbo_quant"],
    readiness: "receipt_target_only_no_device_write"
  }
]);

function isEnabled(env = process.env) {
  return String(env[FEATURE_FLAG] || "").trim() === "1";
}

function normalizeVector(values) {
  if (Array.isArray(values)) return values.map((value) => Number(value) || 0);
  if (values && Array.isArray(values.vector)) return values.vector.map((value) => Number(value) || 0);
  if (values && Array.isArray(values.values)) return values.values.map((value) => Number(value) || 0);
  return [];
}

function buildQuantizedSubstrateReceipt(input = {}, options = {}) {
  const substrateId = String(input.substrate_id || input.substrateId || options.substrateId || "pixel_look_truth");
  const vector = normalizeVector(input);
  const seed = String(input.seed || options.seed || substrateId);
  const targetDimension = Number(input.targetDimension || options.targetDimension || Math.max(1, Math.min(24, Math.ceil(Math.log2(vector.length + 2) * 4))));
  const algorithms = {
    johnson_lindenstrauss_projection: buildJohnsonLindenstraussProjection({ vector, seed, targetDimension }),
    turbo_quant: buildTurboQuant({ vector, levels: input.levels || options.levels || 256 }),
    polar_quant: buildPolarQuant({ vector, bits: input.bits || options.bits || 8 }),
    triple_quant: buildTripleQuant({ vector, bits: input.bits || options.bits || 8 })
  };
  const receipt = {
    schema: "hyperbehcs.quantized_substrate_receipt.v1",
    substrate_id: substrateId,
    source_layer: String(input.source_layer || input.sourceLayer || substrateId),
    vector_dimension: vector.length,
    target_dimension: targetDimension,
    algorithms,
    descriptor_only: true,
    software_receipt_only: true,
    asolaria_os_receipt: true,
    leworld_model_receipt: substrateId.includes("leworld") || String(input.source_layer || "").includes("world"),
    pixel_receipt: substrateId.includes("pixel") || String(input.source_layer || "").includes("pixel"),
    ...ZERO_COUNTERS
  };
  return {
    ...receipt,
    receipt: buildRepresentationReceipt(receipt, { seed })
  };
}

function buildQuantSubstrateStatus(options = {}) {
  const env = options.env || process.env;
  const inventory = options.inventory || {};
  return {
    ok: true,
    schema: "hyperbehcs.quant_substrate.status.v1",
    feature_flag: FEATURE_FLAG,
    enabled: isEnabled(env),
    installed_locally: true,
    integration_style: "Asolaria OS receipt substrate, not standalone JS runtime claim",
    substrates: DEFAULT_SUBSTRATES,
    observed_local_substrates: {
      processors: inventory.processors || [],
      gpus: inventory.gpus || [],
      drives: inventory.drives || [],
      usb: inventory.usb || []
    },
    ready_now: [
      "pixel_look_truth",
      "leworld_world_model",
      "backend_state_receipt",
      "exact_line_tuple_receipt",
      "processor_local",
      "storage_c_drive"
    ],
    gated: [
      "gpu_local",
      "storage_d_drive",
      "usb_sovlinux",
      "liris_peer_node",
      "falcon_mobile_node",
      "aether_mobile_node"
    ],
    ...ZERO_COUNTERS
  };
}

function buildQuantRolloutManifest(options = {}) {
  const status = buildQuantSubstrateStatus(options);
  const catalog = buildRepresentationAlgorithmCatalog({ seed: "hyperbehcs-quant-substrate" });
  return {
    ok: true,
    schema: "hyperbehcs.quant_substrate.rollout_manifest.v1",
    status,
    catalog,
    rollout_readiness: Object.fromEntries(status.substrates.map((substrate) => [substrate.id, substrate.readiness])),
    permanent_local_integration: true,
    instant_whole_computer_improvement_claim: false,
    next_required_gates: [
      "route_honesty_before_live_api",
      "distance_preservation_benchmark",
      "quantization_fidelity_thresholds",
      "gpu_kernel_benchmark_before_gpu_runtime",
      "explicit_d_drive_usb_write_authority_before_export",
      "explicit_liris_falcon_aether_authority_before_peer_or_device_export",
      "rollback_and_hash_readback"
    ],
    ...ZERO_COUNTERS
  };
}

module.exports = {
  FEATURE_FLAG,
  ZERO_COUNTERS,
  DEFAULT_SUBSTRATES,
  isEnabled,
  buildQuantizedSubstrateReceipt,
  buildQuantSubstrateStatus,
  buildQuantRolloutManifest
};
