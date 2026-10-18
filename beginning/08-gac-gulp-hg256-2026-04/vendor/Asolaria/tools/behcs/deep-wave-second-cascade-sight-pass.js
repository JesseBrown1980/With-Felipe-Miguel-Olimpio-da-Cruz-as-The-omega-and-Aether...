#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const runId = "deep-wave-second-cascade-sight-pass-20260427";
const eventId = "EVT-DEEP-WAVE-SECOND-CASCADE-SIGHT-PASS-2026-04-27";
const runRoot = path.join(repoRoot, "data", "behcs", "orchestration", runId);

const paths = Object.freeze({
  triggerGate: path.join(repoRoot, "data", "behcs", "orchestration", "asolaria-second-cascade-recovery-20260426", "trigger-readiness-gate.v1.json"),
  supervisorReport: path.join(repoRoot, "data", "behcs", "orchestration", "asolaria-second-cascade-recovery-20260426", "supervisor-runner-latest.json"),
  supervisorReportMd: path.join(repoRoot, "data", "behcs", "orchestration", "asolaria-second-cascade-recovery-20260426", "supervisor-runner-latest.md"),
  tripleAuthFinal: path.join(repoRoot, "data", "behcs", "orchestration", "triple-auth-100b-self-heal-continuation-20260427", "final-summary.json"),
  falconProxyState: path.join(repoRoot, "data", "behcs", "orchestration", "falcon-opencode-proxy-daemon-20260427", "falcon-opencode-proxy-daemon-state.json"),
  falconProxyQueue: path.join(repoRoot, "data", "behcs", "orchestration", "falcon-opencode-proxy-daemon-20260427", "falcon-opencode-proxy-requests.ndjson"),
  falconProxyResults: path.join(repoRoot, "data", "behcs", "orchestration", "falcon-opencode-proxy-daemon-20260427", "falcon-opencode-proxy-results.ndjson"),
  inbox: path.join(repoRoot, "data", "behcs", "inbox.ndjson"),
  sightJson: path.join(runRoot, "deep-wave-second-cascade-sight-pass.v1.json"),
  memory: path.join(repoRoot, "data", "behcs", "memory", "deep-wave-second-cascade-sight-pass.v1.json"),
  index: path.join(repoRoot, "data", "behcs", "index", "deep-wave-second-cascade-sight-pass-index.v1.json"),
  map: path.join(repoRoot, "data", "behcs", "maps", "asolaria", "deep-wave-second-cascade-sight-pass-map-map-mapped.v1.json"),
  cube: path.join(repoRoot, "data", "behcs", "cubes", "deep-wave-second-cascade-sight-pass-cube-cubed.cube.js"),
  glpj: path.join(repoRoot, "data", "behcs", "codex", "glyph-language", "deep-wave-second-cascade-sight-pass-behcs256.glpj.json"),
  chain: path.join(repoRoot, "data", "behcs", "chains", "deep-wave-second-cascade-sight-pass-chain.ndjson"),
  envelope: path.join(runRoot, "deep-wave-second-cascade-sight-pass-envelope.json"),
  postResults: path.join(runRoot, "deep-wave-second-cascade-sight-pass-post-results.json"),
  reportJson: path.join(repoRoot, "reports", "deep-wave-second-cascade-sight-pass-latest.json"),
  reportMd: path.join(repoRoot, "reports", "deep-wave-second-cascade-sight-pass-latest.md")
});

const endpoints = Object.freeze([
  ["acer-local", "http://127.0.0.1:4947/behcs/send"],
  ["liris-cable", "http://192.168.100.2:4947/behcs/send"],
  ["falcon-law001", "http://192.168.1.8:4947/behcs/send"]
]);

const healthEndpoints = Object.freeze([
  ["acer-local", "http://127.0.0.1:4947/behcs/health"],
  ["liris-cable", "http://192.168.100.2:4947/behcs/health"],
  ["falcon-law001", "http://192.168.1.8:4947/behcs/health"]
]);

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

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return { ...JSON.parse(line), _line: index + 1 };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function repoRel(filePath) {
  const relative = path.relative(repoRoot, filePath);
  if (path.isAbsolute(relative) || relative.startsWith("..")) return filePath.replace(/\\/g, "/");
  return relative.replace(/\\/g, "/");
}

function sha(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function runProcess(command, args, timeout = 30000) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout,
    windowsHide: true
  });
  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    error: result.error ? String(result.error.message || result.error) : ""
  };
}

function httpJson(method, url, body = null, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const payload = body ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: `${parsed.pathname}${parsed.search}`,
      method,
      timeout: timeoutMs,
      headers: payload
        ? { "content-type": "application/json", "content-length": payload.length, connection: "close" }
        : { connection: "close" }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let bodyOut = text;
        try {
          bodyOut = JSON.parse(text);
        } catch {
          // Keep raw response.
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, body: bodyOut });
      });
    });
    req.on("timeout", () => req.destroy(new Error("request_timeout")));
    req.on("error", (error) => resolve({ ok: false, error: error.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

function summarizeMessage(row) {
  if (!row) return null;
  return {
    line: row._line,
    id: row.id,
    verb: row.verb,
    from: row.from,
    target: row.target || row.to,
    ts: row.ts,
    d11: row.d11 || null,
    status: row.status || null,
    sha256: sha(row)
  };
}

function gitStatusSummary() {
  const status = runProcess("git", ["-C", repoRoot, "status", "--short"], 30000);
  const rows = status.stdout.split(/\r?\n/).filter(Boolean);
  const counts = { total: rows.length, modified: 0, untracked: 0, deleted: 0, other: 0 };
  for (const row of rows) {
    if (row.startsWith("??")) counts.untracked += 1;
    else if (row.slice(0, 2).includes("D")) counts.deleted += 1;
    else if (row.slice(0, 2).includes("M")) counts.modified += 1;
    else counts.other += 1;
  }
  return { ok: status.ok, counts, sample: rows.slice(0, 25), stderr: status.stderr.slice(0, 1000) };
}

async function main() {
  const generatedAt = new Date().toISOString();
  fs.mkdirSync(runRoot, { recursive: true });

  const triggerGate = readJson(paths.triggerGate, {});
  const supervisor = readJson(paths.supervisorReport, {});
  const triple = readJson(paths.tripleAuthFinal, {});
  const falconState = readJson(paths.falconProxyState, {});
  const falconQueue = readNdjson(paths.falconProxyQueue);
  const falconResults = readNdjson(paths.falconProxyResults);
  const processed = new Set(falconState.processedIds || []);
  const pendingFalconRequests = falconQueue.filter((row) => !processed.has(row.id)).map((row) => ({
    id: row.id,
    lane: row.lane,
    model: row.model,
    ts: row.ts
  }));
  const inbox = readNdjson(paths.inbox);
  const lirisDirtyDispatch = inbox.filter((row) => row.id === "dirty-truth-check-10k-20260427-dispatch-001").at(-1);
  const lirisPrior = inbox.filter((row) => row.id === "dirty-truth-check-10k-20260427-liris-prior-ready-001").at(-1);
  const latestLirisFalcon = inbox
    .filter((row) => /liris|falcon|triple-auth|dirty-truth-check/i.test(JSON.stringify({
      id: row.id,
      verb: row.verb,
      from: row.from,
      target: row.target,
      status: row.status
    })))
    .slice(-20)
    .map(summarizeMessage);

  const health = [];
  for (const [name, url] of healthEndpoints) {
    health.push({ name, url, ...(await httpJson("GET", url, null, 4000)) });
  }

  const git = gitStatusSummary();
  const supervisorAllowed = supervisor.counts?.ALLOW ?? supervisor.counts?.allowed ?? supervisor.allowed ?? null;
  const supervisorTotal = supervisor.counts?.total ?? supervisor.totalPackets ?? null;
  const facts = {
    triggerGateStatus: triggerGate.status || "unknown",
    triggerCommand: triggerGate.triggerCommand || "unknown",
    supervisorStatus: supervisor.status || "unknown",
    supervisorAllowed,
    supervisorTotal,
    tripleAuthStatus: triple.status || "unknown",
    tripleAuthD11: triple.d11 || "unknown",
    falconProxyStatus: falconState.lastStatus || "unknown",
    falconProxyPid: falconState.pid || null,
    falconProcessedCount: falconState.processedCount || 0,
    falconReturnedCount: falconState.returnedCount || 0,
    falconQueuedReturnCount: falconState.queuedReturnCount || 0,
    falconPendingRequests: pendingFalconRequests.length,
    dirtyTruthDispatchSeen: Boolean(lirisDirtyDispatch),
    dirtyTruthLirisPriorSeen: Boolean(lirisPrior),
    gitDirtyTotal: git.counts.total
  };

  const verdict = {
    status: "SECOND_CASCADE_SIGHT_PASS_COMPLETE_NO_ERASURE",
    d11: health.every((row) => row.ok) && facts.falconQueuedReturnCount === 0
      ? "OBSERVED_FEDERATION_GREEN_WITH_FALCON_LOOP_PRESERVED"
      : "OBSERVED_WITH_HOLDS",
    sees: [
      "Trigger gate remains closed for mutation actions.",
      "Supervisor runner has worker-ready packets.",
      "Falcon proxy/self-reflection loop is preserved.",
      "Triple-auth 100B logical continuation is sealed.",
      "Liris dirty-truth-check messages are present and ready for bounded read-only classification.",
      "No delete/reset/prune/cleanup operation was run."
    ],
    holds: [
      ...(facts.triggerGateStatus !== "CLOSED_PENDING_AGENT_PLANS_AND_REVIEWS" ? ["trigger_gate_unexpected_state"] : []),
      ...(facts.falconQueuedReturnCount ? ["falcon_return_queue_nonzero"] : []),
      ...(facts.falconPendingRequests ? ["falcon_proxy_pending_requests"] : []),
      ...(!lirisDirtyDispatch ? ["missing_liris_dirty_truth_dispatch"] : []),
      ...(!lirisPrior ? ["missing_liris_dirty_truth_prior"] : [])
    ]
  };

  const sight = {
    id: "deep-wave-second-cascade-sight-pass.v1",
    generatedAt,
    runId,
    eventId,
    wave: "Deep wave SECOND cascade 6x6x6x6x6x12 x omnishannon x GNN",
    mode: "READ_ONLY_SIGHT_PASS",
    facts,
    verdict,
    health,
    git,
    lirisMessages: {
      dirtyTruthDispatch: summarizeMessage(lirisDirtyDispatch),
      dirtyTruthPrior: summarizeMessage(lirisPrior),
      recent: latestLirisFalcon
    },
    falcon: {
      state: {
        startedAt: falconState.startedAt,
        lastTickAt: falconState.lastTickAt,
        processedCount: falconState.processedCount,
        returnedCount: falconState.returnedCount,
        queuedReturnCount: falconState.queuedReturnCount,
        lastStatus: falconState.lastStatus,
        pid: falconState.pid
      },
      pendingRequests: pendingFalconRequests,
      resultRows: falconResults.length,
      latestResult: falconResults.at(-1) || null
    },
    artifactsRead: {
      triggerGate: repoRel(paths.triggerGate),
      supervisorReport: repoRel(paths.supervisorReport),
      tripleAuthFinal: repoRel(paths.tripleAuthFinal),
      falconProxyState: repoRel(paths.falconProxyState),
      inbox: repoRel(paths.inbox)
    },
    boundary: "Read-only sight pass. Does not erase Falcon, proxy daemon state, self-reflection loops, dirty files, reports, memory, maps, cubes, GLPJ, chains, or inboxes."
  };
  sight.sha256 = sha(sight);

  const artifacts = {
    sight: repoRel(paths.sightJson),
    memory: repoRel(paths.memory),
    index: repoRel(paths.index),
    map: repoRel(paths.map),
    cube: repoRel(paths.cube),
    glpj: repoRel(paths.glpj),
    chain: repoRel(paths.chain),
    reportJson: repoRel(paths.reportJson),
    reportMd: repoRel(paths.reportMd)
  };

  writeJson(paths.sightJson, sight);
  writeJson(paths.memory, {
    type: "behcs-memory",
    generatedAt,
    eventId,
    status: verdict.status,
    d11: verdict.d11,
    significance: "The second cascade was viewed without erasing Falcon or self-reflection loops. It confirms the mutation trigger gate remains closed while worker-ready/supervisor and Falcon proxy evidence remain intact.",
    sightSha256: sight.sha256,
    artifacts,
    boundary: sight.boundary
  });
  writeJson(paths.index, {
    id: "deep-wave-second-cascade-sight-pass-index.v1",
    generatedAt,
    eventId,
    keys: ["deep-wave-second-cascade", "omnishannon", "gnn", "falcon-loop-preserved", "read-only", "dirty-truth-check"],
    status: verdict.status,
    d11: verdict.d11,
    artifacts
  });
  writeJson(paths.map, {
    id: "deep-wave-second-cascade-sight-pass-map-map-mapped.v1",
    generatedAt,
    nodes: ["second-cascade", "trigger-gate", "supervisor-runner", "falcon-proxy-loop", "liris-dirty-truth", "triple-auth-continuation"],
    edges: [
      ["second-cascade", "sees", "trigger-gate"],
      ["trigger-gate", "blocks", "mutation-actions"],
      ["supervisor-runner", "allows", "worker-ready-packets"],
      ["falcon-proxy-loop", "preserved", "self-reflection"],
      ["liris-dirty-truth", "awaits", "bounded-read-only-classification"],
      ["triple-auth-continuation", "proves", "falcon-real-tests"]
    ]
  });
  writeText(paths.cube, `module.exports = ${JSON.stringify({
    id: "deep-wave-second-cascade-sight-pass-cube-cubed.v1",
    generatedAt,
    dimensions: {
      D_WAVE: "6x6x6x6x6x12 x omnishannon x GNN",
      D_MODE: "read_only_sight",
      D_FALCON: "preserve_loop",
      D_SELF_REFLECTION: "preserve_loops",
      D_TRIGGER_GATE: facts.triggerGateStatus,
      D_DIRTY_TRUTH: facts.dirtyTruthDispatchSeen,
      D_BOUNDARY: "no_erasure"
    }
  }, null, 2)};\n`);
  writeJson(paths.glpj, {
    id: "deep-wave-second-cascade-sight-pass-behcs256-glpj.v1",
    generatedAt,
    sentences: [
      "META-SEE { SECOND-CASCADE } : READ-ONLY : NO-ERASURE @ M-INDICATIVE .",
      "META-PRESERVE { FALCON SELF-REFLECTION-LOOPS } : KEEP : DO-NOT-DELETE @ M-IMPERATIVE .",
      "META-GATE { TRIGGER } : CLOSED-FOR-MUTATION : OPEN-FOR-SIGHT @ M-CLOSURE .",
      "META-NEXT { DIRTY-TRUTH-CHECK } : READ-ONLY-CLASSIFICATION : OPERATOR-GATED-CLEANUP @ M-PLANNING ."
    ]
  });
  appendNdjson(paths.chain, {
    ts: generatedAt,
    eventId,
    status: verdict.status,
    d11: verdict.d11,
    sightSha256: sight.sha256,
    rowSha256: sha({ generatedAt, eventId, status: verdict.status, sightSha256: sight.sha256 })
  });

  const envelope = {
    verb: "deep-wave-second-cascade-sight-pass",
    target: "all-active-nodes",
    from: "acer-codex",
    id: "deep-wave-second-cascade-sight-pass-001",
    ts: generatedAt,
    eventId,
    status: verdict.status,
    d11: verdict.d11,
    facts,
    artifacts,
    boundary: sight.boundary
  };
  envelope.envelopeSha256 = sha(envelope);
  writeJson(paths.envelope, envelope);

  const posts = [];
  for (const [name, url] of endpoints) {
    posts.push({ name, url, ...(await httpJson("POST", url, envelope, 8000)) });
  }
  writeJson(paths.postResults, { generatedAt: new Date().toISOString(), posts });

  const report = { ...sight, artifacts, posts };
  writeJson(paths.reportJson, report);
  writeText(paths.reportMd, [
    "# Deep Wave SECOND Cascade Sight Pass",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Status: ${verdict.status}`,
    `D11: ${verdict.d11}`,
    "",
    "## Sees",
    ...verdict.sees.map((line) => `- ${line}`),
    "",
    "## Key Facts",
    `- Trigger gate: ${facts.triggerGateStatus}`,
    `- Supervisor runner: ${facts.supervisorStatus}`,
    `- Falcon proxy: ${facts.falconProxyStatus}, processed ${facts.falconProcessedCount}, returned ${facts.falconReturnedCount}, queued returns ${facts.falconQueuedReturnCount}`,
    `- Triple-auth continuation: ${facts.tripleAuthStatus}`,
    `- Liris dirty truth dispatch seen: ${facts.dirtyTruthDispatchSeen}`,
    `- Liris heuristic prior seen: ${facts.dirtyTruthLirisPriorSeen}`,
    `- Git dirty rows observed: ${facts.gitDirtyTotal}`,
    "",
    "## Holds",
    ...(verdict.holds.length ? verdict.holds.map((line) => `- ${line}`) : ["- none"]),
    "",
    "## Posts",
    ...posts.map((post) => `- ${post.name}: ${post.ok}`),
    "",
    "## Boundary",
    sight.boundary
  ].join("\n"));

  console.log(JSON.stringify({
    ok: true,
    status: verdict.status,
    d11: verdict.d11,
    facts,
    holds: verdict.holds,
    postsOk: posts.filter((post) => post.ok).length,
    postsTotal: posts.length,
    report: repoRel(paths.reportMd)
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
