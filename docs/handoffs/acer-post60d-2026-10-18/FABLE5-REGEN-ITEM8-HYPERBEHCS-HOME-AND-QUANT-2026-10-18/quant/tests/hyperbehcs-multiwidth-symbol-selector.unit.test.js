"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "tools", "behcs", "hyperbehcs-multiwidth-symbol-selector.mjs");

function retiredLabel() {
  return String.fromCharCode(106, 115, 111, 110);
}

function assertNoRetiredLabel(text, label) {
  assert.equal(String(text || "").toLowerCase().includes(retiredLabel()), false, `${label} includes retired label`);
}

function resolveSource(sourcePath) {
  const text = String(sourcePath || "");
  if (/^[A-Za-z]:[\\/]/.test(text)) return path.resolve(text);
  return path.resolve(root, text);
}

function mockIo(sourceDefs) {
  const files = new Map();
  for (const def of sourceDefs) {
    const [, , sourcePath, ...tokens] = def;
    files.set(resolveSource(sourcePath).replace(/\\/g, "/"), `SOURCE|${tokens.join("|")}|physical_write=0\n`);
  }
  return {
    existsSync(filePath) {
      return files.has(String(filePath).replace(/\\/g, "/"));
    },
    readFileSync(filePath) {
      return files.get(String(filePath).replace(/\\/g, "/"));
    }
  };
}

function parseRows(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).map((line) => {
    const parts = line.split("|");
    const tag = parts.shift();
    const fields = new Map();
    for (const part of parts) {
      const pivot = part.indexOf("=");
      if (pivot > 0) fields.set(part.slice(0, pivot), part.slice(pivot + 1));
    }
    return { tag, fields, line };
  });
}

(async function main() {
  const mod = await import(pathToFileURL(scriptPath).href);
  const packet = mod.buildHyperbehcsMultiwidthSymbolSelector({
    io: mockIo(mod.SOURCE_DEFS),
    run: "unit-multiwidth-symbol-selector",
    generatedAt: "2026-05-17T00:00:00.000Z"
  });

  assert.equal(packet.ok, true);
  assert.equal(packet.sourceFailures, 0);
  assert.equal(packet.readyLanes, 12);
  assert.equal(packet.candidateLanes, 1);
  assert.equal(packet.blockedLanes, 2);
  assert.equal(packet.edgeOnlyLanes, 1);
  assert.equal(packet.sha256.length, 64);
  assertNoRetiredLabel(packet.hbp, "hbp");
  assertNoRetiredLabel(packet.hbi, "hbi");
  assertNoRetiredLabel(packet.md, "md");

  const rows = parseRows(packet.hbp);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWSRC").length, mod.SOURCE_DEFS.length);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWLANE").length, mod.LANES.length);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWABSORB").length, mod.ABSORPTION_SOURCES.length);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWRULE").length, mod.RULES.length);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWMETHOD").length, mod.METHODOLOGY.length);
  assert.equal(rows.filter((entry) => entry.tag === "H287MWIDEA").length, mod.BEST_IDEAS.length);

  assert.match(packet.hbp, /^H287MWSCOPE\|.*current_concrete_symbol_atlas=1024.*proof_widths=sha256_sha512_shake1024_shake2048.*single_width_claim=0/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=glyph_atlas_1024.*status=ready.*current_concrete_symbol_bank/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=crypto_shake_2048.*status=ready.*high_assurance/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=symbol_atlas_2048_candidate.*status=candidate.*optional_extended_proof_glyph_expansion/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=hybrid_binary_envelope.*status=ready.*substrate_store/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=tuple_language.*small_subdivided_8_to_13_line_pages.*reusable_atoms/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=gemma4b_active_brain_candidate.*status=ready.*cached_tuple_producer_pid_receipts/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=hrm_reasoning_module.*status=blocked.*runtime_dependencies_not_ready/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=omniquant_c_drive_engine.*status=ready.*omniquant_c_drive_quant_substrate/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=triple_quant.*status=ready.*receipt_zero_loss/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=map_map_mapped.*status=ready.*authority/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=cube_cube_cubed.*status=ready.*catalog_storage/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=mcp_webmcp_edge.*status=edge_only.*keep_out_of_inner_loop/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=sovlinux_append_safe.*status=blocked.*requires_append_safe_plan/m);
  assert.match(packet.hbp, /^H287MWLANE\|.*id=old_cube_absorption.*status=ready.*mistakes_tools_genius_previous_cubes_absorbed_as_sha_pointer_rows/m);
  assert.match(packet.hbp, /^H287MWABSORB\|.*id=mistake_ledger.*pointer_only=1.*dedup_required=1/m);
  assert.match(packet.hbp, /^H287MWABSORB\|.*id=planb_genius_evidence.*pointer_only=1.*supervisor_promotion_required=1/m);
  assert.match(packet.hbp, /^H287MWRULE\|.*name=single_alphabet_reduction.*state=forbidden/m);
  assert.match(packet.hbp, /^H287MWRULE\|.*name=catalog_page_geometry.*old_47_cube_catalog_floor_splits_into_brown_hilbert_pages_target_8_max_13_lines/m);
  assert.match(packet.hbp, /^H287MWRULE\|.*name=brain_quant_staging.*gemma4b_hrm_omniquant_move_to_sovlinux_as_pid_pointer_receipts/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=yool_atom.*smallest_callable_action_opcode/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=tuple_envelope.*binds_yools_map_position_authority_lane_agent_terms_source_pointers_receipts/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=hilbert_locality.*locality_preserving_keys/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=hamt_expansion.*width_to_depth_not_fixed_tool_count/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=omnidirectional_reuse.*same_tuple_and_yool_atoms_may_repeat_across_many_small_rows/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=active_brain_staging.*brain_assets_are_pid_pointer_rows_until_benchmark_runtime_authority_and_usb_readback/m);
  assert.match(packet.hbp, /^H287MWMETHOD\|.*id=mcp_edge.*not_inner_loop/m);
  assert.match(packet.hbp, /^H287MWFORMULA\|.*address_space=width_power_depth.*1024\^k_paths.*fixed_tool_ceiling=0/m);
  assert.match(packet.hbp, /^H287MWOBS\|.*ok=1.*current_symbol_atlas_1024=1.*crypto_2048_proof_ready=1.*symbol_2048_candidate_only=1.*physical_write=0/m);
  assert.match(packet.hbp, /^H287MWBOUNDARY\|.*physical_write=0.*usb_write=0.*raw_write=0.*mcp_inner_loop=0.*runtime_authority=0/m);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hyperbehcs-multiwidth-symbol-selector-"));
  const written = mod.writeHyperbehcsMultiwidthSymbolSelector({
    io: mockIo(mod.SOURCE_DEFS),
    run: "unit-multiwidth-symbol-selector",
    generatedAt: "2026-05-17T00:00:00.000Z",
    out: temp,
    report: path.join(temp, "latest.md")
  });
  assert.deepEqual(fs.readdirSync(temp).sort(), [
    "hyperbehcs-multiwidth-symbol-selector.hbi",
    "hyperbehcs-multiwidth-symbol-selector.hbp",
    "hyperbehcs-multiwidth-symbol-selector.hex",
    "hyperbehcs-multiwidth-symbol-selector.md",
    "hyperbehcs-multiwidth-symbol-selector.sha256",
    "latest.md"
  ]);
  assert.equal(written.sha256.length, 64);

  console.log(`H287MWTEST|ok=1|test=hyperbehcs-multiwidth-symbol-selector|rows=${packet.rows}|ready_lanes=${packet.readyLanes}|absorption_sources=${mod.ABSORPTION_SOURCES.length}|symbol_2048=candidate|physical_write=0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
