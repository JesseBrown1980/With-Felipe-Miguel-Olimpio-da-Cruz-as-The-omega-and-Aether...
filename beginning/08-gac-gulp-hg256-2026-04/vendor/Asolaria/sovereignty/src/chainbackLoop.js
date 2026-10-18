const fs = require("node:fs");
const path = require("node:path");

const {
  buildSubManagerPacket,
  submitAgentPlan,
  reviewAgentPlan
} = require("./orchestratorApprovalLoop");

const LANGUAGE_FREEZE_CONSTRAINT = "language-freeze:no-living-language-mutation-before-prod";

const STAGE_SEQUENCE = Object.freeze([
  Object.freeze({
    stage: "pre-dev",
    layer: "scope",
    objective: "Frame the slice before code starts",
    checklist: ["state owner intent", "set acceptance", "bound the lane"],
    subtasks: ["capture assumptions", "declare dependencies"],
    reviewNote: "scope anchored before mutation"
  }),
  Object.freeze({
    stage: "dev",
    layer: "build",
    objective: "Build the bounded implementation slice",
    checklist: ["change the code", "keep the slice reversible", "preserve index references"],
    subtasks: ["implement the smallest viable patch", "record what changed"],
    reviewNote: "implementation stays inside the declared lane"
  }),
  Object.freeze({
    stage: "pre-staging",
    layer: "integration",
    objective: "Check wiring before the staging gate",
    checklist: ["verify dependencies", "check chain connectivity", "surface blockers early"],
    subtasks: ["trace direct edges", "trace indirect edges"],
    reviewNote: "integration path is honest before staging"
  }),
  Object.freeze({
    stage: "staging",
    layer: "verification",
    objective: "Run the reversible staging proof",
    checklist: ["exercise the slice", "write the proof", "keep rollback ready"],
    subtasks: ["collect outputs", "compare against acceptance"],
    reviewNote: "staging carries proof, not optimism"
  }),
  Object.freeze({
    stage: "pre-prod",
    layer: "risk",
    objective: "Harden the release boundary before production",
    checklist: ["score risk", "verify observability", "confirm rollback"],
    subtasks: ["check alarms", "check guardrails"],
    reviewNote: "risk posture is explicit before production"
  }),
  Object.freeze({
    stage: "prod",
    layer: "operations",
    objective: "Ship, observe, and feed the next indexed loop",
    checklist: ["publish the result", "watch the relays", "index the outcome"],
    subtasks: ["record runtime truth", "open the next loop cleanly"],
    reviewNote: "production stays indexed and observable"
  })
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendNdjson(filePath, row) {
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return String(fs.readFileSync(filePath, "utf8") || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizeChain(chain, patternId, taskId) {
  const fallback = ["IX-520", patternId, taskId, "IX-518"];
  const source = Array.isArray(chain) && chain.length > 0 ? chain : fallback;
  return source.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function formatTranscriptLine(entry) {
  return `[${entry.step}] ${entry.from} -> ${entry.to} (${entry.stage}/${entry.layer}): ${entry.text}`;
}

function buildSearchSliceId(project, stage, layer) {
  return `${String(project || "unscoped").trim()}:${String(stage || "").trim()}:${String(layer || "").trim()}`;
}

function buildProposalText(stageSpec, iteration) {
  return `${stageSpec.stage} plan ${iteration}: ${stageSpec.objective}`;
}

function buildDecisionText(stageSpec, action) {
  return `${stageSpec.stage} review ${action}: ${stageSpec.reviewNote}`;
}

function runChainbackLoop(options = {}) {
  const outputDir = path.resolve(options.outputDir || path.join(process.cwd(), "runtime", "chainback-demo"));
  ensureDir(outputDir);

  const taskId = String(options.taskId || "IX-521").trim();
  const patternId = String(options.patternId || "IX-523").trim();
  const chain = normalizeChain(options.chain, patternId, taskId);
  const orchestrator = String(options.orchestrator || "scriptor").trim();
  const reviewer = String(options.reviewer || "writer").trim();
  const project = String(options.project || "universal").trim();
  const stages = Array.isArray(options.stages) && options.stages.length > 0 ? options.stages : STAGE_SEQUENCE;

  const messageBoxPath = path.join(outputDir, "message-box.ndjson");
  const relayLogPath = path.join(outputDir, "relay-log.ndjson");
  const transcriptPath = path.join(outputDir, "transcript.txt");
  const connectivityPath = path.join(outputDir, "stage-connectivity.ndjson");

  fs.writeFileSync(messageBoxPath, "", "utf8");
  fs.writeFileSync(relayLogPath, "", "utf8");
  fs.writeFileSync(transcriptPath, "", "utf8");
  fs.writeFileSync(connectivityPath, "", "utf8");

  let step = 0;
  const transcriptEntries = [];

  stages.forEach((stageSpec, index) => {
    const stage = String(stageSpec.stage || "").trim();
    const layer = String(stageSpec.layer || "").trim();
    const searchSlice = buildSearchSliceId(project, stage, layer);
    const packet = buildSubManagerPacket({
      parentTaskId: taskId,
      orchestrator,
      agent: reviewer,
      objective: String(stageSpec.objective || "").trim(),
      iteration: index + 1,
      acceptance: stageSpec.checklist,
      constraints: [LANGUAGE_FREEZE_CONSTRAINT, `project:${project}`, `lifecycle-stage:${stage}`, `layer:${layer}`, `search-slice:${searchSlice}`]
    });
    const submitted = submitAgentPlan(packet, {
      checklist: stageSpec.checklist,
      subtasks: stageSpec.subtasks,
      notes: [`chainback:${stage}`, `layer:${layer}`]
    });
    const reviewed = reviewAgentPlan(submitted.packet, submitted.proposal, {
      action: "approved",
      reviewer: orchestrator,
      notes: [String(stageSpec.reviewNote || "").trim()]
    });

    const proposalEntry = {
      taskId,
      chain,
      project,
      searchSlice,
      stage,
      layer,
      step: ++step,
      from: orchestrator,
      to: reviewer,
      text: buildProposalText(stageSpec, index + 1),
      proposalId: submitted.proposal.proposalId,
      ts: new Date().toISOString()
    };
    const reviewEntry = {
      taskId,
      chain,
      project,
      searchSlice,
      stage,
      layer,
      step: ++step,
      from: reviewer,
      to: orchestrator,
      text: buildDecisionText(stageSpec, reviewed.decision.action),
      proposalId: submitted.proposal.proposalId,
      ts: new Date().toISOString()
    };

    appendNdjson(messageBoxPath, proposalEntry);
    appendNdjson(messageBoxPath, reviewEntry);
    fs.appendFileSync(transcriptPath, `${formatTranscriptLine(proposalEntry)}\n`, "utf8");
    fs.appendFileSync(transcriptPath, `${formatTranscriptLine(reviewEntry)}\n`, "utf8");
    transcriptEntries.push(proposalEntry, reviewEntry);

    [...submitted.relayEvents, ...reviewed.relayEvents].forEach((event) => {
      appendNdjson(relayLogPath, {
        ...event,
        taskId,
        chain,
        project,
        searchSlice,
        stage,
        layer,
        iteration: index + 1
      });
    });

    appendNdjson(connectivityPath, {
      taskId,
      chain,
      project,
      searchSlice,
      ordinal: index + 1,
      stage,
      layer,
      prevStage: index === 0 ? null : String(stages[index - 1].stage || "").trim(),
      nextStage: index === stages.length - 1 ? null : String(stages[index + 1].stage || "").trim(),
      line: `${stage}:${layer}`,
      approved: reviewed.decision.action === "approved"
    });
  });

  return {
    ok: true,
    taskId,
    patternId,
    project,
    outputDir,
    stageCount: stages.length,
    messageBoxPath,
    relayLogPath,
    transcriptPath,
    connectivityPath,
    messages: readNdjson(messageBoxPath),
    relays: readNdjson(relayLogPath),
    connectivity: readNdjson(connectivityPath),
    transcript: String(fs.readFileSync(transcriptPath, "utf8") || "").trim().split(/\r?\n/g).filter(Boolean)
  };
}

module.exports = {
  buildSearchSliceId,
  LANGUAGE_FREEZE_CONSTRAINT,
  STAGE_SEQUENCE,
  runChainbackLoop
};

if (require.main === module) {
  const result = runChainbackLoop();
  console.log(JSON.stringify({
    ok: result.ok,
    stageCount: result.stageCount,
    outputDir: result.outputDir,
    messageCount: result.messages.length,
    relayCount: result.relays.length,
    connectivityCount: result.connectivity.length
  }, null, 2));
}
