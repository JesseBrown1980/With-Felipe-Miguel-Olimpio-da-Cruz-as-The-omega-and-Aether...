"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildResourceBudgetSnapshot,
  readResourceBudgetSnapshot,
  normalizeDeviceId,
} = require("./resourceBudgetSnapshot");

function resolveInstanceRoot() {
  return path.resolve(__dirname, "..", "..");
}

function getPaths(root = resolveInstanceRoot()) {
  const behcsDir = path.join(root, "data", "behcs");
  return {
    root,
    behcsDir,
    gnnReportPath: path.join(behcsDir, "gnn-active-report.json"),
    outputPath: path.join(behcsDir, "gnn-silicon-heartbeat.json"),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isFresh(timestamp, maxAgeMs = 180000) {
  const epoch = new Date(timestamp || 0).getTime();
  if (!epoch) return false;
  return Date.now() - epoch <= maxAgeMs;
}

function buildNodeSummary(snapshot = {}, gnnReport = {}) {
  const snapshotByDevice = new Map(
    (snapshot.devices || []).map((device) => [normalizeDeviceId(device.id || device.label), device])
  );
  return (gnnReport.aliveNodes || []).map((node) => {
    const device = snapshotByDevice.get(normalizeDeviceId(node.name));
    return {
      name: node.name,
      transport: node.transport || "unknown",
      ip: node.ip || "unknown",
      msgs: node.msgs || 0,
      pressureLevel: device?.pressure.level || "unknown",
      pressureScore: device?.pressure.score ?? null,
      readyForTasks: device?.readyForTasks ?? false,
    };
  });
}

function deriveStatus(snapshot = {}, gnnReport = {}) {
  const snapshotFresh = isFresh(snapshot.generatedAt);
  const gnnFresh = isFresh(gnnReport.ts);
  const dispatchReady = snapshot.summary?.dispatchReady === true;
  const aliveCount = Number(gnnReport.summary?.alive || 0);
  const pressureLevel = String(snapshot.summary?.pressureLevel || "unknown");

  if (!dispatchReady) {
    return { status: "dispatch_blocked", verdict: "RED", snapshotFresh, gnnFresh };
  }
  if (!snapshotFresh) {
    return { status: "snapshot_stale", verdict: "AMBER", snapshotFresh, gnnFresh };
  }
  if (!gnnFresh) {
    return { status: "gnn_stale", verdict: "AMBER", snapshotFresh, gnnFresh };
  }
  if (aliveCount < 1) {
    return { status: "gnn_quiet", verdict: "AMBER", snapshotFresh, gnnFresh };
  }
  if (pressureLevel === "high" || pressureLevel === "critical") {
    return { status: "silicon_constrained", verdict: "AMBER", snapshotFresh, gnnFresh };
  }
  return { status: "ready", verdict: "GREEN", snapshotFresh, gnnFresh };
}

function buildGnnSiliconHeartbeat(options = {}) {
  const root = options.instanceRoot ? path.resolve(options.instanceRoot) : resolveInstanceRoot();
  const filePaths = getPaths(root);
  const snapshot = options.snapshot
    || readResourceBudgetSnapshot({ instanceRoot: root })
    || buildResourceBudgetSnapshot({ instanceRoot: root, write: false });
  const gnnReport = options.gnnReport || readJson(filePaths.gnnReportPath, {});
  const status = deriveStatus(snapshot, gnnReport);
  const heartbeat = {
    ok: true,
    generatedAt: new Date().toISOString(),
    instanceRoot: root,
    status: status.status,
    verdict: status.verdict,
    sources: {
      resourceBudgetPath: snapshot.outputPath || path.join(filePaths.behcsDir, "resource-budget-snapshot.json"),
      gnnReportPath: filePaths.gnnReportPath,
    },
    gnn: {
      reportFresh: status.gnnFresh,
      alive: Number(gnnReport.summary?.alive || 0),
      stale: Number(gnnReport.summary?.stale || 0),
      dead: Number(gnnReport.summary?.dead || 0),
      conversations: Array.isArray(gnnReport.conversations) ? gnnReport.conversations.slice(0, 12) : [],
      aliveNames: Array.isArray(gnnReport.aliveNodes) ? gnnReport.aliveNodes.map((node) => node.name) : [],
    },
    silicon: {
      snapshotFresh: status.snapshotFresh,
      pressureScore: snapshot.summary?.pressureScore ?? null,
      pressureLevel: snapshot.summary?.pressureLevel || "unknown",
      dispatchReady: snapshot.summary?.dispatchReady === true,
      constrainedDevices: (snapshot.devices || [])
        .filter((device) => ["high", "critical"].includes(device.pressure.level))
        .map((device) => device.id),
      watcherCoverage: snapshot.summary?.watcherCoverage || { cpu: 0, gpu: 0, device: 0 },
      slots: snapshot.summary?.slots || { heavy: 0, medium: 0, light: 0 },
    },
    routing: {
      gnnReady: status.gnnFresh && Number(gnnReport.summary?.alive || 0) > 0,
      taskReady: snapshot.summary?.dispatchReady === true,
      heavyLane: snapshot.summary?.suggestedDispatch?.heavy || "",
      edgeLane: snapshot.summary?.suggestedDispatch?.edge || "",
      peerLane: snapshot.summary?.suggestedDispatch?.peer || "",
      allowHeavyTasks: (snapshot.summary?.slots?.heavy || 0) > 0,
      allowEdgeTasks: Boolean(snapshot.summary?.suggestedDispatch?.edge),
      allowPeerTasks: Boolean(snapshot.summary?.suggestedDispatch?.peer),
    },
    nodes: buildNodeSummary(snapshot, gnnReport),
  };

  const writeEnabled = options.write !== false;
  const primaryOutputPath = options.outputPath || filePaths.outputPath;
  if (writeEnabled) {
    writeJson(primaryOutputPath, heartbeat);
    heartbeat.outputPath = primaryOutputPath;
    if (options.outputDir) {
      const mirrorPath = path.join(options.outputDir, "gnn-silicon-heartbeat.json");
      writeJson(mirrorPath, heartbeat);
      heartbeat.mirrorOutputPath = mirrorPath;
    }
  } else {
    heartbeat.outputPath = primaryOutputPath;
  }

  return heartbeat;
}

function readGnnSiliconHeartbeat(options = {}) {
  const root = options.instanceRoot ? path.resolve(options.instanceRoot) : resolveInstanceRoot();
  const filePaths = getPaths(root);
  return readJson(options.outputPath || filePaths.outputPath, null);
}

module.exports = {
  buildGnnSiliconHeartbeat,
  readGnnSiliconHeartbeat,
};
