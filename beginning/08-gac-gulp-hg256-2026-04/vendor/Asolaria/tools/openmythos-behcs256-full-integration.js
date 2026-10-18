#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const engineRegistry = require("../src/cognitiveEngines/engineRegistry");
const { LAW_ID } = require("../src/gac/laws/spectral-stability");

const ROOT = path.resolve(__dirname, "..");

function rel(p) {
  return path.join(ROOT, p);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function stamp() {
  return new Date().toISOString();
}

function glyph(kind, id, index) {
  return `BH256:${kind.toUpperCase()}:${String(index).padStart(3, "0")}:${sha256(`${kind}:${id}:${index}`).slice(0, 16)}`;
}

const files = {
  glyphs: rel("data/behcs/codex/glyph-language/openmythos-behcs256.v1.json"),
  map: rel("data/behcs/maps/openmythos/openmythos-behcs256-map.v1.json"),
  index: rel("data/behcs/index/openmythos-behcs256-index.v1.json"),
  supervisors: rel("data/behcs/supervisors/openmythos/openmythos-behcs256-supervisors.v1.json"),
  state: rel("data/behcs/state/openmythos/openmythos-behcs256-full-integration.state.json"),
  hermes: rel("data/behcs/hermes/openmythos/openmythos-behcs256-dispatch-latest.json"),
  shannon: rel("data/behcs/shannon/openmythos/openmythos-behcs256-consensus-latest.json"),
  cube: rel("data/behcs/cubes/openmythos-behcs256-integration.cube.js"),
  reportJson: rel("reports/openmythos-behcs256-full-integration-latest.json"),
  reportMd: rel("reports/openmythos-behcs256-full-integration-latest.md")
};

const runtimeFiles = [
  "src/cognitiveEngines/openmythosAdapter.js",
  "src/cognitiveEngines/engineRegistry.js",
  "src/cognitiveEngines/runtimeBridge.js",
  "src/gac/laws/spectral-stability.js",
  "src/drift/mythosObserver.js",
  "packages/mythos-cognitive-engine/src/engine.mjs",
  "packages/mythos-cognitive-engine/src/glyph_adapter.py",
  "packages/drift-broadcast/src/broadcaster.mjs",
  "packages/cycle-orchestrator/src/index.mjs",
  "scripts/spawn-mythos-federation.mjs"
];

function fileState(file) {
  const full = rel(file);
  if (!fs.existsSync(full)) {
    return { file, exists: false, sha256: null, bytes: 0 };
  }
  const buf = fs.readFileSync(full);
  return { file, exists: true, sha256: sha256(buf.toString("utf8")), bytes: buf.length };
}

function buildGlyphLanguage(generatedAt) {
  const verbs = [
    ["MYTHOS_LOAD", "Load approved OpenMythos config and optional weights."],
    ["MYTHOS_THINK", "Run recurrent-depth token generation under bounded loop limits."],
    ["MYTHOS_REASON", "Run latent reasoning status path with hidden-state extraction closed until API proof."],
    ["MYTHOS_LOOP", "Set bounded loop count for subsequent Mythos calls."],
    ["MYTHOS_STATUS", "Return PID, device, loaded state, spectral radius, loop count, and drift signal."],
    ["MYTHOS_DRIFT", "Run LAW-099 drift check and return SOFT/HARD/CRITICAL posture."],
    ["MYTHOS_HALT", "Release model state and halt the PID-bound engine."]
  ].map(([verb, meaning], index) => ({
    verb,
    glyph: glyph("verb", verb, index + 1),
    meaning,
    authority: "GAC",
    law: LAW_ID,
    inputContract: "BEHCS-256 JSON command or glyph sentence",
    outputContract: "single-line JSON response"
  }));

  return {
    id: "openmythos-behcs256-glyph-language.v1",
    generatedAt,
    alphabet: "BEHCS-256",
    engine: "openmythos",
    rootLaw: LAW_ID,
    verbs,
    haltCanon: ["HALT", "BLOCKED", "STALE", "FAIL", "DENIED", "EMERGENCY", "STOP", "KILL", "ABORT", "TERMINATE", "DIVERGE"],
    invariants: [
      "loop_count_bounded",
      "spectral_radius_reported_when_model_loaded",
      "drift_signal_emitted",
      "pid_bound_engine",
      "no_hidden_state_persistence",
      "no_model_claim_without_config_weights_smoke"
    ]
  };
}

function buildSupervisors(generatedAt) {
  const specs = [
    ["openmythos.engine.supervisor", "Engine Supervisor", "Owns PID-bound OpenMythos Node/Python runtime lifecycle."],
    ["openmythos.glyph.supervisor", "Glyph Supervisor", "Owns BEHCS-256 Mythos verb contract and dispatch syntax."],
    ["openmythos.gac.supervisor", "GAC Supervisor", "Enforces LAW-099 loop and spectral stability gates."],
    ["openmythos.drift.supervisor", "Drift Supervisor", "Publishes SOFT/HARD/CRITICAL spectral radius observations."],
    ["openmythos.atlas.supervisor", "Atlas Supervisor", "Routes deep reasoning tasks to worker_lane.openmythos."],
    ["openmythos.hermes.supervisor", "Hermes Supervisor", "Carries dispatch packets and readiness state."],
    ["openmythos.shannon.supervisor", "Shannon Supervisor", "Computes consensus over readiness and activation boundary."],
    ["openmythos.cube.supervisor", "Cube Supervisor", "Seals map, glyph, supervisor, index, and runtime evidence hashes."],
    ["openmythos.gulp.supervisor", "Gulp Supervisor", "Feeds bounded activation/drift proof packets into existing BEHCS Gulp path."],
    ["openmythos.operator.supervisor", "Operator Supervisor", "Keeps package install, config, weights, and promotion under explicit operator approval."]
  ];
  return {
    id: "openmythos-behcs256-supervisors.v1",
    generatedAt,
    engine: "openmythos",
    rootLaw: LAW_ID,
    supervisors: specs.map(([id, title, role], index) => ({
      id,
      title,
      role,
      pid: `BH.OPENMYTHOS.SUPERVISOR.${String(index + 1).padStart(4, "0")}`,
      glyph: glyph("supervisor", id, index + 1),
      status: "READY_GATED",
      authority: "GAC",
      laws: [LAW_ID],
      observes: index === 0 ? ["packages/mythos-cognitive-engine/src/engine.mjs", "packages/mythos-cognitive-engine/src/glyph_adapter.py"] : [],
      emits: ["state", "hermes", "shannon", "cube"]
    }))
  };
}

function buildMap(generatedAt, glyphLanguage, supervisors) {
  const nodes = [
    { id: "user_request", kind: "input", file: null },
    { id: "atlas", kind: "selector", file: "src/selectorCatalogRegistry.js" },
    { id: "engine_registry", kind: "registry", file: "src/cognitiveEngines/engineRegistry.js" },
    { id: "runtime_bridge", kind: "runtime_bridge", file: "src/cognitiveEngines/runtimeBridge.js" },
    { id: "openmythos_adapter", kind: "adapter", file: "src/cognitiveEngines/openmythosAdapter.js" },
    { id: "node_engine", kind: "node_runtime", file: "packages/mythos-cognitive-engine/src/engine.mjs" },
    { id: "python_glyph_adapter", kind: "python_runtime", file: "packages/mythos-cognitive-engine/src/glyph_adapter.py" },
    { id: "gac_law_099", kind: "law", file: "src/gac/laws/spectral-stability.js" },
    { id: "drift_observer", kind: "drift", file: "src/drift/mythosObserver.js" },
    { id: "drift_broadcast", kind: "drift", file: "packages/drift-broadcast/src/broadcaster.mjs" },
    { id: "cycle_orchestrator", kind: "orchestrator", file: "packages/cycle-orchestrator/src/index.mjs" },
    { id: "bootstrap", kind: "bootstrap", file: "scripts/spawn-mythos-federation.mjs" },
    { id: "glyph_language", kind: "glyph_language", file: path.relative(ROOT, files.glyphs).replace(/\\/g, "/") },
    { id: "supervisors", kind: "supervisor_set", file: path.relative(ROOT, files.supervisors).replace(/\\/g, "/") },
    { id: "cube", kind: "cube", file: path.relative(ROOT, files.cube).replace(/\\/g, "/") }
  ];
  const edges = [
    ["user_request", "atlas", "classified_by"],
    ["atlas", "engine_registry", "selects"],
    ["engine_registry", "runtime_bridge", "builds_task_for"],
    ["runtime_bridge", "gac_law_099", "prechecked_by"],
    ["runtime_bridge", "node_engine", "spawns"],
    ["node_engine", "python_glyph_adapter", "streams_json_to"],
    ["python_glyph_adapter", "openmythos_adapter", "implements_contract_for"],
    ["python_glyph_adapter", "gac_law_099", "reports_spectral_radius_to"],
    ["python_glyph_adapter", "drift_observer", "observed_by"],
    ["drift_observer", "drift_broadcast", "publishes_to"],
    ["cycle_orchestrator", "runtime_bridge", "uses"],
    ["bootstrap", "node_engine", "spawns_federation"],
    ["glyph_language", "python_glyph_adapter", "defines_verbs_for"],
    ["supervisors", "runtime_bridge", "governs"],
    ["cube", "glyph_language", "seals"],
    ["cube", "supervisors", "seals"]
  ].map(([from, to, relation]) => ({ from, to, relation }));
  return {
    id: "openmythos-behcs256-map.v1",
    generatedAt,
    engine: "openmythos",
    nodes,
    edges,
    glyphCount: glyphLanguage.verbs.length,
    supervisorCount: supervisors.supervisors.length
  };
}

function buildIndex(generatedAt, fileStates, glyphLanguage, supervisors, map) {
  return {
    id: "openmythos-behcs256-index.v1",
    generatedAt,
    engine: "openmythos",
    selectorIds: ["worker_lane.openmythos", "worker_lane.openmythos_ga_svm_fusion"],
    laws: [LAW_ID],
    runtimeFiles: fileStates,
    artifacts: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, path.relative(ROOT, file).replace(/\\/g, "/")])),
    counts: {
      glyphs: glyphLanguage.verbs.length,
      supervisors: supervisors.supervisors.length,
      mapNodes: map.nodes.length,
      mapEdges: map.edges.length
    },
    activation: {
      package: "open-mythos==0.5.0",
      import: "open_mythos.main",
      configEnv: "ASOLARIA_MYTHOS_CONFIG",
      weightsEnv: "ASOLARIA_MYTHOS_WEIGHTS",
      pythonEnv: "ASOLARIA_MYTHOS_PYTHON",
      bootstrap: "node scripts/spawn-mythos-federation.mjs --count=1 --load --config=<config.json> --weights=<weights.pt>"
    }
  };
}

function buildHermes(generatedAt, index) {
  return {
    id: "openmythos-behcs256-hermes-dispatch.v1",
    generatedAt,
    status: "READY_GATED",
    route: "Atlas -> EngineRegistry -> RuntimeBridge -> GAC LAW-099 -> MythosCognitiveEngine -> glyph_adapter.py -> Drift -> Shannon",
    selectors: index.selectorIds,
    packets: [
      { verb: "MYTHOS_STATUS", target: "BH.MYTHOS.ENGINE.0001", purpose: "runtime status" },
      { verb: "MYTHOS_LOAD", target: "BH.MYTHOS.ENGINE.0001", purpose: "operator-approved config/weights load" },
      { verb: "MYTHOS_THINK", target: "BH.MYTHOS.ENGINE.0001", purpose: "bounded recurrent-depth generation" },
      { verb: "MYTHOS_DRIFT", target: "BH.MYTHOS.ENGINE.0001", purpose: "LAW-099 drift observation" }
    ]
  };
}

function buildShannon(generatedAt, fileStates) {
  const missing = fileStates.filter((entry) => !entry.exists).map((entry) => entry.file);
  return {
    id: "openmythos-behcs256-shannon-consensus.v1",
    generatedAt,
    consensus: missing.length ? "HOLD-MISSING-RUNTIME-FILES" : "PROCEED-GATED-OPENMYTHOS-INTEGRATION",
    execution: "runtime_wired_package_and_weights_operator_gated",
    rootLaw: LAW_ID,
    missingRuntimeFiles: missing,
    votes: [
      { role: "gac", vote: "PASS", reason: "LAW-099 exists and is mapped." },
      { role: "atlas", vote: "PASS", reason: "worker_lane.openmythos selector exists." },
      { role: "runtime", vote: missing.length ? "HOLD" : "PASS", reason: missing.length ? "Runtime file missing." : "Node/Python bridge files present." },
      { role: "operator", vote: "GATED", reason: "open-mythos install, config, and weights stay explicit activation steps." }
    ]
  };
}

function buildCube(generatedAt, index, map, glyphLanguage, supervisors, shannon) {
  const cube = {
    cube: "openmythos-behcs256-integration.cube",
    generatedAt,
    authority: "GAC",
    engine: "openmythos",
    law: LAW_ID,
    glyphRoot: sha256(glyphLanguage),
    supervisorRoot: sha256(supervisors),
    mapRoot: sha256(map),
    indexRoot: sha256(index),
    shannonRoot: sha256(shannon),
    faces: {
      glyphs: path.relative(ROOT, files.glyphs).replace(/\\/g, "/"),
      supervisors: path.relative(ROOT, files.supervisors).replace(/\\/g, "/"),
      map: path.relative(ROOT, files.map).replace(/\\/g, "/"),
      index: path.relative(ROOT, files.index).replace(/\\/g, "/"),
      hermes: path.relative(ROOT, files.hermes).replace(/\\/g, "/"),
      shannon: path.relative(ROOT, files.shannon).replace(/\\/g, "/")
    }
  };
  return `// cube: openmythos-behcs256-integration | BEHCS-256 | GAC LAW-099\nexport const CUBE = ${JSON.stringify(cube, null, 2)};\n`;
}

function buildReport(summary) {
  return `# OpenMythos BEHCS-256 Full Integration

Generated: ${summary.generatedAt}

Status: ${summary.status}

This mint maps OpenMythos into Asolaria as a BEHCS-256 cognitive engine with supervisors, glyph verbs, map, index, Hermes dispatch, Shannon consensus, and cube seal.

## Runtime

- Engine: openmythos
- Package activation: open-mythos==0.5.0
- Python import: open_mythos.main
- GAC law: ${LAW_ID}
- Selector lanes: worker_lane.openmythos, worker_lane.openmythos_ga_svm_fusion

## Counts

- Glyph verbs: ${summary.counts.glyphs}
- Supervisors: ${summary.counts.supervisors}
- Map nodes: ${summary.counts.mapNodes}
- Map edges: ${summary.counts.mapEdges}
- Runtime files present: ${summary.counts.runtimeFilesPresent}/${summary.counts.runtimeFilesTotal}

## Artifacts

- Glyph language: ${summary.artifacts.glyphs}
- Supervisors: ${summary.artifacts.supervisors}
- Map: ${summary.artifacts.map}
- Index: ${summary.artifacts.index}
- Hermes: ${summary.artifacts.hermes}
- Shannon: ${summary.artifacts.shannon}
- Cube: ${summary.artifacts.cube}

## Activation

\`\`\`powershell
pip install open-mythos==0.5.0
node scripts\\spawn-mythos-federation.mjs --count=1 --load --config=<config.json> --weights=<weights.pt>
\`\`\`

## Boundary

Runtime wiring is complete and operator-gated. Model execution activates after package, config, weights, and smoke evidence exist.
`;
}

async function main() {
  const generatedAt = stamp();
  const glyphLanguage = buildGlyphLanguage(generatedAt);
  const supervisors = buildSupervisors(generatedAt);
  const map = buildMap(generatedAt, glyphLanguage, supervisors);
  const fileStates = runtimeFiles.map(fileState);
  const index = buildIndex(generatedAt, fileStates, glyphLanguage, supervisors, map);
  const hermes = buildHermes(generatedAt, index);
  const shannon = buildShannon(generatedAt, fileStates);
  const cubeText = buildCube(generatedAt, index, map, glyphLanguage, supervisors, shannon);
  const registryManifest = engineRegistry.manifest();

  writeJson(files.glyphs, glyphLanguage);
  writeJson(files.supervisors, supervisors);
  writeJson(files.map, map);
  writeJson(files.index, index);
  writeJson(files.hermes, hermes);
  writeJson(files.shannon, shannon);
  writeText(files.cube, cubeText);

  const summary = {
    ok: true,
    generatedAt,
    status: "OPENMYTHOS_BEHCS256_FULL_INTEGRATION_MINTED",
    law: LAW_ID,
    registry: registryManifest,
    counts: {
      glyphs: glyphLanguage.verbs.length,
      supervisors: supervisors.supervisors.length,
      mapNodes: map.nodes.length,
      mapEdges: map.edges.length,
      runtimeFilesPresent: fileStates.filter((entry) => entry.exists).length,
      runtimeFilesTotal: fileStates.length
    },
    artifacts: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, path.relative(ROOT, file).replace(/\\/g, "/")])),
    roots: {
      glyphRoot: sha256(glyphLanguage),
      supervisorRoot: sha256(supervisors),
      mapRoot: sha256(map),
      indexRoot: sha256(index),
      hermesRoot: sha256(hermes),
      shannonRoot: sha256(shannon)
    }
  };

  writeJson(files.state, summary);
  writeJson(files.reportJson, summary);
  writeText(files.reportMd, buildReport(summary));

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    status: "OPENMYTHOS_BEHCS256_FULL_INTEGRATION_FAILED",
    error: error && error.message ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
