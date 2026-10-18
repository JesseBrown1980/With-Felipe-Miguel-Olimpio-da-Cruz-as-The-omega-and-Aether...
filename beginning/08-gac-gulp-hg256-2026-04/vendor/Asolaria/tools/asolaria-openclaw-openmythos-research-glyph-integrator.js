#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const behcs = require('./behcs/codex-bridge');
const { runSupervisorQueue } = require('../src/omnispindleSupervisorRunner');

const ROOT = path.resolve(__dirname, '..');
const RUN_ID = 'openclaw-openmythos-mlc-gemma4-glyph-integration-20260426';
const RUN_ROOT = rel(`data/behcs/orchestration/${RUN_ID}`);
const OPENCLAW_ORCH = 'openclaw-424-room-execution-orchestration-20260426';
const OPENCLAW_INGEST = 'openclaw-v2026-4-24-ingestion-20260426';
const CASCADE_VOTE_ID = 'V6-OPENCLAW-OPENMYTHOS-MLC-GEMMA4-GLYPH-INTEGRATION';

const SOURCE_PATHS = Object.freeze({
  openclawReport: rel('reports/openclaw-v2026-4-24-ingestion-latest.json'),
  openclawModelCard: rel(`data/behcs/orchestration/${OPENCLAW_INGEST}/model-cards/openclaw-v2026-4-24-ingestion.model-card.v1.json`),
  openclawOwnership: rel(`data/behcs/orchestration/${OPENCLAW_ORCH}/wave-execution/wave-02/ownership-table.v1.json`),
  openclawTaxonomy: rel(`data/behcs/orchestration/${OPENCLAW_ORCH}/wave-execution/wave-02/diff-taxonomy.v1.json`),
  openclawPhaseBindings: rel(`data/behcs/orchestration/${OPENCLAW_ORCH}/wave-execution/wave-03/phase-supervisor-bindings.v1.json`),
  openclawProviderBoundaries: rel(`data/behcs/orchestration/${OPENCLAW_ORCH}/wave-execution/wave-03/provider-auth-boundaries.v1.json`),
  openclawDeepCascade: rel(`data/behcs/orchestration/${OPENCLAW_ORCH}/wave-execution/wave-03/deep-wave-second-cascade-result.v1.json`),
  openmythosFullReport: rel('reports/openmythos-behcs256-full-integration-latest.json'),
  openmythosFusionReport: rel('reports/openmythos-gasvm-fusion-latest.json'),
  openmythosAdapter: rel('src/cognitiveEngines/openmythosAdapter.js'),
  openmythosContract: rel('src/behcs/openMythosSupervisionContract.js'),
  openmythosSupervisors: rel('data/behcs/supervisors/openmythos/openmythos-behcs256-supervisors.v1.json'),
  openmythosFusionSupervisors: rel('data/behcs/supervisors/openmythos/openmythos-gasvm-fusion-supervisors.v1.json'),
  openmythosGlyphs: rel('data/behcs/codex/glyph-language/openmythos-behcs256.v1.json'),
  openmythosMap: rel('data/behcs/maps/openmythos/openmythos-behcs256-map.v1.json'),
  openmythosFusionMap: rel('data/behcs/maps/openmythos/openmythos-gasvm-fusion-map.v1.json'),
  existingDeepWaveCrosswalk: rel('data/behcs/index/deep-wave-master-plan-crosswalk.v1.json'),
  deepCascadeVote: rel(`data/votes/${CASCADE_VOTE_ID}/behcs-v6-candidate-file.json`)
});

const PATHS = Object.freeze({
  runRoot: RUN_ROOT,
  integration: path.join(RUN_ROOT, 'research-glyph-integration.v1.json'),
  modelGlyphsJson: path.join(RUN_ROOT, 'model-glyphs.v1.json'),
  modelGlyphsNdjson: path.join(RUN_ROOT, 'model-glyphs.v1.ndjson'),
  alphabetJson: path.join(RUN_ROOT, 'behcs256-lettered-glyph-alphabet-246.v1.json'),
  supervisors: rel('data/behcs/supervisors/openclaw/openclaw-openmythos-mlc-gemma4-integration-supervisors.v1.json'),
  supervisorQueue: path.join(RUN_ROOT, 'supervisor-queue.ndjson'),
  supervisorDecisions: path.join(RUN_ROOT, 'supervisor-decisions-latest.ndjson'),
  supervisorWorkerReady: path.join(RUN_ROOT, 'supervisor-worker-ready-latest.ndjson'),
  supervisorMap: path.join(RUN_ROOT, 'supervisor-runner-map-latest.json'),
  supervisorState: path.join(RUN_ROOT, 'supervisor-runner.state.json'),
  supervisorHermes: path.join(RUN_ROOT, 'supervisor-runner-hermes-latest.json'),
  supervisorShannon: path.join(RUN_ROOT, 'supervisor-runner-shannon-latest.json'),
  supervisorCube: path.join(RUN_ROOT, 'supervisor-runner.cube.js'),
  supervisorReportJson: path.join(RUN_ROOT, 'supervisor-runner-latest.json'),
  supervisorReportMd: path.join(RUN_ROOT, 'supervisor-runner-latest.md'),
  deepCascadeInput: path.join(RUN_ROOT, 'deep-wave-openclaw-openmythos-mlc-gemma4-input.v1.json'),
  deepCascadeResult: path.join(RUN_ROOT, 'deep-wave-openclaw-openmythos-mlc-gemma4-result.v1.json'),
  stagingPlan: path.join(RUN_ROOT, 'd-sovereignty-liris-staging-plan.v1.json'),
  memory: rel('data/behcs/memory/openclaw-openmythos-mlc-gemma4-glyph-integration.v1.json'),
  index: rel('data/behcs/index/openclaw-openmythos-mlc-gemma4-glyph-integration-index.v1.json'),
  map: rel('data/behcs/maps/asolaria/openclaw-openmythos-mlc-gemma4-glyph-integration-map-map-mapped.v1.json'),
  cube: rel('data/behcs/cubes/openclaw-openmythos-mlc-gemma4-glyph-integration-cube-cubed.cube.js'),
  glpj: rel('data/behcs/codex/glyph-language/openclaw-openmythos-mlc-gemma4-behcs256.glpj.json'),
  gnnEdges: rel('data/behcs/gnn-live-edges.ndjson'),
  inbox: rel('data/behcs/inbox.ndjson'),
  reportJson: rel('reports/openclaw-openmythos-mlc-gemma4-glyph-integration-latest.json'),
  reportMd: rel('reports/openclaw-openmythos-mlc-gemma4-glyph-integration-latest.md')
});

const SOURCE_ANCHORS = Object.freeze({
  openclaw: {
    id: 'openclaw-v2026.4.24-local-git',
    url: 'https://github.com/openclaw/openclaw/releases/tag/v2026.4.24',
    localClone: 'C:/Users/acer/OpenClaw-v2026.4.24',
    release: 'v2026.4.24',
    head: 'cbcfdf62c7297bda66009ea7476f053c3e9addab',
    verifiedBy: ['local_git_tag_points_at_head', 'local_diff_index']
  },
  openmythos: {
    id: 'openmythos-behcs256-local-contract',
    url: 'https://github.com/kyegomez/OpenMythos',
    localSurfaces: [
      'src/cognitiveEngines/openmythosAdapter.js',
      'src/behcs/openMythosSupervisionContract.js',
      'data/behcs/supervisors/openmythos/openmythos-behcs256-supervisors.v1.json'
    ],
    rootLaw: 'LAW-099-openmythos-recurrence-stability'
  },
  mlc: {
    id: 'lake-baroni-mlc-2023',
    url: 'https://www.nature.com/articles/s41586-023-06668-3',
    title: 'Human-like systematic generalization through a meta-learning neural network',
    authors: ['Brenden M. Lake', 'Marco Baroni'],
    published: '2023-10-25',
    formulaFamily: 'meta_learning_for_compositionality'
  },
  gemma4: {
    id: 'google-gemma4-2026',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/',
    docs: 'https://developers.googleblog.com/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/',
    published: '2026-04-02',
    provider: 'Google DeepMind',
    boundary: 'official_terms_and_legitimate_runtime_only'
  }
});

const MLC_OPERATORS = Object.freeze([
  ['MLC_EPISODE_STREAM', 'Generate a dynamic stream of few-shot compositional tasks.'],
  ['MLC_SUPPORT_SET_BIND', 'Bind support examples as explicit in-context grammar evidence.'],
  ['MLC_QUERY_HOLDOUT', 'Hold out novel combinations to test systematic generalization.'],
  ['MLC_RULE_INDUCTION', 'Infer latent compositional rules from observed examples.'],
  ['MLC_META_UPDATE', 'Optimize the learner for flexible algebraic reuse.'],
  ['MLC_SYSTEMATICITY_SCORE', 'Score exact and near-human systematic generalization.'],
  ['MLC_ERROR_PATTERN_REVIEW', 'Compare model errors with human-like inductive-bias patterns.']
]);

const GEMMA4_BOUNDARIES = Object.freeze([
  ['GEMMA4_AGENTIC_EDGE', 'Use Gemma 4 as an on-device/edge candidate only through official model access paths.'],
  ['GEMMA4_MULTIMODAL_EDGE', 'Track visual/audio/text capability as a model-card field, not as an assumed runtime.'],
  ['GEMMA4_LANG140', 'Treat broad language coverage as selector metadata requiring local smoke proof.'],
  ['GEMMA4_APACHE2_SOURCE', 'Record license/terms route before download, tuning, derivative, or hosted use.'],
  ['GEMMA4_NO_UNPROVEN_EXECUTION', 'Do not claim Gemma 4 execution until weights/runtime/smoke evidence exist.'],
  ['GEMMA4_SUPERVISOR_ROUTE', 'Route Gemma 4 through selector, model-card gate, Shannon, and reverse-gain review.']
]);

function rel(p) {
  return path.join(ROOT, p);
}

function repoRel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function writeNdjson(filePath, rows) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return fallback;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function glyph(kind, id, seed = '') {
  const hash = sha256(`${kind}:${id}:${seed}`);
  return `HG256:${kind.toUpperCase()}:${hash.slice(0, 8).toUpperCase()}:${behcs.hilbertAddress(hash)}`;
}

function countValues(values) {
  const counts = {};
  for (const value of values) {
    const key = String(value || 'unknown');
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topEntries(counts, limit = 8) {
  return Object.entries(counts || {}).slice(0, limit).map(([id, count]) => ({ id, count }));
}

function buildAlphabet(generatedAt) {
  return Array.from({ length: 246 }, (_, index) => {
    const ordinal = index + 1;
    const id = `BEHCS256-LETTER-${String(ordinal).padStart(3, '0')}`;
    return {
      id,
      ordinal,
      letter: `G${String(ordinal).padStart(3, '0')}`,
      glyph: glyph('lettered_glyph', id, generatedAt),
      semanticClass: ordinal <= 64
        ? 'core_operator'
        : ordinal <= 128
          ? 'model_research'
          : ordinal <= 192
            ? 'supervisor_gate'
            : 'staging_recovery',
      usage: 'BEHCS-256 lettered glyph alphabet for OpenClaw/OpenMythos/MLC/Gemma4 integration packets.'
    };
  });
}

function loadInputs() {
  const taxonomyDoc = readJson(SOURCE_PATHS.openclawTaxonomy, { rows: [] });
  const ownershipDoc = readJson(SOURCE_PATHS.openclawOwnership, { ownershipRows: [] });
  const phaseDoc = readJson(SOURCE_PATHS.openclawPhaseBindings, { phaseBindings: [] });
  const providerDoc = readJson(SOURCE_PATHS.openclawProviderBoundaries, { providerBoundaries: [] });
  const mythosGlyphDoc = readJson(SOURCE_PATHS.openmythosGlyphs, { verbs: [] });
  const mythosSupervisorsDoc = readJson(SOURCE_PATHS.openmythosSupervisors, { supervisors: [] });
  const mythosFusionSupervisorsDoc = readJson(SOURCE_PATHS.openmythosFusionSupervisors, { supervisors: [] });
  return {
    openclawReport: readJson(SOURCE_PATHS.openclawReport, {}),
    openclawModelCard: readJson(SOURCE_PATHS.openclawModelCard, {}),
    taxonomyRows: Array.isArray(taxonomyDoc.rows) ? taxonomyDoc.rows : [],
    ownershipRows: Array.isArray(ownershipDoc.ownershipRows) ? ownershipDoc.ownershipRows : [],
    phaseBindings: Array.isArray(phaseDoc.phaseBindings) ? phaseDoc.phaseBindings : [],
    providerBoundaries: Array.isArray(providerDoc.providerBoundaries) ? providerDoc.providerBoundaries : [],
    openclawDeepCascade: readJson(SOURCE_PATHS.openclawDeepCascade, {}),
    openmythosFullReport: readJson(SOURCE_PATHS.openmythosFullReport, {}),
    openmythosFusionReport: readJson(SOURCE_PATHS.openmythosFusionReport, {}),
    openmythosAdapterSha: sha256(readText(SOURCE_PATHS.openmythosAdapter)),
    openmythosContractSha: sha256(readText(SOURCE_PATHS.openmythosContract)),
    openmythosGlyphs: Array.isArray(mythosGlyphDoc.verbs) ? mythosGlyphDoc.verbs : [],
    openmythosSupervisors: Array.isArray(mythosSupervisorsDoc.supervisors) ? mythosSupervisorsDoc.supervisors : [],
    openmythosFusionSupervisors: Array.isArray(mythosFusionSupervisorsDoc.supervisors) ? mythosFusionSupervisorsDoc.supervisors : [],
    openmythosMap: readJson(SOURCE_PATHS.openmythosMap, {}),
    openmythosFusionMap: readJson(SOURCE_PATHS.openmythosFusionMap, {}),
    existingDeepWaveCrosswalk: readJson(SOURCE_PATHS.existingDeepWaveCrosswalk, {}),
    integrationCascadeVote: readJson(SOURCE_PATHS.deepCascadeVote, null)
  };
}

function buildOpenClawGlyphs(inputs) {
  return inputs.ownershipRows.map((row, index) => ({
    id: `openclaw-category-${row.category || index}`,
    family: 'openclaw_424',
    source: SOURCE_ANCHORS.openclaw.id,
    ordinal: index + 1,
    subject: row.category || 'unknown',
    glyph: glyph('openclaw_category', row.category || index, `${row.count}:${row.primaryOwner}`),
    supervisor: row.primaryOwner || 'selector',
    targetPhase: row.targetPhase || '',
    changedFiles: row.count || 0,
    formula: `OPENCLAW_CATEGORY ${row.category || 'unknown'} OWNER ${row.primaryOwner || 'unknown'} FILES ${row.count || 0}`,
    gates: [
      'source_diff_required',
      'model_card_required',
      'provider_auth_boundary_required',
      'reverse_gain_before_edit'
    ],
    evidence: row.sampleFiles || []
  }));
}

function buildOpenMythosGlyphs(inputs) {
  return inputs.openmythosGlyphs.map((verb, index) => ({
    id: `openmythos-verb-${verb.verb || index}`,
    family: 'openmythos',
    source: SOURCE_ANCHORS.openmythos.id,
    ordinal: index + 1,
    subject: verb.verb || 'MYTHOS_UNKNOWN',
    glyph: verb.glyph || glyph('openmythos_verb', verb.verb || index, SOURCE_ANCHORS.openmythos.rootLaw),
    supervisor: 'Hermes OpenMythos Supervisor',
    rootLaw: SOURCE_ANCHORS.openmythos.rootLaw,
    formula: `MYTHOS_VERB ${verb.verb || 'UNKNOWN'} LAW ${SOURCE_ANCHORS.openmythos.rootLaw}`,
    gates: [
      'pid_binding',
      'law099_spectral_stability',
      'drift_broadcast',
      'gac',
      'shannon',
      'white_room'
    ],
    evidence: [repoRel(SOURCE_PATHS.openmythosGlyphs), repoRel(SOURCE_PATHS.openmythosSupervisors)]
  }));
}

function buildMlcGlyphs() {
  return MLC_OPERATORS.map(([operator, meaning], index) => ({
    id: `mlc-operator-${operator.toLowerCase()}`,
    family: 'mlc_research_formula',
    source: SOURCE_ANCHORS.mlc.id,
    ordinal: index + 1,
    subject: operator,
    glyph: glyph('mlc_operator', operator, SOURCE_ANCHORS.mlc.url),
    supervisor: 'vector.research_formula_supervisor',
    formula: `${operator} :: SUPPORT_SET + QUERY_SET + COMPOSITIONAL_HOLDOUT -> META_UPDATE -> SYSTEMATIC_GENERALIZATION_REVIEW`,
    meaning,
    gates: [
      'paper_source_anchor_required',
      'formula_not_model_execution',
      'synthetic_first_benchmark',
      'human_like_claim_requires_eval'
    ],
    evidence: [SOURCE_ANCHORS.mlc.url]
  }));
}

function buildGemma4Glyphs() {
  return GEMMA4_BOUNDARIES.map(([boundary, meaning], index) => ({
    id: `gemma4-boundary-${boundary.toLowerCase()}`,
    family: 'gemma4_model_boundary',
    source: SOURCE_ANCHORS.gemma4.id,
    ordinal: index + 1,
    subject: boundary,
    glyph: glyph('gemma4_boundary', boundary, SOURCE_ANCHORS.gemma4.url),
    supervisor: 'selector.model_card_gate',
    formula: `${boundary} :: OFFICIAL_SOURCE + MODEL_CARD + TERMS + LOCAL_SMOKE -> SELECTOR_ROUTE`,
    meaning,
    gates: [
      'official_source_anchor_required',
      'license_terms_review_required',
      'no_unproven_runtime_claim',
      'no_external_call_without_configured_connector'
    ],
    evidence: [SOURCE_ANCHORS.gemma4.url, SOURCE_ANCHORS.gemma4.docs]
  }));
}

function buildModelGlyphs(inputs) {
  const openclawGlyphs = buildOpenClawGlyphs(inputs);
  const openmythosGlyphs = buildOpenMythosGlyphs(inputs);
  const mlcGlyphs = buildMlcGlyphs();
  const gemma4Glyphs = buildGemma4Glyphs();
  return {
    openclawGlyphs,
    openmythosGlyphs,
    mlcGlyphs,
    gemma4Glyphs,
    all: [...openclawGlyphs, ...openmythosGlyphs, ...mlcGlyphs, ...gemma4Glyphs]
  };
}

function buildSupervisors(inputs, modelGlyphs, generatedAt) {
  const specs = [
    ['openclaw_release_freeze', 'OpenClaw v2026.4.24 release freeze and diff truth', 'OpenClaw 4.24 source state must stay tied to local tag/head and diff evidence before code adoption.'],
    ['openclaw_model_glyphs', 'OpenClaw model glyph minter', 'OpenClaw category, provider, model-catalog, Codex-harness, memory, browser, and gateway deltas become reviewable BEHCS glyphs.'],
    ['openmythos_overlay', 'OpenMythos supervisor overlay', 'OpenMythos verbs, LAW-099, recurrent-depth gates, drift, GAC, Shannon, and white-room controls remain active above OpenClaw ingestion.'],
    ['mlc_formula_bridge', 'MLC formula bridge', 'Lake-Baroni MLC operators become synthetic-first research formulas for systematicity tests, not unproven runtime claims.'],
    ['gemma4_model_boundary', 'Gemma 4 model boundary', 'Gemma 4 is registered as a new model-family candidate through official source, license, model-card, selector, and smoke gates only.'],
    ['brown_hilbert_room_route', 'Brown-Hilbert room route', 'Right-open room addressing binds glyph, supervisor, white-room, and GC work without allocating infinite resources.'],
    ['super_white_room_gc', 'Super white-room and GC seal', 'Contradictions, provider/auth claims, and model-execution uncertainty route into white-room notes and GC-safe artifacts.'],
    ['d_liris_sovereignty_staging', 'D/Liris sovereignty staging', 'D drive and Liris receive staging manifests only until explicit write/copy authorization and path proof exist.'],
    ['hermes_omnishannon_gnn_heal', 'Hermes OmniShannon GNN heal', 'Hermes sees OpenClaw, OpenMythos, MLC, Gemma4, GNN, reverse-gain, Shannon, and supervisor artifacts as one healing packet.']
  ];
  return {
    supervisorSetId: 'openclaw-openmythos-mlc-gemma4-integration-supervisors.v1',
    generatedAt,
    status: 'SUPERVISORS_MINTED_EXECUTION_GATED',
    sources: SOURCE_ANCHORS,
    supervisors: specs.map(([id, title, purpose], index) => ({
      id: `openclaw_openmythos.${id}.supervisor`,
      title,
      purpose,
      pid: `BH.OPENCLAW.OPENMYTHOS.${String(index + 1).padStart(3, '0')}`,
      glyph: glyph('integration_supervisor', id, purpose),
      authority: 'observe_plan_verify_only',
      laws: [
        'LAW-001-bus-owned-by-daemon',
        'LAW-099-openmythos-recurrence-stability',
        'model-card-gate',
        'reverse-gain-before-edit',
        'no-provider-auth-bypass'
      ],
      observes: [
        repoRel(PATHS.integration),
        repoRel(PATHS.modelGlyphsJson),
        repoRel(PATHS.stagingPlan),
        repoRel(PATHS.deepCascadeInput)
      ],
      emits: [
        'supervisor_decision',
        'worker_ready_when_allowed',
        'white_room_note',
        'gnn_edge',
        'gc_safe_artifact'
      ],
      modelGlyphFamilies: Object.keys(modelGlyphs).filter((key) => key !== 'all')
    }))
  };
}

function buildSupervisorQueue(generatedAt) {
  const allowedPaths = [
    repoRel(RUN_ROOT),
    'data/behcs/memory',
    'data/behcs/index',
    'data/behcs/maps/asolaria',
    'data/behcs/cubes',
    'data/behcs/codex/glyph-language',
    'data/behcs/supervisors/openclaw',
    'reports',
    'TASKS.md'
  ];
  const expectedArtifacts = [
    repoRel(PATHS.integration),
    repoRel(PATHS.modelGlyphsJson),
    repoRel(PATHS.alphabetJson),
    repoRel(PATHS.supervisors),
    repoRel(PATHS.deepCascadeInput),
    repoRel(PATHS.stagingPlan),
    repoRel(PATHS.memory),
    repoRel(PATHS.index),
    repoRel(PATHS.map),
    repoRel(PATHS.cube),
    repoRel(PATHS.glpj),
    repoRel(PATHS.reportMd)
  ];
  const packets = [
    ['glyph-minter', 'Mint OpenClaw/OpenMythos/MLC/Gemma4 glyphs and the 246-letter BEHCS alphabet.'],
    ['mythos-overlay', 'Verify OpenMythos LAW-099 and recurrent-depth supervisor overlay remains above the integration.'],
    ['research-formula', 'Bind MLC operators as synthetic-first research formulas for compositionality.'],
    ['gemma4-selector', 'Bind Gemma 4 as a model-family candidate behind official terms, model-card, and selector gates.'],
    ['brown-hilbert-route', 'Bind the integration to right-open Brown-Hilbert room routing without resource overcommit.'],
    ['white-room-gc', 'Seal contradictions, reverse-gain risks, super-white-room notes, and GC-safe artifact ownership.'],
    ['d-liris-staging', 'Prepare D-drive and Liris staging manifests without copying or writing outside C in this pass.'],
    ['hermes-omnishannon-gnn', 'Publish the Hermes/OmniShannon/GNN healing packet for the next bounded wave.']
  ];
  return packets.map(([suffix, objective], index) => ({
    id: `ASO-OPENCLAW-OPENMYTHOS-${suffix.toUpperCase()}`,
    title: `OpenClaw/OpenMythos integration supervisor packet ${index + 1}`,
    objective,
    requestedWorker: `local_integration_reviewer:${suffix}`,
    instructions: `INTEGRATE_GLYPH_RESEARCH ${suffix} RUN ${RUN_ID} GENERATED ${generatedAt}`,
    pid: `BH.OPENCLAW.OPENMYTHOS.INTEGRATION.${String(index + 1).padStart(3, '0')}`,
    pidScope: 'local_research_glyph_integration_only',
    consentScope: 'operator_authorized_local_orchestration',
    allowedPaths,
    expectedArtifacts,
    acceptanceGates: [
      'node --check tools/asolaria-openclaw-openmythos-research-glyph-integrator.js',
      'JSON surfaces parse',
      'supervisor queue returns ALLOW or explicit hold',
      'no external model execution claimed',
      'no D or Liris write in this pass'
    ],
    proofRequired: true,
    proofRefs: [
      repoRel(SOURCE_PATHS.openclawReport),
      repoRel(SOURCE_PATHS.openclawOwnership),
      repoRel(SOURCE_PATHS.openclawPhaseBindings),
      repoRel(SOURCE_PATHS.openmythosSupervisors),
      repoRel(SOURCE_PATHS.openmythosGlyphs)
    ],
    operatorApproval: true,
    syntheticFirstEvidence: true,
    modelCard: true,
    providerAuthMode: 'official_or_existing_local_runtime_only',
    legitimateCliEvidence: false,
    freeMethod: false,
    remoteMutation: false,
    externalApiCall: false,
    cloudUpload: false,
    deviceAccess: false,
    liveEeg: false,
    liveHumanData: false,
    downloads: false,
    installs: false,
    writesGit: false,
    deletesEvidence: false,
    sensitiveData: false,
    secretMaterial: false,
    bypassAuth: false,
    bypassPayment: false,
    needsCloudWorker: false,
    taskType: 'openclaw_openmythos_research_glyph_integration',
    source: RUN_ID
  }));
}

function buildStagingPlan(generatedAt) {
  return {
    planId: 'd-sovereignty-liris-staging-plan.v1',
    generatedAt,
    status: 'STAGING_PLAN_ONLY_NO_COPY_PERFORMED',
    cDriveAuthority: {
      finalGlyphs: [
        repoRel(PATHS.glpj),
        repoRel(PATHS.modelGlyphsJson),
        repoRel(PATHS.alphabetJson),
        repoRel(PATHS.cube),
        repoRel(PATHS.map)
      ],
      reason: 'C is canonical Asolaria development root in this workspace.'
    },
    proposedDDriveTargets: [
      'D:/Asolaria-Sovereignty/OpenClaw-424-Glyphs',
      'D:/Asolaria-Sovereignty/Research/MLC-Gemma4-OpenMythos',
      'D:/Asolaria-Sovereignty/Cascades/behcs-v6'
    ],
    lirisTargets: [
      '//DESKTOP-PTSQTIE/liris-asolaria/data/behcs/orchestration/openclaw-openmythos-mlc-gemma4-glyph-integration-20260426',
      '//DESKTOP-PTSQTIE/liris-asolaria/data/behcs/codex/glyph-language',
      '//DESKTOP-PTSQTIE/liris-asolaria/reports'
    ],
    gatesBeforeAnyCopy: [
      'operator_explicit_copy_authorization',
      'destination_path_probe',
      'sha256_manifest_before_copy',
      'sha256_manifest_after_copy',
      'no_overwrite_without_destination_cosign',
      'no_secret_material_in_bundle'
    ],
    currentPassActions: [
      'created_manifest_only',
      'no_d_drive_write',
      'no_liris_write',
      'no_remote_mutation'
    ]
  };
}

function buildIntegration(inputs, modelGlyphs, alphabet, supervisors, stagingPlan, generatedAt) {
  const categoryCounts = countValues(inputs.taxonomyRows.map((row) => row.category));
  const ownerCounts = countValues(inputs.taxonomyRows.map((row) => row.primaryOwner));
  const providerRows = inputs.providerBoundaries.reduce((sum, row) => sum + Number(row.rowCount || 0), 0);
  const deepWave = inputs.openclawDeepCascade?.summary || null;
  const cascadeVote = inputs.integrationCascadeVote ? {
    voteId: inputs.integrationCascadeVote.vote_id,
    totalBeats: inputs.integrationCascadeVote.totalBeats,
    candidatesScanned: inputs.integrationCascadeVote.candidatesScanned,
    executorDispatches: inputs.integrationCascadeVote.executorDispatches,
    busAlive: inputs.integrationCascadeVote.liveState?.busAlive,
    federationAlive: inputs.integrationCascadeVote.liveState?.federationAlive,
    collapseDetected: inputs.integrationCascadeVote.liveState?.collapseDetected,
    weakestDims: Array.from(new Set((inputs.integrationCascadeVote.results || [])
      .map((result) => result.selfReflection?.weakestOverall?.dim)
      .filter(Boolean))),
    verdicts: (inputs.integrationCascadeVote.results || []).map((result) => ({
      candidateId: result.candidate_id,
      verdict: result.verdict,
      confidence: result.avgConfidence,
      beats: result.totalBeats
    }))
  } : null;
  return {
    integrationId: `${RUN_ID}.v1`,
    generatedAt,
    status: 'OPENCLAW_OPENMYTHOS_MLC_GEMMA4_GLYPHS_WIRED_SUPERVISOR_GATED',
    sources: SOURCE_ANCHORS,
    openclaw: {
      release: inputs.openclawReport.release || SOURCE_ANCHORS.openclaw.release,
      cloneHead: inputs.openclawReport.cloneHead || SOURCE_ANCHORS.openclaw.head,
      changedFileCount: inputs.openclawReport.changedFileCount || inputs.taxonomyRows.length,
      taxonomyRows: inputs.taxonomyRows.length,
      ownershipRows: inputs.ownershipRows.length,
      phaseSupervisorBindings: inputs.phaseBindings.length,
      providerBoundaries: inputs.providerBoundaries.length,
      providerRows,
      topCategories: topEntries(categoryCounts, 10),
      topOwners: topEntries(ownerCounts, 10),
      priorDeepCascade: deepWave ? {
        voteId: deepWave.voteId,
        totalBeats: deepWave.totalBeats,
        candidatesScanned: deepWave.candidatesScanned,
        executorDispatches: deepWave.executorDispatches,
        weakestDims: deepWave.weakestDims
      } : null
    },
    openmythos: {
      status: inputs.openmythosFullReport.status || 'LOCAL_SURFACES_PRESENT',
      fusionStatus: inputs.openmythosFusionReport.status || 'LOCAL_FUSION_SURFACES_PRESENT',
      glyphVerbs: inputs.openmythosGlyphs.length,
      supervisors: inputs.openmythosSupervisors.length,
      fusionSupervisors: inputs.openmythosFusionSupervisors.length,
      adapterSha256: inputs.openmythosAdapterSha,
      contractSha256: inputs.openmythosContractSha,
      rootLaw: SOURCE_ANCHORS.openmythos.rootLaw
    },
    researchFormulas: {
      mlcOperators: MLC_OPERATORS.map(([operator]) => operator),
      gemma4Boundaries: GEMMA4_BOUNDARIES.map(([boundary]) => boundary)
    },
    glyphs: {
      letteredAlphabet: alphabet.length,
      openclaw: modelGlyphs.openclawGlyphs.length,
      openmythos: modelGlyphs.openmythosGlyphs.length,
      mlc: modelGlyphs.mlcGlyphs.length,
      gemma4: modelGlyphs.gemma4Glyphs.length,
      totalModelGlyphs: modelGlyphs.all.length
    },
    supervisors: {
      minted: supervisors.supervisors.length,
      status: supervisors.status
    },
    cascadeVote,
    stagingPlan: {
      status: stagingPlan.status,
      proposedDDriveTargets: stagingPlan.proposedDDriveTargets,
      lirisTargets: stagingPlan.lirisTargets,
      currentPassActions: stagingPlan.currentPassActions
    },
    boundary: {
      localArtifactsOnly: true,
      externalApiCall: false,
      downloads: false,
      installs: false,
      providerAuthBypass: false,
      paymentBypass: false,
      remoteMutation: false,
      dDriveWrite: false,
      lirisWrite: false,
      realWorkerProcessStorm: false,
      modelExecutionClaimed: false
    }
  };
}

function buildDeepCascadeInput(integration, generatedAt) {
  return {
    vote_id: CASCADE_VOTE_ID,
    taskId: RUN_ID,
    planId: RUN_ID,
    generatedAt,
    mode: 'openclaw-openmythos-mlc-gemma4-glyph-integration',
    purpose: 'Run the OpenClaw/OpenMythos/MLC/Gemma4 glyph integration through Brown-Hilbert deep cascade, OmniShannon, GNN, reverse-gain, super-white-room, and GC review.',
    waveShape: '6x6x6x6x6x12',
    chain: [
      'brown_hilbert_rooms',
      'omnishannon',
      'gnn',
      'reverse_gain_gnn',
      'super_white_room',
      'gc'
    ],
    executionPolicy: {
      planningOnly: true,
      executorDispatches: false,
      spawnWorkers: false,
      externalApiCall: false,
      downloads: false,
      installs: false,
      remoteMutation: false,
      dDriveWrites: false,
      lirisWrites: false
    },
    candidates: [
      {
        id: 'openclaw-model-glyph-absorption',
        label: 'OpenClaw 4.24 model glyph absorption',
        metadata: { proof_artifact: repoRel(PATHS.modelGlyphsJson), scope_hours: 0.5, count: integration.glyphs.openclaw },
        cube: 2571353,
        expected_outcome: 'OpenClaw release deltas are glyph-indexed before implementation waves.',
        next_step: 'Feed model-glyph rows into wave-04 language/gateway pairing.'
      },
      {
        id: 'openmythos-supervisor-overlay',
        label: 'OpenMythos LAW-099 supervisor overlay',
        metadata: { proof_artifact: repoRel(PATHS.supervisors), scope_hours: 0.5, count: integration.openmythos.supervisors },
        cube: 3307949,
        expected_outcome: 'OpenMythos remains a gated cognitive engine above OpenClaw ingestion.',
        next_step: 'Keep recurrent-depth execution blocked until weights/config/smoke evidence exists.'
      },
      {
        id: 'mlc-compositionality-formula-bridge',
        label: 'MLC compositionality formula bridge',
        metadata: { proof_artifact: SOURCE_ANCHORS.mlc.url, scope_hours: 0.5, count: integration.researchFormulas.mlcOperators.length },
        cube: 493039,
        expected_outcome: 'Research formulas become synthetic-first benchmarks for systematic generalization.',
        next_step: 'Design local benchmark harness before any model claim.'
      },
      {
        id: 'gemma4-model-family-boundary',
        label: 'Gemma 4 model-family boundary',
        metadata: { proof_artifact: SOURCE_ANCHORS.gemma4.url, scope_hours: 0.5, count: integration.researchFormulas.gemma4Boundaries.length },
        cube: 226981,
        expected_outcome: 'Gemma 4 enters selector/model-card space without unverified runtime execution.',
        next_step: 'Only route through official model access, terms, and local smoke evidence.'
      },
      {
        id: 'd-sovereignty-liris-staging',
        label: 'D drive and Liris staging plan',
        metadata: { proof_artifact: repoRel(PATHS.stagingPlan), scope_hours: 0.5 },
        cube: 3581577,
        expected_outcome: 'Sovereignty staging is recoverable without writing remote or non-C roots.',
        next_step: 'Wait for explicit copy authorization and destination hash proof.'
      },
      {
        id: 'supervisor-hermes-omnishannon-gnn-heal',
        label: 'Hermes OmniShannon GNN healing packet',
        metadata: { proof_artifact: repoRel(PATHS.integration), scope_hours: 0.5, count: integration.supervisors.minted },
        cube: 7189057,
        expected_outcome: 'Hermes sees one coherent integration packet across supervisors, GNN, Shannon, white-room, and GC.',
        next_step: 'Proceed to bounded wave-04 only after this candidate-file vote is absorbed.'
      }
    ]
  };
}

function buildMap(integration, modelGlyphs, generatedAt) {
  const nodes = [
    { id: 'openclaw-v2026.4.24', kind: 'source', label: 'OpenClaw v2026.4.24' },
    { id: 'openmythos', kind: 'engine', label: 'OpenMythos cognitive engine' },
    { id: 'mlc-2023', kind: 'research_formula', label: 'MLC systematic generalization' },
    { id: 'gemma4-2026', kind: 'model_family', label: 'Gemma 4' },
    { id: 'behcs256-glyphs', kind: 'language', label: 'BEHCS-256 glyph language' },
    { id: 'supervisors', kind: 'authority', label: 'OpenClaw/OpenMythos integration supervisors' },
    { id: 'd-liris-staging', kind: 'staging', label: 'D drive and Liris staging plan' },
    { id: 'hermes-omnishannon-gnn', kind: 'healing', label: 'Hermes OmniShannon GNN heal packet' }
  ];
  const glyphNodes = modelGlyphs.all.slice(0, 64).map((row) => ({
    id: `glyph:${row.id}`,
    kind: 'glyph',
    family: row.family,
    label: row.subject
  }));
  const edges = [
    ['openclaw-v2026.4.24', 'behcs256-glyphs', 'mints_openclaw_model_glyphs'],
    ['openmythos', 'supervisors', 'extends_supervisor_overlay'],
    ['mlc-2023', 'behcs256-glyphs', 'adds_compositionality_formula_operators'],
    ['gemma4-2026', 'supervisors', 'adds_model_family_boundary'],
    ['behcs256-glyphs', 'hermes-omnishannon-gnn', 'feeds_healing_packet'],
    ['supervisors', 'hermes-omnishannon-gnn', 'gates_cascade'],
    ['d-liris-staging', 'hermes-omnishannon-gnn', 'stages_recoverable_handoff']
  ].map(([from, to, relation]) => ({ from, to, relation }));
  for (const row of glyphNodes) {
    edges.push({ from: row.id, to: 'behcs256-glyphs', relation: 'member_of_model_glyph_set' });
  }
  return {
    mapId: 'openclaw-openmythos-mlc-gemma4-glyph-integration-map-map-mapped.v1',
    generatedAt,
    status: 'MAP_MAP_MAPPED',
    summary: {
      modelGlyphs: integration.glyphs.totalModelGlyphs,
      alphabetGlyphs: integration.glyphs.letteredAlphabet,
      supervisors: integration.supervisors.minted
    },
    nodes: [...nodes, ...glyphNodes],
    edges
  };
}

function buildGlpj(integration, modelGlyphs, alphabet, generatedAt) {
  return {
    programId: 'openclaw-openmythos-mlc-gemma4-behcs256.glpj',
    generatedAt,
    status: 'GLPJ_MINTED',
    language: 'BEHCS-256',
    alphabet: alphabet.map((row) => ({
      letter: row.letter,
      glyph: row.glyph,
      semanticClass: row.semanticClass
    })),
    verbs: [
      'ABSORB_OPENCLAW_MODEL_GLYPH',
      'OVERLAY_OPENMYTHOS_LAW099',
      'BIND_MLC_COMPOSITIONAL_FORMULA',
      'REGISTER_GEMMA4_MODEL_BOUNDARY',
      'ROUTE_BROWN_HILBERT_ROOM',
      'RUN_SUPERVISOR_GATE',
      'OMNISHANNON_GNN_REVIEW',
      'REVERSE_GAIN_BEFORE_EDIT',
      'SUPER_WHITE_ROOM_CONTRADICTION',
      'GC_SAFE_ARTIFACT',
      'STAGE_D_LIRIS_MANIFEST_ONLY'
    ],
    sentences: [
      `ABSORB_OPENCLAW_MODEL_GLYPH RELEASE ${integration.openclaw.release} FILES ${integration.openclaw.changedFileCount}`,
      `OVERLAY_OPENMYTHOS_LAW099 VERBS ${integration.openmythos.glyphVerbs} SUPERVISORS ${integration.openmythos.supervisors}`,
      `BIND_MLC_COMPOSITIONAL_FORMULA OPERATORS ${integration.researchFormulas.mlcOperators.length}`,
      `REGISTER_GEMMA4_MODEL_BOUNDARY SOURCE ${SOURCE_ANCHORS.gemma4.id}`,
      `RUN_SUPERVISOR_GATE SUPERVISORS ${integration.supervisors.minted} GLYPHS ${integration.glyphs.totalModelGlyphs}`,
      `STAGE_D_LIRIS_MANIFEST_ONLY D_WRITE false LIRIS_WRITE false`
    ],
    modelGlyphSentences: modelGlyphs.all.map((row) => row.formula)
  };
}

function buildReportMd(integration) {
  const lines = [
    '# OpenClaw + OpenMythos + MLC + Gemma4 Glyph Integration',
    '',
    `Generated: ${integration.generatedAt}`,
    '',
    `Status: ${integration.status}`,
    '',
    '## Counts',
    '',
    `- OpenClaw release: ${integration.openclaw.release}`,
    `- OpenClaw changed files: ${integration.openclaw.changedFileCount}`,
    `- OpenClaw taxonomy rows: ${integration.openclaw.taxonomyRows}`,
    `- OpenClaw phase supervisor bindings: ${integration.openclaw.phaseSupervisorBindings}`,
    `- OpenClaw provider boundaries: ${integration.openclaw.providerBoundaries}`,
    `- OpenMythos glyph verbs: ${integration.openmythos.glyphVerbs}`,
    `- OpenMythos supervisors: ${integration.openmythos.supervisors}`,
    `- MLC operators: ${integration.researchFormulas.mlcOperators.length}`,
    `- Gemma4 boundaries: ${integration.researchFormulas.gemma4Boundaries.length}`,
    `- BEHCS lettered glyph alphabet: ${integration.glyphs.letteredAlphabet}`,
    `- Model glyphs: ${integration.glyphs.totalModelGlyphs}`,
    `- Integration supervisors: ${integration.supervisors.minted}`,
    '',
    '## Deep Cascade',
    '',
    integration.cascadeVote
      ? `- ${integration.cascadeVote.voteId}: candidates=${integration.cascadeVote.candidatesScanned}; beats=${integration.cascadeVote.totalBeats}; dispatches=${integration.cascadeVote.executorDispatches}; weakest=${integration.cascadeVote.weakestDims.join(', ')}`
      : '- Candidate-file input prepared; cascade vote not absorbed yet.',
    '',
    '## Sources',
    '',
    `- OpenClaw local clone: ${SOURCE_ANCHORS.openclaw.localClone} (${SOURCE_ANCHORS.openclaw.release}, ${SOURCE_ANCHORS.openclaw.head})`,
    `- OpenMythos local contract: ${repoRel(SOURCE_PATHS.openmythosContract)}`,
    `- MLC: ${SOURCE_ANCHORS.mlc.url}`,
    `- Gemma4: ${SOURCE_ANCHORS.gemma4.url}`,
    '',
    '## Boundary',
    '',
    'This integration writes local supervisor, glyph, memory, index, map, cube, GLPJ, staging, and report artifacts. It does not download models, install packages, call external providers, bypass auth/payment controls, write D drive, write Liris, or claim live model execution.',
    '',
    '## Outputs',
    '',
    ...Object.entries(PATHS).map(([key, value]) => `- ${key}: \`${repoRel(value)}\``)
  ];
  return lines.join('\n');
}

function run({ execute }) {
  const generatedAt = new Date().toISOString();
  const inputs = loadInputs();
  const alphabet = buildAlphabet(generatedAt);
  const modelGlyphs = buildModelGlyphs(inputs);
  const supervisors = buildSupervisors(inputs, modelGlyphs, generatedAt);
  const stagingPlan = buildStagingPlan(generatedAt);
  const integration = buildIntegration(inputs, modelGlyphs, alphabet, supervisors, stagingPlan, generatedAt);
  const deepCascadeInput = buildDeepCascadeInput(integration, generatedAt);
  const supervisorQueue = buildSupervisorQueue(generatedAt);
  const supervisorRunner = runSupervisorQueue({
    root: ROOT,
    sourceRoot: ROOT,
    packets: supervisorQueue,
    queuePath: repoRel(PATHS.supervisorQueue),
    decisionsPath: repoRel(PATHS.supervisorDecisions),
    workerReadyPath: repoRel(PATHS.supervisorWorkerReady),
    mapPath: repoRel(PATHS.supervisorMap),
    statePath: repoRel(PATHS.supervisorState),
    hermesPath: repoRel(PATHS.supervisorHermes),
    shannonPath: repoRel(PATHS.supervisorShannon),
    cubePath: repoRel(PATHS.supervisorCube),
    reportJsonPath: repoRel(PATHS.supervisorReportJson),
    reportMdPath: repoRel(PATHS.supervisorReportMd),
    execute
  });
  const map = buildMap(integration, modelGlyphs, generatedAt);
  const glpj = buildGlpj(integration, modelGlyphs, alphabet, generatedAt);
  const memory = {
    memoryId: 'openclaw-openmythos-mlc-gemma4-glyph-integration.v1',
    generatedAt,
    status: integration.status,
    summary: {
      openclawRelease: integration.openclaw.release,
      changedFiles: integration.openclaw.changedFileCount,
      modelGlyphs: integration.glyphs.totalModelGlyphs,
      alphabetGlyphs: integration.glyphs.letteredAlphabet,
      supervisors: integration.supervisors.minted,
      supervisorRunner: supervisorRunner.counts,
      cascadeVote: integration.cascadeVote
    },
    significance: [
      'OpenClaw 4.24, OpenMythos, MLC, and Gemma4 are now represented as one BEHCS-256 supervisor-gated research glyph packet.',
      'The integration converts external model/research claims into local glyph, formula, supervisor, map, cube, index, and GLPJ surfaces before any implementation wave.',
      'The D/Liris handoff is explicit but staged only; copy/write actions require separate proof and authorization.'
    ]
  };
  const index = {
    indexId: 'openclaw-openmythos-mlc-gemma4-glyph-integration-index.v1',
    generatedAt,
    status: 'INDEX_INDEXED',
    sources: SOURCE_ANCHORS,
    artifacts: Object.fromEntries(Object.entries(PATHS).map(([key, value]) => [key, repoRel(value)])),
    glyphFamilies: {
      openclaw: modelGlyphs.openclawGlyphs.map((row) => ({ id: row.id, glyph: row.glyph, subject: row.subject })),
      openmythos: modelGlyphs.openmythosGlyphs.map((row) => ({ id: row.id, glyph: row.glyph, subject: row.subject })),
      mlc: modelGlyphs.mlcGlyphs.map((row) => ({ id: row.id, glyph: row.glyph, subject: row.subject })),
      gemma4: modelGlyphs.gemma4Glyphs.map((row) => ({ id: row.id, glyph: row.glyph, subject: row.subject }))
    }
  };
  const cube = {
    cubeId: 'openclaw-openmythos-mlc-gemma4-glyph-integration-cube-cubed',
    generatedAt,
    status: 'CUBE_CUBE_CUBED',
    openclawChangedFiles: integration.openclaw.changedFileCount,
    modelGlyphs: integration.glyphs.totalModelGlyphs,
    letteredGlyphAlphabet: integration.glyphs.letteredAlphabet,
    supervisors: integration.supervisors.minted,
    supervisorRunnerCounts: supervisorRunner.counts,
    deepCascadeTotalBeats: integration.cascadeVote?.totalBeats || 0,
    deepCascadeExecutorDispatches: integration.cascadeVote?.executorDispatches || 0,
    boundary: integration.boundary,
    glyph: glyph('integration_cube', RUN_ID, `${integration.glyphs.totalModelGlyphs}:${integration.supervisors.minted}`)
  };
  const modelGlyphDoc = {
    glyphSetId: 'openclaw-openmythos-mlc-gemma4-model-glyphs.v1',
    generatedAt,
    status: 'MODEL_GLYPHS_MINTED',
    sources: SOURCE_ANCHORS,
    counts: {
      openclaw: modelGlyphs.openclawGlyphs.length,
      openmythos: modelGlyphs.openmythosGlyphs.length,
      mlc: modelGlyphs.mlcGlyphs.length,
      gemma4: modelGlyphs.gemma4Glyphs.length,
      total: modelGlyphs.all.length
    },
    glyphs: modelGlyphs
  };
  const alphabetDoc = {
    alphabetId: 'behcs256-lettered-glyph-alphabet-246.v1',
    generatedAt,
    status: 'LETTERED_GLYPHS_MINTED',
    count: alphabet.length,
    glyphs: alphabet
  };
  const reportMd = buildReportMd(integration);
  if (execute) {
    writeJson(PATHS.integration, integration);
    writeJson(PATHS.modelGlyphsJson, modelGlyphDoc);
    writeNdjson(PATHS.modelGlyphsNdjson, modelGlyphs.all);
    writeJson(PATHS.alphabetJson, alphabetDoc);
    writeJson(PATHS.supervisors, supervisors);
    writeNdjson(PATHS.supervisorQueue, supervisorQueue);
    writeJson(PATHS.deepCascadeInput, deepCascadeInput);
    if (integration.cascadeVote) {
      writeJson(PATHS.deepCascadeResult, {
        resultId: 'openclaw-openmythos-mlc-gemma4-deep-wave-result.v1',
        generatedAt,
        source: repoRel(SOURCE_PATHS.deepCascadeVote),
        summary: integration.cascadeVote
      });
    }
    writeJson(PATHS.stagingPlan, stagingPlan);
    writeJson(PATHS.memory, memory);
    writeJson(PATHS.index, index);
    writeJson(PATHS.map, map);
    writeText(PATHS.cube, `"use strict";\n\nmodule.exports = Object.freeze(${JSON.stringify(cube, null, 2)});\n`);
    writeJson(PATHS.glpj, glpj);
    writeJson(PATHS.reportJson, {
      ...integration,
      supervisorRunner: {
        status: supervisorRunner.status,
        counts: supervisorRunner.counts,
        runnerDoesNotSpawnWorkers: supervisorRunner.runnerDoesNotSpawnWorkers
      },
      outputs: Object.fromEntries(Object.entries(PATHS).map(([key, value]) => [key, repoRel(value)]))
    });
    writeText(PATHS.reportMd, reportMd);
    appendNdjson(PATHS.gnnEdges, {
      generatedAt,
      from: 'openclaw-v2026.4.24',
      to: RUN_ID,
      relation: 'ABSORBED_INTO_OPENMYTHOS_MLC_GEMMA4_SUPERVISOR_GLYPH_INTEGRATION',
      weight: 1,
      glyph: glyph('gnn_edge', RUN_ID, 'openclaw-openmythos-mlc-gemma4')
    });
    appendNdjson(PATHS.inbox, {
      generatedAt,
      type: 'openclaw_openmythos_mlc_gemma4_glyph_integration_complete',
      runId: RUN_ID,
      status: integration.status,
      modelGlyphs: integration.glyphs.totalModelGlyphs,
      letteredGlyphs: integration.glyphs.letteredAlphabet,
      supervisors: integration.supervisors.minted,
      supervisorRunner: supervisorRunner.counts,
      report: repoRel(PATHS.reportMd)
    });
  }
  return {
    ok: true,
    execute,
    runId: RUN_ID,
    status: integration.status,
    openclawChangedFiles: integration.openclaw.changedFileCount,
    modelGlyphs: integration.glyphs.totalModelGlyphs,
    letteredGlyphs: integration.glyphs.letteredAlphabet,
    supervisors: integration.supervisors.minted,
    supervisorRunner: {
      status: supervisorRunner.status,
      counts: supervisorRunner.counts,
      runnerDoesNotSpawnWorkers: supervisorRunner.runnerDoesNotSpawnWorkers
    },
    cascadeVoteAbsorbed: Boolean(integration.cascadeVote),
    report: repoRel(PATHS.reportMd),
    deepCascadeInput: repoRel(PATHS.deepCascadeInput)
  };
}

function parseArgs(argv) {
  return { execute: argv.includes('--execute') };
}

function main() {
  console.log(JSON.stringify(run(parseArgs(process.argv.slice(2))), null, 2));
}

if (require.main === module) {
  main();
}
