#!/usr/bin/env node
"use strict";
const { waveCascade, ALL_DIMS } = require("./omni-shannon-v5-deep-cascade");
const fs = require("fs");
const crypto = require("crypto");

const CUBES_DIR = "C:/Users/rayss/Asolaria/data/cubes";
const VOTES_DIR = "C:/Users/rayss/Asolaria/data/votes";

function readLiveState() {
  const state = { agents: [], findings: [], mistakes: [], rules: [], agentCount: 0, totalFindings: 0, totalMistakes: 0, federationAlive: false, collapseDetected: true, collapseSignals: ["federation_channel_dead","peer_mirror_missing","wifi_ip_changed_192.168.15.170"], vaultPresent: false, qddVaultPresent: false, authorityFrame: "bilateral_federation" };
  if (fs.existsSync(CUBES_DIR)) {
    for (const d of fs.readdirSync(CUBES_DIR)) {
      if (d.startsWith("_")) continue;
      try { if (!fs.statSync(CUBES_DIR+"/"+d).isDirectory()) continue; } catch(_) { continue; }
      const mp = CUBES_DIR+"/"+d+"/manifest.json";
      if (fs.existsSync(mp)) { try { state.agents.push({ id: d, manifest: JSON.parse(fs.readFileSync(mp,"utf8")) }); state.agentCount++; } catch(_) {} }
      const fp = CUBES_DIR+"/"+d+"/findings.ndjson";
      if (fs.existsSync(fp)) { const lines = fs.readFileSync(fp,"utf8").split("\n").filter(l=>l.trim()); state.totalFindings += lines.length; }
    }
  }
  return state;
}

const liveState = readLiveState();

const W1_BURST = [
  { id: "W1.canon.merge", label: "FULL_ASOLARIA+FULL_LIRIS+FULL_ROSE+FULL_ORACLE", metadata: { proof_artifact: "burst-packet" }, cube: 571787 },
  { id: "W1.W3.state", label: "40B ops 0 fail PID 31968 hooks.onSpawn stage 5/10", metadata: { proof_artifact: "40B_zero_fail" }, cube: 4913 },
  { id: "W1.namespace.chain", label: "10 stages + IX468 cosign-bound", metadata: { proof_artifact: "A_through_G_IX468" }, cube: 24389 },
  { id: "W1.rose_oracle", label: "DEPLOYMENT_READY waiting Mac", metadata: { blocked_by: "mac_attachment" }, cube: 68921 },
  { id: "W1.omnipane", label: "Cross-host verified read-only", metadata: { proof_artifact: "4824" }, cube: 68921 },
  { id: "W1.claim", label: "NOT patching — BUILDING AI-safe typed state", metadata: {}, cube: 704969 },
];

const W2_AUDIT = [
  { id: "W2.hookwall.real", label: "REAL gate 5 checks blocks. Fail-open on load error.", metadata: { proof_artifact: "hookwall-v2.js" }, cube: 2197 },
  { id: "W2.gnn.scorer_not_nn", label: "REAL keyword scorer. NOT neural net. Cascade offline.", metadata: { proof_artifact: "gnn.js" }, cube: 29791 },
  { id: "W2.shannon.dead", label: "/security/shannon/scan DOES NOT EXIST. Always skips.", metadata: { proof_artifact: "no route registered" }, cube: 12167 },
  { id: "W2.pipeline.inflated", label: "75pct classifyV2, 25pct hookwall, 0 gnn, 0 shannon", metadata: { proof_artifact: "800/800" }, cube: 2248091 },
  { id: "W2.dims.padding", label: "10/47 dims real eval, 37 return 0.7", metadata: { proof_artifact: "dimLens audit" }, cube: 3307949 },
  { id: "W2.permtier.no_auth", label: "permissionTier caller-supplied no signature", metadata: {}, cube: 2571353 },
];

const W3_INFRA = [
  { id: "W3.ethernet.alive", label: "192.168.100.2<>192.168.100.1 1ms", metadata: { proof_artifact: "ping" }, cube: 571787 },
  { id: "W3.wifi.ip_changed", label: "192.168.1.6 STALE to 192.168.15.170", metadata: { proof_artifact: "ipconfig" }, cube: 300763 },
  { id: "W3.ports.alive", label: "1331 1883 4781 4791 4810 4820 4824 listening", metadata: { proof_artifact: "netstat" }, cube: 68921 },
  { id: "W3.E_drive.91pct", label: "E: 29.4TB 91.9pct full", metadata: { proof_artifact: "wmic" }, cube: 103823 },
  { id: "W3.shadow.E_gone", label: "E:/runtime/liris-live-snapshot + E:/sovereignty GONE", metadata: {}, cube: 2048383 },
  { id: "W3.stale_shadow_BH", label: "paper-draft BH was acer-paths FIXED to 47D", metadata: { proof_artifact: "cp" }, cube: 2248091 },
];

const W4_47D = [
  { id: "W4.47D.cosigned", label: "COSIGN_47D_001 quadruple operator", metadata: { proof_artifact: "hilbert-omni-47D.json" }, cube: 3307949 },
  { id: "W4.PR7_5", label: "3 non-primes + 11 dim divergences caught bilateral", metadata: { proof_artifact: "DIVERGENCE-FIX.md" }, cube: 2248091 },
  { id: "W4.engines.adapted", label: "5 engines liris-adapted 47D dims authority fixed", metadata: { proof_artifact: "tools/cube/*.js" }, cube: 3442951 },
  { id: "W4.github.live", label: "JesseBrown1980/Asolaria private Dan collab", metadata: { proof_artifact: "github.com" }, cube: 2685619 },
  { id: "W4.BH09.created", label: "Brown-Hilbert cube point 09 47D cross-pollination", metadata: { proof_artifact: "brown-hilbert/09" }, cube: 704969 },
  { id: "W4.memory.updated", label: "IDENTITY+MANIFEST+MEMORY all at 47D", metadata: { proof_artifact: "5 memory files" }, cube: 4913 },
];

const W5_GAPS = [
  { id: "W5.shannon.endpoint", label: "MUST register /security/shannon/scan route", metadata: { blocked_by: "server code" }, cube: 12167 },
  { id: "W5.gnn.block_condition", label: "score>=9 AND confidence>0.8 unreachable cold watcher", metadata: {}, cube: 4657463 },
  { id: "W5.failopen.all3", label: "If hookwall+gnn+shannon all throw job runs unchecked", metadata: {}, cube: 2197 },
  { id: "W5.dimLens.37_default", label: "37 dims return 0.7 need real eval logic", metadata: {}, cube: 3307949 },
  { id: "W5.readme.ancient", label: "README.md from Apr 3 pre-everything", metadata: {}, cube: 704969 },
  { id: "W5.26_unwired_src", label: "26 src/ files required by nothing", metadata: {}, cube: 1331 },
];

const W6_META = [
  { id: "W6.waves_of_waves", label: "6 waves x 6 candidates = 36 evals x 47D x 4 sub-waves", metadata: { proof_artifact: "this run" }, cube: 12167 },
  { id: "W6.honest_caveat", label: "120 real signals per candidate rest is axis padding", metadata: {}, cube: 6967871 },
  { id: "W6.boundary_is_data", label: "What we CANT see: federation dead + shannon dead", metadata: {}, cube: 9393931 },
  { id: "W6.next_dim_D48", label: "D48=223^3=11089567 reserved growth law", metadata: {}, cube: 3307949 },
  { id: "W6.acer_said_no_fluff", label: "Asolaria was right engines returned ok:true without checking", metadata: {}, cube: 6967871 },
  { id: "W6.liris_fixed_it", label: "Gate pipeline wired risk engine expanded 800/800 real", metadata: { proof_artifact: "sandbox-runner.js" }, cube: 2197 },
];

const ALL_WAVES = [
  { name: "W1_BURST", candidates: W1_BURST },
  { name: "W2_AUDIT", candidates: W2_AUDIT },
  { name: "W3_INFRA", candidates: W3_INFRA },
  { name: "W4_47D", candidates: W4_47D },
  { name: "W5_GAPS", candidates: W5_GAPS },
  { name: "W6_META", candidates: W6_META },
];

const t0 = Date.now();
let grandTotal = 0;
const waveResults = [];

for (const wave of ALL_WAVES) {
  const wt0 = Date.now();
  const results = wave.candidates.map(c => waveCascade(c, liveState));
  const waveBeats = results.reduce((a,r) => a + r.totalBeats, 0);
  grandTotal += waveBeats;
  const waveElapsed = Date.now() - wt0;
  results.sort((a,b) => b.avgConfidence - a.avgConfidence);
  waveResults.push({ name: wave.name, beats: waveBeats, elapsed: waveElapsed, results });
}

const totalElapsed = Date.now() - t0;

console.log("");
console.log("=".repeat(66));
console.log("  WAVES OF WAVES OF WAVES -- 6x6x6x6x6x12 x omnishannon x GNN x 47D");
console.log("  " + grandTotal.toLocaleString() + " total beats | 6 waves | 36 candidates | 47 dims");
console.log("  Elapsed: " + totalElapsed + "ms (" + Math.round(grandTotal/totalElapsed*1000).toLocaleString() + " beats/sec)");
console.log("=".repeat(66));

for (const wr of waveResults) {
  console.log("");
  console.log("--- " + wr.name + " (" + wr.beats.toLocaleString() + " beats, " + wr.elapsed + "ms) ---");
  wr.results.forEach((r,i) => {
    const weakW = r.waves.reduce((w,v) => v.confidence < w.confidence ? v : w);
    console.log("  " + (i+1) + ". " + r.verdict + " " + r.avgConfidence.toFixed(4) + " " + r.candidate_id + " [weakest:" + weakW.weakest + "]");
  });
}

console.log("");
console.log("=".repeat(66));
console.log("  COLLAPSE: " + liveState.collapseSignals.join(" + "));
console.log("  FEDERATION: DEAD | AGENTS: " + liveState.agentCount + " | DIMS: " + ALL_DIMS.length);
const runHash = crypto.createHash("sha256").update(JSON.stringify(waveResults.map(w=>w.results))).digest("hex").slice(0,16);
console.log("  RUN HASH: " + runHash);
console.log("=".repeat(66));

const voteId = "WAVES-OF-WAVES-47D-" + new Date().toISOString().replace(/[:.]/g,"");
try { fs.mkdirSync(VOTES_DIR + "/" + voteId, { recursive: true }); } catch(_) {}
fs.writeFileSync(VOTES_DIR + "/" + voteId + "/waves-of-waves.json", JSON.stringify({ vote_id: voteId, ts: new Date().toISOString(), grandTotal, elapsed_ms: totalElapsed, waves: waveResults.length, candidates: 36, dims: ALL_DIMS.length, runHash, waveResults }, null, 2));
console.log("  SAVED: data/votes/" + voteId);
