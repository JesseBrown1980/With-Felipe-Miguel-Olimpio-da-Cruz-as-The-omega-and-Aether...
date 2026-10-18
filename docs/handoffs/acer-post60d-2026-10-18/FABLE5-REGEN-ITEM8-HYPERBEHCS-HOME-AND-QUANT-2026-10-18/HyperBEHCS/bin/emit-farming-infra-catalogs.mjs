// Emit catalogs for the 3 farming-infrastructure systems operator surfaced:
//   instruct-kr.hbp   — Krunch Instructor Gate (Director-Gaia, 6 servants, pre-fire guard)
//   hrm.hbp           — Hierarchical Reasoning Model (D:/Asolaria-HRM, gemma-4b-hrm-mtp)
//   asi-evolve.hbp    — AE cohort (17 agents AE-02..AE-18, 4 patterns 22 cp slots)

import fs from "node:fs";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-FARMING-INFRA-CATALOG-2026-05-21";
const VANTAGE = "acer";
const OUT = "C:/HyperBEHCS/data/catalogs";

function emitLedger(name, rows) {
  let prev = "0000000000000000";
  const lines = [];
  const gen = ["HBPv1","catalog=" + name,"layer=catalog-genesis","wave=" + WAVE,"vantage=" + VANTAGE,
    "schema_version=1","entries_expected=" + rows.length,"antecedents=" + prev,"ts=" + TS,
    "json=0","runtime=0","promote=0"].join("|");
  const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
  lines.push(gen + "|row_hash=" + genH);
  prev = genH;
  for (const r of rows) {
    const f = ["HBPv1", "catalog=" + name];
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
  console.log(`  ${name.padEnd(20)} ${rows.length.toString().padStart(4)} entries  sha=${sha}`);
}

// ===== INSTRUCT-KR =====
const instructKR = [
  { entry: "instruct_kr_root", kind: "service_root", path: "C:/asolaria-acer/packages/revolver-10k/data/instruct-kr/", note: "SERVICE-INSTRUCT-KR sentinel-tier Krunch Instructor Gate" },
  { entry: "director", kind: "supervisor", value: "Director-Gaia", note: "Director-Gaia owns INSTRUCT-KR sentinel" },
  { entry: "tier", kind: "classification", value: "sentinel", class: "Krunch_Instructor_Gate" },
  { entry: "stage", kind: "lifecycle", value: "instruct_pre_fire", note: "Pre-fire guard — runs BEFORE spindles execute" },
  { entry: "council_position", kind: "council_role", value: "2_of_5", peers: "chief_sig+white_room_attest+gc_proof+genesis_cosign_descent" },
  { entry: "verb_set", kind: "verb_class", value: "INSTRUCT_QUARANTINE_ESCALATE", excludes: "EXECUTE_SPINDLE_WORK" },
  { entry: "doctrine_d1", kind: "doctrine", value: "KR_INSTRUCTS_NEVER_EXECUTES" },
  { entry: "doctrine_d2", kind: "doctrine", value: "PRE_FIRE_GUARD_ONLY" },
  { entry: "doctrine_d3", kind: "doctrine", value: "DEFAULT_CLOSED_ON_MISSING_INPUT" },
  { entry: "doctrine_d4", kind: "doctrine", value: "APPEND_ONLY_RECEIPTS" },
  { entry: "doctrine_d5", kind: "doctrine", value: "HALT_INVARIANT_BREACH_PAUSES_CASCADE" },
  { entry: "doctrine_d6", kind: "doctrine", value: "OPERATOR_PAGE_ON_ESCALATION" },
  { entry: "servant_s1", kind: "servant", value: "SERVANT-VECTOR", band: "480-575" },
  { entry: "servant_s2", kind: "servant", value: "SERVANT-OMNISHANNON", band: "shannon-civ-host" },
  { entry: "servant_s3", kind: "servant", value: "SERVANT-ROOK", band: "576-703" },
  { entry: "servant_s4", kind: "servant", value: "SERVANT-FORGE", band: "704-799" },
  { entry: "servant_s5", kind: "servant", value: "SERVANT-FALCON", band: "800-895" },
  { entry: "servant_s6", kind: "servant", value: "SERVANT-OMNIWHITEROOM", band: "whiteroom-attestor" },
  { entry: "sentinel_plan", kind: "plan_doc", path: "C:/AsolariaMetal/68_DEEP_WAVE_SECOND_CASCADE/receipts/INSTRUCT-KR-sentinel-plan-2026-05-20.hbp" },
  { entry: "use_for_verb_training", kind: "farming_role", note: "6 servants = 6-way verb training cohort — each servant audits one verb-bucket class" },
];

// ===== HRM =====
const hrm = [
  { entry: "hrm_root", kind: "external_project", path: "D:/Asolaria-HRM/", note: "Asolaria HRM — Python+CUDA project" },
  { entry: "hrm_pretrain", kind: "entry_point", path: "D:/Asolaria-HRM/pretrain.py", note: "Pretraining entry point" },
  { entry: "hrm_evaluate", kind: "entry_point", path: "D:/Asolaria-HRM/evaluate.py", note: "Evaluation entry point" },
  { entry: "hrm_node_bridge", kind: "bridge", path: "C:/asolaria-acer/packages/revolver-10k/src/planes/hrm.mjs", note: "Node-side descriptor-only stub until Python runtime adapter lands" },
  { entry: "hrm_descriptor_adapter_contract", kind: "absorption_contract", path: "D:/Asolaria-HRM/asolaria-integration/hyperbehcs-hrm-descriptor-adapter.v1.json" },
  { entry: "hrm_model_default", kind: "model", value: "gemma-4b-hrm-mtp", note: "Default HRM-compatible model" },
  { entry: "hrm_frame_fields", kind: "bpi_schema", value: "prompt_sha16+model+high_level_steps+low_level_steps+descriptor_only+polar_quant+turbo_quant+jl_quant", note: "HRM BPI frame fields" },
  { entry: "hrm_torch_import_test", kind: "test_artifact", path: "C:/asolaria-acer/data/packs/proofs/hrm-torch-import/E5-HRM-TORCH-IMPORT-TEST-2026-05-20.json" },
  { entry: "hrm_dashboard_feed_cpu_runtime", kind: "dashboard_feed", path: "C:/Users/acer/Asolaria/data/behcs/dashboard-feeds/hyperbehcs-hrm-cpu-runtime-known-problem-latest.json" },
  { entry: "hrm_dashboard_feed_d_drive_absorption", kind: "dashboard_feed", path: "C:/Users/acer/Asolaria/data/behcs/dashboard-feeds/hyperbehcs-hrm-d-drive-absorption-latest.json" },
  { entry: "hrm_dashboard_feed_runtime_readiness_gate", kind: "dashboard_feed", path: "C:/Users/acer/Asolaria/data/behcs/dashboard-feeds/hyperbehcs-hrm-runtime-readiness-gate-latest.json" },
  { entry: "hrm_gnn_feed_d_drive", kind: "gnn_feed", path: "C:/Users/acer/Asolaria/data/behcs/gnn-feeds/hyperbehcs-hrm-d-drive-absorption-edges-latest.ndjson" },
  { entry: "hrm_gnn_feed_descriptor_adapter", kind: "gnn_feed", path: "C:/Users/acer/Asolaria/data/behcs/gnn-feeds/hyperbehcs-hrm-descriptor-adapter-edges-latest.ndjson" },
  { entry: "hrm_use_for_think_layer", kind: "farming_role", note: "HRM is the THINK layer per operator sequence: train verbs → train nouns → THINK (HRM) → remake bottom-up" },
];

// ===== ASI-EVOLVE / AE COHORT =====
const asiEvolve = [
  { entry: "asi_evolve_anchor_pid", kind: "anchor_pid", value: "ASOLARIA-AE-COHORT-COMPLETE-PID-2026-05-07" },
  { entry: "ae_cohort_complete_date", kind: "milestone", value: "2026-05-07", note: "17 agents AE-02..AE-18 landed" },
  { entry: "ae_agents_count", kind: "agent_count", value: "17", note: "AE-02 through AE-18" },
  { entry: "ae_patterns_count", kind: "pattern_count", value: "4", note: "4 absorption patterns identified" },
  { entry: "ae_cp_slots", kind: "cp_slots", value: "22", note: "22 codepoint slots — NO COLLISION" },
  { entry: "ae_verdict", kind: "verdict", value: "ABSORB", note: "Path B clean-room, Baker v Selden defense" },
  { entry: "ae_path", kind: "absorption_path", value: "W10-Path-B-clean-room" },
  { entry: "ae_legal_anchor", kind: "legal_basis", value: "Baker v Selden", note: "Clean-room reimplementation precedent" },
  { entry: "ae_supervisor_role", kind: "supervisor_role_candidate", note: "AE cohort agents are evolution supervisors — they oversee BIML/SLoRA/sparse-attn extraction" },
  { entry: "ae_use_for_remake_layer", kind: "farming_role", note: "AE cohort = REMAKE layer per operator sequence — already proven absorption pipeline" },
];

console.log("Emitting farming-infrastructure catalogs...");
emitLedger("instruct-kr", instructKR);
emitLedger("hrm", hrm);
emitLedger("asi-evolve", asiEvolve);
console.log("---");
console.log("Farming infrastructure catalogued:");
console.log("  Instruct-KR: 20 entries — 6 servants ready for verb-training cohort");
console.log("  HRM:         14 entries — THINK layer (descriptor-stub today, Python runtime pending)");
console.log("  ASI-Evolve:  10 entries — REMAKE layer (17 agents complete absorption pipeline)");
