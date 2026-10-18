#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const behcs = require('./behcs/codex-bridge');
const { runSupervisorQueue } = require('../src/omnispindleSupervisorRunner');

const ROOT = path.resolve(__dirname, '..');
const RUN_ID = 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-20260426';
const RUN_ROOT = rel(`data/behcs/orchestration/${RUN_ID}`);
const SOURCE_RUN = 'openclaw-openmythos-mlc-gemma4-glyph-integration-20260426';
const VOTE_ID = 'V6PLUS-OPENCLAW-OPENMYTHOS-MLC-GEMMA4-OMNISHANNON-GNN';

const SOURCE_PATHS = Object.freeze({
  integrationReport: rel('reports/openclaw-openmythos-mlc-gemma4-glyph-integration-latest.json'),
  integrationMemory: rel('data/behcs/memory/openclaw-openmythos-mlc-gemma4-glyph-integration.v1.json'),
  integrationIndex: rel('data/behcs/index/openclaw-openmythos-mlc-gemma4-glyph-integration-index.v1.json'),
  integrationMap: rel('data/behcs/maps/asolaria/openclaw-openmythos-mlc-gemma4-glyph-integration-map-map-mapped.v1.json'),
  integrationCube: rel('data/behcs/cubes/openclaw-openmythos-mlc-gemma4-glyph-integration-cube-cubed.cube.js'),
  integrationGlpj: rel('data/behcs/codex/glyph-language/openclaw-openmythos-mlc-gemma4-behcs256.glpj.json'),
  integrationSupervisors: rel('data/behcs/supervisors/openclaw/openclaw-openmythos-mlc-gemma4-integration-supervisors.v1.json'),
  integrationModelGlyphs: rel(`data/behcs/orchestration/${SOURCE_RUN}/model-glyphs.v1.json`),
  integrationDeepVote: rel(`data/behcs/orchestration/${SOURCE_RUN}/deep-wave-openclaw-openmythos-mlc-gemma4-result.v1.json`),
  gnnEdges: rel('data/behcs/gnn-live-edges.ndjson'),
  gnnNodes: rel('data/behcs/gnn-live-nodes.json'),
  gnnActiveReport: rel('data/behcs/gnn-active-report.json'),
  systemReview: rel('reports/system-full-review-10b-improvement-latest.json'),
  cascadeVote: rel(`data/votes/${VOTE_ID}/behcs-v6-candidate-file.json`)
});

const PATHS = Object.freeze({
  runRoot: RUN_ROOT,
  input: path.join(RUN_ROOT, 'deep-wave-v6-plus-input.v1.json'),
  result: path.join(RUN_ROOT, 'deep-wave-v6-plus-result.v1.json'),
  rollup: path.join(RUN_ROOT, 'v6-plus-omnishannon-gnn-rollup.v1.json'),
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
  memory: rel('data/behcs/memory/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4.v1.json'),
  index: rel('data/behcs/index/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-index.v1.json'),
  map: rel('data/behcs/maps/asolaria/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-map-map-mapped.v1.json'),
  cube: rel('data/behcs/cubes/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-cube-cubed.cube.js'),
  glpj: rel('data/behcs/codex/glyph-language/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-behcs256.glpj.json'),
  shannon: rel('data/behcs/shannon/openclaw/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-consensus-latest.json'),
  hermes: rel('data/behcs/hermes/openclaw/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-dispatch-latest.json'),
  whiteRoom: rel('data/behcs/omniwhite-room/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.json'),
  gc: rel('data/behcs/garbage-collector/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-retention.v1.json'),
  gnnEdges: rel('data/behcs/gnn-live-edges.ndjson'),
  inbox: rel('data/behcs/inbox.ndjson'),
  reportJson: rel('reports/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.json'),
  reportMd: rel('reports/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.md')
});

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

function readNdjson(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch (_) {
    return [];
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function glyph(kind, id, seed = '') {
  const hash = sha256(`${kind}:${id}:${seed}`);
  return `HG256:${kind.toUpperCase()}:${hash.slice(0, 8).toUpperCase()}:${behcs.hilbertAddress(hash)}`;
}

function loadInputs() {
  return {
    integrationReport: readJson(SOURCE_PATHS.integrationReport, {}),
    integrationMemory: readJson(SOURCE_PATHS.integrationMemory, {}),
    integrationIndex: readJson(SOURCE_PATHS.integrationIndex, {}),
    integrationMap: readJson(SOURCE_PATHS.integrationMap, {}),
    integrationSupervisors: readJson(SOURCE_PATHS.integrationSupervisors, { supervisors: [] }),
    integrationModelGlyphs: readJson(SOURCE_PATHS.integrationModelGlyphs, { counts: {}, glyphs: { all: [] } }),
    integrationDeepVote: readJson(SOURCE_PATHS.integrationDeepVote, {}),
    gnnEdges: readNdjson(SOURCE_PATHS.gnnEdges),
    gnnNodes: readJson(SOURCE_PATHS.gnnNodes, {}),
    gnnActiveReport: readJson(SOURCE_PATHS.gnnActiveReport, {}),
    systemReview: readJson(SOURCE_PATHS.systemReview, {}),
    cascadeVote: readJson(SOURCE_PATHS.cascadeVote, null)
  };
}

function summarizeCascadeVote(vote) {
  if (!vote) return null;
  return {
    voteId: vote.vote_id,
    mode: vote.mode,
    engine: vote.engine,
    totalBeats: vote.totalBeats,
    beatsPerCandidate: vote.beatsPerCandidate,
    candidatesScanned: vote.candidatesScanned,
    executorDispatches: vote.executorDispatches,
    busAlive: vote.liveState?.busAlive,
    federationAlive: vote.liveState?.federationAlive,
    collapseDetected: vote.liveState?.collapseDetected,
    weakestDims: Array.from(new Set((vote.results || [])
      .map((result) => result.selfReflection?.weakestOverall?.dim)
      .filter(Boolean))),
    verdicts: (vote.results || []).map((result) => ({
      candidateId: result.candidate_id,
      verdict: result.verdict,
      confidence: result.avgConfidence,
      beats: result.totalBeats,
      weakestDim: result.selfReflection?.weakestOverall?.dim,
      strongestDim: result.selfReflection?.strongestOverall?.dim
    }))
  };
}

function buildRollup(inputs, generatedAt) {
  const integration = inputs.integrationReport || {};
  const sourceVote = inputs.integrationDeepVote?.summary || {};
  const cascadeVote = summarizeCascadeVote(inputs.cascadeVote);
  const gnnEdgeCount = inputs.gnnEdges.length;
  const supervisors = Array.isArray(inputs.integrationSupervisors.supervisors) ? inputs.integrationSupervisors.supervisors.length : 0;
  const modelGlyphs = integration.glyphs?.totalModelGlyphs || inputs.integrationModelGlyphs.counts?.total || 0;
  const letteredGlyphs = integration.glyphs?.letteredAlphabet || 0;
  return {
    rollupId: `${RUN_ID}.v1`,
    generatedAt,
    status: cascadeVote ? 'V6_PLUS_CASCADE_ABSORBED' : 'V6_PLUS_INPUT_PREPARED',
    waveShape: '6x6x6x6x6x12 x omnishannon x GNN',
    plusChain: [
      'omnishannon_consensus_lift',
      'forward_gnn_edge_closure',
      'reverse_gain_gnn_mistake_review',
      'super_white_room_contradiction_isolation',
      'gc_retention_manifest',
      'hermes_supervisor_awareness'
    ],
    sourceIntegration: {
      id: integration.integrationId,
      status: integration.status,
      openclawChangedFiles: integration.openclaw?.changedFileCount || 0,
      modelGlyphs,
      letteredGlyphs,
      supervisors,
      sourceVote: {
        voteId: sourceVote.voteId,
        totalBeats: sourceVote.totalBeats,
        executorDispatches: sourceVote.executorDispatches,
        weakestDims: sourceVote.weakestDims || []
      }
    },
    gnn: {
      liveEdgeRows: gnnEdgeCount,
      activeReportPresent: Object.keys(inputs.gnnActiveReport || {}).length > 0,
      nodeDocPresent: Object.keys(inputs.gnnNodes || {}).length > 0
    },
    cascadeVote,
    boundary: {
      planningOnly: true,
      executorDispatches: false,
      spawnWorkers: false,
      externalApiCall: false,
      downloads: false,
      installs: false,
      remoteMutation: false,
      dDriveWrite: false,
      lirisWrite: false,
      providerAuthBypass: false
    }
  };
}

function buildCascadeInput(rollup, generatedAt) {
  return {
    vote_id: VOTE_ID,
    taskId: RUN_ID,
    planId: RUN_ID,
    generatedAt,
    mode: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4',
    purpose: 'V6+ cascade over the OpenClaw/OpenMythos/MLC/Gemma4 integration through OmniShannon, forward GNN, reverse-gain GNN, super-white-room, GC, and Hermes awareness.',
    waveShape: rollup.waveShape,
    chain: rollup.plusChain,
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
        id: 'v6plus-source-v6-vote-absorption',
        label: 'Absorb prior v6 integration vote',
        metadata: { proof_artifact: repoRel(SOURCE_PATHS.integrationDeepVote), count: rollup.sourceIntegration.sourceVote.totalBeats || 0, scope_hours: 0.25 },
        cube: 29791,
        expected_outcome: 'Prior v6 result becomes proof input to v6+ rather than a loose report.',
        next_step: 'Keep source vote referenced by memory/index/map/cube/GLPJ.'
      },
      {
        id: 'v6plus-omnishannon-consensus-lift',
        label: 'OmniShannon consensus lift',
        metadata: { proof_artifact: repoRel(PATHS.shannon), count: rollup.sourceIntegration.modelGlyphs, scope_hours: 0.25 },
        cube: 704969,
        expected_outcome: 'Consensus records the plus-layer boundary and weak dimensions.',
        next_step: 'Only allow next implementation wave if consensus stays gated.'
      },
      {
        id: 'v6plus-forward-gnn-closure',
        label: 'Forward GNN edge closure',
        metadata: { proof_artifact: repoRel(SOURCE_PATHS.gnnEdges), count: rollup.gnn.liveEdgeRows, scope_hours: 0.25 },
        cube: 3307949,
        expected_outcome: 'GNN edges connect integration, supervisors, cascade, and next-wave readiness.',
        next_step: 'Append one v6+ GNN edge and leave existing graph intact.'
      },
      {
        id: 'v6plus-reverse-gain-gnn-review',
        label: 'Reverse-gain GNN mistake review',
        metadata: { proof_artifact: repoRel(PATHS.whiteRoom), scope_hours: 0.25 },
        cube: 2248091,
        expected_outcome: 'Known auth/provider/resource mistakes remain blocked before execution.',
        next_step: 'Route contradictions to white-room notes.'
      },
      {
        id: 'v6plus-super-white-room-isolation',
        label: 'Super-white-room contradiction isolation',
        metadata: { proof_artifact: repoRel(PATHS.whiteRoom), scope_hours: 0.25 },
        cube: 9393931,
        expected_outcome: 'Weak dimensions D23/D15 remain explicit conditions, not hidden success claims.',
        next_step: 'Hold federation/device claims until live proof exists.'
      },
      {
        id: 'v6plus-gc-retention',
        label: 'GC retention and recoverability',
        metadata: { proof_artifact: repoRel(PATHS.gc), scope_hours: 0.25 },
        cube: 7189057,
        expected_outcome: 'All v6+ artifacts are bounded, indexed, and recoverable.',
        next_step: 'Keep generated roots under one run id.'
      },
      {
        id: 'v6plus-hermes-supervisor-awareness',
        label: 'Hermes supervisor awareness',
        metadata: { proof_artifact: repoRel(PATHS.hermes), count: rollup.sourceIntegration.supervisors, scope_hours: 0.25 },
        cube: 3581577,
        expected_outcome: 'Hermes sees the plus layer and all integration supervisors.',
        next_step: 'Update memory/index for follow-on wave.'
      },
      {
        id: 'v6plus-next-wave-readiness',
        label: 'Next bounded implementation wave readiness',
        metadata: { proof_artifact: repoRel(PATHS.reportJson), scope_hours: 0.25 },
        cube: 493039,
        expected_outcome: 'Next wave can proceed with conditions instead of unrestricted dispatch.',
        next_step: 'Pick a single low-risk implementation wave after v6+ seals.'
      }
    ]
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
    'data/behcs/shannon/openclaw',
    'data/behcs/hermes/openclaw',
    'data/behcs/omniwhite-room',
    'data/behcs/garbage-collector',
    'reports',
    'TASKS.md'
  ];
  const expectedArtifacts = [
    repoRel(PATHS.input),
    repoRel(PATHS.result),
    repoRel(PATHS.rollup),
    repoRel(PATHS.memory),
    repoRel(PATHS.index),
    repoRel(PATHS.map),
    repoRel(PATHS.cube),
    repoRel(PATHS.glpj),
    repoRel(PATHS.shannon),
    repoRel(PATHS.hermes),
    repoRel(PATHS.whiteRoom),
    repoRel(PATHS.gc),
    repoRel(PATHS.reportMd)
  ];
  return [
    'omnishannon_consensus_lift',
    'forward_gnn_edge_closure',
    'reverse_gain_gnn_review',
    'super_white_room_isolation',
    'gc_retention',
    'hermes_supervisor_awareness',
    'next_wave_readiness'
  ].map((name, index) => ({
    id: `ASO-V6PLUS-${name.toUpperCase()}`,
    title: `V6+ cascade supervisor packet ${index + 1}`,
    objective: `Review ${name} for ${RUN_ID}.`,
    requestedWorker: `local_v6plus_reviewer:${name}`,
    instructions: `DEEP_WAVE_V6_PLUS ${name} RUN ${RUN_ID} GENERATED ${generatedAt}`,
    pid: `BH.V6PLUS.OPENCLAW.OPENMYTHOS.${String(index + 1).padStart(3, '0')}`,
    pidScope: 'local_v6plus_cascade_only',
    consentScope: 'operator_authorized_local_orchestration',
    allowedPaths,
    expectedArtifacts,
    acceptanceGates: [
      'node --check tools/asolaria-deep-wave-v6-plus-cascade.js',
      'JSON surfaces parse',
      'v6plus vote absorbed',
      'no external model execution claimed',
      'no worker/process storm'
    ],
    proofRequired: true,
    proofRefs: [
      repoRel(SOURCE_PATHS.integrationReport),
      repoRel(SOURCE_PATHS.integrationDeepVote),
      repoRel(SOURCE_PATHS.integrationSupervisors)
    ],
    operatorApproval: true,
    syntheticFirstEvidence: true,
    modelCard: true,
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
    taskType: 'deep_wave_v6_plus_cascade_supervisor_review',
    source: RUN_ID
  }));
}

function buildMap(rollup, generatedAt) {
  const nodes = [
    { id: SOURCE_RUN, kind: 'source_integration' },
    { id: RUN_ID, kind: 'v6_plus_cascade' },
    { id: 'omnishannon', kind: 'consensus' },
    { id: 'forward_gnn', kind: 'graph' },
    { id: 'reverse_gain_gnn', kind: 'mistake_review' },
    { id: 'super_white_room', kind: 'contradiction_isolation' },
    { id: 'gc', kind: 'retention' },
    { id: 'hermes', kind: 'supervisor_awareness' }
  ];
  const edges = [
    [SOURCE_RUN, RUN_ID, 'feeds_v6_plus'],
    [RUN_ID, 'omnishannon', 'requires_consensus_lift'],
    [RUN_ID, 'forward_gnn', 'requires_edge_closure'],
    [RUN_ID, 'reverse_gain_gnn', 'requires_mistake_review'],
    [RUN_ID, 'super_white_room', 'requires_contradiction_isolation'],
    [RUN_ID, 'gc', 'requires_retention'],
    [RUN_ID, 'hermes', 'updates_supervisor_awareness'],
    ['omnishannon', 'hermes', 'reports_consensus'],
    ['reverse_gain_gnn', 'super_white_room', 'sends_contradictions'],
    ['gc', 'hermes', 'reports_recoverability']
  ].map(([from, to, relation]) => ({ from, to, relation }));
  return {
    mapId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-map-map-mapped.v1',
    generatedAt,
    status: 'MAP_MAP_MAPPED',
    rollupStatus: rollup.status,
    nodes,
    edges
  };
}

function buildGlpj(rollup, generatedAt) {
  return {
    programId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-behcs256.glpj',
    generatedAt,
    status: 'GLPJ_MINTED',
    language: 'BEHCS-256',
    verbs: [
      'DEEP_WAVE_V6_PLUS',
      'LIFT_OMNISHANNON',
      'CLOSE_FORWARD_GNN',
      'REVIEW_REVERSE_GAIN_GNN',
      'ISOLATE_SUPER_WHITE_ROOM',
      'SEAL_GC_RETENTION',
      'AWARE_HERMES',
      'HOLD_EXECUTOR_DISPATCH'
    ],
    sentences: [
      `DEEP_WAVE_V6_PLUS RUN ${RUN_ID} SHAPE ${rollup.waveShape}`,
      `LIFT_OMNISHANNON GLYPHS ${rollup.sourceIntegration.modelGlyphs} SUPERVISORS ${rollup.sourceIntegration.supervisors}`,
      `CLOSE_FORWARD_GNN EDGES ${rollup.gnn.liveEdgeRows}`,
      `REVIEW_REVERSE_GAIN_GNN WEAK ${rollup.cascadeVote?.weakestDims?.join('|') || 'pending'}`,
      'ISOLATE_SUPER_WHITE_ROOM FEDERATION_DEVICE_CONDITIONS explicit',
      'SEAL_GC_RETENTION local_artifacts_only true',
      'HOLD_EXECUTOR_DISPATCH dispatches 0'
    ]
  };
}

function writeArtifacts(inputs, rollup, cascadeInput, supervisorRunner, generatedAt) {
  const map = buildMap(rollup, generatedAt);
  const glpj = buildGlpj(rollup, generatedAt);
  const memory = {
    memoryId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4.v1',
    generatedAt,
    status: rollup.status,
    summary: {
      vote: rollup.cascadeVote,
      sourceIntegration: rollup.sourceIntegration,
      gnn: rollup.gnn,
      supervisorRunner: supervisorRunner.counts
    },
    significance: [
      'V6+ turns the prior integration vote into a plus-layer authority packet.',
      'OmniShannon, forward GNN, reverse-gain GNN, super-white-room, GC, and Hermes now all have explicit artifacts for the OpenClaw/OpenMythos/MLC/Gemma4 branch.',
      'The plus layer preserves execution discipline: no external calls, no worker storm, no D/Liris writes, no hidden promotion.'
    ]
  };
  const index = {
    indexId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-index.v1',
    generatedAt,
    status: 'INDEX_INDEXED',
    runId: RUN_ID,
    sourceRun: SOURCE_RUN,
    artifacts: Object.fromEntries(Object.entries(PATHS).map(([key, value]) => [key, repoRel(value)])),
    sourceArtifacts: Object.fromEntries(Object.entries(SOURCE_PATHS).map(([key, value]) => [key, repoRel(value)]))
  };
  const cube = {
    cubeId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-cube-cubed',
    generatedAt,
    status: 'CUBE_CUBE_CUBED',
    waveShape: rollup.waveShape,
    totalBeats: rollup.cascadeVote?.totalBeats || 0,
    candidatesScanned: rollup.cascadeVote?.candidatesScanned || 0,
    executorDispatches: rollup.cascadeVote?.executorDispatches || 0,
    supervisorRunnerCounts: supervisorRunner.counts,
    plusChain: rollup.plusChain,
    boundary: rollup.boundary,
    glyph: glyph('v6plus_cube', RUN_ID, `${rollup.cascadeVote?.totalBeats || 0}:${rollup.gnn.liveEdgeRows}`)
  };
  const shannon = {
    consensusId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-consensus',
    generatedAt,
    consensus: rollup.cascadeVote ? 'PROCEED_WITH_CONDITIONS_NO_EXECUTOR_DISPATCH' : 'PENDING_CASCADE_VOTE',
    confidence: rollup.cascadeVote ? 0.8 : 0,
    weakDimensions: rollup.cascadeVote?.weakestDims || [],
    statement: 'V6+ is a local planning/proof cascade over OpenClaw/OpenMythos/MLC/Gemma4. It does not spawn workers or call providers.'
  };
  const hermes = {
    dispatchId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-hermes',
    generatedAt,
    authority: 'Hermes supervisor-of-supervisors awareness packet',
    runId: RUN_ID,
    sourceRun: SOURCE_RUN,
    supervisorsObserved: rollup.sourceIntegration.supervisors,
    modelGlyphsObserved: rollup.sourceIntegration.modelGlyphs,
    action: 'hold_next_wave_until_conditions_are_explicit',
    conditions: rollup.cascadeVote?.weakestDims || []
  };
  const whiteRoom = {
    whiteRoomId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-white-room',
    generatedAt,
    status: 'CONTRADICTIONS_ISOLATED',
    contradictions: [
      {
        id: 'bus-liveness',
        observation: rollup.cascadeVote?.busAlive === false ? 'bus_not_alive_in_v6plus_vote' : 'bus_state_not_confirmed',
        rule: 'do_not_claim_live_bus_execution'
      },
      {
        id: 'federation-device-proof',
        observation: (rollup.cascadeVote?.weakestDims || []).join(', ') || 'pending',
        rule: 'hold_D23_D15_claims_until_live_evidence'
      },
      {
        id: 'execution-boundary',
        observation: 'executorDispatches=0',
        rule: 'do_not_claim_real_worker_execution_from_planning_vote'
      }
    ]
  };
  const gc = {
    retentionId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-retention.v1',
    generatedAt,
    status: 'GC_RETENTION_SEALED',
    retain: [
      repoRel(PATHS.input),
      repoRel(PATHS.result),
      repoRel(PATHS.rollup),
      repoRel(PATHS.memory),
      repoRel(PATHS.index),
      repoRel(PATHS.map),
      repoRel(PATHS.cube),
      repoRel(PATHS.glpj),
      repoRel(PATHS.reportJson),
      repoRel(PATHS.reportMd)
    ],
    noPruneBefore: 'operator_explicit_prune_authorization'
  };
  const report = {
    runId: RUN_ID,
    generatedAt,
    status: rollup.status,
    rollup,
    supervisorRunner: {
      status: supervisorRunner.status,
      counts: supervisorRunner.counts,
      runnerDoesNotSpawnWorkers: supervisorRunner.runnerDoesNotSpawnWorkers
    },
    outputs: Object.fromEntries(Object.entries(PATHS).map(([key, value]) => [key, repoRel(value)]))
  };
  const reportMd = [
    '# Deep Wave V6+ OpenClaw/OpenMythos/MLC/Gemma4 Cascade',
    '',
    `Generated: ${generatedAt}`,
    '',
    `Status: ${rollup.status}`,
    '',
    `- Wave shape: ${rollup.waveShape}`,
    `- Source integration: ${SOURCE_RUN}`,
    `- Source model glyphs: ${rollup.sourceIntegration.modelGlyphs}`,
    `- Source supervisors: ${rollup.sourceIntegration.supervisors}`,
    `- GNN live edges read: ${rollup.gnn.liveEdgeRows}`,
    `- Supervisor packets: ${supervisorRunner.counts.total}`,
    `- Supervisor allowed: ${supervisorRunner.counts.ALLOW}`,
    `- Supervisor blocks: ${supervisorRunner.counts.BLOCK}`,
    `- Worker-ready packets: ${supervisorRunner.counts.workerReady}`,
    '',
    '## Cascade',
    '',
    rollup.cascadeVote
      ? `- ${rollup.cascadeVote.voteId}: candidates=${rollup.cascadeVote.candidatesScanned}; beats=${rollup.cascadeVote.totalBeats}; dispatches=${rollup.cascadeVote.executorDispatches}; weakest=${rollup.cascadeVote.weakestDims.join(', ')}`
      : '- Cascade input prepared; vote not absorbed yet.',
    '',
    '## Boundary',
    '',
    'V6+ is a local proof/orchestration cascade. It does not spawn workers, call providers, download/install models, mutate remotes, write D drive, or write Liris.',
    '',
    '## Outputs',
    '',
    ...Object.entries(PATHS).map(([key, value]) => `- ${key}: \`${repoRel(value)}\``)
  ].join('\n');

  writeJson(PATHS.input, cascadeInput);
  writeJson(PATHS.rollup, rollup);
  if (rollup.cascadeVote) {
    writeJson(PATHS.result, {
      resultId: 'deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-result.v1',
      generatedAt,
      source: repoRel(SOURCE_PATHS.cascadeVote),
      summary: rollup.cascadeVote
    });
  }
  writeJson(PATHS.memory, memory);
  writeJson(PATHS.index, index);
  writeJson(PATHS.map, map);
  writeText(PATHS.cube, `"use strict";\n\nmodule.exports = Object.freeze(${JSON.stringify(cube, null, 2)});\n`);
  writeJson(PATHS.glpj, glpj);
  writeJson(PATHS.shannon, shannon);
  writeJson(PATHS.hermes, hermes);
  writeJson(PATHS.whiteRoom, whiteRoom);
  writeJson(PATHS.gc, gc);
  writeJson(PATHS.reportJson, report);
  writeText(PATHS.reportMd, reportMd);
  appendNdjson(PATHS.gnnEdges, {
    generatedAt,
    from: SOURCE_RUN,
    to: RUN_ID,
    relation: 'DEEP_WAVE_V6_PLUS_OMNISHANNON_GNN_ABSORPTION',
    weight: 1,
    glyph: glyph('gnn_edge', RUN_ID, 'v6-plus')
  });
  appendNdjson(PATHS.inbox, {
    generatedAt,
    type: 'deep_wave_v6_plus_cascade_complete',
    runId: RUN_ID,
    status: rollup.status,
    totalBeats: rollup.cascadeVote?.totalBeats || 0,
    executorDispatches: rollup.cascadeVote?.executorDispatches || 0,
    report: repoRel(PATHS.reportMd)
  });
}

function run({ execute }) {
  const generatedAt = new Date().toISOString();
  const inputs = loadInputs();
  const rollup = buildRollup(inputs, generatedAt);
  const cascadeInput = buildCascadeInput(rollup, generatedAt);
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
  if (execute) {
    writeNdjson(PATHS.supervisorQueue, supervisorQueue);
    writeArtifacts(inputs, rollup, cascadeInput, supervisorRunner, generatedAt);
  }
  return {
    ok: true,
    execute,
    runId: RUN_ID,
    status: rollup.status,
    input: repoRel(PATHS.input),
    cascadeVoteAbsorbed: Boolean(rollup.cascadeVote),
    totalBeats: rollup.cascadeVote?.totalBeats || 0,
    candidatesScanned: rollup.cascadeVote?.candidatesScanned || 0,
    executorDispatches: rollup.cascadeVote?.executorDispatches || 0,
    supervisorRunner: {
      status: supervisorRunner.status,
      counts: supervisorRunner.counts,
      runnerDoesNotSpawnWorkers: supervisorRunner.runnerDoesNotSpawnWorkers
    },
    report: repoRel(PATHS.reportMd)
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
