// Emit GNN ingestion schemas for PID-prompt training surface
//   - C:/HyperBEHCS/data/catalogs/node-features-PID-prompt.hbp
//   - C:/HyperBEHCS/data/catalogs/edge-types-verb-mediated.hbp
//
// These are SCHEMAS, not data. They describe shape that EdgeLevelGCN
// ingester loads when picking up PID-prompts as a new training surface.

import fs from "node:fs";
import crypto from "node:crypto";

const ts = new Date().toISOString();
const wave = "W113-100-PID-STARTUP-PROMPT-CONSULT-2026-05-21";

function emit(path, schemaName, rows) {
  let prev = "0000000000000000";
  const out = [];
  const gen = [
    "HBPv1",
    "catalog=" + schemaName,
    "layer=schema-genesis",
    "wave=" + wave,
    "vantage=acer",
    "schema_version=1",
    "entries_expected=" + rows.length,
    "antecedents=" + prev,
    "ts=" + ts,
    "json=0","runtime=0","promote=0",
  ].join("|");
  const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
  out.push(gen + "|row_hash=" + genH);
  prev = genH;
  for (const r of rows) {
    const fields = ["HBPv1", "catalog=" + schemaName];
    for (const [k, v] of Object.entries(r)) fields.push(`${k}=${String(v).replace(/\|/g, "/")}`);
    fields.push("antecedents=" + prev);
    fields.push("ts=" + ts);
    fields.push("json=0","runtime=0","promote=0");
    const body = fields.join("|");
    const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
    out.push(body + "|row_hash=" + rh);
    prev = rh;
  }
  fs.writeFileSync(path, out.join("\n") + "\n");
  console.log("wrote", path, "with", out.length, "rows");
  console.log("  file sha:", crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex").slice(0, 16));
  console.log("  tip:", prev);
}

// === NODE FEATURES schema ===
// Each row defines one field of the PID-prompt feature vector
const NODE_FEATURES = [
  { feature: "tools_vec",       type: "dense_float",    dims: 64,  encoding: "mean-pooled-from-tools.hbp-lookup",          source: "farm contribution TOOLS facet → resolve each tool to tools.hbp row → mean-pool embeddings" },
  { feature: "skills_vec",      type: "dense_float",    dims: 64,  encoding: "mean-pooled-from-skills.hbp-lookup",         source: "farm contribution SKILLS facet → resolve each skill to skills.hbp row → mean-pool embeddings" },
  { feature: "patterns_vec",    type: "dense_float",    dims: 96,  encoding: "triple-quant-polar-turbo-JL",                source: "farm contribution PATTERNS prose → triple-quant encode → JL-projected to 96 dims" },
  { feature: "mistakes_vec",    type: "dense_float",    dims: 96,  encoding: "triple-quant-polar-turbo-JL",                source: "farm contribution MISTAKES prose → triple-quant encode → JL-projected to 96 dims" },
  { feature: "hilbert_pos",     type: "dense_float",    dims: 32,  encoding: "Brown-Hilbert-sinusoidal-positional",        source: "PID h-coord (H####) + room → sinusoidal positional encoding (32d)" },
  { feature: "supervisor_onehot", type: "one_hot",      dims: 8,   encoding: "one-of-8-bands",                              source: "supervisor band: cube_cubed_sealer/gaia/helm/vector/rook/forge/falcon/livefree" },
  { feature: "level_onehot",    type: "one_hot",        dims: 6,   encoding: "one-of-6-levels",                             source: "level L0..L5 in 100-PID-farm hierarchy" },
  { feature: "vantage_onehot",  type: "one_hot",        dims: 4,   encoding: "one-of-4-vantages",                           source: "vantage: acer/liris/falcon/external" },
  { feature: "task_success",    type: "scalar_float",   dims: 1,   encoding: "rolling-avg-task-success-per-PID",            source: "computed: farm output quality + advisor-verdict adherence + mistake-recurrence (lower mistakes = higher)" },
  { feature: "verb_invocation_count", type: "scalar_int", dims: 1, encoding: "count-of-verb-invocations-as-source",         source: "count edges in edge-types-verb-mediated.hbp where source_pid = this PID" },
  { feature: "audit_row_count", type: "scalar_int",     dims: 1,   encoding: "count-of-audit-rows-citing-PID",              source: "count rows in policy-events.hbp citing agent_pid = this PID" },
  { feature: "concat_total",    type: "meta",           dims: 373, encoding: "concatenation-of-above",                       source: "tools(64)+skills(64)+patterns(96)+mistakes(96)+hilbert(32)+sup(8)+level(6)+vantage(4)+success(1)+invocations(1)+audit(1) = 373d feature vector per PID node" },
];

// === EDGE TYPES schema ===
// Each row defines one edge type in the PID-prompt graph
const EDGE_TYPES = [
  { edge_type: "verb_classify",       verb: "classify",            directionality: "directed", semantics: "source PID classifies target PID's envelope (typically liris-only)" },
  { edge_type: "verb_route",          verb: "route",               directionality: "directed", semantics: "source PID routes envelope to target PID via classifier" },
  { edge_type: "verb_annotate",       verb: "annotate",            directionality: "directed", semantics: "source PID annotates target PID with .hbi sidecar" },
  { edge_type: "verb_report",         verb: "report",              directionality: "directed", semantics: "source PID reports state/result to target PID" },
  { edge_type: "verb_spawn",          verb: "farm_pid_specific_contribution", directionality: "directed", semantics: "source PID (PROF-OMNISPINDLE or operator-witnessed) spawns target PID" },
  { edge_type: "verb_mint_cp",        verb: "mint-cp",             directionality: "directed", semantics: "source PID requests cp-mint from target PID (apex)" },
  { edge_type: "verb_raw_read",       verb: "raw-read",            directionality: "directed", semantics: "source PID requests raw USB read via target tool" },
  { edge_type: "verb_sector_attest",  verb: "sector-attest",       directionality: "directed", semantics: "source PID attests sector-0 of target USB" },
  { edge_type: "verb_tier_probe",     verb: "tier-probe",          directionality: "directed", semantics: "source PID probes target access-tier matrix" },
  { edge_type: "supervises",          verb: "_structural_",        directionality: "directed", semantics: "supervisor PID supervises target PID (structural, not verb-mediated)" },
  { edge_type: "antecedent_of",       verb: "_structural_",        directionality: "directed", semantics: "source PID is antecedent of target PID (HBP hypergraph antecedent set)" },
  { edge_type: "cosign_pair",         verb: "_structural_",        directionality: "undirected", semantics: "PID-A and PID-B participate in same cosign row (apex ceremony)" },
  { edge_type: "co_band_proximity",   verb: "_geometric_",         directionality: "undirected", semantics: "PID-A and PID-B in same supervisor band (8-band partition)" },
  { edge_type: "hilbert_proximity",   verb: "_geometric_",         directionality: "undirected", semantics: "PID-A and PID-B within k=5 Hamming distance on Brown-Hilbert coord" },
];

// === INGESTION PIPELINE schema (3rd file: how to load) ===
const INGESTION = [
  { step: "1_load_nodes",       source: "C:/HyperBEHCS/store/100-pid-roster-W113.json", out: "node_index" },
  { step: "2_load_features",    source: "D:/AsolariaGuides/100-pid-startup-prompt-W113/*.md", out: "raw_facets_per_PID" },
  { step: "3_encode_features",  source: "node-features-PID-prompt.hbp (schema)",        out: "feature_matrix_N_x_373" },
  { step: "4_load_edges",       source: "C:/asolaria-acer/data/tool-advisor-audit/policy-events.hbp", out: "edge_list_verb_mediated" },
  { step: "5_load_structural",  source: "C:/HyperBEHCS/history/100-pid-farm-W113.hbp + cosign-chain.hbp", out: "edge_list_structural" },
  { step: "6_load_geometric",   source: "100-pid-roster-W113.json (h-coords)",          out: "edge_list_geometric_proximity" },
  { step: "7_merge_edges",      source: "all 3 edge sources",                            out: "edge_index_E_x_2_plus_type" },
  { step: "8_train_loop",       source: "EdgeLevelGCN (existing, validated 100% on 1730)", out: "trained_node_embeddings_N_x_d" },
  { step: "9_slora_adapters",   source: "Plan B SLoRA per PID, base model = Gemma-3-4B-IT INT4", out: "per_PID_adapter_weights" },
  { step: "10_inference",       source: "router POST /api/tool-advisor + adapter-load", out: "PID-specialized response per envelope" },
];

emit("C:/HyperBEHCS/data/catalogs/node-features-PID-prompt.hbp", "node-features-pid-prompt", NODE_FEATURES);
emit("C:/HyperBEHCS/data/catalogs/edge-types-verb-mediated.hbp", "edge-types-verb-mediated", EDGE_TYPES);
emit("C:/HyperBEHCS/data/catalogs/gnn-ingestion-pipeline.hbp", "gnn-ingestion-pipeline", INGESTION);
