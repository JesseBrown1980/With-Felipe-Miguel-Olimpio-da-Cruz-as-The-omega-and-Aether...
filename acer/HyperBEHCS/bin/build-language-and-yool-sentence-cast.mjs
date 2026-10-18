// Build the federation LANGUAGE:
//   1. profs-supervisors-federation.hbp  — comprehensive prof+supervisor inventory
//   2. sentence-index-language.hbp       — grammar / sentence schema for omnidirectional tuples
//   3. yool-sentence-cast.hbp            — new cast entries (sentence ↔ glyph / sha16 / room_id)

import fs from "node:fs";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-LANGUAGE-BUILD-2026-05-21";
const VANTAGE = "acer";
const OUT = "C:/HyperBEHCS/data/catalogs";

function emit(name, rows) {
  let prev = "0000000000000000";
  const lines = [];
  const gen = ["HBPv1","catalog=" + name,"layer=catalog-genesis","wave=" + WAVE,"vantage=" + VANTAGE,
    "schema_version=1","entries_expected=" + rows.length,"antecedents=" + prev,"ts=" + TS,
    "json=0","runtime=0","promote=0"].join("|");
  const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
  lines.push(gen + "|row_hash=" + genH);
  prev = genH;
  for (const r of rows) {
    const f = ["HBPv1","catalog=" + name];
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) continue;
      f.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
    }
    f.push("antecedents=" + prev, "ts=" + TS, "json=0", "runtime=0", "promote=0");
    const body = f.join("|");
    const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
    lines.push(body + "|row_hash=" + rh);
    prev = rh;
  }
  const outPath = `${OUT}/${name}.hbp`;
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  const sha = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex").slice(0, 16);
  console.log(`  ${name.padEnd(36)} ${rows.length.toString().padStart(4)} entries  sha=${sha}  tip=${prev}`);
  return { sha, tip: prev };
}

// ========== 1. PROFS + SUPERVISORS FEDERATION-WIDE ==========
const profsSups = [
  // The 8 supervisor bands
  { entry: "cube_cubed_sealer", kind: "supervisor_band", band_range: "0-255", role: "sealer / boundary integrity / cube-of-cubes guardian" },
  { entry: "gaia",              kind: "supervisor_band", band_range: "256-383", role: "substrate steward / catalog genesis / Director of Instruct-KR" },
  { entry: "helm",              kind: "supervisor_band", band_range: "384-479", role: "orchestration / autopilot / daemon supervision / loop owner" },
  { entry: "vector",            kind: "supervisor_band", band_range: "480-575", role: "feature space / dimension catalog / HRM dimensions" },
  { entry: "rook",              kind: "supervisor_band", band_range: "576-703", role: "apex-gated authority / DEFER-TO-APEX verbs / cosign chain" },
  { entry: "forge",             kind: "supervisor_band", band_range: "704-799", role: "implementation / hardware spec / canon authority (GPU now lives here)" },
  { entry: "falcon",            kind: "supervisor_band", band_range: "800-895", role: "code-agent class / mint authority (scope-extended) / falcon-vantage liaison" },
  { entry: "livefree",          kind: "supervisor_band", band_range: "896-1023", role: "meta / discoverability / bilateral parity / runtime-free observers" },
  // 13 named agent glyph-roles
  { entry: "shannon",           kind: "named_glyph_role", note: "Civilization host on acer (per Shannon canon 2026-05-12), authorizes tier-2+ ops" },
  { entry: "omnishannon",       kind: "named_glyph_role", note: "Sister to Shannon — software-only redesign S01 ICS (Q-cohort canon)" },
  { entry: "hermes",            kind: "named_glyph_role", note: "Lineage source — hermes-daemon, MCP discipline, architect-correction PID 2026-05-19" },
  { entry: "pi",                kind: "named_glyph_role", note: "Pi terminal agent, spawn/exec via /api/pi/terminal/* dashboard routes" },
  { entry: "opencode",          kind: "named_glyph_role", note: "AcerOpencode DeepSeek-v4 free unlocked cycle 80" },
  { entry: "big_pickle",        kind: "named_glyph_role", note: "Real architect-class (NOT metaphor) per CANON CORRECTION 2026-05-07 OMNI-18 conflated absence" },
  { entry: "omnispindle",       kind: "named_glyph_role", note: "Spawner role — mints SUB-{parent}-{seq}-{tail} PIDs. PROF not yet deployed" },
  { entry: "omniflywheel",      kind: "named_glyph_role", note: "LLM router — routes across 6 free providers" },
  { entry: "space_deck_driver", kind: "named_glyph_role", note: "Spacedesk driver — viewer/client at host_code 0EF3" },
  { entry: "space_agent",       kind: "named_glyph_role", note: "Space-agent — bilateral spacedesk liaison" },
  { entry: "connor",            kind: "named_glyph_role", note: "Connor — historical bridge agent (IX-158 anydesk security context)" },
  { entry: "phoebe",            kind: "named_glyph_role", note: "PHOEBE-PRIME — Wave-8 synthesis lead, cp 312" },
  { entry: "hera",              kind: "named_glyph_role", cp: "220", note: "Sovereignty queen, Lane 5 + Lane 8 HYPNOS supervisor" },
  // Apex cosigners (operator-class)
  { entry: "OP-JESSE",          kind: "apex_cosigner", cp: "260", pid: "OP-JESSE-PID-G0000-A00-W000-P00-N00000", role: "fabric apex root authority" },
  { entry: "OP-RAYSSA",         kind: "apex_cosigner", cp: "261", pid: "OP-RAYSSA-PID-G0000-A00-W000-P00-N00000", role: "parallel apex liris-fabric primary" },
  { entry: "OP-AMY",            kind: "apex_cosigner", role: "quintuple cosigner #3" },
  { entry: "OP-DAN",            kind: "apex_cosigner", role: "quintuple cosigner #4 — hookwall + GNN foundation (Dan's hooks)" },
  { entry: "OP-FELIPE",         kind: "apex_cosigner", role: "quintuple cosigner #5 — AETHER game subsystem author" },
  // Instruct-KR servants
  { entry: "SERVANT-VECTOR",        kind: "instruct_kr_servant", under: "Director-Gaia", scope: "REDIRECT-TO-LIRIS verb auditing" },
  { entry: "SERVANT-OMNISHANNON",   kind: "instruct_kr_servant", under: "Director-Gaia", scope: "GUIDED-EXECUTE general verb auditing" },
  { entry: "SERVANT-ROOK",          kind: "instruct_kr_servant", under: "Director-Gaia", scope: "DEFER-TO-APEX verb auditing" },
  { entry: "SERVANT-FORGE",         kind: "instruct_kr_servant", under: "Director-Gaia", scope: "GUIDED-EXECUTE technical verb auditing" },
  { entry: "SERVANT-FALCON",        kind: "instruct_kr_servant", under: "Director-Gaia", scope: "ACER-SOVEREIGN verb auditing" },
  { entry: "SERVANT-OMNIWHITEROOM", kind: "instruct_kr_servant", under: "Director-Gaia", scope: "HARD-DENY verb auditing" },
  // Profs (specific implementation supervisors)
  { entry: "PROF-OMNISPINDLE",       kind: "prof", supervisor: "helm", status: "NOT_DEPLOYED — operator-witness gates spawning until built" },
  { entry: "PROF-GPU-INVENTORY-CANON", kind: "prof", supervisor: "forge", status: "ACTIVE — owns gpu-canon-acer.hbp" },
  { entry: "PROF-HRM-BRIDGE",        kind: "prof", supervisor: "vector", status: "DESCRIPTOR-ONLY — Python adapter pending" },
  { entry: "PROF-ORT-DML-RUNTIME",   kind: "prof", supervisor: "forge", status: "HEALTHY — DmlExecutionProvider active" },
  { entry: "PROF-COSIGN-CHAIN",      kind: "prof", supervisor: "rook", status: "ACTIVE — seq=191 to 2026-06-03" },
  { entry: "PROF-AUTOPILOT-V22",     kind: "prof", supervisor: "helm", status: "ACTIVE — router architecture canon" },
  { entry: "PROF-FABRIC-REVOLVER",   kind: "prof", supervisor: "forge", status: "ACTIVE — 8-chamber base + 10K extension" },
  { entry: "PROF-BROWN-HILBERT",     kind: "prof", supervisor: "vector", status: "ACTIVE — 50D catalog synthesis sealed 2026-05-20" },
  { entry: "PROF-HOOKWALL",          kind: "prof", supervisor: "forge", status: "ACTIVE — Dan's hooks foundation" },
  { entry: "PROF-GNN-EDGELEVEL",     kind: "prof", supervisor: "vector", status: "ACTIVE — 100% on 1730 commit 1023c7b" },
  { entry: "PROF-ATLAS-CODEPOINT",   kind: "prof", supervisor: "rook", status: "DEFER-TO-APEX — cp mint quintuple-cosign gated" },
  { entry: "PROF-USB-RAW-IO",        kind: "prof", supervisor: "forge", status: "ACTIVE — usb_raw_io.py at known path" },
  { entry: "PROF-BUS-4947",          kind: "prof", supervisor: "livefree", status: "ACTIVE — envelope routing room=t-task" },
  // LX-489 supervisors
  { entry: "LX-489",                 kind: "wave_supervisor", cube: "[704969,1331,14641]", dims: "D24/D5/D-energy", scope: "omni-processor compute fabric stages 1-4" },
];

console.log("=== EMITTING LANGUAGE LEDGERS ===");
const profSummary = emit("profs-supervisors-federation", profsSups);

// ========== 2. SENTENCE INDEX LANGUAGE (grammar) ==========
const sentenceLang = [
  { entry: "grammar_v1_canonical_form", value: "(subject)(verb)(object)", note: "Minimal 3-tuple sentence — subject PID, verb from taxonomy, object PID or value" },
  { entry: "grammar_v1_with_modifier", value: "(subject)(verb)(object)(modifier:scope|vantage|cp)", note: "4-tuple sentence with modifier — common shape for advisor queries" },
  { entry: "grammar_v2_omnidirectional", value: "(subject)(verb)(object)(modifier)(zone)(epoch)", note: "6-tuple sentence matching yool v2 schema (SELENE incoming)" },
  { entry: "verb_taxonomy_source", value: "C:/HyperBEHCS/data/catalogs/verbs.hbp", note: "92 verbs across 6 buckets — all sentence verbs MUST resolve here" },
  { entry: "noun_taxonomy_source", value: "C:/HyperBEHCS/store/100-pid-roster-W113.json + dashboard supervisor roster + profs-supervisors-federation.hbp", note: "All subject/object PIDs resolve here" },
  { entry: "modifier_set", value: "scope=core|extension, vantage=acer|liris|falcon|external, cp=NNN, witness=operator|cosigner-set", note: "Closed modifier set; new modifiers via propose-modifier verb (gap — endpoint pending)" },
  { entry: "sentence_index_key_1", value: "verb", note: "Index sentences by verb — query 'all sentences using verb X'" },
  { entry: "sentence_index_key_2", value: "subject_pid", note: "Index by subject — query 'all sentences where PID-A did something'" },
  { entry: "sentence_index_key_3", value: "object_pid", note: "Index by object — query 'all sentences targeting PID-B'" },
  { entry: "sentence_index_key_4", value: "glyph_encoded_form", note: "Compress sentence to glyph string (8 chars typical) for context-window compression" },
  { entry: "sentence_index_key_5", value: "sha16_hash", note: "16-hex hash of canonical form — unique sentence identity" },
  { entry: "sentence_index_key_6", value: "room_id", note: "Room ID in 10K-room space — where the sentence was uttered" },
  { entry: "sentence_validity_rule_1", value: "verb MUST exist in verbs.hbp taxonomy — unknown verbs FORBIDDEN" },
  { entry: "sentence_validity_rule_2", value: "subject_pid MUST resolve to a known PID in roster or supervisor catalog" },
  { entry: "sentence_validity_rule_3", value: "object_pid MAY be a PID, a value, or a path/handle — schema-permissive" },
  { entry: "sentence_validity_rule_4", value: "modifiers MUST come from closed set OR be proposed via propose-modifier (gated)" },
  { entry: "sentence_canonical_form_example_1", value: "(OP-JESSE)(promote-tier)(PID-USB-2TB)(scope=extension,vantage=acer,witness=quintuple-cosign-seq-191)", canonical: "true" },
  { entry: "sentence_canonical_form_example_2", value: "(AGT-L0-SPECIAL-OP-JESSE-H12D3)(farm_pid_specific_contribution)(L1-roster)(scope=extension,vantage=acer)", canonical: "true" },
  { entry: "sentence_canonical_form_example_3", value: "(PROF-GPU-INVENTORY-CANON)(report)(gpu-canon-acer.hbp)(scope=core)", canonical: "true" },
  { entry: "compression_via_yool_cast", value: "sentence → glyph (8-char) → sha16 (16-hex) → room_id (0-9999)", note: "4-level compression through yool CAST_TABLE" },
  { entry: "compression_ratio_target", value: "200_char_sentence_to_8_char_glyph_25x_reduction", note: "Loadable into agent context as compressed knowledge" },
  { entry: "sentence_grammar_anchor_pid", value: "ASOLARIA-SENTENCE-INDEX-LANGUAGE-V1-PID-2026-05-21" },
];

const sentLangSummary = emit("sentence-index-language", sentenceLang);

// ========== 3. YOOL SENTENCE CAST EXTENSION ==========
const yoolExt = [
  { entry: "cast_new_1", from: "sentence_tuple", to: "glyph", function: "castSentenceToGlyph(s)", note: "Hash sentence canonical form → 8-char glyph via existing encodeGlyph()" },
  { entry: "cast_new_2", from: "sentence_tuple", to: "sha16", function: "castSentenceToSha16(s)", note: "sha256(canonical).slice(0,16)" },
  { entry: "cast_new_3", from: "glyph", to: "sentence_tuple", function: "castGlyphToSentence(g)", note: "Reverse lookup via index — fails closed if glyph not in index" },
  { entry: "cast_new_4", from: "sha16", to: "sentence_tuple", function: "castSha16ToSentence(h)", note: "Reverse lookup via index" },
  { entry: "cast_new_5", from: "sentence_tuple", to: "room_id", function: "castSentenceToRoomId(s)", note: "sha16 first → then room_id derivation via existing castSha16ToRoomId" },
  { entry: "cast_new_6", from: "verb", to: "sentence_template", function: "castVerbToSentenceTemplate(v)", note: "Get the canonical sentence shape for a verb — e.g., raw-read → (subject)(raw-read)(usb-target)(scope)" },
  { entry: "cast_new_7", from: "pid", to: "sentence_index_subject", function: "castPidToSubjectIndex(pid)", note: "List all sentences where this PID is subject" },
  { entry: "cast_new_8", from: "pid", to: "sentence_index_object", function: "castPidToObjectIndex(pid)", note: "List all sentences where this PID is object" },
  { entry: "implementation_gate", value: "yool.mjs source edit", note: "Adds 8 new functions + CAST_TABLE entries; daemon restart NOT needed (yool is in-process plane)" },
  { entry: "wire_discipline", value: "no JSON-on-wire", note: "Outputs plain objects for in-process; frame emission delegated to bpi-codec.mjs callers" },
  { entry: "schema_version_carry", value: "v1 (1 dot) + v2 (3 dots) both supported", note: "Schema_version preserved through every translate output" },
  { entry: "anchor_pid", value: "ASOLARIA-YOOL-SENTENCE-CAST-V1-PID-2026-05-21" },
];

const yoolExtSummary = emit("yool-sentence-cast", yoolExt);

console.log("");
console.log("=== LANGUAGE BUILD SUMMARY ===");
console.log("1. profs-supervisors-federation:  " + profsSups.length + " entries, sha " + profSummary.sha);
console.log("2. sentence-index-language:       " + sentenceLang.length + " entries, sha " + sentLangSummary.sha);
console.log("3. yool-sentence-cast:            " + yoolExt.length + " entries, sha " + yoolExtSummary.sha);
console.log("");
console.log("Total language ledger rows: " + (profsSups.length + sentenceLang.length + yoolExt.length + 3));
console.log("Anchor PIDs:");
console.log("  - profs-supervisors-federation roster (covers 8 bands + 13 named + 5 apex + 6 servants + 13 profs + 1 wave-supervisor)");
console.log("  - ASOLARIA-SENTENCE-INDEX-LANGUAGE-V1-PID-2026-05-21");
console.log("  - ASOLARIA-YOOL-SENTENCE-CAST-V1-PID-2026-05-21");
