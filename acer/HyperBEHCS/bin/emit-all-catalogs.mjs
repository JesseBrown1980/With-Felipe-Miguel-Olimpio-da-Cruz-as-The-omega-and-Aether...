// Emit all federation catalogs to tuple-form .hbp ledgers in C:/HyperBEHCS/data/catalogs/
//   tools.hbp                — from MCP modernization tool_manifest_shards (41)
//   mcp.hbp                  — from MCP modernization mcp_servers (2 + asolaria_mcp_policy + skills_tools_index)
//   mistakes.hbp             — from C:/Users/acer/Asolaria/data/agent-index/mistakes/IX-*.md (57)
//   abilities.hbp            — from SCOUT_ABILITIES_AND_CONDITIONS.md scout matrix
//   skills.hbp               — placeholder + codex skills/linear sample
//   hermes.hbp               — concatenation of hermes-access-bootstrap .hbp files
//   pixel-token-reduction.hbp — BIML/SLoRA quant-reduction canon entries

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-CATALOG-MIGRATION-2026-05-21";
const VANTAGE = "acer";

function emitLedger(outPath, schemaName, rows) {
  let prev = "0000000000000000";
  const out = [];
  const gen = [
    "HBPv1",
    "catalog=" + schemaName,
    "layer=catalog-genesis",
    "wave=" + WAVE,
    "vantage=" + VANTAGE,
    "schema_version=1",
    "entries_expected=" + rows.length,
    "antecedents=" + prev,
    "ts=" + TS,
    "json=0", "runtime=0", "promote=0",
  ].join("|");
  const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
  out.push(gen + "|row_hash=" + genH);
  prev = genH;
  for (const r of rows) {
    const fields = ["HBPv1", "catalog=" + schemaName];
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) continue;
      fields.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
    }
    fields.push("antecedents=" + prev);
    fields.push("ts=" + TS);
    fields.push("json=0", "runtime=0", "promote=0");
    const body = fields.join("|");
    const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
    out.push(body + "|row_hash=" + rh);
    prev = rh;
  }
  fs.writeFileSync(outPath, out.join("\n") + "\n");
  const sha = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex").slice(0, 16);
  console.log(`  ${schemaName.padEnd(22)} ${rows.length.toString().padStart(4)} entries  sha=${sha}  tip=${prev}`);
  return { rows: rows.length, sha, tip: prev };
}

// ---------- TOOLS (41) ----------
const mcpJson = JSON.parse(fs.readFileSync("C:/Users/acer/Asolaria/data/behcs/mcp-catalog/mcp-tool-catalog-modernization-20260515/mcp-tool-catalog-modernization.v1.json", "utf8"));
const toolsRows = mcpJson.tool_manifest_shards.map(t => ({
  entry: t.id,
  path: t.path,
  schema_count: t.schema_count,
  policy: t.v2_policy || "pointer_schema_hash_only",
  allocation_pointer: t.allocation || null,
  source: "mcp-tool-catalog-modernization-20260515",
}));

// ---------- MCP SERVERS (2 + 8 core surfaces) ----------
const mcpRows = [];
for (const s of mcpJson.mcp_servers) {
  mcpRows.push({
    entry: s.id,
    kind: "mcp_server",
    root: s.root,
    server_path: s.server,
    package: s.package_name,
    version: s.version,
    sdk: s.sdk,
    runtime_status: s.runtime_status,
    authority_boundary: s.authority_boundary,
  });
}
for (const c of mcpJson.core_surfaces) {
  mcpRows.push({
    entry: c.id,
    kind: "core_surface",
    path: c.path,
    role: c.role,
    exists: c.exists ? "true" : "false",
  });
}

// ---------- MISTAKES (57 IX-*) ----------
const mistakeDir = "C:/Users/acer/Asolaria/data/agent-index/mistakes";
const ixFiles = fs.readdirSync(mistakeDir).filter(f => /^IX-\d+\.md$/.test(f));
const mistakesRows = [];
for (const f of ixFiles) {
  const md = fs.readFileSync(path.join(mistakeDir, f), "utf8");
  // Parse YAML frontmatter
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) continue;
  const yaml = fm[1];
  const ix = yaml.match(/^ix:\s*(.+)/m)?.[1]?.trim();
  const name = yaml.match(/^name:\s*(.+)/m)?.[1]?.trim();
  const tags = yaml.match(/^tags:\s*\[(.+)\]/m)?.[1]?.trim();
  const chain = yaml.match(/^chain:\s*\[(.+)\]/m)?.[1]?.trim();
  if (!ix || !name) continue;
  mistakesRows.push({
    entry: "IX-" + ix,
    name: name.slice(0, 200),
    tags: tags || "",
    chain: chain || "",
    source_file: f,
  });
}

// ---------- ABILITIES (scout matrix) ----------
const scoutDoc = fs.readFileSync("C:/asolaria-acer/federation-remake-1024/kernel/docs/SCOUT_ABILITIES_AND_CONDITIONS.md", "utf8");
const profileMatches = [...scoutDoc.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/gm)];
const abilitiesRows = [];
for (const m of profileMatches.slice(0, 30)) {
  const [_, profile, read_grep, bash_ro, bash_curl, bash_write, write_edit, webfetch] = m;
  abilitiesRows.push({
    entry: profile.trim(),
    kind: "agent_profile",
    read_grep: read_grep.trim(),
    bash_readonly: bash_ro.trim(),
    bash_curl: bash_curl.trim(),
    bash_write: bash_write.trim(),
    write_edit: write_edit.trim(),
    webfetch_search: webfetch.trim(),
  });
}
// Add capability schema entries
const capKeys = ["role", "headColony", "authorityMode", "languageVersion", "phoneMode", "phoneOrbital", "desktopAgents", "phoneAgents", "subColonyClass"];
for (const k of capKeys) {
  abilitiesRows.push({
    entry: "capability_" + k,
    kind: "colony_capability_dimension",
    source: "colonyCapabilitySchema.js",
  });
}

// ---------- SKILLS (codex skills/linear + placeholder list) ----------
const skillsRows = [];
const codexSkillsDir = "C:/Users/acer/.codex/skills";
try {
  for (const s of fs.readdirSync(codexSkillsDir)) {
    const skillDir = path.join(codexSkillsDir, s);
    const stat = fs.statSync(skillDir);
    if (!stat.isDirectory()) continue;
    const skillMd = path.join(skillDir, "SKILL.md");
    let title = s;
    if (fs.existsSync(skillMd)) {
      const c = fs.readFileSync(skillMd, "utf8");
      const m = c.match(/^#\s+(.+)/m);
      if (m) title = m[1].trim();
    }
    skillsRows.push({
      entry: s,
      kind: "codex_skill",
      root: skillDir,
      title: title.slice(0, 120),
    });
  }
} catch {}
// Add federation-named skills (from prior cohort canon)
const federationSkills = ["hookwall-fire", "pid-mint", "atlas-query", "cosign-attest", "envelope-route", "tuple-cast", "yool-translate", "voxel-emit", "wave-cascade", "brown-hilbert-coord", "gnn-train", "slora-stack", "sparse-attention", "mtp-draft", "triple-quant-encode"];
for (const fs_ of federationSkills) {
  skillsRows.push({ entry: fs_, kind: "federation_skill", source: "cohort-canon-2026-05" });
}

// ---------- HERMES (bootstrap variants) ----------
const hermesDir = "C:/Users/acer/Asolaria/data/behcs/hermes-access-bootstrap";
const hermesRows = [];
try {
  for (const sub of fs.readdirSync(hermesDir)) {
    const subPath = path.join(hermesDir, sub);
    if (!fs.statSync(subPath).isDirectory()) continue;
    hermesRows.push({
      entry: sub,
      kind: "hermes_bootstrap_run",
      path: subPath,
      source: "hyperbehcs-hermes-access-bootstrap-20260516",
    });
  }
} catch {}
// Add Hermes layer entries (from stack-layers canon)
const hermesLayers = [
  { entry: "hermes_l0_metal", kind: "stack_layer", role: "Asolaria OS on metal — foundation" },
  { entry: "hermes_l1_bpi", kind: "stack_layer", role: "HyperBEHCS bpi — binary/hash/hex/crypto primitives" },
  { entry: "hermes_l2_portal", kind: "stack_layer", role: "Persistent portal multiplexing per layer" },
  { entry: "hermes_l3_mcp_optional", kind: "stack_layer", role: "MCP optional surface — tools catalog" },
  { entry: "hermes_l4_heavy_agents", kind: "stack_layer", role: "Heavy agents wrapping MCP/WebMCP/Tools via tuples" },
  { entry: "hermes_unlock_2026_05_19", kind: "milestone", role: "1944-agent scale proven post-unlock" },
];
hermesRows.push(...hermesLayers);

// ---------- PIXEL TOKEN REDUCTION (BIML/SLoRA quant canon) ----------
const pixelRows = [
  { entry: "biml_99_15_percent_quant_reduction", kind: "quant_milestone", source: "Plan-B BIML extract", note: "99.15% token reduction via triple-quant compression of 195-file research corpus" },
  { entry: "triple_quant_polar_turbo_JL", kind: "compression_primitive", source: "C:/HyperBEHCS/lib/hyperbehcs-core.cjs", note: "Polar + Turbo + Johnson-Lindenstrauss — federation default compression for embeddings" },
  { entry: "slora_stacked_lora_per_pid", kind: "specialization_primitive", source: "Jesse 2023 BIML paper", note: "Per-PID LoRA adapter stack — composable specialization" },
  { entry: "sparse_attention_brown_hilbert_proximity", kind: "context_window_scaling", source: "Plan-B research", note: "Attention windows scoped by Brown-Hilbert proximity — reduces O(n²) attention blowup" },
  { entry: "mtp_draft_tokens", kind: "inference_acceleration", source: "Gemma-3-4B-IT INT4 MTP drafter", note: "Multi-token prediction speculative drafting — verified by main model" },
  { entry: "hg256_atlas_hyperglyph", kind: "vocabulary_compression", source: "BEHCS-1024 atlas dim_48-49", note: "HG256 hyperglyph atlas — compressed vocabulary for inter-agent envelopes" },
  { entry: "behcs_1024_glyph_alphabet", kind: "vocabulary_primitive", source: "data/behcs/codex/alphabet-1024.json", note: "Bilateral-PROVEN 5-token mixed-form pair-cosign vocabulary" },
  { entry: "pixel_substrate_slice_map_v8", kind: "geospatial_index", source: "D:/AsolariaGuides/3d-slice-map/merged/v8/", note: "270 voxels at sha 263c37fa5a00775 — 3D coordinate system for compressed canon" },
  { entry: "edge_level_gcn_pid_embedding", kind: "node_embedding", source: "EdgeLevelGCN validated 100% on 1730", note: "GNN-trained PID node embeddings — learned representations replace hand-coded prompts at inference" },
  { entry: "47d_brown_hilbert_50d_expanded", kind: "feature_space", source: "50D-CATALOG-SYNTHESIS-2026-05-20.hbp", note: "47 base dims + 3 expansion (hyperglyph-overlay, hg256-atlas, cross-fabric-handshake) = 50D pid embedding space" },
];

// Emit all
const outDir = "C:/HyperBEHCS/data/catalogs";
console.log("Emitting catalogs to", outDir);
const summary = {};
summary.tools     = emitLedger(`${outDir}/tools.hbp`,                "tools",     toolsRows);
summary.mcp       = emitLedger(`${outDir}/mcp.hbp`,                  "mcp",       mcpRows);
summary.mistakes  = emitLedger(`${outDir}/mistakes.hbp`,             "mistakes",  mistakesRows);
summary.abilities = emitLedger(`${outDir}/abilities.hbp`,            "abilities", abilitiesRows);
summary.skills    = emitLedger(`${outDir}/skills.hbp`,               "skills",    skillsRows);
summary.hermes    = emitLedger(`${outDir}/hermes.hbp`,               "hermes",    hermesRows);
summary.pixels    = emitLedger(`${outDir}/pixel-token-reduction.hbp`, "pixel-token-reduction", pixelRows);

const totalRows = Object.values(summary).reduce((a, b) => a + b.rows, 0);
console.log("---");
console.log("TOTAL CATALOG ROWS EMITTED:", totalRows);
console.log("CATALOGS:", Object.keys(summary).length);
