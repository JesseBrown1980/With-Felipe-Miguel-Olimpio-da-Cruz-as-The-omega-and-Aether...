#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const behcs = require('./behcs/codex-bridge');
const engineRegistry = require('../src/cognitiveEngines/engineRegistry');

const repoRoot = path.resolve(__dirname, '..');

const MODE = Object.freeze({
  backend: 'local_filesystem_free_backend',
  cli: 'bare_node_cli',
  headless: true,
  shelllessRuntime: true,
  noServerAuth: true,
  noServerApiRoute: true,
  noExternalApiCalls: true,
  noDownloads: true,
  noInstall: true,
  noModelExecution: true,
  noDatasetRead: true,
  noDeviceAccess: true,
  childProcessUse: false,
  secretMaterialWritten: false,
  honestCapabilityLabels: true
});

const PATHS = Object.freeze({
  plan: rel('data/behcs/plans/openmythos-gasvm-fusion-plan.v1.json'),
  map: rel('data/behcs/maps/openmythos/openmythos-gasvm-fusion-map.v1.json'),
  index: rel('data/behcs/index/openmythos-gasvm-fusion-index.v1.json'),
  supervisors: rel('data/behcs/supervisors/openmythos/openmythos-gasvm-fusion-supervisors.v1.json'),
  laws: rel('data/behcs/laws/openmythos-gasvm-gac-laws.v1.json'),
  state: rel('data/behcs/state/openmythos/openmythos-gasvm-fusion.state.json'),
  hermes: rel('data/behcs/hermes/openmythos/openmythos-gasvm-fusion-dispatch-latest.json'),
  shannon: rel('data/behcs/shannon/openmythos/openmythos-gasvm-fusion-consensus-latest.json'),
  cube: rel('data/behcs/cubes/openmythos-gasvm-fusion-supervisor.cube.js'),
  reportJson: rel('reports/openmythos-gasvm-fusion-latest.json'),
  reportMd: rel('reports/openmythos-gasvm-fusion-latest.md'),
  inbox: rel('data/behcs/inbox.ndjson'),
  outbox: rel('data/behcs/outbox.ndjson'),
  gnnEdges: rel('data/behcs/gnn-live-edges.ndjson')
});

const SOURCES = [
  {
    id: 'openmythos-github',
    name: 'OpenMythos GitHub',
    url: 'https://github.com/kyegomez/OpenMythos',
    claim: 'Public repository describes OpenMythos as a theoretical Recurrent-Depth Transformer implementation.'
  },
  {
    id: 'openmythos-pypi',
    name: 'open-mythos PyPI',
    url: 'https://pypi.org/project/open-mythos/',
    claim: 'PyPI package metadata lists open-mythos as Python package for recurrent transformers, MoE, MLA/GQA, ACT, and LTI stability exploration.'
  },
  {
    id: 'gasvm-paper-user-supplied',
    name: 'GA-SVM crop disease paper',
    url: 'user-supplied-docx-not-loaded-in-this-session',
    claim: 'User supplied summary describes GA optimizing SVM C/gamma with RBF kernel, feature extraction, and cross-validation fitness.'
  }
];

const SUPERVISOR_DOMAINS = [
  ['source_provenance', 'OpenMythos and GA-SVM source claims stay marked as experimental/user-supplied until artifacts are loaded and verified.'],
  ['engine_registry', 'Adapters expose uniform cognitive-engine contracts without bypassing existing routing.'],
  ['gac_law_099', 'OpenMythos recurrent loops require bounded loop count and spectral-radius stability below one.'],
  ['gac_law_100', 'GA-SVM classification requires dataset hash, feature schema, cross-validation, and fitness report.'],
  ['atlas_selection', 'Atlas routes deep reasoning to OpenMythos, classification to GA-SVM, and fused tasks to staged GA-SVM then OpenMythos review.'],
  ['glyph_verbs', 'MYTHOS_THINK, MYTHOS_REASON, MYTHOS_LOOP, MYTHOS_STATUS, and MYTHOS_DRIFT are registered as gated verbs.'],
  ['drift_fitness', 'OpenMythos drift and GA-SVM fitness degradation feed SOFT/HARD/CRITICAL review states.'],
  ['execution_gate', 'Model and classifier execution opens after package provenance, weights/data evidence, smoke tests, and operator gate pass.'],
  ['truth_docs', 'Documentation labels stateless parallel evaluations as workers; coupled agents carry identity, memory, communication, and shared-state influence.'],
  ['behcs_mint', 'Plans, maps, cubes, indexes, memory, crypto, and GNN edges receive the fusion contract.']
];

function rel(p) {
  return path.join(repoRoot, p);
}

function repoRel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, data.endsWith('\n') ? data : `${data}\n`, 'utf8');
}

function appendNdjson(filePath, data) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(data)}\n`, 'utf8');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function glyph(kind, id, seed) {
  const hash = sha256Text(`${kind}:${id}:${seed || ''}`);
  return `HG256:${kind.toUpperCase()}:${hash.slice(0, 8).toUpperCase()}:${behcs.hilbertAddress(hash)}`;
}

function buildLaws(generatedAt) {
  return {
    lawSetId: 'openmythos-gasvm-gac-laws.v1',
    generatedAt,
    status: 'PROPOSED_ENFORCEABLE_GATES',
    laws: [
      {
        id: 'LAW-099-openmythos-recurrence-stability',
        title: 'OpenMythos recurrence stability',
        gate: 'halt_if_loop_limit_or_spectral_radius_violated',
        rule: 'OpenMythos tasks must cap loops, report drift, and halt promotion if spectral radius is known and >= 1.',
        actions: ['HALT', 'THROTTLE', 'DRIFT_BROADCAST']
      },
      {
        id: 'LAW-100-ga-svm-validation-and-drift',
        title: 'GA-SVM validation and drift',
        gate: 'halt_if_dataset_or_fitness_evidence_missing',
        rule: 'GA-SVM tasks require feature schema, dataset hash, cross-validation fitness, and drift review before classification output is promoted.',
        actions: ['HALT', 'RETRAIN_REVIEW', 'FITNESS_DRIFT_BROADCAST']
      },
      {
        id: 'LAW-101-honest-worker-labels',
        title: 'Honest worker and swarm labels',
        gate: 'label_truth_required',
        rule: 'Stateless parallel evaluations are workers; true agents require identity, memory, communication, and coupling.',
        actions: ['REWRITE_LABEL', 'BLOCK_OVERCLAIM']
      }
    ]
  };
}

function buildPlan(generatedAt) {
  const registryManifest = engineRegistry.manifest();
  const sampleFusionTask = engineRegistry.buildEngineTask({
    kind: 'classification_deep_reasoning',
    domain: 'crop_disease',
    prompt: 'Classify crop disease features, then explain drift and confidence.',
    complexity: 0.82,
    features: {
      fractal_dimension: 1.2,
      entropy: 0.62,
      lesion_area: 0.18,
      intensity_sigma: 0.41,
      color_channel: 0.77,
      contrast: 0.53,
      morphology_area: 0.2
    },
    datasetHash: 'required-before-runtime',
    crossValidationFolds: 5
  });

  return {
    planId: 'openmythos-gasvm-fusion-plan.v1',
    generatedAt,
    status: 'FUSION_BRIDGE_READY_EXECUTION_BLOCKED',
    mode: MODE,
    truthBoundary: {
      implementedFacts: [
        'cognitive-engine registry contract',
        'GAC-gated OpenMythos adapter surface',
        'GAC-gated GA-SVM classification adapter surface',
        'Atlas selection and staged fusion plan',
        'PID-bound Python glyph server',
        'Node runtime wrapper for Mythos engine processes',
        'LAW-099 spectral-stability evaluator',
        'drift broadcaster and observer path',
        'cycle-orchestrator deep-reasoning task path',
        'bootstrap script for PID-bound Mythos wrapper smoke',
        'local GA-SVM engine package with genetic optimizer',
        'GA-SVM synthetic feature smoke report',
        'BEHCS/Hermes/Shannon/cube/report integration'
      ],
      gatedUntilEvidence: [
        'trained OpenMythos weights',
        'approved OpenMythos config',
        'loaded crop disease dataset manifest',
        'validated GA-SVM feature extractor',
        'cross-validation fitness report',
        'operator-approved model smoke'
      ]
    },
    engineRegistry: registryManifest,
    sampleFusionTask,
    integrationStages: [
      { id: 'stage_0_registry', status: 'done', action: 'Register OpenMythos, GA-SVM, and fusion engine descriptors.' },
      { id: 'stage_1_gac_laws', status: 'done', action: 'Mint LAW-099, LAW-100, and honest label law as enforceable gates.' },
      { id: 'stage_2_atlas', status: 'planned', action: 'Wire Atlas/workerRouter selection to engineRegistry.classifyTask after smoke tests.' },
      { id: 'stage_3_openmythos_runtime_bridge', status: 'done_runtime_gated', action: 'Added PID-bound Node/Python glyph adapter, ESM law bridge, drift broadcaster, cycle orchestrator path, and bootstrap smoke script.' },
      { id: 'stage_4_openmythos_model_smoke', status: 'blocked', action: 'Install/probe open-mythos and model weights in isolated Python env, then run shape-only smoke.' },
      { id: 'stage_5_gasvm_runtime', status: 'done_synthetic_smoke_data_gated', action: 'Added local GA-SVM engine package and synthetic feature smoke; production dataset, real feature extractor, and promotion fitness report remain gated.' },
      { id: 'stage_6_fusion_runtime', status: 'blocked', action: 'Run GA-SVM classification, then OpenMythos drift/explanation review under GAC.' }
    ],
    sources: SOURCES
  };
}

function buildSupervisors(generatedAt) {
  return {
    supervisorSetId: 'openmythos-gasvm-fusion-supervisors.v1',
    generatedAt,
    status: 'SUPERVISORS_READY_PLAN_ONLY',
    supervisors: SUPERVISOR_DOMAINS.map(([id, purpose], index) => ({
      id: `openmythos_gasvm.${id}.supervisor`,
      domainIndex: index,
      domain: id,
      glyph: glyph('openmythos_gasvm_supervisor', id, index),
      authority: 'observe_plan_verify_only',
      purpose,
      ownsMicroRange: { from: index * 16, to: index * 16 + 15 },
      writePolicy: 'local_artifacts_only',
      runtimePolicy: {
        modelExecution: 'blocked',
        downloads: 'blocked',
        installs: 'blocked',
        datasetRead: 'blocked'
      }
    }))
  };
}

function buildMap(plan, supervisors, laws, generatedAt) {
  return {
    mapId: 'openmythos-gasvm-fusion-map.v1',
    generatedAt,
    status: plan.status,
    nodes: [
      { id: 'gac', kind: 'governance', laws: laws.laws.map((law) => law.id) },
      { id: 'engine_registry', kind: 'registry', file: 'src/cognitiveEngines/engineRegistry.js' },
      { id: 'openmythos', kind: 'cognitive_engine', file: 'src/cognitiveEngines/openmythosAdapter.js' },
      { id: 'openmythos_runtime_wrapper', kind: 'runtime_bridge', file: 'packages/mythos-cognitive-engine/src/engine.mjs' },
      { id: 'openmythos_glyph_adapter', kind: 'runtime_bridge', file: 'packages/mythos-cognitive-engine/src/glyph_adapter.py' },
      { id: 'spectral_stability_law', kind: 'gac_law_module', file: 'src/gac/laws/spectral-stability.js' },
      { id: 'spectral_stability_esm_bridge', kind: 'gac_law_module', file: 'src/gac/laws/spectral-stability.mjs' },
      { id: 'mythos_drift_observer', kind: 'drift_module', file: 'src/drift/mythosObserver.js' },
      { id: 'mythos_drift_broadcaster', kind: 'drift_module', file: 'packages/drift-broadcast/src/broadcaster.mjs' },
      { id: 'mythos_cycle_orchestrator', kind: 'orchestrator', file: 'packages/cycle-orchestrator/src/index.mjs' },
      { id: 'mythos_federation_bootstrap', kind: 'bootstrap', file: 'scripts/spawn-mythos-federation.mjs' },
      { id: 'ga_svm', kind: 'cognitive_engine', file: 'src/cognitiveEngines/gaSvmAdapter.js' },
      { id: 'ga_svm_runtime_package', kind: 'runtime_bridge', file: 'packages/ga-svm-engine/src/GASVMAdapter.mjs' },
      { id: 'ga_svm_genetic_optimizer', kind: 'optimizer', file: 'packages/ga-svm-engine/src/ga.mjs' },
      { id: 'ga_svm_smoke', kind: 'runtime_smoke', file: 'tools/ga-svm-engine-smoke.js', report: 'reports/ga-svm-engine-smoke-latest.md' },
      { id: 'fusion', kind: 'staged_engine', stages: ['ga_svm', 'openmythos'] },
      { id: 'hookwall_gnn_gc', kind: 'review_path', gates: ['hookwall', 'forward_gnn', 'reverse_gain', 'omnishannon', 'gc'] }
    ],
    edges: [
      ['atlas', 'engine_registry', 'selects'],
      ['engine_registry', 'ga_svm', 'routes_classification'],
      ['engine_registry', 'openmythos', 'routes_deep_reasoning'],
      ['openmythos', 'openmythos_runtime_wrapper', 'implemented_by'],
      ['openmythos_runtime_wrapper', 'openmythos_glyph_adapter', 'spawns'],
      ['openmythos_glyph_adapter', 'spectral_stability_law', 'reports_to'],
      ['spectral_stability_law', 'spectral_stability_esm_bridge', 'exports_to_esm'],
      ['openmythos_glyph_adapter', 'mythos_drift_observer', 'observed_by'],
      ['mythos_drift_observer', 'mythos_drift_broadcaster', 'publishes_to'],
      ['mythos_cycle_orchestrator', 'openmythos_runtime_wrapper', 'spawns_for_deep_reasoning'],
      ['mythos_federation_bootstrap', 'openmythos_runtime_wrapper', 'smoke_spawns'],
      ['ga_svm', 'ga_svm_runtime_package', 'implemented_by'],
      ['ga_svm_runtime_package', 'ga_svm_genetic_optimizer', 'optimizes_with'],
      ['ga_svm_smoke', 'ga_svm_runtime_package', 'validates_synthetic_features'],
      ['ga_svm', 'fusion', 'classification_result'],
      ['openmythos', 'fusion', 'drift_explanation_review'],
      ['fusion', 'gac', 'validated_by'],
      ['fusion', 'hookwall_gnn_gc', 'mined_by']
    ],
    supervisors: supervisors.supervisors.map((entry) => entry.id)
  };
}

function buildIndex(plan, map, generatedAt) {
  const digest = sha256Text(JSON.stringify({ plan, map }));
  return {
    indexId: 'openmythos-gasvm-fusion-index.v1',
    generatedAt,
    status: plan.status,
    digest,
    hilbert: behcs.hilbertAddress(digest),
    files: {
      registry: 'src/cognitiveEngines/engineRegistry.js',
      openmythosAdapter: 'src/cognitiveEngines/openmythosAdapter.js',
      mythosEngineWrapper: 'packages/mythos-cognitive-engine/src/engine.mjs',
      mythosGlyphAdapter: 'packages/mythos-cognitive-engine/src/glyph_adapter.py',
      spectralStabilityLaw: 'src/gac/laws/spectral-stability.js',
      spectralStabilityEsmBridge: 'src/gac/laws/spectral-stability.mjs',
      mythosDriftObserver: 'src/drift/mythosObserver.js',
      mythosDriftBroadcaster: 'packages/drift-broadcast/src/broadcaster.mjs',
      mythosCycleOrchestrator: 'packages/cycle-orchestrator/src/index.mjs',
      mythosFederationBootstrap: 'scripts/spawn-mythos-federation.mjs',
      gaSvmAdapter: 'src/cognitiveEngines/gaSvmAdapter.js',
      gaSvmRuntimePackage: 'packages/ga-svm-engine/src/GASVMAdapter.mjs',
      gaSvmGeneticOptimizer: 'packages/ga-svm-engine/src/ga.mjs',
      gaSvmSmokeRunner: 'tools/ga-svm-engine-smoke.js',
      gaSvmSmokeReport: 'reports/ga-svm-engine-smoke-latest.md',
      plan: repoRel(PATHS.plan),
      map: repoRel(PATHS.map),
      laws: repoRel(PATHS.laws),
      supervisors: repoRel(PATHS.supervisors),
      report: repoRel(PATHS.reportMd)
    },
    searchTerms: ['openmythos', 'ga-svm', 'crop disease', 'recurrent-depth', 'spectral radius', 'cross-validation', 'gac law 099', 'gac law 100']
  };
}

function buildShannon(plan, generatedAt) {
  return {
    integrationId: 'openmythos-gasvm-fusion-shannon',
    generatedAt,
    status: 'consensus_fusion_bridge_ready_execution_blocked',
    consensus: 'PROCEED-BRIDGE-ONLY',
    executionDisposition: 'no_model_execution_no_download_no_install_no_dataset_read',
    votes: [
      { part: 'scout', vote: 'PASS', reason: 'Public OpenMythos surfaces and user-supplied GA-SVM summary are mapped as source anchors.' },
      { part: 'evidence', vote: 'PASS', reason: 'Adapters, laws, supervisors, map, index, report, cube, Hermes, and Shannon are written locally.' },
      { part: 'executor', vote: 'HALT_RUNTIME', reason: 'No Python package install, model weights, dataset read, or classifier execution is permitted in this tranche.' },
      { part: 'fabric', vote: 'PASS', reason: 'Engine registry supports OpenMythos, GA-SVM, and staged fusion selection.' },
      { part: 'voice', vote: 'HONEST_LABELS', reason: 'The bridge is labeled as infrastructure, not trained intelligence or validated diagnosis.' },
      { part: 'planner', vote: 'CONTINUE', reason: plan.integrationStages.find((stage) => stage.status === 'planned')?.action || 'Proceed through gated stages.' }
    ]
  };
}

function buildHermes(plan, shannon, generatedAt) {
  return {
    integrationId: 'openmythos-gasvm-fusion-hermes',
    generatedAt,
    status: plan.status,
    mode: MODE,
    packet: {
      verb: 'EVT-HERMES-OPENMYTHOS-GASVM-FUSION',
      summary: 'OpenMythos and GA-SVM were registered as GAC-gated cognitive-engine contracts.',
      consensus: shannon.consensus,
      report: repoRel(PATHS.reportMd)
    }
  };
}

function buildCube(plan, shannon, generatedAt) {
  const cube = {
    id: 'openmythos-gasvm-fusion-supervisor',
    generatedAt,
    primaryCatalog: { D: 37, name: 'AUTHORITY', prime: 157 },
    touches: [6, 16, 20, 25, 35, 37, 38, 39, 42, 47],
    gates: ['gac', 'law_099', 'law_100', 'honest_labels', 'runtime_smoke', 'dataset_manifest', 'drift_review'],
    payload: {
      kind: 'cognitive-engine-fusion-bridge',
      status: plan.status,
      mode: MODE,
      engines: ['openmythos', 'ga_svm', 'openmythos_ga_svm_fusion'],
      shannon: {
        consensus: shannon.consensus,
        executionDisposition: shannon.executionDisposition
      }
    },
    translate: {
      human: 'OpenMythos and GA-SVM can combine as gated cognitive engines; runtime stays blocked until proof exists.',
      agent: '(asolaria, openmythos, ga_svm, cognitive_engine_registry, gac, bridge_only)',
      device: 'node tools/openmythos-gasvm-fusion-supervisor.js integrate --execute'
    }
  };
  return `// cube: openmythos-gasvm-fusion-supervisor | cognitive-engine | D37 AUTHORITY\nexport const CUBE = ${JSON.stringify(cube, null, 2)}\n`;
}

function buildReport(plan, laws, supervisors, shannon, generatedAt) {
  const stageRows = plan.integrationStages.map((stage) =>
    `| ${stage.id} | ${stage.status} | ${stage.action} |`
  ).join('\n');
  const lawRows = laws.laws.map((law) =>
    `| ${law.id} | ${law.gate} | ${law.rule} |`
  ).join('\n');
  const supervisorRows = supervisors.supervisors.map((entry) =>
    `| ${entry.domain} | ${entry.authority} | ${entry.purpose} |`
  ).join('\n');
  const sourceRows = plan.sources.map((entry) =>
    `| ${entry.name} | ${entry.url} | ${entry.claim} |`
  ).join('\n');

  const json = {
    reportId: 'openmythos-gasvm-fusion-latest',
    generatedAt,
    status: plan.status,
    plan,
    laws,
    supervisors,
    shannon
  };
  const md = `# OpenMythos + GA-SVM Fusion Bridge

Generated: ${generatedAt}

Status: ${plan.status}

This bridge registers OpenMythos and GA-SVM as cognitive-engine contracts inside Asolaria. Current execution posture: package, download, model, dataset, classifier, and device gates are closed pending provenance, weights/data evidence, smoke tests, and operator approval.

## Integration Stages

| Stage | Status | Action |
| --- | --- | --- |
${stageRows}

## GAC Laws

| Law | Gate | Rule |
| --- | --- | --- |
${lawRows}

## Supervisors

| Domain | Authority | Purpose |
| --- | --- | --- |
${supervisorRows}

## Shannon

- Consensus: ${shannon.consensus}
- Execution: ${shannon.executionDisposition}

## Sources

| Source | URL | Claim |
| --- | --- | --- |
${sourceRows}
`;
  return { json, md };
}

function integrate({ execute = false } = {}) {
  const generatedAt = new Date().toISOString();
  const plan = buildPlan(generatedAt);
  const laws = buildLaws(generatedAt);
  const supervisors = buildSupervisors(generatedAt);
  const map = buildMap(plan, supervisors, laws, generatedAt);
  const index = buildIndex(plan, map, generatedAt);
  const shannon = buildShannon(plan, generatedAt);
  const hermes = buildHermes(plan, shannon, generatedAt);
  const cube = buildCube(plan, shannon, generatedAt);
  const report = buildReport(plan, laws, supervisors, shannon, generatedAt);
  const eventId = `openmythos-gasvm-fusion-${Date.now()}`;

  if (execute) {
    writeJson(PATHS.plan, plan);
    writeJson(PATHS.laws, laws);
    writeJson(PATHS.supervisors, supervisors);
    writeJson(PATHS.map, map);
    writeJson(PATHS.index, index);
    writeJson(PATHS.state, {
      savedAt: generatedAt,
      status: plan.status,
      mode: MODE,
      plan: repoRel(PATHS.plan),
      report: repoRel(PATHS.reportMd)
    });
    writeJson(PATHS.hermes, hermes);
    writeJson(PATHS.shannon, shannon);
    writeText(PATHS.cube, cube);
    writeJson(PATHS.reportJson, report.json);
    writeText(PATHS.reportMd, report.md);
    appendNdjson(PATHS.inbox, {
      id: eventId,
      ts: generatedAt,
      from: 'asolaria',
      to: 'cognitive-engine-registry',
      verb: 'EVT-OPENMYTHOS-GASVM-FUSION',
      body: { status: plan.status, report: repoRel(PATHS.reportMd) }
    });
    appendNdjson(PATHS.outbox, {
      id: `${eventId}-hermes`,
      ts: generatedAt,
      from: 'hermes',
      to: 'cognitive-engine-registry',
      verb: hermes.packet.verb,
      body: hermes
    });
    appendNdjson(PATHS.gnnEdges, {
      id: `${eventId}-edge`,
      ts: generatedAt,
      from: 'ga_svm_classification_engine',
      to: 'openmythos_deep_reasoning_engine',
      verb: 'fusion_bridge_gac_gated',
      weight: 0.82
    });
  }

  return {
    ok: true,
    action: execute ? 'integrate' : 'preview',
    generatedAt,
    status: plan.status,
    engines: plan.engineRegistry.engines.map((engine) => engine.id),
    laws: laws.laws.map((law) => law.id),
    shannon: {
      status: shannon.status,
      consensus: shannon.consensus
    },
    outputs: {
      plan: repoRel(PATHS.plan),
      map: repoRel(PATHS.map),
      index: repoRel(PATHS.index),
      laws: repoRel(PATHS.laws),
      supervisors: repoRel(PATHS.supervisors),
      reportJson: repoRel(PATHS.reportJson),
      reportMd: repoRel(PATHS.reportMd),
      cube: repoRel(PATHS.cube)
    },
    mode: MODE
  };
}

function main(argv) {
  const action = argv[2] || 'status';
  const execute = argv.includes('--execute');
  if (action === 'status' || action === 'preview') {
    console.log(JSON.stringify(integrate({ execute: false }), null, 2));
    return;
  }
  if (action === 'integrate') {
    console.log(JSON.stringify(integrate({ execute }), null, 2));
    return;
  }
  console.error(JSON.stringify({
    ok: false,
    error: `Unknown action: ${action}`,
    usage: [
      'node tools/openmythos-gasvm-fusion-supervisor.js status',
      'node tools/openmythos-gasvm-fusion-supervisor.js integrate --execute'
    ]
  }, null, 2));
  process.exitCode = 2;
}

main(process.argv);
