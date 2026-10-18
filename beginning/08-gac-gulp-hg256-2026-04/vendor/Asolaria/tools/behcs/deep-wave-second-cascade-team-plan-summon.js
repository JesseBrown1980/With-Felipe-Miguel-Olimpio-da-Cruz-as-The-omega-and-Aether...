#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_RUN_ID = "deep-wave-second-cascade-team-plan-20260428";
const TASK_COUNT = 256;
const CASCADE_AXES = [6, 6, 6, 6, 6, 12];
const CASCADE_CELL_COUNT = CASCADE_AXES.reduce((product, value) => product * value, 1);

const TEAM = Object.freeze([
  {
    id: "asolaria",
    title: "Chief",
    lane: "chief",
    authority: "chief-orchestrator",
    route: "state-only",
    assignment: "Hold chief review. Do not execute until every servant plan is READY or explicitly dispositioned."
  },
  {
    id: "helm",
    title: "Director",
    lane: "director",
    authority: "cascade-sequencer",
    route: "admin-terminal",
    assignment: "Sequence the Deep Wave SECOND cascade, assign Vector/Rook/Falcon/Brain/Selector/Omnispindle/Flywheel lanes, and collect readiness."
  },
  {
    id: "gaia",
    title: "Memory Index Map Steward",
    lane: "memory-index-map",
    authority: "gaia-sub-colony-planner",
    route: "root-inbox-and-admin-terminal",
    assignment: "Load memory, index, map, operator first-message canon, and current 10B/20B evidence; return the task plan context."
  },
  {
    id: "dasein",
    title: "Continuity Witness",
    lane: "continuity",
    authority: "meaning-and-why",
    route: "root-inbox",
    assignment: "State who, when, where, why, and how this run should stay coherent across compression and agent handoff."
  },
  {
    id: "sentinel",
    title: "KR And Fail-Closed Guard",
    lane: "safety",
    authority: "sentinel-kr",
    route: "admin-terminal",
    assignment: "Instruct KR, list DENY rules, enforce no execution before readiness, and classify every risky task as READY/HOLD/BLOCK."
  },
  {
    id: "kr",
    title: "KR Release Guard",
    lane: "release-deny",
    authority: "kr-deny-rules",
    route: "sentinel-mediated",
    assignment: "Define release conditions, proof requirements, and stop rules for model selector, GC, GNN, OmniShannon, and device lanes."
  },
  {
    id: "vector",
    title: "Brain Lane",
    lane: "brain-reasoning",
    authority: "brain-model-policy",
    route: "helm-mediated-omnispindle",
    assignment: "Plan the selector table for big tasks, small tasks, validators, summaries, and hard reasoning without pinning one model to all work."
  },
  {
    id: "rook",
    title: "Operations And GC Lane",
    lane: "ops-gc",
    authority: "storage-and-runtime",
    route: "helm-mediated-omnispindle",
    assignment: "Plan GC, D-drive spill, inbox rotation, tracker retention, and evidence-preserving cleanup."
  },
  {
    id: "falcon",
    title: "Device And Federation Lane",
    lane: "device-federation",
    authority: "phone-and-law001",
    route: "helm-mediated-omnispindle",
    assignment: "Plan Falcon/Aether LAW-001 reactivation without device mutation until supervisor gates pass."
  },
  {
    id: "selector",
    title: "Model Selector",
    lane: "model-selection",
    authority: "task-to-model-table",
    route: "helm-mediated-omnispindle",
    assignment: "Make the model selector choosable by task class, cost, timeout, failure class, and evidence need."
  },
  {
    id: "brain",
    title: "Worker Brain",
    lane: "worker-router",
    authority: "brain-router",
    route: "helm-mediated-omnispindle",
    assignment: "Plan how worker-router, brain orchestrator, and selector decide local/free/validator/deep calls."
  },
  {
    id: "omnispindles",
    title: "Omnispindle Council",
    lane: "parallel-lane-council",
    authority: "lane-orchestration",
    route: "helm-mediated-omnispindle",
    assignment: "Plan parent lanes helm/vector/rook/forge/falcon/sentinel and how each receives bounded child packets."
  },
  {
    id: "omniflywheels",
    title: "Omniflywheel Review Loops",
    lane: "review-loop-council",
    authority: "tracker-and-feedback",
    route: "helm-mediated-omnispindle",
    assignment: "Plan repeated tracker batches, mistake/genius marks, GNN classification, and readiness feedback loops."
  },
  {
    id: "omnishannon",
    title: "OmniShannon Parts",
    lane: "consensus",
    authority: "multi-voice-vote",
    route: "helm-mediated-omnispindle",
    assignment: "Plan six-part Shannon votes for scout, evidence, executor, fabric, voice, and planner."
  },
  {
    id: "gnn",
    title: "GNN Edge Classifier",
    lane: "edge-classifier",
    authority: "gnn-proof",
    route: "helm-mediated-omnispindle",
    assignment: "Plan real edge tests, current D11 correction checks, and no resurrection of falsified 300B claims."
  },
  {
    id: "white-rooms",
    title: "White Rooms",
    lane: "contradiction-review",
    authority: "white-room-supervision",
    route: "sentinel-and-helm-mediated",
    assignment: "Plan contradiction rooms before any trigger, with explicit HOLD/BLOCK output if evidence is weak."
  },
  {
    id: "garbage-collectors",
    title: "Garbage Collectors",
    lane: "gc",
    authority: "compact-not-delete",
    route: "rook-and-sentinel-mediated",
    assignment: "Plan compaction and rotation that preserves source evidence, hashes, quarantines, and operator receipts."
  },
  {
    id: "liris",
    title: "Federated Mirror",
    lane: "federation",
    authority: "bounded-peer",
    route: "outbound-liris",
    assignment: "Read the plan as bounded mirror input and return READY/HOLD/BLOCK only through LAW-001 or outbound relay."
  }
]);

const PHASES = Object.freeze([
  "load-memory-index-map-cube-glyph",
  "operator-first-message-and-boot-lock-check",
  "selector-table-plan",
  "deep-wave-second-cascade-plan",
  "omnispindle-lane-plan",
  "omniflywheel-batch-rotation-plan",
  "gc-extra-drive-spill-plan",
  "gnn-omnishannon-white-room-plan",
  "falcon-aether-law001-device-plan",
  "kr-sentinel-trigger-deny-plan",
  "agent-readiness-collection",
  "chief-director-trigger-decision"
]);

const EVIDENCE_REFS = Object.freeze([
  "reports/operator-first-message-intake-latest.md",
  "reports/real-free-agent-logical-scale-ledger-latest.md",
  "data/behcs/orchestration/real-free-agent-system-test-logical-10b-20260428/real-free-agent-logical-scale-ledger-manifest.v1.json",
  "data/behcs/orchestration/real-free-agent-system-test-logical-10b-20260428/wave33d-10b-tracker-push-manifest.json",
  "data/behcs/orchestration/real-free-agent-system-test-10b-empirical-20260428/supervisor-lanes/PROF-REAL-FREE-AGENT-10B-EMPIRICAL.summary.json",
  ".asolaria-active-session.lock",
  "data/behcs/boot/agent-terminal-boot-manifest.v1.json"
]);

function getRoot(options = {}) {
  return path.resolve(options.root || process.env.ASOLARIA_TEAM_PLAN_ROOT || path.join(__dirname, "..", ".."));
}

function rel(root, repoPath) {
  return path.join(root, repoPath);
}

function repoRel(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function writeJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function appendNdjson(filePath, value) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sha256FileIfPresent(root, repoPath) {
  const filePath = rel(root, repoPath);
  try {
    return {
      path: repoPath,
      exists: true,
      bytes: fs.statSync(filePath).size,
      sha256: crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
    };
  } catch (_error) {
    return {
      path: repoPath,
      exists: false,
      bytes: 0,
      sha256: ""
    };
  }
}

function glyphToken(kind, id, seed = "") {
  const hash = sha256Text(`${kind}:${id}:${seed}`);
  return `HG256:${kind.toUpperCase()}:${hash.slice(0, 16)}:D42_ORCHESTRATION`;
}

function buildPaths(root, runId = DEFAULT_RUN_ID) {
  const runRoot = rel(root, `data/behcs/orchestration/${runId}`);
  return {
    root,
    runId,
    runRoot,
    planJson: path.join(runRoot, "deep-wave-second-cascade-team-plan.v1.json"),
    planMd: path.join(runRoot, "deep-wave-second-cascade-team-plan.v1.md"),
    taskList: path.join(runRoot, "deep-wave-second-cascade-team-tasks-256.ndjson"),
    packets: path.join(runRoot, "named-agent-plan-summon-packets.ndjson"),
    readinessGate: path.join(runRoot, "trigger-readiness-gate.v1.json"),
    readinessSchema: path.join(runRoot, "agent-readiness-response-schema.v1.json"),
    supervisorQueue: path.join(runRoot, "supervisor-plan-review-queue.ndjson"),
    dispatchLog: path.join(runRoot, "summon-dispatch-log.ndjson"),
    stateJson: path.join(runRoot, "deep-wave-second-cascade-team-plan-state.v1.json"),
    inboxRoot: path.join(runRoot, "agent-inboxes"),
    memory: rel(root, "data/behcs/memory/deep-wave-second-cascade-team-plan.v1.json"),
    index: rel(root, "data/behcs/index/deep-wave-second-cascade-team-plan-index.v1.json"),
    map: rel(root, "data/behcs/maps/asolaria/deep-wave-second-cascade-team-plan-map-map-mapped.v1.json"),
    cube: rel(root, "data/behcs/cubes/deep-wave-second-cascade-team-plan-cube-cubed.cube.js"),
    glpj: rel(root, "data/behcs/codex/glyph-language/deep-wave-second-cascade-team-plan-behcs256.glpj.json"),
    reportJson: rel(root, "reports/deep-wave-second-cascade-team-plan-latest.json"),
    reportMd: rel(root, "reports/deep-wave-second-cascade-team-plan-latest.md"),
    globalInbox: rel(root, "data/behcs/inbox.ndjson"),
    globalOutbox: rel(root, "data/behcs/outbox.ndjson"),
    gnnEdges: rel(root, "data/behcs/gnn-live-edges.ndjson"),
    runtimeInboxes: {
      helm: [rel(root, "runtime/admin-terminals/helm/inbox.ndjson")],
      sentinel: [rel(root, "runtime/admin-terminals/sentinel/inbox.ndjson")],
      gaia: [
        rel(root, "runtime/gaia-inbox.ndjson"),
        rel(root, "runtime/admin-terminals/gaia/inbox.ndjson")
      ],
      dasein: [rel(root, "runtime/dasein-inbox.ndjson")],
      liris: [
        rel(root, "runtime/outbound-liris-inbox.ndjson"),
        rel(root, "runtime/admin-terminals/liris/inbox.ndjson")
      ]
    }
  };
}

function runtimeTargetsForAgent(agentId, paths) {
  if (paths.runtimeInboxes[agentId]) {
    return paths.runtimeInboxes[agentId];
  }
  if (agentId === "kr" || agentId === "white-rooms") {
    return paths.runtimeInboxes.sentinel;
  }
  if (["vector", "rook", "falcon", "selector", "brain", "omnispindles", "omniflywheels", "omnishannon", "gnn", "garbage-collectors"].includes(agentId)) {
    return paths.runtimeInboxes.helm;
  }
  return [];
}

function buildPlan({ root = getRoot(), generatedAt = new Date().toISOString(), runId = DEFAULT_RUN_ID } = {}) {
  const paths = buildPaths(root, runId);
  const evidence = EVIDENCE_REFS.map((repoPath) => sha256FileIfPresent(root, repoPath));
  const plan = {
    planId: runId,
    generatedAt,
    status: "PLAN_READY_TEAM_SUMMON_PENDING_AGENT_RESPONSES",
    operator: {
      witness: "jesse",
      instruction: "Plan first. Named agents make plans in BEHCS-256 language. Use tasks. Trigger only when everyone is READY."
    },
    organization: {
      chief: "asolaria",
      director: "helm",
      servants: TEAM.filter((agent) => !["asolaria", "helm"].includes(agent.id)).map((agent) => agent.id),
      boundary: "codex_guides_and_orchestrates; supervisor_PROF_council_authority_authors_and_dispositions"
    },
    cascade: {
      name: "Deep Wave SECOND cascade",
      axes: CASCADE_AXES,
      logicalCellsPerRound: CASCADE_CELL_COUNT,
      overlays: ["OmniShannon", "GNN", "BEHCS256", "Hookwall", "WhiteRoom", "GC"],
      formula: "6x6x6x6x6x12 x OmniShannon x GNN x Glyph256",
      mode: "plan_first_then_readiness_then_trigger"
    },
    evidence,
    team: TEAM,
    triggerPolicy: {
      default: "CLOSED",
      triggerCommand: "NOT_ARMED",
      opensOnlyAfter: [
        "all_direct_inbox_packets_delivered",
        "helm_director_plan_READY",
        "gaia_memory_index_map_plan_READY",
        "dasein_continuity_plan_READY",
        "sentinel_kr_deny_plan_READY",
        "liris_bounded_mirror_plan_READY_or_HOLD_dispositioned",
        "helm_fanout_for_vector_rook_falcon_brain_selector_omnispindles_omniflywheels_READY",
        "white_room_and_gc_reviews_READY",
        "chief_asolaria_review",
        "operator_trigger_after_readiness"
      ],
      blockedBeforeTrigger: [
        "executor_dispatch",
        "device_mutation",
        "adapter_or_hook_wiring",
        "canon_or_council_mutation",
        "evidence_deletion",
        "unbounded_model_fanout",
        "provider_auth_bypass"
      ]
    },
    outputs: Object.fromEntries(Object.entries(paths)
      .filter(([, value]) => typeof value === "string" && value.startsWith(root))
      .map(([key, value]) => [key, repoRel(root, value)]))
  };
  plan.stateHash = sha256Text(JSON.stringify({
    planId: plan.planId,
    generatedAt: plan.generatedAt,
    operator: plan.operator,
    organization: plan.organization,
    cascade: plan.cascade,
    evidence: plan.evidence,
    team: plan.team.map((agent) => [agent.id, agent.assignment]),
    triggerPolicy: plan.triggerPolicy
  }));
  return { paths, plan };
}

function buildTask(index, generatedAt) {
  const phase = PHASES[(index - 1) % PHASES.length];
  const agent = TEAM[(index - 1) % TEAM.length];
  const glyphSlot = index - 1;
  return {
    taskId: `DW2C-TASK-${String(index).padStart(3, "0")}`,
    generatedAt,
    status: "PLANNED_PENDING_NAMED_AGENT_PLAN",
    glyphSlot,
    glyphToken: glyphToken("task", index, `${agent.id}:${phase}`),
    behcs: {
      dialect: "BEHCS256_ASCII_TOKEN_FORM",
      route: ["MEMORY", "INDEX", "MAP", "CUBE", "GLYPH", "TASK", "READY_GATE"],
      dimensionTokens: ["D39_MEMORY", "D13_INDEX", "D35_MAP", "D42_CUBE", "D47_BOUNDARY", "D50_RATIFY"]
    },
    assignedAgent: agent.id,
    lane: agent.lane,
    phase,
    objective: `${agent.title} plans ${phase} for ${CASCADE_AXES.join("x")} with OmniShannon/GNN/Glyph256 overlays.`,
    acceptanceGates: [
      "plan_written",
      "task_inventory_named",
      "evidence_refs_listed",
      "ready_hold_block_declared",
      "no_execution_before_trigger"
    ],
    executionAllowed: false
  };
}

function buildSummonText(agent, plan) {
  return [
    "BEHCS256_PACKET V1",
    `PACKET=${glyphToken("summon", agent.id, plan.stateHash)}`,
    "MODE=PLAN_ONLY",
    "CHIEF=asolaria",
    "DIRECTOR=helm",
    `SERVANT=${agent.id}`,
    `LANE=${agent.lane}`,
    `AUTHORITY=${agent.authority}`,
    `CASCADE=${CASCADE_AXES.join("x")}xOmniShannonxGNNxGlyph256`,
    `RUN=${plan.planId}`,
    `PLAN=${plan.outputs.planJson}`,
    `TASKS=${plan.outputs.taskList}`,
    `GATE=${plan.outputs.readinessGate}`,
    "INSTRUCTION=Make your plan in BEHCS-256 token language before any work.",
    `ASSIGNMENT=${agent.assignment}`,
    "RETURN=READY|HOLD|BLOCK plus tasks, evidence paths, deny gates, and next requested trigger.",
    "BOUNDARY=no executor dispatch, no canon mutation, no adapter or hook wiring, no evidence deletion before chief/director/operator readiness."
  ].join("\n");
}

function buildPacket(agent, plan, generatedAt, paths) {
  const runtimeTargets = runtimeTargetsForAgent(agent.id, paths).map((targetPath) => repoRel(paths.root, targetPath));
  return {
    id: `DW2C-SUMMON-${agent.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    ts: generatedAt,
    source: "Asolaria-canonical",
    reason: "deep_wave_second_cascade_team_plan_request",
    mode: "append",
    target: agent.id,
    route: agent.route,
    runtimeTargets,
    title: `${agent.title} BEHCS-256 plan request`,
    text: buildSummonText(agent, plan),
    behcs: {
      dialect: "BEHCS256_ASCII_TOKEN_FORM",
      glyphToken: glyphToken("packet", agent.id, plan.stateHash),
      cascade: plan.cascade.formula,
      statusRequested: "READY_HOLD_BLOCK"
    }
  };
}

function buildReadinessGate(generatedAt, plan) {
  return {
    gateId: `${plan.planId}.trigger-readiness`,
    generatedAt,
    status: "CLOSED_PENDING_AGENT_READY_RESPONSES",
    triggerCommand: "NOT_ARMED",
    requiredResponses: TEAM.map((agent) => ({
      agent: agent.id,
      route: agent.route,
      requiredStatus: agent.id === "liris" ? "READY_OR_HOLD_DISPOSITIONED" : "READY"
    })),
    opensOnlyAfter: plan.triggerPolicy.opensOnlyAfter,
    blockedBeforeTrigger: plan.triggerPolicy.blockedBeforeTrigger
  };
}

function buildReadinessSchema(plan) {
  return {
    schema: "deep-wave-second-cascade-agent-readiness-response.v1",
    planId: plan.planId,
    requiredFields: [
      "agent",
      "status",
      "summary",
      "tasks",
      "evidence",
      "denyGates",
      "requestedNextTrigger"
    ],
    statusEnum: ["READY", "HOLD", "BLOCK"],
    note: "Agents must return a plan first. A READY response is not executor authorization."
  };
}

function buildMemory(plan) {
  return {
    eventId: "deep-wave-second-cascade-team-plan.v1",
    generatedAt: plan.generatedAt,
    status: "MEMORY_READY_TEAM_SUMMONED_TO_PLAN",
    significance: "Jesse corrected Codex from single-agent execution into Asolaria organization mode: one chief, one director, many servants, BEHCS-256 plan-first language, readiness gate before trigger.",
    plan: plan.outputs.planJson,
    taskList: plan.outputs.taskList,
    readinessGate: plan.outputs.readinessGate,
    stateHash: plan.stateHash
  };
}

function buildIndex(plan, packets) {
  return {
    indexId: "deep-wave-second-cascade-team-plan-index.v1",
    generatedAt: plan.generatedAt,
    status: "INDEX_READY_TEAM_PLAN",
    keys: [
      "BEHCS-256",
      "Deep Wave SECOND cascade",
      "6x6x6x6x6x12",
      "OmniShannon",
      "GNN",
      "Glyph256",
      "Helm",
      "Gaia",
      "Dasein",
      "Sentinel",
      "KR",
      "Vector",
      "Rook",
      "Falcon",
      "Brain",
      "Selector",
      "Omnispindles",
      "Omniflywheels",
      "GC",
      "WhiteRoom"
    ],
    packets: packets.map((packet) => ({ id: packet.id, target: packet.target, route: packet.route })),
    evidence: plan.evidence,
    stateHash: plan.stateHash
  };
}

function buildMap(plan) {
  return {
    mapId: "deep-wave-second-cascade-team-plan-map-map-mapped.v1",
    generatedAt: plan.generatedAt,
    status: "MAP_MAP_MAPPED_READY_TEAM_PLAN",
    routes: [
      { from: "asolaria", to: "helm", edge: "chief_to_director", gate: "plan_first" },
      { from: "helm", to: "vector_rook_falcon_brain_selector_omnispindles_omniflywheels", edge: "director_fanout", gate: "readiness_required" },
      { from: "gaia", to: "memory_index_map_cube_glyph", edge: "context_load", gate: "evidence_refs" },
      { from: "dasein", to: "who_when_where_why_how", edge: "continuity", gate: "compression_wake_context" },
      { from: "sentinel", to: "kr_white_rooms_gc", edge: "deny_gate", gate: "fail_closed" },
      { from: "selector", to: "brain_worker_router", edge: "model_policy", gate: "choosable_table" },
      { from: "omniflywheels", to: "tracker_batches", edge: "batch_rotation", gate: "gc_spill" },
      { from: "liris", to: "bounded_federation", edge: "mirror_readiness", gate: "law001_or_outbound_relay" }
    ],
    stateHash: plan.stateHash
  };
}

function buildCube(plan) {
  const cube = {
    id: "deep-wave-second-cascade-team-plan-cube-cubed",
    generatedAt: plan.generatedAt,
    status: "CUBE_CUBE_CUBED_READY_TEAM_PLAN",
    axes: {
      D1_ACTOR: TEAM.map((agent) => agent.id).join("|"),
      D6_GATE: "closed_until_ready",
      D11_PROOF: "evidence_paths_and_hashes",
      D13_INDEX: "team_plan_index",
      D35_MAP: "map_map_mapped_routes",
      D39_MEMORY: "operator_correction_memory",
      D42_ORCHESTRATION: "chief_director_servants",
      D47_BOUNDARY: "codex_guide_not_authority",
      D50_RATIFY: "chief_operator_trigger_after_ready"
    },
    cascade: plan.cascade,
    taskCount: TASK_COUNT,
    stateHash: plan.stateHash
  };
  return `// cube: deep-wave-second-cascade-team-plan-cube-cubed | BEHCS-256 ASCII token form\nexport const CUBE = ${JSON.stringify(cube, null, 2)};\n`;
}

function buildGlpj(plan, packets) {
  return {
    glpjId: "deep-wave-second-cascade-team-plan-behcs256.glpj",
    generatedAt: plan.generatedAt,
    status: "GLYPH_LANGUAGE_PACKET_READY",
    alphabet: "BEHCS256_ASCII_TOKEN_FORM",
    cascade: plan.cascade,
    glyphs: packets.map((packet) => ({
      target: packet.target,
      glyphToken: packet.behcs.glyphToken,
      packet: packet.id
    })),
    stateHash: plan.stateHash
  };
}

function buildReport(plan, gate, packets) {
  const directDeliveries = packets.reduce((sum, packet) => sum + packet.runtimeTargets.length, 0);
  return {
    reportId: "deep-wave-second-cascade-team-plan-latest",
    generatedAt: plan.generatedAt,
    status: plan.status,
    stateHash: plan.stateHash,
    namedAgents: TEAM.length,
    taskCount: TASK_COUNT,
    cascadeCellsPerRound: CASCADE_CELL_COUNT,
    runtimeDeliveryTargets: directDeliveries,
    triggerGate: gate.status,
    outputs: plan.outputs
  };
}

function buildReportMd(report, packets) {
  const packetRows = packets.map((packet) => `| ${packet.target} | ${packet.route} | ${packet.runtimeTargets.join(", ") || "plan artifact only"} | ${packet.id} |`).join("\n");
  return `# Deep Wave SECOND Cascade Team Plan

Generated: ${report.generatedAt}

Status: ${report.status}

- State hash: \`${report.stateHash}\`
- Named agents: ${report.namedAgents}
- Task rows: ${report.taskCount}
- Cascade cells per round: ${report.cascadeCellsPerRound}
- Runtime delivery targets: ${report.runtimeDeliveryTargets}
- Trigger gate: ${report.triggerGate}

## Packets

| Agent | Route | Runtime target | Packet |
| --- | --- | --- | --- |
${packetRows}

## Outputs

${Object.entries(report.outputs).map(([key, value]) => `- ${key}: \`${value}\``).join("\n")}
`;
}

function buildSupervisorQueue(plan) {
  return TEAM.map((agent) => ({
    id: `DW2C-SUPERVISOR-REVIEW-${agent.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    title: `${agent.title} readiness review`,
    objective: `Review ${agent.id} plan output for READY/HOLD/BLOCK before any trigger.`,
    requestedWorker: "existing_supervisor_prof_council_ring",
    pid: `BH.DW2C.${agent.id.toUpperCase().replace(/[^A-Z0-9]+/g, ".")}`,
    pidScope: "planning_readiness_only",
    consentScope: "operator_jesse_authorized_plan_summon",
    allowedPaths: [
      plan.outputs.runRoot,
      plan.outputs.planJson,
      plan.outputs.taskList,
      plan.outputs.readinessGate,
      "reports"
    ],
    expectedArtifacts: [
      plan.outputs.planJson,
      plan.outputs.taskList,
      plan.outputs.packets,
      plan.outputs.readinessGate
    ],
    acceptanceGates: [
      "plan_first",
      "evidence_refs",
      "ready_hold_block",
      "no_execution_before_trigger"
    ],
    proofRequired: true,
    operatorApproval: false,
    remoteMutation: false,
    externalApiCall: false,
    deviceAccess: false,
    writesGit: false,
    deletesEvidence: false,
    source: "deep-wave-second-cascade-team-plan-summon"
  }));
}

function buildBundle(options = {}) {
  const { paths, plan } = buildPlan(options);
  const generatedAt = plan.generatedAt;
  const tasks = Array.from({ length: TASK_COUNT }, (_, index) => buildTask(index + 1, generatedAt));
  const packets = TEAM.map((agent) => buildPacket(agent, plan, generatedAt, paths));
  const gate = buildReadinessGate(generatedAt, plan);
  const readinessSchema = buildReadinessSchema(plan);
  const memory = buildMemory(plan);
  const index = buildIndex(plan, packets);
  const map = buildMap(plan);
  const cube = buildCube(plan);
  const glpj = buildGlpj(plan, packets);
  const supervisorQueue = buildSupervisorQueue(plan);
  const report = buildReport(plan, gate, packets);
  const reportMd = buildReportMd(report, packets);
  const state = {
    stateId: `${plan.planId}.state`,
    generatedAt,
    status: "TEAM_PLAN_PACKET_BUILT",
    stateHash: plan.stateHash,
    counts: {
      agents: TEAM.length,
      tasks: tasks.length,
      packets: packets.length,
      supervisorQueue: supervisorQueue.length,
      runtimeDeliveryTargets: packets.reduce((sum, packet) => sum + packet.runtimeTargets.length, 0)
    },
    outputs: plan.outputs
  };
  return { paths, plan, tasks, packets, gate, readinessSchema, memory, index, map, cube, glpj, supervisorQueue, report, reportMd, state };
}

function writeBundle(bundle, { summon = false } = {}) {
  const { paths, plan, tasks, packets, gate, readinessSchema, memory, index, map, cube, glpj, supervisorQueue, report, reportMd, state } = bundle;
  writeJson(paths.planJson, plan);
  writeText(paths.planMd, buildPlanMarkdown(plan, packets));
  writeText(paths.taskList, tasks.map((task) => JSON.stringify(task)).join("\n"));
  writeText(paths.packets, packets.map((packet) => JSON.stringify(packet)).join("\n"));
  writeJson(paths.readinessGate, gate);
  writeJson(paths.readinessSchema, readinessSchema);
  writeText(paths.supervisorQueue, supervisorQueue.map((packet) => JSON.stringify(packet)).join("\n"));
  writeJson(paths.memory, memory);
  writeJson(paths.index, index);
  writeJson(paths.map, map);
  writeText(paths.cube, cube);
  writeJson(paths.glpj, glpj);
  writeJson(paths.reportJson, report);
  writeText(paths.reportMd, reportMd);
  writeJson(paths.stateJson, state);

  const dispatches = [];
  for (const packet of packets) {
    const planInboxPath = path.join(paths.inboxRoot, `${packet.target}.ndjson`);
    appendNdjson(planInboxPath, packet);
    dispatches.push({
      ts: plan.generatedAt,
      target: packet.target,
      route: repoRel(paths.root, planInboxPath),
      packet: packet.id,
      status: "plan_artifact_inbox_appended"
    });
    if (summon) {
      for (const runtimeTarget of runtimeTargetsForAgent(packet.target, paths)) {
        appendNdjson(runtimeTarget, {
          id: packet.id,
          ts: plan.generatedAt,
          source: "Asolaria-canonical",
          reason: packet.reason,
          mode: "append",
          text: packet.text
        });
        dispatches.push({
          ts: plan.generatedAt,
          target: packet.target,
          route: repoRel(paths.root, runtimeTarget),
          packet: packet.id,
          status: "runtime_inbox_appended"
        });
      }
    }
  }
  for (const row of dispatches) {
    appendNdjson(paths.dispatchLog, row);
  }
  appendNdjson(paths.globalInbox, {
    id: `${plan.planId}-${Date.now()}`,
    ts: plan.generatedAt,
    from: "asolaria-canonical",
    to: "deep-wave-second-cascade-team",
    verb: "PLAN_SUMMON_PACKET_READY",
    body: {
      stateHash: plan.stateHash,
      summon,
      agents: TEAM.length,
      tasks: TASK_COUNT,
      gate: gate.status,
      report: repoRel(paths.root, paths.reportMd)
    }
  });
  appendNdjson(paths.globalOutbox, {
    id: `${plan.planId}-hermes-${Date.now()}`,
    ts: plan.generatedAt,
    from: "hermes",
    to: "asolaria-canonical",
    verb: "HERMES_TEAM_PLAN_SUMMON_READY",
    body: {
      stateHash: plan.stateHash,
      plan: repoRel(paths.root, paths.planJson),
      gate: gate.status
    }
  });
  appendNdjson(paths.gnnEdges, {
    id: `${plan.planId}-gnn-${Date.now()}`,
    ts: plan.generatedAt,
    from: "asolaria",
    to: "named-agent-plan-readiness",
    verb: "requires_ready_hold_block_before_trigger",
    weight: 0.997,
    cascadeCellsPerRound: CASCADE_CELL_COUNT,
    stateHash: plan.stateHash
  });
  return {
    ok: true,
    action: summon ? "write-and-summon" : "write",
    stateHash: plan.stateHash,
    dispatches,
    outputs: plan.outputs
  };
}

function buildPlanMarkdown(plan, packets) {
  return `# Deep Wave SECOND Cascade Team Plan

Generated: ${plan.generatedAt}

Status: ${plan.status}

Operator: ${plan.operator.witness}

Instruction: ${plan.operator.instruction}

Formula: ${plan.cascade.formula}

Chief: ${plan.organization.chief}

Director: ${plan.organization.director}

Trigger: closed until READY/HOLD/BLOCK responses are reviewed.

## Agents

${packets.map((packet) => `- ${packet.target}: ${packet.title} via ${packet.route}`).join("\n")}

## Evidence

${plan.evidence.map((item) => `- ${item.exists ? "present" : "missing"} ${item.path}${item.sha256 ? ` sha256 ${item.sha256}` : ""}`).join("\n")}
`;
}

function run(argv = process.argv.slice(2)) {
  const action = argv[0] || "status";
  const summon = argv.includes("--summon");
  const write = action === "write" || summon;
  const bundle = buildBundle();
  if (!write) {
    return {
      ok: true,
      action: "preview",
      stateHash: bundle.plan.stateHash,
      agents: TEAM.length,
      tasks: TASK_COUNT,
      triggerGate: bundle.gate.status,
      outputs: bundle.plan.outputs
    };
  }
  return writeBundle(bundle, { summon });
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(run(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error && error.message || error) }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_RUN_ID,
  TASK_COUNT,
  CASCADE_AXES,
  CASCADE_CELL_COUNT,
  TEAM,
  buildBundle,
  buildPlan,
  buildTask,
  buildPacket,
  buildReadinessGate,
  buildSummonText,
  writeBundle,
  run
};
