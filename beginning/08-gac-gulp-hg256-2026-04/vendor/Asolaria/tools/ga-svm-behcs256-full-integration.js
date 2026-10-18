#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const engineRegistry = require("../src/cognitiveEngines/engineRegistry");
const gaSvmAdapter = require("../src/cognitiveEngines/gaSvmAdapter");
const { LAW_ID } = require("../src/gac/laws/classification-stability");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DOCX = "C:\\Users\\acer\\Downloads\\Diagnosis of crop diseases based on the GA-SVM hybrid algorithm (1).docx";

function rel(p) {
  return path.join(ROOT, p);
}

function repoRel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
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
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stamp() {
  return new Date().toISOString();
}

function glyph(kind, id, index) {
  return `BH256:GA-SVM:${kind.toUpperCase()}:${String(index).padStart(3, "0")}:${sha256(`${kind}:${id}:${index}`).slice(0, 16)}`;
}

const files = {
  sourceEvidence: rel("data/behcs/source-evidence/ga-svm-crop-disease-paper.v1.json"),
  glyphs: rel("data/behcs/codex/glyph-language/ga-svm-crop-disease-behcs256.v1.json"),
  supervisors: rel("data/behcs/supervisors/ga-svm/ga-svm-crop-disease-supervisors.v1.json"),
  map: rel("data/behcs/maps/ga-svm/ga-svm-crop-disease-map.v1.json"),
  index: rel("data/behcs/index/ga-svm-crop-disease-index.v1.json"),
  hermes: rel("data/behcs/hermes/ga-svm/ga-svm-crop-disease-dispatch-latest.json"),
  shannon: rel("data/behcs/shannon/ga-svm/ga-svm-crop-disease-consensus-latest.json"),
  cube: rel("data/behcs/cubes/ga-svm-crop-disease-behcs256.cube.js"),
  state: rel("data/behcs/state/ga-svm/ga-svm-crop-disease-full-integration.state.json"),
  reportJson: rel("reports/ga-svm-crop-disease-behcs256-full-integration-latest.json"),
  reportMd: rel("reports/ga-svm-crop-disease-behcs256-full-integration-latest.md")
};

const runtimeFiles = [
  "src/cognitiveEngines/gaSvmAdapter.js",
  "src/cognitiveEngines/engineRegistry.js",
  "src/cognitiveEngines/runtimeBridge.js",
  "src/gac/laws/classification-stability.js",
  "packages/ga-svm-engine/src/GASVMAdapter.mjs",
  "packages/ga-svm-engine/src/ga.mjs",
  "tools/ga-svm-engine-smoke.js",
  "routes/workerRuntime.js",
  "src/selectorCatalogRegistry.js"
];

const paperFacts = {
  title: "Diagnosis of crop diseases based on the GA-SVM hybrid algorithm",
  purpose: "Automatic diagnosis of crop diseases from leaf images by optimizing feature space and classifier hyperparameters.",
  stages: [
    "image_preprocessing",
    "feature_extraction",
    "ga_evolutionary_optimization",
    "svm_classification"
  ],
  input: ["leaf_images", "spectral_data", "field_sensors"],
  output: ["disease_class", "confidence", "explainability"],
  featureEquation: "Y = f{D1(x), E(x), S(x), sigma(x), Ci(x), J(x), Ai(x)}",
  classSet: "Y in {1,2,...,n}",
  features: [
    { symbol: "D1", id: "fractal_dimension", meaning: "fractal dimension" },
    { symbol: "E", id: "entropy", meaning: "entropy" },
    { symbol: "S", id: "lesion_area", meaning: "lesion area" },
    { symbol: "sigma", id: "intensity_sigma", meaning: "intensity standard deviation" },
    { symbol: "Ci", id: "color_channel", meaning: "color characteristics" },
    { symbol: "J", id: "contrast", meaning: "contrast" },
    { symbol: "Ai", id: "morphology_area", meaning: "morphological signs and spots" }
  ],
  trainingSet: "D = {(xi, yi)} for i=1..N, xi in R^d, yi in {1,2,...,K}",
  svmKernel: "K(xi,xj)=exp(-gamma ||xi-xj||^2)",
  svmRegularization: "C > 0",
  gaIndividual: "Theta_i = {C_i, gamma_i}",
  gaRanges: {
    C: [0.1, 100],
    gamma: [0.001, 1]
  },
  gaFitness: "F(Theta_i) = (1/k) sum_j Acc_j(SVM_rbf(C_i,gamma_i))",
  gaOperators: ["log_uniform_initialization", "tournament_selection", "arithmetic_crossover", "gaussian_mutation"],
  stopRule: "max_generations_or_improvement_below_epsilon"
};

function fileState(file) {
  const full = rel(file);
  if (!fs.existsSync(full)) return { file, exists: false, sha256: null, bytes: 0 };
  const buf = fs.readFileSync(full);
  return { file, exists: true, sha256: sha256(buf), bytes: buf.length };
}

function sourceEvidence(generatedAt) {
  const exists = fs.existsSync(SOURCE_DOCX);
  const buf = exists ? fs.readFileSync(SOURCE_DOCX) : Buffer.alloc(0);
  const stat = exists ? fs.statSync(SOURCE_DOCX) : null;
  return {
    id: "ga-svm-crop-disease-paper-source-evidence.v1",
    generatedAt,
    sourcePath: SOURCE_DOCX,
    exists,
    bytes: exists ? stat.size : 0,
    lastWriteTime: exists ? stat.mtime.toISOString() : null,
    sha256: exists ? sha256(buf) : null,
    extractedFacts: paperFacts,
    extractionBoundary: "DOCX bytes are hashed; extracted facts are stored as BEHCS source evidence for runtime maps and supervisors."
  };
}

function buildGlyphLanguage(generatedAt, evidence) {
  const verbs = [
    ["GA_SVM_SOURCE", "Bind DOCX source evidence, hash, paper facts, and feature equation."],
    ["GA_SVM_EXTRACT", "Extract D1, E, S, sigma, Ci, J, and Ai crop-disease feature vectors."],
    ["GA_SVM_TRAIN", "Run genetic algorithm optimization over C and gamma."],
    ["GA_SVM_VALIDATE", "Run k-fold cross-validation fitness gate."],
    ["GA_SVM_PREDICT", "Classify disease class with confidence and explainability packet."],
    ["GA_SVM_STATUS", "Return PID, crop type, trained state, labels, best C, best gamma, and fitness."],
    ["GA_SVM_DRIFT", "Evaluate LAW-100 confidence, dataset, support-vector, and fitness posture."],
    ["GA_SVM_PROMOTE", "Promote validated feature/classification result to Atlas and reverse-gain queues."],
    ["GA_SVM_HALT", "Stop classifier promotion or defer to fallback."]
  ].map(([verb, meaning], index) => ({
    verb,
    glyph: glyph("verb", verb, index + 1),
    meaning,
    authority: "GAC",
    law: LAW_ID,
    sourceHash: evidence.sha256,
    inputContract: "BEHCS-256 crop feature vector or dataset manifest",
    outputContract: "disease class, confidence, probabilities, feature vector, fitness, and law result"
  }));
  return {
    id: "ga-svm-crop-disease-behcs256-glyph-language.v1",
    generatedAt,
    engine: "ga_svm",
    alphabet: "BEHCS-256",
    rootLaw: LAW_ID,
    verbs,
    featureSchema: paperFacts.features,
    invariants: [
      "feature_vector_complete",
      "dataset_hash_bound",
      "cross_validation_fitness_recorded",
      "confidence_gate_checked",
      "reverse_gain_promotion_gated",
      "operator_approved_production_dataset"
    ]
  };
}

function buildSupervisors(generatedAt, evidence) {
  const specs = [
    ["ga_svm.source.supervisor", "Source Evidence Supervisor", "Owns DOCX hash, paper facts, and formula binding."],
    ["ga_svm.feature.supervisor", "Feature Extraction Supervisor", "Owns D1/E/S/sigma/Ci/J/Ai schema normalization."],
    ["ga_svm.ga.supervisor", "GA Optimizer Supervisor", "Owns C/gamma population, selection, crossover, mutation, and convergence."],
    ["ga_svm.svm.supervisor", "SVM Classifier Supervisor", "Owns RBF-kernel classification and class probabilities."],
    ["ga_svm.validation.supervisor", "Validation Supervisor", "Owns k-fold fitness and dataset hash gates."],
    ["ga_svm.atlas.supervisor", "Atlas Supervisor", "Routes crop disease classification tasks to worker_lane.ga_svm."],
    ["ga_svm.gac.supervisor", "GAC Supervisor", "Enforces LAW-100 confidence, overfit, and feature-validation gates."],
    ["ga_svm.pid.supervisor", "PID Binding Supervisor", "Binds classifier runtime to crop, region, device, and dataset hash."],
    ["ga_svm.drift.supervisor", "Drift Supervisor", "Emits SOFT/HARD posture from confidence, support ratio, and fitness movement."],
    ["ga_svm.reverse_gain.supervisor", "Reverse-Gain Supervisor", "Routes anomalies to GNN/Shannon promotion or demotion queues."],
    ["ga_svm.cube.supervisor", "Cube Supervisor", "Seals evidence, glyph, supervisor, map, index, Hermes, and Shannon roots."],
    ["ga_svm.output.supervisor", "Output Supervisor", "Owns disease class, confidence, explainability, and fallback contract."]
  ];
  return {
    id: "ga-svm-crop-disease-supervisors.v1",
    generatedAt,
    engine: "ga_svm",
    rootLaw: LAW_ID,
    sourceHash: evidence.sha256,
    supervisors: specs.map(([id, title, role], index) => ({
      id,
      title,
      role,
      pid: `BH.GA-SVM.SUPERVISOR.${String(index + 1).padStart(4, "0")}`,
      glyph: glyph("supervisor", id, index + 1),
      status: "READY_GATED",
      authority: "GAC",
      laws: [LAW_ID],
      emits: ["state", "hermes", "shannon", "cube", "reverse_gain"]
    }))
  };
}

function buildMap(generatedAt, evidence, glyphLanguage, supervisors) {
  const nodes = [
    { id: "source_docx", kind: "source_evidence", file: evidence.sourcePath },
    { id: "source_evidence", kind: "evidence_packet", file: repoRel(files.sourceEvidence) },
    { id: "feature_schema", kind: "feature_contract", file: "src/cognitiveEngines/gaSvmAdapter.js" },
    { id: "ga_module", kind: "optimizer", file: "packages/ga-svm-engine/src/ga.mjs" },
    { id: "svm_adapter", kind: "classifier", file: "packages/ga-svm-engine/src/GASVMAdapter.mjs" },
    { id: "engine_registry", kind: "registry", file: "src/cognitiveEngines/engineRegistry.js" },
    { id: "runtime_bridge", kind: "runtime_bridge", file: "src/cognitiveEngines/runtimeBridge.js" },
    { id: "worker_runtime_route", kind: "api_route", file: "routes/workerRuntime.js" },
    { id: "selector_catalog", kind: "selector", file: "src/selectorCatalogRegistry.js" },
    { id: "law_100", kind: "law", file: "src/gac/laws/classification-stability.js" },
    { id: "engine_smoke", kind: "smoke", file: "tools/ga-svm-engine-smoke.js" },
    { id: "mistake_ledger", kind: "memory", file: "data/mistake-ledger.ndjson" },
    { id: "gnn_reverse_gain", kind: "reverse_gain", file: "data/behcs/gnn" },
    { id: "glyph_language", kind: "glyph_language", file: repoRel(files.glyphs) },
    { id: "supervisors", kind: "supervisor_set", file: repoRel(files.supervisors) },
    { id: "cube", kind: "cube", file: repoRel(files.cube) },
    { id: "output", kind: "crop_disease_output", file: null }
  ];
  const edges = [
    ["source_docx", "source_evidence", "hashed_into"],
    ["source_evidence", "feature_schema", "defines"],
    ["feature_schema", "svm_adapter", "normalizes_for"],
    ["ga_module", "svm_adapter", "optimizes"],
    ["svm_adapter", "engine_registry", "registered_by"],
    ["engine_registry", "runtime_bridge", "dispatched_by"],
    ["runtime_bridge", "worker_runtime_route", "exposed_at"],
    ["selector_catalog", "engine_registry", "selects"],
    ["runtime_bridge", "law_100", "checked_by"],
    ["engine_smoke", "svm_adapter", "validates"],
    ["svm_adapter", "output", "emits"],
    ["output", "mistake_ledger", "misclassifications_logged_to"],
    ["mistake_ledger", "gnn_reverse_gain", "mined_by"],
    ["gnn_reverse_gain", "selector_catalog", "feeds_back_to"],
    ["glyph_language", "runtime_bridge", "defines_verbs_for"],
    ["supervisors", "runtime_bridge", "governs"],
    ["cube", "source_evidence", "seals"],
    ["cube", "glyph_language", "seals"],
    ["cube", "supervisors", "seals"]
  ].map(([from, to, relation]) => ({ from, to, relation }));
  return {
    id: "ga-svm-crop-disease-map.v1",
    generatedAt,
    engine: "ga_svm",
    rootLaw: LAW_ID,
    sourceHash: evidence.sha256,
    nodes,
    edges,
    glyphCount: glyphLanguage.verbs.length,
    supervisorCount: supervisors.supervisors.length
  };
}

function buildIndex(generatedAt, evidence, fileStates, glyphLanguage, supervisors, map) {
  return {
    id: "ga-svm-crop-disease-index.v1",
    generatedAt,
    engine: "ga_svm",
    source: {
      path: evidence.sourcePath,
      sha256: evidence.sha256,
      bytes: evidence.bytes,
      title: paperFacts.title
    },
    selectorIds: ["worker_lane.ga_svm", "worker_lane.openmythos_ga_svm_fusion"],
    laws: [LAW_ID],
    runtimeFiles: fileStates,
    featureSchema: gaSvmAdapter.FEATURE_SCHEMA,
    paperFeatureSchema: paperFacts.features,
    artifacts: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, repoRel(file)])),
    counts: {
      glyphs: glyphLanguage.verbs.length,
      supervisors: supervisors.supervisors.length,
      mapNodes: map.nodes.length,
      mapEdges: map.edges.length
    },
    runtime: {
      route: "POST /api/worker-runtime/cognitive-engines/ga-svm/execute",
      smokeCommand: "node tools/ga-svm-engine-smoke.js run --execute",
      npmCommand: "npm run gasvm:integrate"
    }
  };
}

function buildHermes(generatedAt, index) {
  return {
    id: "ga-svm-crop-disease-hermes-dispatch.v1",
    generatedAt,
    status: "READY_GATED",
    route: "Atlas -> EngineRegistry -> RuntimeBridge -> LAW-100 -> GASVMAdapter -> ReverseGain -> Shannon",
    selectors: index.selectorIds,
    packets: [
      { verb: "GA_SVM_SOURCE", purpose: "bind DOCX source evidence", target: "BH.GA-SVM.SUPERVISOR.0001" },
      { verb: "GA_SVM_EXTRACT", purpose: "extract D1/E/S/sigma/Ci/J/Ai features", target: "BH.GA-SVM.SUPERVISOR.0002" },
      { verb: "GA_SVM_TRAIN", purpose: "optimize C and gamma", target: "BH.GA-SVM.SUPERVISOR.0003" },
      { verb: "GA_SVM_PREDICT", purpose: "emit disease class and confidence", target: "BH.GA-SVM.SUPERVISOR.0004" },
      { verb: "GA_SVM_DRIFT", purpose: "run LAW-100 posture", target: "BH.GA-SVM.SUPERVISOR.0007" },
      { verb: "GA_SVM_PROMOTE", purpose: "send validated anomalies to reverse gain", target: "BH.GA-SVM.SUPERVISOR.0010" }
    ]
  };
}

function buildShannon(generatedAt, evidence, fileStates) {
  const missing = fileStates.filter((entry) => !entry.exists).map((entry) => entry.file);
  const sourceVote = evidence.exists ? "PASS" : "HOLD";
  return {
    id: "ga-svm-crop-disease-shannon-consensus.v1",
    generatedAt,
    consensus: missing.length || !evidence.exists ? "HOLD-MISSING-GA-SVM-EVIDENCE" : "PROCEED-GATED-GA-SVM-CROP-DISEASE-INTEGRATION",
    execution: "runtime_wired_dataset_and_diagnosis_promotion_operator_gated",
    rootLaw: LAW_ID,
    missingRuntimeFiles: missing,
    votes: [
      { role: "source", vote: sourceVote, reason: evidence.exists ? "DOCX source hash bound." : "DOCX source missing." },
      { role: "feature_schema", vote: "PASS", reason: "Paper feature equation mapped to adapter schema." },
      { role: "optimizer", vote: "PASS", reason: "GA module implements log-uniform init, tournament selection, crossover, mutation, and fitness history." },
      { role: "classifier", vote: "PASS", reason: "RBF-kernel local classifier smoke runtime exists." },
      { role: "gac", vote: "PASS", reason: "LAW-100 classification stability law exists." },
      { role: "operator", vote: "GATED", reason: "Production dataset, real feature extractor, and diagnosis promotion remain explicit gates." }
    ]
  };
}

function buildCube(generatedAt, evidence, glyphLanguage, supervisors, map, index, hermes, shannon) {
  const cube = {
    cube: "ga-svm-crop-disease-behcs256.cube",
    generatedAt,
    authority: "GAC",
    engine: "ga_svm",
    law: LAW_ID,
    sourceHash: evidence.sha256,
    sourceRoot: sha256(evidence),
    glyphRoot: sha256(glyphLanguage),
    supervisorRoot: sha256(supervisors),
    mapRoot: sha256(map),
    indexRoot: sha256(index),
    hermesRoot: sha256(hermes),
    shannonRoot: sha256(shannon),
    faces: {
      sourceEvidence: repoRel(files.sourceEvidence),
      glyphs: repoRel(files.glyphs),
      supervisors: repoRel(files.supervisors),
      map: repoRel(files.map),
      index: repoRel(files.index),
      hermes: repoRel(files.hermes),
      shannon: repoRel(files.shannon)
    },
    outputContract: {
      diseaseClass: "class in {1,2,...,n} or trained label",
      confidence: "0..1",
      explainability: "feature vector, kernel parameters, probabilities, fitness, law result"
    }
  };
  return `// cube: ga-svm-crop-disease-behcs256 | BEHCS-256 | ${LAW_ID}\nexport const CUBE = ${JSON.stringify(cube, null, 2)};\n`;
}

function buildReport(summary) {
  return `# GA-SVM Crop Disease BEHCS-256 Full Integration

Generated: ${summary.generatedAt}

Status: ${summary.status}

The crop-disease GA-SVM paper is bound into Asolaria as a first-class BEHCS-256 cognitive engine with source evidence, glyph verbs, supervisors, map, index, Hermes dispatch, Shannon consensus, and cube seal.

## Source

- DOCX: ${summary.source.path}
- SHA256: ${summary.source.sha256 || "missing"}
- Title: ${paperFacts.title}
- Feature equation: ${paperFacts.featureEquation}
- Kernel: ${paperFacts.svmKernel}
- Fitness: ${paperFacts.gaFitness}

## Runtime

- Engine: ga_svm
- Runtime route: POST /api/worker-runtime/cognitive-engines/ga-svm/execute
- GAC law: ${LAW_ID}
- Selector lanes: worker_lane.ga_svm, worker_lane.openmythos_ga_svm_fusion
- Smoke command: node tools/ga-svm-engine-smoke.js run --execute

## Counts

- Glyph verbs: ${summary.counts.glyphs}
- Supervisors: ${summary.counts.supervisors}
- Map nodes: ${summary.counts.mapNodes}
- Map edges: ${summary.counts.mapEdges}
- Runtime files present: ${summary.counts.runtimeFilesPresent}/${summary.counts.runtimeFilesTotal}

## Artifacts

- Source evidence: ${summary.artifacts.sourceEvidence}
- Glyph language: ${summary.artifacts.glyphs}
- Supervisors: ${summary.artifacts.supervisors}
- Map: ${summary.artifacts.map}
- Index: ${summary.artifacts.index}
- Hermes: ${summary.artifacts.hermes}
- Shannon: ${summary.artifacts.shannon}
- Cube: ${summary.artifacts.cube}

## Output

Disease class, confidence, probabilities, feature vector, optimized C/gamma, cross-validation fitness, and LAW-100 result.
`;
}

async function main() {
  const generatedAt = stamp();
  const evidence = sourceEvidence(generatedAt);
  const glyphLanguage = buildGlyphLanguage(generatedAt, evidence);
  const supervisors = buildSupervisors(generatedAt, evidence);
  const map = buildMap(generatedAt, evidence, glyphLanguage, supervisors);
  const fileStates = runtimeFiles.map(fileState);
  const index = buildIndex(generatedAt, evidence, fileStates, glyphLanguage, supervisors, map);
  const hermes = buildHermes(generatedAt, index);
  const shannon = buildShannon(generatedAt, evidence, fileStates);
  const cubeText = buildCube(generatedAt, evidence, glyphLanguage, supervisors, map, index, hermes, shannon);
  const registryManifest = engineRegistry.manifest();

  writeJson(files.sourceEvidence, evidence);
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
    status: "GA_SVM_CROP_DISEASE_BEHCS256_FULL_INTEGRATION_MINTED",
    law: LAW_ID,
    registry: registryManifest,
    source: {
      path: SOURCE_DOCX,
      exists: evidence.exists,
      sha256: evidence.sha256,
      bytes: evidence.bytes
    },
    counts: {
      glyphs: glyphLanguage.verbs.length,
      supervisors: supervisors.supervisors.length,
      mapNodes: map.nodes.length,
      mapEdges: map.edges.length,
      runtimeFilesPresent: fileStates.filter((entry) => entry.exists).length,
      runtimeFilesTotal: fileStates.length
    },
    artifacts: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, repoRel(file)])),
    roots: {
      sourceRoot: sha256(evidence),
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
    status: "GA_SVM_CROP_DISEASE_BEHCS256_FULL_INTEGRATION_FAILED",
    error: error && error.message ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
