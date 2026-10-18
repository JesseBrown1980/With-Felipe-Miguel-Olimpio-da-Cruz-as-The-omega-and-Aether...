#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repoRoot = path.resolve(__dirname, "..", "..");
const runId = "deep-wave-all-cascades-structure-20260426";
const voteId = "DEEP-WAVE-ALL-CASCADES-STRUCTURE-20260426";
const runRoot = path.join(repoRoot, "data", "behcs", "orchestration", runId);
const votePath = path.join(repoRoot, "data", "votes", voteId, "behcs-v6-candidate-file.json");

const OUTPUTS = Object.freeze({
  structure: path.join(runRoot, "structure-map.v1.json"),
  edges: path.join(runRoot, "structure-edges.v1.ndjson"),
  cascadeInput: path.join(runRoot, "deep-wave-all-cascades-input.v1.json"),
  reportJson: path.join(repoRoot, "reports", "deep-wave-all-cascades-structure-latest.json"),
  reportMd: path.join(repoRoot, "reports", "deep-wave-all-cascades-structure-latest.md"),
  memory: path.join(repoRoot, "data", "behcs", "memory", "deep-wave-all-cascades-structure.v1.json"),
  index: path.join(repoRoot, "data", "behcs", "index", "deep-wave-all-cascades-structure-index.v1.json"),
  map: path.join(repoRoot, "data", "behcs", "maps", "asolaria", "deep-wave-all-cascades-structure-map-map-mapped.v1.json"),
  cube: path.join(repoRoot, "data", "behcs", "cubes", "deep-wave-all-cascades-structure-cube-cubed.cube.js"),
  glpj: path.join(repoRoot, "data", "behcs", "codex", "glyph-language", "deep-wave-all-cascades-structure-behcs256.glpj.json")
});

const DOMAINS = Object.freeze([
  {
    id: "asolaria_canonical",
    label: "Asolaria canonical OS/control plane",
    role: "capital runtime, map/index/cube owner, local control surface",
    cube: 704969,
    glyph: "GLYPH.ASOLARIA.CANONICAL.OS",
    stage: "root_controller",
    posture: "local_orchestration_ready",
    artifacts: [
      "reports/asolaria-second-cascade-recovery-orchestration-latest.md",
      "data/behcs/maps/asolaria/asolaria-second-cascade-recovery-map-map-mapped.v1.json",
      "data/behcs/cubes/asolaria-second-cascade-recovery-cube-cubed.cube.js",
      "data/behcs/codex/glyph-language/asolaria-second-cascade-recovery-behcs256.glpj.json",
      "reports/system-surface-pid-orchestration-continuation-latest.md",
      "data/behcs/pid-fabric/index/system-surface-pid-indicator-index-latest.json"
    ]
  },
  {
    id: "hermes_supervisor_of_supervisors",
    label: "Hermes supervisor of supervisors",
    role: "authority awareness, healing dispatch, supervisor loading, promotion gate",
    cube: 3581577,
    glyph: "GLYPH.HERMES.SUPERVISOR.OF.SUPERVISORS",
    stage: "authority_gate",
    posture: "awareness_and_dispatch",
    artifacts: [
      "reports/neurotech-hermes-supervisor-of-supervisors-latest.md",
      "data/behcs/cubes/neurotech-hermes-supervisor-of-supervisors.cube.js",
      "data/neurotech-defense-lab/hermes/supervisor-of-supervisors/supervisor-awareness-latest.json",
      "data/behcs/hermes/openclaw/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-dispatch-latest.json",
      "data/behcs/hermes/openmythos/openmythos-behcs256-dispatch-latest.json",
      "data/behcs/hermes/opencode/opencode-omniflywheel-100m-sweep-dispatch-latest.json",
      "data/behcs/hermes/claude/claude-omniflywheel-100m-sweep-dispatch-latest.json"
    ]
  },
  {
    id: "omnishannon_shannon",
    label: "OmniShannon and Shannon consensus",
    role: "consensus before execution, release gate, multi-voice vote surface",
    cube: 7189057,
    glyph: "GLYPH.OMNISHANNON.SHANNON.CONSENSUS",
    stage: "consensus_gate",
    posture: "proceed_only_with_conditions_where_needed",
    artifacts: [
      "reports/deep-wave-plan-slice-shannon-gnn-trinity-20260415.md",
      "tools/shannon-consensus/shannon-consensus.js",
      "tools/cube/omni-shannon-v4-real.js",
      "data/behcs/shannon/openclaw/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-consensus-latest.json",
      "data/behcs/shannon/openmythos/openmythos-behcs256-consensus-latest.json",
      "data/behcs/shannon/claude/claude-omniflywheel-100m-sweep-consensus-latest.json"
    ]
  },
  {
    id: "sentinel_kr_instruct",
    label: "Sentinel / Instruct KR",
    role: "fail-closed recovery law, shadow/secondary-evidence guard, proof-before-reopen",
    cube: 50653,
    glyph: "GLYPH.SENTINEL.KR.INSTRUCT.FAIL.CLOSED",
    stage: "recovery_guard",
    posture: "deny_until_proofs",
    artifacts: [
      "reports/deep-wave-plan-slice-kr-sentinel-20260415.md",
      "reports/SOVEREIGNTY-REBOOT-INSTRUCTIONS.md",
      "data/agent-index/tasks/IX-1008-kr-deny-gate-for-sovereign-recovery.md",
      "data/agent-index/tasks/IX-1001-deep-wave-second-cascade-chief-orchestration.md"
    ]
  },
  {
    id: "openmythos_behcs_engine",
    label: "OpenMythos BEHCS cognitive engine",
    role: "recurrent-depth cognitive engine contract, LAW-099 gate, glyph verbs",
    cube: 3307949,
    glyph: "GLYPH.OPENMYTHOS.BEHCS256.RECURRENT.ENGINE",
    stage: "cognitive_engine_gated",
    posture: "runtime_wired_execution_gated",
    artifacts: [
      "reports/openmythos-behcs256-full-integration-latest.md",
      "reports/openmythos-gasvm-fusion-latest.md",
      "src/behcs/openMythosSupervisionContract.js",
      "src/cognitiveEngines/openmythosAdapter.js",
      "data/behcs/codex/glyph-language/openmythos-behcs256.v1.json",
      "data/behcs/supervisors/openmythos/openmythos-behcs256-supervisors.v1.json",
      "data/behcs/maps/openmythos/openmythos-behcs256-map.v1.json",
      "data/behcs/cubes/openmythos-behcs256-integration.cube.js"
    ]
  },
  {
    id: "openclaw_openmythos_research",
    label: "OpenClaw + OpenMythos + MLC + Gemma4 research integration",
    role: "model glyph absorption, research formula bridge, supervisor-gated integration",
    cube: 2571353,
    glyph: "GLYPH.OPENCLAW.OPENMYTHOS.MLC.GEMMA4.RESEARCH",
    stage: "research_absorption",
    posture: "glyphs_wired_supervisor_gated",
    artifacts: [
      "reports/openclaw-openmythos-mlc-gemma4-glyph-integration-latest.md",
      "reports/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.md",
      "reports/asolaria-mlc-biml-self-reflecting-cascade-latest.md",
      "data/behcs/orchestration/openclaw-openmythos-mlc-gemma4-glyph-integration-20260426/model-glyphs.v1.json",
      "data/behcs/orchestration/openclaw-openmythos-mlc-gemma4-glyph-integration-20260426/behcs256-lettered-glyph-alphabet-246.v1.json",
      "data/behcs/cubes/openclaw-openmythos-mlc-gemma4-glyph-integration-cube-cubed.cube.js",
      "data/behcs/cubes/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-cube-cubed.cube.js",
      "data/behcs/codex/glyph-language/openclaw-openmythos-mlc-gemma4-behcs256.glpj.json",
      "data/behcs/codex/glyph-language/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-behcs256.glpj.json"
    ]
  },
  {
    id: "openclaude_claude",
    label: "OpenClaude / Claude controller lane",
    role: "Claude-compatible identity plus Claude CLI PID controller-slot proof",
    cube: 226981,
    glyph: "GLYPH.OPENCLAUDE.CLAUDE.CONTROLLER.SLOTS",
    stage: "model_lane_controller",
    posture: "pid_slots_ready_no_live_model_storm",
    artifacts: [
      "data/cubes/identity-6859/openclaude-federation-entity.json",
      "reports/claude-omniflywheel-100m-sweep-latest.md",
      "data/behcs/hermes/claude/claude-omniflywheel-100m-sweep-dispatch-latest.json",
      "data/behcs/shannon/claude/claude-omniflywheel-100m-sweep-consensus-latest.json",
      "src/connectors/anthropicCliConnector.js",
      "tools/claude-omniflywheel-100m-sweep.js"
    ]
  },
  {
    id: "opencode_open_code",
    label: "OpenCode / Open Code Omniflywheel",
    role: "bounded OpenCode smoke, compact logical PID/gulp worker ranges",
    cube: 148877,
    glyph: "GLYPH.OPENCODE.OMNIFLYWHEEL.PID.RANGES",
    stage: "worker_lane",
    posture: "one_smoke_plus_compact_ranges",
    artifacts: [
      "reports/opencode-omniflywheel-100m-sweep-latest.md",
      "reports/neurotech-opencode-omnispindle-orchestrator-latest.md",
      "src/connectors/opencodeConnector.js",
      "tools/opencode-omniflywheel-100m-sweep.js",
      "tools/neurotech-opencode-omnispindle-orchestrator.js",
      "data/behcs/cubes/opencode-omniflywheel-100m-sweep.cube.js",
      "data/behcs/codex/glyph-language/brown-hilbert-opencode-pid-language.v1.json"
    ]
  },
  {
    id: "hookwall",
    label: "Hookwall",
    role: "policy wall before promotion, bad-pattern demotion, MCP/auth/storage guard",
    cube: 2197,
    glyph: "GLYPH.HOOKWALL.POLICY.PROMOTION.GATE",
    stage: "policy_gate",
    posture: "block_or_route_before_execution",
    artifacts: [
      "data/behcs/cubes/ix-gate-hookwall-v1.cube.js",
      "data/behcs/cubes/ix-gate-hookwall-v2.cube.js",
      "data/behcs/maps/crypto-capsule-hookwall-policy.json",
      "data/behcs/maps/minimax-m27-hookwall-policy.json",
      "data/neurotech-defense-lab/omnispindle/1e27-sweep/integration/hookwall-policy-latest.json",
      "data/neurotech-defense-lab/omnispindle/collections/hookwall-events-latest.ndjson"
    ]
  },
  {
    id: "gnn_fabric",
    label: "GNN fabric",
    role: "forward genius mining, reverse-gain mistake prevention, live edge topology",
    cube: 3307949,
    glyph: "GLYPH.GNN.FORWARD.REVERSE.GAIN.FABRIC",
    stage: "graph_reasoning",
    posture: "descriptor_edges_before_promotion",
    artifacts: [
      "reports/deep-wave-plan-slice-shannon-gnn-trinity-20260415.md",
      "reports/gnn-omnitest-orchestration-tranche-latest.md",
      "data/behcs/gnn-live-edges.ndjson",
      "data/behcs/gnn-active-report.json",
      "tools/behcs/gnn-live-watcher.js",
      "data/behcs/cubes/doctrine-taskforge-gnn.cube.js",
      "data/behcs/cubes/ix-gate-gnn.cube.js"
    ]
  },
  {
    id: "cube_glyph_token_language",
    label: "Cubes, glyphs, and token-reduction language",
    role: "preload-once/reference-by-PID surface for maps, cubes, indexes, GLPJ, and 246 glyph alphabet",
    cube: 493039,
    glyph: "GLYPH.CUBE.GLYPH.TOKEN.REDUCTION.LANGUAGE",
    stage: "language_transport",
    posture: "pid_compact_reference",
    artifacts: [
      "reports/behcs256-index-map-cube-glyph-latest.md",
      "reports/system-surface-pid-indicator-index-latest.md",
      "data/behcs/pid-fabric/preload/system-surface-pid-preload-bindings-latest.json",
      "data/behcs/maps/hyperglyph-map.v1.json",
      "data/behcs/index/hyperglyph-49d.index.json",
      "data/behcs/codex/glyph-language/system-surface-pid-indicator.glpj.json"
    ]
  },
  {
    id: "white_room_gc",
    label: "Super white rooms and garbage collection",
    role: "contradiction isolation, retention manifest, evidence-preserving compaction",
    cube: 389017,
    glyph: "GLYPH.WHITE.ROOM.GC.RETENTION",
    stage: "retention_and_review",
    posture: "compact_not_delete",
    artifacts: [
      "data/behcs/omniwhite-room/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.json",
      "data/behcs/garbage-collector/deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-retention.v1.json",
      "reports/shadow-language-classification-supervisor-latest.md",
      "reports/dirty-worktree-supervised-cleanup-latest.md"
    ]
  }
]);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, data.endsWith("\n") ? data : `${data}\n`, "utf8");
}

function existsRel(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function repoRel(filePath) {
  const relative = path.relative(repoRoot, filePath);
  if (path.isAbsolute(relative) || relative.startsWith("..")) {
    return filePath.replace(/\\/g, "/");
  }
  return relative.replace(/\\/g, "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function countNdjson(relPath) {
  const full = path.join(repoRoot, relPath);
  if (!fs.existsSync(full)) return 0;
  return fs.readFileSync(full, "utf8").split(/\r?\n/).filter((line) => line.trim()).length;
}

function extractReportSignals() {
  const integration = readJson(path.join(repoRoot, "reports", "openclaw-openmythos-mlc-gemma4-glyph-integration-latest.json"), {});
  const v6plus = readJson(path.join(repoRoot, "reports", "deep-wave-v6-plus-openclaw-openmythos-mlc-gemma4-latest.json"), {});
  const systemSurface = readJson(path.join(repoRoot, "reports", "system-surface-pid-indicator-index-latest.json"), {});
  const supervisorPid = readJson(path.join(repoRoot, "reports", "supervisor-pid-indicator-index-latest.json"), {});
  const devicePid = readJson(path.join(repoRoot, "reports", "device-pid-indicator-index-latest.json"), {});
  const vote = readJson(votePath, null);
  return {
    openclawChangedFiles: integration.openclaw?.changedFileCount || integration.counts?.openclawChangedFiles || 2376,
    modelGlyphs: integration.glyphs?.totalModelGlyphs || integration.counts?.modelGlyphs || 48,
    glyphAlphabet: integration.glyphs?.letteredAlphabet || integration.counts?.behcsLetteredGlyphAlphabet || 246,
    integrationSupervisors: integration.supervisors?.minted || integration.counts?.integrationSupervisors || 9,
    gnnLiveEdges: v6plus.gnn?.liveEdgeRows || countNdjson("data/behcs/gnn-live-edges.ndjson"),
    systemSurfacePids: systemSurface.counts?.totalRecords || 3589,
    supervisorPids: supervisorPid.counts?.supervisorRecords || 153,
    devicePids: devicePid.counts?.totalRecords || 349,
    cascadeVote: vote ? {
      voteId: vote.vote_id,
      totalBeats: vote.totalBeats,
      candidatesScanned: vote.candidatesScanned,
      executorDispatches: vote.executorDispatches,
      busAlive: vote.liveState?.busAlive,
      federationAlive: vote.liveState?.federationAlive,
      weakestDims: Array.from(new Set((vote.results || []).map((row) => row.selfReflection?.weakestOverall?.dim).filter(Boolean))).slice(0, 8),
      verdicts: (vote.results || []).map((row) => ({ id: row.candidate_id, verdict: row.verdict, confidence: row.avgConfidence }))
    } : null
  };
}

function domainRecord(domain) {
  const artifacts = domain.artifacts.map((artifact) => ({
    path: artifact,
    exists: existsRel(artifact),
    type: artifact.endsWith(".cube.js") ? "cube"
      : artifact.endsWith(".glpj.json") || artifact.includes("glyph-language") ? "glyph"
      : artifact.includes("/maps/") || artifact.includes("\\maps\\") ? "map"
      : artifact.includes("/index/") || artifact.includes("\\index\\") ? "index"
      : artifact.includes("/supervisors/") || artifact.includes("\\supervisors\\") ? "supervisor"
      : artifact.includes("/hermes/") || artifact.includes("\\hermes\\") ? "hermes"
      : artifact.includes("/shannon/") || artifact.includes("\\shannon\\") ? "shannon"
      : artifact.endsWith(".md") ? "report"
      : "artifact"
  }));
  return {
    ...domain,
    pid: `BH.STRUCT.${sha256(domain.id).slice(0, 12).toUpperCase()}`,
    artifactCount: artifacts.length,
    presentArtifacts: artifacts.filter((artifact) => artifact.exists).length,
    missingArtifacts: artifacts.filter((artifact) => !artifact.exists).map((artifact) => artifact.path),
    artifacts
  };
}

function buildEdges(domains) {
  const coreEdges = [
    ["asolaria_canonical", "hookwall", "routes_through"],
    ["hookwall", "gnn_fabric", "guards_before_graph_reasoning"],
    ["gnn_fabric", "omnishannon_shannon", "feeds_consensus"],
    ["omnishannon_shannon", "white_room_gc", "sends_to_contradiction_and_retention"],
    ["white_room_gc", "hermes_supervisor_of_supervisors", "reports_retained_evidence_to"],
    ["hermes_supervisor_of_supervisors", "asolaria_canonical", "dispatches_back_to"],
    ["sentinel_kr_instruct", "hookwall", "fail_closed_law_inputs"],
    ["openmythos_behcs_engine", "openclaw_openmythos_research", "provides_engine_overlay"],
    ["openclaw_openmythos_research", "cube_glyph_token_language", "mints_model_glyphs"],
    ["openclaude_claude", "cube_glyph_token_language", "uses_pid_controller_language"],
    ["opencode_open_code", "cube_glyph_token_language", "uses_pid_range_language"],
    ["cube_glyph_token_language", "asolaria_canonical", "preload_once_reference_by_pid"]
  ];
  const domainIds = new Set(domains.map((domain) => domain.id));
  return coreEdges
    .filter(([from, to]) => domainIds.has(from) && domainIds.has(to))
    .map(([from, to, relation]) => ({ from, to, relation, d11: "LOCAL_STRUCTURE_EDGE" }));
}

function buildCascadeInput(domains, signals, generatedAt) {
  return {
    vote_id: voteId,
    taskId: runId,
    planId: runId,
    generatedAt,
    mode: "deep-wave-all-cascades-structure-map",
    purpose: "Run all major Asolaria structure domains through BEHCS deep cascade to locate their cube, glyph, Hermes, Shannon, Hookwall, GNN, KR, OpenMythos, OpenClaude, OpenCode, and research-integration positions.",
    waveShape: "6x6x6x6x6x12 x omnishannon x GNN",
    chain: [
      "brown_hilbert_rooms",
      "hookwall",
      "forward_gnn",
      "reverse_gain_gnn",
      "omnishannon",
      "shannon",
      "super_white_room",
      "gc",
      "hermes"
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
    metadata: {
      systemSurfacePids: signals.systemSurfacePids,
      supervisorPids: signals.supervisorPids,
      devicePids: signals.devicePids,
      modelGlyphs: signals.modelGlyphs,
      glyphAlphabet: signals.glyphAlphabet,
      gnnLiveEdges: signals.gnnLiveEdges
    },
    candidates: domains.map((domain) => ({
      id: domain.id,
      label: domain.label,
      metadata: {
        proof_artifact: domain.artifacts.find((artifact) => artifact.exists)?.path || domain.artifacts[0]?.path || "missing",
        count: domain.presentArtifacts,
        scope_hours: 0.25,
        role: domain.role,
        posture: domain.posture
      },
      cube: domain.cube,
      expected_outcome: `${domain.label} is placed in the all-cascades structure map with concrete cube/glyph artifacts.`,
      next_step: "Use map/cube/GLPJ references rather than reloading the full source body into every worker packet."
    }))
  };
}

function buildCubeJs(generatedAt) {
  return `"use strict";

const deepWaveAllCascadesStructureCube = Object.freeze({
  cubeId: "deep-wave-all-cascades-structure-cube-cubed.v1",
  generatedAt: ${JSON.stringify(generatedAt)},
  status: "CUBE_CUBE_CUBED",
  route: "asolaria -> hookwall -> forward_gnn -> reverse_gain_gnn -> omnishannon -> shannon -> super_white_room -> gc -> hermes -> report",
  domains: ${JSON.stringify(DOMAINS.map((domain) => domain.id), null, 2)},
  classify(packet) {
    const id = String(packet && (packet.domainId || packet.id) || "");
    if (id.includes("kr") || id.includes("sentinel")) return "FAIL_CLOSED_RECOVERY_LAW";
    if (id.includes("hookwall")) return "POLICY_GATE";
    if (id.includes("gnn")) return "GRAPH_REASONING_GATE";
    if (id.includes("shannon")) return "CONSENSUS_GATE";
    if (id.includes("hermes")) return "SUPERVISOR_OF_SUPERVISORS";
    if (id.includes("glyph") || id.includes("cube")) return "LANGUAGE_TRANSPORT";
    return "STRUCTURE_SURFACE";
  },
  routePacket(packet) {
    return {
      classification: this.classify(packet),
      mutationAllowed: false,
      fanoutAllowed: false,
      requiredPath: this.route,
      referenceMode: "preload_once_reference_by_pid"
    };
  }
});

export default deepWaveAllCascadesStructureCube;
`;
}

function buildGlpj(domains, generatedAt) {
  return {
    glyphLanguageId: "deep-wave-all-cascades-structure-behcs256.glpj.v1",
    generatedAt,
    status: "GLPJ_MINTED",
    alphabet: "BEHCS-256",
    route: ["ASO", "HOOK", "FGNN", "RGNN", "OMNISH", "SHAN", "WHITE", "GC", "HERMES", "REPORT"],
    glyphs: domains.map((domain) => ({
      glyph: domain.glyph,
      pid: domain.pid,
      domain: domain.id,
      cube: domain.cube,
      role: domain.role,
      posture: domain.posture
    })),
    d11: "PROVEN_LOCAL_STRUCTURE_LANGUAGE"
  };
}

function build(generatedAt) {
  const signals = extractReportSignals();
  const domains = DOMAINS.map(domainRecord);
  const edges = buildEdges(domains);
  const cascadeInput = buildCascadeInput(domains, signals, generatedAt);
  const structure = {
    structureId: "deep-wave-all-cascades-structure.v1",
    generatedAt,
    status: signals.cascadeVote ? "ALL_CASCADES_STRUCTURE_MAPPED_WITH_V6_VOTE" : "ALL_CASCADES_STRUCTURE_MAPPED_AWAITING_V6_VOTE",
    waveShape: cascadeInput.waveShape,
    systemRoute: "asolaria -> hookwall -> forward_gnn -> reverse_gain_gnn -> omnishannon -> shannon -> super_white_room -> gc -> hermes -> report",
    truthBoundary: "Local descriptor, structure, and cascade analysis. No uncontrolled fanout, no installs, no downloads, no external model/API calls, no remote mutation.",
    signals,
    domains,
    edges,
    outputs: Object.fromEntries(Object.entries(OUTPUTS).map(([key, value]) => [key, repoRel(value)])),
    cascadeVotePath: repoRel(votePath),
    d11: "PROVEN_LOCAL_STRUCTURE_MAP"
  };
  const index = {
    indexId: "deep-wave-all-cascades-structure-index.v1",
    generatedAt,
    domains: domains.map((domain) => ({
      id: domain.id,
      pid: domain.pid,
      label: domain.label,
      role: domain.role,
      cube: domain.cube,
      glyph: domain.glyph,
      presentArtifacts: domain.presentArtifacts,
      missingArtifacts: domain.missingArtifacts
    })),
    d11: structure.d11
  };
  const map = {
    mapId: "deep-wave-all-cascades-structure-map-map-mapped.v1",
    generatedAt,
    status: "MAP_MAP_MAPPED",
    route: structure.systemRoute,
    nodes: domains.map((domain) => ({
      id: domain.id,
      pid: domain.pid,
      kind: domain.stage,
      label: domain.label,
      cube: domain.cube,
      glyph: domain.glyph
    })),
    edges,
    d11: structure.d11
  };
  const memory = {
    memoryId: "deep-wave-all-cascades-structure.v1",
    generatedAt,
    event: "All named system families were mapped into their cube, glyph, Hermes, Shannon, Hookwall, GNN, KR, OpenMythos, OpenClaude, OpenCode, and research-integration positions.",
    significance: "The system is not one agent pool. It is a layered authority fabric: Asolaria owns the local structure; Hookwall gates; GNN scores and demotes; OmniShannon/Shannon decide; white rooms isolate contradictions; GC compacts evidence; Hermes supervises supervisors; domain engines such as OpenMythos, Claude/OpenClaude, OpenCode, and OpenClaw research attach as gated lanes through cubes and GLPJ.",
    report: repoRel(OUTPUTS.reportMd),
    d11: structure.d11
  };
  const report = {
    reportId: "deep-wave-all-cascades-structure-latest",
    generatedAt,
    status: structure.status,
    counts: {
      domains: domains.length,
      edges: edges.length,
      artifacts: domains.reduce((sum, domain) => sum + domain.artifactCount, 0),
      presentArtifacts: domains.reduce((sum, domain) => sum + domain.presentArtifacts, 0),
      missingArtifacts: domains.reduce((sum, domain) => sum + domain.missingArtifacts.length, 0),
      cascadeCandidates: cascadeInput.candidates.length,
      cascadeBeats: signals.cascadeVote?.totalBeats || 0,
      executorDispatches: signals.cascadeVote?.executorDispatches || 0
    },
    route: structure.systemRoute,
    signals,
    outputs: structure.outputs,
    d11: structure.d11
  };
  const md = `# Deep Wave All-Cascades Structure

Generated: ${generatedAt}

Status: ${structure.status}

Route:
\`${structure.systemRoute}\`

## Counts

- Domains mapped: ${report.counts.domains}
- Structure edges: ${report.counts.edges}
- Artifacts referenced: ${report.counts.artifacts}
- Artifacts present: ${report.counts.presentArtifacts}
- Artifacts missing: ${report.counts.missingArtifacts}
- Cascade candidates: ${report.counts.cascadeCandidates}
- Cascade beats: ${report.counts.cascadeBeats}
- Executor dispatches: ${report.counts.executorDispatches}

## Core Signals

- System-surface PIDs: ${signals.systemSurfacePids}
- Supervisor PIDs: ${signals.supervisorPids}
- Device PIDs: ${signals.devicePids}
- Model glyphs: ${signals.modelGlyphs}
- BEHCS lettered glyph alphabet: ${signals.glyphAlphabet}
- GNN live edge rows: ${signals.gnnLiveEdges}

## Structure

${domains.map((domain) => `### ${domain.label}
- PID: \`${domain.pid}\`
- Cube: \`${domain.cube}\`
- Glyph: \`${domain.glyph}\`
- Role: ${domain.role}
- Stage: ${domain.stage}
- Posture: ${domain.posture}
- Present artifacts: ${domain.presentArtifacts}/${domain.artifactCount}
${domain.artifacts.filter((artifact) => artifact.exists).slice(0, 8).map((artifact) => `  - \`${artifact.path}\``).join("\n")}`).join("\n\n")}

## Edges

${edges.map((edge) => `- \`${edge.from}\` -> \`${edge.to}\`: ${edge.relation}`).join("\n")}

## Boundary

${structure.truthBoundary}

D11: ${structure.d11}
`;
  return { structure, index, map, memory, report, md, cascadeInput, glpj: buildGlpj(domains, generatedAt), cubeJs: buildCubeJs(generatedAt), edges };
}

function run() {
  const generatedAt = new Date().toISOString();
  const built = build(generatedAt);
  writeJson(OUTPUTS.structure, built.structure);
  writeText(OUTPUTS.edges, built.edges.map((edge) => JSON.stringify(edge)).join("\n") + "\n");
  writeJson(OUTPUTS.cascadeInput, built.cascadeInput);
  writeJson(OUTPUTS.reportJson, built.report);
  writeText(OUTPUTS.reportMd, built.md);
  writeJson(OUTPUTS.memory, built.memory);
  writeJson(OUTPUTS.index, built.index);
  writeJson(OUTPUTS.map, built.map);
  writeJson(OUTPUTS.glpj, built.glpj);
  writeText(OUTPUTS.cube, built.cubeJs);
  console.log(JSON.stringify({
    ok: true,
    status: built.structure.status,
    domains: built.structure.domains.length,
    artifactsPresent: built.report.counts.presentArtifacts,
    cascadeCandidates: built.cascadeInput.candidates.length,
    cascadeVotePresent: Boolean(built.structure.signals.cascadeVote),
    cascadeInput: repoRel(OUTPUTS.cascadeInput),
    report: repoRel(OUTPUTS.reportMd)
  }, null, 2));
}

if (require.main === module) {
  run();
}

module.exports = {
  build,
  DOMAINS,
  OUTPUTS
};
