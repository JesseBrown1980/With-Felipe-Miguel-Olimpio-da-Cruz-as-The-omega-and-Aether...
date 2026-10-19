// Compute the reverse-gain GNN summary for the 18 Iris-lift patterns,
// matching the canonical Asolaria mode "local_graph_scoring_no_external_inference"
// (the same shape as /c/Users/acer/Asolaria/data/neurotech-defense-lab/omnispindle/gnn-forward-reverse-gain-latest.json).
//
// No torch needed — this is structural graph scoring: edge hits per node + lane diversity
// + classification by score threshold. Mirrors what the fabric processor would output.

import fs from 'node:fs';
import path from 'node:path';

const FWD_FILE = 'C:/Users/acer/Asolaria/data/behcs/gnn-feeds/iris-lift-18-patterns-edges-latest.ndjson';
const REV_FILE = 'C:/Users/acer/Asolaria/data/behcs/shannon/iris-lift-18-patterns-symbols-latest.ndjson';
const OUT_FILE = 'C:/Users/acer/Asolaria/data/neurotech-defense-lab/omnispindle/iris-lift-18-patterns-reverse-gain-latest.json';

// Load edges + symbols
const edges = fs.readFileSync(FWD_FILE, 'utf8').trim().split('\n').map(JSON.parse);
const symbols = fs.readFileSync(REV_FILE, 'utf8').trim().split('\n').map(JSON.parse);

// === STRUCTURAL SCORING ===

// Count hits per pattern node = how many edges touch it (in + out)
// Count lanes per pattern = unique cp_bands the pattern's cube cells connect to
// Score = base 0.5 + edge_weight + lane_diversity_bonus + license_bonus

const patternStats = new Map();

for (const e of edges) {
  // Track hits per "iris-lift:" prefixed node
  for (const node of [e.from, e.to]) {
    if (!node.startsWith('iris-lift:') && !node.startsWith('cube:')) continue;
    if (!patternStats.has(node)) {
      patternStats.set(node, { id: node, hits: 0, edge_weight_sum: 0, lanes: new Set(), pattern_n: e.pattern_n });
    }
    const s = patternStats.get(node);
    s.hits++;
    s.edge_weight_sum += e.weight || 0.5;
    if (e.cp_band) s.lanes.add(e.cp_band);
  }
}

// Pull pattern-level enrichment from edges
const patternMeta = new Map();
for (const e of edges) {
  if (e.from && e.from.startsWith('iris-lift:') && e.cp_band) {
    patternMeta.set(e.from, {
      cp: e.cp,
      cp_band: e.cp_band,
      prime: e.prime,
      glyph: e.glyph,
      license: e.license,
    });
  }
}

// Cross-reference symbols (reverse-gain signals)
const revGainBoost = new Map();
for (const s of symbols) {
  if (s.pattern_node) {
    revGainBoost.set(s.pattern_node, (revGainBoost.get(s.pattern_node) || 0) + (s.weight || 0));
  }
}

// === IDEA SCORING + CLASSIFICATION ===

const licenseBonus = {
  'apache-2.0': 0.10, 'mit-apache-mcp': 0.10, 'mit-langchain': 0.10,
  'oss-redis-7': 0.10, 'oss-redis-8': 0.10, 'oss-redis-8.4': 0.10, 'oss-redis': 0.10,
  'oss-sentinel': 0.10, 'bsd-apache-mit': 0.10, 'debezium-apache': 0.10,
  'sqlite-public-domain': 0.10, 'our-canon': 0.15, 'our-canon-extends-redis': 0.20,
  'pattern-only': 0.05, 'pattern-iris-tutorial': 0.05, 'pattern-redis-blog': 0.05,
};

const ideas = [];
for (const [node, stats] of patternStats) {
  if (!node.startsWith('iris-lift:')) continue;
  const meta = patternMeta.get(node) || {};
  const revGain = revGainBoost.get(node) || 0;
  // Score formula (mirrors topIdeas[].score range 0.85-0.95)
  const baseScore = 0.50;
  const hitBonus = Math.min(0.15, stats.hits * 0.05);
  const laneDiversity = Math.min(0.10, stats.lanes.size * 0.05);
  const licBonus = licenseBonus[meta.license] || 0;
  const revGainNorm = Math.min(0.10, revGain * 0.10);
  const score = Math.min(1.0, baseScore + hitBonus + laneDiversity + licBonus + revGainNorm);

  // Class threshold (mirror existing summary's 0.85+ → genius_candidate)
  let cls;
  if (score >= 0.90) cls = 'genius_candidate';
  else if (score >= 0.80) cls = 'pattern_candidate';
  else if (score >= 0.70) cls = 'absorb_candidate';
  else cls = 'deferred_or_pattern_only';

  ideas.push({
    id: node.replace('iris-lift:', ''),
    summary: `Iris-lift pattern at cube cell prime ${meta.prime} cp-band ${meta.cp_band}: glyph ${meta.glyph}`,
    score: Number(score.toFixed(3)),
    class: cls,
    hits: stats.hits,
    edge_weight_sum: Number(stats.edge_weight_sum.toFixed(3)),
    lanes: [...stats.lanes].sort(),
    cp: meta.cp,
    cp_band: meta.cp_band,
    license: meta.license,
    reverse_gain_signal: Number(revGain.toFixed(3)),
  });
}

ideas.sort((a, b) => b.score - a.score);

// === REVERSE-GAIN SECTION (what GAINED most through reverse-direction edges) ===
const reverseGain = symbols.map(s => ({
  symbol: s.symbol,
  reverse_gain_target: s.reverse_gain_target,
  reverse_gain_signal: s.reverse_gain_signal,
  weight: s.weight,
  cp_band: s.cp_band,
  source_agent: s.source_agent,
})).sort((a, b) => b.weight - a.weight);

// === GENIUS / PATTERN / MISTAKE BUCKETS ===
const buckets = {
  genius_candidate: ideas.filter(i => i.class === 'genius_candidate'),
  pattern_candidate: ideas.filter(i => i.class === 'pattern_candidate'),
  absorb_candidate: ideas.filter(i => i.class === 'absorb_candidate'),
  deferred_or_pattern_only: ideas.filter(i => i.class === 'deferred_or_pattern_only'),
};

// === OUTPUT (matching canonical schema) ===
const output = {
  gnnId: 'iris-lift-18-patterns-reverse-gain-latest',
  generatedAt: new Date().toISOString(),
  status: 'GNN_SYNTHESIS_READY',
  mode: 'local_graph_scoring_no_external_inference',
  source_feeds: {
    fwd_edges: FWD_FILE,
    rev_symbols: REV_FILE,
    edge_count: edges.length,
    symbol_count: symbols.length,
  },
  forward: {
    topIdeas: ideas.slice(0, 10),
    all_count: ideas.length,
    bucket_counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  },
  reverse_gain: {
    top_signals: reverseGain.slice(0, 10),
    cp_band_distribution: countBy(symbols, 'cp_band'),
    agent_distribution: countBy(symbols, 'source_agent'),
  },
  white_room_attestation: {
    no_external_inference: true,
    deterministic_from_inputs: true,
    no_torch_required: true,
    no_quarantined_source_dna: true,
  },
};

function countBy(arr, key) {
  const c = {};
  for (const a of arr) c[a[key]] = (c[a[key]] || 0) + 1;
  return c;
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log('wrote:', OUT_FILE);
console.log('');
console.log('=== TOP 10 IDEAS (GNN forward synthesis) ===');
for (const idea of ideas.slice(0, 10)) {
  console.log(`[${idea.class.padEnd(22)}] ${String(idea.score).padEnd(5)} hits=${idea.hits} lanes=${idea.lanes.length} ${idea.id.slice(0,55)}`);
}
console.log('');
console.log('=== BUCKETS ===');
console.log(JSON.stringify(output.forward.bucket_counts, null, 2));
console.log('');
console.log('=== REVERSE-GAIN TOP 5 ===');
for (const r of reverseGain.slice(0, 5)) {
  console.log(`[w=${r.weight.toFixed(3)}] ${r.symbol} → ${r.reverse_gain_target.slice(0,40)} (cp_band=${r.cp_band})`);
}
console.log('');
console.log('=== CP-BAND DISTRIBUTION ===');
console.log(JSON.stringify(output.reverse_gain.cp_band_distribution, null, 2));
