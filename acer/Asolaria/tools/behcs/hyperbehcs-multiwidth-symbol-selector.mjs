#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const VERSION = "HYPERBEHCS_MULTIWIDTH_SYMBOL_SELECTOR_v0";
const DEFAULT_RUN = "hyperbehcs-multiwidth-symbol-selector-20260517";
const DEFAULT_OUT = path.join(ROOT, "data", "behcs", "multiwidth-symbol-selector", DEFAULT_RUN);
const DEFAULT_REPORT = path.join(ROOT, "reports", "hyperbehcs-multiwidth-symbol-selector-latest.md");

const SOURCE_DEFS = Object.freeze([
  ["alphabet1024", "atlas", "C:/HyperBEHCS/store/alphabet-1024.hbp", "base=1024", "canonical_width=6", "cp_count=1024"],
  ["atlas1024", "atlas", "C:/HyperBEHCS/store/atlas-canonical-1024.hbp", "cp_count=1024", "lane=legacy", "merged_from=atlas-index-1024.hbp+alphabet-1024.hbp"],
  ["atlas1024quant", "quant", "C:/HyperBEHCS/store/atlas-canonical-1024-quant-extended.hbp", "cp_count=1024", "primary_quant=", "band="],
  ["priority", "selector", "C:/HyperBEHCS/store/priority-matrix-2026-05-17.hbp", "triple_quant=front/status/gate", "turbo_quant=byte_min", "priority_tuple"],
  ["planbCryptoMd", "crypto", "reports/planb-crypto-capsule-behcs1024-authority-20260514.md", "BEHCS-2048 role", "optional extended proof/glyph expansion", "SHAKE256-2048 available: true"],
  ["fabricLanguage", "typed_lane", "reports/Fabric-Language-V1-Shadow-2026-04-03.md", "lane=<typed-lane>", "typed_lane_registry", "proof_ledger"],
  ["hyperRuntimeReadme", "binary_runtime", "C:/HyperBEHCS/README.md", "central binary store", "Hilbert location", "Triple Quant"],
  ["hyperRuntimeCli", "binary_runtime", "C:/HyperBEHCS/bin/hyperbehcs.js", "hybrid binary envelope", "substrate-pack", "central binary store"],
  ["asolariaOsGo", "os_go", "data/behcs/asolaria-os-go/asolaria-os-metal-hyperbehcs-go-20260516/asolaria-os-go.hbp", "quant_triple_quant_turbo_polar_js_quant", "three_lane_fast_packet_receipts", "cube_cube_cubed"],
  ["remakePlan", "plan", "plans/BEHCS-1024-REMAKE-GITHUB-200-STEP-IMPROVEMENT-PLAN.md", "HYP-261", "/api/hyperbehcs/triple-quant/fast-packets/query", "hot-path reads/writes"],
  ["superDashboardMaps", "dashboard", "reports/super-asolaria-dashboard-tabs-deep-scan-latest.md", "/api/map-map-mapped", "MAP-MAP-MAPPED RECURSION", "/api/cube-cube-cubed"],
  ["crypto2048", "crypto", "src/behcs/planbCryptoCapsuleVerifier.js", "policy_shake256_1024", "policy_shake256_2048", "shake256"],
  ["quantSubstrate", "quant", "src/behcs/hyperbehcsQuantSubstrate.js", "triple_quant", "turbo_quant", "polar_quant"],
  ["tripleBenchmark", "quant", "reports/hyperbehcs-triple-quant-acer-physical-benchmark-latest.md", "receipt_loss_rate | 0", "average_triple_fast_size_reduction_percent", "61.235333"],
  ["indexLanguage", "language", "reports/index-language-compression-profile-latest.md", "emit_compact_tuple_language_first_then_hydrate_authorized_pointer_rows", "12.45:1", "target met"],
  ["indexKernelRule", "language", "src/indexLanguageProfile.js", "compact_tuple_language_first_full_payload_hydration_second", "tuple_select_then_hash_hydrate", "kernel_rule"],
  ["gemmaLocalTuple", "brain", "reports/gemma-local-tuple-processor-proof-latest.md", "hybrid_pixel_backend_leworld_tuple_observed", "tuple parse success", "No provider/MCP call"],
  ["gemmaCachedProducer", "brain", "data/behcs/local-models/gemma-4b-cached-producer-batch-hyp264-20260516/gemma-4b-cached-producer-batch.hbp", "GB1|M|I|R|T|P|S|A", "fo=0", "mc=0"],
  ["gemmaColdPid", "brain", "reports/gemma-cold-weight-pid-inversion-latest.md", "cold local cognition substrate", "One Gemma instance per N microkernels", "No model boot"],
  ["gemmaMicrokernelRatio", "brain", "reports/gemma-microkernel-ratio-benchmark-latest.md", "best ratio by latency", "2", "Boundary"],
  ["gemmaParallelCapacity", "brain", "reports/gemma-parallel-capacity-smoke-latest.md", "best concurrency by throughput", "2", "Boundary"],
  ["hrmRuntimeGate", "hrm", "reports/hyperbehcs-hrm-runtime-readiness-gate-latest.md", "blocked_runtime_dependencies_not_ready", "gates_blocked", "model_execution_allowed"],
  ["omniquantLocal", "quant", "reports/hyperbehcs-quant-substrate-permanent-local-latest.md", "quant_substrate_integrated_locally_receipts_ready_rollout_gated", "storage_c_drive", "usb_sovlinux_export"],
  ["hermesMap", "map", "src/behcs/originalHermesTransportRouter.js", "map_map_mapped", "hookwall", "providers+workers+engines"],
  ["hermesCube", "cube", "src/behcs/originalHermesRuntimeIndex.js", "cube_cubed", "supervisor_of_supervisors", "surface_digest_map"],
  ["omniSupervisor", "map_cube", "src/omnispindleSupervisorRunner.js", "MAP_MAP_MAPPED", "CUBE_CUBE_CUBED", "map_map_mapped_indexer"],
  ["colonyResearch", "research", "reports/colony-convergence-research-latest.md", "numbered index table", "index numbers instead of the whole tool list", "MCP is the right retrieval/access layer"],
  ["shannonGnn", "research", "reports/deep-wave-plan-slice-shannon-gnn-trinity-20260415.md", "Omnishannon and GNN belong inside", "bounded overlays", "Do not claim boot/storage promotion"],
  ["sovlinuxPreflight", "usb", "reports/hyperbehcs-sovlinux-write-gate-preflight-latest.md", "failed_gates=1", "target_identity_pass=1", "physical_write=0"]
]);

const ABSORPTION_SOURCES = Object.freeze([
  ["mistake_ledger", "mistakes", "data/mistake-ledger.ndjson", "dedup_then_pointer_index"],
  ["mistake_patterns", "mistakes", "data/mistake-patterns.json", "pattern_to_tuple_refs"],
  ["skills_tools_index", "tools_skills", "data/skills-tools-index.json", "tuple_language_profile_source"],
  ["agent_index_catalogs", "catalogs", "data/agent-index", "catalog_pointer_rows"],
  ["memory_cube_index", "cubes", "data/behcs/memory-cube-index.json", "cube_pointer_seed"],
  ["work_of_jesse_cube", "cubes", "data/work-of-jesse-cube.json", "old_cube_pointer_seed"],
  ["planb_genius_evidence", "genius", "reports/planb-genius-pdf-evidence-20260514.md", "lane_scored_sha16_rows"],
  ["planb_genius_absorption", "genius", "reports/planb-genius-sota-absorption-plan-20260514.md", "supervisor_absorption_rules"],
  ["capture_prism_genius", "genius", "data/behcs/capture-prism-repo/marks/genius/genius-latest.jsonl", "mark_rows_pointer_only"],
  ["capture_prism_mistakes", "mistakes", "data/behcs/capture-prism-repo/marks/mistakes/mistakes-latest.jsonl", "mark_rows_pointer_only"],
  ["omniflywheel_100m_genius", "genius", "data/behcs/claude-omniflywheel/100m-sweep/genius-marks-latest.ndjson", "massive_sweep_pointer_only"],
  ["omniflywheel_100m_mistakes", "mistakes", "data/behcs/claude-omniflywheel/100m-sweep/mistake-marks-latest.ndjson", "massive_sweep_pointer_only"],
  ["build_prep_index", "hbp_index", "data/behcs/build-prep-index/hyperbehcs-build-prep-index-20260516/hyperbehcs-build-prep-index.hbp", "already_hot_packeted"]
]);

const LANES = Object.freeze([
  ["glyph_atlas_1024", "language_symbols", "1024_codepoints", "ready", "agent_terms_yool_tuple_symbol_catalog", "alphabet1024+atlas1024", "use_as_current_concrete_symbol_bank"],
  ["crypto_shake_1024", "proof", "1024_bits", "ready", "capability_policy_receipts_medium_high_assurance", "crypto2048", "use_for_policy_proof_material_when_sha256_is_too_small"],
  ["crypto_shake_2048", "proof", "2048_bits", "ready", "capability_policy_receipts_high_assurance_cosign", "crypto2048", "use_for_expanded_proof_width_not_as_glyph_atlas_claim"],
  ["symbol_atlas_2048_candidate", "language_symbols", "2048_codepoints", "candidate", "optional_extended_proof_glyph_expansion_for_archival_and_high_dimensional_routing", "planbCryptoMd+crypto2048", "do_not_promote_until_atlas_manifest_receipt_exists"],
  ["hybrid_binary_envelope", "transport", "bit_byte", "ready", "sector_microkernel_packet_bitpacking_and_substrate_store", "hyperRuntimeReadme+hyperRuntimeCli+sovlinuxPreflight", "use_for_on_metal_and_raw_readback_bytes"],
  ["hex_transport", "transport", "nybble_hex", "ready", "sha_receipts_debug_mirror_readback", "sovlinuxPreflight", "use_as_lossless_mirror_for_packets_and_sector_receipts"],
  ["tuple_language", "routing", "small_subdivided_8_to_13_line_pages", "ready", "skills_tools_yools_pointer_rows_reusable_atoms", "indexLanguage+indexKernelRule", "emit_small_tuple_pages_target_8_max_13_then_hydrate_only_after_hash_and_authority"],
  ["gemma4b_active_brain_candidate", "local_brain", "gemma4b_tuple_microcall", "ready", "active_brain_candidate_with_cached_tuple_producer_pid_receipts", "gemmaLocalTuple+gemmaCachedProducer+gemmaColdPid+gemmaMicrokernelRatio+gemmaParallelCapacity", "stage_to_sovlinux_as_pointer_rows_and_benchmark_before_runtime_claim"],
  ["hrm_reasoning_module", "reasoning_module", "d_drive_hrm_descriptor", "blocked", "hrm_rooms_absorbed_but_runtime_dependencies_not_ready", "hrmRuntimeGate", "stage_source_and_gate_receipts_to_sovlinux_no_execution"],
  ["omniquant_c_drive_engine", "quant_engine", "c_drive_local_receipts", "ready", "omniquant_c_drive_quant_substrate_and_triple_quant_receipts", "omniquantLocal+quantSubstrate+tripleBenchmark", "move_receipt_substrate_to_sovlinux_after_usb_readback_gate"],
  ["triple_quant", "numeric_signal", "coarse_medium_fine", "ready", "pixel_leworld_backend_state_exact_line_receipts", "quantSubstrate+tripleBenchmark+priority", "use_for_signal_compression_with_receipt_zero_loss"],
  ["map_map_mapped", "authority", "authority_chain_levels", "ready", "who_can_route_or_promote", "hermesMap+omniSupervisor", "attach_authority_level_before_execution"],
  ["cube_cube_cubed", "storage", "recursive_catalog_cells", "ready", "catalog_storage_room_pointer_index", "hermesCube+omniSupervisor", "store_catalog_information_as_pointer_cells"],
  ["mcp_webmcp_edge", "edge_access", "snapshot_surface", "edge_only", "dashboard_tool_bridge_retrieval", "colonyResearch+superDashboardMaps", "keep_out_of_inner_loop_except_snapshot_boundary"],
  ["sovlinux_append_safe", "usb_write_gate", "append_driver", "blocked", "first_physical_usb_hot_packet", "sovlinuxPreflight", "requires_append_safe_plan_before_any_media_write"]
  ,["old_cube_absorption", "bulk_knowledge", "millions_pointer_index", "ready", "mistakes_tools_genius_previous_cubes_absorbed_as_sha_pointer_rows", "absorption_sources", "dedup_hash_quant_rank_then_supervisor_promote"]
]);

const RULES = Object.freeze([
  ["R0", "single_alphabet_reduction", "forbidden", "selector_must_choose_lane_by_job_not_flatten_to_one_width"],
  ["R1", "current_symbol_bank", "1024", "1024_glyph_atlas_is_current_concrete_language_symbol_bank"],
  ["R2", "2048_status", "proof_ready_symbol_candidate", "2048_is_saved_as_extended_proof_glyph_role_for_archival_high_dimensional_routing_but_symbol_atlas_needs_manifest_benchmark_and_review"],
  ["R3", "binary_hex", "always_lossless_mirrors", "binary_serves_on_metal_bytes_hex_serves_receipts_and_readback"],
  ["R4", "quant", "receipt_bound", "triple_quant_routes_signal_numeric_payloads_only_with_receipt_zero_loss_or_hash_sidecar"],
  ["R5", "tuple_yool", "inner_loop", "tuple_addresses_yool_atoms_skills_tools_agent_terms_and_authority_refs"],
  ["R6", "map_cube", "attach_not_replace", "map_map_mapped_and_cube_cube_cubed_attach_authority_and_storage_refs_to_base_tuple"],
  ["R7", "mcp", "edge_snapshot", "mcp_webmcp_is_outer_retrieval_dashboard_surface_not_per_loop_hot_path"],
  ["R8", "sovlinux", "write_blocked", "usb_media_write_waits_for_append_safe_driver_rollback_and_sha_readback"],
  ["R9", "promotion", "benchmark_required", "new_width_or_geometry_promotes_only_with_hbp_hbi_sha_hex_receipts_and_rollback"]
  ,["R10", "old_cube_absorption", "pointer_only_first", "millions_of_old_mistakes_tools_genius_cubes_enter_as_hash_pointer_rows_then_quant_ranked_promotion_not_bulk_hot_payload"],
  ["R11", "catalog_page_geometry", "small_recursive_pages", "old_47_cube_catalog_floor_splits_into_brown_hilbert_pages_target_8_max_13_lines"]
  ,["R12", "brain_quant_staging", "pointer_stage_first", "gemma4b_hrm_omniquant_move_to_sovlinux_as_pid_pointer_receipts_before_runtime_claim"]
]);

const METHODOLOGY = Object.freeze([
  ["yool_atom", "capability_atom", "smallest_callable_action_opcode", "examples=read_sector_open_page_spawn_agent_scan_index_route_packet"],
  ["tuple_envelope", "addressable_binding", "binds_yools_map_position_authority_lane_agent_terms_source_pointers_receipts", "maps_can_be_tuple_addressed"],
  ["tuple_space_coordination", "linda_ancestor", "agents_coordinate_through_tuples_not_full_context_reload", "saved_research_external_anchor"],
  ["actor_message_units", "actor_model_ancestor", "agents_are_message_driven_units_with_bounded_jobs", "saved_research_external_anchor"],
  ["hilbert_locality", "brown_hilbert_index", "multidimensional_catalogs_map_to_compact_locality_preserving_keys", "jagadish_moon_faloutsos_saltz_anchor"],
  ["hamt_expansion", "hash_trie_catalogs", "catalog_capacity_is_width_to_depth_not_fixed_tool_count", "bagwell_anchor"],
  ["omnidirectional_reuse", "tuple_yool_catalogs", "same_tuple_and_yool_atoms_may_repeat_across_many_small_rows", "jesse_brown_hilbert_catalog_rule"],
  ["active_brain_staging", "gemma4b_hrm_omniquant", "brain_assets_are_pid_pointer_rows_until_benchmark_runtime_authority_and_usb_readback", "local_receipts_existing"],
  ["shannon_budget", "compression_rule", "remove_max_uncertainty_per_byte_per_loop", "shannon_anchor"],
  ["mcp_edge", "access_layer", "model_invoked_tools_resources_snapshot_cache_boundary", "not_inner_loop"]
]);

const BEST_IDEAS = Object.freeze([
  ["dan_index", "tools_skills_mistakes_projects_reduce_to_numbered_index_table"],
  ["local_first", "canon_local_primary_sync_background_not_server_first"],
  ["mcp_retrieval", "mcp_resources_tools_are_access_layer_not_canonical_memory"],
  ["tuple_reversal", "compact_tuple_language_first_hydrate_authorized_pointer_rows_second"],
  ["shannon", "remove_uncertainty_per_byte_not_more_text_per_loop"],
  ["gnn", "bounded_overlay_for_edges_scores_reverse_gain_not_unbounded_peer_fanout"],
  ["triple_quant_benchmark", "61_percent_fast_size_reduction_zero_receipt_loss_on_local_acer"],
  ["crypto_width", "sha256_sha512_shake1024_shake2048_are_proof_widths"],
  ["atlas_width", "1024_symbol_atlas_ready_2048_symbol_atlas_requires_manifest"],
  ["usb", "sovlinux_first_write_needs_append_safe_plan_before_media_mutation"]
  ,["old_cubes", "absorb_mistakes_tools_genius_previous_cubes_as_pointer_index_inputs"]
]);

function defaultIo() {
  return { existsSync: fs.existsSync, readFileSync: fs.readFileSync };
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

function clean(value, limit = 760) {
  return String(value ?? "")
    .replace(/[|{}\[\]"\r\n\t]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, limit);
}

function row(tag, fields = {}) {
  const parts = [clean(tag, 96)];
  for (const [key, value] of Object.entries(fields)) {
    const limit = String(key).endsWith("_hex") ? 2000000 : 760;
    parts.push(`${clean(key, 96)}=${clean(value, limit)}`);
  }
  return parts.join("|");
}

function repoRel(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (path.isAbsolute(rel) || rel.startsWith("..")) return String(filePath).replace(/\\/g, "/");
  return rel.replace(/\\/g, "/");
}

function resolvePath(input) {
  const text = String(input || "");
  if (/^[A-Za-z]:[\\/]/.test(text)) return path.resolve(text);
  return path.resolve(ROOT, text);
}

function sourceState(def, io) {
  const [id, kind, sourcePath, ...tokens] = def;
  const resolved = resolvePath(sourcePath);
  if (!io.existsSync(resolved)) {
    return { id, kind, path: repoRel(resolved), present: 0, bytes: 0, sha256: "absent", hits: 0, required: tokens.length };
  }
  const text = io.readFileSync(resolved, "utf8").replace(/^\uFEFF/, "");
  return {
    id,
    kind,
    path: repoRel(resolved),
    present: 1,
    bytes: Buffer.byteLength(text, "utf8"),
    sha256: sha256(text),
    hits: tokens.filter((token) => text.includes(token)).length,
    required: tokens.length
  };
}

function buildIndex(lines, run) {
  let offset = 0;
  return lines.map((line, index) => {
    const bytes = Buffer.byteLength(`${line}\n`, "utf8");
    const out = row("H287MWIDX", { run, row: index, tag: line.split("|", 1)[0], offset, bytes });
    offset += bytes;
    return out;
  });
}

export function buildHyperbehcsMultiwidthSymbolSelector(options = {}) {
  const io = options.io || defaultIo();
  const run = clean(options.run || DEFAULT_RUN);
  const generatedAt = clean(options.generatedAt || new Date().toISOString());
  const sources = (options.sources || SOURCE_DEFS).map((def) => sourceState(def, io));
  const presentSources = sources.filter((source) => source.present === 1).length;
  const absorptionSources = (options.absorptionSources || ABSORPTION_SOURCES).map(([id, kind, sourcePath, mode]) => {
    const resolved = resolvePath(sourcePath);
    if (!io.existsSync(resolved)) return { id, kind, mode, path: repoRel(resolved), present: 0, bytes: 0, sha256: "absent" };
    let bytes = 0;
    let digestSeed = sourcePath;
    try {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        const names = fs.readdirSync(resolved).slice(0, 512).join("\n");
        bytes = names.length;
        digestSeed = names;
      } else {
        const text = io.readFileSync(resolved, "utf8").replace(/^\uFEFF/, "");
        bytes = Buffer.byteLength(text, "utf8");
        digestSeed = text;
      }
    } catch {
      bytes = 0;
      digestSeed = sourcePath;
    }
    return { id, kind, mode, path: repoRel(resolved), present: 1, bytes, sha256: sha256(digestSeed) };
  });
  const presentAbsorptionSources = absorptionSources.filter((source) => source.present === 1).length;
  const sourceHits = sources.reduce((sum, source) => sum + source.hits, 0);
  const sourceRequired = sources.reduce((sum, source) => sum + source.required, 0);
  const sourceFailures = sources.filter((source) => source.present !== 1 || source.hits < source.required).length;
  const readyLanes = LANES.filter((lane) => lane[3] === "ready").length;
  const candidateLanes = LANES.filter((lane) => lane[3] === "candidate").length;
  const blockedLanes = LANES.filter((lane) => lane[3] === "blocked").length;
  const edgeOnlyLanes = LANES.filter((lane) => lane[3] === "edge_only").length;

  const lines = [
    row("H287MWRUN", { version: VERSION, run, hyp: "HYP-287", generated_at: generatedAt, subject: "multiwidth_typed_symbol_selector", tuple_only: 1, hbp: 1, hbi: 1, sha: 1, hex: 1, object_hot_path: 0, cold_debug_only: 1, physical_write: 0, usb_write: 0, raw_write: 0, mcp_inner_loop: 0 }),
    row("H287MWSCOPE", { run, current_concrete_symbol_atlas: "1024", proof_widths: "sha256_sha512_shake1024_shake2048", candidate_symbol_widths: "2048_plus_future_receipted_banks", selector_mode: "typed_lane_by_job", single_width_claim: 0, physical_write: 0 })
  ];

  for (const source of sources) {
    lines.push(row("H287MWSRC", { run, id: source.id, kind: source.kind, present: source.present, bytes: source.bytes, sha256: source.sha256, token_hits: source.hits, token_required: source.required, path: source.path, read_only: 1, physical_write: 0 }));
  }
  for (const [slot, lane] of LANES.entries()) {
    const [id, kind, width, status, purpose, sourcesRef, decision] = lane;
    lines.push(row("H287MWLANE", { run, slot, id, kind, width, status, purpose, sources: sourcesRef, decision, active_hot_path: status === "ready" ? 1 : 0, physical_write: 0 }));
  }
  for (const [slot, source] of absorptionSources.entries()) {
    lines.push(row("H287MWABSORB", { run, slot, id: source.id, kind: source.kind, mode: source.mode, present: source.present, bytes: source.bytes, sha256: source.sha256, path_sha16: sha256(source.path).slice(0, 16), cold_path_retained: 1, bulk_payload_hot: 0, pointer_only: 1, dedup_required: 1, supervisor_promotion_required: 1, physical_write: 0 }));
  }
  for (const [slot, rule] of RULES.entries()) {
    const [id, name, state, directive] = rule;
    lines.push(row("H287MWRULE", { run, slot, id, name, state, directive, enforced: 1, physical_write: 0 }));
  }
  for (const [slot, method] of METHODOLOGY.entries()) {
    const [id, kind, rule, source] = method;
    lines.push(row("H287MWMETHOD", { run, slot, id, kind, rule, source, selected: 1, physical_write: 0 }));
  }
  for (const [slot, idea] of BEST_IDEAS.entries()) {
    const [id, summary] = idea;
    lines.push(row("H287MWIDEA", { run, slot, id, summary, selected: 1, physical_write: 0 }));
  }
  lines.push(row("H287MWFORMULA", { run, address_space: "width_power_depth", example_current: "1024^k_paths_before_pointer_catalogs_recursive_cubes_maps_authority_layers", legacy_256_limit_claim: 0, fixed_tool_ceiling: 0, physical_write: 0 }));
  lines.push(row("H287MWSELECT", { run, for_agent_spawn: "tuple_language_plus_glyph_atlas_1024_plus_yool_refs", for_crypto_auth: "sha256_sha512_shake1024_shake2048", for_numeric_signal: "triple_quant_when_receipt_bound", for_metal_bytes: "binary_plus_hex_mirror", for_authority: "map_map_mapped", for_catalog_storage: "cube_cube_cubed", for_old_cubes: "pointer_absorb_then_dedup_quant_rank_supervisor_promote", for_dashboard: "mcp_webmcp_snapshot_only", for_sovlinux_write: "blocked_until_append_safe_plan", physical_write: 0 }));
  lines.push(row("H287MWOBS", { run, ok: sourceFailures === 0 ? 1 : 0, sources: sources.length, present_sources: presentSources, source_hits: sourceHits, source_required: sourceRequired, source_failures: sourceFailures, absorption_sources: absorptionSources.length, present_absorption_sources: presentAbsorptionSources, lanes: LANES.length, ready_lanes: readyLanes, candidate_lanes: candidateLanes, blocked_lanes: blockedLanes, edge_only_lanes: edgeOnlyLanes, current_symbol_atlas_1024: 1, crypto_2048_proof_ready: 1, symbol_2048_candidate_only: 1, physical_write: 0, usb_write: 0, raw_write: 0 }));
  lines.push(row("H287MWBOUNDARY", { run, physical_write: 0, usb_write: 0, raw_write: 0, format: 0, partition: 0, delete: 0, copy: 0, provider_call: 0, mcp_inner_loop: 0, runtime_authority: 0, production_promotion: 0 }));
  lines.push(row("H287MWSUMMARY", { run, rows: "pending", best_path: "build_selector_then_append_safe_sovlinux_driver_proof", current_atlas: "1024", next_candidate: "2048_symbol_atlas_manifest_benchmark", usb_blocker: "append_safe_plan", physical_write: 0 }));

  const patchedLines = lines.map((line) => line.replace("rows=pending", `rows=${lines.length}`));
  const hbp = `${patchedLines.join("\n")}\n`;
  const hbi = `${buildIndex(patchedLines, run).join("\n")}\n`;
  const digest = sha256(hbp);
  const sha = `${row("H287MWSHA", { run, algorithm: "sha256", target: "hbp", rows: patchedLines.length, sha256: digest, physical_write: 0 })}\n`;
  const hex = `${row("H287MWHEX", { run, target: "hbp", encoding: "utf8_to_hex", bytes: Buffer.byteLength(hbp, "utf8"), hbp_hex: Buffer.from(hbp, "utf8").toString("hex"), physical_write: 0 })}\n`;
  const md = `${row("H287MWMD", { run, hyp: "HYP-287", rows: patchedLines.length, sha256: digest, ok: sourceFailures === 0 ? 1 : 0, ready_lanes: readyLanes, blocked_lanes: blockedLanes, current_atlas: "1024", symbol_2048: "candidate", physical_write: 0 })}\n`;

  return { ok: sourceFailures === 0, run, rows: patchedLines.length, hbiRows: patchedLines.length, presentSources, sourceFailures, presentAbsorptionSources, readyLanes, candidateLanes, blockedLanes, edgeOnlyLanes, sha256: digest, hbp, hbi, sha, hex, md };
}

export function writeHyperbehcsMultiwidthSymbolSelector(options = {}) {
  const packet = buildHyperbehcsMultiwidthSymbolSelector(options);
  const out = path.resolve(options.out || DEFAULT_OUT);
  const report = path.resolve(options.report || DEFAULT_REPORT);
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.dirname(report), { recursive: true });
  const paths = {
    base: out,
    hbp: path.join(out, "hyperbehcs-multiwidth-symbol-selector.hbp"),
    hbi: path.join(out, "hyperbehcs-multiwidth-symbol-selector.hbi"),
    sha: path.join(out, "hyperbehcs-multiwidth-symbol-selector.sha256"),
    hex: path.join(out, "hyperbehcs-multiwidth-symbol-selector.hex"),
    md: path.join(out, "hyperbehcs-multiwidth-symbol-selector.md"),
    report
  };
  fs.writeFileSync(paths.hbp, packet.hbp, "ascii");
  fs.writeFileSync(paths.hbi, packet.hbi, "ascii");
  fs.writeFileSync(paths.sha, packet.sha, "ascii");
  fs.writeFileSync(paths.hex, packet.hex, "ascii");
  fs.writeFileSync(paths.md, packet.md, "ascii");
  fs.writeFileSync(paths.report, packet.md, "ascii");
  return { ...packet, paths };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const packet = writeHyperbehcsMultiwidthSymbolSelector();
  process.stdout.write(row("H287MWWRITE", { ok: packet.ok ? 1 : 0, run: packet.run, rows: packet.rows, sha256: packet.sha256, ready_lanes: packet.readyLanes, blocked_lanes: packet.blockedLanes, out: repoRel(packet.paths.base), report: repoRel(packet.paths.report), physical_write: 0, usb_write: 0, raw_write: 0 }) + "\n");
}

export { ABSORPTION_SOURCES, BEST_IDEAS, DEFAULT_OUT, DEFAULT_REPORT, DEFAULT_RUN, LANES, METHODOLOGY, RULES, SOURCE_DEFS };
