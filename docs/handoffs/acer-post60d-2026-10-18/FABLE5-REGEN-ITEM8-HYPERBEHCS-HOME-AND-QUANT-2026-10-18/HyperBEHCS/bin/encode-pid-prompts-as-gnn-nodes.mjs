// Step 7: Encode 36 farm contributions as GNN node features
// Reads farm .md files + roster, parses facets, emits ndjson ready for EdgeLevelGCN.
// Dense float vectors (tools_vec, skills_vec, patterns_vec, mistakes_vec) are
// placeholders here — computed at training time via Plan B triple-quant + JL.
// This script emits the structural + categorical features + raw facets.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const FARM_DIR = "D:/AsolariaGuides/100-pid-startup-prompt-W113";
const ROSTER = "C:/HyperBEHCS/store/100-pid-roster-W113.json";
const VERBS_HBP = "C:/HyperBEHCS/data/catalogs/verbs.hbp";
const NODES_OUT = "C:/HyperBEHCS/data/catalogs/pid-prompt-node-features.ndjson";
const EDGES_OUT = "C:/HyperBEHCS/data/catalogs/pid-prompt-edges.ndjson";

const BANDS = ["cube_cubed_sealer","gaia","helm","vector","rook","forge","falcon","livefree"];
const LEVELS = ["L0","L1","L2","L3","L4","L5"];
const VANTAGES = ["acer","liris","falcon","external"];

function oneHotIndex(arr, val) {
  const i = arr.indexOf(val);
  return i >= 0 ? i : -1;
}

function sinusoidalHilbert(hcoord, dims = 32) {
  // 16-bit hex → 16-bit int → sinusoidal positional encoding to `dims` (16 sin + 16 cos)
  const n = parseInt(hcoord.replace(/^H/, ""), 16);
  const out = new Array(dims).fill(0);
  for (let i = 0; i < dims / 2; i++) {
    const freq = 1 / Math.pow(10000, (2 * i) / dims);
    out[2 * i]     = Math.sin(n * freq);
    out[2 * i + 1] = Math.cos(n * freq);
  }
  return out;
}

function parseFacets(md) {
  // Parse TOOLS / SKILLS / PATTERNS / MISTAKES sections
  // Expected shape: "TOOLS: ...", "SKILLS: ...", "PATTERNS: ...", "MISTAKES: ..."
  // OR markdown headers "## TOOLS" etc.
  const facets = { tools: [], skills: [], patterns: "", mistakes: "" };
  const sections = md.split(/\n(?=##?#?\s|TOOLS:|SKILLS:|PATTERNS:|MISTAKES:)/i);
  for (const sec of sections) {
    const head = sec.split("\n")[0].toUpperCase();
    const body = sec.split("\n").slice(1).join("\n").trim();
    if (head.includes("TOOLS")) {
      facets.tools = body.split(/[\n,]/).map(s => s.trim().replace(/^[-*]\s*/, "")).filter(s => s && s.length < 80);
    } else if (head.includes("SKILLS")) {
      facets.skills = body.split(/[\n,]/).map(s => s.trim().replace(/^[-*]\s*/, "")).filter(s => s && s.length < 80);
    } else if (head.includes("PATTERNS")) {
      facets.patterns = body.slice(0, 2000);
    } else if (head.includes("MISTAKES")) {
      facets.mistakes = body.slice(0, 2000);
    }
  }
  return facets;
}

// Load roster
const roster = JSON.parse(fs.readFileSync(ROSTER, "utf8")).roster;
const rosterByPid = new Map(roster.map(r => [r.pid, r]));
const rosterByLevelRole = new Map(roster.map(r => [r.level + "-" + r.role, r]));

// Load verbs (for edge emission)
const verbs = [];
for (const ln of fs.readFileSync(VERBS_HBP, "utf8").split("\n").filter(Boolean)) {
  const m = ln.match(/\|entry=([a-z0-9_-]+)/i);
  if (m) verbs.push(m[1]);
}

// Encode each farm contribution
const files = fs.readdirSync(FARM_DIR).filter(f => f.endsWith(".md"));
const nodes = [];
const edges = [];

for (const f of files) {
  const md = fs.readFileSync(path.join(FARM_DIR, f), "utf8");
  const facets = parseFacets(md);

  // Map filename → PID via roster heuristic
  // Examples: L0-special-op-jesse.md → L0 / SPECIAL-OP-JESSE
  //           L4-sup-of-sup-helm-A.md → L4 / sup-of-sup-helm-A (no direct roster match — match by sup band)
  const lvl = f.match(/^(L\d)-/)?.[1];
  let entry = null;
  if (lvl === "L0") entry = roster.find(r => r.level === "L0");
  else if (lvl === "L1") {
    const op = f.match(/L1-op-([a-z]+)/i)?.[1]?.toUpperCase();
    entry = roster.find(r => r.level === "L1" && r.role.includes(op || ""));
  } else if (lvl === "L2") {
    const idx = parseInt(f.match(/L2-GAC-(\d+)/)?.[1] || "0", 10);
    const l2s = roster.filter(r => r.level === "L2");
    entry = l2s[idx - 1] || null;
  } else if (lvl === "L3") {
    const tail = f.replace(/^L3-/, "").replace(/\.md$/, "");
    entry = roster.find(r => r.level === "L3" && r.role.toLowerCase().includes(tail.toLowerCase().split("-").pop()));
    if (!entry) {
      const l3s = roster.filter(r => r.level === "L3");
      entry = l3s.find(r => f.toLowerCase().includes(r.role.toLowerCase().split("-").join("-")));
    }
  } else if (lvl === "L4") {
    const m = f.match(/L4-sup-of-sup-([a-z_]+)-([AB])/i);
    if (m) {
      const band = m[1].toLowerCase();
      const sub = m[2].toUpperCase();
      const targetBlast = `sup-of-sup-${band}-${sub}`;
      entry = roster.find(r => r.level === "L4" && r.blast === targetBlast);
      // Derive actual band from blast for node feature
      if (entry) entry = { ...entry, _derived_band: band };
    }
  }
  if (!entry) {
    console.log("UNMATCHED:", f);
    continue;
  }

  const node = {
    pid: entry.pid,
    level: entry.level,
    level_onehot_idx: oneHotIndex(LEVELS, entry.level),
    role: entry.role,
    blast: entry.blast,
    sup: entry._derived_band || entry.sup,
    sup_onehot_idx: oneHotIndex(BANDS, entry._derived_band || entry.sup),
    vantage: "acer",
    vantage_onehot_idx: oneHotIndex(VANTAGES, "acer"),
    h: entry.h,
    room: entry.room,
    hilbert_pos: sinusoidalHilbert(entry.h, 32),
    raw_facets: {
      tools: facets.tools,
      skills: facets.skills,
      patterns_len: facets.patterns.length,
      mistakes_len: facets.mistakes.length,
      patterns_sha: crypto.createHash("sha256").update(facets.patterns).digest("hex").slice(0, 16),
      mistakes_sha: crypto.createHash("sha256").update(facets.mistakes).digest("hex").slice(0, 16),
    },
    dense_features_pending: {
      tools_vec_64: "compute-at-train-time-via-tools.hbp-mean-pool",
      skills_vec_64: "compute-at-train-time-via-skills.hbp-mean-pool",
      patterns_vec_96: "compute-at-train-time-via-triple-quant-JL",
      mistakes_vec_96: "compute-at-train-time-via-triple-quant-JL",
    },
    task_success_rolling: null,
    audit_row_count: 0,
    source_file: f,
  };
  nodes.push(node);

  // Emit edges: for each verb in TOOLS facet that maps to a known verb, emit edge
  for (const tool of facets.tools) {
    const verbMatch = verbs.find(v => tool.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(tool.toLowerCase().split(" ")[0]));
    if (verbMatch) {
      edges.push({
        edge_type: "verb_" + verbMatch.replace(/-/g, "_"),
        verb: verbMatch,
        directionality: "directed",
        source_pid: entry.pid,
        target_pid: "VERB-CAPABILITY-PROVIDER-UNRESOLVED",
        evidence: "tools-facet-match",
        confidence: 0.7,
        source_file: f,
        ts: new Date().toISOString(),
      });
    }
  }
}

// Add structural edges: each PID's antecedent (level-up parent)
for (const node of nodes) {
  const lvlIdx = LEVELS.indexOf(node.level);
  if (lvlIdx > 0) {
    const parentLevel = LEVELS[lvlIdx - 1];
    const parents = nodes.filter(n => n.level === parentLevel && (n.sup === node.sup || n.sup === "operator-special" || n.sup === "operator"));
    for (const p of parents) {
      edges.push({
        edge_type: "supervises",
        verb: "_structural_",
        directionality: "directed",
        source_pid: p.pid,
        target_pid: node.pid,
        evidence: "level-hierarchy-band-match",
        confidence: 1.0,
        ts: new Date().toISOString(),
      });
    }
  }
}

// Add geometric edges: same-band proximity (one edge per pair)
const seen = new Set();
for (const a of nodes) {
  for (const b of nodes) {
    if (a.pid === b.pid) continue;
    if (a.sup !== b.sup) continue;
    const key = [a.pid, b.pid].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      edge_type: "co_band_proximity",
      verb: "_geometric_",
      directionality: "undirected",
      source_pid: a.pid,
      target_pid: b.pid,
      evidence: "same-supervisor-band-" + a.sup,
      confidence: 1.0,
      ts: new Date().toISOString(),
    });
  }
}

fs.writeFileSync(NODES_OUT, nodes.map(n => JSON.stringify(n)).join("\n") + "\n");
fs.writeFileSync(EDGES_OUT, edges.map(e => JSON.stringify(e)).join("\n") + "\n");

console.log("nodes encoded:", nodes.length);
console.log("edges emitted:", edges.length);
console.log("  by type:");
const byType = {};
for (const e of edges) byType[e.edge_type] = (byType[e.edge_type] || 0) + 1;
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log("   ", k.padEnd(28), v);
console.log("nodes file sha:", crypto.createHash("sha256").update(fs.readFileSync(NODES_OUT)).digest("hex").slice(0, 16));
console.log("edges file sha:", crypto.createHash("sha256").update(fs.readFileSync(EDGES_OUT)).digest("hex").slice(0, 16));
